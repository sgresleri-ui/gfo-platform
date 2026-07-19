import { Injectable } from '@nestjs/common';

import { IpsService } from '../ips/ips.service';
import { PropertiesService } from '../properties/properties.service';
import { RiskService } from '../risk/risk.service';

import {
  PlanningScenariosService,
  type SimulatePlanningScenarioInput,
} from './planning-scenarios.service';

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
}
