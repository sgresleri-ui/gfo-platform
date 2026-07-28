import { CapitalAllocationService } from '../capital-allocation/capital-allocation.service';
import { InvestmentsService } from '../investments/investments.service';
import { IpsClassificationService } from '../ips/ips-classification.service';
import { PrismaService } from '../prisma/prisma.service';

import { InvestmentRecommendationsService } from './investment-recommendations.service';

describe('InvestmentRecommendationsService', () => {
  const capitalPlan = {
    plan: {
      id: 1,
      source: 'USER_PLAN',
      updatedAt: '2026-07-28T08:00:00.000Z',
      longTermCoreInvestment: 500_000,
    },
    reconciliation: {
      balance: 0,
      fundingGap: 0,
    },
    status: {
      allocation: 'BALANCED',
      operational: 'READY_FOR_PROFESSIONAL_VALIDATION',
      fiscal: 'NEEDS_VALIDATION',
      planningEstimates: 'USER_ESTIMATE',
    },
  };

  const allocation = [
    {
      code: 'EQUITY_GLOBAL',
      label: 'Azionario globale',
      strategic: true,
      target: 50,
      minimum: 40,
      maximum: 60,
      value: 700_000,
      weight: 70,
    },
    {
      code: 'BONDS',
      label: 'Obbligazionario',
      strategic: true,
      target: 25,
      minimum: 18,
      maximum: 35,
      value: 100_000,
      weight: 10,
    },
    {
      code: 'MONEY_MARKET',
      label: 'Money Market e liquidità strategica',
      strategic: true,
      target: 15,
      minimum: 10,
      maximum: 25,
      value: 100_000,
      weight: 10,
    },
    {
      code: 'GOLD',
      label: 'Oro',
      strategic: true,
      target: 10,
      minimum: 5,
      maximum: 12,
      value: 100_000,
      weight: 10,
    },
    {
      code: 'ALTERNATIVES',
      label: 'Alternativi',
      strategic: true,
      target: 0,
      minimum: 0,
      maximum: 5,
      value: 0,
      weight: 0,
    },
  ];

  const portfolio = {
    positions: [
      {
        code: 'INVESTMENT_EXISTING_WORLD',
        name: 'Existing MSCI World ETF',
        isin: 'IE0000000000',
        marketValue: 100_000,
      },
    ],
  };

  function createService(complianceAvailable: boolean) {
    const ipsOverview = {
      summary: {
        positions: 4,
        classifiedPositions: complianceAvailable ? 4 : 0,
        unclassifiedPositions: complianceAvailable ? 0 : 4,
        coveragePercentage: complianceAvailable ? 100 : 0,
        complianceAvailable,
        strategicValue: complianceAvailable ? 1_000_000 : 0,
      },
      allocation: allocation.map((item) => ({
        ...item,
        value: complianceAvailable ? item.value : 0,
      })),
      items: [
        {
          positionId: 1,
          valueBase: 1_000_000,
          ipsAssetClass: complianceAvailable ? 'EQUITY_GLOBAL' : null,
          updatedAt: complianceAvailable ? '2026-07-28T08:00:00.000Z' : null,
        },
      ],
    };

    const prisma = {
      investmentRecommendationSnapshot: {
        create: jest
          .fn()
          .mockImplementation(
            ({ data }: { data: Record<string, unknown> }) => ({
              id: 'recommendation-1',
              generatedAt: new Date('2026-07-28T12:00:00.000Z'),
              ...data,
            }),
          ),
      },
    } as unknown as PrismaService;

    const capitalAllocationService = {
      getElToroPlan: jest.fn().mockResolvedValue(capitalPlan),
    } as unknown as CapitalAllocationService;

    const ipsClassificationService = {
      getOverview: jest.fn().mockResolvedValue(ipsOverview),
    } as unknown as IpsClassificationService;

    const investmentsService = {
      getPortfolio: jest.fn().mockResolvedValue(portfolio),
    } as unknown as InvestmentsService;

    return new InvestmentRecommendationsService(
      prisma,
      capitalAllocationService,
      ipsClassificationService,
      investmentsService,
    );
  }

  it('creates a target reference but blocks approval when IPS data is incomplete', async () => {
    const service = createService(false);

    const result = await service.generateElToroRecommendation();
    const recommendation = result.recommendation;

    expect(recommendation.status).toBe('NEEDS_DATA');
    expect(recommendation.allocation.method).toBe('IPS_TARGET_REFERENCE');

    const proposedTotal = recommendation.allocation.proposed.reduce(
      (sum: number, item: { newCapitalAmount: number }) =>
        sum + item.newCapitalAmount,
      0,
    );

    expect(proposedTotal).toBe(500_000);
    expect(recommendation.fiscalStatus).toBe('NEEDS_VALIDATION');
  });

  it('allocates new capital toward actual IPS gaps without requiring sales', async () => {
    const service = createService(true);

    const result = await service.generateElToroRecommendation();
    const recommendation = result.recommendation;
    const proposed = new Map(
      recommendation.allocation.proposed.map(
        (item: { code: string; newCapitalAmount: number }) => [
          item.code,
          item.newCapitalAmount,
        ],
      ),
    );

    expect(recommendation.status).toBe('NEEDS_VALIDATION');
    expect(recommendation.allocation.method).toBe('GAP_TO_IPS_TARGET');
    expect(proposed.get('EQUITY_GLOBAL')).toBe(50_000);
    expect(proposed.get('BONDS')).toBe(275_000);
    expect(proposed.get('MONEY_MARKET')).toBe(125_000);
    expect(proposed.get('GOLD')).toBe(50_000);
    expect(proposed.get('ALTERNATIVES')).toBe(0);
  });

  it('reconciles the four tranches with the investible capital', async () => {
    const service = createService(true);

    const result = await service.generateElToroRecommendation();
    const tranches = result.recommendation.tranches as Array<{
      amount: number;
    }>;

    expect(tranches.map((tranche) => tranche.amount)).toEqual([
      200_000, 100_000, 100_000, 100_000,
    ]);
    expect(tranches.reduce((sum, tranche) => sum + tranche.amount, 0)).toBe(
      500_000,
    );
  });
});
