import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { BudgetService } from '../budget/budget.service';
import { PrismaService } from '../prisma/prisma.service';
import { PropertiesService } from '../properties/properties.service';
import { WealthService } from '../wealth/wealth.service';

import {
  PlanningScenariosService,
  type SimulatePlanningScenarioInput,
} from './planning-scenarios.service';

export type PlanningAssetClass =
  | 'LIQUIDITY'
  | 'INVESTMENTS'
  | 'REAL_ESTATE'
  | 'OTHER_ASSETS';

export type PlanningAllocationTransferInput = {
  year: number;
  label?: string;
  from: PlanningAssetClass;
  to: PlanningAssetClass;
  amount: number;

  timing?:
    | 'BEFORE_OPERATING_CASH_FLOW'
    | 'END_OF_YEAR';
};

export type PlanningAllocationAssumptionsInput = {
  liquidityReturnDeltaPct?: number;
  investmentsReturnDeltaPct?: number;
  realEstateReturnDeltaPct?: number;
  otherAssetsReturnDeltaPct?: number;

  positiveCashFlowDestination?:
    PlanningAssetClass;

  deficitFundingOrder?:
    PlanningAssetClass[];

  transfers?:
    PlanningAllocationTransferInput[];
};

export type SimulatePlanningAllocationInput =
  SimulatePlanningScenarioInput & {
    allocation?:
      PlanningAllocationAssumptionsInput;
  };

type AllocationBalances =
  Record<PlanningAssetClass, number>;

type AllocationWeights =
  Record<
    PlanningAssetClass,
    number | null
  >;

const ASSET_CLASSES:
  PlanningAssetClass[] = [
    'LIQUIDITY',
    'INVESTMENTS',
    'REAL_ESTATE',
    'OTHER_ASSETS',
  ];

@Injectable()
export class PlanningAllocationService {
  constructor(
    private readonly scenarioEngine:
      PlanningScenariosService,

    private readonly budgetService:
      BudgetService,

    private readonly wealthService:
      WealthService,

    private readonly propertiesService:
      PropertiesService,

    private readonly prisma:
      PrismaService,
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

  private normalize(
    value: unknown,
  ): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        ' ',
      )
      .trim();
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

  private validateAssetClass(
    value: unknown,
    label: string,
  ): PlanningAssetClass {
    if (
      typeof value !== 'string' ||
      !ASSET_CLASSES.includes(
        value as PlanningAssetClass,
      )
    ) {
      throw new BadRequestException(
        `${label} non è una asset class valida.`,
      );
    }

    return value as PlanningAssetClass;
  }

  private cloneBalances(
    balances: AllocationBalances,
  ): AllocationBalances {
    return {
      LIQUIDITY:
        balances.LIQUIDITY,

      INVESTMENTS:
        balances.INVESTMENTS,

      REAL_ESTATE:
        balances.REAL_ESTATE,

      OTHER_ASSETS:
        balances.OTHER_ASSETS,
    };
  }

  private totalBalances(
    balances: AllocationBalances,
  ): number {
    return this.roundMoney(
      ASSET_CLASSES.reduce(
        (total, assetClass) =>
          total +
          balances[assetClass],
        0,
      ),
    );
  }

  private calculateWeights(
    balances: AllocationBalances,
  ): AllocationWeights {
    const total =
      this.totalBalances(balances);

    if (total <= 0) {
      return {
        LIQUIDITY: null,
        INVESTMENTS: null,
        REAL_ESTATE: null,
        OTHER_ASSETS: null,
      };
    }

    return {
      LIQUIDITY:
        this.roundPercentage(
          balances.LIQUIDITY /
            total *
            100,
        ),

      INVESTMENTS:
        this.roundPercentage(
          balances.INVESTMENTS /
            total *
            100,
        ),

      REAL_ESTATE:
        this.roundPercentage(
          balances.REAL_ESTATE /
            total *
            100,
        ),

      OTHER_ASSETS:
        this.roundPercentage(
          balances.OTHER_ASSETS /
            total *
            100,
        ),
    };
  }

  private applyCashFlow(
    balances: AllocationBalances,
    amount: number,

    positiveDestination:
      PlanningAssetClass,

    fundingOrder:
      PlanningAssetClass[],
  ) {
    if (amount >= 0) {
      balances[
        positiveDestination
      ] = this.roundMoney(
        balances[
          positiveDestination
        ] +
        amount,
      );

      return {
        positiveDestination,
        unfundedAmount: 0,
      };
    }

    let remaining =
      Math.abs(amount);

    for (
      const assetClass
      of fundingOrder
    ) {
      const available =
        Math.max(
          0,
          balances[assetClass],
        );

      const used =
        Math.min(
          available,
          remaining,
        );

      balances[
        assetClass
      ] = this.roundMoney(
        balances[assetClass] -
        used,
      );

      remaining =
        this.roundMoney(
          remaining - used,
        );

      if (remaining <= 0) {
        break;
      }
    }

    if (remaining > 0) {
      balances.LIQUIDITY =
        this.roundMoney(
          balances.LIQUIDITY -
          remaining,
        );
    }

    return {
      positiveDestination: null,
      unfundedAmount:
        remaining,
    };
  }

