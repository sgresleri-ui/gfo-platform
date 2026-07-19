const API_URL = "http://localhost:3000";

export type DashboardSummary = {
  netWorth: number;
  liquidity: number;
  investments: number;
  realEstate: number;
  otherAssets: number;
  liabilities: number;
  currency: string;
  asOfDate: string | null;
  positionCount: number;
};

export type WealthPosition = {
  id: number;
  code: string;
  name: string;
  category: string;
  subcategory: string | null;
  country: string | null;
  currency: string;
  nativeAmount: number | null;
  fxRateToBase: number | null;
  valueBase: number;
  baseCurrency: string;
  isLiability: boolean;
  valuationDate: string;
  source: string;
  status: string;
  notes: string | null;
};

export type WealthRegistryResponse = {
  household: {
    id: number;
    name: string;
    currency: string;
  };
  positions: WealthPosition[];
  count: number;
};

async function readJson<T>(
  response: Response,
  errorMessage: string,
): Promise<T> {
  if (!response.ok) {
    throw new Error(`${errorMessage}: HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getDashboard(): Promise<DashboardSummary> {
  const response = await fetch(`${API_URL}/dashboard`);

  return readJson<DashboardSummary>(
    response,
    "Unable to load dashboard",
  );
}

export async function getWealthRegistry(): Promise<WealthRegistryResponse> {
  const response = await fetch(`${API_URL}/wealth`);

  return readJson<WealthRegistryResponse>(
    response,
    "Unable to load wealth registry",
  );
}

export async function analyzeWorkbook() {
  const response = await fetch(`${API_URL}/import`, {
    method: "POST",
  });

  return readJson(
    response,
    "Unable to analyze workbook",
  );
}

export type InvestmentPosition = {
  id: number;
  code: string;
  name: string;
  portfolio: string;
  isin: string | null;
  market: string | null;
  instrumentType: string;
  currency: string;
  quantity: number | null;
  marketPrice: number | null;
  marketValue: number;
  weight: number;
  valuationDate: string;
  source: string;
};

export type InvestmentGroup = {
  name: string;
  value: number;
  positionCount: number;
  weight: number;
};

export type InvestmentPortfolioResponse = {
  household: {
    id: number;
    name: string;
    currency: string;
  };

  summary: {
    totalValue: number;
    positionCount: number;
    portfolioCount: number;
    etfCount: number;
    etfValue: number;
    etfWeight: number;
    topFiveValue: number;
    topFiveConcentration: number;
  };

  asOfDate: string | null;
  portfolios: InvestmentGroup[];
  instrumentTypes: InvestmentGroup[];
  topPositions: InvestmentPosition[];
  positions: InvestmentPosition[];
};

export async function getInvestmentPortfolio(): Promise<InvestmentPortfolioResponse> {
  const response = await fetch(`${API_URL}/investments`);

  return readJson<InvestmentPortfolioResponse>(
    response,
    "Unable to load investment portfolio",
  );
}

export type LiquidityAccount = {
  id: number;
  code: string;
  name: string;
  institution: string;
  accountType: string;
  country: string | null;
  currency: string;
  nativeAmount: number | null;
  fxRateToBase: number | null;
  valueBase: number;
  baseCurrency: string;
  weight: number;
  valuationDate: string;
  source: string;
  notes: string | null;
};

export type LiquidityAllocationGroup = {
  name: string;
  value: number;
  accountCount: number;
  weight: number;
};

export type LiquidityOverviewResponse = {
  household: {
    id: number;
    name: string;
    currency: string;
  };

  summary: {
    totalLiquidity: number;
    accountCount: number;
    institutionCount: number;
    largestAccountValue: number;
    largestAccountWeight: number;
    topThreeValue: number;
    topThreeConcentration: number;
    foreignCurrencyValue: number;
    foreignCurrencyWeight: number;
  };

  asOfDate: string | null;
  institutions: LiquidityAllocationGroup[];
  currencies: LiquidityAllocationGroup[];
  countries: LiquidityAllocationGroup[];
  accounts: LiquidityAccount[];

  dataQuality: {
    missingNativeValueCount: number;
    missingNativeValues: string[];
    warnings: string[];
  };
};

export async function getLiquidityOverview(): Promise<LiquidityOverviewResponse> {
  const response = await fetch(`${API_URL}/liquidity`);

  return readJson<LiquidityOverviewResponse>(
    response,
    "Unable to load liquidity overview",
  );
}

export type PropertyRecord = {
  id: number;
  code: string;
  name: string;
  country: string | null;
  currency: string;
  grossValue: number;
  debt: number;
  netEquity: number;
  ltv: number;
  status: "OWNED" | "HELD_FOR_SALE";
  historicalCost: number | null;
  differenceFromHistoricalCost: number | null;
  expectedClosingDate: string | null;
  liabilityName: string | null;
  liabilityType: string | null;
  valuationDate: string;
  source: string;
  notes: string | null;
};

export type PropertyCountryAllocation = {
  name: string;
  grossValue: number;
  netEquity: number;
  propertyCount: number;
  weight: number;
};

export type PropertiesOverviewResponse = {
  household: {
    id: number;
    name: string;
    currency: string;
  };

  summary: {
    grossValue: number;
    debt: number;
    netEquity: number;
    propertyCount: number;
    weightedLtv: number;
    heldForSaleValue: number;
    heldForSaleCount: number;
    highestLtv: number;
    highestLtvProperty: string | null;
  };

  asOfDate: string | null;
  countries: PropertyCountryAllocation[];
  properties: PropertyRecord[];
};

export async function getPropertiesOverview(): Promise<PropertiesOverviewResponse> {
  const response = await fetch(`${API_URL}/properties`);

  return readJson<PropertiesOverviewResponse>(
    response,
    "Unable to load properties overview",
  );
}

export type AnnualBudgetComparison = {
  year: number;
  scenario: "BUDGET" | "FORECAST";
  ordinaryExpenses: number;
  extraordinaryExpenses: number;
  totalExpenses: number;
  revenues: number;
  netCashFlow: number;
};

export type LongTermBudgetYear = {
  year: number;
  capitalStart: number | null;
  totalCosts: number;
  totalRevenues: number;
  netCashFlow: number;
  capitalEnd: number | null;
};

export type BudgetOverviewResponse = {
  workbook: string;
  asOfDate: string;

  annualComparison: AnnualBudgetComparison[];

  longTerm: {
    startYear: number | null;
    endYear: number | null;
    yearCount: number;
    averageNetCashFlow: number;
    minimumCapital: number | null;
    minimumCapitalYear: number | null;
    firstNegativeCapitalYear: number | null;
    years: LongTermBudgetYear[];
  };

  warnings: string[];
};

export async function getBudgetOverview(): Promise<BudgetOverviewResponse> {
  const response = await fetch(`${API_URL}/budget`);

  return readJson<BudgetOverviewResponse>(
    response,
    "Unable to load budget overview",
  );
}

export type PlatformSettingsInput = {
  householdName: string;
  ownerName: string;
  baseCurrency: string;
  timezone: string;
  fiscalResidence: string;
  plannedFiscalResidence: string;
  sourceWorkbook: string;
  dataFolder: string;
  automaticRefresh: boolean;
  showArchivedPositions: boolean;
  requireDecisionNotes: boolean;
};

export type PlatformSettingsResponse =
  PlatformSettingsInput & {
    id: number;
    createdAt: string;
    updatedAt: string;
  };

export async function getPlatformSettings(): Promise<PlatformSettingsResponse> {
  const response = await fetch(`${API_URL}/settings`);

  return readJson<PlatformSettingsResponse>(
    response,
    "Unable to load platform settings",
  );
}

export async function updatePlatformSettings(
  settings: PlatformSettingsInput,
): Promise<PlatformSettingsResponse> {
  const response = await fetch(
    `${API_URL}/settings`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    },
  );

  return readJson<PlatformSettingsResponse>(
    response,
    "Unable to update platform settings",
  );
}

export async function resetPlatformSettings(): Promise<PlatformSettingsResponse> {
  const response = await fetch(
    `${API_URL}/settings/reset`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return readJson<PlatformSettingsResponse>(
    response,
    "Unable to reset platform settings",
  );
}

export type DecisionStatus =
  | "APPROVED"
  | "IN_PROGRESS"
  | "MONITORING";

export type DecisionPriority =
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export type DecisionCategory =
  | "POLICY"
  | "PROPERTY"
  | "PLANNING"
  | "PLATFORM"
  | "INVESTMENT"
  | "LIQUIDITY"
  | "TAX";

export type DecisionEntry = {
  id: string;
  date: string;
  decisionDate: string;
  title: string;
  category: DecisionCategory;
  status: DecisionStatus;
  priority: DecisionPriority;
  motivation: string;
  analysis: string;
  alternatives: string[];
  finalDecision: string;
  impact: string;
  amount: number | null;
  result: string;
  lessons: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type DecisionsOverviewResponse = {
  summary: {
    total: number;
    approved: number;
    inProgress: number;
    monitoring: number;
    highPriority: number;
  };

  decisions: DecisionEntry[];
};

export type CreateDecisionRequest = {
  date: string;
  title: string;
  category: DecisionCategory;
  status: DecisionStatus;
  priority: DecisionPriority;
  motivation: string;
  analysis: string;
  alternatives: string[];
  finalDecision: string;
  impact: string;
  amount: number | null;
  result: string;
  lessons: string;
};

export async function getDecisionsOverview(): Promise<DecisionsOverviewResponse> {
  const response = await fetch(
    `${API_URL}/decisions`,
  );

  return readJson<DecisionsOverviewResponse>(
    response,
    "Unable to load decisions",
  );
}

export async function createDecision(
  input: CreateDecisionRequest,
): Promise<DecisionEntry> {
  const response = await fetch(
    `${API_URL}/decisions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return readJson<DecisionEntry>(
    response,
    "Unable to create decision",
  );
}

export type DataCatalogSourceStatus =
  | "HEALTHY"
  | "WARNING"
  | "ERROR";

export type DataQualityStatus =
  | "PASS"
  | "WARNING"
  | "FAIL";

export type DataCatalogSource = {
  id: string;
  name: string;
  type: string;
  status: DataCatalogSourceStatus;
  location: string;
  lastUpdated: string | null;
  records: number;
  description: string;
};

export type DataQualityCheck = {
  id: string;
  title: string;
  status: DataQualityStatus;
  message: string;
  count: number | null;
};

export type DataCatalogOverviewResponse = {
  generatedAt: string;

  summary: {
    sourceCount: number;
    healthySources: number;
    warningSources: number;
    errorSources: number;
    activePositions: number;
    archivedPositions: number;
    decisionEntries: number;
    qualityScore: number;
    latestValuationDate: string | null;
  };

  categories: Array<{
    name: string;
    count: number;
  }>;

  origins: Array<{
    name: string;
    count: number;
  }>;

  sources: DataCatalogSource[];
  qualityChecks: DataQualityCheck[];
};

export async function getDataCatalogOverview(): Promise<DataCatalogOverviewResponse> {
  const response = await fetch(
    `${API_URL}/data-catalog`,
  );

  return readJson<DataCatalogOverviewResponse>(
    response,
    "Unable to load data catalog",
  );
}

export type ImportRunStatus =
  | "PREVIEW_READY"
  | "COMPARISON_READY"
  | "BLOCKED"
  | "FAILED"
  | "IMPORTED"
  | "ROLLED_BACK";

export type ImportCheckStatus =
  | "PASS"
  | "WARNING"
  | "FAIL";

export type ImportPreviewCheck = {
  id: string;
  title: string;
  status: ImportCheckStatus;
  message: string;
};

export type ImportPreviewDetails = {
  safeToContinue: boolean;
  duplicateFile: boolean;
  previousMatchingRunId: string | null;
  sheetNames: string[];
  requiredSheets: string[];
  missingSheets: string[];
  checks: ImportPreviewCheck[];

  summary: {
    blockingErrors: number;
    warnings: number;
    sheetCount: number;
    activePositions: number;
    archivedPositions: number;
  };

  nextStep: string;
};

export type ImportRun = {
  id: string;
  fileName: string;
  filePath: string;
  fileHash: string;
  fileSize: number;
  workbookModifiedAt: string | null;
  status: ImportRunStatus;
  sheetCount: number;
  activePositions: number;
  archivedPositions: number;
  preview: ImportPreviewDetails | Record<string, never>;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type ImportStatusResponse = {
  exists: boolean;
  fileName: string;
  configuredFolder: string;
  workbookPath: string;
  message?: string;
  fileHash?: string;
  fileSize?: number;
  workbookModifiedAt?: string;
  alreadyAnalyzed?: boolean;
  latestMatchingRun?: ImportRun | null;
};

export type ImportHistoryResponse = {
  count: number;
  runs: ImportRun[];
};

export async function getImportStatus(): Promise<ImportStatusResponse> {
  const response = await fetch(
    `${API_URL}/imports/status`,
  );

  return readJson<ImportStatusResponse>(
    response,
    "Unable to load import status",
  );
}

export async function getImportHistory(): Promise<ImportHistoryResponse> {
  const response = await fetch(
    `${API_URL}/imports`,
  );

  return readJson<ImportHistoryResponse>(
    response,
    "Unable to load import history",
  );
}

export async function createImportPreview(): Promise<ImportRun> {
  const response = await fetch(
    `${API_URL}/imports/preview`,
    {
      method: "POST",
    },
  );

  return readJson<ImportRun>(
    response,
    "Unable to create import preview",
  );
}

export type ImportComparisonStatus =
  | "UNCHANGED"
  | "MODIFIED"
  | "NEW"
  | "MISSING_IN_WORKBOOK"
  | "PROTECTED_MANUAL";

export type ImportFieldDifference = {
  field: string;
  databaseValue: string | number | null;
  workbookValue: string | number | null;
};

export type ImportComparisonItem = {
  code: string;
  name: string;
  category: string;
  status: ImportComparisonStatus;
  databaseValue: number | null;
  workbookValue: number | null;
  difference: number | null;
  source: string;
  origin: string | null;
  differences: ImportFieldDifference[];
};

export type ImportComparisonResponse = {
  runId: string;
  status: "COMPARISON_READY";

  comparison: {
    generatedAt: string;
    fileName: string;
    fileHash: string;

    summary: {
      extractedPositions: number;
      unchanged: number;
      modified: number;
      new: number;
      missingInWorkbook: number;
      protectedManual: number;
      databaseManagedValue: number;
      workbookValue: number;
      valueDifference: number;
      requiresReview: boolean;
    };

    items: ImportComparisonItem[];
  };
};

export async function createImportComparison(): Promise<ImportComparisonResponse> {
  const response = await fetch(
    `${API_URL}/imports/compare`,
    {
      method: "POST",
    },
  );

  return readJson<ImportComparisonResponse>(
    response,
    "Unable to compare workbook and database",
  );
}

export type ImportApplicationResponse = {
  runId: string;
  status: "IMPORTED";
  snapshotId: string;

  summary: {
    importedAt: string;
    snapshotId: string;
    appliedPositions: number;
    unchanged: number;
    modified: number;
    created: number;
    archived: number;
    protectedManual: number;
    valueDifference: number;
  };
};

export type ImportRollbackResponse = {
  runId: string;
  status: "ROLLED_BACK";
  snapshotId: string;
  restoredPositions: number;
};

export type WealthSnapshotSummary = {
  id: string;
  snapshotType: string;
  reason: string;
  sourceRunId: string | null;
  activePositions: number;
  archivedPositions: number;
  netValue: number;
  createdAt: string;
  restoredAt: string | null;
};

export type WealthSnapshotsResponse = {
  count: number;
  snapshots: WealthSnapshotSummary[];
};

export async function applyControlledImport(): Promise<ImportApplicationResponse> {
  const response = await fetch(
    `${API_URL}/imports/apply`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        confirm: true,
      }),
    },
  );

  return readJson<ImportApplicationResponse>(
    response,
    "Unable to apply controlled import",
  );
}

