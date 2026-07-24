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

}
