import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

import {
  PrismaClient,
} from '@prisma/client';

const IPS_ASSET_CLASSES = [
  {
    code: 'EQUITY_GLOBAL',
    label: 'Azionario globale',
    strategic: true,
    target: 50,
    minimum: 40,
    maximum: 60,
  },
  {
    code: 'BONDS',
    label: 'Obbligazionario',
    strategic: true,
    target: 25,
    minimum: 18,
    maximum: 35,
  },
  {
    code: 'MONEY_MARKET',
    label:
      'Money Market e liquidità strategica',
    strategic: true,
    target: 15,
    minimum: 10,
    maximum: 25,
  },
  {
    code: 'GOLD',
    label: 'Oro',
    strategic: true,
    target: 10,
    minimum: 5,
    maximum: 12,
  },
  {
    code: 'ALTERNATIVES',
    label: 'Alternativi',
    strategic: true,
    target: 0,
    minimum: 0,
    maximum: 5,
  },
  {
    code: 'OPERATING_CASH',
    label:
      'Liquidità operativa ed emergenza',
    strategic: false,
    target: null,
    minimum: null,
    maximum: null,
  },
] as const;

type IpsAssetClassCode =
  (typeof IPS_ASSET_CLASSES)[number]['code'];

@Injectable()
export class IpsClassificationService
  implements OnModuleDestroy
{
  private readonly prisma =
    new PrismaClient();

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  private round(
    value: number,
    digits = 4,
  ): number {
    const factor = 10 ** digits;

    return (
      Math.round(
        (value + Number.EPSILON) *
          factor,
      ) / factor
    );
  }

  private suggestClass(
    position: {
      code: string;
      name: string;
      category: string;
      subcategory: string | null;
    },
  ): {
    code: IpsAssetClassCode;
    confidence:
      | 'HIGH'
      | 'MEDIUM';
    reason: string;
  } | null {
    const searchableText = [
      position.code,
      position.name,
      position.subcategory ?? '',
    ]
      .join(' ')
      .toUpperCase();

    if (
      position.category ===
      'LIQUIDITY'
    ) {
      return {
        code: 'OPERATING_CASH',

        confidence: 'MEDIUM',

        reason:
          'La posizione è registrata nella categoria Liquidità. Verificare se si tratta di liquidità operativa o strategica.',
      };
    }

    if (
      [
        'XEON',
        'CSH2',
        'MONEY MARKET',
        'MONETARIO',
        'OVERNIGHT',
        'LIQUIDITY FUND',
      ].some((token) =>
        searchableText.includes(
          token,
        ),
      )
    ) {
      return {
        code: 'MONEY_MARKET',

        confidence: 'HIGH',

        reason:
          'Il nome o il codice identifica uno strumento monetario o overnight.',
      };
    }

    if (
      [
        'GOLD',
        'ORO',
        'PHYSICAL GOLD',
        'XETRA-GOLD',
      ].some((token) =>
        searchableText.includes(
          token,
        ),
      )
    ) {
      return {
        code: 'GOLD',

        confidence: 'HIGH',

        reason:
          'Il nome identifica un’esposizione all’oro.',
      };
    }

    if (
      [
        'BOND',
        'OBBLIG',
        'TREASURY',
        'GOVERNMENT BOND',
        'CORPORATE BOND',
        'FIXED INCOME',
        'ERNX',
      ].some((token) =>
        searchableText.includes(
          token,
        ),
      )
    ) {
      return {
        code: 'BONDS',

        confidence: 'HIGH',

        reason:
          'Il nome o il codice identifica uno strumento obbligazionario.',
      };
    }

    if (
      [
        'EQUITY',
        'AZION',
        'MSCI',
        'WORLD',
        'S&P 500',
        'VALUE',
        'MOMENTUM',
        'IWVL',
        'C50',
      ].some((token) =>
        searchableText.includes(
          token,
        ),
      )
    ) {
      return {
        code: 'EQUITY_GLOBAL',

        confidence: 'MEDIUM',

        reason:
          'Il nome o il codice contiene riferimenti tipici di strumenti azionari.',
      };
    }

    if (
      [
        'PRIVATE EQUITY',
        'HEDGE FUND',
        'CRYPTO',
        'BITCOIN',
        'ALTERNATIVE',
      ].some((token) =>
        searchableText.includes(
          token,
        ),
      )
    ) {
      return {
        code: 'ALTERNATIVES',

        confidence: 'MEDIUM',

        reason:
          'Il nome contiene riferimenti a investimenti alternativi.',
      };
    }

    return null;
  }

  private definition(
    code: string,
  ) {
    const definition =
      IPS_ASSET_CLASSES.find(
        (item) =>
          item.code === code,
      );

    if (!definition) {
      throw new BadRequestException(
        'Classe patrimoniale IPS non valida.',
      );
    }

    return definition;
  }

  getSupportedClasses() {
    return {
      count:
        IPS_ASSET_CLASSES.length,

      classes:
        IPS_ASSET_CLASSES,
    };
  }

  async getOverview() {
    const positions =
      await this.prisma
        .wealthPosition
        .findMany({
          where: {
            status: 'ACTIVE',
            isLiability: false,

            category: {
              in: [
                'LIQUIDITY',
                'INVESTMENT',
              ],
            },
          },

          include: {
            ipsClassification: true,
          },

          orderBy: [
            {
              category: 'asc',
            },
            {
              valueBase: 'desc',
            },
          ],
        });

    const classTotals =
      new Map<string, number>();

    let classifiedValue = 0;
    let unclassifiedValue = 0;
    let strategicValue = 0;
    let operatingCashValue = 0;

    const items =
      positions.map((position) => {
        const value =
          Number(
            position.valueBase,
          );

        const suggestion =
          this.suggestClass({
            code:
              position.code,

            name:
              position.name,

            category:
              position.category,

            subcategory:
              position.subcategory,
          });

        const classification =
          position.ipsClassification;

        if (!classification) {
          unclassifiedValue += value;
        } else {
          classifiedValue += value;

          const definition =
            this.definition(
              classification
                .ipsAssetClass,
            );

          classTotals.set(
            definition.code,
            (
              classTotals.get(
                definition.code,
              ) ?? 0
            ) + value,
          );

          if (definition.strategic) {
            strategicValue += value;
          } else if (
            definition.code ===
            'OPERATING_CASH'
          ) {
            operatingCashValue += value;
          }
        }

        return {
          positionId:
            position.id,

          code:
            position.code,

          name:
            position.name,

          category:
            position.category,

          subcategory:
            position.subcategory,

          currency:
            position.currency,

          valueBase:
            this.round(
              value,
              2,
            ),

          ipsAssetClass:
            classification
              ?.ipsAssetClass ??
            null,

          source:
            classification
              ?.source ??
            null,

          rationale:
            classification
              ?.rationale ??
            null,

          updatedAt:
            classification
              ?.updatedAt
              .toISOString() ??
            null,

          suggestedClass:
            classification
              ? null
              : suggestion?.code ??
                null,

          suggestionConfidence:
            classification
              ? null
              : suggestion
                  ?.confidence ??
                null,

          suggestionReason:
            classification
              ? null
              : suggestion?.reason ??
                null,
        };
      });

    const totalFinancialValue =
      classifiedValue +
      unclassifiedValue;

    const allocation =
      IPS_ASSET_CLASSES.map(
        (definition) => {
          const value =
            classTotals.get(
              definition.code,
            ) ?? 0;

          const weight =
            definition.strategic &&
            strategicValue > 0
              ? this.round(
                  (
                    value /
                    strategicValue
                  ) * 100,
                )
              : null;

          let status:
            | 'DATA_INCOMPLETE'
            | 'NOT_APPLICABLE'
            | 'COMPLIANT'
            | 'BELOW_MINIMUM'
            | 'ABOVE_MAXIMUM';

          if (!definition.strategic) {
            status =
              'NOT_APPLICABLE';
          } else if (
            unclassifiedValue > 0 ||
            strategicValue === 0
          ) {
            status =
              'DATA_INCOMPLETE';
          } else if (
            weight !== null &&
            definition.minimum !== null &&
            weight <
              definition.minimum
          ) {
            status =
              'BELOW_MINIMUM';
          } else if (
            weight !== null &&
            definition.maximum !== null &&
            weight >
              definition.maximum
          ) {
            status =
              'ABOVE_MAXIMUM';
          } else {
            status =
              'COMPLIANT';
          }

          return {
            ...definition,

            value:
              this.round(
                value,
                2,
              ),

            weight,
            status,
          };
        },
      );

    return {
      policy: {
        name: 'IPS v1.0',
        effectiveDate:
          '2026-07-10',

        denominator:
          'Portafoglio finanziario strategico',

        note:
          'La liquidità operativa ed emergenziale è esclusa dall’asset allocation strategica.',
      },

      summary: {
        positions:
          positions.length,

        classifiedPositions:
          items.filter(
            (item) =>
              item.ipsAssetClass !==
              null,
          ).length,

        unclassifiedPositions:
          items.filter(
            (item) =>
              item.ipsAssetClass ===
              null,
          ).length,

        suggestedPositions:
          items.filter(
            (item) =>
              item.ipsAssetClass ===
                null &&
              item.suggestedClass !==
                null,
          ).length,

        totalFinancialValue:
          this.round(
            totalFinancialValue,
            2,
          ),

        classifiedValue:
          this.round(
            classifiedValue,
            2,
          ),

        unclassifiedValue:
          this.round(
            unclassifiedValue,
            2,
          ),

        strategicValue:
          this.round(
            strategicValue,
            2,
          ),

        operatingCashValue:
          this.round(
            operatingCashValue,
            2,
          ),

        coveragePercentage:
          totalFinancialValue === 0
            ? 0
            : this.round(
                (
                  classifiedValue /
                  totalFinancialValue
                ) * 100,
              ),

        complianceAvailable:
          unclassifiedValue === 0 &&
          strategicValue > 0,
      },

      allocation,
      items,
    };
  }

  async updateClassification(
    positionId: number,
    ipsAssetClass: string,
    reason: string,
    confirmed: boolean,
  ) {
    if (!confirmed) {
      throw new BadRequestException(
        'La classificazione richiede conferma esplicita.',
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

    const definition =
      this.definition(
        ipsAssetClass,
      );

    const normalizedReason =
      reason?.trim();

    if (!normalizedReason) {
      throw new BadRequestException(
        'Indicare la motivazione della classificazione.',
      );
    }

    const position =
      await this.prisma
        .wealthPosition
        .findUnique({
          where: {
            id: positionId,
          },

          include: {
            ipsClassification: true,
          },
        });

    if (!position) {
      throw new BadRequestException(
        'Posizione patrimoniale non trovata.',
      );
    }

    if (
      position.status !== 'ACTIVE' ||
      position.isLiability ||
      ![
        'LIQUIDITY',
        'INVESTMENT',
      ].includes(
        position.category,
      )
    ) {
      throw new BadRequestException(
        'La posizione non appartiene al perimetro finanziario IPS.',
      );
    }

    const oldClass =
      position.ipsClassification
        ?.ipsAssetClass ??
      null;

    if (
      oldClass ===
      definition.code
    ) {
      throw new BadRequestException(
        'La posizione è già classificata nella classe selezionata.',
      );
    }

    const result =
      await this.prisma
        .$transaction(
          async (transaction) => {
            const classification =
              await transaction
                .ipsPositionClassification
                .upsert({
                  where: {
                    positionId,
                  },

                  create: {
                    positionId,

                    ipsAssetClass:
                      definition.code,

                    source:
                      'USER_CONFIRMED',

                    rationale:
                      normalizedReason,

                    confirmed: true,
                  },

                  update: {
                    ipsAssetClass:
                      definition.code,

                    source:
                      'USER_CONFIRMED',

                    rationale:
                      normalizedReason,

                    confirmed: true,
                  },
                });

            const audit =
              await transaction
                .ipsClassificationAudit
                .create({
                  data: {
                    positionId,

                    positionCode:
                      position.code,

                    oldClass,

                    newClass:
                      definition.code,

                    reason:
                      normalizedReason,

                    source:
                      'USER_CONFIRMED',
                  },
                });

            return {
              classification,
              audit,
            };
          },
        );

    return {
      updated: true,

      position: {
        id:
          position.id,

        code:
          position.code,

        name:
          position.name,

        previousClass:
          oldClass,

        ipsAssetClass:
          result.classification
            .ipsAssetClass,

        classLabel:
          definition.label,
      },

      audit: {
        id:
          result.audit.id,

        reason:
          result.audit.reason,

        createdAt:
          result.audit.createdAt
            .toISOString(),
      },
    };
  }

  async getAuditHistory() {
    const audits =
      await this.prisma
        .ipsClassificationAudit
        .findMany({
          orderBy: {
            createdAt: 'desc',
          },
        });

    return {
      count:
        audits.length,

      audits:
        audits.map(
          (audit) => ({
            id:
              audit.id,

            positionId:
              audit.positionId,

            positionCode:
              audit.positionCode,

            oldClass:
              audit.oldClass,

            newClass:
              audit.newClass,

            reason:
              audit.reason,

            source:
              audit.source,

            createdAt:
              audit.createdAt
                .toISOString(),
          }),
        ),
    };
  }
}
