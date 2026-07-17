import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

import {
  PrismaClient,
} from '@prisma/client';

import {
  captureNetWorthSnapshot,
} from './net-worth-snapshot';

@Injectable()
export class LedgerService
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

  private normalizeLimit(
    value: number,
    maximum: number,
  ): number {
    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return 100;
    }

    return Math.min(
      Math.floor(value),
      maximum,
    );
  }

  private serializeSnapshot(
    snapshot: {
      id: string;
      snapshotDate: Date;
      source: string;
      importRunId: string | null;
      dataHash: string;
      positionCount: number;
      grossAssets: unknown;
      liabilities: unknown;
      netWorth: unknown;
      liquidity: unknown;
      investments: unknown;
      realEstate: unknown;
      otherAssets: unknown;
      createdAt: Date;
    },
    previousNetWorth: number | null,
  ) {
    const netWorth =
      Number(snapshot.netWorth);

    const changeAbsolute =
      previousNetWorth === null
        ? null
        : this.roundCurrency(
            netWorth -
              previousNetWorth,
          );

    const changePercent =
      previousNetWorth === null ||
      previousNetWorth === 0
        ? null
        : this.roundPercentage(
            (
              (netWorth -
                previousNetWorth) /
              Math.abs(
                previousNetWorth,
              )
            ) * 100,
          );

    return {
      id: snapshot.id,

      snapshotDate:
        snapshot.snapshotDate.toISOString(),

      source:
        snapshot.source,

      importRunId:
        snapshot.importRunId,

      dataHash:
        snapshot.dataHash,

      positionCount:
        snapshot.positionCount,

      grossAssets:
        Number(snapshot.grossAssets),

      liabilities:
        Number(snapshot.liabilities),

      netWorth,

      liquidity:
        Number(snapshot.liquidity),

      investments:
        Number(snapshot.investments),

      realEstate:
        Number(snapshot.realEstate),

      otherAssets:
        Number(snapshot.otherAssets),

      changeAbsolute,
      changePercent,

      createdAt:
        snapshot.createdAt.toISOString(),
    };
  }

  async getSummary() {
    const [
      transactionCount,
      snapshotCount,
      valuationCount,
      latestSnapshots,
    ] = await Promise.all([
      this.prisma.wealthTransaction.count(),

      this.prisma.netWorthSnapshot.count(),

      this.prisma.positionValuation.count(),

      this.prisma.netWorthSnapshot.findMany({
        orderBy: {
          snapshotDate: 'desc',
        },

        take: 2,
      }),
    ]);

    const latest =
      latestSnapshots[0] ?? null;

    const previous =
      latestSnapshots[1] ?? null;

    return {
      transactions:
        transactionCount,

      snapshots:
        snapshotCount,

      valuations:
        valuationCount,

      latestSnapshot:
        latest
          ? this.serializeSnapshot(
              latest,
              previous
                ? Number(
                    previous.netWorth,
                  )
                : null,
            )
          : null,
    };
  }

  async getNetWorthHistory(
    requestedLimit = 100,
  ) {
    const limit =
      this.normalizeLimit(
        requestedLimit,
        1000,
      );

    const snapshots =
      await this.prisma.netWorthSnapshot.findMany(
        {
          orderBy: {
            snapshotDate: 'asc',
          },

          take: limit,
        },
      );

    return {
      count: snapshots.length,

      snapshots:
        snapshots.map(
          (
            snapshot,
            index,
          ) => {
            const previous =
              index > 0
                ? snapshots[index - 1]
                : null;

            return this.serializeSnapshot(
              snapshot,
              previous
                ? Number(
                    previous.netWorth,
                  )
                : null,
            );
          },
        ),
    };
  }

  async getTransactions(
    requestedLimit = 100,
  ) {
    const limit =
      this.normalizeLimit(
        requestedLimit,
        1000,
      );

    const transactions =
      await this.prisma.wealthTransaction.findMany(
        {
          orderBy: {
            transactionDate: 'desc',
          },

          take: limit,

          include: {
            position: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      );

    return {
      count:
        transactions.length,

      transactions:
        transactions.map(
          (transaction) => ({
            id:
              transaction.id,

            transactionDate:
              transaction
                .transactionDate
                .toISOString(),

            transactionType:
              transaction
                .transactionType,

            direction:
              transaction.direction,

            position:
              transaction.position,

            quantity:
              transaction.quantity ===
              null
                ? null
                : Number(
                    transaction.quantity,
                  ),

            unitPrice:
              transaction.unitPrice ===
              null
                ? null
                : Number(
                    transaction.unitPrice,
                  ),

            grossAmount:
              Number(
                transaction.grossAmount,
              ),

            fees:
              Number(
                transaction.fees,
              ),

            taxes:
              Number(
                transaction.taxes,
              ),

            netAmount:
              Number(
                transaction.netAmount,
              ),

            currency:
              transaction.currency,

            baseAmount:
              Number(
                transaction.baseAmount,
              ),

            sourceAccountCode:
              transaction
                .sourceAccountCode,

            destinationAccountCode:
              transaction
                .destinationAccountCode,

            source:
              transaction.source,

            status:
              transaction.status,

            notes:
              transaction.notes,
          }),
        ),
    };
  }

  async captureCurrentState(
    confirmed: boolean,
  ) {
    if (!confirmed) {
      throw new BadRequestException(
        'La cattura dello storico richiede conferma esplicita.',
      );
    }

    const household =
      await this.prisma.household.findFirst({
        orderBy: {
          id: 'asc',
        },

        select: {
          id: true,
        },
      });

    if (!household) {
      throw new BadRequestException(
        'Household principale non trovato.',
      );
    }

    const result =
      await this.prisma.$transaction(
        async (transaction) =>
          captureNetWorthSnapshot(
            transaction,
            {
              householdId:
                household.id,

              source:
                'CURRENT_DATABASE_CAPTURE',

              snapshotDate:
                new Date(),
            },
          ),
        {
          timeout: 20000,
        },
      );

    return {
      created:
        result.created,

      reason:
        result.created
          ? undefined
          : 'Lo stesso stato patrimoniale è già stato registrato oggi.',

      valuationsCreated:
        result.valuationsCreated,

      snapshot:
        this.serializeSnapshot(
          result.snapshot,
          null,
        ),
    };
  }
}
