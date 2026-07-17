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

