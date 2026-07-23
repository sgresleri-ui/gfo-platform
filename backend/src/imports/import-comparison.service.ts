import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

import * as ExcelJS from 'exceljs';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export type WorkbookPosition = {
  code: string;
  name: string;
  category: string;
  subcategory: string;
  country: string | null;
  currency: string;
  valueBase: number;
  source: string;
  origin: string;
};

type ComparisonStatus =
  | 'UNCHANGED'
  | 'MODIFIED'
  | 'NEW'
  | 'MISSING_IN_WORKBOOK'
  | 'PROTECTED_MANUAL';

type FieldDifference = {
  field: string;
  databaseValue: string | number | null;
  workbookValue: string | number | null;
};

export type ComparisonItem = {
  code: string;
  name: string;
  category: string;
  status: ComparisonStatus;
  databaseValue: number | null;
  workbookValue: number | null;
  difference: number | null;
  source: string;
  origin: string | null;
  workbookData: WorkbookPosition | null;
  differences: FieldDifference[];
};

@Injectable()
export class ImportComparisonService {
  private readonly prisma = new PrismaClient();

  private normalize(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private round(value: number): number {
    return (
      Math.round(
        (value + Number.EPSILON) * 100,
      ) / 100
    );
  }

  private parseNumber(
    value: unknown,
  ): number | null {
    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      value &&
      typeof value === 'object' &&
      'result' in value
    ) {
      const result = (
        value as {
          result?: unknown;
        }
      ).result;

      return this.parseNumber(result);
    }

    if (typeof value !== 'string') {
      return null;
    }

    let normalized = value
      .trim()
      .replace(/[€$£\s]/g, '')
      .replace(/[^\d,.\-]/g, '');

    if (!normalized) {
      return null;
    }

    if (
      normalized.includes('.') &&
      normalized.includes(',')
    ) {
      normalized = normalized
        .replace(/\./g, '')
        .replace(',', '.');
    } else if (
      normalized.includes(',')
    ) {
      normalized = normalized.replace(
        ',',
        '.',
      );
    }

    const parsed = Number(normalized);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  private getCellNumber(
    sheet: ExcelJS.Worksheet,
    address: string,
  ): number | null {
    const cell = sheet.getCell(address);

    return (
      this.parseNumber(cell.value) ??
      this.parseNumber(cell.text)
    );
  }

  private calculateFileHash(
    filePath: string,
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const hash =
          createHash('sha256');

        const stream =
          fs.createReadStream(filePath);

        stream.on('error', reject);

        stream.on('data', (chunk) => {
          hash.update(chunk);
        });

        stream.on('end', () => {
          resolve(hash.digest('hex'));
        });
      },
    );
  }

  private async resolveWorkbookPath() {
    const settings =
      await this.prisma.platformSetting.findUnique(
        {
          where: {
            id: 1,
          },
        },
      );

    const fileName =
      settings?.sourceWorkbook ??
      'Gresleri2026.xlsm';

    const configuredFolder =
      settings?.dataFolder ?? '/data';

    const normalizedFolder =
      configuredFolder.replace(
        /^[/\\]+/,
        '',
      );

    const projectRoot = path.resolve(
      process.cwd(),
      '..',
    );

    return {
      fileName,

      workbookPath: path.join(
        projectRoot,
        normalizedFolder,
        fileName,
      ),
    };
  }

  private findHeaderRow(
    sheet: ExcelJS.Worksheet,
  ): number | null {
    const maximumRow = Math.min(
      25,
      sheet.rowCount,
    );

    for (
      let rowNumber = 1;
      rowNumber <= maximumRow;
      rowNumber += 1
    ) {
      const row = sheet.getRow(rowNumber);

      const texts: string[] = [];

      for (
        let columnNumber = 1;
        columnNumber <=
        Math.min(sheet.columnCount, 40);
        columnNumber += 1
      ) {
        const text = this.normalize(
          row.getCell(columnNumber).text,
        );

        if (text) {
          texts.push(text);
        }
      }

      const hasIsin = texts.some(
        (text) => text.includes('isin'),
      );

      const hasValue = texts.some(
        (text) =>
          text.includes(
            'valore di mercato',
          ) ||
          text.includes('controvalore') ||
          text.includes('prezzo'),
      );

      if (hasIsin && hasValue) {
        return rowNumber;
      }
    }

    return null;
  }

  private findColumn(
    sheet: ExcelJS.Worksheet,
    headerRow: number,
    candidates: string[],
  ): number | null {
    const row = sheet.getRow(headerRow);

    for (const candidate of candidates) {
      const normalizedCandidate =
        this.normalize(candidate);

      for (
        let columnNumber = 1;
        columnNumber <=
        Math.min(sheet.columnCount, 40);
        columnNumber += 1
      ) {
        const text = this.normalize(
          row.getCell(columnNumber).text,
        );

        if (
          text === normalizedCandidate ||
          text.includes(
            normalizedCandidate,
          )
        ) {
          return columnNumber;
        }
      }
    }

    return null;
  }

  private extractInvestments(
    sheet: ExcelJS.Worksheet,
  ): WorkbookPosition[] {
    const headerRow =
      this.findHeaderRow(sheet);

    if (headerRow === null) {
      return [];
    }

    const isinColumn = this.findColumn(
      sheet,
      headerRow,
      ['isin'],
    );

    const nameColumn = this.findColumn(
      sheet,
      headerRow,
      [
        'titolo',
        'descrizione',
        'nome',
        'strumento',
      ],
    );

    const portfolioColumn = this.findColumn(
      sheet,
      headerRow,
      [
        'portafoglio',
        'deposito',
        'conto',
      ],
    );

    const marketColumn = this.findColumn(
      sheet,
      headerRow,
      ['mercato'],
    );

    const quantityColumn = this.findColumn(
      sheet,
      headerRow,
      ['quantita'],
    );

    const priceColumn = this.findColumn(
      sheet,
      headerRow,
      ['prezzo'],
    );

    const marketValueColumn =
      this.findColumn(
        sheet,
        headerRow,
        [
          'valore di mercato €',
          'valore di mercato',
          'controvalore',
        ],
      );

    if (isinColumn === null) {
      return [];
    }

    const positions: WorkbookPosition[] =
      [];

    for (
      let rowNumber = headerRow + 1;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const row = sheet.getRow(rowNumber);

      const rawIsin =
        row.getCell(isinColumn).text.trim();

      const isinMatch = rawIsin
        .toUpperCase()
        .match(/[A-Z]{2}[A-Z0-9]{10}/);

      if (!isinMatch) {
        continue;
      }

      const isin = isinMatch[0];

      const portfolio =
        portfolioColumn !== null
          ? row
              .getCell(portfolioColumn)
              .text.trim()
          : '';

      const market =
        marketColumn !== null
          ? row
              .getCell(marketColumn)
              .text.trim()
          : '';

      const rawName =
        nameColumn !== null
          ? row
              .getCell(nameColumn)
              .text.trim()
          : '';

      const name =
        rawName ||
        `Strumento ${isin}`;

      let valueBase: number | null = null;

      if (marketValueColumn !== null) {
        valueBase =
          this.parseNumber(
            row.getCell(
              marketValueColumn,
            ).value,
          ) ??
          this.parseNumber(
            row.getCell(
              marketValueColumn,
            ).text,
          );
      }

      if (
        valueBase === null &&
        quantityColumn !== null &&
        priceColumn !== null
      ) {
        const quantity =
          this.parseNumber(
            row.getCell(
              quantityColumn,
            ).value,
          ) ??
          this.parseNumber(
            row.getCell(
              quantityColumn,
            ).text,
          );

        const price =
          this.parseNumber(
            row.getCell(
              priceColumn,
            ).value,
          ) ??
          this.parseNumber(
            row.getCell(
              priceColumn,
            ).text,
          );

        if (
          quantity !== null &&
          price !== null
        ) {
          valueBase = quantity * price;
        }
      }

      if (valueBase === null) {
        continue;
      }

      const normalizedPortfolio =
        this.normalize(portfolio);

      const isIbkr =
        normalizedPortfolio.includes(
          'ibkr',
        ) ||
        normalizedPortfolio.includes(
          'interactive brokers',
        );

      const code = isIbkr
        ? `INVESTMENT_IBKR_${isin}`
        : `INVESTMENT_ADVICE_${isin}`;

      const normalizedInstrument =
        this.normalize(
          `${name} ${market}`,
        );

      const subcategory =
        normalizedInstrument.includes('etf')
          ? 'ETF'
          : normalizedInstrument.includes(
                'pac',
              )
            ? 'Fondo PAC'
            : 'Fondo';

      positions.push({
        code,
        name,
        category: 'INVESTMENT',
        subcategory,
        country: null,
        currency: 'EUR',
        valueBase: this.round(valueBase),
        source: 'EXCEL_GRESLERI2026',
        origin: `Portafoglio!riga ${rowNumber}`,
      });
    }

    return positions;
  }

  private extractLiquidity(
    sheet: ExcelJS.Worksheet,
  ): WorkbookPosition[] {
    const mappings = [
      {
        code: 'CASH_IBKR',
        name: 'Interactive Brokers',
        address: 'P23',
        country: 'Ireland',
        currency: 'EUR',
        subcategory: 'BROKER',
      },
      {
        code: 'CASH_RAKBANK_EUR',
        name: 'RakBank EUR',
        address: 'P28',
        country: 'UAE',
        currency: 'EUR',
        subcategory: 'BANK',
      },
      {
        code: 'CASH_RAKBANK_AED',
        name: 'RakBank AED',
        address: 'P33',
        country: 'UAE',
        currency: 'AED',
        subcategory: 'BANK',
      },
      {
        code: 'CASH_FINECO_ST',
        name: 'Fineco ST',
        address: 'P38',
        country: 'Italy',
        currency: 'EUR',
        subcategory: 'BANK',
      },
      {
        code: 'CASH_FINECO_SA',
        name: 'Fineco SA',
        address: 'P43',
        country: 'Italy',
        currency: 'EUR',
        subcategory: 'BANK',
      },
      {
        code: 'CASH_BBVA',
        name: 'BBVA',
        address: 'P48',
        country: 'Spain',
        currency: 'EUR',
        subcategory: 'BANK',
      },
      {
        code: 'CASH_REVOLUT',
        name: 'Revolut',
        address: 'P53',
        country: 'Lithuania',
        currency: 'EUR',
        subcategory: 'FINTECH',
      },
    ];

    return mappings.flatMap((mapping) => {
      const valueBase =
        this.getCellNumber(
          sheet,
          mapping.address,
        );

      if (valueBase === null) {
        return [];
      }

      return [
        {
          code: mapping.code,
          name: mapping.name,
          category: 'LIQUIDITY',
          subcategory:
            mapping.subcategory,
          country: mapping.country,
          currency: mapping.currency,
          valueBase:
            this.round(valueBase),
          source: 'EXCEL_GRESLERI2026',
          origin:
            `Conto Economico!${mapping.address}`,
        },
      ];
    });
  }

  private extractInsurance(
    sheet: ExcelJS.Worksheet,
  ): WorkbookPosition[] {
    const valueBase =
      this.getCellNumber(sheet, 'O17');

    if (valueBase === null) {
      return [];
    }

    return [
      {
        code: 'INSURANCE_PRODUCT',
        name: 'Prodotto assicurativo',
        category: 'OTHER_ASSET',
        subcategory: 'INSURANCE',
        country: null,
        currency: 'EUR',
        valueBase:
          this.round(valueBase),
        source: 'EXCEL_GRESLERI2026',
        origin: 'Conto Economico!O17',
      },
    ];
  }

  private extractProperties(
    sheet: ExcelJS.Worksheet,
  ): WorkbookPosition[] {
    const positions: WorkbookPosition[] =
      [];

    const riccioneValue =
      this.getCellNumber(sheet, 'B2');

    const riccioneDebt =
      this.getCellNumber(sheet, 'C2');

    const dubaiValue =
      this.getCellNumber(sheet, 'B3');

    const dubaiDebt =
      this.getCellNumber(sheet, 'C3');

    if (riccioneValue !== null) {
      positions.push({
        code: 'PROPERTY_RICCIONE',
        name: 'Immobile Riccione',
        category: 'REAL_ESTATE',
        subcategory: 'PROPERTY',
        country: 'Italia',
        currency: 'EUR',
        valueBase:
          this.round(riccioneValue),
        source: 'EXCEL_GRESLERI2026',
        origin: 'Immobili!B2',
      });
    }

    if (riccioneDebt !== null) {
      positions.push({
        code: 'LIABILITY_RICCIONE',
        name: 'Debito residuo Riccione',
        category: 'LIABILITY',
        subcategory: 'MORTGAGE',
        country: 'Italia',
        currency: 'EUR',
        valueBase:
          this.round(riccioneDebt),
        source: 'EXCEL_GRESLERI2026',
        origin: 'Immobili!C2',
      });
    }

    if (dubaiValue !== null) {
      positions.push({
        code: 'PROPERTY_DUBAI',
        name: 'Immobile Dubai',
        category: 'REAL_ESTATE',
        subcategory: 'PROPERTY',
        country: 'UAE',
        currency: 'EUR',
        valueBase:
          this.round(dubaiValue),
        source: 'EXCEL_GRESLERI2026',
        origin: 'Immobili!B3',
      });
    }

    if (dubaiDebt !== null) {
      positions.push({
        code: 'LIABILITY_DUBAI',
        name: 'Impegni residui Dubai',
        category: 'LIABILITY',
        subcategory:
          'PROPERTY_COMMITMENT',
        country: 'UAE',
        currency: 'EUR',
        valueBase:
          this.round(dubaiDebt),
        source: 'EXCEL_GRESLERI2026',
        origin: 'Immobili!C3',
      });
    }

    return positions;
  }

  private compareFields(
    databasePosition: {
      name: string;
      category: string;
      subcategory: string | null;
      country: string | null;
      currency: string;
      valueBase: unknown;
    },
    workbookPosition: WorkbookPosition,
  ): FieldDifference[] {
    const differences: FieldDifference[] =
      [];

    if (
      databasePosition.name !==
      workbookPosition.name
    ) {
      differences.push({
        field: 'name',
        databaseValue:
          databasePosition.name,
        workbookValue:
          workbookPosition.name,
      });
    }

    const databaseValue = this.round(
      Number(
        databasePosition.valueBase,
      ),
    );

    if (
      Math.abs(
        databaseValue -
          workbookPosition.valueBase,
      ) > 0.01
    ) {
      differences.push({
        field: 'valueBase',
        databaseValue,
        workbookValue:
          workbookPosition.valueBase,
      });
    }

    if (
      databasePosition.currency !==
      workbookPosition.currency
    ) {
      differences.push({
        field: 'currency',
        databaseValue:
          databasePosition.currency,
        workbookValue:
          workbookPosition.currency,
      });
    }

    if (
      databasePosition.category !==
      workbookPosition.category
    ) {
      differences.push({
        field: 'category',
        databaseValue:
          databasePosition.category,
        workbookValue:
          workbookPosition.category,
      });
    }

    if (
      (databasePosition.subcategory ??
        '') !==
      workbookPosition.subcategory
    ) {
      differences.push({
        field: 'subcategory',
        databaseValue:
          databasePosition.subcategory,
        workbookValue:
          workbookPosition.subcategory,
      });
    }

    return differences;
  }

  async compareWorkbook() {
    const {
      fileName,
      workbookPath,
    } = await this.resolveWorkbookPath();

    if (!fs.existsSync(workbookPath)) {
      throw new NotFoundException(
        `Workbook non trovato: ${workbookPath}`,
      );
    }

    const fileHash =
      await this.calculateFileHash(
        workbookPath,
      );

    const previewRun =
      await this.prisma.importRun.findFirst(
        {
          where: {
            fileHash,
            status: {
              in: [
                'PREVIEW_READY',
                'COMPARISON_READY',
              ],
            },
          },

          orderBy: {
            createdAt: 'desc',
          },
        },
      );

    if (!previewRun) {
      throw new BadRequestException(
        'Eseguire prima Analizza workbook.',
      );
    }

    const workbook =
      new ExcelJS.Workbook();

    await workbook.xlsx.readFile(
      workbookPath,
    );

    const portfolioSheet =
      workbook.getWorksheet('Portafoglio');

    const economicSheet =
      workbook.getWorksheet(
        'Conto Economico',
      );

    const propertiesSheet =
      workbook.getWorksheet('Immobili');

    if (
      !portfolioSheet ||
      !economicSheet ||
      !propertiesSheet
    ) {
      throw new BadRequestException(
        'Fogli necessari al confronto non disponibili.',
      );
    }

    const workbookPositions = [
      ...this.extractInvestments(
        portfolioSheet,
      ),
      ...this.extractLiquidity(
        economicSheet,
      ),
      ...this.extractInsurance(
        economicSheet,
      ),
      ...this.extractProperties(
        propertiesSheet,
      ),
    ];

    const duplicateWorkbookCodes =
      workbookPositions
        .map((position) => position.code)
        .filter(
          (code, index, array) =>
            array.indexOf(code) !== index,
        );

    if (
      duplicateWorkbookCodes.length > 0
    ) {
      throw new BadRequestException(
        `Codici duplicati estratti dal workbook: ${[
          ...new Set(
            duplicateWorkbookCodes,
          ),
        ].join(', ')}`,
      );
    }

    const databasePositions =
      await this.prisma.wealthPosition.findMany(
        {
          where: {
            status: 'ACTIVE',
          },

          orderBy: {
            code: 'asc',
          },
        },
      );

    const databaseMap = new Map(
      databasePositions.map(
        (position) => [
          position.code,
          position,
        ],
      ),
    );

    const workbookMap = new Map(
      workbookPositions.map(
        (position) => [
          position.code,
          position,
        ],
      ),
    );

    const items: ComparisonItem[] = [];

    for (
      const workbookPosition of
      workbookPositions
    ) {
      const databasePosition =
        databaseMap.get(
          workbookPosition.code,
        );

      if (!databasePosition) {
        items.push({
          code: workbookPosition.code,
          name: workbookPosition.name,
          category:
            workbookPosition.category,
          status: 'NEW',
          databaseValue: null,
          workbookValue:
            workbookPosition.valueBase,
          difference:
            workbookPosition.valueBase,
          source:
            workbookPosition.source,
          origin:
            workbookPosition.origin,
          workbookData:
            workbookPosition,
          differences: [],
        });

        continue;
      }

      const differences =
        this.compareFields(
          databasePosition,
          workbookPosition,
        );

      const databaseValue = this.round(
        Number(
          databasePosition.valueBase,
        ),
      );

      items.push({
        code: workbookPosition.code,
        name: workbookPosition.name,
        category:
          databasePosition.category,

        status:
          differences.length === 0
            ? 'UNCHANGED'
            : 'MODIFIED',

        databaseValue,
        workbookValue:
          workbookPosition.valueBase,

        difference: this.round(
          workbookPosition.valueBase -
            databaseValue,
        ),

        source:
          databasePosition.source,

        origin:
          workbookPosition.origin,

        workbookData:
          workbookPosition,

        differences,
      });
    }

    for (
      const databasePosition of
      databasePositions
    ) {
      if (
        workbookMap.has(
          databasePosition.code,
        )
      ) {
        continue;
      }

      const isWorkbookManaged =
        databasePosition.source ===
        'EXCEL_GRESLERI2026';

      items.push({
        code: databasePosition.code,
        name: databasePosition.name,
        category:
          databasePosition.category,

        status: isWorkbookManaged
          ? 'MISSING_IN_WORKBOOK'
          : 'PROTECTED_MANUAL',

        databaseValue: this.round(
          Number(
            databasePosition.valueBase,
          ),
        ),

        workbookValue: null,

        difference: isWorkbookManaged
          ? -this.round(
              Number(
                databasePosition.valueBase,
              ),
            )
          : null,

        source:
          databasePosition.source,

        origin: null,
        workbookData: null,
        differences: [],
      });
    }

    const countStatus = (
      status: ComparisonStatus,
    ) =>
      items.filter(
        (item) => item.status === status,
      ).length;

    const managedDatabaseTotal =
      databasePositions
        .filter(
          (position) =>
            position.source ===
            'EXCEL_GRESLERI2026',
        )
        .reduce(
          (sum, position) =>
            sum +
            Number(
              position.valueBase,
            ),
          0,
        );

    const workbookTotal =
      workbookPositions.reduce(
        (sum, position) =>
          sum + position.valueBase,
        0,
      );

    const summary = {
      extractedPositions:
        workbookPositions.length,

      unchanged:
        countStatus('UNCHANGED'),

      modified:
        countStatus('MODIFIED'),

      new:
        countStatus('NEW'),

      missingInWorkbook:
        countStatus(
          'MISSING_IN_WORKBOOK',
        ),

      protectedManual:
        countStatus(
          'PROTECTED_MANUAL',
        ),

      databaseManagedValue:
        this.round(
          managedDatabaseTotal,
        ),

      workbookValue:
        this.round(workbookTotal),

      valueDifference: (() => {
        const difference = this.round(
          workbookTotal -
            managedDatabaseTotal,
        );

        return Math.abs(difference) <= 0.05
          ? 0
          : difference;
      })(),

      requiresReview:
        countStatus('MODIFIED') +
          countStatus('NEW') +
          countStatus(
            'MISSING_IN_WORKBOOK',
          ) >
        0,
    };

    const previousPreview = (() => {
      try {
        return JSON.parse(
          previewRun.previewJson,
        ) as Record<string, unknown>;
      } catch {
        return {};
      }
    })();

    const comparison = {
      generatedAt:
        new Date().toISOString(),

      fileName,
      fileHash,
      summary,

      items: items.sort(
        (first, second) => {
          const order: Record<
            ComparisonStatus,
            number
          > = {
            MODIFIED: 1,
            NEW: 2,
            MISSING_IN_WORKBOOK: 3,
            PROTECTED_MANUAL: 4,
            UNCHANGED: 5,
          };

          return (
            order[first.status] -
              order[second.status] ||
            first.code.localeCompare(
              second.code,
            )
          );
        },
      ),
    };

    const updatedRun =
      await this.prisma.importRun.update({
        where: {
          id: previewRun.id,
        },

        data: {
          status: 'COMPARISON_READY',

          previewJson: JSON.stringify({
            ...previousPreview,
            comparison,
          }),

          completedAt: new Date(),
        },
      });

    return {
      runId: updatedRun.id,
      status: updatedRun.status,
      comparison,
    };
  }
}