  private applyInternalTransfer(
    balances: AllocationBalances,
    from: PlanningAssetClass,
    to: PlanningAssetClass,
    amount: number,
  ) {
    if (amount <= 0) {
      return;
    }

    if (
      balances[from] + 0.01 <
      amount
    ) {
      throw new BadRequestException(
        `Il trasferimento da ${from} a ${to} supera il valore disponibile.`,
      );
    }

    balances[from] =
      this.roundMoney(
        balances[from] -
        amount,
      );

    balances[to] =
      this.roundMoney(
        balances[to] +
        amount,
      );
  }

  private fundPropertyPurchase(
    balances: AllocationBalances,
    amount: number,

    fundingOrder:
      PlanningAssetClass[],
  ) {
    let remaining = amount;

    for (
      const assetClass
      of fundingOrder
    ) {
      if (
        assetClass ===
        'REAL_ESTATE'
      ) {
        continue;
      }

      const available =
        Math.max(
          0,
          balances[assetClass],
        );

      const used =
        Math.min(
          available,
          remaining,
        );

      balances[assetClass] =
        this.roundMoney(
          balances[assetClass] -
          used,
        );

      balances.REAL_ESTATE =
        this.roundMoney(
          balances.REAL_ESTATE +
          used,
        );

      remaining =
        this.roundMoney(
          remaining - used,
        );

      if (remaining <= 0) {
        break;
      }
    }

    if (remaining > 0) {
      balances.LIQUIDITY =
        this.roundMoney(
          balances.LIQUIDITY -
          remaining,
        );

      balances.REAL_ESTATE =
        this.roundMoney(
          balances.REAL_ESTATE +
          remaining,
        );
    }

    return {
      amount:
        this.roundMoney(amount),

      unfundedAmount:
        remaining,
    };
  }

  private isPropertyEvent(
    category: string | undefined,
  ): boolean {
    const normalized =
      this.normalize(category);

    return (
      normalized.includes(
        'property',
      ) ||
      normalized.includes(
        'real estate',
      ) ||
      normalized.includes(
        'immobil',
      )
    );
  }

