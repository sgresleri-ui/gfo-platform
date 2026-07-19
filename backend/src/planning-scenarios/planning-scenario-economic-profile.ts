import {
  BadRequestException,
} from '@nestjs/common';

import type {
  SimulatePlanningScenarioInput,
} from './planning-scenarios.service';

export type StoredEconomicProfileSnapshotInput = {
  profileId?: string | null;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  fiscalResidence?: string | null;

  liquidityReturnDeltaPct?: number;
  investmentsReturnDeltaPct?: number;
  realEstateReturnDeltaPct?: number;
  otherAssetsReturnDeltaPct?: number;

  liquidityTaxRatePct?: number;
  investmentsTaxRatePct?: number;

  rebalancingCostRatePct?: number;
  rebalancingMinimumCost?: number;

  sourceProfileUpdatedAt?: string | null;
};

export type StoredEconomicProfileSnapshot = {
  capturedAt: string;

  profileId: string | null;
  code: string | null;
  name: string | null;
  description: string | null;
  fiscalResidence: string | null;

  liquidityReturnDeltaPct: number;
  investmentsReturnDeltaPct: number;
  realEstateReturnDeltaPct: number;
  otherAssetsReturnDeltaPct: number;

  liquidityTaxRatePct: number;
  investmentsTaxRatePct: number;

  rebalancingCostRatePct: number;
  rebalancingMinimumCost: number;

  sourceProfileUpdatedAt: string | null;
};

export type CreateStoredPlanningScenarioInput =
  SimulatePlanningScenarioInput & {
    economicProfile?:
      | StoredEconomicProfileSnapshotInput
      | null;
  };

function optionalText(
  value: unknown,
): string | null {
  const normalized =
    String(value ?? '').trim();

  return normalized || null;
}

function validatedNumber(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const parsed =
    value === undefined ||
    value === null
      ? 0
      : Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw new BadRequestException(
      `${label} deve essere compreso tra ${minimum} e ${maximum}.`,
    );
  }

  return parsed;
}

export function buildEconomicProfileSnapshot(
  input:
    | StoredEconomicProfileSnapshotInput
    | null
    | undefined,
): StoredEconomicProfileSnapshot | null {
  if (!input) {
    return null;
  }

  return {
    capturedAt:
      new Date().toISOString(),

    profileId:
      optionalText(input.profileId),

    code:
      optionalText(input.code),

    name:
      optionalText(input.name),

    description:
      optionalText(input.description),

    fiscalResidence:
      optionalText(
        input.fiscalResidence,
      ),

    liquidityReturnDeltaPct:
      validatedNumber(
        input.liquidityReturnDeltaPct,
        'Rendimento liquidità',
        -30,
        30,
      ),

    investmentsReturnDeltaPct:
      validatedNumber(
        input.investmentsReturnDeltaPct,
        'Rendimento investimenti',
        -30,
        30,
      ),

    realEstateReturnDeltaPct:
      validatedNumber(
        input.realEstateReturnDeltaPct,
        'Rendimento immobili',
        -30,
        30,
      ),

    otherAssetsReturnDeltaPct:
      validatedNumber(
        input.otherAssetsReturnDeltaPct,
        'Rendimento altri attivi',
        -30,
        30,
      ),

    liquidityTaxRatePct:
      validatedNumber(
        input.liquidityTaxRatePct,
        'Imposta liquidità',
        0,
        100,
      ),

    investmentsTaxRatePct:
      validatedNumber(
        input.investmentsTaxRatePct,
        'Imposta investimenti',
        0,
        100,
      ),

    rebalancingCostRatePct:
      validatedNumber(
        input.rebalancingCostRatePct,
        'Costo ribilanciamento',
        0,
        10,
      ),

    rebalancingMinimumCost:
      validatedNumber(
        input.rebalancingMinimumCost,
        'Costo minimo operazione',
        0,
        100000,
      ),

    sourceProfileUpdatedAt:
      optionalText(
        input.sourceProfileUpdatedAt,
      ),
  };
}
