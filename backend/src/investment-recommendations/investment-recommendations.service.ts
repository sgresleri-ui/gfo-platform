import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { CapitalAllocationService } from '../capital-allocation/capital-allocation.service';
import { InvestmentsService } from '../investments/investments.service';
import { IpsClassificationService } from '../ips/ips-classification.service';
import { PrismaService } from '../prisma/prisma.service';

const ENGINE_VERSION = '1.0.0';
const EL_TORO_PROPERTY_CODE = 'PROPERTY_EL_TORO';
const MARKET_CONTEXT_MAX_AGE_DAYS = 45;

const MARKET_CONTEXT = {
  asOfDate: '2026-07-28T00:00:00.000Z',
  regime: 'ELEVATED_UNCERTAINTY',
  entryStance: 'NEUTRAL_CAUTIOUS',
  summary:
    'Crescita globale ancora positiva ma disomogenea, tassi reali rilevanti e concentrazione azionaria elevata. Il contesto modifica la velocità di ingresso, non i limiti strategici IPS.',
  observations: [
    'La BCE ha mantenuto invariati i tassi il 23 luglio 2026; il tasso sui depositi è al 2,25%.',
    'Il target Fed disponibile alla data del contesto è 3,50%-3,75%; la riunione del 28-29 luglio è ancora in corso.',
    'Il World Economic Outlook di luglio 2026 stima crescita globale al 3,0% nel 2026 e al 3,4% nel 2027, con rischi disomogenei.',
    'La concentrazione nei titoli tecnologici e il rischio geopolitico suggeriscono disciplina nelle tranche, non market timing discrezionale.',
  ],
  sources: [
    {
      publisher: 'Banca Centrale Europea',
      title: 'Monetary policy decisions',
      sourceDate: '2026-07-23',
      url: 'https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.mp260723~29f24d99bc.en.html',
    },
    {
      publisher: 'Federal Reserve',
      title: 'Federal Reserve issues FOMC statement',
      sourceDate: '2026-06-17',
      url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260617a.htm',
    },
    {
      publisher: 'Fondo Monetario Internazionale',
      title: 'World Economic Outlook Update, July 2026',
      sourceDate: '2026-07-08',
      url: 'https://www.imf.org/en/publications/weo/issues/2026/07/08/world-economic-outlook-update-july-2026',
    },
    {
      publisher: 'Reuters',
      title: 'Global markets update',
      sourceDate: '2026-07-28',
      url: 'https://www.reuters.com/world/china/global-markets-global-markets-2026-07-28/',
    },
    {
      publisher: 'Vanguard',
      title: 'Cost averaging: Invest now or temporarily hold your cash?',
      sourceDate: '2023-07-01',
      url: 'https://corporate.vanguard.com/content/dam/corp/research/pdf/cost_averaging_invest_now_or_temporarily_hold_your_cash.pdf',
    },
  ],
};

type RecommendationStatus =
  | 'BLOCKED_CAPITAL_PLAN'
  | 'NEEDS_DATA'
  | 'NEEDS_MARKET_UPDATE'
  | 'NEEDS_VALIDATION'
  | 'READY_FOR_APPROVAL';

type IpsOverview = Awaited<ReturnType<IpsClassificationService['getOverview']>>;

type CapitalPlan = Awaited<
  ReturnType<CapitalAllocationService['getElToroPlan']>
>;

type Portfolio = Awaited<ReturnType<InvestmentsService['getPortfolio']>>;

type RecommendationInputs = {
  capitalPlan: CapitalPlan;
  ipsOverview: IpsOverview;
  portfolio: Portfolio;
};

type AllocationRow = {
  code: string;
  label: string;
  targetWeight: number;
  currentValue: number;
  currentWeight: number | null;
  gapToTargetBeforeNewCapital: number | null;
  newCapitalAmount: number;
  newCapitalWeight: number;
  projectedValue: number;
  projectedWeight: number | null;
  action: 'INCREASE' | 'HOLD';
};

type InstrumentDefinition = {
  assetClass: string;
  ticker: string;
  name: string;
  isin: string;
  domicile: string;
  structure: string;
  incomeTreatment: string;
  replication: string;
  tradingCurrency: string;
  role: string;
  sourceUrl: string;
  overlapTokens: string[];
};

