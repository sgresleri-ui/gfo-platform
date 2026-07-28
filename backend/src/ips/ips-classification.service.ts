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

type LookThroughAllocation = {
  ipsAssetClass: IpsAssetClassCode;
  percentage: number;
};

const VERIFIED_ISIN_CLASSIFICATIONS:
  Record<
    string,
    {
      code: IpsAssetClassCode;
      reason: string;
      sourceUrl: string;
    }
  > = {
    LU0133265339: {
      code: 'EQUITY_GLOBAL',
      reason:
        'Goldman Sachs identifica il comparto come Europe CORE Equity Portfolio.',
      sourceUrl:
        'https://am.gs.com/en-lu/advisors/funds/detail/PV100011/LU0133265339/goldman-sachs-europe-core-equity-portfolio',
    },
    LU0094557526: {
      code: 'EQUITY_GLOBAL',
      reason:
        'MFS dichiara un investimento prevalente in società europee e titoli azionari.',
      sourceUrl:
        'https://www.mfs.com/en-de/investment-professional/product-strategies/meridian-funds/LU0094557526-european-research-fund.html',
    },
    LU0552385295: {
      code: 'EQUITY_GLOBAL',
      reason:
        'Morgan Stanley identifica il comparto come fondo azionario globale growth.',
      sourceUrl:
        'https://www.morganstanley.com/im/en-be/intermediary-investor/products/morgan-stanley-investment-funds/global-equity/global-opportunity-fund.shareClass.A.html',
    },
    LU1545601657: {
      code: 'EQUITY_GLOBAL',
      reason:
        'Il comparto FAM Sustainable è classificato come azionario internazionale.',
      sourceUrl:
        'https://finecoassetmanagement.com/archives/products/fam-sustainable-2',
    },
    LU0248184466: {
      code: 'EQUITY_GLOBAL',
      reason:
        'Schroders dichiara almeno due terzi del patrimonio in azioni asiatiche ex Japan.',
      sourceUrl:
        'https://api.schroders.com/document-store/SISF-Asian-Opportunities-EUR-A-Acc-FMR-LUEN.pdf',
    },
    LU0594300096: {
      code: 'EQUITY_GLOBAL',
      reason:
        'Fidelity dichiara almeno il 70% in azioni di società cinesi o di Hong Kong.',
      sourceUrl:
        'https://www.fidelity.lu/funds/factsheet/LU0594300096',
    },
    LU1670707527: {
      code: 'EQUITY_GLOBAL',
      reason:
        'M&G identifica il comparto come European Strategic Value azionario.',
      sourceUrl:
        'https://www.mandg.com/investments/professional-investor/en-ie/funds/mg-lux-european-strategic-value-fund/lu1670707527',
    },
    LU0115139569: {
      code: 'EQUITY_GLOBAL',
      reason:
        'Invesco dichiara un portafoglio globale prevalentemente azionario nel settore consumer.',
      sourceUrl:
        'https://www.invesco.com/lu/en/financial-products/sicav/invesco-global-consumer-trends-fund-e-eur-acc-shares.html',
    },
  };

