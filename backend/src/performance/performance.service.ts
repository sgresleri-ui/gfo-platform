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

  async getPositionAttribution(
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

    const valuations =
      await this.prisma.positionValuation.findMany(
        {
          where: {
            snapshotId: {
              in: [
                startSnapshot.id,
                endSnapshot.id,
              ],
            },
          },

          include: {
            position: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true,
                subcategory: true,
                currency: true,
                baseCurrency: true,
                isLiability: true,
                source: true,
                status: true,
              },
            },
          },
        },
      );

    type AttributionEntry = {
      position: {
        id: number;
        code: string;
        name: string;
        category: string;
        subcategory: string | null;
        currency: string;
        baseCurrency: string;
        isLiability: boolean;
        source: string;
        status: string;
      };

      startValue: number | null;
      endValue: number | null;
      startValuationDate: Date | null;
      endValuationDate: Date | null;
    };

    const entries =
      new Map<string, AttributionEntry>();

    for (const valuation of valuations) {
      const code =
        valuation.position.code;

      const current =
        entries.get(code) ?? {
          position:
            valuation.position,

          startValue: null,
          endValue: null,

          startValuationDate: null,
          endValuationDate: null,
        };

      if (
        valuation.snapshotId ===
        startSnapshot.id
      ) {
        current.startValue =
          Number(valuation.valueBase);

        current.startValuationDate =
          valuation.sourceValuationDate ??
          valuation.valuationDate;
      }

      if (
        valuation.snapshotId ===
        endSnapshot.id
      ) {
        current.endValue =
          Number(valuation.valueBase);

        current.endValuationDate =
          valuation.sourceValuationDate ??
          valuation.valuationDate;
      }

      entries.set(code, current);
    }

    const items =
      Array.from(entries.values())
        .map((entry) => {
          const startValue =
            entry.startValue ?? 0;

          const endValue =
            entry.endValue ?? 0;

          const signedStartValue =
            entry.position.isLiability
              ? -startValue
              : startValue;

          const signedEndValue =
            entry.position.isLiability
              ? -endValue
              : endValue;

          const valueChange =
            this.roundCurrency(
              endValue - startValue,
            );

          const contributionChange =
            this.roundCurrency(
              signedEndValue -
                signedStartValue,
            );

          const percentageChange =
            entry.startValue === null ||
            startValue === 0
              ? null
              : this.roundPercentage(
                  (
                    valueChange /
                    Math.abs(startValue)
                  ) * 100,
                );

          let comparisonStatus:
            | 'UNCHANGED'
            | 'CHANGED'
            | 'NEW'
            | 'CLOSED';

          if (
            entry.startValue === null
          ) {
            comparisonStatus = 'NEW';
          } else if (
            entry.endValue === null
          ) {
            comparisonStatus = 'CLOSED';
          } else if (
            Math.abs(valueChange) < 0.01
          ) {
            comparisonStatus =
              'UNCHANGED';
          } else {
            comparisonStatus =
              'CHANGED';
          }

          return {
            positionId:
              entry.position.id,

            code:
              entry.position.code,

            name:
              entry.position.name,

            category:
              entry.position.category,

            subcategory:
              entry.position.subcategory,

            currency:
              entry.position.currency,

            baseCurrency:
              entry.position.baseCurrency,

            isLiability:
              entry.position.isLiability,

            source:
              entry.position.source,

            currentStatus:
              entry.position.status,

            comparisonStatus,

            startValue:
              this.roundCurrency(
                startValue,
              ),

            endValue:
              this.roundCurrency(
                endValue,
              ),

            signedStartValue:
              this.roundCurrency(
                signedStartValue,
              ),

            signedEndValue:
              this.roundCurrency(
                signedEndValue,
              ),

            valueChange,

            contributionChange,

            percentageChange,

            startValuationDate:
              entry.startValuationDate
                ?.toISOString() ?? null,

            endValuationDate:
              entry.endValuationDate
                ?.toISOString() ?? null,
          };
        })
        .sort(
          (left, right) =>
            Math.abs(
              right.contributionChange,
            ) -
            Math.abs(
              left.contributionChange,
            ),
        );

    const categoryMap =
      new Map<
        string,
        {
          category: string;
          positions: number;
          startValue: number;
          endValue: number;
          contributionChange: number;
        }
      >();

    for (const item of items) {
      const current =
        categoryMap.get(
          item.category,
        ) ?? {
          category:
            item.category,

          positions: 0,
          startValue: 0,
          endValue: 0,
          contributionChange: 0,
        };

      current.positions += 1;

      current.startValue +=
        item.signedStartValue;

      current.endValue +=
        item.signedEndValue;

      current.contributionChange +=
        item.contributionChange;

      categoryMap.set(
        item.category,
        current,
      );
    }

    const categories =
      Array.from(
        categoryMap.values(),
      )
        .map((category) => ({
          category:
            category.category,

          positions:
            category.positions,

          startValue:
            this.roundCurrency(
              category.startValue,
            ),

          endValue:
            this.roundCurrency(
              category.endValue,
            ),

          contributionChange:
            this.roundCurrency(
              category.contributionChange,
            ),

          percentageChange:
            category.startValue === 0
              ? null
              : this.roundPercentage(
                  (
                    category
                      .contributionChange /
                    Math.abs(
                      category.startValue,
                    )
                  ) * 100,
                ),
        }))
        .sort(
          (left, right) =>
            Math.abs(
              right.contributionChange,
            ) -
            Math.abs(
              left.contributionChange,
            ),
        );

    const totalContributionChange =
      this.roundCurrency(
        items.reduce(
          (total, item) =>
            total +
            item.contributionChange,
          0,
        ),
      );

    const periodMilliseconds =
      endSnapshot.snapshotDate.getTime() -
      startSnapshot.snapshotDate.getTime();

    const days =
      Math.max(
        1,
        Math.round(
          periodMilliseconds /
            86400000,
        ),
      );

    return {
      period: {
        start:
          startSnapshot.snapshotDate
            .toISOString(),

        end:
          endSnapshot.snapshotDate
            .toISOString(),

        days,

        startSnapshotId:
          startSnapshot.id,

        endSnapshotId:
          endSnapshot.id,
      },

      summary: {
        positions: items.length,

        unchanged:
          items.filter(
            (item) =>
              item.comparisonStatus ===
              'UNCHANGED',
          ).length,

        changed:
          items.filter(
            (item) =>
              item.comparisonStatus ===
              'CHANGED',
          ).length,

        new:
          items.filter(
            (item) =>
              item.comparisonStatus ===
              'NEW',
          ).length,

        closed:
          items.filter(
            (item) =>
              item.comparisonStatus ===
              'CLOSED',
          ).length,

        positiveContributors:
          items.filter(
            (item) =>
              item.contributionChange > 0,
          ).length,

        negativeContributors:
          items.filter(
            (item) =>
              item.contributionChange < 0,
          ).length,

        totalContributionChange,

        snapshotNetWorthChange:
          this.roundCurrency(
            Number(
              endSnapshot.netWorth,
            ) -
              Number(
                startSnapshot.netWorth,
              ),
          ),

        reconciled:
          Math.abs(
            totalContributionChange -
              (
                Number(
                  endSnapshot.netWorth,
                ) -
                Number(
                  startSnapshot.netWorth,
                )
              ),
          ) < 0.02,
      },

      categories,
      items,

      warnings: [
        days < 30
          ? 'Il periodo analizzato è molto breve.'
          : null,

        items.length === 0
          ? 'Non sono presenti valorizzazioni confrontabili.'
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
