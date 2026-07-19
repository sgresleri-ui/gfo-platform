import { Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

type AnnualBudget = {
  year: number;
  scenario: string;
  ordinaryExpenses: number;
  extraordinaryExpenses: number;
  totalExpenses: number;
  revenues: number;
  netCashFlow: number;
};

type LongTermCapitalMovement = {
  label: string;
  amount: number;
};

type LongTermYear = {
  year: number;
  capitalStart: number | null;

  ordinaryExpenses: number;
  extraordinaryExpenses: number;
  operatingCosts: number;

  propertyInvestments: number;
  propertySales: number;

  operatingRevenues: number;
  operatingNetCashFlow: number;
  propertyNetCashFlow: number;

  totalCosts: number;
  totalRevenues: number;
  netCashFlow: number;
  capitalEnd: number | null;

  capitalMovements: {
    propertyInvestments:
      LongTermCapitalMovement[];

    propertySales:
      LongTermCapitalMovement[];
  };
};

@Injectable()
export class BudgetService {
  private getWorkbookPath(): string {
    return path.join(
      process.cwd(),
      '..',
      'data',
      'Gresleri2026.xlsm',
    );
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private parseNumericText(
    value: string,
  ): number | null {
    let text = value.trim();

    if (!text) {
      return null;
    }

    const percentage =
      text.includes('%');

    const negative =
      text.includes('(') &&
      text.includes(')');

    text = text
      .replace(/[()]/g, '')
      .replace(/\s/g, '')
      .replace(
        /[^0-9,.\-+]/g,
        '',
      );

    if (
      !text ||
      text === '-' ||
      text === '+'
    ) {
      return null;
    }

    const lastComma =
      text.lastIndexOf(',');

    const lastDot =
      text.lastIndexOf('.');

    let normalized = text;

    if (
      lastComma >= 0 &&
      lastDot >= 0
    ) {
      if (lastComma > lastDot) {
        normalized = text
          .replace(/\./g, '')
          .replace(',', '.');
      } else {
        normalized =
          text.replace(/,/g, '');
      }
    } else if (
      lastComma >= 0
    ) {
      const decimalDigits =
        text.length -
        lastComma -
        1;

      normalized =
        decimalDigits >= 1 &&
        decimalDigits <= 2
          ? text.replace(',', '.')
          : text.replace(/,/g, '');
    } else if (
      lastDot >= 0
    ) {
      const decimalDigits =
        text.length -
        lastDot -
        1;

      normalized =
        decimalDigits >= 1 &&
        decimalDigits <= 2
          ? text
          : text.replace(/\./g, '');
    }

    const parsed =
      Number(normalized);

    if (!Number.isFinite(parsed)) {
      return null;
    }

    let result =
      negative
        ? -Math.abs(parsed)
        : parsed;

    if (percentage) {
      result /= 100;
    }

    return result;
  }

  private getNumericValue(
    cell: ExcelJS.Cell,
  ): number | null {
    const value = cell.value;

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
      const result = value.result;

      if (
        typeof result === 'number' &&
        Number.isFinite(result)
      ) {
        return result;
      }

      if (
        typeof result === 'string'
      ) {
        const parsed =
          this.parseNumericText(
            result,
          );

        if (parsed !== null) {
          return parsed;
        }
      }
    }

    if (
      typeof value === 'string'
    ) {
      const parsed =
        this.parseNumericText(
          value,
        );

      if (parsed !== null) {
        return parsed;
      }
    }

    return this.parseNumericText(
      cell.text ?? '',
    );
  }

  private findRowByLabel(
    sheet: ExcelJS.Worksheet,
    labels: string[],
  ): number | null {
    const normalizedLabels = labels.map((label) =>
      this.normalize(label),
    );

    for (
      let rowNumber = 1;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const row = sheet.getRow(rowNumber);

      for (
        let columnNumber = 1;
        columnNumber <= Math.min(sheet.columnCount, 8);
        columnNumber += 1
      ) {
        const text = this.normalize(
          row.getCell(columnNumber).text,
        );

        if (!text) {
          continue;
        }

        const matches = normalizedLabels.some(
          (label) =>
            text === label ||
            text.includes(label) ||
            label.includes(text),
        );

        if (matches) {
          return rowNumber;
        }
      }
    }

    return null;
  }

  private findExactRowByLabel(
    sheet: ExcelJS.Worksheet,
    label: string,
  ): number | null {
    const normalizedLabel =
      this.normalize(label);

    for (
      let rowNumber = 1;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const row = sheet.getRow(
        rowNumber,
      );

      for (
        let columnNumber = 1;
        columnNumber <=
          Math.min(
            sheet.columnCount,
            8,
          );
        columnNumber += 1
      ) {
        const text =
          this.normalize(
            row.getCell(
              columnNumber,
            ).text,
          );

        if (
          text ===
          normalizedLabel
        ) {
          return rowNumber;
        }
      }
    }

    return null;
  }

  private getRowLabel(
    sheet: ExcelJS.Worksheet,
    rowNumber: number,
  ): string {
    const row =
      sheet.getRow(rowNumber);

    for (
      let columnNumber = 1;
      columnNumber <=
        Math.min(
          sheet.columnCount,
          8,
        );
      columnNumber += 1
    ) {
      const text =
        row
          .getCell(columnNumber)
          .text
          .trim();

      if (text) {
        return text;
      }
    }

    return '';
  }

  private findRowsByPrefix(
    sheet: ExcelJS.Worksheet,
    prefix: string,
  ): number[] {
    const normalizedPrefix =
      this.normalize(prefix);

    const rows: number[] = [];

    for (
      let rowNumber = 1;
      rowNumber <=
        sheet.rowCount;
      rowNumber += 1
    ) {
      const label =
        this.normalize(
          this.getRowLabel(
            sheet,
            rowNumber,
          ),
        );

      if (
        label.startsWith(
          normalizedPrefix,
        )
      ) {
        rows.push(rowNumber);
      }
    }

    return rows;
  }

  private findColumnByLabel(
    sheet: ExcelJS.Worksheet,
    rowNumber: number,
    label: string,
  ): number | null {
    const normalizedLabel = this.normalize(label);
    const row = sheet.getRow(rowNumber);

    for (
      let columnNumber = 1;
      columnNumber <= sheet.columnCount;
      columnNumber += 1
    ) {
      const text = this.normalize(
        row.getCell(columnNumber).text,
      );

      if (
        text === normalizedLabel ||
        text.includes(normalizedLabel)
      ) {
        return columnNumber;
      }
    }

    return null;
  }

  private findBudgetHeaderRow(
    sheet: ExcelJS.Worksheet,
  ): number | null {
    for (
      let rowNumber = 1;
      rowNumber <= Math.min(sheet.rowCount, 20);
      rowNumber += 1
    ) {
      const row = sheet.getRow(rowNumber);

      const texts: string[] = [];

      for (
        let columnNumber = 1;
        columnNumber <= sheet.columnCount;
        columnNumber += 1
      ) {
        const text = this.normalize(
          row.getCell(columnNumber).text,
        );

        if (text) {
          texts.push(text);
        }
      }

      const has2026Budget = texts.some(
        (text) =>
          text.includes('budget') &&
          text.includes('2026'),
      );

      const has2027Budget = texts.some(
        (text) =>
          text.includes('budget') &&
          text.includes('2027'),
      );

      if (has2026Budget && has2027Budget) {
        return rowNumber;
      }
    }

    return null;
  }

  private sumColumnRange(
    sheet: ExcelJS.Worksheet,
    columnNumber: number,
    startRow: number,
    endRow: number,
  ): number {
    let total = 0;

    for (
      let rowNumber = startRow;
      rowNumber <= endRow;
      rowNumber += 1
    ) {
      const row = sheet.getRow(rowNumber);

      const rowLabel = Array.from(
        { length: Math.min(sheet.columnCount, 3) },
        (_, index) => row.getCell(index + 1).text,
      )
        .filter(Boolean)
        .join(' ');

      if (
        this.normalize(rowLabel).includes('totale')
      ) {
        continue;
      }

      const value = this.getNumericValue(
        row.getCell(columnNumber),
      );

      if (value !== null) {
        total += value;
      }
    }

    return total;
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private readAnnualBudget(
    sheet: ExcelJS.Worksheet,
    columnNumber: number,
    year: number,
    scenario: string,
    ordinaryTotalRow: number,
    extraordinaryTotalRow: number,
    revenueTotalRow: number,
  ): AnnualBudget {
    const ordinaryExpenses =
      this.getNumericValue(
        sheet
          .getRow(ordinaryTotalRow)
          .getCell(columnNumber),
      ) ?? 0;

    const extraordinaryExpenses =
      this.getNumericValue(
        sheet
          .getRow(extraordinaryTotalRow)
          .getCell(columnNumber),
      ) ?? 0;

    const revenues =
      this.getNumericValue(
        sheet
          .getRow(revenueTotalRow)
          .getCell(columnNumber),
      ) ?? 0;

    const totalExpenses =
      ordinaryExpenses + extraordinaryExpenses;

    return {
      year,
      scenario,
      ordinaryExpenses: this.round(
        ordinaryExpenses,
      ),
      extraordinaryExpenses: this.round(
        extraordinaryExpenses,
      ),
      totalExpenses: this.round(totalExpenses),
      revenues: this.round(revenues),
      netCashFlow: this.round(
        revenues - totalExpenses,
      ),
    };
  }

  private readLongTermBudget(
    sheet: ExcelJS.Worksheet,
    warnings: string[],
  ): LongTermYear[] {
    const yearRow =
      this.findExactRowByLabel(
        sheet,
        'Anno solare',
      );

    const capitalStartRow =
      this.findExactRowByLabel(
        sheet,
        'Capitale inizio anno',
      );

    const costsRow =
      this.findExactRowByLabel(
        sheet,
        'Costi Totali',
      );

    /*
     * Il foglio contiene due sezioni
     * denominate "Ricavi Totali".
     * La proiezione di lungo termine
     * utilizza l'ultima occorrenza.
     */
    const revenueRows =
      this.findRowsByPrefix(
        sheet,
        'Ricavi Totali',
      );

    const revenuesRow =
      revenueRows.length > 0
        ? revenueRows[
            revenueRows.length - 1
          ]
        : null;

    const ordinaryExpensesRow =
      this.findExactRowByLabel(
        sheet,
        'Spese Ordinarie',
      );

    const extraordinaryExpensesRow =
      this.findExactRowByLabel(
        sheet,
        'Spese Straordinarie',
      );

    const propertyInvestmentsRow =
      this.findExactRowByLabel(
        sheet,
        'Investimenti Immobili',
      );

    const propertySaleRows =
      this.findRowsByPrefix(
        sheet,
        'Vendita Immobile',
      );

    if (
      yearRow === null ||
      capitalStartRow === null ||
      costsRow === null ||
      revenuesRow === null ||
      ordinaryExpensesRow === null ||
      extraordinaryExpensesRow ===
        null ||
      propertyInvestmentsRow ===
        null
    ) {
      warnings.push(
        'Righe principali del Budget 27-66 non identificate.',
      );

      return [];
    }

    const propertyInvestmentRows:
      number[] = [];

    for (
      let rowNumber =
        propertyInvestmentsRow + 1;

      rowNumber < revenuesRow;
      rowNumber += 1
    ) {
      const label =
        this.getRowLabel(
          sheet,
          rowNumber,
        );

      if (label) {
        propertyInvestmentRows.push(
          rowNumber,
        );
      }
    }

    const provisionalYears: Array<
      Omit<LongTermYear, 'capitalEnd'>
    > = [];

    for (
      let columnNumber = 1;
      columnNumber <=
        sheet.columnCount;
      columnNumber += 1
    ) {
      const yearValue =
        this.getNumericValue(
          sheet
            .getRow(yearRow)
            .getCell(columnNumber),
        );

      if (
        yearValue === null ||
        yearValue < 2027 ||
        yearValue > 2066
      ) {
        continue;
      }

      const capitalStart =
        this.getNumericValue(
          sheet
            .getRow(capitalStartRow)
            .getCell(columnNumber),
        );

      const totalCosts =
        this.getNumericValue(
          sheet
            .getRow(costsRow)
            .getCell(columnNumber),
        ) ?? 0;

      const totalRevenues =
        this.getNumericValue(
          sheet
            .getRow(revenuesRow)
            .getCell(columnNumber),
        ) ?? 0;

      const ordinaryExpenses =
        this.getNumericValue(
          sheet
            .getRow(
              ordinaryExpensesRow,
            )
            .getCell(columnNumber),
        ) ?? 0;

      const extraordinaryExpenses =
        this.getNumericValue(
          sheet
            .getRow(
              extraordinaryExpensesRow,
            )
            .getCell(columnNumber),
        ) ?? 0;

      const propertyInvestmentDetails =
        propertyInvestmentRows
          .map((rowNumber) => {
            const row =
              sheet.getRow(
                rowNumber,
              );

            const amount =
              this.getNumericValue(
                row.getCell(
                  columnNumber,
                ),
              ) ?? 0;

            return {
              label:
                this.getRowLabel(
                  sheet,
                  rowNumber,
                ),

              amount:
                this.round(amount),
            };
          })
          .filter(
            (movement) =>
              movement.label &&
              movement.amount !== 0,
          );

      const propertyInvestments =
        this.getNumericValue(
          sheet
            .getRow(
              propertyInvestmentsRow,
            )
            .getCell(columnNumber),
        ) ??
        propertyInvestmentDetails.reduce(
          (total, movement) =>
            total +
            movement.amount,
          0,
        );

      const propertySaleDetails =
        propertySaleRows
          .map((rowNumber) => {
            const row =
              sheet.getRow(
                rowNumber,
              );

            const amount =
              this.getNumericValue(
                row.getCell(
                  columnNumber,
                ),
              ) ?? 0;

            return {
              label:
                this.getRowLabel(
                  sheet,
                  rowNumber,
                ),

              amount:
                this.round(amount),
            };
          })
          .filter(
            (movement) =>
              movement.label &&
              movement.amount !== 0,
          );

      const propertySales =
        propertySaleDetails.reduce(
          (total, movement) =>
            total +
            movement.amount,
          0,
        );

      const operatingCosts =
        ordinaryExpenses +
        extraordinaryExpenses;

      const operatingRevenues =
        totalRevenues -
        propertySales;

      const operatingNetCashFlow =
        operatingRevenues -
        operatingCosts;

      const propertyNetCashFlow =
        propertySales -
        propertyInvestments;

      provisionalYears.push({
        year:
          Math.round(yearValue),

        capitalStart:
          capitalStart === null
            ? null
            : this.round(
                capitalStart,
              ),

        ordinaryExpenses:
          this.round(
            ordinaryExpenses,
          ),

        extraordinaryExpenses:
          this.round(
            extraordinaryExpenses,
          ),

        operatingCosts:
          this.round(
            operatingCosts,
          ),

        propertyInvestments:
          this.round(
            propertyInvestments,
          ),

        propertySales:
          this.round(
            propertySales,
          ),

        operatingRevenues:
          this.round(
            operatingRevenues,
          ),

        operatingNetCashFlow:
          this.round(
            operatingNetCashFlow,
          ),

        propertyNetCashFlow:
          this.round(
            propertyNetCashFlow,
          ),

        totalCosts:
          this.round(totalCosts),

        totalRevenues:
          this.round(
            totalRevenues,
          ),

        netCashFlow:
          this.round(
            totalRevenues -
            totalCosts,
          ),

        capitalMovements: {
          propertyInvestments:
            propertyInvestmentDetails,

          propertySales:
            propertySaleDetails,
        },
      });
    }

    return provisionalYears.map(
      (entry, index) => {
        const nextYear =
          provisionalYears[
            index + 1
          ];

        let capitalEnd:
          number | null = null;

        if (
          nextYear &&
          nextYear.capitalStart !==
            null
        ) {
          capitalEnd =
            nextYear.capitalStart;
        } else if (
          entry.capitalStart !== null
        ) {
          capitalEnd =
            this.round(
              entry.capitalStart +
              entry.netCashFlow,
            );
        }

        return {
          ...entry,
          capitalEnd,
        };
      },
    );
  }

  async getOverview() {
    const workbookPath = this.getWorkbookPath();

    if (!fs.existsSync(workbookPath)) {
      throw new NotFoundException(
        `Workbook non trovato: ${workbookPath}`,
      );
    }

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(workbookPath);

    const annualSheet =
      workbook.getWorksheet('Budget 27');

    const longTermSheet =
      workbook.getWorksheet('Budget 27-66');

    if (!annualSheet || !longTermSheet) {
      throw new NotFoundException(
        'Fogli Budget 27 o Budget 27-66 non trovati.',
      );
    }

    const warnings: string[] = [];

    const headerRow =
      this.findBudgetHeaderRow(annualSheet);

    const ordinaryStart =
      this.findRowByLabel(annualSheet, [
        'Spese Ordinarie',
      ]);

    const extraordinaryStart =
      this.findRowByLabel(annualSheet, [
        'Spese Straordinarie/Investimenti',
      ]);

    const revenueStart =
      this.findRowByLabel(annualSheet, [
        'Ricavi Ordinari e Straordinari',
      ]);

    if (
      headerRow === null ||
      ordinaryStart === null ||
      extraordinaryStart === null ||
      revenueStart === null
    ) {
      throw new Error(
        'Struttura del foglio Budget 27 non riconosciuta.',
      );
    }

    const budget2026Column =
      this.findColumnByLabel(
        annualSheet,
        headerRow,
        'Budget 2026',
      );

    const forecast2026Column =
      this.findColumnByLabel(
        annualSheet,
        headerRow,
        'Forecast 2026',
      );

    const budget2027Column =
      this.findColumnByLabel(
        annualSheet,
        headerRow,
        'Budget 2027',
      );

    if (
      budget2026Column === null ||
      forecast2026Column === null ||
      budget2027Column === null
    ) {
      throw new Error(
        'Colonne Budget 2026, Forecast 2026 o Budget 2027 non trovate.',
      );
    }

    const annualComparison = [
      this.readAnnualBudget(
        annualSheet,
        budget2026Column,
        2026,
        'BUDGET',
        ordinaryStart,
        extraordinaryStart,
        revenueStart,
      ),

      this.readAnnualBudget(
        annualSheet,
        forecast2026Column,
        2026,
        'FORECAST',
        ordinaryStart,
        extraordinaryStart,
        revenueStart,
      ),

      this.readAnnualBudget(
        annualSheet,
        budget2027Column,
        2027,
        'BUDGET',
        ordinaryStart,
        extraordinaryStart,
        revenueStart,
      ),
    ];

    const longTermYears = this.readLongTermBudget(
      longTermSheet,
      warnings,
    );

    const capitalValues = longTermYears.filter(
      (
        year,
      ): year is LongTermYear & {
        capitalEnd: number;
      } => year.capitalEnd !== null,
    );

    const minimumCapitalYear =
      capitalValues.length > 0
        ? capitalValues.reduce((minimum, current) =>
            current.capitalEnd < minimum.capitalEnd
              ? current
              : minimum,
          )
        : null;

    const firstNegativeCapitalYear =
      capitalValues.find(
        (year) => year.capitalEnd < 0,
      ) ?? null;

    const averageNetCashFlow =
      longTermYears.length > 0
        ? this.round(
            longTermYears.reduce(
              (sum, year) =>
                sum + year.netCashFlow,
              0,
            ) / longTermYears.length,
          )
        : 0;

    const workbookStats = fs.statSync(workbookPath);

    return {
      workbook: path.basename(workbookPath),
      asOfDate: workbookStats.mtime.toISOString(),

      annualComparison,

      longTerm: {
        startYear:
          longTermYears[0]?.year ?? null,
        endYear:
          longTermYears[
            longTermYears.length - 1
          ]?.year ?? null,
        yearCount: longTermYears.length,
        averageNetCashFlow,
        minimumCapital:
          minimumCapitalYear?.capitalEnd ?? null,
        minimumCapitalYear:
          minimumCapitalYear?.year ?? null,
        firstNegativeCapitalYear:
          firstNegativeCapitalYear?.year ?? null,
        years: longTermYears,
      },

      warnings,
    };
  }
}