export async function rollbackControlledImport(
  runId: string,
): Promise<ImportRollbackResponse> {
  const response = await fetch(
    `${API_URL}/imports/${runId}/rollback`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        confirm: true,
      }),
    },
  );

  return readJson<ImportRollbackResponse>(
    response,
    "Unable to restore the pre-import snapshot",
  );
}

export async function getWealthSnapshots(): Promise<WealthSnapshotsResponse> {
  const response = await fetch(
    `${API_URL}/imports/snapshots`,
  );

  return readJson<WealthSnapshotsResponse>(
    response,
    "Unable to load wealth snapshots",
  );
}

export type LedgerNetWorthSnapshot = {
  id: string;
  snapshotDate: string;
  source: string;
  importRunId: string | null;
  dataHash: string;
  positionCount: number;
  grossAssets: number;
  liabilities: number;
  netWorth: number;
  liquidity: number;
  investments: number;
  realEstate: number;
  otherAssets: number;
  changeAbsolute: number | null;
  changePercent: number | null;
  createdAt: string;
};

export type LedgerHistoryResponse = {
  count: number;
  snapshots: LedgerNetWorthSnapshot[];
};

export type LedgerSummaryResponse = {
  transactions: number;
  snapshots: number;
  valuations: number;
  latestSnapshot: LedgerNetWorthSnapshot | null;
};

