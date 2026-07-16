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
