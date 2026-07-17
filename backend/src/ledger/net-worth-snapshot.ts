import {
  Prisma,
} from '@prisma/client';

import { createHash } from 'crypto';

type CaptureOptions = {
  householdId: number;
  source: string;
  importRunId?: string | null;
  snapshotDate?: Date;
};

function roundCurrency(
  value: number,
): number {
  return (
    Math.round(
      (value + Number.EPSILON) * 100,
    ) / 100
  );
}

export async function captureNetWorthSnapshot(
  transaction: Prisma.TransactionClient,
  options: CaptureOptions,
) {
  const snapshotDate =
    options.snapshotDate ?? new Date();

  const positions =
    await transaction.wealthPosition.findMany(
      {
        where: {
          householdId:
            options.householdId,

          status: 'ACTIVE',
        },

        orderBy: {
          code: 'asc',
        },
      },
    );

  if (positions.length === 0) {
    throw new Error(
      'Nessuna posizione attiva disponibile.',
    );
  }

  let grossAssets = 0;
  let liabilities = 0;
  let liquidity = 0;
  let investments = 0;
  let realEstate = 0;
  let otherAssets = 0;

  for (const position of positions) {
    const value =
      Number(position.valueBase);

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

  const dailyKey =
    snapshotDate
      .toISOString()
      .slice(0, 10);

  const snapshotKey =
    options.importRunId
      ? `IMPORT:${options.importRunId}`
      : `${options.source}:${dailyKey}`;

  const normalizedPositions =
    positions.map((position) => ({
      code: position.code,

      valueBase:
        roundCurrency(
          Number(position.valueBase),
        ),

      isLiability:
        position.isLiability,

      status:
        position.status,
    }));

  const dataHash =
    createHash('sha256')
      .update(
        JSON.stringify({
          snapshotKey,
          positions:
            normalizedPositions,
        }),
      )
      .digest('hex');

  const existing =
    await transaction.netWorthSnapshot.findUnique(
      {
        where: {
          dataHash,
        },
      },
    );

  if (existing) {
    return {
      created: false,
      valuationsCreated: 0,
      snapshot: existing,
    };
  }

  const roundedGrossAssets =
    roundCurrency(grossAssets);

  const roundedLiabilities =
    roundCurrency(liabilities);

  const snapshot =
    await transaction.netWorthSnapshot.create(
      {
        data: {
          householdId:
            options.householdId,

          snapshotDate,

          source:
            options.source,

          importRunId:
            options.importRunId ?? null,

          dataHash,

          positionCount:
            positions.length,

          grossAssets:
            roundedGrossAssets,

          liabilities:
            roundedLiabilities,

          netWorth:
            roundCurrency(
              roundedGrossAssets -
                roundedLiabilities,
            ),

          liquidity:
            roundCurrency(liquidity),

          investments:
            roundCurrency(investments),

          realEstate:
            roundCurrency(realEstate),

          otherAssets:
            roundCurrency(otherAssets),
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

  return {
    created: true,

    valuationsCreated:
      positions.length,

    snapshot,
  };
}
