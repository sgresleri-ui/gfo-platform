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

          for (
            const transfer
            of manualYearTransfers
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
        configurationStatus:
          enabledLimits.length === 0
            ? 'NOT_CONFIGURED'
            : 'CONFIGURED',

        activeLimitCount:
          enabledLimits.length,

        projectedBreaches: 0,

        note:
          enabledLimits.length === 0
            ? 'I limiti IPS esistono nel catalogo, ma non hanno ancora soglie attive.'
            : 'La valutazione prospettica delle soglie attive sarà completata nella fase successiva.',
      },

      years,
    };
  }
}
