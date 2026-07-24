import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

import * as ExcelJS from 'exceljs';
import { createHash } from 'crypto';
import * as path from 'path';

const IMPORT_SOURCE =
  'EXCEL_GRESLERI2026_LEDGER';

@Injectable()
export class TransactionImportService
  implements OnModuleDestroy
{
  private readonly prisma =
    new PrismaClient();

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  private async workbookPath() {
    const settings =
      await this.prisma.platformSetting.findUnique({
        where: { id: 1 },
      });

    const folder =
      (
        settings?.dataFolder ??
        '/data'
      ).replace(/^[/\\]+/, '');

    return path.join(
      path.resolve(process.cwd(), '..'),
      folder,
      settings?.sourceWorkbook ??
        'Gresleri2026.xlsm',
    );
  }

  private number(
    cell: ExcelJS.Cell,
  ): number | null {
    const value = cell.value;

    if (typeof value === 'number') {
      return Math.abs(value);
    }

    if (
      value &&
      typeof value === 'object' &&
      'result' in value &&
      typeof value.result === 'number'
    ) {
      return Math.abs(value.result);
    }

    const parsed = Number(
      cell.text
        .replace(/\./g, '')
        .replace(',', '.'),
    );

    return Number.isFinite(parsed)
      ? Math.abs(parsed)
      : null;
  }

  private date(
    cell: ExcelJS.Cell,
  ): Date | null {
    if (cell.value instanceof Date) {
      return cell.value;
    }

    const parsed = new Date(cell.text);

    return Number.isNaN(parsed.getTime())
      ? null
      : parsed;
  }

  private reference(
    value: string,
  ): string {
    return createHash('sha256')
      .update(value)
      .digest('hex')
      .slice(0, 32);
  }

  async previewBbva() {
    const workbook =
      new ExcelJS.Workbook();

    await workbook.xlsx.readFile(
      await this.workbookPath(),
    );

    const sheet =
      workbook.getWorksheet('BBVA');

    if (!sheet) {
      throw new Error(
        'Foglio BBVA non trovato.',
      );
    }

    const occurrences =
      new Map<string, number>();

    const items: Array<{
      date: string;
      type: string;
      amount: number;
      description: string;
      category: string;
      externalReference: string;
      alreadyImported: boolean;
    }> = [];

    for (
      let rowNumber = 2;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const row =
        sheet.getRow(rowNumber);

      const transactionDate =
        this.date(row.getCell(2));

      const income =
        this.number(row.getCell(4));

      const expense =
        this.number(row.getCell(5));

      const amount =
        income && income > 0
          ? income
          : expense && expense > 0
            ? expense
            : null;

      if (
        !transactionDate ||
        amount === null
      ) {
        continue;
      }

      const description =
        row.getCell(6).text.trim();

      const category =
        row.getCell(7).text.trim();

      const normalizedCategory =
        category.toLowerCase();

      if (
        [
          'giroconto',
          'prelievo contante',
          'entrate da non contabilizzare',
          'spese da non contabilizzare',
        ].includes(normalizedCategory)
      ) {
        continue;
      }

      const type =
        normalizedCategory.includes(
          'commission',
        )
          ? 'FEE'
          : normalizedCategory.includes(
                'impost',
              ) ||
              normalizedCategory === 'ibi' ||
              normalizedCategory.includes(
                'tassa di circolazione',
              )
            ? 'TAX'
            : income && income > 0
              ? 'OTHER_INCOME'
              : 'OTHER_EXPENSE';

      const signature = [
        transactionDate
          .toISOString()
          .slice(0, 10),
        type,
        amount.toFixed(2),
        description,
        category,
      ].join('|');

      const occurrence =
        (occurrences.get(signature) ?? 0) +
        1;

      occurrences.set(
        signature,
        occurrence,
      );

      items.push({
        date:
          transactionDate.toISOString(),
        type,
        amount,
        description,
        category,
        externalReference:
          this.reference(
            `${signature}|${occurrence}`,
          ),
        alreadyImported: false,
      });
    }

    const existing =
      await this.prisma
        .wealthTransaction.findMany({
          where: {
            source: IMPORT_SOURCE,
            externalReference: {
              in: items.map(
                (item) =>
                  item.externalReference,
              ),
            },
          },
          select: {
            externalReference: true,
          },
        });

    const existingReferences =
      new Set(
        existing.map(
          (item) =>
            item.externalReference,
        ),
      );

    for (const item of items) {
      item.alreadyImported =
        existingReferences.has(
          item.externalReference,
        );
    }

    return {
      sheet: 'BBVA',
      extracted: items.length,
      newTransactions:
        items.filter(
          (item) =>
            !item.alreadyImported,
        ).length,
      alreadyImported:
        items.filter(
          (item) =>
            item.alreadyImported,
        ).length,
      items,
    };
  }
  async importBbva(confirm: boolean) {
    if (!confirm) {
      throw new BadRequestException(
        'L’importazione richiede conferma esplicita.',
      );
    }

    const preview = await this.previewBbva();

    const pending = preview.items.filter(
      (item) => !item.alreadyImported,
    );

    const household =
      await this.prisma.household.findFirst({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          currency: true,
        },
      });

    if (!household) {
      throw new NotFoundException(
        'Household principale non trovato.',
      );
    }

    await this.prisma.$transaction(
      pending.map((item) => {
        const outflow =
          item.type !== 'OTHER_INCOME';

        return this.prisma.wealthTransaction.create({
          data: {
            householdId: household.id,
            transactionDate: new Date(item.date),
            transactionType: item.type,
            direction: outflow
              ? 'OUTFLOW'
              : 'INFLOW',
            grossAmount: item.amount,
            fees: 0,
            taxes: 0,
            netAmount: item.amount,
            currency: 'EUR',
            fxRateToBase: 1,
            baseAmount: item.amount,
            baseCurrency: household.currency,
            sourceAccountCode: outflow
              ? 'CASH_BBVA'
              : null,
            destinationAccountCode: outflow
              ? null
              : 'CASH_BBVA',
            source: IMPORT_SOURCE,
            status: 'POSTED',
            externalReference:
              item.externalReference,
            notes: [
              'BBVA',
              item.category,
              item.description,
            ]
              .filter(Boolean)
              .join(' | '),
          },
        });
      }),
    );

    return {
      imported: pending.length,
      skipped: preview.alreadyImported,
      total: preview.extracted,
    };
  }

  async previewRakBankEur() {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(
      await this.workbookPath(),
    );

    const sheet =
      workbook.getWorksheet('RakBank EUR');

    if (!sheet) {
      throw new Error(
        'Foglio RakBank EUR non trovato.',
      );
    }

    const occurrences =
      new Map<string, number>();

    const items: Array<{
      date: string;
      type: string;
      amount: number;
      description: string;
      category: string;
      externalReference: string;
      alreadyImported: boolean;
    }> = [];

    for (
      let rowNumber = 2;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const row = sheet.getRow(rowNumber);

      const transactionDate =
        this.date(row.getCell(2));

      const income =
        this.number(row.getCell(4));

      const expense =
        this.number(row.getCell(5));

      const amount =
        income && income > 0
          ? income
          : expense && expense > 0
            ? expense
            : null;

      if (!transactionDate || amount === null) {
        continue;
      }

      const description =
        row.getCell(6).text.trim();

      const category =
        row.getCell(7).text.trim();

      const normalizedCategory =
        category.toLowerCase();

      if (
        [
          'giroconto',
          'prelievo contante',
          'entrate da non contabilizzare',
          'spese da non contabilizzare',
        ].includes(normalizedCategory)
      ) {
        continue;
      }

      const type =
        normalizedCategory.includes('commission')
          ? 'FEE'
          : income && income > 0
            ? 'OTHER_INCOME'
            : 'OTHER_EXPENSE';

      const signature = [
        'RAKBANK_EUR',
        transactionDate
          .toISOString()
          .slice(0, 10),
        type,
        amount.toFixed(2),
        description,
        category,
      ].join('|');

      const occurrence =
        (occurrences.get(signature) ?? 0) + 1;

      occurrences.set(signature, occurrence);

      items.push({
        date: transactionDate.toISOString(),
        type,
        amount,
        description,
        category,
        externalReference:
          this.reference(
            `${signature}|${occurrence}`,
          ),
        alreadyImported: false,
      });
    }

    const existing =
      await this.prisma.wealthTransaction.findMany({
        where: {
          source: IMPORT_SOURCE,
          externalReference: {
            in: items.map(
              (item) =>
                item.externalReference,
            ),
          },
        },
        select: {
          externalReference: true,
        },
      });

    const existingReferences =
      new Set(
        existing.map(
          (item) =>
            item.externalReference,
        ),
      );

    for (const item of items) {
      item.alreadyImported =
        existingReferences.has(
          item.externalReference,
        );
    }

    return {
      sheet: 'RakBank EUR',
      extracted: items.length,
      newTransactions:
        items.filter(
          (item) =>
            !item.alreadyImported,
        ).length,
      alreadyImported:
        items.filter(
          (item) =>
            item.alreadyImported,
        ).length,
      items,
    };
  }

  async importRakBankEur(confirm: boolean) {
    if (!confirm) {
      throw new BadRequestException(
        'L’importazione richiede conferma esplicita.',
      );
    }

    const preview =
      await this.previewRakBankEur();

    const pending = preview.items.filter(
      (item) => !item.alreadyImported,
    );

    const household =
      await this.prisma.household.findFirst({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          currency: true,
        },
      });

    if (!household) {
      throw new NotFoundException(
        'Household principale non trovato.',
      );
    }

    await this.prisma.$transaction(
      pending.map((item) =>
        this.prisma.wealthTransaction.create({
          data: {
            householdId: household.id,
            transactionDate: new Date(item.date),
            transactionType: item.type,
            direction: 'OUTFLOW',
            grossAmount: item.amount,
            fees: 0,
            taxes: 0,
            netAmount: item.amount,
            currency: 'EUR',
            fxRateToBase: 1,
            baseAmount: item.amount,
            baseCurrency: household.currency,
            sourceAccountCode:
              'CASH_RAKBANK_EUR',
            source: IMPORT_SOURCE,
            status: 'POSTED',
            externalReference:
              item.externalReference,
            notes: [
              'RakBank EUR',
              item.category,
              item.description,
            ]
              .filter(Boolean)
              .join(' | '),
          },
        }),
      ),
    );

    return {
      imported: pending.length,
      skipped: preview.alreadyImported,
      total: preview.extracted,
    };
  }

  async previewRakBankAed() {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(
      await this.workbookPath(),
    );

    const sheet =
      workbook.getWorksheet('RakBank AED');

    if (!sheet) {
      throw new Error(
        'Foglio RakBank AED non trovato.',
      );
    }

    const occurrences =
      new Map<string, number>();

    const items: Array<{
      date: string;
      type: string;
      amount: number;
      baseAmount: number;
      fxRateToBase: number;
      description: string;
      category: string;
      externalReference: string;
      alreadyImported: boolean;
    }> = [];

    for (
      let rowNumber = 5;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const row = sheet.getRow(rowNumber);

      const transactionDate =
        this.date(row.getCell(3));

      const incomeAed =
        this.number(row.getCell(5));

      const expenseAed =
        this.number(row.getCell(6));

      const incomeEur =
        this.number(row.getCell(7));

      const expenseEur =
        this.number(row.getCell(8));

      const amount =
        incomeAed && incomeAed > 0
          ? incomeAed
          : expenseAed && expenseAed > 0
            ? expenseAed
            : null;

      const baseAmount =
        incomeEur && incomeEur > 0
          ? incomeEur
          : expenseEur && expenseEur > 0
            ? expenseEur
            : null;

      if (
        !transactionDate ||
        amount === null ||
        baseAmount === null
      ) {
        continue;
      }

      const description =
        row.getCell(9).text.trim();

      const category =
        row.getCell(10).text.trim();

      const normalizedCategory =
        category.toLowerCase();

      if (normalizedCategory === 'giroconto') {
        continue;
      }

      const type =
        normalizedCategory === 'rimborsi'
          ? 'INTEREST'
          : normalizedCategory ===
              'project plan dubai i'
            ? 'PROPERTY_EXPENSE'
            : 'OTHER_EXPENSE';

      const signature = [
        'RAKBANK_AED',
        transactionDate
          .toISOString()
          .slice(0, 10),
        type,
        amount.toFixed(2),
        baseAmount.toFixed(2),
        description,
        category,
      ].join('|');

      const occurrence =
        (occurrences.get(signature) ?? 0) + 1;

      occurrences.set(signature, occurrence);

      items.push({
        date: transactionDate.toISOString(),
        type,
        amount,
        baseAmount,
        fxRateToBase:
          baseAmount / amount,
        description,
        category,
        externalReference:
          this.reference(
            `${signature}|${occurrence}`,
          ),
        alreadyImported: false,
      });
    }

    const existing =
      await this.prisma.wealthTransaction.findMany({
        where: {
          source: IMPORT_SOURCE,
          externalReference: {
            in: items.map(
              (item) =>
                item.externalReference,
            ),
          },
        },
        select: {
          externalReference: true,
        },
      });

    const references =
      new Set(
        existing.map(
          (item) =>
            item.externalReference,
        ),
      );

    for (const item of items) {
      item.alreadyImported =
        references.has(
          item.externalReference,
        );
    }

    return {
      sheet: 'RakBank AED',
      extracted: items.length,
      newTransactions:
        items.filter(
          (item) =>
            !item.alreadyImported,
        ).length,
      alreadyImported:
        items.filter(
          (item) =>
            item.alreadyImported,
        ).length,
      items,
    };
  }

  async importRakBankAed(confirm: boolean) {
    if (!confirm) {
      throw new BadRequestException(
        'L’importazione richiede conferma esplicita.',
      );
    }

    const preview =
      await this.previewRakBankAed();

    const pending = preview.items.filter(
      (item) => !item.alreadyImported,
    );

    const household =
      await this.prisma.household.findFirst({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          currency: true,
        },
      });

    if (!household) {
      throw new NotFoundException(
        'Household principale non trovato.',
      );
    }

    await this.prisma.$transaction(
      pending.map((item) => {
        const inflow =
          item.type === 'INTEREST';

        return this.prisma
          .wealthTransaction.create({
            data: {
              householdId: household.id,
              transactionDate:
                new Date(item.date),
              transactionType: item.type,
              direction: inflow
                ? 'INFLOW'
                : 'OUTFLOW',
              grossAmount: item.amount,
              fees: 0,
              taxes: 0,
              netAmount: item.amount,
              currency: 'AED',
              fxRateToBase:
                item.fxRateToBase,
              baseAmount:
                item.baseAmount,
              baseCurrency:
                household.currency,
              sourceAccountCode: inflow
                ? null
                : 'CASH_RAKBANK_AED',
              destinationAccountCode: inflow
                ? 'CASH_RAKBANK_AED'
                : null,
              source: IMPORT_SOURCE,
              status: 'POSTED',
              externalReference:
                item.externalReference,
              notes: [
                'RakBank AED',
                item.category,
                item.description,
              ]
                .filter(Boolean)
                .join(' | '),
            },
          });
      }),
    );

    return {
      imported: pending.length,
      skipped: preview.alreadyImported,
      total: preview.extracted,
    };
  }

  async previewRevolut() {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(
      await this.workbookPath(),
    );

    const sheet = workbook.getWorksheet('Revolut');

    if (!sheet) {
      throw new Error('Foglio Revolut non trovato.');
    }

    const occurrences = new Map<string, number>();

    const items: Array<{
      date: string;
      type: string;
      amount: number;
      description: string;
      category: string;
      externalReference: string;
      alreadyImported: boolean;
    }> = [];

    for (
      let rowNumber = 2;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const row = sheet.getRow(rowNumber);

      const transactionDate =
        this.date(row.getCell(2));

      const income =
        this.number(row.getCell(4));

      const expense =
        this.number(row.getCell(5));

      const amount =
        income && income > 0
          ? income
          : expense && expense > 0
            ? expense
            : null;

      if (!transactionDate || amount === null) {
        continue;
      }

      const description =
        row.getCell(6).text.trim();

      const category =
        row.getCell(7).text.trim();

      const normalizedCategory =
        category.toLowerCase();

      if (
        normalizedCategory === 'giroconto' ||
        normalizedCategory === 'prelievo contante'
      ) {
        continue;
      }

      const type =
        income && income > 0
          ? 'OTHER_INCOME'
          : 'OTHER_EXPENSE';

      const signature = [
        'REVOLUT',
        transactionDate.toISOString().slice(0, 10),
        type,
        amount.toFixed(2),
        description,
        category,
      ].join('|');

      const occurrence =
        (occurrences.get(signature) ?? 0) + 1;

      occurrences.set(signature, occurrence);

      items.push({
        date: transactionDate.toISOString(),
        type,
        amount,
        description,
        category,
        externalReference:
          this.reference(
            `${signature}|${occurrence}`,
          ),
        alreadyImported: false,
      });
    }

    const existing =
      await this.prisma.wealthTransaction.findMany({
        where: {
          source: IMPORT_SOURCE,
          externalReference: {
            in: items.map(
              (item) => item.externalReference,
            ),
          },
        },
        select: {
          externalReference: true,
        },
      });

    const references = new Set(
      existing.map(
        (item) => item.externalReference,
      ),
    );

    for (const item of items) {
      item.alreadyImported =
        references.has(item.externalReference);
    }

    return {
      sheet: 'Revolut',
      extracted: items.length,
      newTransactions:
        items.filter(
          (item) => !item.alreadyImported,
        ).length,
      alreadyImported:
        items.filter(
          (item) => item.alreadyImported,
        ).length,
      items,
    };
  }

  async importRevolut(confirm: boolean) {
    if (!confirm) {
      throw new BadRequestException(
        'L’importazione richiede conferma esplicita.',
      );
    }

    const preview = await this.previewRevolut();

    const pending = preview.items.filter(
      (item) => !item.alreadyImported,
    );

    const household =
      await this.prisma.household.findFirst({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          currency: true,
        },
      });

    if (!household) {
      throw new NotFoundException(
        'Household principale non trovato.',
      );
    }

    await this.prisma.$transaction(
      pending.map((item) => {
        const inflow =
          item.type === 'OTHER_INCOME';

        return this.prisma.wealthTransaction.create({
          data: {
            householdId: household.id,
            transactionDate: new Date(item.date),
            transactionType: item.type,
            direction: inflow
              ? 'INFLOW'
              : 'OUTFLOW',
            grossAmount: item.amount,
            fees: 0,
            taxes: 0,
            netAmount: item.amount,
            currency: 'EUR',
            fxRateToBase: 1,
            baseAmount: item.amount,
            baseCurrency: household.currency,
            sourceAccountCode: inflow
              ? null
              : 'CASH_REVOLUT',
            destinationAccountCode: inflow
              ? 'CASH_REVOLUT'
              : null,
            source: IMPORT_SOURCE,
            status: 'POSTED',
            externalReference:
              item.externalReference,
            notes: [
              'Revolut',
              item.category,
              item.description,
            ]
              .filter(Boolean)
              .join(' | '),
          },
        });
      }),
    );

    return {
      imported: pending.length,
      skipped: preview.alreadyImported,
      total: preview.extracted,
    };
  }

  async previewIbkr() {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(
      await this.workbookPath(),
    );

    const sheet = workbook.getWorksheet('IBKR');

    if (!sheet) {
      throw new Error('Foglio IBKR non trovato.');
    }

    const positions =
      await this.prisma.wealthPosition.findMany({
        where: {
          code: {
            in: [
              'INVESTMENT_IBKR_LU1681047236',
              'INVESTMENT_IBKR_IE00BP3QZB59',
            ],
          },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

    const positionByTicker = new Map(
      positions.map((position) => [
        position.code ===
        'INVESTMENT_IBKR_LU1681047236'
          ? 'C50'
          : 'IWVL',
        position,
      ]),
    );

    if (
      !positionByTicker.has('C50') ||
      !positionByTicker.has('IWVL')
    ) {
      throw new Error(
        'Posizioni IBKR C50 o IWVL non trovate.',
      );
    }

    const occurrences = new Map<string, number>();

    const items: Array<{
      date: string;
      type: string;
      amount: number;
      ticker: string;
      positionId: number;
      positionCode: string;
      description: string;
      category: string;
      externalReference: string;
      alreadyImported: boolean;
    }> = [];

    for (
      let rowNumber = 2;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const row = sheet.getRow(rowNumber);

      const transactionDate =
        this.date(row.getCell(2));

      const expense =
        this.number(row.getCell(5));

      const description =
        row.getCell(6).text.trim();

      const category =
        row.getCell(7).text.trim();

      if (
        !transactionDate ||
        !expense ||
        expense <= 0 ||
        category.toLowerCase() === 'giroconto'
      ) {
        continue;
      }

      const upperDescription =
        description.toUpperCase();

      const ticker =
        upperDescription.includes('C50')
          ? 'C50'
          : upperDescription.includes('IWVL')
            ? 'IWVL'
            : null;

      if (!ticker) {
        throw new Error(
          `Strumento IBKR non riconosciuto alla riga ${rowNumber}.`,
        );
      }

      const position =
        positionByTicker.get(ticker)!;

      const signature = [
        'IBKR',
        transactionDate.toISOString().slice(0, 10),
        'BUY',
        expense.toFixed(2),
        ticker,
        description,
        category,
      ].join('|');

      const occurrence =
        (occurrences.get(signature) ?? 0) + 1;

      occurrences.set(signature, occurrence);

      items.push({
        date: transactionDate.toISOString(),
        type: 'BUY',
        amount: expense,
        ticker,
        positionId: position.id,
        positionCode: position.code,
        description,
        category,
        externalReference:
          this.reference(
            `${signature}|${occurrence}`,
          ),
        alreadyImported: false,
      });
    }

    const existing =
      await this.prisma.wealthTransaction.findMany({
        where: {
          source: IMPORT_SOURCE,
          externalReference: {
            in: items.map(
              (item) => item.externalReference,
            ),
          },
        },
        select: {
          externalReference: true,
        },
      });

    const references = new Set(
      existing.map(
        (item) => item.externalReference,
      ),
    );

    for (const item of items) {
      item.alreadyImported =
        references.has(item.externalReference);
    }

    return {
      sheet: 'IBKR',
      extracted: items.length,
      newTransactions:
        items.filter(
          (item) => !item.alreadyImported,
        ).length,
      alreadyImported:
        items.filter(
          (item) => item.alreadyImported,
        ).length,
      items,
    };
  }

  async importIbkr(confirm: boolean) {
    if (!confirm) {
      throw new BadRequestException(
        'L’importazione richiede conferma esplicita.',
      );
    }

    const preview = await this.previewIbkr();

    const pending = preview.items.filter(
      (item) => !item.alreadyImported,
    );

    const household =
      await this.prisma.household.findFirst({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          currency: true,
        },
      });

    if (!household) {
      throw new NotFoundException(
        'Household principale non trovato.',
      );
    }

    await this.prisma.$transaction(
      pending.map((item) =>
        this.prisma.wealthTransaction.create({
          data: {
            householdId: household.id,
            positionId: item.positionId,
            transactionDate: new Date(item.date),
            transactionType: 'BUY',
            direction: 'OUTFLOW',
            grossAmount: item.amount,
            fees: 0,
            taxes: 0,
            netAmount: item.amount,
            currency: 'EUR',
            fxRateToBase: 1,
            baseAmount: item.amount,
            baseCurrency: household.currency,
            sourceAccountCode: 'CASH_IBKR',
            source: IMPORT_SOURCE,
            status: 'POSTED',
            externalReference:
              item.externalReference,
            notes: [
              'IBKR',
              item.ticker,
              item.category,
              item.description,
            ]
              .filter(Boolean)
              .join(' | '),
          },
        }),
      ),
    );

    return {
      imported: pending.length,
      skipped: preview.alreadyImported,
      total: preview.extracted,
    };
  }

  async previewFinecoSa() {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(
      await this.workbookPath(),
    );

    const sheet = workbook.getWorksheet('Fineco Sa');

    if (!sheet) {
      throw new Error('Foglio Fineco Sa non trovato.');
    }

    const positions =
      await this.prisma.wealthPosition.findMany({
        where: {
          code: { startsWith: 'INVESTMENT_' },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

    const positionByIsin = new Map(
      positions
        .map((position) => {
          const isin =
            position.code.match(
              /[A-Z]{2}[A-Z0-9]{10}$/,
            )?.[0];

          return isin
            ? [isin, position] as const
            : null;
        })
        .filter(
          (
            item,
          ): item is readonly [
            string,
            (typeof positions)[number],
          ] => item !== null,
        ),
    );

    const occurrences = new Map<string, number>();

    const items: Array<{
      date: string;
      type: string;
      direction: string;
      amount: number;
      isin: string | null;
      positionId: number | null;
      positionCode: string | null;
      description: string;
      category: string;
      externalReference: string;
      alreadyImported: boolean;
    }> = [];

    for (
      let rowNumber = 2;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const row = sheet.getRow(rowNumber);

      const transactionDate =
        this.date(row.getCell(2));

      if (!transactionDate) {
        continue;
      }

      const income =
        this.number(row.getCell(4)) ?? 0;

      const expense =
        this.number(row.getCell(5)) ?? 0;

      const amount =
        income > 0
          ? income
          : expense > 0
            ? expense
            : null;

      if (amount === null) {
        continue;
      }

      const description =
        row.getCell(7).text.trim();

      const category =
        row.getCell(8).text.trim();

      let type: string | null = null;

      if (category === 'Acquisto Fondi/Titoli') {
        type = 'BUY';
      } else if (category === 'Quote da investimenti') {
        type = 'SELL';
      } else if (
        category === 'Imposta di Bollo Titoli e CC'
      ) {
        type = 'TAX';
      } else if (
        category === 'Altre Commissioni Bancarie' ||
        category ===
          'Commissioni Bancarie su Investimenti'
      ) {
        type = 'FEE';
      } else if (
        category === 'Project Plan Dubai II'
      ) {
        type = 'PROPERTY_EXPENSE';
      } else if (
        category === 'Successione Vanzini'
      ) {
        type =
          income > 0
            ? 'OTHER_INCOME'
            : 'OTHER_EXPENSE';
      } else if (
        category === 'Giroconto' &&
        description.includes(
          'Spese Bonifico Estero',
        )
      ) {
        type = 'FEE';
      }

      if (!type) {
        continue;
      }

      const direction =
        income > 0 ? 'INFLOW' : 'OUTFLOW';

      const isin =
        description.match(
          /\b[A-Z]{2}[A-Z0-9]{10}\b/,
        )?.[0] ?? null;

      const position =
        isin
          ? positionByIsin.get(isin) ?? null
          : null;

      const signature = [
        'FINECO_SA',
        transactionDate
          .toISOString()
          .slice(0, 10),
        type,
        direction,
        amount.toFixed(2),
        isin ?? '',
        description,
        category,
      ].join('|');

      const occurrence =
        (occurrences.get(signature) ?? 0) + 1;

      occurrences.set(signature, occurrence);

      items.push({
        date: transactionDate.toISOString(),
        type,
        direction,
        amount,
        isin,
        positionId: position?.id ?? null,
        positionCode: position?.code ?? null,
        description,
        category,
        externalReference:
          this.reference(
            `${signature}|${occurrence}`,
          ),
        alreadyImported: false,
      });
    }

    const existing =
      await this.prisma.wealthTransaction.findMany({
        where: {
          source: IMPORT_SOURCE,
          externalReference: {
            in: items.map(
              (item) => item.externalReference,
            ),
          },
        },
        select: {
          externalReference: true,
        },
      });

    const references = new Set(
      existing.map(
        (item) => item.externalReference,
      ),
    );

    for (const item of items) {
      item.alreadyImported =
        references.has(item.externalReference);
    }

    return {
      sheet: 'Fineco Sa',
      extracted: items.length,
      newTransactions:
        items.filter(
          (item) => !item.alreadyImported,
        ).length,
      alreadyImported:
        items.filter(
          (item) => item.alreadyImported,
        ).length,
      items,
    };
  }

  async importFinecoSa(confirm: boolean) {
    if (!confirm) {
      throw new BadRequestException(
        'L’importazione richiede conferma esplicita.',
      );
    }

    const preview = await this.previewFinecoSa();

    const pending = preview.items.filter(
      (item) => !item.alreadyImported,
    );

    const household =
      await this.prisma.household.findFirst({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          currency: true,
        },
      });

    if (!household) {
      throw new NotFoundException(
        'Household principale non trovato.',
      );
    }

    await this.prisma.$transaction(
      pending.map((item) => {
        const inflow = item.direction === 'INFLOW';

        return this.prisma.wealthTransaction.create({
          data: {
            householdId: household.id,
            positionId: item.positionId,
            transactionDate: new Date(item.date),
            transactionType: item.type,
            direction: item.direction,
            grossAmount: item.amount,
            fees: 0,
            taxes: 0,
            netAmount: item.amount,
            currency: 'EUR',
            fxRateToBase: 1,
            baseAmount: item.amount,
            baseCurrency: household.currency,
            sourceAccountCode: inflow
              ? null
              : 'CASH_FINECO_SA',
            destinationAccountCode: inflow
              ? 'CASH_FINECO_SA'
              : null,
            source: IMPORT_SOURCE,
            status: 'POSTED',
            externalReference:
              item.externalReference,
            notes: [
              'Fineco SA',
              item.isin,
              item.category,
              item.description,
            ]
              .filter(Boolean)
              .join(' | '),
          },
        });
      }),
    );

    return {
      imported: pending.length,
      skipped: preview.alreadyImported,
      total: preview.extracted,
    };
  }

  async previewFinecoSt() {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(
      await this.workbookPath(),
    );

    const sheet = workbook.getWorksheet('Fineco St');

    if (!sheet) {
      throw new Error('Foglio Fineco St non trovato.');
    }

    const positions =
      await this.prisma.wealthPosition.findMany({
        where: {
          code: {
            in: [
              'INSURANCE_PRODUCT',
              'LIABILITY_RICCIONE',
              'PROPERTY_DUBAI',
              'PROPERTY_EL_TORO',
            ],
          },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

    const positionByCode = new Map(
      positions.map((position) => [
        position.code,
        position,
      ]),
    );

    for (const requiredCode of [
      'INSURANCE_PRODUCT',
      'LIABILITY_RICCIONE',
      'PROPERTY_DUBAI',
      'PROPERTY_EL_TORO',
    ]) {
      if (!positionByCode.has(requiredCode)) {
        throw new Error(
          `Posizione ${requiredCode} non trovata.`,
        );
      }
    }

    const occurrences = new Map<string, number>();

    const items: Array<{
      date: string;
      type: string;
      direction: string;
      amount: number;
      positionId: number | null;
      positionCode: string | null;
      description: string;
      category: string;
      externalReference: string;
      alreadyImported: boolean;
    }> = [];

    for (
      let rowNumber = 2;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const row = sheet.getRow(rowNumber);

      const transactionDate =
        this.date(row.getCell(2));

      if (!transactionDate) {
        continue;
      }

      const income =
        this.number(row.getCell(4)) ?? 0;

      const expense =
        this.number(row.getCell(5)) ?? 0;

      const amount =
        income > 0
          ? income
          : expense > 0
            ? expense
            : null;

      if (amount === null) {
        continue;
      }

      const description =
        row.getCell(7).text.trim();

      const category =
        row.getCell(8).text.trim();

      let type: string | null = null;
      let positionCode: string | null = null;

      if (category === 'Quote da investimenti') {
        type = 'SELL';
        positionCode = 'INSURANCE_PRODUCT';
      } else if (
        category === 'Imposta di Bollo Titoli e CC'
      ) {
        type = 'TAX';
      } else if (
        category === 'Altre Commissioni Bancarie'
      ) {
        type = 'FEE';
      } else if (category === 'Mutuo Riccione') {
        type = 'PROPERTY_EXPENSE';
        positionCode = 'LIABILITY_RICCIONE';
      } else if (
        category === 'Project Plan Dubai I' ||
        category === 'Project Plan Dubai II'
      ) {
        type = 'PROPERTY_EXPENSE';
        positionCode = 'PROPERTY_DUBAI';
      } else if (
        category === 'Spese Per Vendita El Toro'
      ) {
        type = 'PROPERTY_EXPENSE';
        positionCode = 'PROPERTY_EL_TORO';
      } else if (
        category === 'Successione Vanzini' ||
        category === 'Altre spese Italia'
      ) {
        type =
          income > 0
            ? 'OTHER_INCOME'
            : 'OTHER_EXPENSE';
      } else if (
        category === 'Spese per Trasferimento EAU'
      ) {
        type = 'OTHER_EXPENSE';
      }

      if (!type) {
        continue;
      }

      const direction =
        income > 0 ? 'INFLOW' : 'OUTFLOW';

      const position =
        positionCode
          ? positionByCode.get(positionCode) ?? null
          : null;

      const signature = [
        'FINECO_ST',
        transactionDate
          .toISOString()
          .slice(0, 10),
        type,
        direction,
        amount.toFixed(2),
        positionCode ?? '',
        description,
        category,
      ].join('|');

      const occurrence =
        (occurrences.get(signature) ?? 0) + 1;

      occurrences.set(signature, occurrence);

      items.push({
        date: transactionDate.toISOString(),
        type,
        direction,
        amount,
        positionId: position?.id ?? null,
        positionCode,
        description,
        category,
        externalReference:
          this.reference(
            `${signature}|${occurrence}`,
          ),
        alreadyImported: false,
      });
    }

    const existing =
      await this.prisma.wealthTransaction.findMany({
        where: {
          source: IMPORT_SOURCE,
          externalReference: {
            in: items.map(
              (item) => item.externalReference,
            ),
          },
        },
        select: {
          externalReference: true,
        },
      });

    const references = new Set(
      existing.map(
        (item) => item.externalReference,
      ),
    );

    for (const item of items) {
      item.alreadyImported =
        references.has(item.externalReference);
    }

    return {
      sheet: 'Fineco St',
      extracted: items.length,
      newTransactions:
        items.filter(
          (item) => !item.alreadyImported,
        ).length,
      alreadyImported:
        items.filter(
          (item) => item.alreadyImported,
        ).length,
      items,
    };
  }

  async importFinecoSt(confirm: boolean) {
    if (!confirm) {
      throw new BadRequestException(
        'L’importazione richiede conferma esplicita.',
      );
    }

    const preview = await this.previewFinecoSt();

    const pending = preview.items.filter(
      (item) => !item.alreadyImported,
    );

    const household =
      await this.prisma.household.findFirst({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          currency: true,
        },
      });

    if (!household) {
      throw new NotFoundException(
        'Household principale non trovato.',
      );
    }

    await this.prisma.$transaction(
      pending.map((item) => {
        const inflow = item.direction === 'INFLOW';

        return this.prisma.wealthTransaction.create({
          data: {
            householdId: household.id,
            positionId: item.positionId,
            transactionDate: new Date(item.date),
            transactionType: item.type,
            direction: item.direction,
            grossAmount: item.amount,
            fees: 0,
            taxes: 0,
            netAmount: item.amount,
            currency: 'EUR',
            fxRateToBase: 1,
            baseAmount: item.amount,
            baseCurrency: household.currency,
            sourceAccountCode: inflow
              ? null
              : 'CASH_FINECO_ST',
            destinationAccountCode: inflow
              ? 'CASH_FINECO_ST'
              : null,
            source: IMPORT_SOURCE,
            status: 'POSTED',
            externalReference:
              item.externalReference,
            notes: [
              'Fineco ST',
              item.positionCode,
              item.category,
              item.description,
            ]
              .filter(Boolean)
              .join(' | '),
          },
        });
      }),
    );

    return {
      imported: pending.length,
      skipped: preview.alreadyImported,
      total: preview.extracted,
    };
  }

  async previewAmex() {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(
      await this.workbookPath(),
    );

    const sheet = workbook.getWorksheet('Amex');

    if (!sheet) {
      throw new Error('Foglio Amex non trovato.');
    }

    const occurrences = new Map<string, number>();

    const items: Array<{
      date: string;
      type: string;
      direction: string;
      amount: number;
      description: string;
      category: string;
      travel: string;
      notes: string;
      externalReference: string;
      alreadyImported: boolean;
    }> = [];

    for (
      let rowNumber = 2;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const row = sheet.getRow(rowNumber);

      const transactionDate =
        this.date(row.getCell(2));

      if (!transactionDate) {
        continue;
      }

      const income =
        this.number(row.getCell(3)) ?? 0;

      const expense =
        this.number(row.getCell(4)) ?? 0;

      const amount =
        income > 0
          ? income
          : expense > 0
            ? expense
            : null;

      if (amount === null) {
        continue;
      }

      const description =
        row.getCell(5).text.trim();

      const category =
        row.getCell(6).text.trim();

      const travel =
        row.getCell(7).text.trim();

      const notes =
        row.getCell(8).text.trim();

      if (
        category ===
        'Spese da non contabilizzare'
      ) {
        continue;
      }

      let type: string;

      if (income > 0) {
        type = 'OTHER_INCOME';
      } else if (
        category ===
          'Imposta di Bollo Titoli e CC' ||
        category === 'Imposte Italia'
      ) {
        type = 'TAX';
      } else if (
        category === 'Amex' &&
        description.includes(
          'Membership Rewards',
        )
      ) {
        type = 'FEE';
      } else if (
        category === 'Affitto Dubai' ||
        category === 'Manutenzione Immobile'
      ) {
        type = 'PROPERTY_EXPENSE';
      } else {
        type = 'OTHER_EXPENSE';
      }

      const direction =
        income > 0 ? 'INFLOW' : 'OUTFLOW';

      const signature = [
        'AMEX',
        transactionDate
          .toISOString()
          .slice(0, 10),
        type,
        direction,
        amount.toFixed(2),
        description,
        category,
      ].join('|');

      const occurrence =
        (occurrences.get(signature) ?? 0) + 1;

      occurrences.set(signature, occurrence);

      items.push({
        date: transactionDate.toISOString(),
        type,
        direction,
        amount,
        description,
        category,
        travel,
        notes,
        externalReference:
          this.reference(
            `${signature}|${occurrence}`,
          ),
        alreadyImported: false,
      });
    }

    const existing =
      await this.prisma.wealthTransaction.findMany({
        where: {
          source: IMPORT_SOURCE,
          externalReference: {
            in: items.map(
              (item) => item.externalReference,
            ),
          },
        },
        select: {
          externalReference: true,
        },
      });

    const references = new Set(
      existing.map(
        (item) => item.externalReference,
      ),
    );

    for (const item of items) {
      item.alreadyImported =
        references.has(item.externalReference);
    }

    return {
      sheet: 'Amex',
      extracted: items.length,
      newTransactions:
        items.filter(
          (item) => !item.alreadyImported,
        ).length,
      alreadyImported:
        items.filter(
          (item) => item.alreadyImported,
        ).length,
      items,
    };
  }

  async importAmex(confirm: boolean) {
    if (!confirm) {
      throw new BadRequestException(
        'L’importazione richiede conferma esplicita.',
      );
    }

    const preview = await this.previewAmex();

    const pending = preview.items.filter(
      (item) => !item.alreadyImported,
    );

    const household =
      await this.prisma.household.findFirst({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          currency: true,
        },
      });

    if (!household) {
      throw new NotFoundException(
        'Household principale non trovato.',
      );
    }

    await this.prisma.$transaction(
      pending.map((item) => {
        const inflow = item.direction === 'INFLOW';

        return this.prisma.wealthTransaction.create({
          data: {
            householdId: household.id,
            transactionDate: new Date(item.date),
            transactionType: item.type,
            direction: item.direction,
            grossAmount: item.amount,
            fees: 0,
            taxes: 0,
            netAmount: item.amount,
            currency: 'EUR',
            fxRateToBase: 1,
            baseAmount: item.amount,
            baseCurrency: household.currency,
            sourceAccountCode: inflow
              ? null
              : 'AMEX',
            destinationAccountCode: inflow
              ? 'AMEX'
              : null,
            source: IMPORT_SOURCE,
            status: 'POSTED',
            externalReference:
              item.externalReference,
            notes: [
              'Amex',
              item.category,
              item.travel,
              item.description,
              item.notes,
            ]
              .filter(Boolean)
              .join(' | '),
          },
        });
      }),
    );

    return {
      imported: pending.length,
      skipped: preview.alreadyImported,
      total: preview.extracted,
    };
  }

}
