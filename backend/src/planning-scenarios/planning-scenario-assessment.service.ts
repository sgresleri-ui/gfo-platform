import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { IpsService } from '../ips/ips.service';
import { PropertiesService } from '../properties/properties.service';
import { RiskService } from '../risk/risk.service';

import {
  PlanningScenariosService,
  type SimulatePlanningScenarioInput,
} from './planning-scenarios.service';

import {
  PlanningAllocationService,
  type PlanningAllocationTransferInput,
  type SimulatePlanningAllocationInput,
} from './planning-allocation.service';

type AssessmentStatus =
  | 'COMPLIANT'
  | 'ATTENTION'
  | 'NON_COMPLIANT';

type CheckStatus =
  | 'PASS'
  | 'WARNING'
  | 'FAIL'
  | 'NOT_APPLICABLE';

type CheckOrigin =
  | 'BASELINE'
  | 'SCENARIO';

type AssessmentCheck = {
  code: string;
  origin: CheckOrigin;
  dimension: string;
  status: CheckStatus;
  title: string;
  description: string;
  actualValue: number | string | null;
  threshold: string | null;
};

type AssessmentAction = {
  code: string;
  priority:
    | 'HIGH'
    | 'MEDIUM'
    | 'LOW';
  title: string;
  rationale: string;
};

type UnknownRecord =
  Record<string, unknown>;

@Injectable()
export class PlanningScenarioAssessmentService {
  constructor(
    private readonly scenarioEngine:
      PlanningScenariosService,

    private readonly ipsService:
      IpsService,

    private readonly riskService:
      RiskService,

    private readonly propertiesService:
      PropertiesService,

    private readonly allocationEngine:
      PlanningAllocationService,
  ) {}