export type LedgerCaptureResponse = {
  created: boolean;
  reason?: string;
  valuationsCreated?: number;
  snapshot: LedgerNetWorthSnapshot;
};

export async function getLedgerSummary(): Promise<LedgerSummaryResponse> {
  const response = await fetch(
    `${API_URL}/ledger/summary`,
  );

  return readJson<LedgerSummaryResponse>(
    response,
    "Unable to load ledger summary",
  );
}

export async function getLedgerNetWorthHistory(
  limit = 1000,
): Promise<LedgerHistoryResponse> {
  const response = await fetch(
    `${API_URL}/ledger/net-worth?limit=${limit}`,
  );

  return readJson<LedgerHistoryResponse>(
    response,
    "Unable to load net worth history",
  );
}

export async function captureLedgerCurrentState(): Promise<LedgerCaptureResponse> {
  const response = await fetch(
    `${API_URL}/ledger/capture`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        confirm: true,
      }),
    },
  );

  return readJson<LedgerCaptureResponse>(
    response,
    "Unable to capture current wealth state",
  );
}

export type LedgerTransactionType = {
  code: string;
  label: string;
  direction: "INFLOW" | "OUTFLOW" | "TRANSFER";
  positionRecommended: boolean;
};

export type LedgerTransactionTypesResponse = {
  types: LedgerTransactionType[];
};

export type LedgerPositionOption = {
  code: string;
  name: string;
  category: string;
  subcategory: string | null;
  currency: string;
};

export type LedgerPositionsResponse = {
  count: number;
  positions: LedgerPositionOption[];
};

export type LedgerTransaction = {
  id: string;
  transactionDate: string;
  transactionType: string;
  direction: "INFLOW" | "OUTFLOW" | "TRANSFER";

  position: {
    code: string;
    name: string;
  } | null;

  quantity: number | null;
  unitPrice: number | null;
  grossAmount: number;
  fees: number;
  taxes: number;
  netAmount: number;
  currency: string;
  fxRateToBase: number | null;
  baseAmount: number;
  baseCurrency: string;
  sourceAccountCode: string | null;
  destinationAccountCode: string | null;
  source: string;
  status: string;
  externalReference: string | null;
  notes: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
};

export type LedgerTransactionsResponse = {
  count: number;
  transactions: LedgerTransaction[];
};

export type LedgerTransactionSummary = {
  transactions: number;
  inflows: number;
  outflows: number;
  transfers: number;
  netCashFlow: number;
  fees: number;
  taxes: number;
};

export type CreateLedgerTransactionPayload = {
  confirm: boolean;
  transactionDate: string;
  transactionType: string;
  positionCode?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  grossAmount: number;
  fees?: number;
  taxes?: number;
  currency?: string;
  fxRateToBase?: number | null;
  sourceAccountCode?: string | null;
  destinationAccountCode?: string | null;
  source?: string;
  externalReference?: string | null;
  notes?: string | null;
};

export type CreateLedgerTransactionResponse = {
  created: boolean;
  transaction: LedgerTransaction;
};

export async function getLedgerTransactionTypes(): Promise<LedgerTransactionTypesResponse> {
  const response = await fetch(
    `${API_URL}/ledger/transaction-types`,
  );

  return readJson<LedgerTransactionTypesResponse>(
    response,
    "Unable to load transaction types",
  );
}

export async function getLedgerPositions(): Promise<LedgerPositionsResponse> {
  const response = await fetch(
    `${API_URL}/ledger/positions`,
  );

  return readJson<LedgerPositionsResponse>(
    response,
    "Unable to load ledger positions",
  );
}

export async function getLedgerTransactions(
  limit = 500,
): Promise<LedgerTransactionsResponse> {
  const response = await fetch(
    `${API_URL}/ledger/transactions?limit=${limit}`,
  );

  return readJson<LedgerTransactionsResponse>(
    response,
    "Unable to load ledger transactions",
  );
}

export async function getLedgerTransactionSummary(): Promise<LedgerTransactionSummary> {
  const response = await fetch(
    `${API_URL}/ledger/transactions/summary`,
  );

  return readJson<LedgerTransactionSummary>(
    response,
    "Unable to load transaction summary",
  );
}

export async function createLedgerTransaction(
  payload: CreateLedgerTransactionPayload,
): Promise<CreateLedgerTransactionResponse> {
  const response = await fetch(
    `${API_URL}/ledger/transactions`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    },
  );

  return readJson<CreateLedgerTransactionResponse>(
    response,
    "Unable to create ledger transaction",
  );
}

export type VoidLedgerTransactionResponse = {
  voided: boolean;
  transaction: LedgerTransaction;
};

export async function voidLedgerTransaction(
  transactionId: string,
  reason: string,
): Promise<VoidLedgerTransactionResponse> {
  const response = await fetch(
    `${API_URL}/ledger/transactions/${transactionId}/void`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        confirm: true,
        reason,
      }),
    },
  );

  return readJson<VoidLedgerTransactionResponse>(
    response,
    "Unable to void ledger transaction",
  );
}

export type PerformancePeriodSnapshot = {
  id: string;
  snapshotDate: string;
  source: string;
  netWorth: number;
};

export type PerformancePeriodsResponse = {
  count: number;
  snapshots: PerformancePeriodSnapshot[];
};

export type PerformanceSnapshot = {
  id: string;
  snapshotDate: string;
  source: string;
  importRunId: string | null;
  positionCount: number;
  grossAssets: number;
  liabilities: number;
  netWorth: number;
  liquidity: number;
  investments: number;
  realEstate: number;
  otherAssets: number;
};

export type PerformanceSummaryResponse = {
  methodology: {
    name: string;
    currency: string;
    description: string;
  };

  period: {
    start: string;
    end: string;
    days: number;
  };

  startSnapshot: PerformanceSnapshot;
  endSnapshot: PerformanceSnapshot;

  performance: {
    startingNetWorth: number;
    endingNetWorth: number;
    netWorthChange: number;
    contributions: number;
    withdrawals: number;
    netExternalFlow: number;
    weightedExternalFlows: number;
    investmentResult: number;
    modifiedDietzReturn: number | null;
  };

  transactionAnalysis: {
    postedTransactions: number;
    investmentIncome: number;
    investmentExpenses: number;
    fees: number;
    taxes: number;
    internalTransfers: number;
    purchases: number;
    sales: number;
  };

  assetClassChanges: {
    liquidity: number;
    investments: number;
    realEstate: number;
    otherAssets: number;
    liabilities: number;
  };

  warnings: string[];
};

export async function getPerformancePeriods(): Promise<PerformancePeriodsResponse> {
  const response = await fetch(
    `${API_URL}/performance/periods`,
  );

  return readJson<PerformancePeriodsResponse>(
    response,
    "Unable to load performance periods",
  );
}

export async function getPerformanceSummary(
  from?: string,
  to?: string,
): Promise<PerformanceSummaryResponse> {
  const parameters =
    new URLSearchParams();

  if (from) {
    parameters.set("from", from);
  }

  if (to) {
    parameters.set("to", to);
  }

  const query =
    parameters.toString();

  const response = await fetch(
    `${API_URL}/performance/summary${
      query ? `?${query}` : ""
    }`,
  );

  return readJson<PerformanceSummaryResponse>(
    response,
    "Unable to load performance summary",
  );
}

export type RiskAssetClass = {
  category: string;
  label: string;
  positions: number;
  grossValue: number;
  netContribution: number;
  weightGrossAssets: number;
  weightNetWorth: number;
};

export type RiskExposure = {
  positions: number;
  value: number;
  weightGrossAssets: number;
};

export type RiskCountryExposure =
  RiskExposure & {
    country: string;
  };

