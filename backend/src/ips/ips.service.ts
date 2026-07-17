import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

import {
  PrismaClient,
} from '@prisma/client';

type MetricDefinition = {
  code: string;
  label: string;
  dimension: string;
  unit: 'PERCENT' | 'EUR';
  description: string;
};

type PolicyLimitPayload = {
  minimum?: number | null;
  maximum?: number | null;
  target?: number | null;
  enabled?: boolean;
  rationale?: string | null;
  confirm?: boolean;
};

const METRICS: MetricDefinition[] = [
  {
    code: 'LIQUIDITY_GROSS_ASSETS',
    label: 'Liquidità / attività lorde',
    dimension: 'ASSET_ALLOCATION',
    unit: 'PERCENT',
    description:
      'Peso della liquidità sulle attività patrimoniali lorde.',
  },
  {
    code: 'INVESTMENTS_GROSS_ASSETS',
    label: 'Investimenti / attività lorde',
    dimension: 'ASSET_ALLOCATION',
    unit: 'PERCENT',
    description:
      'Peso degli investimenti finanziari sulle attività lorde.',
  },
  {
    code: 'MARKETABLE_GROSS_ASSETS',
    label: 'Attività finanziarie / attività lorde',
    dimension: 'ASSET_ALLOCATION',
    unit: 'PERCENT',
    description:
      'Liquidità e investimenti finanziari sulle attività lorde.',
  },
  {
    code: 'REAL_ESTATE_GROSS_ASSETS',
    label: 'Immobili / attività lorde',
    dimension: 'ASSET_ALLOCATION',
    unit: 'PERCENT',
    description:
      'Peso degli immobili sulle attività patrimoniali lorde.',
  },
  {
    code: 'OTHER_ASSETS_GROSS_ASSETS',
    label: 'Altri attivi / attività lorde',
    dimension: 'ASSET_ALLOCATION',
    unit: 'PERCENT',
    description:
      'Peso degli altri attivi sulle attività patrimoniali lorde.',
  },
  {
    code: 'LIABILITIES_GROSS_ASSETS',
    label: 'Passività / attività lorde',
    dimension: 'LEVERAGE',
    unit: 'PERCENT',
    description:
      'Incidenza delle passività sulle attività patrimoniali lorde.',
  },
  {
    code: 'TOP1_GROSS_ASSETS',
    label: 'Prima posizione / attività lorde',
    dimension: 'CONCENTRATION',
    unit: 'PERCENT',
    description:
      'Peso della maggiore posizione attiva sulle attività lorde.',
  },
  {
    code: 'TOP5_GROSS_ASSETS',
    label: 'Prime 5 posizioni / attività lorde',
    dimension: 'CONCENTRATION',
    unit: 'PERCENT',
    description:
      'Peso delle cinque maggiori posizioni sulle attività lorde.',
  },
  {
    code: 'TOP10_GROSS_ASSETS',
    label: 'Prime 10 posizioni / attività lorde',
    dimension: 'CONCENTRATION',
    unit: 'PERCENT',
    description:
      'Peso delle dieci maggiori posizioni sulle attività lorde.',
  },
  {
    code: 'EUR_GROSS_ASSETS',
    label: 'Esposizione EUR / attività lorde',
    dimension: 'CURRENCY',
    unit: 'PERCENT',
    description:
      'Peso delle posizioni denominate in EUR sulle attività lorde.',
  },
  {
    code: 'NON_EUR_GROSS_ASSETS',
    label: 'Esposizione non EUR / attività lorde',
    dimension: 'CURRENCY',
    unit: 'PERCENT',
    description:
      'Peso delle posizioni denominate in valute diverse dall’euro.',
  },
  {
    code: 'NET_WORTH_EUR',
    label: 'Patrimonio netto',
    dimension: 'NET_WORTH',
    unit: 'EUR',
    description:
      'Valore del patrimonio netto consolidato.',
  },
  {
    code: 'LIQUIDITY_EUR',
    label: 'Liquidità disponibile',
    dimension: 'LIQUIDITY',
    unit: 'EUR',
    description:
      'Valore consolidato della liquidità.',
  },
];

