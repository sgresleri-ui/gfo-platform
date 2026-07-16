import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '../prisma/prisma.service';
import { ACCOUNT_MAPPING } from './config/account-mapping';
import { ExcelReader } from './readers/excel-reader';

type PositionInput = {
  code: string;
  name: string;
  category: string;
  subcategory: string | null;
  country: string | null;
  currency: string;
  nativeAmount: number | null;
  fxRateToBase: number | null;
  valueBase: number;
  isLiability: boolean;
  notes: string;
};

type ParsedWorkbook = {
  workbookPath: string;
  valuationDate: Date;
  positions: PositionInput[];
  reconciliation: {
    liquidity: number;
    investments: number;
    insurance: number;
    realEstate: number;
    liabilities: number;
    netWorth: number;
    accountCount: number;
    investmentCount: number;
    propertyCount: number;
    liabilityCount: number;
    positionCount: number;
    portfolioSheetTotal: number;
    portfolioDifference: number;
    warnings: string[];
  };
};

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  private getWorkbookPath(): string {
    return path.join(
      process.cwd(),
      '..',
      'data',
      'Gresleri2026.xlsm',
    );
  }

  private getNumericValue(cell: ExcelJS.Cell): number | null {
    const value = cell.value;

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (value && typeof value === 'object' && 'result' in value) {
      const result = value.result;

      if (typeof result === 'number' && Number.isFinite(result)) {
        return result;
      }

      if (typeof result === 'string') {
        const parsed = Number(result.replace(',', '.'));

        return Number.isFinite(parsed) ? parsed : null;
      }
    }

    if (typeof value === 'string') {
      const normalized = value
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

      const parsed = Number(normalized);

      return Number.isFinite(parsed) ? parsed : null;
    }

    const text = cell.text?.trim();

    if (text) {
      const parsed = Number(text.replace(',', '.'));

      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private getTextValue(cell: ExcelJS.Cell): string | null {
    const text = cell.text?.trim();

    if (!text) {
      return null;
    }

    return text;
  }

  private normalizeCode(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private requireWorksheet(
    workbook: ExcelJS.Workbook,
    name: string,
  ): ExcelJS.Worksheet {
    const worksheet = workbook.getWorksheet(name);

    if (!worksheet) {
      throw new Error(`Foglio Excel non trovato: ${name}`);
    }

    return worksheet;
  }

  private async parseWealthWorkbook(): Promise<ParsedWorkbook> {
    const workbookPath = this.getWorkbookPath();

    if (!fs.existsSync(workbookPath)) {
      throw new Error(`Workbook non trovato: ${workbookPath}`);
    }

    const reader = new ExcelReader();
    const workbook = await reader.readWorkbook(workbookPath);

    const valuationDate = fs.statSync(workbookPath).mtime;
    const positions: PositionInput[] = [];
    const warnings: string[] = [];

    /*
     * LIQUIDITÀ
     */
    const contoEconomico = this.requireWorksheet(
      workbook,
      'Conto Economico',
    );

    for (const mapping of ACCOUNT_MAPPING) {
      const valueBase = this.getNumericValue(
        contoEconomico.getCell(mapping.cell),
      );

      if (valueBase === null) {
        warnings.push(
          `${mapping.name}: valore non disponibile in ${mapping.sheet}!${mapping.cell}`,
        );
        continue;
      }

      positions.push({
        code: `CASH_${mapping.code}`,
        name: mapping.name,
        category: 'LIQUIDITY',
        subcategory: mapping.type.toUpperCase(),
        country: mapping.country,
        currency: mapping.currency,
        nativeAmount:
          mapping.currency === 'EUR' ? valueBase : null,
        fxRateToBase:
          mapping.currency === 'EUR' ? 1 : null,
        valueBase,
        isLiability: false,
        notes:
          `Importato da ${mapping.sheet}!${mapping.cell}. ` +
          `Il valoreBase è espresso in EUR.`,
      });
    }

    /*
     * PRODOTTO ASSICURATIVO
     */
    const insuranceValue = this.getNumericValue(
      contoEconomico.getCell('O17'),
    );

    if (insuranceValue !== null) {
      positions.push({
        code: 'INSURANCE_PRODUCT',
        name: 'Prodotto assicurativo',
        category: 'OTHER_ASSET',
        subcategory: 'INSURANCE',
        country: null,
        currency: 'EUR',
        nativeAmount: insuranceValue,
        fxRateToBase: 1,
        valueBase: insuranceValue,
        isLiability: false,
        notes: 'Importato da Conto Economico!O17.',
      });
    } else {
      warnings.push(
        'Prodotto assicurativo: valore non disponibile in Conto Economico!O17',
      );
    }

    /*
     * PORTAFOGLIO FINANZIARIO
     *
     * Intestazioni confermate alla riga 6:
     * C Portafoglio
     * D Titolo
     * E ISIN
     * G Mercato
     * H Strumento
     * I Valuta
     * J Quantità
     * M Prezzo
     * N Valore di mercato EUR
     */
    const portfolioSheet = this.requireWorksheet(
      workbook,
      'Portafoglio',
    );

    const acceptedPortfolios = new Set([
      'Advice',
      'Advice+',
      'IBKR',
    ]);

    let investmentCount = 0;
    let investmentsTotal = 0;

    for (
      let rowNumber = 7;
      rowNumber <= portfolioSheet.rowCount;
      rowNumber += 1
    ) {
      const row = portfolioSheet.getRow(rowNumber);

      const portfolio = this.getTextValue(row.getCell(3));
      const title = this.getTextValue(row.getCell(4));
      const isin = this.getTextValue(row.getCell(5));
      const market = this.getTextValue(row.getCell(7));
      const instrument = this.getTextValue(row.getCell(8));
      const currency =
        this.getTextValue(row.getCell(9)) ?? 'EUR';
      const quantity = this.getNumericValue(row.getCell(10));
      const marketPrice = this.getNumericValue(row.getCell(13));
      const marketValue = this.getNumericValue(row.getCell(14));

      if (
        !portfolio ||
        !acceptedPortfolios.has(portfolio) ||
        !title ||
        !isin ||
        marketValue === null
      ) {
        continue;
      }

      investmentCount += 1;
      investmentsTotal += marketValue;

      positions.push({
        code:
          `INVESTMENT_${this.normalizeCode(portfolio)}_` +
          `${this.normalizeCode(isin)}`,
        name: title,
        category: 'INVESTMENT',
        subcategory: instrument ?? 'FINANCIAL_INSTRUMENT',
        country: null,
        currency,
        nativeAmount:
          currency === 'EUR' ? marketValue : null,
        fxRateToBase:
          currency === 'EUR' ? 1 : null,
        valueBase: marketValue,
        isLiability: false,
        notes: [
          `Portafoglio: ${portfolio}`,
          `ISIN: ${isin}`,
          market ? `Mercato: ${market}` : null,
          quantity !== null ? `Quantità: ${quantity}` : null,
          marketPrice !== null
            ? `Prezzo: ${marketPrice}`
            : null,
          `Origine: Portafoglio!riga ${rowNumber}`,
        ]
          .filter(Boolean)
          .join(' | '),
      });
    }

    const portfolioSheetTotal =
      this.getNumericValue(portfolioSheet.getCell('N48')) ?? 0;

    const portfolioDifference =
      investmentsTotal - portfolioSheetTotal;

    if (Math.abs(portfolioDifference) > 0.01) {
      warnings.push(
        `Riconciliazione portafoglio non quadrata: differenza EUR ${portfolioDifference}`,
      );
    }

    /*
     * IMMOBILI E PASSIVITÀ
     */
    const propertySheet = this.requireWorksheet(
      workbook,
      'Immobili',
    );

    let propertyCount = 0;
    let liabilityCount = 0;
    let realEstateTotal = 0;
    let liabilitiesTotal = 0;

    for (
      let rowNumber = 2;
      rowNumber <= propertySheet.rowCount;
      rowNumber += 1
    ) {
      const row = propertySheet.getRow(rowNumber);

      const propertyName = this.getTextValue(row.getCell(1));
      const propertyValue = this.getNumericValue(row.getCell(2));
      const residualDebt = this.getNumericValue(row.getCell(3));
      const country = this.getTextValue(row.getCell(4));

      if (!propertyName || propertyValue === null) {
        continue;
      }

      const propertyCode = this.normalizeCode(propertyName);

      propertyCount += 1;
      realEstateTotal += propertyValue;

      positions.push({
        code: `PROPERTY_${propertyCode}`,
        name: `Immobile ${propertyName}`,
        category: 'REAL_ESTATE',
        subcategory: 'PROPERTY',
        country,
        currency: 'EUR',
        nativeAmount: propertyValue,
        fxRateToBase: 1,
        valueBase: propertyValue,
        isLiability: false,
        notes: `Importato da Immobili!riga ${rowNumber}.`,
      });

      if (residualDebt !== null && residualDebt > 0) {
        liabilityCount += 1;
        liabilitiesTotal += residualDebt;

        positions.push({
          code: `LIABILITY_${propertyCode}`,
          name:
            propertyName.toLowerCase() === 'dubai'
              ? 'Impegni residui Dubai'
              : `Debito residuo ${propertyName}`,
          category: 'LIABILITY',
          subcategory:
            propertyName.toLowerCase() === 'dubai'
              ? 'PROPERTY_COMMITMENT'
              : 'MORTGAGE',
          country,
          currency: 'EUR',
          nativeAmount: residualDebt,
          fxRateToBase: 1,
          valueBase: residualDebt,
          isLiability: true,
          notes:
            `Importato da Immobili!C${rowNumber}. ` +
            `Valore verificato con il foglio di dettaglio.`,
        });
      }
    }

    if (workbook.getWorksheet('El Toro')) {
      warnings.push(
        'Il foglio El Toro esiste, ma El Toro non è presente nel foglio consolidato Immobili.',
      );
    }

    const liquidityTotal = positions
      .filter((position) => position.category === 'LIQUIDITY')
      .reduce((sum, position) => sum + position.valueBase, 0);

    const insuranceTotal = positions
      .filter(
        (position) => position.category === 'OTHER_ASSET',
      )
      .reduce((sum, position) => sum + position.valueBase, 0);

    const netWorth =
      liquidityTotal +
      investmentsTotal +
      insuranceTotal +
      realEstateTotal -
      liabilitiesTotal;

    return {
      workbookPath,
      valuationDate,
      positions,
      reconciliation: {
        liquidity: liquidityTotal,
        investments: investmentsTotal,
        insurance: insuranceTotal,
        realEstate: realEstateTotal,
        liabilities: liabilitiesTotal,
        netWorth,
        accountCount: ACCOUNT_MAPPING.length,
        investmentCount,
        propertyCount,
        liabilityCount,
        positionCount: positions.length,
        portfolioSheetTotal,
        portfolioDifference,
        warnings,
      },
    };
  }

  async importWorkbook() {
    const workbookPath = this.getWorkbookPath();

    if (!fs.existsSync(workbookPath)) {
      return {
        success: false,
        message: 'Workbook non trovato',
        path: workbookPath,
      };
    }

    const reader = new ExcelReader();
    const workbook = await reader.readWorkbook(workbookPath);

    const worksheets = workbook.worksheets.map(
      (worksheet, index) => ({
        index: index + 1,
        name: worksheet.name,
        rows: worksheet.rowCount,
        columns: worksheet.columnCount,
        cells:
          worksheet.rowCount * worksheet.columnCount,
        status: 'OK',
      }),
    );

    return {
      success: true,
      workbook: path.basename(workbookPath),
      sheetCount: worksheets.length,
      worksheets,
    };
  }

  async previewWealthImport() {
    const parsed = await this.parseWealthWorkbook();

    return {
      success: true,
      mode: 'PREVIEW',
      workbook: path.basename(parsed.workbookPath),
      valuationDate: parsed.valuationDate.toISOString(),
      reconciliation: parsed.reconciliation,
      positions: parsed.positions,
    };
  }

  async importWealth() {
    const parsed = await this.parseWealthWorkbook();

    let household = await this.prisma.household.findFirst({
      orderBy: {
        id: 'asc',
      },
    });

    if (!household) {
      household = await this.prisma.household.create({
        data: {
          name: 'Famiglia Gresleri',
          currency: 'EUR',
        },
      });
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.wealthPosition.updateMany({
        where: {
          source: {
            in: [
              'PROVISIONAL_2026',
              'EXCEL_GRESLERI2026',
            ],
          },
          status: 'ACTIVE',
        },
        data: {
          status: 'ARCHIVED',
        },
      });

      for (const position of parsed.positions) {
        const data = {
          householdId: household.id,
          name: position.name,
          category: position.category,
          subcategory: position.subcategory,
          country: position.country,
          currency: position.currency,
          nativeAmount:
            position.nativeAmount === null
              ? null
              : new Prisma.Decimal(
                  position.nativeAmount.toString(),
                ),
          fxRateToBase:
            position.fxRateToBase === null
              ? null
              : new Prisma.Decimal(
                  position.fxRateToBase.toString(),
                ),
          valueBase: new Prisma.Decimal(
            position.valueBase.toString(),
          ),
          baseCurrency: 'EUR',
          isLiability: position.isLiability,
          valuationDate: parsed.valuationDate,
          source: 'EXCEL_GRESLERI2026',
          status: 'ACTIVE',
          notes: position.notes,
        };

        await transaction.wealthPosition.upsert({
          where: {
            code: position.code,
          },
          update: data,
          create: {
            code: position.code,
            ...data,
          },
        });
      }
    });

    return {
      success: true,
      mode: 'IMPORT',
      workbook: path.basename(parsed.workbookPath),
      valuationDate: parsed.valuationDate.toISOString(),
      importedPositions:
        parsed.reconciliation.positionCount,
      reconciliation: parsed.reconciliation,
    };
  }
}