export type RiskCurrencyExposure =
  RiskExposure & {
    currency: string;
  };

export type RiskTopPosition = {
  id: number;
  code: string;
  name: string;
  category: string;
  categoryLabel: string;
  subcategory: string | null;
  country: string | null;
  currency: string;
  valueBase: number;
  signedValue: number;
  isLiability: boolean;
  weightGrossAssets: number;
  weightNetWorth: number;
  source: string;
  valuationDate: string;
};

export type RiskOverviewResponse = {
  asOf: string;

  household: {
    id: number;
    name: string;
    baseCurrency: string;
  };

  summary: {
    positions: number;
    assetPositions: number;
    liabilityPositions: number;
    grossAssets: number;
    liabilities: number;
    netWorth: number;
    liquidity: number;
    investments: number;
    marketableAssets: number;
    realEstate: number;
    otherAssets: number;
  };

  ratios: {
    liquidityGrossAssets: number;
    investmentsGrossAssets: number;
    marketableGrossAssets: number;
    realEstateGrossAssets: number;
    liabilitiesGrossAssets: number;
    liabilitiesNetWorth: number;
    top1GrossAssets: number;
    top5GrossAssets: number;
    top10GrossAssets: number;
    hhi: number;
  };

  concentration: {
    top1Value: number;
    top5Value: number;
    top10Value: number;

    largestPosition: {
      code: string;
      name: string;
      valueBase: number;
      weightGrossAssets: number;
    } | null;

    largestAssetClass: {
      category: string;
      label: string;
      value: number;
      weightGrossAssets: number;
    } | null;
  };

  assetClasses: RiskAssetClass[];
  countryExposure: RiskCountryExposure[];
  currencyExposure: RiskCurrencyExposure[];
  topPositions: RiskTopPosition[];
};

export async function getRiskOverview(): Promise<RiskOverviewResponse> {
  const response = await fetch(
    `${API_URL}/risk/overview`,
  );

  return readJson<RiskOverviewResponse>(
    response,
    "Unable to load wealth risk overview",
  );
}

export type DataQualityIssue = {
  code: string;
  severity:
    | "ERROR"
    | "WARNING"
    | "INFO";
  message: string;
};

export type DataQualityItem = {
  id: number;
  code: string;
  name: string;
  category: string;
  subcategory: string | null;
  country: string | null;
  currency: string;
  valueBase: number;
  isLiability: boolean;
  source: string;
  valuationDate: string;
  ageDays: number;
  countryMissing: boolean;
  currencyMissing: boolean;
  futureValuationDate: boolean;
  issueCount: number;
  issues: DataQualityIssue[];
};

export type DataQualitySource = {
  source: string;
  positions: number;
  assetPositions: number;
  liabilityPositions: number;
  grossAssets: number;
  liabilities: number;
  netContribution: number;
};

export type DataQualityResponse = {
  asOf: string;

  household: {
    id: number;
    name: string;
    baseCurrency: string;
  };

  summary: {
    totalPositions: number;
    positionsWithIssues: number;
    positionsWithoutIssues: number;
    errorPositions: number;
    warningPositions: number;
    missingCountry: number;
    missingCurrency: number;
    futureValuationDates: number;
    countryCompleteness: number;
    currencyCompleteness: number;
  };

  freshness: {
    fresh30Days: number;
    age31To90Days: number;
    age91To180Days: number;
    olderThan180Days: number;
    fresh30DaysPercentage: number;
  };

  sources: DataQualitySource[];
  items: DataQualityItem[];
};

export async function getDataQuality(): Promise<DataQualityResponse> {
  const response = await fetch(
    `${API_URL}/risk/data-quality`,
  );

  return readJson<DataQualityResponse>(
    response,
    "Unable to load data quality analysis",
  );
}


export type DataQualityCorrectionRecord = {
  id: number;
  entityType: string;
  entityId: number;
  entityCode: string | null;
  fieldName: string;
  oldValue: string | null;
  newValue: string;
  reason: string;
  source: string;
  createdAt: string;
};

export type DataQualityCorrectionsResponse = {
  count: number;
  corrections: DataQualityCorrectionRecord[];
};

export type UpdatePositionCountryResponse = {
  corrected: boolean;

  position: {
    id: number;
    code: string;
    name: string;
    previousCountry: string | null;
    country: string | null;
    source: string;
  };

  audit: {
    id: number;
    fieldName: string;
    oldValue: string | null;
    newValue: string;
    reason: string;
    source: string;
    createdAt: string;
  };
};

export async function getDataQualityCorrections(): Promise<DataQualityCorrectionsResponse> {
  const response = await fetch(
    `${API_URL}/risk/data-quality/corrections`,
  );

  return readJson<DataQualityCorrectionsResponse>(
    response,
    "Unable to load data quality corrections",
  );
}

export async function updatePositionCountry(
  positionId: number,
  country: string,
  reason: string,
): Promise<UpdatePositionCountryResponse> {
  const response = await fetch(
    `${API_URL}/risk/data-quality/positions/${positionId}/country`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        country,
        reason,
        confirm: true,
      }),
    },
  );

  return readJson<UpdatePositionCountryResponse>(
    response,
    "Unable to update position country",
  );
}

export type IpsUnit =
  | "PERCENT"
  | "EUR";

export type IpsComplianceStatus =
  | "NOT_CONFIGURED"
  | "COMPLIANT"
  | "BELOW_MINIMUM"
  | "ABOVE_MAXIMUM";

export type IpsPolicyLimit = {
  code: string;
  label: string;
  dimension: string;
  unit: IpsUnit;
  description: string;
  minimum: number | null;
  maximum: number | null;
  target: number | null;
  enabled: boolean;
  rationale: string | null;
  source: string | null;
  updatedAt: string | null;
};

export type IpsLimitsResponse = {
  count: number;
  limits: IpsPolicyLimit[];
};

export type IpsComplianceAssessment =
  IpsPolicyLimit & {
    currentValue: number;
    status: IpsComplianceStatus;
    deviationFromTarget: number | null;
  };

export type IpsComplianceResponse = {
  asOf: string;

  summary: {
    total: number;
    configured: number;
    notConfigured: number;
    compliant: number;
    breaches: number;
  };

  assessments: IpsComplianceAssessment[];
};

export type UpdateIpsLimitPayload = {
  minimum: number | null;
  maximum: number | null;
  target: number | null;
  enabled: boolean;
  rationale: string | null;
};

export async function getIpsLimits(): Promise<IpsLimitsResponse> {
  const response = await fetch(
    `${API_URL}/ips/limits`,
  );

  return readJson<IpsLimitsResponse>(
    response,
    "Unable to load IPS limits",
  );
}

export async function getIpsCompliance(): Promise<IpsComplianceResponse> {
  const response = await fetch(
    `${API_URL}/ips/compliance`,
  );

  return readJson<IpsComplianceResponse>(
    response,
    "Unable to load IPS compliance",
  );
}