  private isRecord(
    value: unknown,
  ): value is UnknownRecord {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    );
  }

  private readPath(
    value: unknown,
    path: string[],
  ): unknown {
    let current = value;

    for (const key of path) {
      if (!this.isRecord(current)) {
        return undefined;
      }

      current = current[key];
    }

    return current;
  }

  private readNumber(
    value: unknown,
    path: string[],
  ): number | null {
    const raw =
      this.readPath(value, path);

    if (
      raw === null ||
      raw === undefined
    ) {
      return null;
    }

    const parsed = Number(raw);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  private readString(
    value: unknown,
    path: string[],
  ): string | null {
    const raw =
      this.readPath(value, path);

    return typeof raw === 'string'
      ? raw
      : null;
  }

  private readArray(
    value: unknown,
    path: string[],
  ): unknown[] {
    const raw =
      this.readPath(value, path);

    return Array.isArray(raw)
      ? raw
      : [];
  }

  private roundPercentage(
    value: number,
  ): number {
    return (
      Math.round(
        (value + Number.EPSILON) *
          100,
      ) / 100
    );
  }

  private statusFromChecks(
    checks: AssessmentCheck[],
  ): AssessmentStatus {
    if (
      checks.some(
        (check) =>
          check.status === 'FAIL',
      )
    ) {
      return 'NON_COMPLIANT';
    }

    if (
      checks.some(
        (check) =>
          check.status === 'WARNING',
      )
    ) {
      return 'ATTENTION';
    }

    return 'COMPLIANT';
  }

  async assessScenario(
    input:
      | SimulatePlanningScenarioInput
      | undefined,
  ) {
    const scenario =
      await this.scenarioEngine
        .simulateScenario(input);

    const [
      ipsResult,
      riskResult,
      propertiesResult,
    ] = await Promise.allSettled([
      this.ipsService
        .getCompliance(),

      this.riskService
        .getOverview(),

      this.propertiesService
        .getOverview(),
    ]);

    const ips: unknown =
      ipsResult.status === 'fulfilled'
        ? ipsResult.value
        : null;

    const risk: unknown =
      riskResult.status === 'fulfilled'
        ? riskResult.value
        : null;

    const properties: unknown =
      propertiesResult.status ===
      'fulfilled'
        ? propertiesResult.value
        : null;

    const checks:
      AssessmentCheck[] = [];

    const actions =
      new Map<
        string,
        AssessmentAction
      >();

    const addAction = (
      action: AssessmentAction,
    ) => {
      if (!actions.has(action.code)) {
        actions.set(
          action.code,
          action,
        );
      }
    };

    /*
     * BASELINE: CONFORMITÀ IPS
     */

    const ipsAssessments =
      this.readArray(
        ips,
        ['assessments'],
      );

    const ipsBreaches =
      ipsAssessments.filter(
        (assessment) => {
          const status =
            this.readString(
              assessment,
              ['status'],
            ) ??
            this.readString(
              assessment,
              [
                'assessment',
                'status',
              ],
            );

          return (
            status ===
              'BELOW_MINIMUM' ||
            status ===
              'ABOVE_MAXIMUM'
          );
        },
      );

    checks.push({
      code:
        'BASELINE_IPS_COMPLIANCE',

      origin: 'BASELINE',
      dimension: 'IPS',

      status:
        ips === null
          ? 'NOT_APPLICABLE'
          : ipsBreaches.length > 0
            ? 'FAIL'
            : 'PASS',

      title:
        'Conformità IPS corrente',

      description:
        ips === null
          ? 'Valutazione IPS non disponibile.'
          : ipsBreaches.length > 0
            ? `Sono presenti ${ipsBreaches.length} superamenti dei limiti IPS.`
            : 'Non risultano superamenti dei limiti IPS disponibili.',

      actualValue:
        ips === null
          ? null
          : ipsBreaches.length,

      threshold:
        'Nessun superamento',
    });

    if (ipsBreaches.length > 0) {
      addAction({
        code:
          'RESTORE_IPS_COMPLIANCE',

        priority: 'HIGH',

        title:
          'Ripristinare la conformità IPS',

        rationale:
          'Ribilanciare le asset class al di fuori dei limiti minimi e massimi.',
      });
    }

    /*
     * BASELINE: LIQUIDITÀ
     */

    const liquidityWeight =
      this.readNumber(
        risk,
        [
          'ratios',
          'liquidityGrossAssets',
        ],
      );

    const liquidityStatus:
      CheckStatus =
        liquidityWeight === null
          ? 'NOT_APPLICABLE'
          : liquidityWeight < 5
            ? 'FAIL'
            : liquidityWeight < 10
              ? 'WARNING'
              : 'PASS';

    checks.push({
      code:
        'BASELINE_LIQUIDITY',

      origin: 'BASELINE',
      dimension: 'LIQUIDITY',
      status: liquidityStatus,

      title:
        'Riserva di liquidità corrente',

      description:
        liquidityWeight === null
          ? 'Indicatore non disponibile.'
          : 'Peso della liquidità sulle attività lorde correnti.',

      actualValue:
        liquidityWeight,

      threshold:
        'Attenzione sotto il 10%; criticità sotto il 5%',
    });

    if (
      liquidityStatus === 'FAIL' ||
      liquidityStatus === 'WARNING'
    ) {
      addAction({
        code:
          'INCREASE_LIQUIDITY',

        priority:
          liquidityStatus === 'FAIL'
            ? 'HIGH'
            : 'MEDIUM',

        title:
          'Rafforzare la liquidità',

        rationale:
          'Creare una riserva sufficiente per spese straordinarie e impegni immobiliari.',
      });
    }

    /*
     * BASELINE: CONCENTRAZIONE IMMOBILIARE
     */

    const realEstateWeight =
      this.readNumber(
        risk,
        [
          'ratios',
          'realEstateGrossAssets',
        ],
      );

    const realEstateStatus:
      CheckStatus =
        realEstateWeight === null
          ? 'NOT_APPLICABLE'
          : realEstateWeight > 75
            ? 'FAIL'
            : realEstateWeight > 60
              ? 'WARNING'
              : 'PASS';

    checks.push({
      code:
        'BASELINE_REAL_ESTATE',

      origin: 'BASELINE',
      dimension: 'REAL_ESTATE',
      status: realEstateStatus,

      title:
        'Concentrazione immobiliare corrente',

      description:
        realEstateWeight === null
          ? 'Indicatore non disponibile.'
          : 'Peso degli immobili sulle attività lorde correnti.',

      actualValue:
        realEstateWeight,

      threshold:
        'Attenzione sopra il 60%; criticità sopra il 75%',
    });

    if (
      realEstateStatus === 'FAIL' ||
      realEstateStatus === 'WARNING'
    ) {
      addAction({
        code:
          'REDUCE_REAL_ESTATE_WEIGHT',

        priority:
          realEstateStatus === 'FAIL'
            ? 'HIGH'
            : 'MEDIUM',

        title:
          'Contenere la concentrazione immobiliare',

        rationale:
          'Evitare che nuovi acquisti aumentino ulteriormente il peso degli attivi illiquidi.',
      });
    }

    /*
     * BASELINE: LTV
     */

    const weightedLtv =
      this.readNumber(
        properties,
        [
          'summary',
          'weightedLtv',
        ],
      );

    const ltvStatus:
      CheckStatus =
        weightedLtv === null
          ? 'NOT_APPLICABLE'
          : weightedLtv > 40
            ? 'FAIL'
            : weightedLtv > 25
              ? 'WARNING'
              : 'PASS';

    checks.push({
      code:
        'BASELINE_PROPERTY_LTV',

      origin: 'BASELINE',
      dimension: 'REAL_ESTATE',
      status: ltvStatus,

      title:
        'Loan-to-value immobiliare',

      description:
        weightedLtv === null
          ? 'Indicatore non disponibile.'
          : 'Indebitamento immobiliare ponderato corrente.',

      actualValue:
        weightedLtv,

      threshold:
        'Attenzione sopra il 25%; criticità sopra il 40%',
    });

    /*
     * SCENARIO: SOSTENIBILITÀ
     */

    checks.push({
      code:
        'SCENARIO_SUSTAINABILITY',

      origin: 'SCENARIO',
      dimension: 'CAPITAL',

      status:
        scenario.summary.status ===
        'UNSUSTAINABLE'
          ? 'FAIL'
          : scenario.summary.status ===
              'AT_RISK'
            ? 'WARNING'
            : 'PASS',

      title:
        'Sostenibilità patrimoniale',

      description:
        scenario.summary
          .firstNegativeCapitalYear ===
        null
          ? 'Il capitale rimane positivo per tutto il piano.'
          : `Il capitale diventa negativo nel ${scenario.summary.firstNegativeCapitalYear}.`,

      actualValue:
        scenario.summary.status,

      threshold:
        'Capitale positivo fino al 2066',
    });

    if (
      scenario.summary
        .firstNegativeCapitalYear !==
      null
    ) {
      addAction({
        code:
          'RESTORE_SUSTAINABILITY',

        priority: 'HIGH',

        title:
          'Ripristinare la sostenibilità patrimoniale',

        rationale:
          'Ridurre esborsi, rinviare investimenti o aumentare i flussi disponibili.',
      });
    }

    /*
     * SCENARIO: CAPITALE MINIMO
     */

    const minimumCapitalRatio =
      scenario.summary
        .initialCapital > 0
        ? this.roundPercentage(
            (
              scenario.summary
                .minimumCapital /
              scenario.summary
                .initialCapital
            ) * 100,
          )
        : null;

    const minimumCapitalStatus:
      CheckStatus =
        minimumCapitalRatio === null
          ? 'NOT_APPLICABLE'
          : minimumCapitalRatio < 15
            ? 'FAIL'
            : minimumCapitalRatio < 30
              ? 'WARNING'
              : 'PASS';

    checks.push({
      code:
        'SCENARIO_MINIMUM_CAPITAL',

      origin: 'SCENARIO',
      dimension: 'CAPITAL',
      status: minimumCapitalStatus,

      title:
        'Margine patrimoniale minimo',

      description:
        minimumCapitalRatio === null
          ? 'Indicatore non calcolabile.'
          : `Il capitale minimo è pari al ${minimumCapitalRatio}% del capitale iniziale.`,

      actualValue:
        minimumCapitalRatio,

      threshold:
        'Attenzione sotto il 30%; criticità sotto il 15%',
    });

    if (
      minimumCapitalStatus ===
        'FAIL' ||
      minimumCapitalStatus ===
        'WARNING'
    ) {
      addAction({
        code:
          'PROTECT_MINIMUM_CAPITAL',

        priority:
          minimumCapitalStatus ===
          'FAIL'
            ? 'HIGH'
            : 'MEDIUM',

        title:
          'Proteggere il capitale minimo',

        rationale:
          'Ridurre la pressione finanziaria prima dell’anno di minimo patrimoniale.',
      });
    }

    /*
     * SCENARIO: DRAWDOWN
     */

    const drawdown =
      scenario.summary
        .maximumDrawdownPct;

    const drawdownStatus:
      CheckStatus =
        drawdown === null
          ? 'NOT_APPLICABLE'
          : drawdown > 70
            ? 'FAIL'
            : drawdown > 50
              ? 'WARNING'
              : 'PASS';

    checks.push({
      code:
        'SCENARIO_DRAWDOWN',

      origin: 'SCENARIO',
      dimension: 'DRAWDOWN',
      status: drawdownStatus,

      title:
        'Drawdown patrimoniale massimo',

      description:
        'Riduzione massima del capitale rispetto al valore iniziale.',

      actualValue:
        drawdown,

      threshold:
        'Attenzione sopra il 50%; criticità sopra il 70%',
    });

    if (
      drawdownStatus === 'FAIL' ||
      drawdownStatus === 'WARNING'
    ) {
      addAction({
        code:
          'REDUCE_DRAWDOWN',

        priority:
          drawdownStatus === 'FAIL'
            ? 'HIGH'
            : 'MEDIUM',

        title:
          'Ridurre il drawdown previsto',

        rationale:
          'Distribuire gli esborsi nel tempo e mantenere maggiori riserve liquide.',
      });
    }

    /*
     * SCENARIO: IMPATTO FINALE
     */

    const finalDeltaPct =
      scenario.comparison
        .finalCapitalDeltaPct;

    const finalDeltaStatus:
      CheckStatus =
        finalDeltaPct === null
          ? 'NOT_APPLICABLE'
          : finalDeltaPct <= -50
            ? 'FAIL'
            : finalDeltaPct <= -20
              ? 'WARNING'
              : 'PASS';

    checks.push({
      code:
        'SCENARIO_FINAL_CAPITAL',

      origin: 'SCENARIO',
      dimension: 'CAPITAL',
      status: finalDeltaStatus,

      title:
        'Impatto sul capitale finale',

      description:
        'Variazione percentuale rispetto alla baseline ufficiale.',

      actualValue:
        finalDeltaPct,

      threshold:
        'Attenzione da −20%; criticità da −50%',
    });

    /*
     * SCENARIO: PEGGIORE ANNO
     */

    const worstYear =
      scenario.years.reduce(
        (worst, year) =>
          year.scenario
            .netCashFlow <
          worst.scenario.netCashFlow
            ? year
            : worst,
        scenario.years[0],
      );

    const cashFlowPressure =
      scenario.summary
        .initialCapital > 0
        ? this.roundPercentage(
            (
              Math.abs(
                Math.min(
                  0,
                  worstYear.scenario
                    .netCashFlow,
                ),
              ) /
              scenario.summary
                .initialCapital
            ) * 100,
          )
        : null;

    const cashFlowStatus:
      CheckStatus =
        cashFlowPressure === null
          ? 'NOT_APPLICABLE'
          : cashFlowPressure > 25
            ? 'FAIL'
            : cashFlowPressure > 15
              ? 'WARNING'
              : 'PASS';

    checks.push({
      code:
        'SCENARIO_CASH_FLOW_PRESSURE',

      origin: 'SCENARIO',
      dimension: 'CASH_FLOW',
      status: cashFlowStatus,

      title:
        'Pressione finanziaria annuale',

      description:
        `L’anno più oneroso è il ${worstYear.year}, con un saldo di ${worstYear.scenario.netCashFlow}.`,

      actualValue:
        cashFlowPressure,

      threshold:
        'Attenzione sopra il 15%; criticità sopra il 25%',
    });

    if (
      cashFlowStatus === 'FAIL' ||
      cashFlowStatus === 'WARNING'
    ) {
      addAction({
        code:
          'PREFUND_WORST_YEAR',

        priority:
          cashFlowStatus === 'FAIL'
            ? 'HIGH'
            : 'MEDIUM',

        title:
          `Prefinanziare il fabbisogno del ${worstYear.year}`,

        rationale:
          'Accantonare liquidità o strumenti monetari prima dell’anno di maggiore pressione.',
      });
    }

    /*
     * SCENARIO: EVENTI IMMOBILIARI
     */

    const propertyOutflows =
      scenario.scenario
        .assumptions.events
        .filter(
          (event) =>
            (
              event.category ??
              ''
            ).toUpperCase() ===
              'PROPERTY' &&
            event.amount < 0,
        )
        .reduce(
          (total, event) =>
            total +
            Math.abs(event.amount),
          0,
        );

    const propertyPressure =
      propertyOutflows > 0 &&
      scenario.summary
        .initialCapital > 0
        ? this.roundPercentage(
            (
              propertyOutflows /
              scenario.summary
                .initialCapital
            ) * 100,
          )
        : null;

    const propertyStatus:
      CheckStatus =
        propertyPressure === null
          ? 'NOT_APPLICABLE'
          : propertyPressure > 20
            ? 'FAIL'
            : propertyPressure > 10
              ? 'WARNING'
              : 'PASS';

    checks.push({
      code:
        'SCENARIO_PROPERTY_EVENTS',

      origin: 'SCENARIO',
      dimension: 'REAL_ESTATE',
      status: propertyStatus,

      title:
        'Pressione degli eventi immobiliari',

      description:
        propertyPressure === null
          ? 'Nessuna uscita immobiliare aggiuntiva.'
          : 'Peso degli esborsi immobiliari straordinari sul capitale iniziale.',

      actualValue:
        propertyPressure,

      threshold:
        'Attenzione sopra il 10%; criticità sopra il 20%',
    });

    const relevantChecks =
      checks.filter(
        (check) =>
          check.status !==
          'NOT_APPLICABLE',
      );

    const baselineChecks =
      relevantChecks.filter(
        (check) =>
          check.origin ===
          'BASELINE',
      );

    const scenarioChecks =
      relevantChecks.filter(
        (check) =>
          check.origin ===
          'SCENARIO',
      );

    const failureCount =
      relevantChecks.filter(
        (check) =>
          check.status === 'FAIL',
      ).length;

    const warningCount =
      relevantChecks.filter(
        (check) =>
          check.status ===
          'WARNING',
      ).length;

    const passCount =
      relevantChecks.filter(
        (check) =>
          check.status === 'PASS',
      ).length;

    const score = Math.max(
      0,
      Math.min(
        100,
        100 -
          failureCount * 25 -
          warningCount * 8,
      ),
    );

    return {
      generatedAt:
        new Date().toISOString(),

      assessmentVersion: '1.0',

      methodology: {
        allocationProjected: false,

        note:
          'Il motore proietta capitale e flussi. La composizione futura per asset class non è ancora simulata; i controlli IPS strutturali fanno riferimento alla situazione corrente.',
      },

      contextAvailability: {
        ips:
          ipsResult.status ===
          'fulfilled',

        risk:
          riskResult.status ===
          'fulfilled',

        properties:
          propertiesResult.status ===
          'fulfilled',
      },

      scenario,

      assessment: {
        overallStatus:
          this.statusFromChecks(
            relevantChecks,
          ),

        baselineStatus:
          this.statusFromChecks(
            baselineChecks,
          ),

        scenarioStatus:
          this.statusFromChecks(
            scenarioChecks,
          ),

        score,
        passCount,
        warningCount,
        failureCount,

        baselineIssueCount:
          baselineChecks.filter(
            (check) =>
              check.status ===
                'WARNING' ||
              check.status === 'FAIL',
          ).length,

        scenarioIssueCount:
          scenarioChecks.filter(
            (check) =>
              check.status ===
                'WARNING' ||
              check.status === 'FAIL',
          ).length,

        checks,

        actions:
          Array.from(
            actions.values(),
          ),
      },
    };
  }

  async assessAllocationScenario(
    input:
      | SimulatePlanningAllocationInput
      | undefined,
  ) {
    const [
      baseAssessment,
      allocation,
    ] = await Promise.all([
      this.assessScenario(input),

      this.allocationEngine
        .simulateAllocation(input),
    ]);

    const forwardChecks:
      AssessmentCheck[] =
      allocation
        .ipsProjection
        .limits
        .map((limit) => {
          const status:
            CheckStatus =
            limit.status ===
              'NON_COMPLIANT'
              ? 'FAIL'
              : limit.status ===
                  'ATTENTION'
                ? 'WARNING'
                : limit.status ===
                    'COMPLIANT'
                  ? 'PASS'
                  : 'NOT_APPLICABLE';

          const unit =
            limit.unit === 'EUR'
              ? '€'
              : '%';

          const thresholds:
            string[] = [];

          if (
            limit.minimum !== null
          ) {
            thresholds.push(
              `minimo ${limit.minimum}${unit}`,
            );
          }

          if (
            limit.target !== null
          ) {
            thresholds.push(
              `target ${limit.target}${unit}`,
            );
          }

          if (
            limit.maximum !== null
          ) {
            thresholds.push(
              `massimo ${limit.maximum}${unit}`,
            );
          }

          const description =
            status === 'FAIL'
              ? `${limit.breachCount} annualità oltre i limiti critici; prima violazione nel ${limit.firstBreachYear ?? '—'}.`
              : status === 'WARNING'
                ? `${limit.targetAttentionCount} annualità fuori target; prima attenzione nel ${limit.firstTargetAttentionYear ?? '—'}.`
                : status === 'PASS'
                  ? 'Limiti critici e target rispettati sull’intero orizzonte.'
                  : 'Indicatore non valutabile sulla proiezione disponibile.';

          return {
            code:
              `FORWARD_${limit.code}`,

            origin:
              'SCENARIO' as const,

            dimension:
              limit.dimension,

            status,

            title:
              `IPS prospettica · ${limit.label}`,

            description,

            actualValue:
              status ===
                'NOT_APPLICABLE'
                ? null
                : status === 'FAIL'
                  ? `${limit.breachCount} violazioni critiche`
                  : status ===
                      'WARNING'
                    ? `${limit.targetAttentionCount} annualità fuori target`
                    : 'Conforme',

            threshold:
              thresholds.length > 0
                ? thresholds.join(
                    ' · ',
                  )
                : null,
          };
        });

    const checks:
      AssessmentCheck[] = [
        ...baseAssessment
          .assessment
          .checks,

        ...forwardChecks,
      ];

    const relevantChecks =
      checks.filter(
        (check) =>
          check.status !==
          'NOT_APPLICABLE',
      );

    const baselineChecks =
      relevantChecks.filter(
        (check) =>
          check.origin ===
          'BASELINE',
      );

    const scenarioChecks =
      relevantChecks.filter(
        (check) =>
          check.origin ===
          'SCENARIO',
      );

    const failureCount =
      relevantChecks.filter(
        (check) =>
          check.status === 'FAIL',
      ).length;

    const warningCount =
      relevantChecks.filter(
        (check) =>
          check.status ===
          'WARNING',
      ).length;

    const passCount =
      relevantChecks.filter(
        (check) =>
          check.status === 'PASS',
      ).length;

    const actions =
      new Map<
        string,
        AssessmentAction
      >(
        baseAssessment
          .assessment
          .actions
          .map((action) => [
            action.code,
            action,
          ]),
      );

    const remediationPlan =
      allocation
        .ipsProjection
        .remediationPlans[0];

    if (remediationPlan) {
      actions.set(
        'APPLY_FORWARD_IPS_REBALANCING',
        {
          code:
            'APPLY_FORWARD_IPS_REBALANCING',

          priority:
            allocation
              .ipsProjection
              .status ===
              'NON_COMPLIANT'
              ? 'HIGH'
              : 'MEDIUM',

          title:
            `Ribilanciare la liquidità nel ${remediationPlan.year}`,

          rationale:
            `Trasferire ${remediationPlan.recommendedAmount.toLocaleString(
              'it-IT',
              {
                style:
                  'currency',
                currency:
                  'EUR',
              },
            )} da investimenti a liquidità.`,
        },
      );
    }

    const forwardStatusPenalty =
      allocation
        .ipsProjection
        .status ===
        'NON_COMPLIANT'
        ? 15
        : allocation
              .ipsProjection
              .status ===
            'ATTENTION'
          ? 8
          : 0;

    const criticalDurationPenalty =
      Math.min(
        10,
        Math.ceil(
          allocation
            .ipsProjection
            .projectedBreaches /
            3,
        ),
      );

    const targetDurationPenalty =
      Math.min(
        4,
        Math.ceil(
          allocation
            .ipsProjection
            .projectedTargetAttentions /
            5,
        ),
      );

    const firstBreachYear =
      allocation
        .ipsProjection
        .firstBreachYear;

    const urgencyPenalty =
      firstBreachYear === null
        ? 0
        : Math.max(
            1,
            6 -
              Math.floor(
                (
                  firstBreachYear -
                  allocation.source
                    .startYear
                ) / 3,
              ),
          );

    const score =
      Math.max(
        0,
        Math.min(
          100,
          baseAssessment
            .assessment
            .score -
            forwardStatusPenalty -
            criticalDurationPenalty -
            targetDurationPenalty -
            urgencyPenalty,
        ),
      );

    return {
      ...baseAssessment,

      generatedAt:
        new Date().toISOString(),

      assessmentVersion:
        '2.0',

      methodology: {
        allocationProjected:
          true,

        note:
          'La valutazione integra capitale, flussi, asset allocation prospettica, limiti IPS, target e ribilanciamenti correttivi.',
      },

      allocation,

      forwardIpsImpact: {
        status:
          allocation
            .ipsProjection
            .status,

        forwardStatusPenalty,
        criticalDurationPenalty,
        targetDurationPenalty,
        urgencyPenalty,

        projectedBreaches:
          allocation
            .ipsProjection
            .projectedBreaches,

        projectedTargetAttentions:
          allocation
            .ipsProjection
            .projectedTargetAttentions,

        firstBreachYear:
          allocation
            .ipsProjection
            .firstBreachYear,

        firstAttentionYear:
          allocation
            .ipsProjection
            .firstAttentionYear,
      },

      assessment: {
        ...baseAssessment.assessment,

        overallStatus:
          this.statusFromChecks(
            relevantChecks,
          ),

        baselineStatus:
          this.statusFromChecks(
            baselineChecks,
          ),

        scenarioStatus:
          this.statusFromChecks(
            scenarioChecks,
          ),

        score,
        passCount,
        warningCount,
        failureCount,

        baselineIssueCount:
          baselineChecks.filter(
            (check) =>
              check.status ===
                'WARNING' ||
              check.status ===
                'FAIL',
          ).length,

        scenarioIssueCount:
          scenarioChecks.filter(
            (check) =>
              check.status ===
                'WARNING' ||
              check.status ===
                'FAIL',
          ).length,

        checks,

        actions:
          Array.from(
            actions.values(),
          ),
      },
    };
  }


  async buildAutomaticRebalancingPlan(
    input:
      | SimulatePlanningAllocationInput
      | undefined,

    requestedMaxIterations = 40,
  ) {
    type StopReason =
      | 'COMPLIANT'
      | 'NO_REMEDIATION_AVAILABLE'
      | 'NO_PROGRESS'
      | 'MAX_ITERATIONS';

    const parsedMaxIterations =
      Number(
        requestedMaxIterations,
      );

    const maxIterations =
      Number.isFinite(
        parsedMaxIterations,
      )
        ? Math.max(
            1,
            Math.min(
              40,
              Math.trunc(
                parsedMaxIterations,
              ),
            ),
          )
        : 40;

    const baseInput:
      SimulatePlanningAllocationInput =
      input ?? {};

    const baseAllocation =
      baseInput.allocation ??
      {};

    let transfers:
      PlanningAllocationTransferInput[] =
      (
        baseAllocation.transfers ??
        []
      ).map(
        (transfer) => ({
          ...transfer,
        }),
      );

    const buildInput = (
      nextTransfers:
        PlanningAllocationTransferInput[],
    ):
      SimulatePlanningAllocationInput => ({
        ...baseInput,

        allocation: {
          ...baseAllocation,

          transfers:
            nextTransfers,
        },
      });

    let currentAssessment =
      await this
        .assessAllocationScenario(
          buildInput(
            transfers,
          ),
        );

    const initialStatus =
      currentAssessment
        .allocation
        .ipsProjection
        .status;

    const initialBreaches =
      currentAssessment
        .allocation
        .ipsProjection
        .projectedBreaches;

    const initialTargetAttentions =
      currentAssessment
        .allocation
        .ipsProjection
        .projectedTargetAttentions;

    const interventions: Array<{
      iteration: number;
      year: number;
      label: string;

      source:
        string;

      destination:
        string;

      timing:
        string;

      amount: number;
      fullyFundable: boolean;

      statusBefore:
        string;

      statusAfter:
        string;

      breachesBefore: number;
      breachesAfter: number;

      targetAttentionsBefore:
        number;

      targetAttentionsAfter:
        number;
    }> = [];

    let totalTransferred = 0;

    let stopReason:
      StopReason | null =
      null;

    for (
      let iteration = 1;
      iteration <=
        maxIterations;
      iteration += 1
    ) {
      const projection =
        currentAssessment
          .allocation
          .ipsProjection;

      if (
        projection.status ===
        'COMPLIANT'
      ) {
        stopReason =
          'COMPLIANT';

        break;
      }

      const plan =
        projection
          .remediationPlans[0];

      if (
        !plan ||
        !Number.isFinite(
          plan.recommendedAmount,
        ) ||
        plan.recommendedAmount <= 0
      ) {
        stopReason =
          'NO_REMEDIATION_AVAILABLE';

        break;
      }

      const transfer:
        PlanningAllocationTransferInput =
        {
          year:
            plan.year,

          label:
            `${plan.label} ${plan.year}`,

          from:
            plan.source,

          to:
            plan.destination,

          amount:
            plan.recommendedAmount,

          timing:
            plan.timing,
        };

      const existingTransfer =
        transfers.find(
          (item) =>
            item.year ===
              transfer.year &&
            item.from ===
              transfer.from &&
            item.to ===
              transfer.to &&
            (
              item.timing ??
              'BEFORE_OPERATING_CASH_FLOW'
            ) ===
              transfer.timing,
        );

      if (
        existingTransfer &&
        Math.abs(
          existingTransfer.amount -
            transfer.amount,
        ) < 0.01
      ) {
        stopReason =
          'NO_PROGRESS';

        break;
      }

      const nextTransfers = [
        ...transfers.filter(
          (item) =>
            !(
              item.year ===
                transfer.year &&
              item.from ===
                transfer.from &&
              item.to ===
                transfer.to &&
              (
                item.timing ??
                'BEFORE_OPERATING_CASH_FLOW'
              ) ===
                transfer.timing
            ),
        ),

        transfer,
      ].sort(
        (first, second) =>
          first.year -
          second.year,
      );

      const statusBefore =
        projection.status;

      const breachesBefore =
        projection
          .projectedBreaches;

      const targetAttentionsBefore =
        projection
          .projectedTargetAttentions;

      const nextAssessment =
        await this
          .assessAllocationScenario(
            buildInput(
              nextTransfers,
            ),
          );

      const nextProjection =
        nextAssessment
          .allocation
          .ipsProjection;

      const improved =
        nextProjection
          .projectedBreaches <
          breachesBefore ||
        (
          nextProjection
            .projectedBreaches ===
            breachesBefore &&
          nextProjection
            .projectedTargetAttentions <
            targetAttentionsBefore
        ) ||
        nextProjection.status !==
          statusBefore;

      interventions.push({
        iteration,

        year:
          plan.year,

        label:
          transfer.label ??
          plan.label,

        source:
          transfer.from,

        destination:
          transfer.to,

        timing:
          transfer.timing ??
          'END_OF_YEAR',

        amount:
          transfer.amount,

        fullyFundable:
          plan.fullyFundable,

        statusBefore,

        statusAfter:
          nextProjection.status,

        breachesBefore,

        breachesAfter:
          nextProjection
            .projectedBreaches,

        targetAttentionsBefore,

        targetAttentionsAfter:
          nextProjection
            .projectedTargetAttentions,
      });

      totalTransferred =
        Math.round(
          (
            totalTransferred +
            transfer.amount +
            Number.EPSILON
          ) * 100,
        ) / 100;

      transfers =
        nextTransfers;

      currentAssessment =
        nextAssessment;

      if (!improved) {
        stopReason =
          'NO_PROGRESS';

        break;
      }
    }

    if (stopReason === null) {
      stopReason =
        currentAssessment
          .allocation
          .ipsProjection
          .status ===
          'COMPLIANT'
            ? 'COMPLIANT'
            : 'MAX_ITERATIONS';
    }

    const finalProjection =
      currentAssessment
        .allocation
        .ipsProjection;

    return {
      generatedAt:
        new Date().toISOString(),

      planType:
        'AUTOMATIC_IPS_REBALANCING',

      maxIterations,

      iterations:
        interventions.length,

      stopReason,

      fullyResolved:
        finalProjection.status ===
        'COMPLIANT',

      initialStatus,

      finalStatus:
        finalProjection.status,

      initialBreaches,

      finalBreaches:
        finalProjection
          .projectedBreaches,

      initialTargetAttentions,

      finalTargetAttentions:
        finalProjection
          .projectedTargetAttentions,

      totalTransferred,

      interventions,

      finalTransfers:
        transfers,

      finalAssessment:
        currentAssessment,
    };
  }


  async compareOptimizedRebalancingStrategies(
    input:
      | SimulatePlanningAllocationInput
      | undefined,
  ) {
    type StrategyCode =
      | 'MINIMUM_COMPLIANCE'
      | 'TARGET_OPTIMIZED'
      | 'ECONOMIC_BALANCED';

    type StrategyIntervention = {
      iteration: number;
      year: number;

      source:
        | 'LIQUIDITY'
        | 'INVESTMENTS';

      destination:
        | 'LIQUIDITY'
        | 'INVESTMENTS';

      amount: number;

      desiredWeight: number;
      weightBefore: number;
      weightAfter: number;

      fullyFundable: boolean;

      interventionType:
        | 'MINIMUM_PROTECTION'
        | 'PREFUNDING'
        | 'SAFE_SWEEP'
        | 'ECONOMIC_SWEEP';
    };

    const upperTrigger =
      12.5;

    const minimumTrade =
      25000;

    const roundMoney = (
      value: number,
    ): number =>
      Math.round(
        (
          value +
          Number.EPSILON
        ) * 100,
      ) / 100;

    const roundPercentage = (
      value: number,
    ): number =>
      Math.round(
        (
          value +
          Number.EPSILON
        ) * 10000,
      ) / 10000;

    const baseInput:
      SimulatePlanningAllocationInput =
      input ?? {};

    const baseAllocation =
      baseInput.allocation ??
      {};

    /*
     * Rimuove solamente le correzioni
     * IPS generate dai precedenti piani.
     * Conserva gli altri trasferimenti
     * manuali inseriti dall'utente.
     */
    const baseTransfers =
      (
        baseAllocation.transfers ??
        []
      ).filter(
        (transfer) => {
          const label =
            String(
              transfer.label ??
              '',
            )
              .trim()
              .toLowerCase();

          return (
            !label.startsWith(
              'ribilanciamento ips',
            ) &&
            !label.startsWith(
              'piano ips',
            ) &&
            !label.startsWith(
              'reinvestimento ips',
            )
          );
        },
      );

    const buildInput = (
      transfers:
        PlanningAllocationTransferInput[],
    ):
      SimulatePlanningAllocationInput => ({
        ...baseInput,

        allocation: {
          ...baseAllocation,

          transfers,
        },
      });

    const initialAllocation =
      await this.allocationEngine
        .simulateAllocation(
          buildInput(
            baseTransfers,
          ),
        );

    const liquidityLimit =
      initialAllocation
        .ipsProjection
        .limits
        .find(
          (limit) =>
            limit.code ===
            'LIQUIDITY_GROSS_ASSETS',
        );

    if (
      !liquidityLimit ||
      liquidityLimit.minimum ===
        null ||
      liquidityLimit.target ===
        null
    ) {
      throw new BadRequestException(
        'Le soglie IPS di liquidità minima e target devono essere configurate.',
      );
    }

    const minimumWeight =
      liquidityLimit.minimum;

    const targetWeight =
      liquidityLimit.target;

    const targetAmount = (
      year: {
        endTotal: number;
      },
    ): number =>
      roundMoney(
        year.endTotal *
        targetWeight /
        100,
      );

    const addTransfer = (
      transfers:
        PlanningAllocationTransferInput[],

      transfer:
        PlanningAllocationTransferInput,
    ):
      PlanningAllocationTransferInput[] =>
      [
        ...transfers,
        transfer,
      ].sort(
        (first, second) =>
          first.year -
          second.year,
      );

    const finalizeStrategy =
      async (
        strategy:
          StrategyCode,

        label: string,

        description: string,

        transfers:
          PlanningAllocationTransferInput[],

        interventions:
          StrategyIntervention[],
      ) => {
        const finalAssessment =
          await this
            .assessAllocationScenario(
              buildInput(
                transfers,
              ),
            );

        const finalAllocation =
          finalAssessment
            .allocation;

        const finalProjection =
          finalAllocation
            .ipsProjection;

        const totalToLiquidity =
          roundMoney(
            interventions
              .filter(
                (item) =>
                  item.destination ===
                  'LIQUIDITY',
              )
              .reduce(
                (total, item) =>
                  total +
                  item.amount,
                0,
              ),
          );

        const totalToInvestments =
          roundMoney(
            interventions
              .filter(
                (item) =>
                  item.destination ===
                  'INVESTMENTS',
              )
              .reduce(
                (total, item) =>
                  total +
                  item.amount,
                0,
              ),
          );

        const liquidityWeights =
          finalAllocation
            .years
            .map(
              (year) =>
                year.weights
                  .LIQUIDITY ??
                0,
            );

        const averageTargetDeviation =
          liquidityWeights.length ===
          0
            ? 0
            : roundPercentage(
                liquidityWeights.reduce(
                  (total, weight) =>
                    total +
                    Math.abs(
                      weight -
                      targetWeight,
                    ),
                  0,
                ) /
                liquidityWeights.length,
              );

        return {
          strategy,
          label,
          description,

          minimumWeight,
          targetWeight,

          operationalPolicy: {
            upperTrigger:
              strategy ===
              'MINIMUM_COMPLIANCE'
                ? null
                : upperTrigger,

            minimumTrade:
              strategy ===
              'MINIMUM_COMPLIANCE'
                ? null
                : minimumTrade,
          },

          interventions:
            interventions.length,

          grossTransferred:
            roundMoney(
              totalToLiquidity +
              totalToInvestments,
            ),

          totalToLiquidity,
          totalToInvestments,

          netToLiquidity:
            roundMoney(
              totalToLiquidity -
              totalToInvestments,
            ),

          fullyFunded:
            interventions.every(
              (item) =>
                item.fullyFundable,
            ),

          finalStatus:
            finalProjection.status,

          criticalCompliant:
            finalProjection
              .projectedBreaches ===
            0,

          targetCompliant:
            finalProjection
              .projectedTargetAttentions ===
            0,

          finalBreaches:
            finalProjection
              .projectedBreaches,

          finalTargetAttentions:
            finalProjection
              .projectedTargetAttentions,

          finalLiquidity:
            finalAllocation
              .allocation
              .final
              .LIQUIDITY,

          finalInvestments:
            finalAllocation
              .allocation
              .final
              .INVESTMENTS,

          finalLiquidityWeight:
            finalAllocation
              .allocation
              .finalWeights
              .LIQUIDITY,

          finalInvestmentsWeight:
            finalAllocation
              .allocation
              .finalWeights
              .INVESTMENTS,

          finalNetWorth:
            finalAllocation
              .summary
              .finalNetWorth,

          minimumLiquidity:
            finalAllocation
              .summary
              .minimumLiquidity,

          minimumLiquidityYear:
            finalAllocation
              .summary
              .minimumLiquidityYear,

          averageTargetDeviation,

          interventionDetails:
            interventions,

          finalTransfers:
            transfers,

          finalAssessment,
        };
      };

    /*
     * STRATEGIA 1
     * Protezione minima:
     * interviene soltanto quando il peso
     * scende sotto il minimo critico.
     */
    let minimumTransfers = [
      ...baseTransfers,
    ];

    let minimumAllocation =
      initialAllocation;

    const minimumInterventions:
      StrategyIntervention[] = [];

    const yearNumbers =
      initialAllocation
        .years
        .map(
          (year) =>
            year.year,
        );

    for (
      const yearNumber of
      yearNumbers
    ) {
      const year =
        minimumAllocation
          .years
          .find(
            (item) =>
              item.year ===
              yearNumber,
          );

      if (!year) {
        continue;
      }

      const currentWeight =
        year.weights
          .LIQUIDITY ??
        0;

      if (
        currentWeight >=
        minimumWeight
      ) {
        continue;
      }

      const desiredAmount =
        roundMoney(
          year.endTotal *
          minimumWeight /
          100,
        );

      const requiredAmount =
        roundMoney(
          Math.max(
            0,
            desiredAmount -
            year.end.LIQUIDITY,
          ),
        );

      const available =
        Math.max(
          0,
          year.end
            .INVESTMENTS,
        );

      const amount =
        roundMoney(
          Math.min(
            requiredAmount,
            available,
          ),
        );

      if (amount <= 0) {
        continue;
      }

      const fullyFundable =
        available + 0.01 >=
        requiredAmount;

      const transfer:
        PlanningAllocationTransferInput =
        {
          year:
            year.year,

          label:
            `Piano IPS minimo ${year.year}`,

          from:
            'INVESTMENTS',

          to:
            'LIQUIDITY',

          amount,

          timing:
            'END_OF_YEAR',
        };

      const nextTransfers =
        addTransfer(
          minimumTransfers,
          transfer,
        );

      const nextAllocation =
        await this
          .allocationEngine
          .simulateAllocation(
            buildInput(
              nextTransfers,
            ),
          );

      const nextYear =
        nextAllocation
          .years
          .find(
            (item) =>
              item.year ===
              year.year,
          );

      minimumInterventions.push({
        iteration:
          minimumInterventions
            .length + 1,

        year:
          year.year,

        source:
          'INVESTMENTS',

        destination:
          'LIQUIDITY',

        amount,

        desiredWeight:
          roundPercentage(
            minimumWeight,
          ),

        weightBefore:
          roundPercentage(
            currentWeight,
          ),

        weightAfter:
          roundPercentage(
            nextYear?.weights
              .LIQUIDITY ??
            currentWeight,
          ),

        fullyFundable,

        interventionType:
          'MINIMUM_PROTECTION',
      });

      minimumTransfers =
        nextTransfers;

      minimumAllocation =
        nextAllocation;
    }

    const minimumCompliance =
      await finalizeStrategy(
        'MINIMUM_COMPLIANCE',

        'Protezione minima',

        `Interviene soltanto quando la liquidità scende sotto il minimo critico del ${minimumWeight}%.`,

        minimumTransfers,
        minimumInterventions,
      );

    /*
     * STRATEGIA 2
     * Target consolidato:
     * prefinanzia i periodi di carenza
     * e reinveste solamente l'eccedenza
     * che resta sicura in tutti gli anni
     * successivi.
     */
    let targetTransfers = [
      ...baseTransfers,
    ];

    let targetAllocation =
      initialAllocation;

    const targetInterventions:
      StrategyIntervention[] = [];

    for (
      let iteration = 0;
      iteration <
        initialAllocation
          .years.length;
      iteration += 1
    ) {
      const deficientYears =
        targetAllocation
          .years
          .filter(
            (year) =>
              (
                year.weights
                  .LIQUIDITY ??
                0
              ) <
              targetWeight,
          );

      if (
        deficientYears.length ===
        0
      ) {
        break;
      }

      const firstDeficientYear =
        deficientYears[0];

      const futureDeficits =
        targetAllocation
          .years
          .filter(
            (year) =>
              year.year >=
              firstDeficientYear
                .year,
          )
          .map(
            (year) =>
              roundMoney(
                targetAmount(
                  year,
                ) -
                year.end
                  .LIQUIDITY,
              ),
          );

      const requiredAmount =
        roundMoney(
          Math.max(
            0,
            ...futureDeficits,
          ),
        );

      const available =
        Math.max(
          0,
          firstDeficientYear
            .end
            .INVESTMENTS,
        );

      const amount =
        roundMoney(
          Math.min(
            requiredAmount,
            available,
          ),
        );

      if (amount <= 0) {
        break;
      }

      const fullyFundable =
        available + 0.01 >=
        requiredAmount;

      const currentWeight =
        firstDeficientYear
          .weights
          .LIQUIDITY ??
        0;

      const transfer:
        PlanningAllocationTransferInput =
        {
          year:
            firstDeficientYear
              .year,

          label:
            `Piano IPS consolidato ${firstDeficientYear.year}`,

          from:
            'INVESTMENTS',

          to:
            'LIQUIDITY',

          amount,

          timing:
            'END_OF_YEAR',
        };

      const nextTransfers =
        addTransfer(
          targetTransfers,
          transfer,
        );

      const nextAllocation =
        await this
          .allocationEngine
          .simulateAllocation(
            buildInput(
              nextTransfers,
            ),
          );

      const nextYear =
        nextAllocation
          .years
          .find(
            (year) =>
              year.year ===
              firstDeficientYear
                .year,
          );

      targetInterventions.push({
        iteration:
          targetInterventions
            .length + 1,

        year:
          firstDeficientYear
            .year,

        source:
          'INVESTMENTS',

        destination:
          'LIQUIDITY',

        amount,

        desiredWeight:
          roundPercentage(
            targetWeight,
          ),

        weightBefore:
          roundPercentage(
            currentWeight,
          ),

        weightAfter:
          roundPercentage(
            nextYear?.weights
              .LIQUIDITY ??
            currentWeight,
          ),

        fullyFundable,

        interventionType:
          'PREFUNDING',
      });

      targetTransfers =
        nextTransfers;

      targetAllocation =
        nextAllocation;

      if (!fullyFundable) {
        break;
      }
    }

    for (
      const yearNumber of
      yearNumbers
    ) {
      const year =
        targetAllocation
          .years
          .find(
            (item) =>
              item.year ===
              yearNumber,
          );

      if (!year) {
        continue;
      }

      const currentWeight =
        year.weights
          .LIQUIDITY ??
        0;

      if (
        currentWeight <=
        upperTrigger
      ) {
        continue;
      }

      const futureYears =
        targetAllocation
          .years
          .filter(
            (item) =>
              item.year >=
              yearNumber,
          );

      const futureSurpluses =
        futureYears.map(
          (item) =>
            roundMoney(
              item.end
                .LIQUIDITY -
              targetAmount(
                item,
              ),
            ),
        );

      const safeRemovable =
        roundMoney(
          Math.max(
            0,
            Math.min(
              ...futureSurpluses,
            ),
          ),
        );

      const currentExcess =
        roundMoney(
          Math.max(
            0,
            year.end
              .LIQUIDITY -
            targetAmount(
              year,
            ),
          ),
        );

      const requiredAmount =
        roundMoney(
          Math.min(
            safeRemovable,
            currentExcess,
          ),
        );

      if (
        requiredAmount <
        minimumTrade
      ) {
        continue;
      }

      const available =
        Math.max(
          0,
          year.end
            .LIQUIDITY,
        );

      const amount =
        roundMoney(
          Math.min(
            requiredAmount,
            available,
          ),
        );

      if (amount <= 0) {
        continue;
      }

      const fullyFundable =
        available + 0.01 >=
        requiredAmount;

      const transfer:
        PlanningAllocationTransferInput =
        {
          year:
            year.year,

          label:
            `Reinvestimento IPS sicuro ${year.year}`,

          from:
            'LIQUIDITY',

          to:
            'INVESTMENTS',

          amount,

          timing:
            'END_OF_YEAR',
        };

      const nextTransfers =
        addTransfer(
          targetTransfers,
          transfer,
        );

      const nextAllocation =
        await this
          .allocationEngine
          .simulateAllocation(
            buildInput(
              nextTransfers,
            ),
          );

      const nextYear =
        nextAllocation
          .years
          .find(
            (item) =>
              item.year ===
              year.year,
          );

      targetInterventions.push({
        iteration:
          targetInterventions
            .length + 1,

        year:
          year.year,

        source:
          'LIQUIDITY',

        destination:
          'INVESTMENTS',

        amount,

        desiredWeight:
          roundPercentage(
            targetWeight,
          ),

        weightBefore:
          roundPercentage(
            currentWeight,
          ),

        weightAfter:
          roundPercentage(
            nextYear?.weights
              .LIQUIDITY ??
            currentWeight,
          ),

        fullyFundable,

        interventionType:
          'SAFE_SWEEP',
      });

      targetTransfers =
        nextTransfers;

      targetAllocation =
        nextAllocation;
    }

    const targetOptimized =
      await finalizeStrategy(
        'TARGET_OPTIMIZED',

        'Target consolidato',

        `Prefinanzia i periodi di carenza e reinveste soltanto l’eccedenza sicura oltre il ${upperTrigger}%, con operazione minima di ${minimumTrade.toLocaleString(
          'it-IT',
          {
            style:
              'currency',
            currency:
              'EUR',
            maximumFractionDigits:
              0,
          },
        )}.`,

        targetTransfers,
        targetInterventions,
      );


    /*
     * STRATEGIA 3
     * Bilanciata economica:
     * parte dalla protezione minima e
     * reinveste l'eccedenza oltre il
     * 12,5%, garantendo in prospettiva
     * il mantenimento del minimo IPS.
     */
    let economicTransfers = [
      ...minimumTransfers,
    ];

    let economicAllocation =
      minimumAllocation;

    const economicInterventions:
      StrategyIntervention[] =
      minimumInterventions.map(
        (intervention) => ({
          ...intervention,
        }),
      );

    const rebalancingCostRatePct =
      Number(
        baseAllocation
          .rebalancingCostRatePct ??
        0,
      );

    const rebalancingMinimumCost =
      Number(
        baseAllocation
          .rebalancingMinimumCost ??
        0,
      );

    const estimateTransferCost = (
      amount: number,
    ): number =>
      roundMoney(
        Math.max(
          amount *
            rebalancingCostRatePct /
            100,

          rebalancingMinimumCost,
        ),
      );

    for (
      const yearNumber of
      yearNumbers
    ) {
      const year =
        economicAllocation
          .years
          .find(
            (item) =>
              item.year ===
              yearNumber,
          );

      if (!year) {
        continue;
      }

      const currentWeight =
        year.weights
          .LIQUIDITY ??
        0;

      if (
        currentWeight <=
        upperTrigger
      ) {
        continue;
      }

      const futureYears =
        economicAllocation
          .years
          .filter(
            (item) =>
              item.year >=
              yearNumber,
          );

      /*
       * Liquidità eliminabile senza
       * scendere sotto il minimo IPS
       * in nessun anno futuro.
       */
      const futureMinimumSurpluses =
        futureYears.map(
          (item) =>
            roundMoney(
              item.end.LIQUIDITY -
              (
                item.endTotal *
                minimumWeight /
                100
              ),
            ),
        );

      const safeRemovable =
        roundMoney(
          Math.max(
            0,
            Math.min(
              ...futureMinimumSurpluses,
            ),
          ),
        );

      /*
       * Quando la soglia superiore
       * viene superata, il rientro
       * desiderato è verso il target
       * IPS del 10%, non verso il 5%.
       */
      const currentExcessToTarget =
        roundMoney(
          Math.max(
            0,
            year.end.LIQUIDITY -
            targetAmount(
              year,
            ),
          ),
        );

      const totalDebitCapacity =
        roundMoney(
          Math.min(
            safeRemovable,
            currentExcessToTarget,
          ),
        );

      if (
        totalDebitCapacity <= 0
      ) {
        continue;
      }

      /*
       * Il costo viene addebitato alla
       * liquidità oltre all'importo
       * reinvestito. L'iterazione evita
       * di superare la capacità sicura.
       */
      let amount =
        totalDebitCapacity;

      for (
        let adjustment = 0;
        adjustment < 6;
        adjustment += 1
      ) {
        const estimatedCost =
          estimateTransferCost(
            amount,
          );

        amount =
          roundMoney(
            Math.max(
              0,

              Math.min(
                currentExcessToTarget,

                totalDebitCapacity -
                estimatedCost,
              ),
            ),
          );
      }

      if (
        amount <
        minimumTrade
      ) {
        continue;
      }

      const transferCost =
        estimateTransferCost(
          amount,
        );

      const fullyFundable =
        year.end.LIQUIDITY +
          0.01 >=
        amount +
          transferCost;

      if (!fullyFundable) {
        continue;
      }

      const transfer:
        PlanningAllocationTransferInput =
        {
          year:
            year.year,

          label:
            `Piano IPS economico ${year.year}`,

          from:
            'LIQUIDITY',

          to:
            'INVESTMENTS',

          amount,

          timing:
            'END_OF_YEAR',
        };

      const nextTransfers =
        addTransfer(
          economicTransfers,
          transfer,
        );

      const nextAllocation =
        await this
          .allocationEngine
          .simulateAllocation(
            buildInput(
              nextTransfers,
            ),
          );

      const nextYear =
        nextAllocation
          .years
          .find(
            (item) =>
              item.year ===
              year.year,
          );

      economicInterventions.push({
        iteration:
          economicInterventions
            .length + 1,

        year:
          year.year,

        source:
          'LIQUIDITY',

        destination:
          'INVESTMENTS',

        amount,

        desiredWeight:
          roundPercentage(
            targetWeight,
          ),

        weightBefore:
          roundPercentage(
            currentWeight,
          ),

        weightAfter:
          roundPercentage(
            nextYear?.weights
              .LIQUIDITY ??
            currentWeight,
          ),

        fullyFundable,

        interventionType:
          'ECONOMIC_SWEEP',
      });

      economicTransfers =
        nextTransfers;

      economicAllocation =
        nextAllocation;
    }

    const economicBalanced =
      await finalizeStrategy(
        'ECONOMIC_BALANCED',

        'Bilanciata economica',

        `Protegge il minimo IPS del ${minimumWeight}% e reinveste l’eccedenza oltre il ${upperTrigger}% soltanto quando non serve negli anni successivi.`,

        economicTransfers,
        economicInterventions,
      );

    const eligibleStrategies = [
      minimumCompliance,
      targetOptimized,
      economicBalanced,
    ].filter(
      (strategy) =>
        strategy.criticalCompliant,
    );

    const recommendedStrategyResult =
      eligibleStrategies.length > 0
        ? eligibleStrategies.reduce(
            (best, current) =>
              current.finalNetWorth >
              best.finalNetWorth
                ? current
                : best,
          )
        : targetOptimized;

    const recommendationRationale =
      recommendedStrategyResult
        .strategy ===
      'ECONOMIC_BALANCED'
        ? 'La strategia bilanciata economica produce il patrimonio finale netto più elevato tra le alternative senza violazioni critiche.'
        : recommendedStrategyResult
              .strategy ===
            'MINIMUM_COMPLIANCE'
          ? 'La protezione minima produce il patrimonio finale netto più elevato tra le alternative senza violazioni critiche.'
          : 'Il target consolidato offre il miglior risultato economico tra le alternative senza violazioni critiche.';

    return {
      generatedAt:
        new Date().toISOString(),

      comparisonType:
        'OPTIMIZED_IPS_REBALANCING',

      liquidityPolicy: {
        minimumWeight,
        targetWeight,
        upperTrigger,
        minimumTrade,
      },

      baseline: {
        status:
          initialAllocation
            .ipsProjection
            .status,

        breaches:
          initialAllocation
            .ipsProjection
            .projectedBreaches,

        targetAttentions:
          initialAllocation
            .ipsProjection
            .projectedTargetAttentions,

        finalLiquidityWeight:
          initialAllocation
            .allocation
            .finalWeights
            .LIQUIDITY,

        finalNetWorth:
          initialAllocation
            .summary
            .finalNetWorth,
      },

      minimumCompliance,
      targetOptimized,
      economicBalanced,

      recommendedStrategy:
        recommendedStrategyResult
          .strategy,

      rationale:
        recommendationRationale,
    };
  }

}
