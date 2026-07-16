import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type LiquidityAccount = {
  id: number;
  code: string;
  name: string;
  institution: string;
  accountType: string;
  country: string | null;
  currency: string;
  nativeAmount: number | null;
  fxRateToBase: number | null;
  valueBase: number;
  baseCurrency: string;
  weight: number;
  valuationDate: string;
  source: string;
  notes: string | null;
};

type AllocationGroup = {
  name: string;
  value: number;
  accountCount: number;
  weight: number;
};

@Injectable()
export class LiquidityService {
  constructor(private readonly prisma: PrismaService) {}

  private identifyInstitution(name: string): string {
    const normalized = name.toLowerCase();

    if (normalized.includes('fineco')) {
      return 'Fineco';
    }

    if (normalized.includes('rakbank')) {
      return 'RakBank';
    }

    if (
      normalized.includes('interactive brokers') ||
      normalized.includes('ibkr')
    ) {
      return 'Interactive Brokers';
    }

    if (normalized.includes('bbva')) {
      return 'BBVA';
    }

    if (normalized.includes('revolut')) {
      return 'Revolut';
    }

    return name;
  }

  private createAllocation(
    accounts: LiquidityAccount[],
    field: 'institution' | 'currency' | 'country',
    totalLiquidity: number,
  ): AllocationGroup[] {
    const groups = new Map<
      string,
      {
        name: string;
        value: number;
        accountCount: number;
      }
    >();

    for (const account of accounts) {
      const groupName = account[field] ?? 'Non classificato';

      const current = groups.get(groupName) ?? {
        name: groupName,
        value: 0,
        accountCount: 0,
      };

      current.value += account.valueBase;
      current.accountCount += 1;

      groups.set(groupName, current);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        weight:
          totalLiquidity > 0
            ? (group.value / totalLiquidity) * 100
            : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }

  async getOverview() {
    const household = await this.prisma.household.findFirst({
      orderBy: {
        id: 'asc',
      },
    });

    if (!household) {
      throw new NotFoundException(
        'Nessun household configurato.',
      );
    }

    const databaseAccounts =
      await this.prisma.wealthPosition.findMany({
        where: {
          householdId: household.id,
          category: 'LIQUIDITY',
          status: 'ACTIVE',
        },
        orderBy: {
          valueBase: 'desc',
        },
      });

    const totalLiquidity = databaseAccounts.reduce(
      (sum, account) => sum + account.valueBase.toNumber(),
      0,
    );

    const accounts: LiquidityAccount[] =
      databaseAccounts.map((account) => {
        const valueBase = account.valueBase.toNumber();

        return {
          id: account.id,
          code: account.code,
          name: account.name,
          institution: this.identifyInstitution(account.name),
          accountType: account.subcategory ?? 'ACCOUNT',
          country: account.country,
          currency: account.currency,
          nativeAmount:
            account.nativeAmount?.toNumber() ?? null,
          fxRateToBase:
            account.fxRateToBase?.toNumber() ?? null,
          valueBase,
          baseCurrency: account.baseCurrency,
          weight:
            totalLiquidity > 0
              ? (valueBase / totalLiquidity) * 100
              : 0,
          valuationDate: account.valuationDate.toISOString(),
          source: account.source,
          notes: account.notes,
        };
      });

    const institutions = this.createAllocation(
      accounts,
      'institution',
      totalLiquidity,
    );

    const currencies = this.createAllocation(
      accounts,
      'currency',
      totalLiquidity,
    );

    const countries = this.createAllocation(
      accounts,
      'country',
      totalLiquidity,
    );

    const topThreeValue = accounts
      .slice(0, 3)
      .reduce(
        (sum, account) => sum + account.valueBase,
        0,
      );

    const foreignCurrencyValue = accounts
      .filter(
        (account) =>
          account.currency !== household.currency,
      )
      .reduce(
        (sum, account) => sum + account.valueBase,
        0,
      );

    const missingNativeValues = accounts
      .filter(
        (account) =>
          account.currency !== household.currency &&
          account.nativeAmount === null,
      )
      .map((account) => account.name);

    const latestValuationDate =
      databaseAccounts.length > 0
        ? databaseAccounts.reduce(
            (latest, account) =>
              account.valuationDate > latest
                ? account.valuationDate
                : latest,
            databaseAccounts[0].valuationDate,
          )
        : null;

    return {
      household: {
        id: household.id,
        name: household.name,
        currency: household.currency,
      },

      summary: {
        totalLiquidity,
        accountCount: accounts.length,
        institutionCount: institutions.length,
        largestAccountValue:
          accounts[0]?.valueBase ?? 0,
        largestAccountWeight:
          accounts[0]?.weight ?? 0,
        topThreeValue,
        topThreeConcentration:
          totalLiquidity > 0
            ? (topThreeValue / totalLiquidity) * 100
            : 0,
        foreignCurrencyValue,
        foreignCurrencyWeight:
          totalLiquidity > 0
            ? (foreignCurrencyValue / totalLiquidity) * 100
            : 0,
      },

      asOfDate:
        latestValuationDate?.toISOString() ?? null,

      institutions,
      currencies,
      countries,
      accounts,

      dataQuality: {
        missingNativeValueCount:
          missingNativeValues.length,
        missingNativeValues,
        warnings:
          missingNativeValues.length > 0
            ? [
                'Alcuni conti in valuta estera dispongono del controvalore EUR, ma non ancora del saldo nella valuta originale.',
              ]
            : [],
      },
    };
  }
}