export async function updateIpsLimit(
  code: string,
  payload: UpdateIpsLimitPayload,
): Promise<{
  updated: boolean;
  limit: IpsPolicyLimit;
}> {
  const response = await fetch(
    `${API_URL}/ips/limits/${encodeURIComponent(code)}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        ...payload,
        confirm: true,
      }),
    },
  );

  return readJson<{
    updated: boolean;
    limit: IpsPolicyLimit;
  }>(
    response,
    "Unable to update IPS limit",
  );
}

export type IpsAssetClassCode =
  | "EQUITY_GLOBAL"
  | "BONDS"
  | "MONEY_MARKET"
  | "GOLD"
  | "ALTERNATIVES"
  | "OPERATING_CASH";


export type IpsReviewStatus =
  | "PENDING_INFORMATION"
  | "DEFERRED";

export type IpsAllocationStatus =
  | "DATA_INCOMPLETE"
  | "NOT_APPLICABLE"
  | "COMPLIANT"
  | "BELOW_MINIMUM"
  | "ABOVE_MAXIMUM";


export type IpsRebalanceAction =
  | "INCREASE"
  | "REDUCE"
  | "INCREASE_TOWARD_TARGET"
  | "REDUCE_TOWARD_TARGET"
  | "HOLD";

export type IpsClassificationAllocation = {
  code: IpsAssetClassCode;
  label: string;
  strategic: boolean;
  target: number | null;
  minimum: number | null;
  maximum: number | null;
  value: number;
  weight: number | null;
  status: IpsAllocationStatus;

  targetValue: number | null;
  minimumValue: number | null;
  maximumValue: number | null;
  gapToTarget: number | null;
  rebalanceAction: IpsRebalanceAction | null;
};

export type IpsClassificationItem = {
  positionId: number;
  code: string;
  name: string;
  category: string;
  subcategory: string | null;
  currency: string;
  valueBase: number;
  ipsAssetClass: IpsAssetClassCode | null;
  source: string | null;
  rationale: string | null;
  updatedAt: string | null;

  suggestedClass: IpsAssetClassCode | null;

  suggestionConfidence:
    | "HIGH"
    | "MEDIUM"
    | null;

  suggestionReason: string | null;

  reviewStatus: IpsReviewStatus | null;
  reviewNote: string | null;
  reviewUpdatedAt: string | null;
};

export type IpsClassificationOverviewResponse = {
  policy: {
    name: string;
    effectiveDate: string;
    denominator: string;
    note: string;
  };

  summary: {
    positions: number;
    classifiedPositions: number;
    unclassifiedPositions: number;
    suggestedPositions: number;
    pendingInformationPositions: number;
    deferredPositions: number;
    totalFinancialValue: number;
    classifiedValue: number;
    unclassifiedValue: number;
    strategicValue: number;
    operatingCashValue: number;
    coveragePercentage: number;
    complianceAvailable: boolean;
    rebalanceAvailable: boolean;
  };

  allocation: IpsClassificationAllocation[];
  items: IpsClassificationItem[];
};

export type IpsClassificationAudit = {
  id: number;
  positionId: number;
  positionCode: string;
  oldClass: IpsAssetClassCode | null;
  newClass: IpsAssetClassCode;
  reason: string;
  source: string;
  createdAt: string;
};

export type IpsClassificationAuditResponse = {
  count: number;
  audits: IpsClassificationAudit[];
};


export type IpsClassificationReviewAudit = {
  id: number;
  positionId: number;
  positionCode: string;
  oldStatus: string | null;
  newStatus: string;
  note: string;
  source: string;
  createdAt: string;
};

export type IpsClassificationReviewAuditResponse = {
  count: number;
  audits: IpsClassificationReviewAudit[];
};

export async function getIpsClassifications(): Promise<IpsClassificationOverviewResponse> {
  const response = await fetch(
    `${API_URL}/ips/classifications`,
  );

  return readJson<IpsClassificationOverviewResponse>(
    response,
    "Unable to load IPS classifications",
  );
}

export async function getIpsClassificationAudit(): Promise<IpsClassificationAuditResponse> {
  const response = await fetch(
    `${API_URL}/ips/classifications/audit`,
  );

  return readJson<IpsClassificationAuditResponse>(
    response,
    "Unable to load IPS classification audit",
  );
}

export async function updateIpsPositionClassification(
  positionId: number,
  ipsAssetClass: IpsAssetClassCode,
  reason: string,
): Promise<{
  updated: boolean;
}> {
  const response = await fetch(
    `${API_URL}/ips/classifications/${positionId}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        ipsAssetClass,
        reason,
        confirm: true,
      }),
    },
  );

  return readJson<{
    updated: boolean;
  }>(
    response,
    "Unable to update IPS classification",
  );
}

export async function updateIpsPositionReview(
  positionId: number,
  status: IpsReviewStatus,
  note: string,
): Promise<{
  updated: boolean;
}> {
  const response = await fetch(
    `${API_URL}/ips/classifications/${positionId}/review`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        status,
        note,
        confirm: true,
      }),
    },
  );

  return readJson<{
    updated: boolean;
  }>(
    response,
    "Unable to update IPS review status",
  );
}

export async function getIpsClassificationReviewAudit(): Promise<IpsClassificationReviewAuditResponse> {
  const response = await fetch(
    `${API_URL}/ips/classifications/review-audit`,
  );

  return readJson<IpsClassificationReviewAuditResponse>(
    response,
    "Unable to load IPS review audit",
  );
}


export type OperationalTaskCategory =
  | "INVESTMENT"
  | "REBALANCING"
  | "TRANSFER"
  | "TAX"
  | "INSURANCE"
  | "PROPERTY"
  | "SUCCESSION"
  | "DOCUMENTATION"
  | "BANKING"
  | "IBKR"
  | "FINECO"
  | "PLATFORM";

export type OperationalTaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DEFERRED"
  | "CANCELLED";

export type OperationalTaskPriority =
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export type OperationalTask = {
  id: string;
  householdId: number;
  dueDate: string;
  title: string;
  category: OperationalTaskCategory;
  status: OperationalTaskStatus;
  priority: OperationalTaskPriority;
  description: string;
  linkedDocuments: string[];
  amount: number | null;
  notes: string | null;
  source: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OperationalCalendarResponse = {
  generatedAt: string;

  summary: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    overdue: number;
    dueNextThirtyDays: number;
    highPriorityOpen: number;
  };

  tasks: OperationalTask[];
};

export type CreateOperationalTaskRequest = {
  dueDate: string;
  title: string;
  category: OperationalTaskCategory;
  status?: OperationalTaskStatus;
  priority?: OperationalTaskPriority;
  description: string;
  linkedDocuments?: string[];
  amount?: number | null;
  notes?: string | null;
};

export type UpdateOperationalTaskRequest =
  Partial<CreateOperationalTaskRequest>;

export async function getOperationalCalendar(): Promise<OperationalCalendarResponse> {
  const response = await fetch(
    `${API_URL}/operational-calendar`,
  );

  return readJson<OperationalCalendarResponse>(
    response,
    "Unable to load operational calendar",
  );
}

