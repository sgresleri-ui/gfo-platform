import { BadRequestException } from '@nestjs/common';

import { IpsClassificationService } from './ips-classification.service';

describe('IpsClassificationService assisted confirmation', () => {
  let service: IpsClassificationService;

  beforeEach(() => {
    service = new IpsClassificationService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('requires explicit confirmation', async () => {
    await expect(
      service.confirmSuggestions(
        [
          {
            positionId: 1,
            suggestedClass: 'BONDS',
          },
        ],
        false,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires look-through components to total 100%', async () => {
    await expect(
      service.updateLookThrough(
        1,
        [
          {
            ipsAssetClass: 'EQUITY_GLOBAL',
            percentage: 60,
          },
          {
            ipsAssetClass: 'BONDS',
            percentage: 30,
          },
        ],
        'Factsheet del gestore',
        true,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('separates strategic and operating portions of mixed liquidity', async () => {
    const disconnect = jest.fn();

    Object.defineProperty(service, 'prisma', {
      value: {
        $disconnect: disconnect,
        wealthPosition: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 1,
              code: 'CASH_MIXED',
              name: 'Liquidità mista',
              category: 'LIQUIDITY',
              subcategory: 'BANK',
              currency: 'EUR',
              valueBase: 1000,
              ipsClassification: {
                ipsAssetClass: 'LOOK_THROUGH',
                allocationJson: JSON.stringify([
                  {
                    ipsAssetClass: 'MONEY_MARKET',
                    percentage: 40,
                  },
                  {
                    ipsAssetClass: 'OPERATING_CASH',
                    percentage: 60,
                  },
                ]),
                source: 'USER_CONFIRMED_LOOK_THROUGH',
                rationale: 'Ripartizione confermata',
                updatedAt: new Date('2026-07-28T10:00:00.000Z'),
              },
              ipsClassificationReview: null,
            },
          ]),
        },
      },
    });

    const overview = await service.getOverview();

    expect(overview.summary.classifiedValue).toBe(1000);
    expect(overview.summary.strategicValue).toBe(400);
    expect(overview.summary.operatingCashValue).toBe(600);
    expect(
      overview.allocation.find((item) => item.code === 'MONEY_MARKET')?.value,
    ).toBe(400);
    expect(
      overview.allocation.find((item) => item.code === 'OPERATING_CASH')?.value,
    ).toBe(600);
  });

  it('saves a liquidity split using only strategic and operating cash', async () => {
    const transaction = {
      ipsPositionClassification: {
        upsert: jest.fn(),
      },
      ipsClassificationAudit: {
        create: jest.fn(),
      },
      ipsClassificationReview: {
        delete: jest.fn(),
      },
    };

    Object.defineProperty(service, 'prisma', {
      value: {
        $disconnect: jest.fn(),
        wealthPosition: {
          findUnique: jest.fn().mockResolvedValue({
            id: 1,
            code: 'CASH_MIXED',
            status: 'ACTIVE',
            isLiability: false,
            category: 'LIQUIDITY',
            ipsClassification: null,
            ipsClassificationReview: null,
          }),
        },
        $transaction: jest
          .fn()
          .mockImplementation(
            async (
              callback: (
                client: typeof transaction,
              ) => Promise<unknown>,
            ) => callback(transaction),
          ),
      },
    });

    const result = await service.updateLookThrough(
      1,
      [
        {
          ipsAssetClass: 'MONEY_MARKET',
          percentage: 40,
        },
        {
          ipsAssetClass: 'OPERATING_CASH',
          percentage: 60,
        },
      ],
      'Ripartizione confermata',
      true,
    );

    expect(result.updated).toBe(true);
    expect(
      transaction.ipsPositionClassification.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          ipsAssetClass: 'LOOK_THROUGH',
          allocationJson: JSON.stringify([
            {
              ipsAssetClass: 'MONEY_MARKET',
              percentage: 40,
            },
            {
              ipsAssetClass: 'OPERATING_CASH',
              percentage: 60,
            },
          ]),
        }),
      }),
    );
  });

  it('rejects a stale suggestion before writing', async () => {
    jest.spyOn(service, 'getOverview').mockResolvedValue({
      items: [
        {
          positionId: 1,
          ipsAssetClass: null,
          suggestedClass: 'EQUITY_GLOBAL',
          suggestionReason: 'Equity token',
        },
      ],
    } as Awaited<ReturnType<IpsClassificationService['getOverview']>>);

    const update = jest.spyOn(service, 'updateClassification');

    await expect(
      service.confirmSuggestions(
        [
          {
            positionId: 1,
            suggestedClass: 'BONDS',
          },
        ],
        true,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(update).not.toHaveBeenCalled();
  });

  it('confirms each selected current suggestion and returns new coverage', async () => {
    const before = {
      items: [
        {
          positionId: 1,
          ipsAssetClass: null,
          suggestedClass: 'BONDS',
          suggestionReason: 'Bond token',
        },
        {
          positionId: 2,
          ipsAssetClass: null,
          suggestedClass: 'MONEY_MARKET',
          suggestionReason: 'Overnight token',
        },
      ],
      summary: {
        classifiedPositions: 0,
        unclassifiedPositions: 2,
        coveragePercentage: 0,
      },
    };

    const after = {
      items: [],
      summary: {
        classifiedPositions: 2,
        unclassifiedPositions: 0,
        coveragePercentage: 100,
      },
    };

    jest
      .spyOn(service, 'getOverview')
      .mockResolvedValueOnce(
        before as Awaited<ReturnType<IpsClassificationService['getOverview']>>,
      )
      .mockResolvedValueOnce(
        after as Awaited<ReturnType<IpsClassificationService['getOverview']>>,
      );

    const update = jest
      .spyOn(service, 'updateClassification')
      .mockResolvedValue(
        {} as Awaited<
          ReturnType<IpsClassificationService['updateClassification']>
        >,
      );

    const result = await service.confirmSuggestions(
      [
        {
          positionId: 1,
          suggestedClass: 'BONDS',
        },
        {
          positionId: 2,
          suggestedClass: 'MONEY_MARKET',
        },
      ],
      true,
    );

    expect(update).toHaveBeenCalledTimes(2);
    expect(result.updated).toBe(2);
    expect(result.summary.coveragePercentage).toBe(100);
  });
});