  async simulateAllocation(
    input:
      | SimulatePlanningAllocationInput
      | undefined,
  ) {
    const rawInput =
      input ?? {};

    const {
      allocation,
      ...scenarioInput
    } = rawInput;

    const globalReturnDeltaPct =
      this.validateNumber(
        scenarioInput
          .annualReturnAdjustmentPct,
        0,
        'Rettifica rendimento generale',
        -20,
        20,
      );

    const validatedScenario =
      await this.scenarioEngine
        .simulateScenario({
          ...scenarioInput,

          annualReturnAdjustmentPct:
            0,
        });

    const assumptions =
      validatedScenario
        .scenario.assumptions;

    const budget =
      await this.budgetService
        .getOverview();

    const wealth =
      await this.wealthService
        .getSummary();

    const properties =
      await this.propertiesService
        .getOverview();

    const startYear =
      validatedScenario
        .baselineSource.startYear;

    const endYear =
      validatedScenario
        .baselineSource.endYear;

    const startDate =
      new Date(
        `${startYear}-01-01T00:00:00.000Z`,
      );

    const openingProperties =
      properties.properties.filter(
        (property) => {
          if (
            property.status !==
            'HELD_FOR_SALE'
          ) {
            return true;
          }

          if (
            !property
              .expectedClosingDate
          ) {
            return true;
          }

          return (
            new Date(
              property
                .expectedClosingDate,
            ) >= startDate
          );
        },
      );

    const excludedOpeningProperties =
      properties.properties.filter(
        (property) =>
          !openingProperties.some(
            (openingProperty) =>
              openingProperty.id ===
              property.id,
          ),
      );

    const openingRealEstate =
      this.roundMoney(
        openingProperties.reduce(
          (total, property) =>
            total +
            property.netEquity,
          0,
        ),
      );

    const financialCapitalStart =
      this.roundMoney(
        (
          budget.longTerm
            .years[0]
            ?.capitalStart ??
          validatedScenario
            .summary
            .initialCapital
        ) +
        assumptions
          .initialCapitalAdjustment,
      );

    const currentMarketable =
      wealth.liquidity +
      wealth.investments;

    const liquidityRatio =
      currentMarketable > 0
        ? wealth.liquidity /
          currentMarketable
        : 1;

    const initialLiquidity =
      this.roundMoney(
        financialCapitalStart *
        liquidityRatio,
      );

    const initialAllocation:
      AllocationBalances = {
      LIQUIDITY:
        initialLiquidity,

      INVESTMENTS:
        this.roundMoney(
          financialCapitalStart -
          initialLiquidity,
        ),

      REAL_ESTATE:
        openingRealEstate,

      OTHER_ASSETS:
        this.roundMoney(
          wealth.otherAssets,
        ),
    };

    const currentAllocation:
      AllocationBalances = {
      LIQUIDITY:
        this.roundMoney(
          wealth.liquidity,
        ),

      INVESTMENTS:
        this.roundMoney(
          wealth.investments,
        ),

      REAL_ESTATE:
        this.roundMoney(
          wealth.realEstate -
          wealth.liabilities,
        ),

      OTHER_ASSETS:
        this.roundMoney(
          wealth.otherAssets,
        ),
    };

    const returnDeltasPct = {
      LIQUIDITY:
        this.validateNumber(
          allocation
            ?.liquidityReturnDeltaPct,
          0,
          'Rendimento liquidità',
          -30,
          30,
        ),

      INVESTMENTS:
        this.validateNumber(
          allocation
            ?.investmentsReturnDeltaPct,
          0,
          'Rendimento investimenti',
          -30,
          30,
        ),

      REAL_ESTATE:
        this.validateNumber(
          allocation
            ?.realEstateReturnDeltaPct,
          0,
          'Rendimento immobili',
          -30,
          30,
        ),

      OTHER_ASSETS:
        this.validateNumber(
          allocation
            ?.otherAssetsReturnDeltaPct,
          0,
          'Rendimento altri attivi',
          -30,
          30,
        ),
    };

    const effectiveReturnsPct = {
      LIQUIDITY:
        this.roundPercentage(
          globalReturnDeltaPct +
          returnDeltasPct
            .LIQUIDITY,
        ),

      INVESTMENTS:
        this.roundPercentage(
          globalReturnDeltaPct +
          returnDeltasPct
            .INVESTMENTS,
        ),

      REAL_ESTATE:
        this.roundPercentage(
          globalReturnDeltaPct +
          returnDeltasPct
            .REAL_ESTATE,
        ),

      OTHER_ASSETS:
        this.roundPercentage(
          globalReturnDeltaPct +
          returnDeltasPct
            .OTHER_ASSETS,
        ),
    };

    const positiveDestination =
      allocation
        ?.positiveCashFlowDestination
        ? this.validateAssetClass(
            allocation
              .positiveCashFlowDestination,
            'Destinazione flussi positivi',
          )
        : 'LIQUIDITY';

    const requestedFundingOrder =
      allocation
        ?.deficitFundingOrder ??
      [
        'LIQUIDITY',
        'INVESTMENTS',
        'OTHER_ASSETS',
        'REAL_ESTATE',
      ];

    const fundingOrder =
      Array.from(
        new Set(
          requestedFundingOrder.map(
            (assetClass, index) =>
              this.validateAssetClass(
                assetClass,
                `Ordine copertura ${index + 1}`,
              ),
          ),
        ),
      );

    for (
      const assetClass
      of ASSET_CLASSES
    ) {
      if (
        !fundingOrder.includes(
          assetClass,
        )
      ) {
        fundingOrder.push(
          assetClass,
        );
      }
    }

    const manualTransfers =
      (
        allocation?.transfers ??
        []
      ).map(
        (transfer, index) => {
          const year =
            Number(
              transfer.year,
            );

          const amount =
            Number(
              transfer.amount,
            );

          if (
            !Number.isInteger(year) ||
            year < startYear ||
            year > endYear
          ) {
            throw new BadRequestException(
              `Anno trasferimento ${index + 1} non valido.`,
            );
          }

          if (
            !Number.isFinite(amount) ||
            amount <= 0
          ) {
            throw new BadRequestException(
              `Importo trasferimento ${index + 1} non valido.`,
            );
          }

          const from =
            this.validateAssetClass(
              transfer.from,
              `Origine trasferimento ${index + 1}`,
            );

          const to =
            this.validateAssetClass(
              transfer.to,
              `Destinazione trasferimento ${index + 1}`,
            );

          const timing =
            transfer.timing ??
            'BEFORE_OPERATING_CASH_FLOW';

          if (
            timing !==
              'BEFORE_OPERATING_CASH_FLOW' &&
            timing !==
              'END_OF_YEAR'
          ) {
            throw new BadRequestException(
              `Momento trasferimento ${index + 1} non valido.`,
            );
          }

          if (from === to) {
            throw new BadRequestException(
              `Il trasferimento ${index + 1} deve usare asset class differenti.`,
            );
          }

          return {
            year,
            label:
              String(
                transfer.label ??
                '',
              ).trim() ||
              `Trasferimento ${index + 1}`,

            from,
            to,
            timing,

            amount:
              this.roundMoney(
                amount,
              ),
          };
        },
      );

    const propertyCarryingValues =
      new Map<string, number>();

    for (
      const property
      of openingProperties
    ) {
      propertyCarryingValues.set(
        this.normalize(
          property.name,
        ),

        this.roundMoney(
          property.netEquity,
        ),
      );
    }

    let balances =
      this.cloneBalances(
        initialAllocation,
      );

    const years =
      budget.longTerm.years.map(
        (budgetYear, index) => {
          const start =
            this.cloneBalances(
              balances,
            );

          const startTotal =
            this.totalBalances(
              start,
            );

          const returns:
            AllocationBalances = {
            LIQUIDITY:
              this.roundMoney(
                start.LIQUIDITY *
                effectiveReturnsPct
                  .LIQUIDITY /
                100,
              ),

            INVESTMENTS:
              this.roundMoney(
                start.INVESTMENTS *
                effectiveReturnsPct
                  .INVESTMENTS /
                100,
              ),

            REAL_ESTATE:
              this.roundMoney(
                start.REAL_ESTATE *
                effectiveReturnsPct
                  .REAL_ESTATE /
                100,
              ),

            OTHER_ASSETS:
              this.roundMoney(
                start.OTHER_ASSETS *
                effectiveReturnsPct
                  .OTHER_ASSETS /
                100,
              ),
          };

          for (
            const assetClass
            of ASSET_CLASSES
          ) {
            balances[assetClass] =
              this.roundMoney(
                balances[
                  assetClass
                ] +
                returns[
                  assetClass
                ],
              );
          }

          const propertyReturnFactor =
            1 +
            effectiveReturnsPct
              .REAL_ESTATE /
              100;

          for (
            const [
              key,
              value,
            ]
            of propertyCarryingValues
          ) {
            propertyCarryingValues.set(
              key,

              this.roundMoney(
                value *
                propertyReturnFactor,
              ),
            );
          }

          const yearEvents =
            assumptions.events.filter(
              (event) =>
                event.year ===
                budgetYear.year,
            );

          const propertyEvents =
            yearEvents.filter(
              (event) =>
                this.isPropertyEvent(
                  event.category,
                ),
            );

          const operatingEvents =
            yearEvents.filter(
              (event) =>
                !this.isPropertyEvent(
                  event.category,
                ),
            );

          const propertyPurchases = [
            ...budgetYear
              .capitalMovements
              .propertyInvestments,

            ...propertyEvents
              .filter(
                (event) =>
                  event.amount < 0,
              )
              .map((event) => ({
                label:
                  event.label,

                amount:
                  Math.abs(
                    event.amount,
                  ),
              })),
          ];

          const propertySales = [
            ...budgetYear
              .capitalMovements
              .propertySales,

            ...propertyEvents
              .filter(
                (event) =>
                  event.amount > 0,
              )
              .map((event) => ({
                label:
                  event.label,

                amount:
                  event.amount,
              })),
          ];

          const appliedPropertySales =
            propertySales.map(
              (sale) => {
                const saleKey =
                  this.normalize(
                    sale.label,
                  )
                    .replace(
                      'vendita immobile',
                      '',
                    )
                    .trim();

                const matchedEntry =
                  Array.from(
                    propertyCarryingValues
                      .entries(),
                  ).find(
                    ([propertyKey]) =>
                      propertyKey.includes(
                        saleKey,
                      ) ||
                      saleKey.includes(
                        propertyKey.replace(
                          'immobile',
                          '',
                        ).trim(),
                      ),
                  );

                const carryingValue =
                  matchedEntry
                    ? matchedEntry[1]
                    : this.roundMoney(
                        sale.amount,
                      );

                if (matchedEntry) {
                  propertyCarryingValues.delete(
                    matchedEntry[0],
                  );
                }

                balances.REAL_ESTATE =
                  this.roundMoney(
                    balances
                      .REAL_ESTATE -
                    carryingValue,
                  );

                balances.LIQUIDITY =
                  this.roundMoney(
                    balances
                      .LIQUIDITY +
                    sale.amount,
                  );

                return {
                  ...sale,

                  carryingValue,

                  gainLoss:
                    this.roundMoney(
                      sale.amount -
                      carryingValue,
                    ),

                  valuationSource:
                    matchedEntry
                      ? 'PROPERTY_REGISTRY'
                      : 'SALE_PROCEEDS_ESTIMATE',
                };
              },
            );

          const appliedPropertyPurchases =
            propertyPurchases.map(
              (purchase) => {
                const funding =
                  this.fundPropertyPurchase(
                    balances,
                    purchase.amount,
                    fundingOrder,
                  );

                const key =
                  this.normalize(
                    purchase.label,
                  );

                propertyCarryingValues.set(
                  key,

                  this.roundMoney(
                    (
                      propertyCarryingValues
                        .get(key) ??
                      0
                    ) +
                    purchase.amount,
                  ),
                );

                return {
                  ...purchase,
                  ...funding,
                };
              },
            );

          const manualYearTransfers =
            manualTransfers.filter(
              (transfer) =>
                transfer.year ===
                budgetYear.year,
            );

          const beforeCashFlowTransfers =
            manualYearTransfers.filter(
              (transfer) =>
                transfer.timing !==
                'END_OF_YEAR',
            );

          const endOfYearTransfers =
            manualYearTransfers.filter(
              (transfer) =>
                transfer.timing ===
                'END_OF_YEAR',
            );

          for (
            const transfer
            of beforeCashFlowTransfers
          ) {
            this.applyInternalTransfer(
              balances,
              transfer.from,
              transfer.to,
              transfer.amount,
            );
          }

          const costMultiplier =
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

          const revenueMultiplier =
            1 +
            assumptions
              .annualRevenueAdjustmentPct /
              100;

          const adjustedOperatingCosts =
            this.roundMoney(
              budgetYear
                .operatingCosts *
              costMultiplier,
            );

          const adjustedOperatingRevenues =
            this.roundMoney(
              budgetYear
                .operatingRevenues *
              revenueMultiplier,
            );

          const operatingEventImpact =
            this.roundMoney(
              operatingEvents.reduce(
                (total, event) =>
                  total +
                  event.amount,
                0,
              ),
            );

          const operatingNetCashFlow =
            this.roundMoney(
              adjustedOperatingRevenues -
              adjustedOperatingCosts +
              operatingEventImpact,
            );

          const cashFlowAllocation =
            this.applyCashFlow(
              balances,
              operatingNetCashFlow,
              positiveDestination,
              fundingOrder,
            );

          for (
            const transfer
            of endOfYearTransfers
          ) {
            this.applyInternalTransfer(
              balances,
              transfer.from,
              transfer.to,
              transfer.amount,
            );
          }

          const totalReturnImpact =
            this.totalBalances(
              returns,
            );

          const propertySaleGainLoss =
            this.roundMoney(
              appliedPropertySales.reduce(
                (total, sale) =>
                  total +
                  sale.gainLoss,
                0,
              ),
            );

          const end =
            this.cloneBalances(
              balances,
            );

          const endTotal =
            this.totalBalances(
              end,
            );

          const expectedEndTotal =
            this.roundMoney(
              startTotal +
              totalReturnImpact +
              operatingNetCashFlow +
              propertySaleGainLoss,
            );

          return {
            year:
              budgetYear.year,

            start,
            startTotal,

            returns,
            effectiveReturnsPct,
            totalReturnImpact,

            budget: {
              ordinaryExpenses:
                budgetYear
                  .ordinaryExpenses,

              extraordinaryExpenses:
                budgetYear
                  .extraordinaryExpenses,

              operatingCosts:
                budgetYear
                  .operatingCosts,

              operatingRevenues:
                budgetYear
                  .operatingRevenues,

              propertyInvestments:
                budgetYear
                  .propertyInvestments,

              propertySales:
                budgetYear
                  .propertySales,
            },

            adjustedOperatingCosts,
            adjustedOperatingRevenues,
            operatingEventImpact,
            operatingNetCashFlow,

            propertyMovements: {
              purchases:
                appliedPropertyPurchases,

              sales:
                appliedPropertySales,

              saleGainLoss:
                propertySaleGainLoss,
            },

            manualTransfers:
              manualYearTransfers,

            cashFlowAllocation,

            end,
            endTotal,

            weights:
              this.calculateWeights(
                end,
              ),

            reconciliationDifference:
              this.roundMoney(
                endTotal -
                expectedEndTotal,
              ),
          };
        },
      );

    const finalYear =
      years[
        years.length - 1
      ];

    const minimumLiquidityYear =
      years.reduce(
        (minimum, year) =>
          year.end.LIQUIDITY <
          minimum.end.LIQUIDITY
            ? year
            : minimum,
        years[0],
      );

    const maximumRealEstateYear =
      years.reduce(
        (maximum, year) =>
          (
            year.weights
              .REAL_ESTATE ??
            -Infinity
          ) >
          (
            maximum.weights
              .REAL_ESTATE ??
            -Infinity
          )
            ? year
            : maximum,
        years[0],
      );

    const enabledLimits =
      await this.prisma
        .ipsPolicyLimit.findMany({
          where: {
            enabled: true,
          },
        });

    type ProjectionYear =
      (typeof years)[number];

    type ProjectionBreach = {
      year: number;
      value: number;
      status:
        | 'BELOW_MINIMUM'
        | 'ABOVE_MAXIMUM';
      threshold: number;
      deviation: number;
    };

    type ProjectionTargetAttention = {
      year: number;
      value: number;

      status:
        | 'BELOW_TARGET'
        | 'ABOVE_TARGET';

      target: number;
      deviation: number;
    };

    const roundProjectionValue = (
      value: number,
    ): number =>
      Math.round(
        (
          value +
          Number.EPSILON
        ) * 10000,
      ) / 10000;

    const getProjectionMetric = (
      code: string,
      year: ProjectionYear,
    ): number | null => {
      const liquidityWeight =
        year.weights.LIQUIDITY ??
        0;

      const investmentsWeight =
        year.weights.INVESTMENTS ??
        0;

      const realEstateWeight =
        year.weights.REAL_ESTATE ??
        0;

      const otherAssetsWeight =
        year.weights.OTHER_ASSETS ??
        0;

      switch (code) {
        case
          'LIQUIDITY_GROSS_ASSETS':
          return liquidityWeight;

        case
          'INVESTMENTS_GROSS_ASSETS':
          return investmentsWeight;

        case
          'MARKETABLE_GROSS_ASSETS':
          return roundProjectionValue(
            liquidityWeight +
              investmentsWeight,
          );

        case
          'REAL_ESTATE_GROSS_ASSETS':
          return realEstateWeight;

        case
          'OTHER_ASSETS_GROSS_ASSETS':
          return otherAssetsWeight;

        case 'NET_WORTH_EUR':
          return year.endTotal;

        case 'LIQUIDITY_EUR':
          return (
            year.end.LIQUIDITY ??
            0
          );

        default:
          return null;
      }
    };

    const projectedLimitResults =
      enabledLimits.map(
        (limit) => {
          const annualValues: Array<{
            year: number;
            value: number;
          }> = [];

          for (
            const year of years
          ) {
            const value =
              getProjectionMetric(
                limit.code,
                year,
              );

            if (value !== null) {
              annualValues.push({
                year:
                  year.year,

                value:
                  roundProjectionValue(
                    value,
                  ),
              });
            }
          }

          const supported =
            annualValues.length ===
            years.length;

          const breaches:
            ProjectionBreach[] = [];

          const targetAttentions:
            ProjectionTargetAttention[] = [];

          if (supported) {
            for (
              const item of
              annualValues
            ) {
              if (
                limit.minimum !==
                  null &&
                item.value <
                  limit.minimum
              ) {
                breaches.push({
                  year:
                    item.year,

                  value:
                    item.value,

                  status:
                    'BELOW_MINIMUM',

                  threshold:
                    limit.minimum,

                  deviation:
                    roundProjectionValue(
                      item.value -
                        limit.minimum,
                    ),
                });

                continue;
              }

              if (
                limit.maximum !==
                  null &&
                item.value >
                  limit.maximum
              ) {
                breaches.push({
                  year:
                    item.year,

                  value:
                    item.value,

                  status:
                    'ABOVE_MAXIMUM',

                  threshold:
                    limit.maximum,

                  deviation:
                    roundProjectionValue(
                      item.value -
                        limit.maximum,
                    ),
                });

                continue;
              }

              const target =
                limit.target;

              if (target === null) {
                continue;
              }

              const minimumTarget =
                limit.minimum !== null &&
                target >
                  limit.minimum;

              const maximumTarget =
                limit.maximum !== null &&
                target <
                  limit.maximum;

              if (
                minimumTarget &&
                item.value < target
              ) {
                targetAttentions.push({
                  year:
                    item.year,

                  value:
                    item.value,

                  status:
                    'BELOW_TARGET',

                  target,

                  deviation:
                    roundProjectionValue(
                      item.value -
                        target,
                    ),
                });

                continue;
              }

              if (
                maximumTarget &&
                item.value > target
              ) {
                targetAttentions.push({
                  year:
                    item.year,

                  value:
                    item.value,

                  status:
                    'ABOVE_TARGET',

                  target,

                  deviation:
                    roundProjectionValue(
                      item.value -
                        target,
                    ),
                });
              }
            }
          }

          const firstBreach =
            breaches[0] ?? null;

          const lastBreach =
            breaches[
              breaches.length - 1
            ] ?? null;

          const firstTargetAttention =
            targetAttentions[0] ??
            null;

          const lastTargetAttention =
            targetAttentions[
              targetAttentions.length -
                1
            ] ?? null;

          const breachPersistsToEnd =
            lastBreach !== null &&
            lastBreach.year ===
              finalYear.year;

          const attentionPersistsToEnd =
            lastTargetAttention !==
              null &&
            lastTargetAttention.year ===
              finalYear.year;

          const severity =
            breaches.length > 0
              ? breachPersistsToEnd
                ? 'CRITICAL'
                : 'WARNING'
              : targetAttentions.length >
                    0
                ? attentionPersistsToEnd
                  ? 'WARNING'
                  : 'ATTENTION'
                : 'NONE';

          let recommendedAction:
            string | null = null;

          if (
            firstBreach?.status ===
            'BELOW_MINIMUM'
          ) {
            recommendedAction =
              `Incrementare ${limit.label.toLowerCase()} fino ad almeno ${firstBreach.threshold} ${limit.unit === 'EUR' ? 'EUR' : '%'}.`;
          } else if (
            firstBreach?.status ===
            'ABOVE_MAXIMUM'
          ) {
            recommendedAction =
              `Ridurre ${limit.label.toLowerCase()} fino a non oltre ${firstBreach.threshold} ${limit.unit === 'EUR' ? 'EUR' : '%'}.`;
          } else if (
            firstTargetAttention
              ?.status ===
            'BELOW_TARGET'
          ) {
            recommendedAction =
              `Incrementare ${limit.label.toLowerCase()} verso il target di ${firstTargetAttention.target} ${limit.unit === 'EUR' ? 'EUR' : '%'}.`;
          } else if (
            firstTargetAttention
              ?.status ===
            'ABOVE_TARGET'
          ) {
            recommendedAction =
              `Ridurre ${limit.label.toLowerCase()} verso il target di ${firstTargetAttention.target} ${limit.unit === 'EUR' ? 'EUR' : '%'}.`;
          }

          return {
            code:
              limit.code,

            label:
              limit.label,

            dimension:
              limit.dimension,

            unit:
              limit.unit,

            minimum:
              limit.minimum,

            target:
              limit.target,

            maximum:
              limit.maximum,

            supported,

            status:
              !supported
                ? 'NOT_ASSESSED'
                : breaches.length > 0
                  ? 'NON_COMPLIANT'
                  : targetAttentions
                        .length > 0
                    ? 'ATTENTION'
                    : 'COMPLIANT',

            severity,

            firstBreachYear:
              firstBreach?.year ??
              null,

            lastBreachYear:
              lastBreach?.year ??
              null,

            breachCount:
              breaches.length,

            targetAttentionCount:
              targetAttentions.length,

            firstTargetAttentionYear:
              firstTargetAttention
                ?.year ?? null,

            lastTargetAttentionYear:
              lastTargetAttention
                ?.year ?? null,

            recommendedAction,

            annualValues,
            breaches,
            targetAttentions,
          };
        },
      );

    const assessedLimitCount =
      projectedLimitResults.filter(
        (result) =>
          result.supported,
      ).length;

    const unsupportedLimits =
      projectedLimitResults
        .filter(
          (result) =>
            !result.supported,
        )
        .map((result) => ({
          code:
            result.code,

          label:
            result.label,

          reason:
            'La serie prospettica necessaria non è ancora disponibile.',
        }));

    const projectedBreaches =
      projectedLimitResults.reduce(
        (total, result) =>
          total +
          result.breachCount,
        0,
      );

    const breachedLimitCount =
      projectedLimitResults.filter(
        (result) =>
          result.breachCount > 0,
      ).length;

    const attentionLimitCount =
      projectedLimitResults.filter(
        (result) =>
          result
            .targetAttentionCount >
          0,
      ).length;

    const projectedTargetAttentions =
      projectedLimitResults.reduce(
        (total, result) =>
          total +
          result
            .targetAttentionCount,
        0,
      );

    const targetAttentionYears =
      projectedLimitResults.flatMap(
        (result) =>
          result.targetAttentions.map(
            (attention) =>
              attention.year,
          ),
      );

    const firstProjectedAttentionYear =
      targetAttentionYears.length > 0
        ? Math.min(
            ...targetAttentionYears,
          )
        : null;

    const breachYears =
      projectedLimitResults.flatMap(
        (result) =>
          result.breaches.map(
            (breach) =>
              breach.year,
          ),
      );

    const firstProjectedBreachYear =
      breachYears.length > 0
        ? Math.min(
            ...breachYears,
          )
        : null;

    const configurationStatus =
      enabledLimits.length === 0
        ? 'NOT_CONFIGURED'
        : unsupportedLimits.length > 0
          ? 'PARTIALLY_CONFIGURED'
          : 'CONFIGURED';

    const ipsForwardStatus =
      enabledLimits.length === 0
        ? 'NOT_ASSESSED'
        : projectedBreaches > 0
          ? 'NON_COMPLIANT'
          : projectedTargetAttentions >
                0 ||
              unsupportedLimits.length >
                0
            ? 'ATTENTION'
            : 'COMPLIANT';

    const remediationPlans: Array<{
      code: string;
      year: number;

      source:
        PlanningAssetClass;

      destination:
        PlanningAssetClass;

      timing:
        'END_OF_YEAR';

      currentAmount: number;
      currentWeight: number;

      minimumWeight:
        number | null;

      targetWeight:
        number | null;

      amountToMinimum: number;
      amountToTarget: number;
      recommendedAmount: number;

      sourceAvailable: number;
      fullyFundable: boolean;

      label: string;
      note: string;
    }> = [];

    const liquidityLimitResult =
      projectedLimitResults.find(
        (result) =>
          result.code ===
          'LIQUIDITY_GROSS_ASSETS',
      );

    /*
     * Interviene sempre sul primo anno
     * problematico in ordine cronologico,
     * indipendentemente dal fatto che sia
     * una violazione critica o un valore
     * soltanto fuori target.
     */
    const remediationIssueYears = [
      liquidityLimitResult
        ?.firstBreachYear,

      liquidityLimitResult
        ?.firstTargetAttentionYear,
    ].filter(
      (year): year is number =>
        year !== null &&
        year !== undefined,
    );

    const remediationYearNumber =
      remediationIssueYears.length > 0
        ? Math.min(
            ...remediationIssueYears,
          )
        : null;

    if (
      liquidityLimitResult &&
      remediationYearNumber !== null
    ) {
      const remediationYear =
        years.find(
          (year) =>
            year.year ===
            remediationYearNumber,
        );

      if (remediationYear) {
        const currentAmount =
          remediationYear.end
            .LIQUIDITY;

        const currentWeight =
          remediationYear.weights
            .LIQUIDITY ?? 0;

        const minimumWeight =
          liquidityLimitResult
            .minimum;

        const targetWeight =
          liquidityLimitResult
            .target;

        const amountToMinimum =
          minimumWeight === null
            ? 0
            : this.roundMoney(
                Math.max(
                  0,
                  (
                    remediationYear
                      .endTotal *
                    minimumWeight /
                    100
                  ) -
                  currentAmount,
                ),
              );

        const amountToTarget =
          targetWeight === null
            ? amountToMinimum
            : this.roundMoney(
                Math.max(
                  0,
                  (
                    remediationYear
                      .endTotal *
                    targetWeight /
                    100
                  ) -
                  currentAmount,
                ),
              );

        const sourceAvailable =
          remediationYear.end
            .INVESTMENTS;

        const requiredAmount =
          amountToTarget > 0
            ? amountToTarget
            : amountToMinimum;

        const recommendedAmount =
          this.roundMoney(
            Math.min(
              requiredAmount,
              sourceAvailable,
            ),
          );

        if (recommendedAmount > 0) {
          remediationPlans.push({
            code:
              'LIQUIDITY_REBALANCING',

            year:
              remediationYear.year,

            source:
              'INVESTMENTS',

            destination:
              'LIQUIDITY',

            timing:
              'END_OF_YEAR',

            currentAmount:
              this.roundMoney(
                currentAmount,
              ),

            currentWeight:
              this.roundPercentage(
                currentWeight,
              ),

            minimumWeight,
            targetWeight,

            amountToMinimum,
            amountToTarget,
            recommendedAmount,

            sourceAvailable:
              this.roundMoney(
                sourceAvailable,
              ),

            fullyFundable:
              sourceAvailable >=
              requiredAmount,

            label:
              'Ribilanciamento IPS liquidità',

            note:
              targetWeight !== null
                ? `Trasferire investimenti verso liquidità per raggiungere il target IPS del ${targetWeight}%.`
                : `Trasferire investimenti verso liquidità per rispettare il minimo IPS del ${minimumWeight}%.`,
          });
        }
      }
    }

    return {
      generatedAt:
        new Date().toISOString(),

      projectionType:
        'FORWARD_ASSET_ALLOCATION',

      baselineImmutable: true,

      methodology: {
        financialOpening:
          'Il capitale iniziale del Budget 27-66 rappresenta il patrimonio finanziario disponibile a inizio 2027.',

        propertyOpening:
          'Sono inclusi gli immobili ancora posseduti a inizio 2027; gli immobili con rogito precedente sono esclusi.',

        propertyPurchases:
          'Gli investimenti immobiliari sono trasferimenti dal patrimonio finanziario agli immobili.',

        propertySales:
          'Le vendite trasformano l’equity immobiliare in liquidità; la differenza rispetto al valore contabile genera plusvalenza o minusvalenza.',

        returns:
          'I rendimenti rappresentano variazioni rispetto ai rendimenti già incorporati nel budget ufficiale.',

        ipsLimits:
          enabledLimits.length === 0
            ? 'Nessuna soglia IPS è attualmente attiva.'
            : 'Le soglie IPS attive saranno applicate alle proiezioni compatibili.',
      },

      source: {
        workbook:
          budget.workbook,

        asOfDate:
          budget.asOfDate,

        startYear,
        endYear,
      },

      scenario: {
        name:
          assumptions.name,

        description:
          assumptions.description,

        assumptions: {
          ...assumptions,

          annualReturnAdjustmentPct:
            globalReturnDeltaPct,

          allocation: {
            returnDeltasPct,
            effectiveReturnsPct,

            positiveCashFlowDestination:
              positiveDestination,

            deficitFundingOrder:
              fundingOrder,

            transfers:
              manualTransfers,
          },
        },
      },

      openingReconciliation: {
        financialCapital:
          financialCapitalStart,

        includedProperties:
          openingProperties.map(
            (property) => ({
              id:
                property.id,

              name:
                property.name,

              netEquity:
                property.netEquity,
            }),
          ),

        excludedProperties:
          excludedOpeningProperties.map(
            (property) => ({
              id:
                property.id,

              name:
                property.name,

              netEquity:
                property.netEquity,

              reason:
                'Rogito precedente all’inizio della proiezione.',
            }),
          ),

        otherAssets:
          wealth.otherAssets,

        totalOpeningNetWorth:
          this.totalBalances(
            initialAllocation,
          ),
      },

      allocation: {
        current:
          currentAllocation,

        currentTotal:
          this.totalBalances(
            currentAllocation,
          ),

        currentWeights:
          this.calculateWeights(
            currentAllocation,
          ),

        initial:
          initialAllocation,

        initialTotal:
          this.totalBalances(
            initialAllocation,
          ),

        initialWeights:
          this.calculateWeights(
            initialAllocation,
          ),

        final:
          finalYear.end,

        finalTotal:
          finalYear.endTotal,

        finalWeights:
          finalYear.weights,
      },

      summary: {
        finalNetWorth:
          finalYear.endTotal,

        minimumLiquidity:
          minimumLiquidityYear
            .end.LIQUIDITY,

        minimumLiquidityYear:
          minimumLiquidityYear.year,

        firstNegativeLiquidityYear:
          years.find(
            (year) =>
              year.end.LIQUIDITY <
              0,
          )?.year ?? null,

        maximumRealEstateWeight:
          maximumRealEstateYear
            .weights.REAL_ESTATE,

        maximumRealEstateWeightYear:
          maximumRealEstateYear.year,

        cumulativeReturnImpact:
          this.roundMoney(
            years.reduce(
              (total, year) =>
                total +
                year
                  .totalReturnImpact,
              0,
            ),
          ),

        cumulativeOperatingCashFlow:
          this.roundMoney(
            years.reduce(
              (total, year) =>
                total +
                year
                  .operatingNetCashFlow,
              0,
            ),
          ),

        cumulativePropertySaleGainLoss:
          this.roundMoney(
            years.reduce(
              (total, year) =>
                total +
                year
                  .propertyMovements
                  .saleGainLoss,
              0,
            ),
          ),
      },

      ipsProjection: {
        configurationStatus,

        status:
          ipsForwardStatus,

        activeLimitCount:
          enabledLimits.length,

        assessedLimitCount,

        unsupportedLimitCount:
          unsupportedLimits.length,

        breachedLimitCount,

        attentionLimitCount,

        projectedBreaches,

        projectedTargetAttentions,

        firstBreachYear:
          firstProjectedBreachYear,

        firstAttentionYear:
          firstProjectedAttentionYear,

        remediationPlans,

        unsupportedLimits,

        limits:
          projectedLimitResults,

        note:
          enabledLimits.length === 0
            ? 'I limiti IPS esistono nel catalogo, ma non hanno ancora soglie attive.'
            : projectedBreaches > 0
              ? 'La proiezione viola una o più soglie IPS critiche.'
              : projectedTargetAttentions >
                    0
                ? 'I limiti critici sono rispettati, ma uno o più target IPS richiedono attenzione.'
                : unsupportedLimits.length >
                      0
                  ? 'Le soglie compatibili risultano rispettate; alcuni limiti attivi non sono ancora proiettabili.'
                  : 'Tutti i limiti e i target IPS attivi risultano rispettati sull’intero orizzonte.',
      },

      years,
    };
  }
}
