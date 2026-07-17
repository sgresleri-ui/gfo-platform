import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

import {
  PrismaClient,
} from '@prisma/client';

type ExposureAccumulator = {
  value: number;
  positions: number;
};

@Injectable()
export class RiskService
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

  private percentage(
    value: number,
    total: number,
  ): number {
    if (total === 0) {
      return 0;
    }

    return this.roundPercentage(
      (value / total) * 100,
    );
  }

  private categoryLabel(
    category: string,
  ): string {
    if (category === 'LIQUIDITY') {
      return 'Liquidità';
    }

    if (category === 'INVESTMENT') {
      return 'Investimenti';
    }

    if (category === 'REAL_ESTATE') {
      return 'Immobili';
    }

    if (category === 'OTHER_ASSET') {
      return 'Altri attivi';
    }

    if (category === 'LIABILITY') {
      return 'Passività';
    }

    return category;
  }

  async getOverview() {
    const household =
      await this.prisma.household.findFirst({
        orderBy: {
          id: 'asc',
        },

        select: {
          id: true,
          name: true,
          currency: true,
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
            valueBase: 'desc',
          },
        },
      );

    if (positions.length === 0) {
      throw new BadRequestException(
        'Nessuna posizione patrimoniale attiva disponibile.',
      );
    }

    let grossAssets = 0;
    let liabilities = 0;

    let liquidity = 0;
    let investments = 0;
    let realEstate = 0;
    let otherAssets = 0;

    const assetClassMap =
      new Map<
        string,
        {
          category: string;
          positions: number;
          grossValue: number;
          netContribution: number;
        }
      >();

    const countryMap =
      new Map<
        string,
        ExposureAccumulator
      >();

    const currencyMap =
      new Map<
        string,
        ExposureAccumulator
      >();

    const assetPositions =
      positions.filter(
        (position) =>
          !position.isLiability,
      );

    for (const position of positions) {
      const value =
        Number(position.valueBase);

      const signedValue =
        position.isLiability
          ? -value
          : value;

      if (position.isLiability) {
        liabilities += value;
      } else {
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

        const country =
          position.country?.trim() ||
          'Non specificato';

        const countryExposure =
          countryMap.get(country) ?? {
            value: 0,
            positions: 0,
          };

        countryExposure.value += value;
        countryExposure.positions += 1;

        countryMap.set(
          country,
          countryExposure,
        );

        const currency =
          position.currency
            .trim()
            .toUpperCase();

        const currencyExposure =
          currencyMap.get(currency) ?? {
            value: 0,
            positions: 0,
          };

        currencyExposure.value += value;
        currencyExposure.positions += 1;

        currencyMap.set(
          currency,
          currencyExposure,
        );
      }

      const existingClass =
        assetClassMap.get(
          position.category,
        ) ?? {
          category:
            position.category,

          positions: 0,
          grossValue: 0,
          netContribution: 0,
        };

      existingClass.positions += 1;
      existingClass.grossValue += value;
      existingClass.netContribution +=
        signedValue;

      assetClassMap.set(
        position.category,
        existingClass,
      );
    }

    grossAssets =
      this.roundCurrency(grossAssets);

    liabilities =
      this.roundCurrency(liabilities);

    const netWorth =
      this.roundCurrency(
        grossAssets - liabilities,
      );

    const marketableAssets =
      this.roundCurrency(
        liquidity + investments,
      );

    const assetClasses =
      Array.from(
        assetClassMap.values(),
      )
        .map((item) => ({
          category:
            item.category,

          label:
            this.categoryLabel(
              item.category,
            ),

          positions:
            item.positions,

          grossValue:
            this.roundCurrency(
              item.grossValue,
            ),

          netContribution:
            this.roundCurrency(
              item.netContribution,
            ),

          weightGrossAssets:
            this.percentage(
              item.grossValue,
              grossAssets,
            ),

          weightNetWorth:
            this.percentage(
              item.netContribution,
              netWorth,
            ),
        }))
        .sort(
          (left, right) =>
            Math.abs(
              right.netContribution,
            ) -
            Math.abs(
              left.netContribution,
            ),
        );

    const topPositions =
      positions
        .map((position) => {
          const value =
            Number(position.valueBase);

          const signedValue =
            position.isLiability
              ? -value
              : value;

          return {
            id: position.id,
            code: position.code,
            name: position.name,
            category:
              position.category,

            categoryLabel:
              this.categoryLabel(
                position.category,
              ),

            subcategory:
              position.subcategory,

            country:
              position.country,

            currency:
              position.currency,

            valueBase:
              this.roundCurrency(value),

            signedValue:
              this.roundCurrency(
                signedValue,
              ),

            isLiability:
              position.isLiability,

            weightGrossAssets:
              this.percentage(
                value,
                grossAssets,
              ),

            weightNetWorth:
              this.percentage(
                signedValue,
                netWorth,
              ),

            source:
              position.source,

            valuationDate:
              position.valuationDate
                .toISOString(),
          };
        })
        .sort(
          (left, right) =>
            Math.abs(
              right.signedValue,
            ) -
            Math.abs(
              left.signedValue,
            ),
        );

    const assetWeights =
      assetPositions.map(
        (position) =>
          grossAssets === 0
            ? 0
            : Number(
                position.valueBase,
              ) / grossAssets,
      );

    const hhi =
      this.roundPercentage(
        assetWeights.reduce(
          (total, weight) =>
            total +
            weight * weight * 10000,
          0,
        ),
      );

    const sortedAssetValues =
      assetPositions
        .map((position) =>
          Number(
            position.valueBase,
          ),
        )
        .sort(
          (left, right) =>
            right - left,
        );

    const topValue = (
      count: number,
    ): number =>
      this.roundCurrency(
        sortedAssetValues
          .slice(0, count)
          .reduce(
            (total, value) =>
              total + value,
            0,
          ),
      );

    const top1Value =
      topValue(1);

    const top5Value =
      topValue(5);

    const top10Value =
      topValue(10);

    const countryExposure =
      Array.from(
        countryMap.entries(),
      )
        .map(
          ([country, exposure]) => ({
            country,

            positions:
              exposure.positions,

            value:
              this.roundCurrency(
                exposure.value,
              ),

            weightGrossAssets:
              this.percentage(
                exposure.value,
                grossAssets,
              ),
          }),
        )
        .sort(
          (left, right) =>
            right.value - left.value,
        );

    const currencyExposure =
      Array.from(
        currencyMap.entries(),
      )
        .map(
          ([currency, exposure]) => ({
            currency,

            positions:
              exposure.positions,

            value:
              this.roundCurrency(
                exposure.value,
              ),

            weightGrossAssets:
              this.percentage(
                exposure.value,
                grossAssets,
              ),
          }),
        )
        .sort(
          (left, right) =>
            right.value - left.value,
        );

    const largestAssetClass =
      assetClasses
        .filter(
          (item) =>
            item.category !==
            'LIABILITY',
        )
        .sort(
          (left, right) =>
            right.grossValue -
            left.grossValue,
        )[0] ?? null;

    const largestPosition =
      topPositions.find(
        (position) =>
          !position.isLiability,
      ) ?? null;

    return {
      asOf:
        new Date().toISOString(),

      household: {
        id: household.id,
        name: household.name,
        baseCurrency:
          household.currency,
      },

      summary: {
        positions:
          positions.length,

        assetPositions:
          assetPositions.length,

        liabilityPositions:
          positions.length -
          assetPositions.length,

        grossAssets,
        liabilities,
        netWorth,

        liquidity:
          this.roundCurrency(
            liquidity,
          ),

        investments:
          this.roundCurrency(
            investments,
          ),

        marketableAssets,

        realEstate:
          this.roundCurrency(
            realEstate,
          ),

        otherAssets:
          this.roundCurrency(
            otherAssets,
          ),
      },

      ratios: {
        liquidityGrossAssets:
          this.percentage(
            liquidity,
            grossAssets,
          ),

        investmentsGrossAssets:
          this.percentage(
            investments,
            grossAssets,
          ),

        marketableGrossAssets:
          this.percentage(
            marketableAssets,
            grossAssets,
          ),

        realEstateGrossAssets:
          this.percentage(
            realEstate,
            grossAssets,
          ),

        liabilitiesGrossAssets:
          this.percentage(
            liabilities,
            grossAssets,
          ),

        liabilitiesNetWorth:
          this.percentage(
            liabilities,
            netWorth,
          ),

        top1GrossAssets:
          this.percentage(
            top1Value,
            grossAssets,
          ),

        top5GrossAssets:
          this.percentage(
            top5Value,
            grossAssets,
          ),

        top10GrossAssets:
          this.percentage(
            top10Value,
            grossAssets,
          ),

        hhi,
      },

      concentration: {
        top1Value,
        top5Value,
        top10Value,

        largestPosition:
          largestPosition
            ? {
                code:
                  largestPosition.code,

                name:
                  largestPosition.name,

                valueBase:
                  largestPosition.valueBase,

                weightGrossAssets:
                  largestPosition
                    .weightGrossAssets,
              }
            : null,

        largestAssetClass:
          largestAssetClass
            ? {
                category:
                  largestAssetClass.category,

                label:
                  largestAssetClass.label,

                value:
                  largestAssetClass.grossValue,

                weightGrossAssets:
                  largestAssetClass
                    .weightGrossAssets,
              }
            : null,
      },

      assetClasses,
      countryExposure,
      currencyExposure,
      topPositions:
        topPositions.slice(0, 15),
    };
  }
}
