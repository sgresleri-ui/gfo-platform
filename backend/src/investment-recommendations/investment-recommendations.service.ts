import { createHash } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';

import { CapitalAllocationService } from '../capital-allocation/capital-allocation.service';
import { InvestmentsService } from '../investments/investments.service';
import { IpsClassificationService } from '../ips/ips-classification.service';
import { PrismaService } from '../prisma/prisma.service';

const ENGINE_VERSION = '1.0.0';
const ENTRY_PLAN_VERSION = '1.0.0';
const DUE_DILIGENCE_VERSION = '1.2.0';
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

type EntryScenarioCode = 'BASE' | 'CAUTIOUS';

type EntryScenarioDefinition = {
  code: EntryScenarioCode;
  label: string;
  description: string;
  durationDays: number;
  percentages: number[];
  timings: string[];
  triggers: string[];
};

type StoredEntryPlan = {
  id: number;
  recommendationSnapshotId: string;
  selectedScenario: string;
  tranchePercentagesJson: string;
  fundingAccount: string | null;
  executionBroker: string | null;
  notes: string | null;
  status: string;
  updatedAt: Date;
};

type EntryPlanRecommendation = {
  id: string;
  status: string;
  isCurrent: boolean;
  staleReasons: string[];
  fiscalStatus: 'NEEDS_VALIDATION';
  capitalPlan: {
    investibleCapital: number;
  };
  dataQuality: {
    complianceAvailable: boolean;
  };
  allocation: {
    current: IpsOverview['allocation'];
    proposed: AllocationRow[];
  };
};

export type UpdateElToroEntryPlanInput = {
  recommendationId: string;
  selectedScenario: EntryScenarioCode;
  tranchePercentages: number[];
  fundingAccount?: string | null;
  executionBroker?: string | null;
  notes?: string | null;
};

type DueDiligenceCheckCode =
  | 'KID_AND_DOCUMENTS'
  | 'STRUCTURE'
  | 'COSTS'
  | 'SIZE_AND_LIQUIDITY'
  | 'OVERLAP';

type BrokerCode = 'FINECO' | 'INTERACTIVE_BROKERS';

type UserBrokerAvailability =
  'NOT_VERIFIED' | 'USER_CONFIRMED' | 'NOT_AVAILABLE';

type EffectiveBrokerAvailability =
  UserBrokerAvailability | 'PUBLICLY_CONFIRMED';

type BrokerExecutionEvidence = {
  observedAt: string | null;
  venue: string | null;
  bid: number | null;
  ask: number | null;
  referenceOrderAmount: number | null;
  commissionAmount: number | null;
  regularSession: boolean;
  notes: string | null;
};

type DocumentaryReview = {
  acknowledged: boolean;
  packVersion: string | null;
  reviewedAt: string | null;
};

type DueDiligenceReview = {
  isin: string;
  selected: boolean;
  preferredBroker: BrokerCode | null;
  checks: Record<DueDiligenceCheckCode, boolean>;
  documentReview: DocumentaryReview;
  brokerAvailability: Record<BrokerCode, UserBrokerAvailability>;
  brokerExecution: Record<BrokerCode, BrokerExecutionEvidence>;
  notes: string | null;
};

type StoredDueDiligencePlan = {
  id: number;
  recommendationSnapshotId: string;
  reviewsJson: string;
  notes: string | null;
  status: string;
  updatedAt: Date;
};

type DueDiligenceSource = {
  publisher: string;
  title: string;
  sourceDate: string;
  url: string;
};

type DueDiligenceDocumentPack = {
  version: string;
  asOfDate: string;
  status: 'READY_FOR_REVIEW' | 'SOURCE_GAPS';
  documents: Array<{
    id: string;
    kind:
      | 'PRODUCT_PAGE'
      | 'PRIIPS_KID'
      | 'PROSPECTUS'
      | 'RISK_EXPLAINER'
      | 'INDEX_PAGE'
      | 'BULLION_HOLDINGS'
      | 'MARKET_LISTING'
      | 'BROKER_TERMS';
    publisher: string;
    title: string;
    sourceDate: string;
    url: string;
    official: true;
    purpose: string;
  }>;
  evidence: Array<{
    checkCode: DueDiligenceCheckCode;
    status:
      | 'SOURCE_SUPPORTED'
      | 'USER_REVIEW_REQUIRED'
      | 'PROFESSIONAL_VALIDATION_REQUIRED';
    summary: string;
    sourceIds: string[];
    limitations: string[];
  }>;
  preliminaryOutcome: 'DOCUMENTED_WITH_LIMITATIONS';
  limitations: string[];
};

type DueDiligenceBrokerRoute = {
  broker: BrokerCode;
  brokerLabel: string;
  venue: string | null;
  publicStatus: 'PUBLICLY_CONFIRMED' | 'NOT_VERIFIED';
  sourceUrl: string;
  note: string;
};

type DueDiligenceInstrument = {
  assetClass: 'BONDS' | 'MONEY_MARKET' | 'GOLD';
  assetClassLabel: string;
  role: 'PRIMARY' | 'ALTERNATIVE';
  ticker: string;
  name: string;
  isin: string;
  issuer: string;
  domicile: string;
  structure: string;
  ucitsClassification: 'UCITS_FUND' | 'UCITS_ELIGIBLE_ETC_NOT_FUND';
  incomeTreatment: string;
  replication: string;
  tradingCurrency: string;
  ongoingChargePct: number | null;
  factsAsOf: string;
  size: string;
  keyFacts: string[];
  risks: string[];
  sources: DueDiligenceSource[];
  documentPack?: DueDiligenceDocumentPack;
  brokerRoutes: DueDiligenceBrokerRoute[];
};

type DueDiligencePortfolioOverlap = {
  existingExposure: number;
  positionCount: number;
  positions: Array<{
    code: string;
    name: string;
    exposureValue: number;
    exposurePercentageOfPosition: number;
    classificationMode: 'SINGLE_CLASS' | 'LOOK_THROUGH';
  }>;
  assessment: string;
};

