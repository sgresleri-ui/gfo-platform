import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

import {
  PrismaClient,
} from '@prisma/client';

const IPS_REVIEW_STATUSES = [
  'PENDING_INFORMATION',
  'DEFERRED',
] as const;

type IpsReviewStatus =
  (typeof IPS_REVIEW_STATUSES)[number];

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
            ipsClassificationReview: true,
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

          reviewStatus:
            position
              .ipsClassificationReview
              ?.status ??
            null,

          reviewNote:
            position
              .ipsClassificationReview
              ?.note ??
            null,

          reviewUpdatedAt:
            position
              .ipsClassificationReview
              ?.updatedAt
              .toISOString() ??
            null,
        };
      });

    const totalFinancialValue =
      classifiedValue +
      unclassifiedValue;

    const allocationAvailable =
      unclassifiedValue === 0 &&
      strategicValue > 0;

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

          const targetValue =
            definition.strategic &&
            definition.target !== null &&
            allocationAvailable
              ? this.round(
                  strategicValue *
                    (
                      definition.target /
                      100
                    ),
                  2,
                )
              : null;

          const minimumValue =
            definition.strategic &&
            definition.minimum !== null &&
            allocationAvailable
              ? this.round(
                  strategicValue *
                    (
                      definition.minimum /
                      100
                    ),
                  2,
                )
              : null;

          const maximumValue =
            definition.strategic &&
            definition.maximum !== null &&
            allocationAvailable
              ? this.round(
                  strategicValue *
                    (
                      definition.maximum /
                      100
                    ),
                  2,
                )
              : null;

          const gapToTarget =
            targetValue === null
              ? null
              : this.round(
                  targetValue - value,
                  2,
                );

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

          let rebalanceAction:
            | 'INCREASE'
            | 'REDUCE'
            | 'INCREASE_TOWARD_TARGET'
            | 'REDUCE_TOWARD_TARGET'
            | 'HOLD'
            | null = null;

          if (
            allocationAvailable &&
            definition.strategic
          ) {
            if (
              status ===
              'BELOW_MINIMUM'
            ) {
              rebalanceAction =
                'INCREASE';
            } else if (
              status ===
              'ABOVE_MAXIMUM'
            ) {
              rebalanceAction =
                'REDUCE';
            } else if (
              gapToTarget !== null &&
              Math.abs(
                gapToTarget,
              ) < 0.01
            ) {
              rebalanceAction =
                'HOLD';
            } else if (
              gapToTarget !== null &&
              gapToTarget > 0
            ) {
              rebalanceAction =
                'INCREASE_TOWARD_TARGET';
            } else if (
              gapToTarget !== null &&
              gapToTarget < 0
            ) {
              rebalanceAction =
                'REDUCE_TOWARD_TARGET';
            }
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

            targetValue,
            minimumValue,
            maximumValue,
            gapToTarget,
            rebalanceAction,
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

        pendingInformationPositions:
          items.filter(
            (item) =>
              item.ipsAssetClass ===
                null &&
              item.reviewStatus ===
                'PENDING_INFORMATION',
          ).length,

        deferredPositions:
          items.filter(
            (item) =>
              item.ipsAssetClass ===
                null &&
              item.reviewStatus ===
                'DEFERRED',
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
          allocationAvailable,

        rebalanceAvailable:
          allocationAvailable,
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
            ipsClassificationReview: true,
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

            const reviewResolutionAudit =
              position
                .ipsClassificationReview
                ? await transaction
                    .ipsClassificationReviewAudit
                    .create({
                      data: {
                        positionId,

                        positionCode:
                          position.code,

                        oldStatus:
                          position
                            .ipsClassificationReview
                            .status,

                        newStatus:
                          'RESOLVED_BY_CLASSIFICATION',

                        note:
                          `Classificata come ${definition.label}. ${normalizedReason}`,

                        source:
                          'USER_CONFIRMED',
                      },
                    })
                : null;

            if (
              position
                .ipsClassificationReview
            ) {
              await transaction
                .ipsClassificationReview
                .delete({
                  where: {
                    positionId,
                  },
                });
            }

            return {
              classification,
              audit,
              reviewResolutionAudit,
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

      reviewResolution:
        result.reviewResolutionAudit
          ? {
              resolved: true,

              previousStatus:
                result
                  .reviewResolutionAudit
                  .oldStatus,

              newStatus:
                result
                  .reviewResolutionAudit
                  .newStatus,

              createdAt:
                result
                  .reviewResolutionAudit
                  .createdAt
                  .toISOString(),
            }
          : {
              resolved: false,
            },
    };
  }

  async updateReviewStatus(
    positionId: number,
    status: string,
    note: string,
    confirmed: boolean,
  ) {
    if (!confirmed) {
      throw new BadRequestException(
        'Lo stato di revisione richiede conferma esplicita.',
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

    if (
      !IPS_REVIEW_STATUSES.includes(
        status as IpsReviewStatus,
      )
    ) {
      throw new BadRequestException(
        'Stato di revisione IPS non valido.',
      );
    }

    const normalizedNote =
      note?.trim();

    if (!normalizedNote) {
      throw new BadRequestException(
        'Indicare il motivo del rinvio o le informazioni mancanti.',
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
            ipsClassificationReview: true,
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

    if (position.ipsClassification) {
      throw new BadRequestException(
        'La posizione è già classificata.',
      );
    }

    const oldStatus =
      position
        .ipsClassificationReview
        ?.status ??
      null;

    const result =
      await this.prisma.$transaction(
        async (transaction) => {
          const review =
            await transaction
              .ipsClassificationReview
              .upsert({
                where: {
                  positionId,
                },

                create: {
                  positionId,
                  status,
                  note: normalizedNote,
                  source:
                    'USER_CONFIRMED',
                },

                update: {
                  status,
                  note: normalizedNote,
                  source:
                    'USER_CONFIRMED',
                },
              });

          const audit =
            await transaction
              .ipsClassificationReviewAudit
              .create({
                data: {
                  positionId,

                  positionCode:
                    position.code,

                  oldStatus,
                  newStatus: status,

                  note:
                    normalizedNote,

                  source:
                    'USER_CONFIRMED',
                },
              });

          return {
            review,
            audit,
          };
        },
      );

    return {
      updated: true,

      position: {
        id: position.id,
        code: position.code,
        name: position.name,
      },

      review: {
        status:
          result.review.status,

        note:
          result.review.note,

        updatedAt:
          result.review.updatedAt
            .toISOString(),
      },

      audit: {
        id: result.audit.id,

        createdAt:
          result.audit.createdAt
            .toISOString(),
      },
    };
  }

  async getReviewAuditHistory() {
    const audits =
      await this.prisma
        .ipsClassificationReviewAudit
        .findMany({
          orderBy: {
            createdAt: 'desc',
          },
        });

    return {
      count: audits.length,

      audits:
        audits.map((audit) => ({
          id: audit.id,

          positionId:
            audit.positionId,

          positionCode:
            audit.positionCode,

          oldStatus:
            audit.oldStatus,

          newStatus:
            audit.newStatus,

          note:
            audit.note,

          source:
            audit.source,

          createdAt:
            audit.createdAt
              .toISOString(),
        })),
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
