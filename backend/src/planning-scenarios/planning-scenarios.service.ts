import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { BudgetService } from '../budget/budget.service';

export type PlanningScenarioEventInput = {
  year: number;
  label: string;
  amount: number;
  category?: string;
};

export type SimulatePlanningScenarioInput = {
  name?: string;
  description?: string;

  initialCapitalAdjustment?: number;

  annualReturnAdjustmentPct?: number;
  annualCostAdjustmentPct?: number;
  annualRevenueAdjustmentPct?: number;
  expenseInflationDeltaPct?: number;

  events?: PlanningScenarioEventInput[];
};

type ValidatedScenarioInput = {
  name: string;
  description: string;

  initialCapitalAdjustment: number;

  annualReturnAdjustmentPct: number;
  annualCostAdjustmentPct: number;
  annualRevenueAdjustmentPct: number;
  expenseInflationDeltaPct: number;

  events: PlanningScenarioEventInput[];
};

@Injectable()
export class PlanningScenariosService {
  constructor(
    private readonly budgetService:
      BudgetService,
  ) {}

  private roundMoney(
    value: number,
  ): number {
    return (
      Math.round(
        (value + Number.EPSILON) *
          100,
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

  private validateNumber(
    value: unknown,
    fallback: number,
    label: string,
    minimum: number,
    maximum: number,
  ): number {
    if (
      value === undefined ||
      value === null
    ) {
      return fallback;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(
        `${label} deve essere un numero valido.`,
      );
    }

    if (
      parsed < minimum ||
      parsed > maximum
    ) {
      throw new BadRequestException(
        `${label} deve essere compreso tra ${minimum} e ${maximum}.`,
      );
    }

    return parsed;
  }

  private validateInput(
    input:
      | SimulatePlanningScenarioInput
      | undefined,
    startYear: number,
    endYear: number,
  ): ValidatedScenarioInput {
    const eventsInput =
      input?.events ?? [];

    if (!Array.isArray(eventsInput)) {
      throw new BadRequestException(
        'Gli eventi dello scenario devono essere un elenco.',
      );
    }

    const events =
      eventsInput.map(
        (event, index) => {
          const year =
            Number(event.year);

          const amount =
            Number(event.amount);

          const label =
            String(
              event.label ?? '',
            ).trim();

          if (
            !Number.isInteger(year) ||
            year < startYear ||
            year > endYear
          ) {
            throw new BadRequestException(
              `L’anno dell’evento ${index + 1} deve essere compreso tra ${startYear} e ${endYear}.`,
            );
          }

          if (
            !Number.isFinite(amount) ||
            Math.abs(amount) >
              1000000000
          ) {
            throw new BadRequestException(
              `L’importo dell’evento ${index + 1} non è valido.`,
            );
          }

          if (!label) {
            throw new BadRequestException(
              `L’evento ${index + 1} deve avere una descrizione.`,
            );
          }

          return {
            year,
            label,
            amount:
              this.roundMoney(amount),

            category:
              event.category
                ? String(
                    event.category,
                  ).trim()
                : undefined,
          };
        },
      );

    return {
      name:
        String(
          input?.name ??
            'Scenario personalizzato',
        ).trim() ||
        'Scenario personalizzato',

      description:
        String(
          input?.description ?? '',
        ).trim(),

      initialCapitalAdjustment:
        this.validateNumber(
          input?.initialCapitalAdjustment,
          0,
          'Rettifica del capitale iniziale',
          -1000000000,
          1000000000,
        ),

      annualReturnAdjustmentPct:
        this.validateNumber(
          input?.annualReturnAdjustmentPct,
          0,
          'Rettifica annuale del rendimento',
          -20,
          20,
        ),

      annualCostAdjustmentPct:
        this.validateNumber(
          input?.annualCostAdjustmentPct,
          0,
          'Rettifica dei costi',
          -100,
          500,
        ),

      annualRevenueAdjustmentPct:
        this.validateNumber(
          input?.annualRevenueAdjustmentPct,
          0,
          'Rettifica dei ricavi',
          -100,
          500,
        ),

      expenseInflationDeltaPct:
        this.validateNumber(
          input?.expenseInflationDeltaPct,
          0,
          'Rettifica dell’inflazione',
          -10,
          20,
        ),

      events,
    };
  }

  async getBaseline() {
    const budget =
      await this.budgetService
        .getOverview();

    return {
      generatedAt:
        new Date().toISOString(),

      baselineType:
        'OFFICIAL_BUDGET',

      immutable: true,

      source: {
        workbook: budget.workbook,
        asOfDate: budget.asOfDate,
      },

      defaultAssumptions: {
        initialCapitalAdjustment: 0,
        annualReturnAdjustmentPct: 0,
        annualCostAdjustmentPct: 0,
        annualRevenueAdjustmentPct: 0,
        expenseInflationDeltaPct: 0,
        events: [],
      },

      budget,
    };
  }

  async simulateScenario(
    input:
      | SimulatePlanningScenarioInput
      | undefined,
  ) {
    const budget =
      await this.budgetService
        .getOverview();

    const baselineYears =
      budget.longTerm.years;

    if (
      baselineYears.length === 0 ||
      budget.longTerm.startYear ===
        null ||
      budget.longTerm.endYear ===
        null
    ) {
      throw new BadRequestException(
        'La baseline di lungo periodo non è disponibile.',
      );
    }

    const firstBaselineYear =
      baselineYears[0];

    if (
      firstBaselineYear
        .capitalStart === null
    ) {
      throw new BadRequestException(
        'Il capitale iniziale della baseline non è disponibile.',
      );
    }

    const assumptions =
      this.validateInput(
        input,
        budget.longTerm.startYear,
        budget.longTerm.endYear,
      );

    let capitalStart =
      this.roundMoney(
        firstBaselineYear
          .capitalStart +
          assumptions
            .initialCapitalAdjustment,
      );

    const scenarioYears =
      baselineYears.map(
        (baselineYear, index) => {
          const baselineMovement =
            baselineYear.capitalStart !==
              null &&
            baselineYear.capitalEnd !==
              null
              ? baselineYear.capitalEnd -
                baselineYear.capitalStart
              : baselineYear.netCashFlow;

          const annualCostMultiplier =
            (
              1 +
              assumptions
                .annualCostAdjustmentPct /
                100
            ) *
            Math.pow(
              1 +
                assumptions
                  .expenseInflationDeltaPct /
                  100,
              index,
            );

          const costImpact =
            -baselineYear.totalCosts *
            (
              annualCostMultiplier -
              1
            );

          const revenueImpact =
            baselineYear
              .totalRevenues *
            (
              assumptions
                .annualRevenueAdjustmentPct /
              100
            );

          const returnImpact =
            capitalStart *
            (
              assumptions
                .annualReturnAdjustmentPct /
              100
            );

          const yearEvents =
            assumptions.events.filter(
              (event) =>
                event.year ===
                baselineYear.year,
            );

          const eventImpact =
            yearEvents.reduce(
              (total, event) =>
                total + event.amount,
              0,
            );

          const netCashFlow =
            this.roundMoney(
              baselineMovement +
                costImpact +
                revenueImpact +
                returnImpact +
                eventImpact,
            );

          const capitalEnd =
            this.roundMoney(
              capitalStart +
                netCashFlow,
            );

          const result = {
            year:
              baselineYear.year,

            baseline: {
              capitalStart:
                baselineYear
                  .capitalStart,

              totalCosts:
                baselineYear
                  .totalCosts,

              totalRevenues:
                baselineYear
                  .totalRevenues,

              netCashFlow:
                baselineYear
                  .netCashFlow,

              capitalEnd:
                baselineYear
                  .capitalEnd,
            },

            scenario: {
              capitalStart,
              totalCosts:
                this.roundMoney(
                  baselineYear
                    .totalCosts *
                    annualCostMultiplier,
                ),

              totalRevenues:
                this.roundMoney(
                  baselineYear
                    .totalRevenues *
                    (
                      1 +
                      assumptions
                        .annualRevenueAdjustmentPct /
                        100
                    ),
                ),

              costImpact:
                this.roundMoney(
                  costImpact,
                ),

              revenueImpact:
                this.roundMoney(
                  revenueImpact,
                ),

              returnImpact:
                this.roundMoney(
                  returnImpact,
                ),

              eventImpact:
                this.roundMoney(
                  eventImpact,
                ),

              netCashFlow,
              capitalEnd,

              deltaFromBaseline:
                baselineYear
                  .capitalEnd ===
                null
                  ? null
                  : this.roundMoney(
                      capitalEnd -
                        baselineYear
                          .capitalEnd,
                    ),
            },

            events: yearEvents,
          };

          capitalStart =
            capitalEnd;

          return result;
        },
      );

    const capitalValues =
      scenarioYears.map(
        (year) =>
          year.scenario.capitalEnd,
      );

    const minimumCapital =
      Math.min(
        ...capitalValues,
      );

    const minimumCapitalYear =
      scenarioYears.find(
        (year) =>
          year.scenario
            .capitalEnd ===
          minimumCapital,
      )?.year ?? null;

    const firstNegativeCapitalYear =
      scenarioYears.find(
        (year) =>
          year.scenario
            .capitalEnd < 0,
      )?.year ?? null;

    const finalScenarioYear =
      scenarioYears[
        scenarioYears.length - 1
      ];

    const baselineFinalCapital =
      baselineYears[
        baselineYears.length - 1
      ].capitalEnd;

    const scenarioFinalCapital =
      finalScenarioYear
        .scenario.capitalEnd;

    const finalCapitalDelta =
      baselineFinalCapital === null
        ? null
        : this.roundMoney(
            scenarioFinalCapital -
              baselineFinalCapital,
          );

    const finalCapitalDeltaPct =
      baselineFinalCapital === null ||
      baselineFinalCapital === 0
        ? null
        : this.roundPercentage(
            (
              (
                scenarioFinalCapital -
                baselineFinalCapital
              ) /
              Math.abs(
                baselineFinalCapital,
              )
            ) *
              100,
          );

    const initialCapital =
      scenarioYears[0]
        .scenario.capitalStart;

    const maximumDrawdownPct =
      initialCapital <= 0
        ? null
        : this.roundPercentage(
            (
              (
                initialCapital -
                minimumCapital
              ) /
              initialCapital
            ) *
              100,
          );

    const averageNetCashFlow =
      this.roundMoney(
        scenarioYears.reduce(
          (total, year) =>
            total +
            year.scenario
              .netCashFlow,
          0,
        ) /
          scenarioYears.length,
      );

    const status =
      firstNegativeCapitalYear !==
      null
        ? 'UNSUSTAINABLE'
        : minimumCapital <
            initialCapital * 0.25
          ? 'AT_RISK'
          : 'SUSTAINABLE';

    const warnings: string[] = [];

    if (
      assumptions
        .annualReturnAdjustmentPct <
      0
    ) {
      warnings.push(
        'Lo scenario ipotizza un rendimento inferiore alla baseline.',
      );
    }

    if (
      assumptions
        .expenseInflationDeltaPct >
      0
    ) {
      warnings.push(
        'I costi crescono più rapidamente rispetto alla baseline.',
      );
    }

    if (
      firstNegativeCapitalYear !==
      null
    ) {
      warnings.push(
        `Il capitale diventa negativo nel ${firstNegativeCapitalYear}.`,
      );
    }

    if (
      assumptions.events.length ===
        0 &&
      assumptions
        .initialCapitalAdjustment ===
        0 &&
      assumptions
        .annualReturnAdjustmentPct ===
        0 &&
      assumptions
        .annualCostAdjustmentPct ===
        0 &&
      assumptions
        .annualRevenueAdjustmentPct ===
        0 &&
      assumptions
        .expenseInflationDeltaPct ===
        0
    ) {
      warnings.push(
        'Lo scenario coincide con la baseline ufficiale.',
      );
    }

    return {
      generatedAt:
        new Date().toISOString(),

      scenarioType:
        'DELTA_FROM_OFFICIAL_BASELINE',

      baselineImmutable: true,

      baselineSource: {
        workbook: budget.workbook,
        asOfDate: budget.asOfDate,
        startYear:
          budget.longTerm.startYear,
        endYear:
          budget.longTerm.endYear,
      },

      scenario: {
        name: assumptions.name,
        description:
          assumptions.description,
        assumptions,
      },

      summary: {
        status,
        initialCapital,
        finalCapital:
          scenarioFinalCapital,

        minimumCapital,
        minimumCapitalYear,

        firstNegativeCapitalYear,

        averageNetCashFlow,
        maximumDrawdownPct,
      },

      comparison: {
        baselineFinalCapital,
        scenarioFinalCapital,
        finalCapitalDelta,
        finalCapitalDeltaPct,

        baselineMinimumCapital:
          budget.longTerm
            .minimumCapital,

        scenarioMinimumCapital:
          minimumCapital,
      },

      warnings,
      years: scenarioYears,
    };
  }
}