export type UpdateElToroDueDiligenceInput = {
  recommendationId: string;
  reviews: Array<{
    isin: string;
    selected: boolean;
    preferredBroker?: BrokerCode | null;
    checks: Partial<Record<DueDiligenceCheckCode, boolean>>;
    brokerAvailability: Partial<Record<BrokerCode, UserBrokerAvailability>>;
    brokerExecution?: Partial<
      Record<BrokerCode, Partial<BrokerExecutionEvidence>>
    >;
    documentReview?: Partial<DocumentaryReview>;
    notes?: string | null;
  }>;
  notes?: string | null;
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

const DUE_DILIGENCE_CHECKS: Array<{
  code: DueDiligenceCheckCode;
  label: string;
  description: string;
}> = [
  {
    code: 'KID_AND_DOCUMENTS',
    label: 'KID e documenti',
    description:
      'KID, factsheet e documentazione ufficiale della specifica classe/ISIN sono stati letti.',
  },
  {
    code: 'STRUCTURE',
    label: 'Struttura e replica',
    description:
      'Domicilio, struttura giuridica, replica, collateral/custodia e rischi specifici sono stati compresi.',
  },
  {
    code: 'COSTS',
    label: 'Costi complessivi',
    description:
      'TER/MER, spread, commissioni del broker e costi di cambio sono stati verificati.',
  },
  {
    code: 'SIZE_AND_LIQUIDITY',
    label: 'Dimensione e liquidità',
    description:
      'Dimensione, mercato di quotazione, valuta, lotto, spread e modalità di esecuzione sono adeguati.',
  },
  {
    code: 'OVERLAP',
    label: 'Coerenza e overlap',
    description:
      'Ruolo nel portafoglio, concentrazioni e sovrapposizioni con le posizioni esistenti sono stati valutati.',
  },
];

const FINECO_SOURCE =
  'https://it.finecobank.com/trading/etf/etf-zero-commissioni/';
const IBKR_MARKETS_SOURCE =
  'https://www.interactivebrokers.com/en/trading/global-market-access.php';
const XEON_PRODUCT_SOURCE =
  'https://etf.dws.com/en-gb/LU0290358497-eur-overnight-rate-swap-ucits-etf-1c/';
const XEON_RISK_SOURCE =
  'https://etf.dws.com/en-gb/knowledge/focus-topics/overnight-etfs-an-alternative-to-easy-access-savings-accounts/';
const XEON_INDEX_SOURCE = 'https://www.solactive.com/index/DE000SL0H431/';
const WGLD_PRODUCT_SOURCE =
  'https://www.wisdomtree.com/ie/products/commodities/wisdomtree-core-physical-gold';
const WGLD_KID_SOURCE =
  'https://dataspanapi.wisdomtree.com/pdr/documents/PRIIP_KID/MSL/ES/ES-ES/JE00BN2CJ301';
const WGLD_PROSPECTUS_SOURCE =
  'https://dataspanapi.wisdomtree.com/pdr/documents/PROSPECTUS/MSL/ES/EN-ES/JE00BN2CJ301';
const WGLD_BAR_LIST_SOURCE =
  'https://dataspanapi.wisdomtree.com/pdr/documents/METALBAR/MSL/UK/EN-GB/JE00BN2CJ301/';
const WGLD_MARKET_SOURCE =
  'https://www.borsaitaliana.it/borsa/etc-etn/scheda/JE00BN2CJ301-ETFP.html';
const SGLN_PRODUCT_SOURCE =
  'https://www.ishares.com/it/investitori-professionali/it/prodotti/258441/ishares-physical-gold-etc-fund?siteEntryPassthrough=true&switchLocale=y';
const SGLN_KID_SOURCE =
  'https://www.borsaitaliana.it/etp-listing/2026-00107-KID-MjAyNi0wMDEwN0tJRG51bGwzMDg3MTg3MTE2NDY2MDE5MDg4.pdf';
const SGLN_PROSPECTUS_SOURCE =
  'https://www.borsaitaliana.it/etp-listing/2026-00107-PROSPECTUS-MjAyNi0wMDEwN1BST1NQRUNUVVNudWxsODgyMjE5MTgxMDcxMjY3MDk0Mw%3D%3D.pdf';
const SGLN_MARKET_SOURCE =
  'https://www.borsaitaliana.it/borsa/etc-etn/scheda/IE00B4ND3602-ETFP.html';

const XEON_DOCUMENT_PACK: DueDiligenceDocumentPack = {
  version: 'XEON-2026-07-29-01',
  asOfDate: '2026-07-29',
  status: 'READY_FOR_REVIEW',
  documents: [
    {
      id: 'XEON_DWS_PRODUCT',
      kind: 'PRODUCT_PAGE',
      publisher: 'DWS Xtrackers',
      title: 'Scheda ufficiale XEON e area documenti',
      sourceDate: '2026-07-29',
      url: XEON_PRODUCT_SOURCE,
      official: true,
      purpose:
        'Identità della classe, caratteristiche correnti e accesso a KID, factsheet e prospetto.',
    },
    {
      id: 'XEON_DWS_KID',
      kind: 'PRIIPS_KID',
      publisher: 'DWS Xtrackers',
      title: 'PRIIPs KID della classe LU0290358497',
      sourceDate: '2026-02-16',
      url: XEON_PRODUCT_SOURCE,
      official: true,
      purpose:
        'Rischio sintetico, scenari, costi e periodo di detenzione raccomandato da leggere nella sezione Documents.',
    },
    {
      id: 'XEON_DWS_RISKS',
      kind: 'RISK_EXPLAINER',
      publisher: 'DWS Xtrackers',
      title: 'Overnight ETFs: struttura swap, collateral e rischi',
      sourceDate: '2026-07-29',
      url: XEON_RISK_SOURCE,
      official: true,
      purpose:
        'Spiegazione ufficiale di replica sintetica, controparte, collateral, costi e differenze rispetto a un deposito.',
    },
    {
      id: 'XEON_SOLACTIVE_INDEX',
      kind: 'INDEX_PAGE',
      publisher: 'Solactive',
      title: 'Solactive €STR +8.5 Daily Total Return Index',
      sourceDate: '2026-07-29',
      url: XEON_INDEX_SOURCE,
      official: true,
      purpose:
        'Identità e caratteristiche del benchmark replicato, ISIN DE000SL0H431.',
    },
    {
      id: 'XEON_FINECO_TERMS',
      kind: 'BROKER_TERMS',
      publisher: 'Fineco',
      title: 'Condizioni ETF a zero commissioni',
      sourceDate: '2026-07-29',
      url: FINECO_SOURCE,
      official: true,
      purpose:
        'Verifica separata delle condizioni promozionali del broker sullo specifico ISIN.',
    },
  ],
  evidence: [
    {
      checkCode: 'KID_AND_DOCUMENTS',
      status: 'USER_REVIEW_REQUIRED',
      summary:
        'La scheda ufficiale rende disponibili i documenti della specifica classe. La presa visione del KID e del factsheet deve essere confermata manualmente.',
      sourceIds: ['XEON_DWS_PRODUCT', 'XEON_DWS_KID'],
      limitations: [
        'La presenza del documento non dimostra che sia stato letto o compreso.',
      ],
    },
    {
      checkCode: 'STRUCTURE',
      status: 'SOURCE_SUPPORTED',
      summary:
        'DWS descrive una replica sintetica tramite swap con collateral e una o più banche controparti; il fondo resta un ETF UCITS e non un deposito bancario.',
      sourceIds: ['XEON_DWS_PRODUCT', 'XEON_DWS_RISKS'],
      limitations: [
        'Controparti, collateral ed esposizione swap effettiva possono cambiare e vanno ricontrollati nei documenti correnti.',
      ],
    },
    {
      checkCode: 'COSTS',
      status: 'SOURCE_SUPPORTED',
      summary:
        'Il TER pubblicato è 0,10% annuo; spread, costi di negoziazione e commissioni del broker restano separati e sono confrontati nelle evidenze di esecuzione.',
      sourceIds: ['XEON_DWS_PRODUCT', 'XEON_DWS_RISKS', 'XEON_FINECO_TERMS'],
      limitations: [
        'Le condizioni promozionali Fineco devono essere riconfermate nella schermata finale dell’ordine.',
      ],
    },
    {
      checkCode: 'SIZE_AND_LIQUIDITY',
      status: 'USER_REVIEW_REQUIRED',
      summary:
        'La negoziabilità giornaliera è documentata; mercato, spread, lotto e importo reale devono essere verificati sulle evidenze Fineco e IBKR già registrate.',
      sourceIds: ['XEON_DWS_PRODUCT', 'XEON_DWS_RISKS'],
      limitations: [
        'La liquidità di borsa e lo spread non sono garantiti e cambiano durante la seduta.',
      ],
    },
    {
      checkCode: 'OVERLAP',
      status: 'PROFESSIONAL_VALIDATION_REQUIRED',
      summary:
        'Il ruolo è liquidità strategica e parcheggio temporaneo. La coerenza finale dipende dall’IPS, dal portafoglio corrente e dal fabbisogno di liquidità familiare.',
      sourceIds: ['XEON_SOLACTIVE_INDEX'],
      limitations: [
        'La stessa classe IPS non prova né esclude una sovrapposizione economica con altri strumenti.',
      ],
    },
  ],
  preliminaryOutcome: 'DOCUMENTED_WITH_LIMITATIONS',
  limitations: [
    'La documentazione non sostituisce la verifica di adeguatezza e il giudizio professionale.',
    'Il trattamento fiscale dello strumento e della vendita El Toro resta NEEDS_VALIDATION.',
    'XEON non è un deposito bancario, non è coperto da garanzia sui depositi e il capitale non è garantito.',
  ],
};

const WGLD_DOCUMENT_PACK: DueDiligenceDocumentPack = {
  version: 'WGLD-2026-07-29-01',
  asOfDate: '2026-07-29',
  status: 'READY_FOR_REVIEW',
  documents: [
    {
      id: 'WGLD_WISDOMTREE_PRODUCT',
      kind: 'PRODUCT_PAGE',
      publisher: 'WisdomTree',
      title: 'Scheda ufficiale WisdomTree Core Physical Gold',
      sourceDate: '2026-07-29',
      url: WGLD_PRODUCT_SOURCE,
      official: true,
      purpose:
        'Identità dell’ETC, struttura, custodia, costo corrente, quotazioni e caratteristiche dell’oro allocato.',
    },
    {
      id: 'WGLD_WISDOMTREE_KID',
      kind: 'PRIIPS_KID',
      publisher: 'WisdomTree',
      title: 'PRIIPs KID della classe JE00BN2CJ301',
      sourceDate: '2025-11-07',
      url: WGLD_KID_SOURCE,
      official: true,
      purpose:
        'Natura di titolo di debito, indicatore di rischio, scenari, costi, orizzonte e assenza di garanzia.',
    },
    {
      id: 'WGLD_WISDOMTREE_PROSPECTUS',
      kind: 'PROSPECTUS',
      publisher: 'WisdomTree',
      title: 'Base Prospectus WisdomTree Metal Securities',
      sourceDate: '2026-03-06',
      url: WGLD_PROSPECTUS_SOURCE,
      official: true,
      purpose:
        'Diritti dei portatori, limited recourse, ruoli delle controparti, collateral e fattori di rischio completi.',
    },
    {
      id: 'WGLD_WISDOMTREE_BAR_LIST',
      kind: 'BULLION_HOLDINGS',
      publisher: 'WisdomTree',
      title: 'Elenco ufficiale dei lingotti allocati',
      sourceDate: '2026-07-29',
      url: WGLD_BAR_LIST_SOURCE,
      official: true,
      purpose:
        'Tracciabilità operativa dell’oro fisico allocato a supporto dell’ETC.',
    },
    {
      id: 'WGLD_BORSA_ITALIANA',
      kind: 'MARKET_LISTING',
      publisher: 'Borsa Italiana',
      title: 'Scheda di negoziazione WGLD',
      sourceDate: '2026-07-29',
      url: WGLD_MARKET_SOURCE,
      official: true,
      purpose:
        'ISIN, ticker, mercato, lotto minimo, sottostante e documenti di quotazione.',
    },
  ],
  evidence: [
    {
      checkCode: 'KID_AND_DOCUMENTS',
      status: 'USER_REVIEW_REQUIRED',
      summary:
        'KID, prospetto, scheda prodotto e lista dei lingotti sono disponibili per lo specifico ISIN. La lettura deve essere confermata manualmente.',
      sourceIds: [
        'WGLD_WISDOMTREE_PRODUCT',
        'WGLD_WISDOMTREE_KID',
        'WGLD_WISDOMTREE_PROSPECTUS',
        'WGLD_WISDOMTREE_BAR_LIST',
      ],
      limitations: [
        'La presenza dei documenti non dimostra che rischi, diritti e priorità dei pagamenti siano stati compresi.',
      ],
    },
    {
      checkCode: 'STRUCTURE',
      status: 'SOURCE_SUPPORTED',
      summary:
        'WGLD è un titolo di debito ETC, non un fondo UCITS, garantito da oro fisico allocato conforme LBMA e custodito presso HSBC Bank plc.',
      sourceIds: [
        'WGLD_WISDOMTREE_PRODUCT',
        'WGLD_WISDOMTREE_KID',
        'WGLD_WISDOMTREE_PROSPECTUS',
        'WGLD_WISDOMTREE_BAR_LIST',
      ],
      limitations: [
        'L’oro allocato mitiga ma non elimina i rischi legali, operativi, di custodia, emittente e realizzo del collateral.',
      ],
    },
    {
      checkCode: 'COSTS',
      status: 'SOURCE_SUPPORTED',
      summary:
        'Il costo di gestione pubblicato è 0,12% annuo; spread, commissioni del broker e costi di negoziazione restano separati.',
      sourceIds: [
        'WGLD_WISDOMTREE_PRODUCT',
        'WGLD_WISDOMTREE_KID',
        'WGLD_BORSA_ITALIANA',
      ],
      limitations: [
        'Il costo effettivo dipende anche dal mercato scelto, dallo spread e dalle condizioni del broker al momento dell’ordine.',
      ],
    },
    {
      checkCode: 'SIZE_AND_LIQUIDITY',
      status: 'USER_REVIEW_REQUIRED',
      summary:
        'La scheda prodotto documenta market maker e quotazioni EUR; Borsa Italiana conferma ticker WGLD e lotto minimo uno.',
      sourceIds: ['WGLD_WISDOMTREE_PRODUCT', 'WGLD_BORSA_ITALIANA'],
      limitations: [
        'Volumi, profondità del book e spread devono essere rilevati durante la seduta sull’importo effettivo della tranche.',
      ],
    },
    {
      checkCode: 'OVERLAP',
      status: 'PROFESSIONAL_VALIDATION_REQUIRED',
      summary:
        'Il ruolo proposto è diversificatore in oro entro il limite IPS; concentrazione complessiva, rischio USD e coerenza familiare richiedono validazione.',
      sourceIds: ['WGLD_WISDOMTREE_PRODUCT', 'WGLD_WISDOMTREE_KID'],
      limitations: [
        'La quotazione in EUR non elimina l’esposizione economica al dollaro del prezzo internazionale dell’oro.',
      ],
    },
  ],
  preliminaryOutcome: 'DOCUMENTED_WITH_LIMITATIONS',
  limitations: [
    'WGLD è un ETC UCITS-eligible, ma non è un fondo UCITS.',
    'È un titolo di debito limited recourse: il capitale non è garantito e non opera una garanzia sui depositi.',
    'La fiscalità italiana dell’ETC e la fiscalità della vendita El Toro restano NEEDS_VALIDATION.',
    'La documentazione non sostituisce la verifica di adeguatezza e il giudizio professionale.',
  ],
};

const SGLN_DOCUMENT_PACK: DueDiligenceDocumentPack = {
  version: 'SGLN-2026-07-29-01',
  asOfDate: '2026-07-29',
  status: 'READY_FOR_REVIEW',
  documents: [
    {
      id: 'SGLN_ISHARES_PRODUCT',
      kind: 'PRODUCT_PAGE',
      publisher: 'iShares',
      title: 'Scheda ufficiale iShares Physical Gold ETC',
      sourceDate: '2026-07-29',
      url: SGLN_PRODUCT_SOURCE,
      official: true,
      purpose:
        'Identità dell’ETC, patrimonio, struttura fisica, depositario, costo corrente e quotazioni.',
    },
    {
      id: 'SGLN_PRIIPS_KID',
      kind: 'PRIIPS_KID',
      publisher: 'iShares / Borsa Italiana',
      title: 'PRIIPs KID della classe IE00B4ND3602',
      sourceDate: '2026-01-27',
      url: SGLN_KID_SOURCE,
      official: true,
      purpose:
        'Rischio sintetico, scenari, costi, orizzonte e assenza di garanzia per lo specifico ISIN.',
    },
    {
      id: 'SGLN_ISHARES_PROSPECTUS',
      kind: 'PROSPECTUS',
      publisher: 'iShares / Borsa Italiana',
      title: 'Base Prospectus iShares Physical Metals plc',
      sourceDate: '2026-01-27',
      url: SGLN_PROSPECTUS_SOURCE,
      official: true,
      purpose:
        'Struttura giuridica, diritti dei portatori, collateral, custodia e fattori di rischio completi.',
    },
    {
      id: 'SGLN_BULLION_INFORMATION',
      kind: 'BULLION_HOLDINGS',
      publisher: 'iShares',
      title: 'Patrimonio in oro e metal entitlement',
      sourceDate: '2026-07-29',
      url: SGLN_PRODUCT_SOURCE,
      official: true,
      purpose:
        'Tonnellate detenute, entitlement giornaliero e caratteristiche dell’oro fisico allocato.',
    },
    {
      id: 'SGLN_BORSA_ITALIANA',
      kind: 'MARKET_LISTING',
      publisher: 'Borsa Italiana',
      title: 'Scheda di negoziazione SGLN',
      sourceDate: '2026-07-29',
      url: SGLN_MARKET_SOURCE,
      official: true,
      purpose:
        'ISIN, ticker, mercato, lotto minimo, sottostante e documenti di quotazione.',
    },
  ],
  evidence: [
    {
      checkCode: 'KID_AND_DOCUMENTS',
      status: 'USER_REVIEW_REQUIRED',
      summary:
        'Scheda ufficiale, KID e prospetto sono disponibili per lo specifico ISIN. La presa visione deve essere confermata manualmente.',
      sourceIds: [
        'SGLN_ISHARES_PRODUCT',
        'SGLN_PRIIPS_KID',
        'SGLN_ISHARES_PROSPECTUS',
      ],
      limitations: [
        'La presenza dei documenti non equivale a comprensione della struttura ETC o dei rischi.',
      ],
    },
    {
      checkCode: 'STRUCTURE',
      status: 'SOURCE_SUPPORTED',
      summary:
        'SGLN è un ETC fisico emesso da iShares Physical Metals plc, non un fondo UCITS, con oro allocato e depositario JPMorgan Chase Bank N.A., London Branch.',
      sourceIds: [
        'SGLN_ISHARES_PRODUCT',
        'SGLN_ISHARES_PROSPECTUS',
        'SGLN_BULLION_INFORMATION',
      ],
      limitations: [
        'La collateralizzazione non elimina i rischi legali, operativi, di custodia, emittente e realizzo.',
      ],
    },
    {
      checkCode: 'COSTS',
      status: 'SOURCE_SUPPORTED',
      summary:
        'Il TER pubblicato è 0,12% annuo; spread, commissioni del broker e costi di esecuzione restano separati.',
      sourceIds: ['SGLN_ISHARES_PRODUCT', 'SGLN_PRIIPS_KID'],
      limitations: [
        'Il costo effettivo deve essere confrontato sul mercato e sul broker scelti per la tranche.',
      ],
    },
    {
      checkCode: 'SIZE_AND_LIQUIDITY',
      status: 'USER_REVIEW_REQUIRED',
      summary:
        'La scheda iShares documenta dimensione e quotazioni; Borsa Italiana conferma ticker SGLN e lotto minimo uno.',
      sourceIds: ['SGLN_ISHARES_PRODUCT', 'SGLN_BORSA_ITALIANA'],
      limitations: [
        'AUM elevato non garantisce spread o profondità adeguati per ogni ordine e momento della seduta.',
      ],
    },
    {
      checkCode: 'OVERLAP',
      status: 'PROFESSIONAL_VALIDATION_REQUIRED',
      summary:
        'SGLN replica la stessa esposizione economica all’oro fisico prevista per WGLD e deve essere trattato come alternativa, non come diversificazione aggiuntiva.',
      sourceIds: ['SGLN_ISHARES_PRODUCT', 'SGLN_PRIIPS_KID'],
      limitations: [
        'Selezionare contemporaneamente WGLD e SGLN richiede una motivazione esplicita e non aumenta la diversificazione per sottostante.',
      ],
    },
  ],
  preliminaryOutcome: 'DOCUMENTED_WITH_LIMITATIONS',
  limitations: [
    'SGLN è un ETC UCITS-eligible, ma non è un fondo UCITS.',
    'Il capitale non è garantito e il valore dipende dall’oro, dalla valuta e dalla struttura dell’ETC.',
    'La fiscalità italiana dell’ETC e la fiscalità della vendita El Toro restano NEEDS_VALIDATION.',
    'La documentazione non sostituisce la verifica di adeguatezza e il giudizio professionale.',
  ],
};

function brokerRoutes(
  finecoPubliclyConfirmed = false,
): DueDiligenceBrokerRoute[] {
  return [
    {
      broker: 'FINECO',
      brokerLabel: 'Fineco',
      venue: finecoPubliclyConfirmed ? 'Catalogo ETF Fineco' : null,
      publicStatus: finecoPubliclyConfirmed
        ? 'PUBLICLY_CONFIRMED'
        : 'NOT_VERIFIED',
      sourceUrl: FINECO_SOURCE,
      note: finecoPubliclyConfirmed
        ? 'ISIN presente nella lista pubblica Fineco degli ETF a zero commissioni. Verificare comunque negoziabilità e condizioni nel conto.'
        : 'La disponibilità del singolo ISIN non è attestata da una fonte pubblica: cercarlo nel conto Fineco prima dell’approvazione.',
    },
    {
      broker: 'INTERACTIVE_BROKERS',
      brokerLabel: 'Interactive Brokers',
      venue: null,
      publicStatus: 'NOT_VERIFIED',
      sourceUrl: IBKR_MARKETS_SOURCE,
      note: 'IBKR offre accesso ai mercati europei rilevanti, ma ciò non conferma il singolo contratto. Cercare l’ISIN in Client Portal/TWS.',
    },
  ];
}

const DUE_DILIGENCE_INSTRUMENTS: DueDiligenceInstrument[] = [
  {
    assetClass: 'BONDS',
    assetClassLabel: 'Obbligazionario',
    role: 'PRIMARY',
    ticker: 'AGGH',
    name: 'iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)',
    isin: 'IE00BDBRDM35',
    issuer: 'iShares',
    domicile: 'Irlanda',
    structure: 'ETF UCITS',
    ucitsClassification: 'UCITS_FUND',
    incomeTreatment: 'Accumulazione',
    replication: 'Fisica campionata',
    tradingCurrency: 'EUR',
    ongoingChargePct: 0.1,
    factsAsOf: '2026-07-24',
    size: 'Classe circa EUR 2,47 mld; fondo circa USD 14,04 mld',
    keyFacts: [
      'Benchmark globale investment grade; copertura valutaria della classe in EUR.',
      'Circa 19.977 titoli; duration effettiva 6,05 anni e YTM 4,04%.',
    ],
    risks: [
      'Rischio tasso e credito; la copertura valutaria riduce ma non elimina tutti i rischi.',
      'Overlap potenziale con fondi obbligazionari esistenti da verificare.',
    ],
    sources: [
      {
        publisher: 'iShares',
        title: 'Scheda ufficiale AGGH',
        sourceDate: '2026-07-24',
        url: 'https://www.ishares.com/uk/individual/en/products/291770/ishares-core-global-aggregate-bond-ucits-etf',
      },
    ],
    brokerRoutes: brokerRoutes(),
  },
  {
    assetClass: 'BONDS',
    assetClassLabel: 'Obbligazionario',
    role: 'ALTERNATIVE',
    ticker: 'VAGF',
    name: 'Vanguard Global Aggregate Bond UCITS ETF EUR Hedged Acc',
    isin: 'IE00BG47KH54',
    issuer: 'Vanguard',
    domicile: 'Irlanda',
    structure: 'ETF UCITS',
    ucitsClassification: 'UCITS_FUND',
    incomeTreatment: 'Accumulazione',
    replication: 'Fisica campionata',
    tradingCurrency: 'EUR',
    ongoingChargePct: 0.08,
    factsAsOf: '2026-06-30',
    size: 'Classe circa EUR 2,15 mld; fondo circa EUR 5,43 mld',
    keyFacts: [
      'Quotato in EUR su Borsa Italiana e Deutsche Börse.',
      '12.266 obbligazioni; duration 6,2 anni, YTM 4,1% e qualità media AA-.',
    ],
    risks: [
      'Il costo corrente non include spread, commissioni del broker o altri costi di negoziazione.',
      'Rischio tasso e credito; possibili differenze di indice rispetto ad AGGH.',
    ],
    sources: [
      {
        publisher: 'Vanguard',
        title: 'Scheda ufficiale VAGF',
        sourceDate: '2026-06-30',
        url: 'https://www.vanguard.co.uk/professional/product/etf/bond/9443/global-aggregate-bond-ucits-etf-eur-hedged-accumulating',
      },
      {
        publisher: 'Vanguard',
        title: 'KIID ufficiale VAGF',
        sourceDate: '2026-06-30',
        url: 'https://fund-docs.vanguard.com/ie00bg47kh54-en.pdf',
      },
    ],
    brokerRoutes: brokerRoutes(),
  },
  {
    assetClass: 'MONEY_MARKET',
    assetClassLabel: 'Money Market e liquidità strategica',
    role: 'PRIMARY',
    ticker: 'XEON',
    name: 'Xtrackers II EUR Overnight Rate Swap UCITS ETF 1C',
    isin: 'LU0290358497',
    issuer: 'DWS Xtrackers',
    domicile: 'Lussemburgo',
    structure: 'ETF UCITS',
    ucitsClassification: 'UCITS_FUND',
    incomeTreatment: 'Capitalizzazione',
    replication: 'Sintetica tramite swap',
    tradingCurrency: 'EUR',
    ongoingChargePct: 0.1,
    factsAsOf: '2026-07-28',
    size: 'Dimensione da confermare sul factsheet/KID corrente',
    keyFacts: [
      'Replica un rendimento overnight in EUR ed è destinato al parcheggio temporaneo e alla liquidità strategica.',
      'Fineco pubblica lo specifico ISIN nella propria lista ETF a zero commissioni.',
    ],
    risks: [
      'Replica sintetica: verificare controparte, collateral e indice nel KID.',
      'Non è equivalente a un deposito bancario e il capitale non è garantito.',
    ],
    sources: [
      {
        publisher: 'DWS',
        title: 'Scheda ufficiale XEON',
        sourceDate: '2026-07-28',
        url: XEON_PRODUCT_SOURCE,
      },
      {
        publisher: 'Fineco',
        title: 'ETF a zero commissioni',
        sourceDate: '2026-07-28',
        url: FINECO_SOURCE,
      },
    ],
    documentPack: XEON_DOCUMENT_PACK,
    brokerRoutes: brokerRoutes(true),
  },
  {
    assetClass: 'MONEY_MARKET',
    assetClassLabel: 'Money Market e liquidità strategica',
    role: 'ALTERNATIVE',
    ticker: 'LEONIA',
    name: 'Amundi EUR Overnight Return UCITS ETF Acc',
    isin: 'FR0010510800',
    issuer: 'Amundi',
    domicile: 'Francia',
    structure: 'ETF UCITS',
    ucitsClassification: 'UCITS_FUND',
    incomeTreatment: 'Capitalizzazione',
    replication: 'Da verificare sul KID corrente',
    tradingCurrency: 'EUR',
    ongoingChargePct: 0.1,
    factsAsOf: '2026-07-27',
    size: 'Dimensione da confermare sul factsheet/KID corrente',
    keyFacts: [
      'Quotato su Borsa Italiana con lotto minimo 1 e benchmark Solactive Overnight.',
      'Commissioni totali annue indicate da Borsa Italiana: 0,10%.',
    ],
    risks: [
      'Metodo di replica e rischi di controparte da confermare sul KID corrente.',
      'Disponibilità presso Fineco o IBKR non ancora verificata per ISIN.',
    ],
    sources: [
      {
        publisher: 'Borsa Italiana',
        title: 'Scheda mercato LEONIA',
        sourceDate: '2026-07-27',
        url: 'https://www.borsaitaliana.it/borsa/etf/scheda/FR0010510800-ETFP.html',
      },
    ],
    brokerRoutes: brokerRoutes(),
  },
  {
    assetClass: 'GOLD',
    assetClassLabel: 'Oro',
    role: 'PRIMARY',
    ticker: 'WGLD',
    name: 'WisdomTree Core Physical Gold',
    isin: 'JE00BN2CJ301',
    issuer: 'WisdomTree',
    domicile: 'Jersey',
    structure: 'ETC garantito da oro fisico allocato',
    ucitsClassification: 'UCITS_ELIGIBLE_ETC_NOT_FUND',
    incomeTreatment: 'Non applicabile',
    replication: 'Oro fisico allocato',
    tradingCurrency: 'EUR',
    ongoingChargePct: 0.12,
    factsAsOf: '2026-07-27',
    size: 'AUM circa USD 1,90 mld',
    keyFacts: [
      'Titolo di debito ETC: eleggibile UCITS, ma non è un fondo UCITS.',
      'Oro allocato custodito presso HSBC; quotazioni EUR anche su Borsa Italiana e Xetra.',
    ],
    risks: [
      'Rischio oro, emittente/struttura ETC e assenza di copertura valutaria.',
      'Verificare trattamento fiscale italiano e documentazione dell’ETC.',
    ],
    sources: [
      {
        publisher: 'WisdomTree',
        title: 'Scheda ufficiale WGLD',
        sourceDate: '2026-07-27',
        url: WGLD_PRODUCT_SOURCE,
      },
    ],
    documentPack: WGLD_DOCUMENT_PACK,
    brokerRoutes: brokerRoutes(),
  },
  {
    assetClass: 'GOLD',
    assetClassLabel: 'Oro',
    role: 'ALTERNATIVE',
    ticker: 'SGLN',
    name: 'iShares Physical Gold ETC',
    isin: 'IE00B4ND3602',
    issuer: 'iShares',
    domicile: 'Irlanda',
    structure: 'ETC garantito da oro fisico',
    ucitsClassification: 'UCITS_ELIGIBLE_ETC_NOT_FUND',
    incomeTreatment: 'Non applicabile',
    replication: 'Oro fisico',
    tradingCurrency: 'EUR',
    ongoingChargePct: 0.12,
    factsAsOf: '2026-07-23',
    size: 'AUM circa USD 34 mld',
    keyFacts: [
      'Titolo ETC: eleggibile UCITS, ma non è un fondo UCITS.',
      'Quotato in EUR su Borsa Italiana come SGLN e su Xetra come PPFB.',
    ],
    risks: [
      'Rischio oro, emittente/struttura ETC e assenza di copertura valutaria.',
      'Verificare trattamento fiscale italiano e specifico mercato scelto.',
    ],
    sources: [
      {
        publisher: 'iShares',
        title: 'Scheda ufficiale iShares Physical Gold ETC',
        sourceDate: '2026-07-23',
        url: SGLN_PRODUCT_SOURCE,
      },
    ],
    documentPack: SGLN_DOCUMENT_PACK,
    brokerRoutes: brokerRoutes(),
  },
];

const ENTRY_SCENARIOS: EntryScenarioDefinition[] = [
  {
    code: 'BASE',
    label: 'Ingresso base',
    description:
      'Quattro tranche in 90 giorni, coerenti con lo scenario neutrale-prudente del Recommendation Engine.',
    durationDays: 90,
    percentages: [40, 20, 20, 20],
    timings: ['T0', 'T+30 giorni', 'T+60 giorni', 'T+90 giorni'],
    triggers: [
      'Disponibilità effettiva del capitale e completamento dei blocchi di validazione.',
      'Ingresso programmato, salvo variazioni materiali di patrimonio, IPS o fabbisogni.',
      'Conferma di liquidità protetta, IPS e adeguatezza degli strumenti.',
      'Completamento del piano; ogni rinvio richiede una nuova decisione documentata.',
    ],
  },
  {
    code: 'CAUTIOUS',
    label: 'Ingresso prudente',
    description:
      'Sei tranche in 150 giorni per ridurre il rischio di timing; il capitale non ancora attivato resta temporaneamente parcheggiabile in XEON.',
    durationDays: 150,
    percentages: [25, 15, 15, 15, 15, 15],
    timings: [
      'T0',
      'T+30 giorni',
      'T+60 giorni',
      'T+90 giorni',
      'T+120 giorni',
      'T+150 giorni',
    ],
    triggers: [
      'Disponibilità effettiva del capitale e completamento dei blocchi di validazione.',
      'Ingresso programmato e verifica dell’assenza di nuovi fabbisogni familiari.',
      'Conferma di liquidità protetta, IPS e adeguatezza degli strumenti.',
      'Revisione intermedia del contesto, senza market timing discrezionale.',
      'Conferma di costi, KID e disponibilità degli strumenti presso il broker.',
      'Completamento del piano; ogni rinvio richiede una nuova decisione documentata.',
    ],
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

  private normalizeOptionalText(
    value: string | null | undefined,
    maximumLength: number,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = value.trim();

    if (normalized.length > maximumLength) {
      throw new BadRequestException(
        `Il testo non può superare ${maximumLength} caratteri.`,
      );
    }

    return normalized.length > 0 ? normalized : null;
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
        classificationMode: item.classificationMode,
        lookThroughAllocation: item.lookThroughAllocation,
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

  private getEntryScenarioDefinition(
    code: string,
  ): EntryScenarioDefinition | null {
    return ENTRY_SCENARIOS.find((scenario) => scenario.code === code) ?? null;
  }

  private validateTranchePercentages(
    scenario: EntryScenarioDefinition,
    percentages: number[],
  ): number[] {
    if (
      !Array.isArray(percentages) ||
      percentages.length !== scenario.percentages.length
    ) {
      throw new BadRequestException(
        `Lo scenario ${scenario.label} richiede ${scenario.percentages.length} tranche.`,
      );
    }

    const normalized = percentages.map((value) =>
      this.roundPercentage(Number(value)),
    );

    if (
      normalized.some(
        (value) => !Number.isFinite(value) || value <= 0 || value > 100,
      )
    ) {
      throw new BadRequestException(
        'Ogni tranche deve avere una percentuale maggiore di zero e non superiore al 100%.',
      );
    }

    const total = this.roundPercentage(
      normalized.reduce((sum, value) => sum + value, 0),
    );

    if (Math.abs(total - 100) > 0.0001) {
      throw new BadRequestException(
        `Le percentuali delle tranche devono totalizzare 100%. Totale corrente: ${total}%.`,
      );
    }

    return normalized;
  }

  private buildEntryScenario(
    definition: EntryScenarioDefinition,
    allocation: AllocationRow[],
    investibleCapital: number,
    customPercentages?: number[],
  ) {
    const percentages = customPercentages
      ? this.validateTranchePercentages(definition, customPercentages)
      : definition.percentages;
    const perClass = new Map<string, number[]>();

    for (const item of allocation) {
      let allocated = 0;

      const amounts = percentages.map((percentage, index) => {
        if (index === percentages.length - 1) {
          return this.roundMoney(item.newCapitalAmount - allocated);
        }

        const amount = this.roundMoney(
          item.newCapitalAmount * (percentage / 100),
        );

        allocated = this.roundMoney(allocated + amount);

        return amount;
      });

      perClass.set(item.code, amounts);
    }

    let cumulativeAmount = 0;
    const tranches = percentages.map((percentage, index) => {
      const orders = allocation
        .map((item) => ({
          assetClass: item.code,
          label: item.label,
          amount: perClass.get(item.code)?.[index] ?? 0,
        }))
        .filter((item) => item.amount > 0);
      const amount = this.roundMoney(
        orders.reduce((sum, order) => sum + order.amount, 0),
      );

      cumulativeAmount = this.roundMoney(cumulativeAmount + amount);

      return {
        number: index + 1,
        percentage,
        timing: definition.timings[index],
        trigger: definition.triggers[index],
        amount,
        cumulativeAmount,
        temporaryParkingAfter: this.roundMoney(
          Math.max(0, investibleCapital - cumulativeAmount),
        ),
        orders,
      };
    });
    const allocatedCapital = this.roundMoney(
      tranches.reduce((sum, tranche) => sum + tranche.amount, 0),
    );

    return {
      code: definition.code,
      label: definition.label,
      description: definition.description,
      durationDays: definition.durationDays,
      percentages,
      allocatedCapital,
      reconciled: allocatedCapital === this.roundMoney(investibleCapital),
      temporaryParking: {
        ticker: 'XEON',
        isin: 'LU0290358497',
        role: 'Parcheggio temporaneo massimo del capitale non ancora attivato; non modifica l’allocazione strategica finale.',
      },
      tranches,
    };
  }

  private validateProjectedIps(recommendation: EntryPlanRecommendation): {
    assessed: boolean;
    withinLimits: boolean | null;
    breaches: Array<{
      code: string;
      label: string;
      projectedWeight: number;
      minimum: number | null;
      maximum: number | null;
      direction: 'BELOW_MINIMUM' | 'ABOVE_MAXIMUM';
    }>;
  } {
    if (!recommendation.dataQuality.complianceAvailable) {
      return {
        assessed: false,
        withinLimits: null,
        breaches: [],
      };
    }

    const breaches: Array<{
      code: string;
      label: string;
      projectedWeight: number;
      minimum: number | null;
      maximum: number | null;
      direction: 'BELOW_MINIMUM' | 'ABOVE_MAXIMUM';
    }> = [];

    for (const proposed of recommendation.allocation.proposed) {
      const ipsClass = recommendation.allocation.current.find(
        (item) => item.code === proposed.code,
      );

      if (!ipsClass || proposed.projectedWeight === null) {
        continue;
      }

      if (
        ipsClass.minimum !== null &&
        proposed.projectedWeight < ipsClass.minimum
      ) {
        breaches.push({
          code: proposed.code,
          label: proposed.label,
          projectedWeight: proposed.projectedWeight,
          minimum: ipsClass.minimum,
          maximum: ipsClass.maximum,
          direction: 'BELOW_MINIMUM',
        });

        continue;
      }

      if (
        ipsClass.maximum !== null &&
        proposed.projectedWeight > ipsClass.maximum
      ) {
        breaches.push({
          code: proposed.code,
          label: proposed.label,
          projectedWeight: proposed.projectedWeight,
          minimum: ipsClass.minimum,
          maximum: ipsClass.maximum,
          direction: 'ABOVE_MAXIMUM',
        });
      }
    }

    return {
      assessed: true,
      withinLimits: breaches.length === 0,
      breaches,
    };
  }

  private buildEntryPlanResponse(
    recommendation: EntryPlanRecommendation,
    storedPlan: StoredEntryPlan | null,
    staleSavedPlan: boolean,
  ) {
    const storedScenario = storedPlan
      ? this.getEntryScenarioDefinition(storedPlan.selectedScenario)
      : null;
    const selectedScenario = storedScenario?.code ?? 'BASE';
    let storedPercentages: number[] | undefined;
    const warnings: string[] = [
      'Il piano è una bozza operativa: non genera né trasmette ordini.',
      'Fiscalità El Toro e capitale definitivamente investibile restano NEEDS_VALIDATION fino alla validazione professionale.',
      'Il parcheggio XEON è temporaneo e deve essere verificato per KID, costi, fiscalità, adeguatezza e disponibilità presso il broker.',
    ];

    if (storedPlan && !staleSavedPlan && storedScenario) {
      try {
        storedPercentages = this.validateTranchePercentages(
          storedScenario,
          this.parseJson<number[]>(storedPlan.tranchePercentagesJson),
        );
      } catch {
        warnings.unshift(
          'La ripartizione salvata non è più valida ed è stata sostituita con quella predefinita.',
        );
      }
    }

    if (staleSavedPlan) {
      warnings.unshift(
        'Il piano salvato appartiene a una proposta precedente: selezione e tranche devono essere confermate sullo snapshot corrente.',
      );
    }

    const scenarios = ENTRY_SCENARIOS.map((definition) =>
      this.buildEntryScenario(
        definition,
        recommendation.allocation.proposed,
        recommendation.capitalPlan.investibleCapital,
        definition.code === selectedScenario ? storedPercentages : undefined,
      ),
    );
    const selected = scenarios.find(
      (scenario) => scenario.code === selectedScenario,
    );
    const ipsValidation = this.validateProjectedIps(recommendation);
    const scheduleReconciled = selected?.reconciled ?? false;
    const readyForProfessionalValidation =
      recommendation.isCurrent &&
      scheduleReconciled &&
      recommendation.status === 'NEEDS_VALIDATION';
    const derivedStatus = !recommendation.isCurrent
      ? 'DRAFT_STALE'
      : !scheduleReconciled
        ? 'DRAFT_INVALID'
        : ipsValidation.withinLimits === false
          ? 'DRAFT_NEEDS_IPS_REVIEW'
          : 'DRAFT_NEEDS_PROFESSIONAL_VALIDATION';

    return {
      planVersion: ENTRY_PLAN_VERSION,
      recommendationId: recommendation.id,
      saved:
        storedPlan !== null &&
        !staleSavedPlan &&
        storedPlan.recommendationSnapshotId === recommendation.id,
      selectedScenario,
      scenarios,
      fundingAccount: staleSavedPlan
        ? null
        : (storedPlan?.fundingAccount ?? null),
      executionBroker: staleSavedPlan
        ? null
        : (storedPlan?.executionBroker ?? null),
      notes: staleSavedPlan ? null : (storedPlan?.notes ?? null),
      status: storedPlan && !staleSavedPlan ? storedPlan.status : derivedStatus,
      updatedAt:
        storedPlan && !staleSavedPlan
          ? storedPlan.updatedAt.toISOString()
          : null,
      fiscalStatus: recommendation.fiscalStatus,
      execution: {
        automatedExecution: false,
        status: 'BLOCKED' as const,
        blockingReason:
          'La fiscalità resta NEEDS_VALIDATION e la bozza deve essere approvata professionalmente prima di qualunque ordine.',
      },
      validation: {
        investibleCapital: recommendation.capitalPlan.investibleCapital,
        allocatedCapital: selected?.allocatedCapital ?? 0,
        scheduleReconciled,
        ips: ipsValidation,
        readyForProfessionalValidation,
      },
      warnings,
    };
  }

  private emptyDueDiligenceChecks(): Record<DueDiligenceCheckCode, boolean> {
    return {
      KID_AND_DOCUMENTS: false,
      STRUCTURE: false,
      COSTS: false,
      SIZE_AND_LIQUIDITY: false,
      OVERLAP: false,
    };
  }

  private emptyBrokerExecutionEvidence(): BrokerExecutionEvidence {
    return {
      observedAt: null,
      venue: null,
      bid: null,
      ask: null,
      referenceOrderAmount: null,
      commissionAmount: null,
      regularSession: false,
      notes: null,
    };
  }

  private emptyBrokerExecution(): Record<BrokerCode, BrokerExecutionEvidence> {
    return {
      FINECO: this.emptyBrokerExecutionEvidence(),
      INTERACTIVE_BROKERS: this.emptyBrokerExecutionEvidence(),
    };
  }

  private emptyDocumentaryReview(): DocumentaryReview {
    return {
      acknowledged: false,
      packVersion: null,
      reviewedAt: null,
    };
  }

  private defaultDueDiligenceReviews(
    recommendation: EntryPlanRecommendation,
  ): DueDiligenceReview[] {
    const amounts = new Map(
      recommendation.allocation.proposed.map((item) => [
        item.code,
        item.newCapitalAmount,
      ]),
    );

    return DUE_DILIGENCE_INSTRUMENTS.map((instrument) => ({
      isin: instrument.isin,
      selected:
        instrument.role === 'PRIMARY' &&
        (amounts.get(instrument.assetClass) ?? 0) > 0,
      preferredBroker: null,
      checks: this.emptyDueDiligenceChecks(),
      documentReview: this.emptyDocumentaryReview(),
      brokerAvailability: {
        FINECO: 'NOT_VERIFIED',
        INTERACTIVE_BROKERS: 'NOT_VERIFIED',
      },
      brokerExecution: this.emptyBrokerExecution(),
      notes: null,
    }));
  }

  private brokerExecutionEvidenceComplete(
    evidence: BrokerExecutionEvidence | undefined,
  ): boolean {
    return Boolean(
      evidence?.regularSession &&
      evidence.observedAt &&
      evidence.venue &&
      evidence.bid !== null &&
      evidence.bid > 0 &&
      evidence.ask !== null &&
      evidence.ask >= evidence.bid &&
      evidence.referenceOrderAmount !== null &&
      evidence.referenceOrderAmount > 0 &&
      evidence.commissionAmount !== null &&
      evidence.commissionAmount >= 0,
    );
  }

  private effectiveBrokerAvailability(
    instrument: DueDiligenceInstrument,
    review: DueDiligenceReview,
    broker: BrokerCode,
  ): EffectiveBrokerAvailability {
    const userStatus = review.brokerAvailability[broker];

    if (userStatus !== 'NOT_VERIFIED') {
      return userStatus;
    }

    return (
      instrument.brokerRoutes.find((route) => route.broker === broker)
        ?.publicStatus ?? 'NOT_VERIFIED'
    );
  }

  private documentaryReviewComplete(review: DueDiligenceReview): boolean {
    const checksComplete = DUE_DILIGENCE_CHECKS.every(
      (check) => review.checks[check.code],
    );

    if (!checksComplete) {
      return false;
    }

    const instrument = DUE_DILIGENCE_INSTRUMENTS.find(
      (candidate) => candidate.isin === review.isin,
    );
    const pack = instrument?.documentPack;

    if (!pack) {
      return true;
    }

    return Boolean(
      review.documentReview.acknowledged &&
      review.documentReview.reviewedAt &&
      review.documentReview.packVersion === pack.version,
    );
  }

  private dueDiligenceStatus(
    recommendation: EntryPlanRecommendation,
    reviews: DueDiligenceReview[],
  ) {
    const requiredAssetClasses = recommendation.allocation.proposed
      .filter((item) => item.newCapitalAmount > 0)
      .map((item) => item.code)
      .filter((code) =>
        DUE_DILIGENCE_INSTRUMENTS.some(
          (instrument) => instrument.assetClass === code,
        ),
      );
    const selectedByClass = new Map<string, DueDiligenceReview>();

    for (const assetClass of requiredAssetClasses) {
      const selected = reviews.filter((review) => {
        const instrument = DUE_DILIGENCE_INSTRUMENTS.find(
          (candidate) => candidate.isin === review.isin,
        );

        return instrument?.assetClass === assetClass && review.selected;
      });

      if (selected.length === 1) {
        selectedByClass.set(assetClass, selected[0]);
      }
    }

    const selectionComplete =
      requiredAssetClasses.length > 0 &&
      selectedByClass.size === requiredAssetClasses.length;
    const selectedReviews = Array.from(selectedByClass.values());
    const checklistComplete =
      selectionComplete &&
      selectedReviews.every((review) => this.documentaryReviewComplete(review));
    const brokerRoutingComplete =
      selectionComplete &&
      selectedReviews.every((review) => {
        if (!review.preferredBroker) {
          return false;
        }

        const instrument = DUE_DILIGENCE_INSTRUMENTS.find(
          (candidate) => candidate.isin === review.isin,
        );

        if (!instrument) {
          return false;
        }

        const status = this.effectiveBrokerAvailability(
          instrument,
          review,
          review.preferredBroker,
        );

        return (
          (status === 'PUBLICLY_CONFIRMED' || status === 'USER_CONFIRMED') &&
          this.brokerExecutionEvidenceComplete(
            review.brokerExecution?.[review.preferredBroker],
          )
        );
      });
    const status = !selectionComplete
      ? 'DRAFT_SELECTION'
      : !checklistComplete
        ? 'DRAFT_DUE_DILIGENCE'
        : !brokerRoutingComplete
          ? 'DRAFT_BROKER_VERIFICATION'
          : 'READY_FOR_PROFESSIONAL_REVIEW';

    return {
      status,
      requiredAssetClasses,
      selectedByClass,
      selectionComplete,
      checklistComplete,
      brokerRoutingComplete,
      progress: {
        requiredAssetClasses: requiredAssetClasses.length,
        selectedAssetClasses: selectedByClass.size,
        completedChecklists: selectedReviews.filter((review) =>
          this.documentaryReviewComplete(review),
        ).length,
        brokerRoutesConfirmed: selectedReviews.filter((review) => {
          if (!review.preferredBroker) {
            return false;
          }

          const instrument = DUE_DILIGENCE_INSTRUMENTS.find(
            (candidate) => candidate.isin === review.isin,
          );

          if (!instrument) {
            return false;
          }

          const routeStatus = this.effectiveBrokerAvailability(
            instrument,
            review,
            review.preferredBroker,
          );

          return (
            (routeStatus === 'PUBLICLY_CONFIRMED' ||
              routeStatus === 'USER_CONFIRMED') &&
            this.brokerExecutionEvidenceComplete(
              review.brokerExecution?.[review.preferredBroker],
            )
          );
        }).length,
      },
    };
  }

  private buildDueDiligenceRoutingPreview(
    recommendation: EntryPlanRecommendation,
    entryPlan: StoredEntryPlan | null,
    reviews: DueDiligenceReview[],
  ) {
    const storedScenario =
      entryPlan?.recommendationSnapshotId === recommendation.id
        ? this.getEntryScenarioDefinition(entryPlan.selectedScenario)
        : null;
    const scenarioDefinition =
      storedScenario ?? this.getEntryScenarioDefinition('BASE');
    let percentages: number[] | undefined;

    if (entryPlan && storedScenario) {
      try {
        percentages = this.validateTranchePercentages(
          storedScenario,
          this.parseJson<number[]>(entryPlan.tranchePercentagesJson),
        );
      } catch {
        percentages = undefined;
      }
    }

    if (!scenarioDefinition) {
      return null;
    }

    const scenario = this.buildEntryScenario(
      scenarioDefinition,
      recommendation.allocation.proposed,
      recommendation.capitalPlan.investibleCapital,
      percentages,
    );
    const selectedByAssetClass = new Map<
      string,
      {
        instrument: DueDiligenceInstrument;
        review: DueDiligenceReview;
      }
    >();

    for (const review of reviews.filter((item) => item.selected)) {
      const instrument = DUE_DILIGENCE_INSTRUMENTS.find(
        (candidate) => candidate.isin === review.isin,
      );

      if (instrument) {
        selectedByAssetClass.set(instrument.assetClass, {
          instrument,
          review,
        });
      }
    }

    return {
      source: entryPlan ? 'SAVED_ENTRY_PLAN' : 'BASE_SCENARIO_REFERENCE',
      scenario: {
        code: scenario.code,
        label: scenario.label,
        fundingAccount:
          entryPlan?.recommendationSnapshotId === recommendation.id
            ? entryPlan.fundingAccount
            : null,
      },
      tranches: scenario.tranches.map((tranche) => ({
        number: tranche.number,
        timing: tranche.timing,
        amount: tranche.amount,
        orders: tranche.orders.map((order) => {
          const selected = selectedByAssetClass.get(order.assetClass);
          const preferredBroker = selected?.review.preferredBroker ?? null;
          const brokerStatus =
            selected && preferredBroker
              ? this.effectiveBrokerAvailability(
                  selected.instrument,
                  selected.review,
                  preferredBroker,
                )
              : 'NOT_VERIFIED';
          const routeReady =
            brokerStatus === 'PUBLICLY_CONFIRMED' ||
            brokerStatus === 'USER_CONFIRMED';

          return {
            assetClass: order.assetClass,
            label: order.label,
            amount: order.amount,
            ticker: selected?.instrument.ticker ?? null,
            isin: selected?.instrument.isin ?? null,
            broker: preferredBroker,
            brokerStatus,
            routeStatus:
              selected && preferredBroker && routeReady
                ? 'READY_FOR_REVIEW'
                : 'BLOCKED',
          };
        }),
      })),
    };
  }

  private async getDueDiligencePortfolioOverlap(): Promise<
    Record<DueDiligenceInstrument['assetClass'], DueDiligencePortfolioOverlap>
  > {
    const overview = await this.ipsClassificationService.getOverview();
    const assetClasses: DueDiligenceInstrument['assetClass'][] = [
      'BONDS',
      'MONEY_MARKET',
      'GOLD',
    ];

    return assetClasses.reduce(
      (result, assetClass) => {
        const positions = overview.items
          .flatMap<DueDiligencePortfolioOverlap['positions'][number]>(
            (item) => {
              if (item.ipsAssetClass === assetClass) {
                return [
                  {
                    code: item.code,
                    name: item.name,
                    exposureValue: item.valueBase,
                    exposurePercentageOfPosition: 100,
                    classificationMode: 'SINGLE_CLASS' as const,
                  },
                ];
              }

              if (item.classificationMode !== 'LOOK_THROUGH') {
                return [];
              }

              const component = item.lookThroughAllocation.find(
                (allocation) => allocation.ipsAssetClass === assetClass,
              );

              if (!component || component.percentage <= 0) {
                return [];
              }

              return [
                {
                  code: item.code,
                  name: item.name,
                  exposureValue: this.roundMoney(
                    item.valueBase * (component.percentage / 100),
                  ),
                  exposurePercentageOfPosition: component.percentage,
                  classificationMode: 'LOOK_THROUGH' as const,
                },
              ];
            },
          )
          .filter((position) => position.exposureValue > 0)
          .sort((first, second) => second.exposureValue - first.exposureValue);
        const existingExposure = this.roundMoney(
          positions.reduce(
            (total, position) => total + position.exposureValue,
            0,
          ),
        );

        result[assetClass] = {
          existingExposure,
          positionCount: positions.length,
          positions,
          assessment:
            positions.length === 0
              ? 'Nessuna esposizione esistente classificata nella stessa classe IPS.'
              : `${positions.length} posizioni contribuiscono già alla classe IPS per ${existingExposure.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}. La stessa classe non dimostra una sovrapposizione dei singoli titoli: verificare indice e portafoglio sottostante prima di chiudere il controllo.`,
        };

        return result;
      },
      {} as Record<
        DueDiligenceInstrument['assetClass'],
        DueDiligencePortfolioOverlap
      >,
    );
  }

  private buildDueDiligenceResponse(
    recommendation: EntryPlanRecommendation,
    storedPlan: StoredDueDiligencePlan | null,
    entryPlan: StoredEntryPlan | null,
    staleSavedPlan: boolean,
    portfolioOverlap: Record<
      DueDiligenceInstrument['assetClass'],
      DueDiligencePortfolioOverlap
    >,
  ) {
    let reviews = this.defaultDueDiligenceReviews(recommendation);
    const warnings = [
      'La selezione è una shortlist di lavoro: non costituisce un ordine né un giudizio definitivo di adeguatezza.',
      'Le evidenze documentali non completano automaticamente la checklist: la presa visione deve essere registrata sulla versione corrente del fascicolo.',
      'La disponibilità presso il broker è considerata confermata solo da una fonte pubblica sullo specifico ISIN o da una verifica effettuata nel conto.',
      'Fiscalità El Toro e trattamento fiscale degli strumenti restano soggetti a validazione professionale.',
    ];

    if (storedPlan && !staleSavedPlan) {
      try {
        const parsed = this.parseJson<DueDiligenceReview[]>(
          storedPlan.reviewsJson,
        );
        const storedByIsin = new Map(
          parsed.map((review) => [review.isin, review]),
        );

        reviews = reviews.map((review) => {
          const stored = storedByIsin.get(review.isin);

          if (!stored) {
            return review;
          }

          return {
            ...review,
            ...stored,
            checks: {
              ...review.checks,
              ...stored.checks,
            },
            documentReview: {
              ...review.documentReview,
              ...stored.documentReview,
            },
            brokerAvailability: {
              ...review.brokerAvailability,
              ...stored.brokerAvailability,
            },
            brokerExecution: {
              FINECO: {
                ...review.brokerExecution.FINECO,
                ...stored.brokerExecution?.FINECO,
              },
              INTERACTIVE_BROKERS: {
                ...review.brokerExecution.INTERACTIVE_BROKERS,
                ...stored.brokerExecution?.INTERACTIVE_BROKERS,
              },
            },
          };
        });
      } catch {
        warnings.unshift(
          'La revisione salvata non è leggibile ed è stata sostituita con la shortlist iniziale.',
        );
      }
    }

    if (staleSavedPlan) {
      warnings.unshift(
        'La due diligence salvata appartiene a una proposta precedente: selezioni e verifiche devono essere ripetute sullo snapshot corrente.',
      );
    }

    const amounts = new Map(
      recommendation.allocation.proposed.map((item) => [
        item.code,
        item.newCapitalAmount,
      ]),
    );
    const validation = this.dueDiligenceStatus(recommendation, reviews);
    const instruments = DUE_DILIGENCE_INSTRUMENTS.map((instrument) => {
      const review = reviews.find((item) => item.isin === instrument.isin);

      if (!review) {
        throw new Error(
          `Revisione due diligence mancante per ${instrument.isin}.`,
        );
      }

      return {
        ...instrument,
        proposedAmount: amounts.get(instrument.assetClass) ?? 0,
        portfolioOverlap: portfolioOverlap[instrument.assetClass],
        review,
        brokerRoutes: instrument.brokerRoutes.map((route) => ({
          ...route,
          userStatus: review.brokerAvailability[route.broker],
          effectiveStatus: this.effectiveBrokerAvailability(
            instrument,
            review,
            route.broker,
          ),
        })),
      };
    });

    return {
      dueDiligenceVersion: DUE_DILIGENCE_VERSION,
      recommendationId: recommendation.id,
      saved:
        storedPlan !== null &&
        !staleSavedPlan &&
        storedPlan.recommendationSnapshotId === recommendation.id,
      status: validation.status,
      notes: staleSavedPlan ? null : (storedPlan?.notes ?? null),
      updatedAt:
        storedPlan && !staleSavedPlan
          ? storedPlan.updatedAt.toISOString()
          : null,
      checks: DUE_DILIGENCE_CHECKS,
      instruments,
      validation: {
        selectionComplete: validation.selectionComplete,
        checklistComplete: validation.checklistComplete,
        brokerRoutingComplete: validation.brokerRoutingComplete,
        progress: validation.progress,
      },
      routingPreview: this.buildDueDiligenceRoutingPreview(
        recommendation,
        entryPlan,
        reviews,
      ),
      execution: {
        automatedExecution: false,
        status: 'BLOCKED' as const,
        blockingReasons: [
          'Fiscalità El Toro: NEEDS_VALIDATION.',
          'Compatibilità fiscale e adeguatezza degli strumenti da validare professionalmente.',
          'Quantità, prezzi limite e ordini non vengono generati o trasmessi.',
        ],
      },
      warnings,
    };
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
      fiscalStatus: 'NEEDS_VALIDATION' as const,
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

  async getElToroEntryPlan() {
    const recommendationResponse = await this.getLatestElToroRecommendation();
    const recommendation = recommendationResponse.recommendation;

    if (!recommendation) {
      return {
        plan: null,
      };
    }

    const storedPlan =
      await this.prisma.investmentRecommendationPlan.findUnique({
        where: {
          sourcePropertyCode: EL_TORO_PROPERTY_CODE,
        },
      });
    const staleSavedPlan =
      storedPlan !== null &&
      storedPlan.recommendationSnapshotId !== recommendation.id;

    return {
      plan: this.buildEntryPlanResponse(
        recommendation,
        storedPlan,
        staleSavedPlan,
      ),
    };
  }

  async updateElToroEntryPlan(input: UpdateElToroEntryPlanInput) {
    const recommendationResponse = await this.getLatestElToroRecommendation();
    const recommendation = recommendationResponse.recommendation;

    if (!recommendation) {
      throw new BadRequestException(
        'Genera prima una proposta di investimento El Toro.',
      );
    }

    if (
      !input ||
      typeof input.recommendationId !== 'string' ||
      input.recommendationId !== recommendation.id
    ) {
      throw new BadRequestException(
        'La bozza non corrisponde all’ultima proposta. Ricarica il Recommendation Engine.',
      );
    }

    if (!recommendation.isCurrent) {
      throw new BadRequestException(
        'La proposta non è più allineata agli input correnti. Rigenerala prima di salvare il piano.',
      );
    }

    if (recommendation.status !== 'NEEDS_VALIDATION') {
      throw new BadRequestException(
        'Il piano può essere salvato solo dopo avere completato capitale, classificazione IPS e aggiornamento mercati.',
      );
    }

    const scenario = this.getEntryScenarioDefinition(input.selectedScenario);

    if (!scenario) {
      throw new BadRequestException(
        'Seleziona uno scenario di ingresso valido.',
      );
    }

    const percentages = this.validateTranchePercentages(
      scenario,
      input.tranchePercentages,
    );
    const scenarioPlan = this.buildEntryScenario(
      scenario,
      recommendation.allocation.proposed,
      recommendation.capitalPlan.investibleCapital,
      percentages,
    );

    if (!scenarioPlan.reconciled) {
      throw new BadRequestException(
        'Gli importi delle tranche non riconciliano con il capitale core investibile.',
      );
    }

    const ipsValidation = this.validateProjectedIps(recommendation);
    const status =
      ipsValidation.withinLimits === false
        ? 'DRAFT_NEEDS_IPS_REVIEW'
        : 'DRAFT_NEEDS_PROFESSIONAL_VALIDATION';
    const savedPlan = await this.prisma.investmentRecommendationPlan.upsert({
      where: {
        sourcePropertyCode: EL_TORO_PROPERTY_CODE,
      },
      update: {
        recommendationSnapshotId: recommendation.id,
        selectedScenario: scenario.code,
        tranchePercentagesJson: JSON.stringify(percentages),
        fundingAccount: this.normalizeOptionalText(input.fundingAccount, 120),
        executionBroker: this.normalizeOptionalText(input.executionBroker, 120),
        notes: this.normalizeOptionalText(input.notes, 2_000),
        status,
      },
      create: {
        id: 1,
        sourcePropertyCode: EL_TORO_PROPERTY_CODE,
        recommendationSnapshotId: recommendation.id,
        selectedScenario: scenario.code,
        tranchePercentagesJson: JSON.stringify(percentages),
        fundingAccount: this.normalizeOptionalText(input.fundingAccount, 120),
        executionBroker: this.normalizeOptionalText(input.executionBroker, 120),
        notes: this.normalizeOptionalText(input.notes, 2_000),
        status,
      },
    });

    return {
      plan: this.buildEntryPlanResponse(recommendation, savedPlan, false),
    };
  }

  async getElToroDueDiligence() {
    const recommendationResponse = await this.getLatestElToroRecommendation();
    const recommendation = recommendationResponse.recommendation;

    if (!recommendation) {
      return {
        dueDiligence: null,
      };
    }

    const [storedPlan, entryPlan, portfolioOverlap] = await Promise.all([
      this.prisma.investmentDueDiligencePlan.findUnique({
        where: {
          sourcePropertyCode: EL_TORO_PROPERTY_CODE,
        },
      }),
      this.prisma.investmentRecommendationPlan.findUnique({
        where: {
          sourcePropertyCode: EL_TORO_PROPERTY_CODE,
        },
      }),
      this.getDueDiligencePortfolioOverlap(),
    ]);
    const staleSavedPlan =
      storedPlan !== null &&
      storedPlan.recommendationSnapshotId !== recommendation.id;

    return {
      dueDiligence: this.buildDueDiligenceResponse(
        recommendation,
        storedPlan,
        entryPlan,
        staleSavedPlan,
        portfolioOverlap,
      ),
    };
  }

  async updateElToroDueDiligence(input: UpdateElToroDueDiligenceInput) {
    const recommendationResponse = await this.getLatestElToroRecommendation();
    const recommendation = recommendationResponse.recommendation;

    if (!recommendation) {
      throw new BadRequestException(
        'Genera prima una proposta di investimento El Toro.',
      );
    }

    if (
      !input ||
      typeof input.recommendationId !== 'string' ||
      input.recommendationId !== recommendation.id
    ) {
      throw new BadRequestException(
        'La due diligence non corrisponde all’ultima proposta. Ricarica il Recommendation Engine.',
      );
    }

    if (!recommendation.isCurrent) {
      throw new BadRequestException(
        'La proposta non è più allineata agli input correnti. Rigenerala prima di salvare la due diligence.',
      );
    }

    if (recommendation.status !== 'NEEDS_VALIDATION') {
      throw new BadRequestException(
        'La due diligence può essere salvata solo dopo avere completato capitale, classificazione IPS e aggiornamento mercati.',
      );
    }

    if (!Array.isArray(input.reviews)) {
      throw new BadRequestException(
        'Le revisioni degli strumenti non sono valide.',
      );
    }

    const defaults = this.defaultDueDiligenceReviews(recommendation);
    const reviewsByIsin = new Map(
      defaults.map((review) => [review.isin, review]),
    );
    const seen = new Set<string>();
    const brokerCodes: BrokerCode[] = ['FINECO', 'INTERACTIVE_BROKERS'];
    const allowedBrokerStatuses: UserBrokerAvailability[] = [
      'NOT_VERIFIED',
      'USER_CONFIRMED',
      'NOT_AVAILABLE',
    ];

    for (const candidate of input.reviews) {
      if (
        !candidate ||
        typeof candidate.isin !== 'string' ||
        !reviewsByIsin.has(candidate.isin)
      ) {
        throw new BadRequestException(
          'La revisione contiene uno strumento non presente nella shortlist corrente.',
        );
      }

      if (seen.has(candidate.isin)) {
        throw new BadRequestException(
          `Lo strumento ${candidate.isin} è presente più di una volta.`,
        );
      }

      seen.add(candidate.isin);

      const preferredBroker =
        candidate.preferredBroker === null ||
        candidate.preferredBroker === undefined
          ? null
          : candidate.preferredBroker;

      if (preferredBroker !== null && !brokerCodes.includes(preferredBroker)) {
        throw new BadRequestException(
          `Broker preferito non valido per ${candidate.isin}.`,
        );
      }

      const brokerAvailability = brokerCodes.reduce(
        (result, broker) => {
          const value =
            candidate.brokerAvailability?.[broker] ?? 'NOT_VERIFIED';

          if (!allowedBrokerStatuses.includes(value)) {
            throw new BadRequestException(
              `Stato broker non valido per ${candidate.isin}.`,
            );
          }

          result[broker] = value;

          return result;
        },
        {} as Record<BrokerCode, UserBrokerAvailability>,
      );
      const brokerExecution = brokerCodes.reduce(
        (result, broker) => {
          const raw = candidate.brokerExecution?.[broker] ?? {};
          const numericValue = (
            value: unknown,
            label: string,
            allowZero = false,
          ): number | null => {
            if (value === null || value === undefined || value === '') {
              return null;
            }

            const normalized =
              typeof value === 'string'
                ? value.trim().replace(',', '.')
                : value;
            const parsed = Number(normalized);

            if (
              !Number.isFinite(parsed) ||
              (allowZero ? parsed < 0 : parsed <= 0)
            ) {
              throw new BadRequestException(
                `${label} non valido per ${candidate.isin} (${broker}).`,
              );
            }

            return parsed;
          };
          const bid = numericValue(raw.bid, 'Bid');
          const ask = numericValue(raw.ask, 'Ask');

          if (bid !== null && ask !== null && ask < bid) {
            throw new BadRequestException(
              `Ask inferiore al bid per ${candidate.isin} (${broker}).`,
            );
          }

          let observedAt: string | null = null;

          if (raw.observedAt) {
            const parsedDate = new Date(raw.observedAt);

            if (Number.isNaN(parsedDate.getTime())) {
              throw new BadRequestException(
                `Data quotazione non valida per ${candidate.isin} (${broker}).`,
              );
            }

            observedAt = parsedDate.toISOString();
          }

          result[broker] = {
            observedAt,
            venue: this.normalizeOptionalText(raw.venue, 100),
            bid,
            ask,
            referenceOrderAmount: numericValue(
              raw.referenceOrderAmount,
              'Importo ordine di riferimento',
            ),
            commissionAmount: numericValue(
              raw.commissionAmount,
              'Commissione',
              true,
            ),
            regularSession: raw.regularSession === true,
            notes: this.normalizeOptionalText(raw.notes, 500),
          };

          return result;
        },
        {} as Record<BrokerCode, BrokerExecutionEvidence>,
      );

      if (
        preferredBroker &&
        brokerAvailability[preferredBroker] === 'NOT_AVAILABLE'
      ) {
        throw new BadRequestException(
          `Il broker preferito risulta non disponibile per ${candidate.isin}.`,
        );
      }

      const checks = DUE_DILIGENCE_CHECKS.reduce(
        (result, check) => {
          result[check.code] = candidate.checks?.[check.code] === true;

          return result;
        },
        {} as Record<DueDiligenceCheckCode, boolean>,
      );
      const instrument = DUE_DILIGENCE_INSTRUMENTS.find(
        (item) => item.isin === candidate.isin,
      );
      let documentReview = this.emptyDocumentaryReview();

      if (candidate.documentReview?.acknowledged === true) {
        if (!instrument?.documentPack) {
          throw new BadRequestException(
            `Nessun fascicolo documentale versionato disponibile per ${candidate.isin}.`,
          );
        }

        if (
          candidate.documentReview.packVersion !==
          instrument.documentPack.version
        ) {
          throw new BadRequestException(
            `Il fascicolo documentale di ${instrument.ticker} è stato aggiornato. Ripeti la presa visione.`,
          );
        }

        if (!DUE_DILIGENCE_CHECKS.every((check) => checks[check.code])) {
          throw new BadRequestException(
            `Completa tutte le verifiche documentali di ${instrument.ticker} prima di registrare la presa visione.`,
          );
        }

        const reviewedAt = candidate.documentReview.reviewedAt
          ? new Date(candidate.documentReview.reviewedAt)
          : new Date();

        if (
          Number.isNaN(reviewedAt.getTime()) ||
          reviewedAt.getTime() > Date.now() + 5 * 60 * 1_000
        ) {
          throw new BadRequestException(
            `Data di revisione documentale non valida per ${instrument.ticker}.`,
          );
        }

        documentReview = {
          acknowledged: true,
          packVersion: instrument.documentPack.version,
          reviewedAt: reviewedAt.toISOString(),
        };
      }

      reviewsByIsin.set(candidate.isin, {
        isin: candidate.isin,
        selected: candidate.selected === true,
        preferredBroker,
        checks,
        documentReview,
        brokerAvailability,
        brokerExecution,
        notes: this.normalizeOptionalText(candidate.notes, 1_000),
      });
    }

    const reviews = Array.from(reviewsByIsin.values());
    const amounts = new Map(
      recommendation.allocation.proposed.map((item) => [
        item.code,
        item.newCapitalAmount,
      ]),
    );

    for (const instrument of DUE_DILIGENCE_INSTRUMENTS) {
      const review = reviewsByIsin.get(instrument.isin);

      if (review?.selected && (amounts.get(instrument.assetClass) ?? 0) <= 0) {
        throw new BadRequestException(
          `Non è possibile selezionare ${instrument.ticker}: la proposta non assegna capitale alla relativa classe IPS.`,
        );
      }
    }

    for (const assetClass of ['BONDS', 'MONEY_MARKET', 'GOLD'] as const) {
      const selected = DUE_DILIGENCE_INSTRUMENTS.filter(
        (instrument) =>
          instrument.assetClass === assetClass &&
          reviewsByIsin.get(instrument.isin)?.selected,
      );

      if (selected.length > 1) {
        throw new BadRequestException(
          `Seleziona al massimo uno strumento per ${selected[0].assetClassLabel}.`,
        );
      }
    }

    const validation = this.dueDiligenceStatus(recommendation, reviews);
    const savedPlan = await this.prisma.investmentDueDiligencePlan.upsert({
      where: {
        sourcePropertyCode: EL_TORO_PROPERTY_CODE,
      },
      update: {
        recommendationSnapshotId: recommendation.id,
        reviewsJson: JSON.stringify(reviews),
        notes: this.normalizeOptionalText(input.notes, 2_000),
        status: validation.status,
      },
      create: {
        id: 1,
        sourcePropertyCode: EL_TORO_PROPERTY_CODE,
        recommendationSnapshotId: recommendation.id,
        reviewsJson: JSON.stringify(reviews),
        notes: this.normalizeOptionalText(input.notes, 2_000),
        status: validation.status,
      },
    });
    const [entryPlan, portfolioOverlap] = await Promise.all([
      this.prisma.investmentRecommendationPlan.findUnique({
        where: {
          sourcePropertyCode: EL_TORO_PROPERTY_CODE,
        },
      }),
      this.getDueDiligencePortfolioOverlap(),
    ]);

    return {
      dueDiligence: this.buildDueDiligenceResponse(
        recommendation,
        savedPlan,
        entryPlan,
        false,
        portfolioOverlap,
      ),
    };
  }
}