const LOOK_THROUGH_SUGGESTIONS:
  Record<
    string,
    {
      allocations: LookThroughAllocation[];
      method:
        | 'BENCHMARK_PROXY'
        | 'FACTSHEET_PROXY';
      asOfDate: string;
      reason: string;
      sourceUrl: string;
    }
  > = {
    IE0009514989: {
      allocations: [
        {
          ipsAssetClass:
            'EQUITY_GLOBAL',
          percentage: 60,
        },
        {
          ipsAssetClass: 'BONDS',
          percentage: 40,
        },
      ],
      method: 'BENCHMARK_PROXY',
      asOfDate: '2026-07-28',
      reason:
        'Proxy iniziale basata sul benchmark 60% S&P 500 / 40% Bloomberg US Aggregate indicato nel KIID. Il fondo non replica il benchmark: verificare e aggiornare con il factsheet corrente.',
      sourceUrl:
        'https://documents.janushenderson.com/prod/documents/docId/VQICPT',
    },
    LU1097688714: {
      allocations: [
        {
          ipsAssetClass:
            'EQUITY_GLOBAL',
          percentage: 46.5,
        },
        {
          ipsAssetClass: 'BONDS',
          percentage: 53.5,
        },
      ],
      method: 'FACTSHEET_PROXY',
      asOfDate: '2026-06-30',
      reason:
        'Proxy iniziale: i settori azionari del factsheet Invesco al 30 giugno 2026 sommano il 46,5%; il residuo è attribuito prudenzialmente all’obbligazionario e deve essere verificato per l’eventuale quota di cassa.',
      sourceUrl:
        'https://www.invesco.com/content/dam/invesco/hk/en/pdf/our-funds/invesco-global-income-fund/HKEN-GlbIncome.pdf',
    },
  };

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

  private parseLookThrough(
    value: string | null,
  ): LookThroughAllocation[] {
    if (!value) {
      return [];
    }

    try {
      const parsed: unknown =
        JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed as LookThroughAllocation[]
        : [];
    } catch {
      return [];
    }
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
    sourceUrl: string | null;
  } | null {
    const searchableText = [
      position.code,
      position.name,
      position.subcategory ?? '',
    ]
      .join(' ')
      .toUpperCase();

    const isin =
      position.code
        .match(
          /(?:IE|LU|AT|DE|IT)[A-Z0-9]{10}/,
        )?.[0] ??
      null;

    const verified =
      isin
        ? VERIFIED_ISIN_CLASSIFICATIONS[
            isin
          ]
        : null;

    if (verified) {
      return {
        ...verified,
        confidence: 'HIGH',
      };
    }

    if (
      position.category ===
      'LIQUIDITY'
    ) {
      return {
        code: 'OPERATING_CASH',

        confidence: 'MEDIUM',

        reason:
          'La posizione è registrata nella categoria Liquidità. Verificare se si tratta di liquidità operativa o strategica.',
        sourceUrl: null,
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
        sourceUrl: null,
      };
    }

    if (
      [
        'ORO',
        'PHYSICAL GOLD',
        'XETRA-GOLD',
        'GOLD ETC',
        'GOLD ETF',
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
        sourceUrl: null,
      };
    }

    if (
      [
        'BOND',
        'OBBLIG',
        ' OBB ',
        'TREASURY',
        'GOVERNMENT BOND',
        'CORPORATE BOND',
        'CORP BN',
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
        sourceUrl: null,
      };
    }

    if (
      [
        'EQUITY',
        'AZION',
        ' EQ ',
        'AKTIEN',
        'ARTIF INTELLI',
        'BRANDS',
        'DIVID',
        'EM MRK',
        'EU ST EQ',
        'FOCUS EQ',
        'GL EQ',
        'GLOBAL EQUITY',
        'MEGATRENDS',
        'MSCI',
        'WORLD',
        'WOR TEC',
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

        confidence:
          (position.subcategory ?? '')
            .trim()
            .toUpperCase() === 'ETF'
            ? 'HIGH'
            : 'MEDIUM',

        reason:
          (position.subcategory ?? '')
            .trim()
            .toUpperCase() === 'ETF'
            ? 'L’ETF replica esplicitamente un indice o un segmento azionario.'
            : 'Il nome o il codice contiene riferimenti tipici di strumenti azionari; verificare il mandato del fondo.',
        sourceUrl: null,
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
        sourceUrl: null,
      };
    }

    if (
      (position.subcategory ?? '')
        .trim()
        .toUpperCase() === 'ETF'
    ) {
      return {
        code: 'EQUITY_GLOBAL',

        confidence: 'HIGH',

        reason:
          'La posizione è un ETF e non presenta indicatori di obbligazionario, monetario, oro o investimenti alternativi; viene trattata come esposizione azionaria.',
        sourceUrl: null,
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

        const isin =
          position.code
            .match(
              /(?:IE|LU|AT|DE|IT)[A-Z0-9]{10}/,
            )?.[0] ??
          null;

        const suggestedLookThrough =
          !position
            .ipsClassification &&
          isin
            ? LOOK_THROUGH_SUGGESTIONS[
                isin
              ] ?? null
            : null;

        const classification =
          position.ipsClassification;

        const lookThrough =
          classification
              ?.ipsAssetClass ===
            'LOOK_THROUGH'
            ? this.parseLookThrough(
                classification
                  .allocationJson,
              )
            : [];

        if (!classification) {
          unclassifiedValue += value;
        } else if (
          classification
            .ipsAssetClass ===
          'LOOK_THROUGH'
        ) {
          const validLookThrough =
            lookThrough.length > 0 &&
            Math.abs(
              lookThrough.reduce(
                (sum, item) =>
                  sum +
                  item.percentage,
                0,
              ) - 100,
            ) < 0.01;

          if (!validLookThrough) {
            unclassifiedValue +=
              value;
          } else {
            classifiedValue +=
              value;

            for (
              const component of
              lookThrough
            ) {
              const definition =
                this.definition(
                  component
                    .ipsAssetClass,
                );

              const componentValue =
                value *
                (
                  component.percentage /
                  100
                );

              classTotals.set(
                definition.code,
                (
                  classTotals.get(
                    definition.code,
                  ) ?? 0
                ) +
                  componentValue,
              );

              if (
                definition.strategic
              ) {
                strategicValue +=
                  componentValue;
              } else if (
                definition.code ===
                'OPERATING_CASH'
              ) {
                operatingCashValue +=
                  componentValue;
              }
            }
          }
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
              ?.ipsAssetClass ===
            'LOOK_THROUGH'
              ? null
              : classification
                  ?.ipsAssetClass ??
                null,

          classificationMode:
            classification
                ?.ipsAssetClass ===
              'LOOK_THROUGH'
              ? 'LOOK_THROUGH'
              : classification
                  ? 'SINGLE_CLASS'
                  : null,

          lookThroughAllocation:
            lookThrough,

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

          suggestionSourceUrl:
            classification
              ? null
              : suggestion
                  ?.sourceUrl ??
                null,

          suggestedLookThrough,

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
                null ||
              item.classificationMode ===
                'LOOK_THROUGH',
          ).length,

        unclassifiedPositions:
          items.filter(
            (item) =>
              item.ipsAssetClass ===
                null &&
              item.classificationMode !==
                'LOOK_THROUGH',
          ).length,

        suggestedPositions:
          items.filter(
            (item) =>
              item.ipsAssetClass ===
                null &&
              item.suggestedClass !==
                null,
          ).length,

        highConfidenceSuggestions:
          items.filter(
            (item) =>
              item.ipsAssetClass ===
                null &&
              item.suggestionConfidence ===
                'HIGH',
          ).length,

        mediumConfidenceSuggestions:
          items.filter(
            (item) =>
              item.ipsAssetClass ===
                null &&
              item.suggestionConfidence ===
                'MEDIUM',
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

                    allocationJson:
                      null,

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

  async updateLookThrough(
    positionId: number,
    allocations: Array<{
      ipsAssetClass: string;
      percentage: number;
    }>,
    reason: string,
    confirmed: boolean,
  ) {
    if (!confirmed) {
      throw new BadRequestException(
        'Il look-through richiede conferma esplicita.',
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
      !Array.isArray(allocations) ||
      allocations.length < 2
    ) {
      throw new BadRequestException(
        'Indicare almeno due componenti del fondo.',
      );
    }

    const normalized =
      allocations
        .filter(
          (item) =>
            Number(
              item.percentage,
            ) > 0,
        )
        .map((item) => {
          const definition =
            this.definition(
              item.ipsAssetClass,
            );

          return {
            ipsAssetClass:
              definition.code,
            percentage:
              this.round(
                Number(
                  item.percentage,
                ),
                4,
              ),
          };
        });

    const uniqueClasses =
      new Set(
        normalized.map(
          (item) =>
            item.ipsAssetClass,
        ),
      );

    const total =
      normalized.reduce(
        (sum, item) =>
          sum +
          item.percentage,
        0,
      );

    if (
      normalized.length < 2 ||
      uniqueClasses.size !==
        normalized.length ||
      Math.abs(total - 100) >
        0.01
    ) {
      throw new BadRequestException(
        'Le componenti devono essere distinte e totalizzare il 100%.',
      );
    }

    const normalizedReason =
      reason?.trim();

    if (!normalizedReason) {
      throw new BadRequestException(
        'Indicare la fonte o la motivazione del look-through.',
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

    if (
      !position ||
      position.status !==
        'ACTIVE' ||
      position.isLiability ||
      ![
        'LIQUIDITY',
        'INVESTMENT',
      ].includes(
        position.category,
      )
    ) {
      throw new BadRequestException(
        'Posizione finanziaria non valida per la ripartizione.',
      );
    }

    if (
      position.category ===
        'INVESTMENT' &&
      normalized.some(
        (item) =>
          !this.definition(
            item.ipsAssetClass,
          ).strategic,
      )
    ) {
      throw new BadRequestException(
        'Il look-through di un investimento può utilizzare solo classi strategiche.',
      );
    }

    if (
      position.category ===
        'LIQUIDITY' &&
      normalized.some(
        (item) =>
          ![
            'MONEY_MARKET',
            'OPERATING_CASH',
          ].includes(
            item.ipsAssetClass,
          ),
      )
    ) {
      throw new BadRequestException(
        'La liquidità può essere ripartita solo tra quota strategica e quota operativa.',
      );
    }

    const oldClass =
      position.ipsClassification
        ?.ipsAssetClass ??
      null;

    await this.prisma.$transaction(
      async (transaction) => {
        await transaction
          .ipsPositionClassification
          .upsert({
            where: {
              positionId,
            },
            create: {
              positionId,
              ipsAssetClass:
                'LOOK_THROUGH',
              allocationJson:
                JSON.stringify(
                  normalized,
                ),
              source:
                'USER_CONFIRMED_LOOK_THROUGH',
              rationale:
                normalizedReason,
              confirmed: true,
            },
            update: {
              ipsAssetClass:
                'LOOK_THROUGH',
              allocationJson:
                JSON.stringify(
                  normalized,
                ),
              source:
                'USER_CONFIRMED_LOOK_THROUGH',
              rationale:
                normalizedReason,
              confirmed: true,
            },
          });

        await transaction
          .ipsClassificationAudit
          .create({
            data: {
              positionId,
              positionCode:
                position.code,
              oldClass,
              newClass:
                'LOOK_THROUGH',
              reason:
                normalizedReason,
              source:
                'USER_CONFIRMED_LOOK_THROUGH',
            },
          });

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
      },
    );

    return {
      updated: true,
      positionId,
      allocation: normalized,
    };
  }

  async confirmSuggestions(
    items: Array<{
      positionId: number;
      suggestedClass: string;
    }>,
    confirmed: boolean,
  ) {
    if (!confirmed) {
      throw new BadRequestException(
        'La conferma massiva richiede conferma esplicita.',
      );
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      throw new BadRequestException(
        'Selezionare almeno un suggerimento da confermare.',
      );
    }

    const uniqueIds =
      new Set(
        items.map(
          (item) => item.positionId,
        ),
      );

    if (
      uniqueIds.size !== items.length
    ) {
      throw new BadRequestException(
        'La selezione contiene posizioni duplicate.',
      );
    }

    const overview =
      await this.getOverview();

    const currentItems =
      new Map(
        overview.items.map(
          (item) => [
            item.positionId,
            item,
          ],
        ),
      );

    const validated =
      items.map((item) => {
        const current =
          currentItems.get(
            item.positionId,
          );

        if (
          !current ||
          current.ipsAssetClass !==
            null ||
          current.suggestedClass !==
            item.suggestedClass
        ) {
          throw new BadRequestException(
            `Il suggerimento per la posizione ${item.positionId} non è più valido. Aggiornare i dati e riprovare.`,
          );
        }

        return {
          positionId:
            item.positionId,
          suggestedClass:
            item.suggestedClass,
          reason:
            current.suggestionReason ??
            'Suggerimento del motore IPS confermato dall’utente.',
        };
      });

    for (const item of validated) {
      await this.updateClassification(
        item.positionId,
        item.suggestedClass,
        item.reason,
        true,
      );
    }

    const updatedOverview =
      await this.getOverview();

    return {
      updated: validated.length,
      positionIds:
        validated.map(
          (item) =>
            item.positionId,
        ),
      summary:
        updatedOverview.summary,
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
