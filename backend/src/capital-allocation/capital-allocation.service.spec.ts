import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { TaxAnalysisService } from '../tax-analysis/tax-analysis.service';

import { CapitalAllocationService } from './capital-allocation.service';

describe('CapitalAllocationService', () => {
  const storedPlan = {
    id: 1,
    sourcePropertyCode: 'PROPERTY_EL_TORO',
    dubaiHomeReserve: 1_070_000,
    familyTransitionReserve: 230_000,
    longTermCoreInvestment: 500_000,
    source: 'DOCUMENTED_PLAN',
    createdAt: new Date('2026-07-28T08:00:00.000Z'),
    updatedAt: new Date('2026-07-28T08:00:00.000Z'),
  };

  const taxAnalysis = {
    property: {
      id: 1,
      code: 'PROPERTY_EL_TORO',
      name: 'El Toro',
      country: 'Spain',
      status: 'HELD_FOR_SALE',
      expectedClosingDate: '2026-07-31T00:00:00.000Z',
    },
    sale: {
      grossSalePrice: 2_150_000,
      debtToRepay: 250_000,
      historicalCost: 1_174_000,
      grossDifferenceFromHistoricalCost: 976_000,
      recordedSellingCosts: 50_000,
      economicGainAfterRecordedCosts: 926_000,
      netProceedsBeforeTax: 1_850_000,
    },
    fiscalResidence: {
      current: 'Spain',
      planned: 'United Arab Emirates',
    },
    tax: {
      estimatedTax: null,
      taxableGain: null,
      netProceedsAfterTax: null,
      status: 'NEEDS_VALIDATION' as const,
    },
    planningEstimates: {
      estimatedTaxReserve: 40_000,
      futureSaleCosts: 10_000,
      totalEstimatedDeductions: 50_000,
      netProceedsAfterEstimates: 1_800_000,
      source: 'PLATFORM_SETTINGS' as const,
      status: 'USER_ESTIMATE' as const,
    },
    evidence: {
      recordedSellingCostTransactionCount: 0,
      recordedSellingCostTransactions: [],
    },
    warnings: [],
  };

  function createService(plan = storedPlan) {
    const prisma = {
      capitalAllocationPlan: {
        upsert: jest.fn().mockResolvedValue(plan),
        update: jest.fn().mockResolvedValue(plan),
      },
    } as unknown as PrismaService;

    const taxAnalysisService = {
      getElToroAnalysis: jest.fn().mockResolvedValue(taxAnalysis),
    } as unknown as TaxAnalysisService;

    return {
      service: new CapitalAllocationService(prisma, taxAnalysisService),
    };
  }

  it('reconciles the documented plan with available proceeds', async () => {
    const { service } = createService();

    const result = await service.getElToroPlan();

    expect(result.reconciliation.availableCapital).toBe(1_800_000);

    expect(result.reconciliation.totalPlannedAllocation).toBe(1_800_000);

    expect(result.status.allocation).toBe('BALANCED');

    expect(result.status.fiscal).toBe('NEEDS_VALIDATION');

    expect(result.constraints.dubaiHomeReserveInvestibleInEquities).toBe(false);
  });

  it('reports a funding gap without reducing plan amounts', async () => {
    const { service } = createService({
      ...storedPlan,
      longTermCoreInvestment: 550_000,
    });

    const result = await service.getElToroPlan();

    expect(result.status.allocation).toBe('OVER_ALLOCATED');

    expect(result.reconciliation.fundingGap).toBe(50_000);
  });

  it('rejects negative allocation amounts', async () => {
    const { service } = createService();

    await expect(
      service.updateElToroPlan({
        dubaiHomeReserve: -1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
