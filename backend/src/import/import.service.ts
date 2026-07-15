import { Injectable } from '@nestjs/common';
import * as path from 'path';

import { PrismaService } from '../prisma/prisma.service';

import { ExcelReader } from './readers/excel-reader';
import { ACCOUNT_MAPPING } from './config/account-mapping';

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccounts() {
    const filePath = path.join(
      process.cwd(),
      '..',
      'data',
      'Gresleri2026.xlsm',
    );

    const reader = new ExcelReader(filePath);

    return ACCOUNT_MAPPING.map((account) => ({
      ...account,
      balance: Number(
        Number(reader.getValue(account.sheet, account.cell)).toFixed(2),
      ),
    }));
  }

  async importAccounts() {
    const accounts = await this.getAccounts();

    let institutionsCreated = 0;
    let accountsImported = 0;

    for (const account of accounts) {
      let institution = await this.prisma.institution.findUnique({
        where: {
          name: account.institution,
        },
      });

      if (!institution) {
        institution = await this.prisma.institution.create({
          data: {
            name: account.institution,
            country: account.country,
            type: account.type,
          },
        });

        institutionsCreated++;
      }

      await this.prisma.account.create({
        data: {
          code: account.code,
          name: account.name,
          currency: account.currency,
          balance: account.balance,
          institutionId: institution.id,
        },
      });

      accountsImported++;
    }

    return {
      success: true,
      institutionsCreated,
      accountsImported,
    };
  }
}