type RecommendationInstrument = Omit<InstrumentDefinition, 'overlapTokens'> & {
  proposedAmount: number;
  proposedWeight: number;
  overlap: {
    exactHolding: boolean;
    methodology: 'NAME_AND_ISIN_SCREENING';
    potentialOverlapValue: number;
    positions: Array<{
      code: string;
      name: string;
      marketValue: number;
    }>;
  };
};

type RecommendationTranche = {
  number: number;
  percentage: number;
  timing: string;
  trigger: string;
  amount: number;
  orders: Array<{
    assetClass: string;
    label: string;
    amount: number;
  }>;
};

type CurrentSnapshotData = {
  capitalPlan: {
    investibleCapital: number;
    source: string;
    allocationStatus: string;
    operationalStatus: string;
    fiscalStatus: string;
  };
  dataQuality: {
    positionCount: number;
    classifiedPositions: number;
    unclassifiedPositions: number;
    coveragePercentage: number;
    complianceAvailable: boolean;
  };
  allocation: IpsOverview['allocation'];
};

type ProposedSnapshotData = {
  method: 'GAP_TO_IPS_TARGET' | 'IPS_TARGET_REFERENCE';
  allocation: AllocationRow[];
};

const INSTRUMENTS: InstrumentDefinition[] = [
  {
    assetClass: 'EQUITY_GLOBAL',
    ticker: 'SPYI',
    name: 'State Street SPDR MSCI All Country World Investable Market UCITS ETF (Acc)',
    isin: 'IE00B3YLTY66',
    domicile: 'Ireland',
    structure: 'UCITS ETF',
    incomeTreatment: 'Accumulation',
    replication: 'Optimised physical',
    tradingCurrency: 'EUR',
    role: 'Core azionario globale sviluppati, emergenti e small cap in un solo strumento.',
    sourceUrl:
      'https://www.ssga.com/ch/en_gb/intermediary/etfs/state-street-spdr-msci-all-country-world-investable-market-ucits-etf-acc-spyi-gy',
    overlapTokens: [
      'MSCI WORLD',
      'S&P 500',
      'NASDAQ',
      'MSCI USA',
      'MSCI EUROPE',
      'CHINA',
      'WORLD VALUE',
      'EURO STX 50',
      'WORLD SMALL CAP',
      'GLOBAL EQUITY',
    ],
  },
  {
    assetClass: 'BONDS',
    ticker: 'AGGH',
    name: 'iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)',
    isin: 'IE00BDBRDM35',
    domicile: 'Ireland',
    structure: 'UCITS ETF',
    incomeTreatment: 'Accumulation',
    replication: 'Physical sampled',
    tradingCurrency: 'EUR',
    role: 'Core obbligazionario globale investment grade con copertura valutaria EUR.',
    sourceUrl:
      'https://www.ishares.com/uk/individual/en/products/291770/ishares-core-global-aggregate-bond-ucits-etf',
    overlapTokens: ['BOND', 'OBBLIG', 'TREASURY', 'CORP BN', 'FIXED INCOME'],
  },
  {
    assetClass: 'MONEY_MARKET',
    ticker: 'XEON',
    name: 'Xtrackers II EUR Overnight Rate Swap UCITS ETF 1C',
    isin: 'LU0290358497',
    domicile: 'Luxembourg',
    structure: 'UCITS ETF',
    incomeTreatment: 'Capitalising',
    replication: 'Indirect swap',
    tradingCurrency: 'EUR',
    role: 'Componente monetaria strategica e parcheggio temporaneo delle tranche non ancora attivate.',
    sourceUrl:
      'https://etf.dws.com/en-gb/LU0290358497-eur-overnight-rate-swap-ucits-etf-1c/',
    overlapTokens: ['XEON', 'OVERNIGHT', 'MONEY MARKET', 'MONETARIO'],
  },
  {
    assetClass: 'GOLD',
    ticker: 'WGLD',
    name: 'WisdomTree Core Physical Gold',
    isin: 'JE00BN2CJ301',
    domicile: 'Jersey',
    structure: 'UCITS-eligible ETC; not a UCITS fund',
    incomeTreatment: 'Not applicable',
    replication: 'Physical allocated gold',
    tradingCurrency: 'EUR',
    role: 'Diversificatore in oro fisico entro i limiti IPS.',
    sourceUrl:
      'https://www.wisdomtree.com/ie/products/commodities/wisdomtree-core-physical-gold',
    overlapTokens: ['GOLD', 'ORO', 'PHYSICAL GOLD'],
  },
];

