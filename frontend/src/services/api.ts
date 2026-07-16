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