@Injectable()
export class IpsService
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

  private percentage(
    value: number,
    total: number,
  ): number {
    if (total === 0) {
      return 0;
    }

    return this.round(
      (value / total) * 100,
    );
  }

  private definition(
    code: string,
  ): MetricDefinition {
    const definition =
      METRICS.find(
        (metric) =>
          metric.code === code,
      );

    if (!definition) {
      throw new BadRequestException(
        'Indicatore IPS non supportato.',
      );
    }

    return definition;
  }

  private validateOptionalNumber(
    value: number | null | undefined,
    fieldName: string,
  ) {
    if (
      value !== undefined &&
      value !== null &&
      !Number.isFinite(value)
    ) {
      throw new BadRequestException(
        `${fieldName} non valido.`,
      );
    }
  }

  getSupportedMetrics() {
    return {
      count: METRICS.length,
      metrics: METRICS,
    };
  }

  async getLimits() {
    const configured =
      await this.prisma
        .ipsPolicyLimit
        .findMany();

    const map = new Map(
      configured.map(
        (limit) => [
          limit.code,
          limit,
        ],
      ),
    );

    return {
      count: METRICS.length,

      limits:
        METRICS.map(
          (definition) => {
            const limit =
              map.get(
                definition.code,
              );

            return {
              ...definition,

              minimum:
                limit?.minimum ??
                null,

              maximum:
                limit?.maximum ??
                null,

              target:
                limit?.target ??
                null,

              enabled:
                limit?.enabled ??
                false,

              rationale:
                limit?.rationale ??
                null,

              source:
                limit?.source ??
                null,

              updatedAt:
                limit?.updatedAt
                  .toISOString() ??
                null,
            };
          },
        ),
    };
  }

  async updateLimit(
    code: string,
    payload: PolicyLimitPayload,
  ) {
    if (!payload.confirm) {
      throw new BadRequestException(
        'La modifica dei limiti IPS richiede conferma esplicita.',
      );
    }

    const definition =
      this.definition(code);

    this.validateOptionalNumber(
      payload.minimum,
      'Limite minimo',
    );

    this.validateOptionalNumber(
      payload.maximum,
      'Limite massimo',
    );

    this.validateOptionalNumber(
      payload.target,
      'Valore obiettivo',
    );

    if (
      payload.minimum !== null &&
      payload.minimum !== undefined &&
      payload.maximum !== null &&
      payload.maximum !== undefined &&
      payload.minimum >
        payload.maximum
    ) {
      throw new BadRequestException(
        'Il limite minimo non può superare il limite massimo.',
      );
    }

    const rationale =
      payload.rationale
        ?.trim() || null;

    const updated =
      await this.prisma
        .ipsPolicyLimit
        .upsert({
          where: {
            code,
          },

          create: {
            code,
            label:
              definition.label,

            dimension:
              definition.dimension,

            unit:
              definition.unit,

            minimum:
              payload.minimum ??
              null,

            maximum:
              payload.maximum ??
              null,

            target:
              payload.target ??
              null,

            enabled:
              payload.enabled ??
              false,

            rationale,

            source:
              'IPS_CONFIRMED',
          },

          update: {
            label:
              definition.label,

            dimension:
              definition.dimension,

            unit:
              definition.unit,

            minimum:
              payload.minimum ??
              null,

            maximum:
              payload.maximum ??
              null,

            target:
              payload.target ??
              null,

            enabled:
              payload.enabled ??
              false,

            rationale,

            source:
              'IPS_CONFIRMED',
          },
        });

    return {
      updated: true,

      limit: {
        code:
          updated.code,

        label:
          updated.label,

        dimension:
          updated.dimension,

        unit:
          updated.unit,

        minimum:
          updated.minimum,

        maximum:
          updated.maximum,

        target:
          updated.target,

        enabled:
          updated.enabled,

        rationale:
          updated.rationale,

        source:
          updated.source,

        updatedAt:
          updated.updatedAt
            .toISOString(),
      },
    };
  }

  private async currentMetrics() {
    const positions =
      await this.prisma
        .wealthPosition
        .findMany({
          where: {
            status: 'ACTIVE',
          },
        });

    let grossAssets = 0;
    let liabilities = 0;
    let liquidity = 0;
    let investments = 0;
    let realEstate = 0;
    let otherAssets = 0;
    let eurAssets = 0;

    const assetValues: number[] = [];

    for (const position of positions) {
      const value =
        Number(
          position.valueBase,
        );

      if (position.isLiability) {
        liabilities += value;
        continue;
      }

      grossAssets += value;
      assetValues.push(value);

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

      if (
        position.currency
          .trim()
          .toUpperCase() === 'EUR'
      ) {
        eurAssets += value;
      }
    }

    assetValues.sort(
      (left, right) =>
        right - left,
    );

    const sumTop = (
      count: number,
    ) =>
      assetValues
        .slice(0, count)
        .reduce(
          (total, value) =>
            total + value,
          0,
        );

    const netWorth =
      grossAssets -
      liabilities;

    const marketableAssets =
      liquidity +
      investments;

    return new Map<
      string,
      number
    >([
      [
        'LIQUIDITY_GROSS_ASSETS',
        this.percentage(
          liquidity,
          grossAssets,
        ),
      ],
      [
        'INVESTMENTS_GROSS_ASSETS',
        this.percentage(
          investments,
          grossAssets,
        ),
      ],
      [
        'MARKETABLE_GROSS_ASSETS',
        this.percentage(
          marketableAssets,
          grossAssets,
        ),
      ],
      [
        'REAL_ESTATE_GROSS_ASSETS',
        this.percentage(
          realEstate,
          grossAssets,
        ),
      ],
      [
        'OTHER_ASSETS_GROSS_ASSETS',
        this.percentage(
          otherAssets,
          grossAssets,
        ),
      ],
      [
        'LIABILITIES_GROSS_ASSETS',
        this.percentage(
          liabilities,
          grossAssets,
        ),
      ],
      [
        'TOP1_GROSS_ASSETS',
        this.percentage(
          sumTop(1),
          grossAssets,
        ),
      ],
      [
        'TOP5_GROSS_ASSETS',
        this.percentage(
          sumTop(5),
          grossAssets,
        ),
      ],
      [
        'TOP10_GROSS_ASSETS',
        this.percentage(
          sumTop(10),
          grossAssets,
        ),
      ],
      [
        'EUR_GROSS_ASSETS',
        this.percentage(
          eurAssets,
          grossAssets,
        ),
      ],
      [
        'NON_EUR_GROSS_ASSETS',
        this.percentage(
          grossAssets -
            eurAssets,
          grossAssets,
        ),
      ],
      [
        'NET_WORTH_EUR',
        this.round(
          netWorth,
          2,
        ),
      ],
      [
        'LIQUIDITY_EUR',
        this.round(
          liquidity,
          2,
        ),
      ],
    ]);
  }

  async getCompliance() {
    const limits =
      await this.getLimits();

    const metrics =
      await this.currentMetrics();

    const assessments =
      limits.limits.map(
        (limit) => {
          const currentValue =
            metrics.get(
              limit.code,
            ) ?? 0;

          let status:
            | 'NOT_CONFIGURED'
            | 'COMPLIANT'
            | 'BELOW_MINIMUM'
            | 'ABOVE_MAXIMUM';

          if (!limit.enabled) {
            status =
              'NOT_CONFIGURED';
          } else if (
            limit.minimum !== null &&
            currentValue <
              limit.minimum
          ) {
            status =
              'BELOW_MINIMUM';
          } else if (
            limit.maximum !== null &&
            currentValue >
              limit.maximum
          ) {
            status =
              'ABOVE_MAXIMUM';
          } else {
            status =
              'COMPLIANT';
          }

          return {
            ...limit,
            currentValue,
            status,

            deviationFromTarget:
              limit.target === null
                ? null
                : this.round(
                    currentValue -
                      limit.target,
                  ),
          };
        },
      );

    return {
      asOf:
        new Date().toISOString(),

      summary: {
        total:
          assessments.length,

        configured:
          assessments.filter(
            (item) =>
              item.enabled,
          ).length,

        notConfigured:
          assessments.filter(
            (item) =>
              item.status ===
              'NOT_CONFIGURED',
          ).length,

        compliant:
          assessments.filter(
            (item) =>
              item.status ===
              'COMPLIANT',
          ).length,

        breaches:
          assessments.filter(
            (item) =>
              item.status ===
                'BELOW_MINIMUM' ||
              item.status ===
                'ABOVE_MAXIMUM',
          ).length,
      },

      assessments,
    };
  }
}
