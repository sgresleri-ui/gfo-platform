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
            ipsAssetClass:
              'EQUITY_GLOBAL',
            percentage: 60,
          },
          {
            ipsAssetClass:
              'BONDS',
            percentage: 30,
          },
        ],
        'Factsheet del gestore',
        true,
      ),
    ).rejects.toBeInstanceOf(
      BadRequestException,
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
