import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

import {
  PrismaClient,
} from '@prisma/client';

const EXTERNAL_CONTRIBUTIONS = [
  'DEPOSIT',
];

const EXTERNAL_WITHDRAWALS = [
  'WITHDRAWAL',
];

const INVESTMENT_INCOME = [
  'DIVIDEND',
  'INTEREST',
  'COUPON',
  'RENT_INCOME',
  'OTHER_INCOME',
];

const INVESTMENT_EXPENSES = [
  'FEE',
  'TAX',
  'PROPERTY_EXPENSE',
  'OTHER_EXPENSE',
];

const TRADING_OPERATIONS = [
  'BUY',
  'SELL',
];

@Injectable()
export class PerformanceService
  implements OnModuleDestroy
{
  private readonly prisma =
    new PrismaClient();

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  private roundCurrency(
    value: number,
  ): number {
    return (
      Math.round(
        (value + Number.EPSILON) * 100,
      ) / 100
    );
  }

  private roundPercentage(
    value: number,
  ): number {
    return (
      Math.round(
        (value + Number.EPSILON) *
          10000,
      ) / 10000
    );
  }

  private parseOptionalDate(
    value: string | undefined,
    fieldName: string,
  ): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      throw new BadRequestException(
        `${fieldName} non valida.`,
      );
    }

    return date;
  }

  private serializeSnapshot(
    snapshot: {
      id: string;
      snapshotDate: Date;
      source: string;
      importRunId: string | null;
      positionCount: number;
      grossAssets: unknown;
      liabilities: unknown;
      netWorth: unknown;
      liquidity: unknown;
      investments: unknown;
      realEstate: unknown;
      otherAssets: unknown;
    },
  ) {
    return {
      id: snapshot.id,

      snapshotDate:
        snapshot.snapshotDate
          .toISOString(),

      source: snapshot.source,

      importRunId:
        snapshot.importRunId,

      positionCount:
        snapshot.positionCount,

      grossAssets:
        Number(snapshot.grossAssets),

      liabilities:
        Number(snapshot.liabilities),

      netWorth:
        Number(snapshot.netWorth),

      liquidity:
        Number(snapshot.liquidity),

      investments:
        Number(snapshot.investments),

      realEstate:
        Number(snapshot.realEstate),

      otherAssets:
        Number(snapshot.otherAssets),
    };
  }

  async getAvailablePeriods() {
    const snapshots =
      await this.prisma.netWorthSnapshot.findMany(
        {
          orderBy: {
            snapshotDate: 'asc',
          },

          select: {
            id: true,
            snapshotDate: true,
            source: true,
            netWorth: true,
          },
        },
      );

    return {
      count: snapshots.length,

      snapshots:
        snapshots.map((snapshot) => ({
          id: snapshot.id,

          snapshotDate:
            snapshot.snapshotDate
              .toISOString(),

          source: snapshot.source,

          netWorth:
            Number(snapshot.netWorth),
        })),
    };
  }

  async getPerformanceSummary(
    from?: string,
    to?: string,
  ) {
    const requestedFrom =
      this.parseOptionalDate(
        from,
        'Data iniziale',
      );

    const requestedTo =
      this.parseOptionalDate(
        to,
        'Data finale',
      );

    if (
      requestedFrom &&
      requestedTo &&
      requestedFrom >= requestedTo
    ) {
      throw new BadRequestException(
        'La data iniziale deve precedere la data finale.',
      );
    }

    const startSnapshot =
      await this.prisma.netWorthSnapshot.findFirst(
        {
          where: requestedFrom
            ? {
                snapshotDate: {
                  gte: requestedFrom,
                },
              }
            : undefined,

          orderBy: {
            snapshotDate: 'asc',
          },
        },
      );

    const endSnapshot =
      await this.prisma.netWorthSnapshot.findFirst(
        {
          where: requestedTo
            ? {
                snapshotDate: {
                  lte: requestedTo,
                },
              }
            : undefined,

          orderBy: {
            snapshotDate: 'desc',
          },
        },
      );

    if (
      !startSnapshot ||
      !endSnapshot
    ) {
      throw new BadRequestException(
        'Non sono disponibili fotografie patrimoniali per il periodo richiesto.',
      );
    }

    if (
      startSnapshot.id ===
        endSnapshot.id ||
      startSnapshot.snapshotDate >=
        endSnapshot.snapshotDate
    ) {
      throw new BadRequestException(
        'Sono necessarie almeno due fotografie patrimoniali distinte.',
      );
    }

    const startDate =
      startSnapshot.snapshotDate;

    const endDate =
      endSnapshot.snapshotDate;

    const transactions =
      await this.prisma.wealthTransaction.findMany(
        {
          where: {
            status: 'POSTED',

            transactionDate: {
              gt: startDate,
              lte: endDate,
            },
          },

          orderBy: {
            transactionDate: 'asc',
          },
        },
      );

    let contributions = 0;
    let withdrawals = 0;
    let investmentIncome = 0;
    let investmentExpenses = 0;
    let internalTransfers = 0;
    let purchases = 0;
    let sales = 0;
    let fees = 0;
    let taxes = 0;

    const externalFlows: Array<{
      amount: number;
      transactionDate: Date;
    }> = [];

    for (
      const transaction of
      transactions
    ) {
      const amount =
        Number(
          transaction.baseAmount,
        );

      const transactionType =
        transaction.transactionType;

      if (
        EXTERNAL_CONTRIBUTIONS.includes(
          transactionType,
        )
      ) {
        contributions += amount;

        externalFlows.push({
          amount,
          transactionDate:
            transaction.transactionDate,
        });
      } else if (
        EXTERNAL_WITHDRAWALS.includes(
          transactionType,
        )
      ) {
        withdrawals += amount;

        externalFlows.push({
          amount: -amount,
          transactionDate:
            transaction.transactionDate,
        });
      } else if (
        INVESTMENT_INCOME.includes(
          transactionType,
        )
      ) {
        investmentIncome += amount;
      } else if (
        INVESTMENT_EXPENSES.includes(
          transactionType,
        )
      ) {
        investmentExpenses += amount;
      }

      if (
        transactionType ===
        'TRANSFER'
      ) {
        internalTransfers += amount;
      }

      if (
        transactionType === 'BUY'
      ) {
        purchases += amount;
      }

      if (
        transactionType === 'SELL'
      ) {
        sales += amount;
      }

      const fxRate =
        transaction.fxRateToBase ===
        null
          ? 1
          : Number(
              transaction.fxRateToBase,
            );

      fees +=
        Number(transaction.fees) *
        fxRate;

      taxes +=
        Number(transaction.taxes) *
        fxRate;
    }

    contributions =
      this.roundCurrency(
        contributions,
      );

    withdrawals =
      this.roundCurrency(
        withdrawals,
      );

    const netExternalFlow =
      this.roundCurrency(
        contributions - withdrawals,
      );

    const startingNetWorth =
      Number(
        startSnapshot.netWorth,
      );

    const endingNetWorth =
      Number(
        endSnapshot.netWorth,
      );

    const netWorthChange =
      this.roundCurrency(
        endingNetWorth -
          startingNetWorth,
      );

    const investmentResult =
      this.roundCurrency(
        netWorthChange -
          netExternalFlow,
      );

    const periodMilliseconds =
      endDate.getTime() -
      startDate.getTime();

    let weightedExternalFlows = 0;

    for (
      const flow of externalFlows
    ) {
      const remainingTime =
        endDate.getTime() -
        flow.transactionDate.getTime();

      const weight =
        Math.max(
          0,
          Math.min(
            1,
            remainingTime /
              periodMilliseconds,
          ),
        );

      weightedExternalFlows +=
        weight * flow.amount;
    }

    weightedExternalFlows =
      this.roundCurrency(
        weightedExternalFlows,
      );

    const modifiedDietzDenominator =
      startingNetWorth +
      weightedExternalFlows;

    const modifiedDietzReturn =
      modifiedDietzDenominator === 0
        ? null
        : this.roundPercentage(
            (
              investmentResult /
              modifiedDietzDenominator
            ) * 100,
          );

    const days =
      Math.max(
        1,
        Math.round(
          periodMilliseconds /
            86400000,
        ),
      );

    const assetClassChanges = {
      liquidity:
        this.roundCurrency(
          Number(
            endSnapshot.liquidity,
          ) -
            Number(
              startSnapshot.liquidity,
            ),
        ),

      investments:
        this.roundCurrency(
          Number(
            endSnapshot.investments,
          ) -
            Number(
              startSnapshot.investments,
            ),
        ),

      realEstate:
        this.roundCurrency(
          Number(
            endSnapshot.realEstate,
          ) -
            Number(
              startSnapshot.realEstate,
            ),
        ),

      otherAssets:
        this.roundCurrency(
          Number(
            endSnapshot.otherAssets,
          ) -
            Number(
              startSnapshot.otherAssets,
            ),
        ),

      liabilities:
        this.roundCurrency(
          Number(
            endSnapshot.liabilities,
          ) -
            Number(
              startSnapshot.liabilities,
            ),
        ),
    };

    return {
      methodology: {
        name: 'MODIFIED_DIETZ',
        currency: 'EUR',

        description:
          'Rendimento patrimoniale depurato dai versamenti e dai prelievi esterni, ponderati per il tempo di permanenza nel periodo.',
      },

      period: {
        start:
          startDate.toISOString(),

        end:
          endDate.toISOString(),

        days,
      },

      startSnapshot:
        this.serializeSnapshot(
          startSnapshot,
        ),

      endSnapshot:
        this.serializeSnapshot(
          endSnapshot,
        ),

      performance: {
        startingNetWorth:
          this.roundCurrency(
            startingNetWorth,
          ),

        endingNetWorth:
          this.roundCurrency(
            endingNetWorth,
          ),

        netWorthChange,
        contributions,
        withdrawals,
        netExternalFlow,
        weightedExternalFlows,
        investmentResult,
        modifiedDietzReturn,
      },

      transactionAnalysis: {
        postedTransactions:
          transactions.length,

        investmentIncome:
          this.roundCurrency(
            investmentIncome,
          ),

        investmentExpenses:
          this.roundCurrency(
            investmentExpenses,
          ),

        fees:
          this.roundCurrency(fees),

        taxes:
          this.roundCurrency(taxes),

        internalTransfers:
          this.roundCurrency(
            internalTransfers,
          ),

        purchases:
          this.roundCurrency(
            purchases,
          ),

        sales:
          this.roundCurrency(
            sales,
          ),
      },

      assetClassChanges,

      warnings: [
        transactions.length === 0
          ? 'Nel periodo non risultano movimenti registrati.'
          : null,

        days < 30
          ? 'Il periodo analizzato è molto breve; il rendimento non deve essere annualizzato.'
          : null,
      ].filter(
        (
          warning,
        ): warning is string =>
          warning !== null,
      ),
    };
  }
}
