import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

type SnapshotTotals = {
  grossAssets: number;
  liabilities: number;
  netWorth: number;
  liquidity: number;
  investments: number;
  realEstate: number;
  otherAssets: number;
};

@Injectable()
export class LedgerService
  implements OnModuleDestroy
{
  private readonly prisma =
    new PrismaClient();

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  private round(value: number): number {
    return (
      Math.round(
        (value + Number.EPSILON) * 100,
      ) / 100
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

  private calculateTotals(
    positions: Array<{
      category: string;
      isLiability: boolean;
      valueBase: unknown;
    }>,
  ): SnapshotTotals {
    let grossAssets = 0;
    let liabilities = 0;
    let liquidity = 0;
    let investments = 0;
    let realEstate = 0;
    let otherAssets = 0;

    for (const position of positions) {
      const value = Number(
        position.valueBase,
      );

      if (position.isLiability) {
        liabilities += value;
        continue;
      }

      grossAssets += value;

      if (
        position.category ===
        'LIQUIDITY'
      ) {
        liquidity += value;
      } else if (
        position.category ===
        'INVESTMENT'
      ) {
        investments += value;
      } else if (
        position.category ===
        'REAL_ESTATE'
      ) {
        realEstate += value;
      } else {
        otherAssets += value;
      }
    }

    return {
      grossAssets:
        this.round(grossAssets),

      liabilities:
        this.round(liabilities),

      netWorth:
        this.round(
          grossAssets - liabilities,
        ),

      liquidity:
        this.round(liquidity),

      investments:
        this.round(investments),

      realEstate:
        this.round(realEstate),

      otherAssets:
        this.round(otherAssets),
    };
  }

  private createDataHash(
    positions: Array<{
      code: string;
      valueBase: unknown;
      isLiability: boolean;
      status: string;
    }>,
    snapshotDate: Date,
  ): string {
    const dailyKey =
      snapshotDate
        .toISOString()
        .slice(0, 10);

    const normalized = positions
      .map((position) => ({
        code: position.code,
        valueBase:
          this.round(
            Number(position.valueBase),
          ),
        isLiability:
          position.isLiability,
        status: position.status,
      }))
      .sort((left, right) =>
        left.code.localeCompare(
          right.code,
        ),
      );

    return createHash('sha256')
      .update(
        JSON.stringify({
          dailyKey,
          positions: normalized,
        }),
      )
      .digest('hex');
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
  ) {
    return {
      id: snapshot.id,

      snapshotDate:
        snapshot.snapshotDate.toISOString(),

      source: snapshot.source,

      importRunId:
        snapshot.importRunId,

      dataHash: snapshot.dataHash,

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

      createdAt:
        snapshot.createdAt.toISOString(),
    };
  }

  async getSummary() {
    const [
      transactionCount,
      snapshotCount,
      valuationCount,
      latestSnapshot,
    ] = await Promise.all([
      this.prisma.wealthTransaction.count(),

      this.prisma.netWorthSnapshot.count(),

      this.prisma.positionValuation.count(),

      this.prisma.netWorthSnapshot.findFirst({
        orderBy: {
          snapshotDate: 'desc',
        },
      }),
    ]);

    return {
      transactions:
        transactionCount,

      snapshots:
        snapshotCount,

      valuations:
        valuationCount,

      latestSnapshot:
        latestSnapshot
          ? this.serializeSnapshot(
              latestSnapshot,
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
        snapshots.map((snapshot) =>
          this.serializeSnapshot(
            snapshot,
          ),
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
      count: transactions.length,

      transactions:
        transactions.map(
          (transaction) => ({
            id: transaction.id,

            transactionDate:
              transaction.transactionDate
                .toISOString(),

            transactionType:
              transaction.transactionType,

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
              Number(transaction.fees),

            taxes:
              Number(transaction.taxes),

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
      });

    if (!household) {
      throw new BadRequestException(
        'Household principale non trovato.',
      );
    }

    const positions =
      await this.prisma.wealthPosition.findMany(
        {
          where: {
            householdId: household.id,
            status: 'ACTIVE',
          },

          orderBy: {
            code: 'asc',
          },
        },
      );

    if (positions.length === 0) {
      throw new BadRequestException(
        'Nessuna posizione attiva disponibile.',
      );
    }

    const snapshotDate =
      new Date();

    const dataHash =
      this.createDataHash(
        positions,
        snapshotDate,
      );

    const existing =
      await this.prisma.netWorthSnapshot.findUnique(
        {
          where: {
            dataHash,
          },
        },
      );

    if (existing) {
      return {
        created: false,

        reason:
          'Lo stesso stato patrimoniale è già stato registrato oggi.',

        snapshot:
          this.serializeSnapshot(
            existing,
          ),
      };
    }

    const totals =
      this.calculateTotals(
        positions,
      );

    const result =
      await this.prisma.$transaction(
        async (transaction) => {
          const snapshot =
            await transaction.netWorthSnapshot.create(
              {
                data: {
                  householdId:
                    household.id,

                  snapshotDate,

                  source:
                    'CURRENT_DATABASE_CAPTURE',

                  dataHash,

                  positionCount:
                    positions.length,

                  grossAssets:
                    totals.grossAssets,

                  liabilities:
                    totals.liabilities,

                  netWorth:
                    totals.netWorth,

                  liquidity:
                    totals.liquidity,

                  investments:
                    totals.investments,

                  realEstate:
                    totals.realEstate,

                  otherAssets:
                    totals.otherAssets,
                },
              },
            );

          await transaction.positionValuation.createMany(
            {
              data: positions.map(
                (position) => ({
                  positionId:
                    position.id,

                  snapshotId:
                    snapshot.id,

                  valuationDate:
                    snapshotDate,

                  sourceValuationDate:
                    position.valuationDate,

                  nativeAmount:
                    position.nativeAmount,

                  currency:
                    position.currency,

                  fxRateToBase:
                    position.fxRateToBase,

                  valueBase:
                    position.valueBase,

                  baseCurrency:
                    position.baseCurrency,

                  source:
                    position.source,
                }),
              ),
            },
          );

          return snapshot;
        },
        {
          timeout: 20000,
        },
      );

    return {
      created: true,

      valuationsCreated:
        positions.length,

      snapshot:
        this.serializeSnapshot(
          result,
        ),
    };
  }
}