export async function createOperationalTask(
  input: CreateOperationalTaskRequest,
): Promise<OperationalTask> {
  const response = await fetch(
    `${API_URL}/operational-calendar`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return readJson<OperationalTask>(
    response,
    "Unable to create operational task",
  );
}

export async function updateOperationalTask(
  id: string,
  input: UpdateOperationalTaskRequest,
): Promise<OperationalTask> {
  const response = await fetch(
    `${API_URL}/operational-calendar/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return readJson<OperationalTask>(
    response,
    "Unable to update operational task",
  );
}

export type DocumentCategory =
  | "BANKING"
  | "INVESTMENT"
  | "PROPERTY"
  | "TAX"
  | "INSURANCE"
  | "SUCCESSION"
  | "IDENTITY"
  | "CORPORATE"
  | "CONTRACT"
  | "PLATFORM"
  | "OTHER";

export type DocumentStatus =
  | "ACTIVE"
  | "DRAFT"
  | "EXPIRED"
  | "ARCHIVED";

export type DocumentConfidentiality =
  | "FAMILY"
  | "PRIVATE"
  | "RESTRICTED";

export type DocumentLink = {
  id: string;
  entityType: string;
  entityId: string;
  relationType: string;
  notes: string | null;
  createdAt: string;
};

export type DocumentRecord = {
  id: string;
  householdId: number;
  title: string;
  category: DocumentCategory;
  documentType: string;
  status: DocumentStatus;
  issuer: string | null;
  country: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  fileName: string | null;
  filePath: string | null;
  mimeType: string | null;
  fileSize: number | null;
  checksum: string | null;
  confidentiality: DocumentConfidentiality;
  notes: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  links: DocumentLink[];
};

export type DocumentsOverviewResponse = {
  generatedAt: string;

  summary: {
    total: number;
    active: number;
    draft: number;
    archived: number;
    expired: number;
    expiringWithinNinetyDays: number;
    missingFile: number;
    restricted: number;
    linked: number;
  };

  categories: Array<{
    name: string;
    count: number;
  }>;

  documents: DocumentRecord[];
};

export type CreateDocumentRequest = {
  title: string;
  category: DocumentCategory;
  documentType: string;
  status?: DocumentStatus;
  issuer?: string | null;
  country?: string | null;
  documentNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  checksum?: string | null;
  confidentiality?: DocumentConfidentiality;
  notes?: string | null;
};

export type UpdateDocumentRequest =
  Partial<CreateDocumentRequest>;

export async function getDocumentsOverview(): Promise<DocumentsOverviewResponse> {
  const response = await fetch(
    `${API_URL}/documents`,
  );

  return readJson<DocumentsOverviewResponse>(
    response,
    "Unable to load documents",
  );
}

export async function createDocument(
  input: CreateDocumentRequest,
): Promise<DocumentRecord> {
  const response = await fetch(
    `${API_URL}/documents`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return readJson<DocumentRecord>(
    response,
    "Unable to create document",
  );
}

export async function updateDocument(
  id: string,
  input: UpdateDocumentRequest,
): Promise<DocumentRecord> {
  const response = await fetch(
    `${API_URL}/documents/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return readJson<DocumentRecord>(
    response,
    "Unable to update document",
  );
}

export type DocumentFileUploadResponse = {
  id: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  checksum: string | null;
  updatedAt: string;
};

export async function uploadDocumentFile(
  documentId: string,
  file: File,
): Promise<DocumentFileUploadResponse> {
  const formData = new FormData();

  formData.append(
    "file",
    file,
  );

  const response = await fetch(
    `${API_URL}/documents/${documentId}/file`,
    {
      method: "POST",
      body: formData,
    },
  );

  return readJson<DocumentFileUploadResponse>(
    response,
    "Unable to upload document file",
  );
}

export function getDocumentFileUrl(
  documentId: string,
): string {
  return `${API_URL}/documents/${documentId}/file`;
}

export type DocumentFileRemovalResponse = {
  id: string;
  fileRemoved: boolean;
  physicalFileDeleted: boolean;
  updatedAt: string;
};

export type DeleteDocumentResponse = {
  id: string;
  deleted: boolean;
  physicalFileDeleted: boolean;
  warning: string | null;
};

export async function removeDocumentFile(
  documentId: string,
): Promise<DocumentFileRemovalResponse> {
  const response = await fetch(
    `${API_URL}/documents/${documentId}/file`,
    {
      method: "DELETE",
    },
  );

  return readJson<DocumentFileRemovalResponse>(
    response,
    "Unable to remove document file",
  );
}

export async function deleteDocumentRecord(
  documentId: string,
): Promise<DeleteDocumentResponse> {
  const response = await fetch(
    `${API_URL}/documents/${documentId}`,
    {
      method: "DELETE",
    },
  );

  return readJson<DeleteDocumentResponse>(
    response,
    "Unable to delete document",
  );
}

export type DocumentLinkEntityType =
  | "HOUSEHOLD"
  | "OPERATIONAL_TASK"
  | "DECISION"
  | "PROPERTY"
  | "ACCOUNT"
  | "POSITION";

export type DocumentLinkRelationType =
  | "PRIMARY"
  | "SUPPORTING"
  | "REFERENCE";

export type CreateDocumentLinkRequest = {
  entityType: DocumentLinkEntityType;
  entityId: string;
  relationType?: DocumentLinkRelationType;
  notes?: string | null;
};

export type DeleteDocumentLinkResponse = {
  id: string;
  documentId: string;
  deleted: boolean;
};

export async function createDocumentLink(
  documentId: string,
  input: CreateDocumentLinkRequest,
): Promise<DocumentLink> {
  const response = await fetch(
    `${API_URL}/documents/${documentId}/links`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return readJson<DocumentLink>(
    response,
    "Unable to create document link",
  );
}

export async function deleteDocumentLink(
  documentId: string,
  linkId: string,
): Promise<DeleteDocumentLinkResponse> {
  const response = await fetch(
    `${API_URL}/documents/${documentId}/links/${linkId}`,
    {
      method: "DELETE",
    },
  );

  return readJson<DeleteDocumentLinkResponse>(
    response,
    "Unable to delete document link",
  );
}


export type ExecutiveReportSectionStatus =
  | "AVAILABLE"
  | "UNAVAILABLE";

export type ExecutiveReportSection<T> = {
  status: ExecutiveReportSectionStatus;
  source: string;
  data: T | null;
  error: string | null;
};

export type ExecutiveReportResponse = {
  generatedAt: string;
  reportType: "FAMILY_OFFICE_EXECUTIVE";
  version: string;
  status: "COMPLETE" | "PARTIAL";

  completeness: {
    totalSections: number;
    availableSections: number;
    unavailableSections: number;
    percentage: number;
  };

  unavailableSectionNames: string[];

  sections: {
    wealthSummary:
      ExecutiveReportSection<DashboardSummary>;

    wealthRegistry:
      ExecutiveReportSection<WealthRegistryResponse>;

    investments:
      ExecutiveReportSection<InvestmentPortfolioResponse>;

    liquidity:
      ExecutiveReportSection<LiquidityOverviewResponse>;

    properties:
      ExecutiveReportSection<PropertiesOverviewResponse>;

    budget:
      ExecutiveReportSection<BudgetOverviewResponse>;

    performance:
      ExecutiveReportSection<PerformanceSummaryResponse>;

    risk:
      ExecutiveReportSection<RiskOverviewResponse>;

    dataQuality:
      ExecutiveReportSection<
        Record<string, unknown>
      >;

    operationalCalendar:
      ExecutiveReportSection<OperationalCalendarResponse>;

    documents:
      ExecutiveReportSection<DocumentsOverviewResponse>;

    dataCatalog:
      ExecutiveReportSection<
        Record<string, unknown>
      >;
  };
};

export async function getExecutiveReport(): Promise<ExecutiveReportResponse> {
  const response = await fetch(
    `${API_URL}/reports/executive`,
  );

  return readJson<ExecutiveReportResponse>(
    response,
    "Unable to load executive report",
  );
}

export type ExecutiveReportSnapshotSummary = {
  id: string;
  householdId: number;
  reportType: string;
  version: string;
  status: "COMPLETE" | "PARTIAL";
  generatedAt: string;
  completenessPercentage: number;
  totalSections: number;
  availableSections: number;
  unavailableSections: number;
  netWorth: number | null;
  grossAssets: number | null;
  liabilities: number | null;
  liquidity: number | null;
  investments: number | null;
  realEstate: number | null;
  otherAssets: number | null;
  currency: string;
  checksum: string;
  source: string;
  createdAt: string;
};

export type CreateExecutiveReportSnapshotResponse = {
  created: boolean;
  duplicate: boolean;
  snapshot: ExecutiveReportSnapshotSummary;
};

export type ExecutiveReportSnapshotsResponse = {
  generatedAt: string;
  count: number;
  snapshots: ExecutiveReportSnapshotSummary[];
};

export type ExecutiveReportSnapshotDetail =
  ExecutiveReportSnapshotSummary & {
    checksumVerified: boolean;
    payload: ExecutiveReportResponse | null;
  };

export async function createExecutiveReportSnapshot(): Promise<CreateExecutiveReportSnapshotResponse> {
  const response = await fetch(
    `${API_URL}/reports/executive/snapshots`,
    {
      method: "POST",
    },
  );

  return readJson<CreateExecutiveReportSnapshotResponse>(
    response,
    "Unable to save executive report snapshot",
  );
}

export async function getExecutiveReportSnapshots(): Promise<ExecutiveReportSnapshotsResponse> {
  const response = await fetch(
    `${API_URL}/reports/executive/snapshots`,
  );

  return readJson<ExecutiveReportSnapshotsResponse>(
    response,
    "Unable to load executive report snapshots",
  );
}

export async function getExecutiveReportSnapshot(
  id: string,
): Promise<ExecutiveReportSnapshotDetail> {
  const response = await fetch(
    `${API_URL}/reports/executive/snapshots/${id}`,
  );

  return readJson<ExecutiveReportSnapshotDetail>(
    response,
    "Unable to load executive report snapshot",
  );
}

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

export type PlanningScenarioBaselineResponse = {
  generatedAt: string;
  baselineType: "OFFICIAL_BUDGET";
  immutable: boolean;

  source: {
    workbook: string;
    asOfDate: string;
  };

  defaultAssumptions: {
    initialCapitalAdjustment: number;
    annualReturnAdjustmentPct: number;
    annualCostAdjustmentPct: number;
    annualRevenueAdjustmentPct: number;
    expenseInflationDeltaPct: number;
    events: PlanningScenarioEventInput[];
  };

  budget: BudgetOverviewResponse;
};

export type PlanningScenarioStatus =
  | "SUSTAINABLE"
  | "AT_RISK"
  | "UNSUSTAINABLE";

export type PlanningScenarioYear = {
  year: number;

  baseline: {
    capitalStart: number | null;
    totalCosts: number;
    totalRevenues: number;
    netCashFlow: number;
    capitalEnd: number | null;
  };

  scenario: {
    capitalStart: number;
    totalCosts: number;
    totalRevenues: number;
    costImpact: number;
    revenueImpact: number;
    returnImpact: number;
    eventImpact: number;
    netCashFlow: number;
    capitalEnd: number;
    deltaFromBaseline: number | null;
  };

  events: PlanningScenarioEventInput[];
};

export type PlanningScenarioResponse = {
  generatedAt: string;
  scenarioType: "DELTA_FROM_OFFICIAL_BASELINE";
  baselineImmutable: boolean;

  baselineSource: {
    workbook: string;
    asOfDate: string;
    startYear: number;
    endYear: number;
  };

  scenario: {
    name: string;
    description: string;

    assumptions: {
      name: string;
      description: string;
      initialCapitalAdjustment: number;
      annualReturnAdjustmentPct: number;
      annualCostAdjustmentPct: number;
      annualRevenueAdjustmentPct: number;
      expenseInflationDeltaPct: number;
      events: PlanningScenarioEventInput[];
    };
  };

  summary: {
    status: PlanningScenarioStatus;
    initialCapital: number;
    finalCapital: number;
    minimumCapital: number;
    minimumCapitalYear: number | null;
    firstNegativeCapitalYear: number | null;
    averageNetCashFlow: number;
    maximumDrawdownPct: number | null;
  };

  comparison: {
    baselineFinalCapital: number | null;
    scenarioFinalCapital: number;
    finalCapitalDelta: number | null;
    finalCapitalDeltaPct: number | null;
    baselineMinimumCapital: number | null;
    scenarioMinimumCapital: number;
  };

  warnings: string[];
  years: PlanningScenarioYear[];
};

export async function getPlanningScenarioBaseline(): Promise<PlanningScenarioBaselineResponse> {
  const response = await fetch(
    `${API_URL}/planning/scenarios/baseline`,
  );

  return readJson<PlanningScenarioBaselineResponse>(
    response,
    "Unable to load planning baseline",
  );
}

export async function simulatePlanningScenario(
  input: SimulatePlanningScenarioInput,
): Promise<PlanningScenarioResponse> {
  const response = await fetch(
    `${API_URL}/planning/scenarios/simulate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return readJson<PlanningScenarioResponse>(
    response,
    "Unable to simulate planning scenario",
  );
}

export type StoredPlanningScenarioSummary = {
  id: string;
  householdId: number;
  name: string;
  description: string | null;
  status: string;

  baseline: {
    workbook: string | null;
    asOfDate: string | null;
    startYear: number | null;
    endYear: number | null;
  };

  sustainabilityStatus:
    | PlanningScenarioStatus
    | null;

  initialCapital: number | null;
  finalCapital: number | null;
  minimumCapital: number | null;
  minimumCapitalYear: number | null;
  firstNegativeCapitalYear: number | null;
  finalCapitalDelta: number | null;
  finalCapitalDeltaPct: number | null;
  lastSimulatedAt: string | null;
  createdAt: string;
  updatedAt: string;

  assumptions:
    SimulatePlanningScenarioInput | null;
};

export type StoredPlanningScenarioDetail =
  StoredPlanningScenarioSummary & {
    lastResult:
      PlanningScenarioResponse | null;
  };

export type StoredPlanningScenariosResponse = {
  generatedAt: string;
  count: number;
  scenarios:
    StoredPlanningScenarioSummary[];
};

export type CreateStoredPlanningScenarioResponse = {
  created: boolean;
  scenario:
    StoredPlanningScenarioDetail;
};

export type RerunStoredPlanningScenarioResponse = {
  recalculated: boolean;
  scenario:
    StoredPlanningScenarioDetail;
};

export type ArchiveStoredPlanningScenarioResponse = {
  archived: boolean;
  scenario:
    StoredPlanningScenarioSummary;
};

export async function getStoredPlanningScenarios(): Promise<StoredPlanningScenariosResponse> {
  const response = await fetch(
    `${API_URL}/planning/scenarios`,
  );

  return readJson<StoredPlanningScenariosResponse>(
    response,
    "Unable to load stored planning scenarios",
  );
}

export async function createStoredPlanningScenario(
  input: SimulatePlanningScenarioInput,
): Promise<CreateStoredPlanningScenarioResponse> {
  const response = await fetch(
    `${API_URL}/planning/scenarios`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return readJson<CreateStoredPlanningScenarioResponse>(
    response,
    "Unable to save planning scenario",
  );
}

export async function getStoredPlanningScenario(
  id: string,
): Promise<StoredPlanningScenarioDetail> {
  const response = await fetch(
    `${API_URL}/planning/scenarios/${id}`,
  );

  return readJson<StoredPlanningScenarioDetail>(
    response,
    "Unable to load planning scenario",
  );
}

export async function rerunStoredPlanningScenario(
  id: string,
): Promise<RerunStoredPlanningScenarioResponse> {
  const response = await fetch(
    `${API_URL}/planning/scenarios/${id}/simulate`,
    {
      method: "POST",
    },
  );

  return readJson<RerunStoredPlanningScenarioResponse>(
    response,
    "Unable to recalculate planning scenario",
  );
}

export async function archiveStoredPlanningScenario(
  id: string,
): Promise<ArchiveStoredPlanningScenarioResponse> {
  const response = await fetch(
    `${API_URL}/planning/scenarios/${id}/archive`,
    {
      method: "POST",
    },
  );

  return readJson<ArchiveStoredPlanningScenarioResponse>(
    response,
    "Unable to archive planning scenario",
  );
}

export type PlanningScenarioAssessmentStatus =
  | "COMPLIANT"
  | "ATTENTION"
  | "NON_COMPLIANT";

export type PlanningScenarioAssessmentCheckStatus =
  | "PASS"
  | "WARNING"
  | "FAIL"
  | "NOT_APPLICABLE";

export type PlanningScenarioAssessmentOrigin =
  | "BASELINE"
  | "SCENARIO";

export type PlanningScenarioAssessmentCheck = {
  code: string;
  origin: PlanningScenarioAssessmentOrigin;
  dimension: string;
  status: PlanningScenarioAssessmentCheckStatus;
  title: string;
  description: string;
  actualValue: number | string | null;
  threshold: string | null;
};

export type PlanningScenarioAssessmentAction = {
  code: string;
  priority:
    | "HIGH"
    | "MEDIUM"
    | "LOW";
  title: string;
  rationale: string;
};

export type PlanningScenarioAssessmentResponse = {
  generatedAt: string;
  assessmentVersion: string;

  methodology: {
    allocationProjected: boolean;
    note: string;
  };

  contextAvailability: {
    ips: boolean;
    risk: boolean;
    properties: boolean;
  };

  scenario: PlanningScenarioResponse;

  assessment: {
    overallStatus:
      PlanningScenarioAssessmentStatus;

    baselineStatus:
      PlanningScenarioAssessmentStatus;

    scenarioStatus:
      PlanningScenarioAssessmentStatus;

    score: number;
    passCount: number;
    warningCount: number;
    failureCount: number;
    baselineIssueCount: number;
    scenarioIssueCount: number;

    checks:
      PlanningScenarioAssessmentCheck[];

    actions:
      PlanningScenarioAssessmentAction[];
  };
};

export async function assessPlanningScenario(
  input: SimulatePlanningScenarioInput,
): Promise<PlanningScenarioAssessmentResponse> {
  const response = await fetch(
    `${API_URL}/planning/scenarios/assess`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return readJson<PlanningScenarioAssessmentResponse>(
    response,
    "Unable to assess planning scenario",
  );
}


// ==================================================
// Forward Asset Allocation Engine
// ==================================================

export type PlanningAllocationAssetClass =
  | "LIQUIDITY"
  | "INVESTMENTS"
  | "REAL_ESTATE"
  | "OTHER_ASSETS";

export type PlanningAllocationValues =
  Record<
    PlanningAllocationAssetClass,
    number
  >;

export type PlanningAllocationTransfer = {
  year: number;
  from:
    PlanningAllocationAssetClass;
  to:
    PlanningAllocationAssetClass;
  amount: number;
  label?: string;

  timing?:
    | "BEFORE_OPERATING_CASH_FLOW"
    | "END_OF_YEAR";
};

export type PlanningAllocationSettings = {
  liquidityReturnDeltaPct: number;
  investmentsReturnDeltaPct: number;
  realEstateReturnDeltaPct: number;
  otherAssetsReturnDeltaPct: number;

  positiveCashFlowDestination:
    PlanningAllocationAssetClass;

  deficitFundingOrder:
    PlanningAllocationAssetClass[];

  transfers:
    PlanningAllocationTransfer[];
};

export type SimulatePlanningAllocationInput =
  SimulatePlanningScenarioInput & {
    allocation:
      PlanningAllocationSettings;
  };

export type PlanningAllocationPurchase = {
  label: string;
  amount: number;
};

export type PlanningAllocationSale = {
  label: string;
  amount: number;
  carryingValue: number;
  gainLoss: number;
};

export type PlanningAllocationYear = {
  year: number;

  start:
    PlanningAllocationValues;

  startTotal: number;

  returns:
    PlanningAllocationValues;

  effectiveReturnsPct:
    PlanningAllocationValues;

  totalReturnImpact: number;

  budget: {
    ordinaryExpenses: number;
    extraordinaryExpenses: number;
    operatingCosts: number;
    operatingRevenues: number;
    propertyInvestments: number;
    propertySales: number;
  };

  adjustedOperatingCosts: number;
  adjustedOperatingRevenues: number;
  operatingEventImpact: number;
  operatingNetCashFlow: number;

  propertyMovements: {
    purchases:
      PlanningAllocationPurchase[];

    sales:
      PlanningAllocationSale[];

    saleGainLoss: number;
  };

  manualTransfers:
    PlanningAllocationTransfer[];

  cashFlowAllocation: {
    positiveDestination:
      PlanningAllocationAssetClass;

    unfundedAmount: number;
  };

  end:
    PlanningAllocationValues;

  endTotal: number;

  weights:
    PlanningAllocationValues;

  reconciliationDifference: number;
};

export type PlanningIpsForwardStatus =
  | "NOT_ASSESSED"
  | "COMPLIANT"
  | "ATTENTION"
  | "NON_COMPLIANT";

export type PlanningIpsForwardConfigurationStatus =
  | "NOT_CONFIGURED"
  | "PARTIALLY_CONFIGURED"
  | "CONFIGURED";

export type PlanningIpsForwardBreach = {
  year: number;
  value: number;

  status:
    | "BELOW_MINIMUM"
    | "ABOVE_MAXIMUM";

  threshold: number;
  deviation: number;
};

export type PlanningIpsForwardTargetAttention = {
  year: number;
  value: number;

  status:
    | "BELOW_TARGET"
    | "ABOVE_TARGET";

  target: number;
  deviation: number;
};

export type PlanningIpsForwardLimit = {
  code: string;
  label: string;
  dimension: string;
  unit: string;

  minimum: number | null;
  target: number | null;
  maximum: number | null;

  supported: boolean;

  status:
    | "NOT_ASSESSED"
    | "COMPLIANT"
    | "ATTENTION"
    | "NON_COMPLIANT";

  severity:
    | "NONE"
    | "ATTENTION"
    | "WARNING"
    | "CRITICAL";

  firstBreachYear:
    number | null;

  lastBreachYear:
    number | null;

  breachCount: number;

  targetAttentionCount: number;

  firstTargetAttentionYear:
    number | null;

  lastTargetAttentionYear:
    number | null;

  recommendedAction:
    string | null;

  annualValues: Array<{
    year: number;
    value: number;
  }>;

  breaches:
    PlanningIpsForwardBreach[];

  targetAttentions:
    PlanningIpsForwardTargetAttention[];
};

export type PlanningIpsRemediationPlan = {
  code: string;
  year: number;

  source:
    PlanningAllocationAssetClass;

  destination:
    PlanningAllocationAssetClass;

  timing:
    "END_OF_YEAR";

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
};

export type PlanningAllocationResponse = {
  allocation: {
    initial:
      PlanningAllocationValues;

    initialTotal: number;

    final:
      PlanningAllocationValues;

    finalWeights:
      PlanningAllocationValues;
  };

  openingReconciliation: {
    financialCapital: number;
    realEstate: number;
    otherAssets: number;

    excludedProperties: Array<{
      name: string;
      reason?: string;
      value?: number;
    }>;
  };

  summary: {
    finalNetWorth: number;

    minimumLiquidity: number;
    minimumLiquidityYear:
      number | null;

    maximumRealEstateWeight: number;
    maximumRealEstateWeightYear:
      number | null;
  };

  ipsProjection: {
    configurationStatus:
      PlanningIpsForwardConfigurationStatus;

    status:
      PlanningIpsForwardStatus;

    activeLimitCount: number;
    assessedLimitCount: number;
    unsupportedLimitCount: number;
    breachedLimitCount: number;
    attentionLimitCount: number;

    projectedBreaches: number;
    projectedTargetAttentions: number;

    firstBreachYear:
      number | null;

    firstAttentionYear:
      number | null;

    remediationPlans:
      PlanningIpsRemediationPlan[];

    unsupportedLimits: Array<{
      code: string;
      label: string;
      reason: string;
    }>;

    limits:
      PlanningIpsForwardLimit[];

    note: string;
  };

  years:
    PlanningAllocationYear[];
};
export type PlanningIntegratedScenarioAssessmentResponse =
  PlanningScenarioAssessmentResponse & {
    allocation:
      PlanningAllocationResponse;

    forwardIpsImpact: {
      status:
        PlanningIpsForwardStatus;

      forwardStatusPenalty:
        number;

      criticalDurationPenalty:
        number;

      targetDurationPenalty:
        number;

      urgencyPenalty:
        number;

      projectedBreaches:
        number;

      projectedTargetAttentions:
        number;

      firstBreachYear:
        number | null;

      firstAttentionYear:
        number | null;
    };
  };


export type PlanningAutomaticIpsStopReason =
  | "COMPLIANT"
  | "NO_REMEDIATION_AVAILABLE"
  | "NO_PROGRESS"
  | "MAX_ITERATIONS";

export type PlanningAutomaticIpsIntervention = {
  iteration: number;
  year: number;
  label: string;

  source: string;
  destination: string;
  timing: string;

  amount: number;
  fullyFundable: boolean;

  statusBefore:
    PlanningIpsForwardStatus;

  statusAfter:
    PlanningIpsForwardStatus;

  breachesBefore: number;
  breachesAfter: number;

  targetAttentionsBefore:
    number;

  targetAttentionsAfter:
    number;
};

export type PlanningAutomaticIpsRebalancingResponse = {
  generatedAt: string;

  planType:
    "AUTOMATIC_IPS_REBALANCING";

  maxIterations: number;
  iterations: number;

  stopReason:
    PlanningAutomaticIpsStopReason;

  fullyResolved: boolean;

  initialStatus:
    PlanningIpsForwardStatus;

  finalStatus:
    PlanningIpsForwardStatus;

  initialBreaches: number;
  finalBreaches: number;

  initialTargetAttentions:
    number;

  finalTargetAttentions:
    number;

  totalTransferred: number;

  interventions:
    PlanningAutomaticIpsIntervention[];

  finalTransfers:
    PlanningAllocationTransfer[];

  finalAssessment:
    PlanningIntegratedScenarioAssessmentResponse;
};

export async function simulatePlanningScenarioAllocation(
  input:
    SimulatePlanningAllocationInput,
): Promise<PlanningAllocationResponse> {
  const response = await fetch(
    `${API_URL}/planning/scenarios/allocation`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(input),
    },
  );

  return readJson<PlanningAllocationResponse>(
    response,
    "Unable to project scenario asset allocation",
  );
}


export async function assessPlanningAllocationScenario(
  input:
    SimulatePlanningAllocationInput,
): Promise<PlanningIntegratedScenarioAssessmentResponse> {
  const response = await fetch(
    `${API_URL}/planning/scenarios/assess-allocation`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(input),
    },
  );

  return readJson<PlanningIntegratedScenarioAssessmentResponse>(
    response,
    "Unable to assess scenario asset allocation",
  );
}


export async function applyAutomaticIpsRebalancingPlan(
  input:
    SimulatePlanningAllocationInput,

  maxIterations = 40,
): Promise<PlanningAutomaticIpsRebalancingResponse> {
  const response = await fetch(
    `${API_URL}/planning/scenarios/assess-allocation/auto-remediate`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify({
          input,
          maxIterations,
        }),
    },
  );

  return readJson<PlanningAutomaticIpsRebalancingResponse>(
    response,
    "Unable to build automatic IPS rebalancing plan",
  );
}