@Injectable()
export class InvestmentRecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capitalAllocationService: CapitalAllocationService,
    private readonly ipsClassificationService: IpsClassificationService,
    private readonly investmentsService: InvestmentsService,
  ) {}

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private roundPercentage(value: number): number {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
  }

  private percentage(value: number, total: number): number {
    return total === 0 ? 0 : this.roundPercentage((value / total) * 100);
  }

  private parseJson<T>(value: string): T {
    const parsed: unknown = JSON.parse(value);

    return parsed as T;
  }

  private async loadInputs(): Promise<RecommendationInputs> {
    const [capitalPlan, ipsOverview, portfolio] = await Promise.all([
      this.capitalAllocationService.getElToroPlan(),
      this.ipsClassificationService.getOverview(),
      this.investmentsService.getPortfolio(),
    ]);

    return {
      capitalPlan,
      ipsOverview,
      portfolio,
    };
  }

  private buildInputHash(inputs: RecommendationInputs): string {
    const payload = {
      engineVersion: ENGINE_VERSION,
      marketContextAsOf: MARKET_CONTEXT.asOfDate,
      capitalPlan: {
        updatedAt: inputs.capitalPlan.plan.updatedAt,
        longTermCoreInvestment: inputs.capitalPlan.plan.longTermCoreInvestment,
        balance: inputs.capitalPlan.reconciliation.balance,
        planningEstimates: inputs.capitalPlan.status.planningEstimates,
      },
      ips: inputs.ipsOverview.items.map((item) => ({
        positionId: item.positionId,
        valueBase: item.valueBase,
        ipsAssetClass: item.ipsAssetClass,
        classificationMode:
          item.classificationMode,
        lookThroughAllocation:
          item.lookThroughAllocation,
        updatedAt: item.updatedAt,
      })),
    };

    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private marketContextIsStale(): boolean {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const ageInDays =
      (Date.now() - new Date(MARKET_CONTEXT.asOfDate).getTime()) /
      millisecondsPerDay;

    return ageInDays > MARKET_CONTEXT_MAX_AGE_DAYS;
  }

  private distribute(
    total: number,
    weights: Array<{ code: string; weight: number }>,
  ): Map<string, number> {
    const result = new Map<string, number>();
    const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);

    if (total <= 0 || totalWeight <= 0) {
      for (const item of weights) {
        result.set(item.code, 0);
      }

      return result;
    }

    weights.forEach((item) => {
      result.set(
        item.code,
        this.roundMoney((total * item.weight) / totalWeight),
      );
    });

    const allocated = Array.from(result.values()).reduce(
      (sum, amount) => this.roundMoney(sum + amount),
      0,
    );
    const remainder = this.roundMoney(total - allocated);
    const adjustmentTarget = [...weights].sort(
      (left, right) => right.weight - left.weight,
    )[0];

    if (adjustmentTarget && remainder !== 0) {
      result.set(
        adjustmentTarget.code,
        this.roundMoney((result.get(adjustmentTarget.code) ?? 0) + remainder),
      );
    }

    return result;
  }

  private buildAllocation(inputs: RecommendationInputs): {
    method: 'GAP_TO_IPS_TARGET' | 'IPS_TARGET_REFERENCE';
    rows: AllocationRow[];
  } {
    const investibleCapital = inputs.capitalPlan.plan.longTermCoreInvestment;
    const strategicClasses = inputs.ipsOverview.allocation.filter(
      (item) => item.strategic && item.target !== null,
    );
    const dataComplete = inputs.ipsOverview.summary.complianceAvailable;
    const currentStrategicValue = inputs.ipsOverview.summary.strategicValue;
    const projectedStrategicValue = currentStrategicValue + investibleCapital;

    const distributionWeights = strategicClasses.map((item) => {
      const targetValue = projectedStrategicValue * ((item.target ?? 0) / 100);
      const positiveGap = Math.max(0, targetValue - item.value);

      return {
        code: item.code,
        weight: dataComplete ? positiveGap : (item.target ?? 0),
      };
    });

    const distributed = this.distribute(investibleCapital, distributionWeights);

    const rows = strategicClasses.map((item) => {
      const newCapitalAmount = distributed.get(item.code) ?? 0;
      const projectedValue = this.roundMoney(item.value + newCapitalAmount);
      const currentWeight =
        dataComplete && currentStrategicValue > 0
          ? this.percentage(item.value, currentStrategicValue)
          : null;
      const projectedWeight =
        dataComplete && projectedStrategicValue > 0
          ? this.percentage(projectedValue, projectedStrategicValue)
          : null;
      const targetValueBeforeNewCapital =
        dataComplete && currentStrategicValue > 0
          ? currentStrategicValue * ((item.target ?? 0) / 100)
          : null;

      return {
        code: item.code,
        label: item.label,
        targetWeight: item.target ?? 0,
        currentValue: this.roundMoney(item.value),
        currentWeight,
        gapToTargetBeforeNewCapital:
          targetValueBeforeNewCapital === null
            ? null
            : this.roundMoney(targetValueBeforeNewCapital - item.value),
        newCapitalAmount,
        newCapitalWeight: this.percentage(newCapitalAmount, investibleCapital),
        projectedValue,
        projectedWeight,
        action: newCapitalAmount > 0 ? 'INCREASE' : 'HOLD',
      } satisfies AllocationRow;
    });

    return {
      method: dataComplete ? 'GAP_TO_IPS_TARGET' : 'IPS_TARGET_REFERENCE',
      rows,
    };
  }

  private buildInstruments(
    allocation: AllocationRow[],
    portfolio: Portfolio,
  ): RecommendationInstrument[] {
    return INSTRUMENTS.map((instrument) => {
      const amount =
        allocation.find((item) => item.code === instrument.assetClass)
          ?.newCapitalAmount ?? 0;
      const exactHolding = portfolio.positions.some(
        (position) =>
          position.isin?.toUpperCase() === instrument.isin.toUpperCase(),
      );
      const possibleOverlaps = portfolio.positions.filter((position) => {
        const searchable = `${position.code} ${position.name}`.toUpperCase();

        return instrument.overlapTokens.some((token) =>
          searchable.includes(token),
        );
      });

      return {
        assetClass: instrument.assetClass,
        ticker: instrument.ticker,
        name: instrument.name,
        isin: instrument.isin,
        domicile: instrument.domicile,
        structure: instrument.structure,
        incomeTreatment: instrument.incomeTreatment,
        replication: instrument.replication,
        tradingCurrency: instrument.tradingCurrency,
        role: instrument.role,
        sourceUrl: instrument.sourceUrl,
        proposedAmount: amount,
        proposedWeight: this.percentage(
          amount,
          allocation.reduce((sum, item) => sum + item.newCapitalAmount, 0),
        ),
        overlap: {
          exactHolding,
          methodology: 'NAME_AND_ISIN_SCREENING' as const,
          potentialOverlapValue: this.roundMoney(
            possibleOverlaps.reduce(
              (sum, position) => sum + position.marketValue,
              0,
            ),
          ),
          positions: possibleOverlaps.slice(0, 6).map((position) => ({
            code: position.code,
            name: position.name,
            marketValue: position.marketValue,
          })),
        },
      };
    });
  }

  private buildTranches(allocation: AllocationRow[]): RecommendationTranche[] {
    const definitions = [
      {
        number: 1,
        percentage: 40,
        timing: 'T0',
        trigger:
          'Dopo disponibilità effettiva del capitale e completamento dei blocchi di validazione.',
      },
      {
        number: 2,
        percentage: 20,
        timing: 'T+30 giorni',
        trigger:
          'Ingresso programmato; anticipabile solo con approvazione in caso di correzione azionaria globale significativa.',
      },
      {
        number: 3,
        percentage: 20,
        timing: 'T+60 giorni',
        trigger:
          'Ingresso programmato se patrimonio, IPS e fabbisogni di liquidità non sono cambiati.',
      },
      {
        number: 4,
        percentage: 20,
        timing: 'T+90 giorni',
        trigger:
          'Completamento entro 90-120 giorni; le sole notizie negative non giustificano un rinvio indefinito.',
      },
    ];

    const perClass = new Map<string, number[]>();

    for (const item of allocation) {
      let allocated = 0;

      const amounts = definitions.map((definition, index) => {
        if (index === definitions.length - 1) {
          return this.roundMoney(item.newCapitalAmount - allocated);
        }

        const amount = this.roundMoney(
          item.newCapitalAmount * (definition.percentage / 100),
        );

        allocated = this.roundMoney(allocated + amount);

        return amount;
      });

      perClass.set(item.code, amounts);
    }

    return definitions.map((definition, index) => {
      const orders = allocation
        .map((item) => ({
          assetClass: item.code,
          label: item.label,
          amount: perClass.get(item.code)?.[index] ?? 0,
        }))
        .filter((item) => item.amount > 0);

      return {
        ...definition,
        amount: this.roundMoney(
          orders.reduce((sum, order) => sum + order.amount, 0),
        ),
        orders,
      };
    });
  }

  private determineStatus(inputs: RecommendationInputs): RecommendationStatus {
    if (
      inputs.capitalPlan.reconciliation.fundingGap > 0 ||
      inputs.capitalPlan.status.planningEstimates === 'NOT_SET'
    ) {
      return 'BLOCKED_CAPITAL_PLAN';
    }

    if (!inputs.ipsOverview.summary.complianceAvailable) {
      return 'NEEDS_DATA';
    }

    if (this.marketContextIsStale()) {
      return 'NEEDS_MARKET_UPDATE';
    }

    return 'NEEDS_VALIDATION';
  }

  private buildWarnings(
    inputs: RecommendationInputs,
    status: RecommendationStatus,
  ): string[] {
    const warnings = [
      'La fiscalità di El Toro resta NEEDS_VALIDATION: nessun importo è presentato come imposta o plusvalenza imponibile.',
      'La riserva casa Dubai e la riserva famiglia/trasferimento sono escluse dalla proposta di investimento.',
      'La proposta non esegue ordini e richiede verifica di adeguatezza, fiscalità, KID, costi e disponibilità presso il broker.',
      'Il controllo overlap è uno screening preliminare per nome e ISIN, non un look-through completo dei fondi.',
    ];

    if (status === 'BLOCKED_CAPITAL_PLAN') {
      warnings.unshift(
        'Il capitale core non è operativo finché stime e riconciliazione del piano non eliminano il blocco di funding.',
      );
    }

    if (status === 'NEEDS_DATA') {
      warnings.unshift(
        `${inputs.ipsOverview.summary.unclassifiedPositions} posizioni finanziarie non sono classificate nell’IPS. Gli importi mostrati seguono i target IPS come riferimento e non i gap effettivi del portafoglio.`,
      );
    }

    if (status === 'NEEDS_MARKET_UPDATE') {
      warnings.unshift(
        'Il contesto di mercato ha superato la soglia di freschezza di 45 giorni e deve essere aggiornato prima dell’approvazione.',
      );
    }

    return warnings;
  }

  private parseSnapshot(
    snapshot: {
      id: string;
      engineVersion: string;
      status: string;
      inputHash: string;
      investibleCapital: number;
      dataCoveragePercentage: number;
      marketContextAsOf: Date;
      marketRegime: string;
      marketContextJson: string;
      currentAllocationJson: string;
      proposedAllocationJson: string;
      instrumentsJson: string;
      tranchesJson: string;
      warningsJson: string;
      generatedAt: Date;
    },
    isCurrent: boolean,
    staleReasons: string[],
  ) {
    const current = this.parseJson<CurrentSnapshotData>(
      snapshot.currentAllocationJson,
    );
    const proposed = this.parseJson<ProposedSnapshotData>(
      snapshot.proposedAllocationJson,
    );

    return {
      id: snapshot.id,
      engineVersion: snapshot.engineVersion,
      status: snapshot.status,
      generatedAt: snapshot.generatedAt.toISOString(),
      isCurrent,
      staleReasons,
      fiscalStatus: 'NEEDS_VALIDATION',
      execution: {
        automatedExecution: false,
        status: 'BLOCKED',
        requiredActions: [
          'Completare la classificazione IPS delle posizioni.',
          'Validare professionalmente fiscalità e capitale disponibile.',
          'Verificare adeguatezza e documentazione degli strumenti.',
          'Approvare formalmente importi e tranche.',
        ],
      },
      capitalPlan: current.capitalPlan,
      dataQuality: current.dataQuality,
      allocation: {
        method: proposed.method,
        current: current.allocation,
        proposed: proposed.allocation,
      },
      marketContext: this.parseJson<typeof MARKET_CONTEXT>(
        snapshot.marketContextJson,
      ),
      instruments: this.parseJson<RecommendationInstrument[]>(
        snapshot.instrumentsJson,
      ),
      tranches: this.parseJson<RecommendationTranche[]>(snapshot.tranchesJson),
      warnings: this.parseJson<string[]>(snapshot.warningsJson),
    };
  }

  async getLatestElToroRecommendation() {
    const [latest, inputs] = await Promise.all([
      this.prisma.investmentRecommendationSnapshot.findFirst({
        where: {
          sourcePropertyCode: EL_TORO_PROPERTY_CODE,
        },
        orderBy: {
          generatedAt: 'desc',
        },
      }),
      this.loadInputs(),
    ]);

    if (!latest) {
      return {
        engine: {
          version: ENGINE_VERSION,
          mode: 'NEW_CAPITAL_ONLY',
          automatedExecution: false,
        },
        recommendation: null,
      };
    }

    const staleReasons: string[] = [];

    if (latest.inputHash !== this.buildInputHash(inputs)) {
      staleReasons.push(
        'Il piano capitale o le classificazioni IPS sono cambiati dopo la generazione.',
      );
    }

    if (this.marketContextIsStale()) {
      staleReasons.push(
        'Il contesto di mercato ha superato la soglia di freschezza di 45 giorni.',
      );
    }

    return {
      engine: {
        version: ENGINE_VERSION,
        mode: 'NEW_CAPITAL_ONLY',
        automatedExecution: false,
      },
      recommendation: this.parseSnapshot(
        latest,
        staleReasons.length === 0,
        staleReasons,
      ),
    };
  }

  async generateElToroRecommendation() {
    const inputs = await this.loadInputs();
    const status = this.determineStatus(inputs);
    const proposedAllocation = this.buildAllocation(inputs);
    const instruments = this.buildInstruments(
      proposedAllocation.rows,
      inputs.portfolio,
    );
    const tranches = this.buildTranches(proposedAllocation.rows);
    const warnings = this.buildWarnings(inputs, status);

    const snapshot = await this.prisma.investmentRecommendationSnapshot.create({
      data: {
        sourcePropertyCode: EL_TORO_PROPERTY_CODE,
        engineVersion: ENGINE_VERSION,
        status,
        inputHash: this.buildInputHash(inputs),
        investibleCapital: inputs.capitalPlan.plan.longTermCoreInvestment,
        dataCoveragePercentage: inputs.ipsOverview.summary.coveragePercentage,
        marketContextAsOf: new Date(MARKET_CONTEXT.asOfDate),
        marketRegime: MARKET_CONTEXT.regime,
        marketContextJson: JSON.stringify(MARKET_CONTEXT),
        currentAllocationJson: JSON.stringify({
          capitalPlan: {
            investibleCapital: inputs.capitalPlan.plan.longTermCoreInvestment,
            source: inputs.capitalPlan.plan.source,
            allocationStatus: inputs.capitalPlan.status.allocation,
            operationalStatus: inputs.capitalPlan.status.operational,
            fiscalStatus: inputs.capitalPlan.status.fiscal,
          },
          dataQuality: {
            positionCount: inputs.ipsOverview.summary.positions,
            classifiedPositions: inputs.ipsOverview.summary.classifiedPositions,
            unclassifiedPositions:
              inputs.ipsOverview.summary.unclassifiedPositions,
            coveragePercentage: inputs.ipsOverview.summary.coveragePercentage,
            complianceAvailable: inputs.ipsOverview.summary.complianceAvailable,
          },
          allocation: inputs.ipsOverview.allocation,
        }),
        proposedAllocationJson: JSON.stringify({
          method: proposedAllocation.method,
          allocation: proposedAllocation.rows,
        }),
        instrumentsJson: JSON.stringify(instruments),
        tranchesJson: JSON.stringify(tranches),
        warningsJson: JSON.stringify(warnings),
      },
    });

    return {
      engine: {
        version: ENGINE_VERSION,
        mode: 'NEW_CAPITAL_ONLY',
        automatedExecution: false,
      },
      recommendation: this.parseSnapshot(snapshot, true, []),
    };
  }
}
