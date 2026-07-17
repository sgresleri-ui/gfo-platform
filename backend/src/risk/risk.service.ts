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

  async getDataQuality() {
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

          orderBy: [
            {
              valuationDate: 'asc',
            },
            {
              name: 'asc',
            },
          ],
        },
      );

    const now = new Date();

    const dayMilliseconds =
      24 * 60 * 60 * 1000;

    const sourceMap =
      new Map<
        string,
        {
          source: string;
          positions: number;
          assetPositions: number;
          liabilityPositions: number;
          grossAssets: number;
          liabilities: number;
          netContribution: number;
        }
      >();

    let missingCountry = 0;
    let missingCurrency = 0;
    let futureValuationDates = 0;

    let fresh30Days = 0;
    let age31To90Days = 0;
    let age91To180Days = 0;
    let olderThan180Days = 0;

    const items =
      positions.map((position) => {
        const valueBase =
          Number(position.valueBase);

        const ageDays =
          Math.floor(
            (
              now.getTime() -
              position.valuationDate.getTime()
            ) / dayMilliseconds,
          );

        const countryMissing =
          !position.country ||
          position.country.trim() === '';

        const currencyMissing =
          !position.currency ||
          position.currency.trim() === '';

        const futureValuationDate =
          ageDays < -1;

        if (countryMissing) {
          missingCountry += 1;
        }

        if (currencyMissing) {
          missingCurrency += 1;
        }

        if (futureValuationDate) {
          futureValuationDates += 1;
        }

        if (ageDays <= 30) {
          fresh30Days += 1;
        } else if (ageDays <= 90) {
          age31To90Days += 1;
        } else if (ageDays <= 180) {
          age91To180Days += 1;
        } else {
          olderThan180Days += 1;
        }

        const normalizedSource =
          position.source?.trim() ||
          'NON_SPECIFICATA';

        const sourceSummary =
          sourceMap.get(
            normalizedSource,
          ) ?? {
            source:
              normalizedSource,

            positions: 0,
            assetPositions: 0,
            liabilityPositions: 0,
            grossAssets: 0,
            liabilities: 0,
            netContribution: 0,
          };

        sourceSummary.positions += 1;

        if (position.isLiability) {
          sourceSummary
            .liabilityPositions += 1;

          sourceSummary.liabilities +=
            valueBase;

          sourceSummary
            .netContribution -=
            valueBase;
        } else {
          sourceSummary
            .assetPositions += 1;

          sourceSummary.grossAssets +=
            valueBase;

          sourceSummary
            .netContribution +=
            valueBase;
        }

        sourceMap.set(
          normalizedSource,
          sourceSummary,
        );

        const issues: Array<{
          code: string;
          severity:
            | 'ERROR'
            | 'WARNING'
            | 'INFO';
          message: string;
        }> = [];

        if (futureValuationDate) {
          issues.push({
            code:
              'FUTURE_VALUATION_DATE',

            severity: 'ERROR',

            message:
              'La data di valorizzazione è futura.',
          });
        }

        if (countryMissing) {
          issues.push({
            code:
              'MISSING_COUNTRY',

            severity: 'WARNING',

            message:
              'Paese non specificato.',
          });
        }

        if (currencyMissing) {
          issues.push({
            code:
              'MISSING_CURRENCY',

            severity: 'ERROR',

            message:
              'Valuta non specificata.',
          });
        }

        if (ageDays > 180) {
          issues.push({
            code:
              'VALUATION_OLDER_THAN_180_DAYS',

            severity: 'WARNING',

            message:
              'Valorizzazione precedente a oltre 180 giorni.',
          });
        } else if (ageDays > 90) {
          issues.push({
            code:
              'VALUATION_OLDER_THAN_90_DAYS',

            severity: 'INFO',

            message:
              'Valorizzazione precedente a oltre 90 giorni.',
          });
        }

        return {
          id: position.id,
          code: position.code,
          name: position.name,
          category:
            position.category,

          subcategory:
            position.subcategory,

          country:
            position.country,

          currency:
            position.currency,

          valueBase:
            this.roundCurrency(
              valueBase,
            ),

          isLiability:
            position.isLiability,

          source:
            normalizedSource,

          valuationDate:
            position.valuationDate
              .toISOString(),

          ageDays,

          countryMissing,
          currencyMissing,
          futureValuationDate,

          issueCount:
            issues.length,

          issues,
        };
      })
      .sort((left, right) => {
        if (
          right.issueCount !==
          left.issueCount
        ) {
          return (
            right.issueCount -
            left.issueCount
          );
        }

        return (
          right.ageDays -
          left.ageDays
        );
      });

    const totalPositions =
      positions.length;

    const positionsWithIssues =
      items.filter(
        (item) =>
          item.issueCount > 0,
      ).length;

    const errorPositions =
      items.filter(
        (item) =>
          item.issues.some(
            (issue) =>
              issue.severity ===
              'ERROR',
          ),
      ).length;

    const warningPositions =
      items.filter(
        (item) =>
          item.issues.some(
            (issue) =>
              issue.severity ===
              'WARNING',
          ),
      ).length;

    const countryCompleteness =
      totalPositions === 0
        ? 0
        : this.roundPercentage(
            (
              (
                totalPositions -
                missingCountry
              ) /
              totalPositions
            ) * 100,
          );

    const currencyCompleteness =
      totalPositions === 0
        ? 0
        : this.roundPercentage(
            (
              (
                totalPositions -
                missingCurrency
              ) /
              totalPositions
            ) * 100,
          );

    const sources =
      Array.from(
        sourceMap.values(),
      )
        .map((source) => ({
          source:
            source.source,

          positions:
            source.positions,

          assetPositions:
            source.assetPositions,

          liabilityPositions:
            source.liabilityPositions,

          grossAssets:
            this.roundCurrency(
              source.grossAssets,
            ),

          liabilities:
            this.roundCurrency(
              source.liabilities,
            ),

          netContribution:
            this.roundCurrency(
              source.netContribution,
            ),
        }))
        .sort(
          (left, right) =>
            right.netContribution -
            left.netContribution,
        );

    return {
      asOf:
        now.toISOString(),

      household: {
        id: household.id,
        name: household.name,
        baseCurrency:
          household.currency,
      },

      summary: {
        totalPositions,
        positionsWithIssues,
        positionsWithoutIssues:
          totalPositions -
          positionsWithIssues,

        errorPositions,
        warningPositions,

        missingCountry,
        missingCurrency,
        futureValuationDates,

        countryCompleteness,
        currencyCompleteness,
      },

      freshness: {
        fresh30Days,
        age31To90Days,
        age91To180Days,
        olderThan180Days,

        fresh30DaysPercentage:
          this.percentage(
            fresh30Days,
            totalPositions,
          ),
      },

      sources,

      items,
    };
  }


  async updatePositionCountry(
    positionId: number,
    country: string,
    confirmed: boolean,
    reason?: string,
  ) {
    if (!confirmed) {
      throw new BadRequestException(
        'La correzione richiede conferma esplicita.',
      );
    }

    if (
      !Number.isInteger(positionId) ||
      positionId <= 0
    ) {
      throw new BadRequestException(
        'Identificativo posizione non valido.',
      );
    }

    const normalizedCountry =
      country?.trim();

    const normalizedReason =
      reason?.trim();

    if (!normalizedCountry) {
      throw new BadRequestException(
        'Indicare il Paese.',
      );
    }

    if (!normalizedReason) {
      throw new BadRequestException(
        'Indicare la motivazione della correzione.',
      );
    }

    const position =
      await this.prisma.wealthPosition.findUnique(
        {
          where: {
            id: positionId,
          },
        },
      );

    if (!position) {
      throw new BadRequestException(
        'Posizione patrimoniale non trovata.',
      );
    }

    const previousCountry =
      position.country?.trim() || null;

    if (
      previousCountry?.toLowerCase() ===
      normalizedCountry.toLowerCase()
    ) {
      throw new BadRequestException(
        'Il Paese indicato coincide con il valore attuale.',
      );
    }

    const result =
      await this.prisma.$transaction(
        async (transaction) => {
          const updatedPosition =
            await transaction
              .wealthPosition
              .update({
                where: {
                  id: positionId,
                },

                data: {
                  country:
                    normalizedCountry,
                },
              });

          const audit =
            await transaction
              .dataQualityCorrection
              .create({
                data: {
                  entityType:
                    'WEALTH_POSITION',

                  entityId:
                    position.id,

                  entityCode:
                    position.code,

                  fieldName:
                    'country',

                  oldValue:
                    previousCountry,

                  newValue:
                    normalizedCountry,

                  reason:
                    normalizedReason,

                  source:
                    'USER_CONFIRMED',
                },
              });

          return {
            updatedPosition,
            audit,
          };
        },
      );

    return {
      corrected: true,

      position: {
        id:
          result.updatedPosition.id,

        code:
          result.updatedPosition.code,

        name:
          result.updatedPosition.name,

        previousCountry,

        country:
          result.updatedPosition.country,

        source:
          result.updatedPosition.source,
      },

      audit: {
        id:
          result.audit.id,

        fieldName:
          result.audit.fieldName,

        oldValue:
          result.audit.oldValue,

        newValue:
          result.audit.newValue,

        reason:
          result.audit.reason,

        source:
          result.audit.source,

        createdAt:
          result.audit.createdAt
            .toISOString(),
      },
    };
  }

  async getDataQualityCorrections() {
    const corrections =
      await this.prisma
        .dataQualityCorrection
        .findMany({
          orderBy: {
            createdAt: 'desc',
          },
        });

    return {
      count:
        corrections.length,

      corrections:
        corrections.map(
          (correction) => ({
            id:
              correction.id,

            entityType:
              correction.entityType,

            entityId:
              correction.entityId,

            entityCode:
              correction.entityCode,

            fieldName:
              correction.fieldName,

            oldValue:
              correction.oldValue,

            newValue:
              correction.newValue,

            reason:
              correction.reason,

            source:
              correction.source,

            createdAt:
              correction.createdAt
                .toISOString(),
          }),
        ),
    };
  }

}
