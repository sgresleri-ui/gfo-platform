import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  Link as RouterLink,
} from "react-router-dom";

import ElToroCapitalPlanPanel from "../components/ElToroCapitalPlanPanel";

import {
  assessPlanningAllocationScenario,
  getElToroTaxAnalysis,
  getLedgerTransactions,
  getPlatformSettings,
  getPropertiesOverview,
  updatePlatformSettings,
  type ElToroTaxAnalysisResponse,
  type LedgerTransaction,
  type PlanningIntegratedScenarioAssessmentResponse,
  type PlatformSettingsResponse,
  type PropertiesOverviewResponse,
} from "../services/api";

function euro(value: number): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateLabel(
  value: string | null,
): string {
  if (!value) {
    return "Non definita";
  }

  return new Intl.DateTimeFormat(
    "it-IT",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(new Date(value));
}

function parseEstimatedAmount(
  value: string,
): number {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const amount = Number(normalized);

  return Number.isFinite(amount) &&
    amount > 0
    ? amount
    : 0;
}

function residenceLabel(
  value: string | null | undefined,
): string {
  if (value === "Spain") {
    return "Spagna";
  }

  if (
    value ===
    "United Arab Emirates"
  ) {
    return "Emirati Arabi Uniti";
  }

  return value?.trim() ||
    "Non configurata";
}

const decisionSteps = [
  "Calcolare il ricavo netto derivante dalla vendita.",
  "Sottrarre riserva fiscale, fondo di emergenza e impegni immobiliari.",
  "Verificare gli obiettivi futuri presenti nel Budget e nel Planning.",
  "Confrontare l’asset allocation risultante con i limiti dell’IPS.",
  "Definire quota, strumenti ETF UCITS e piano di ingresso per tranche.",
];

const dataSources = [
  "Patrimonio",
  "Ledger",
  "Budget",
  "Planning",
  "IPS",
  "Investimenti",
  "Fiscalità",
  "Mercati",
  "Geopolitica",
];

export default function CapitalAllocation() {
  const [
    propertiesData,
    setPropertiesData,
  ] =
    useState<PropertiesOverviewResponse | null>(
      null,
    );

  const [
    loadingProperties,
    setLoadingProperties,
  ] = useState(true);

  const [
    propertiesError,
    setPropertiesError,
  ] = useState<string | null>(null);

  const [
    ledgerTransactions,
    setLedgerTransactions,
  ] = useState<LedgerTransaction[]>([]);

  const [
    loadingSaleExpenses,
    setLoadingSaleExpenses,
  ] = useState(true);

  const [
    saleExpensesError,
    setSaleExpensesError,
  ] = useState<string | null>(null);

  const [
    planningAssessment,
    setPlanningAssessment,
  ] =
    useState<PlanningIntegratedScenarioAssessmentResponse | null>(
      null,
    );

  const [
    loadingPlanning,
    setLoadingPlanning,
  ] = useState(true);

  const [
    planningError,
    setPlanningError,
  ] = useState<string | null>(null);

  const [
    platformSettings,
    setPlatformSettings,
  ] =
    useState<PlatformSettingsResponse | null>(
      null,
    );

  const [
    loadingSettings,
    setLoadingSettings,
  ] = useState(true);

  const [
    settingsError,
    setSettingsError,
  ] = useState<string | null>(null);

  const [
    taxAnalysis,
    setTaxAnalysis,
  ] =
    useState<ElToroTaxAnalysisResponse | null>(
      null,
    );

  const [
    loadingTaxAnalysis,
    setLoadingTaxAnalysis,
  ] = useState(true);

  const [
    taxAnalysisError,
    setTaxAnalysisError,
  ] = useState<string | null>(null);

  const [
    estimatedTaxReserveInput,
    setEstimatedTaxReserveInput,
  ] = useState("0");

  const [
    futureSaleCostsInput,
    setFutureSaleCostsInput,
  ] = useState("0");

  const [
    savingEstimates,
    setSavingEstimates,
  ] = useState(false);

  const [
    estimateSaveError,
    setEstimateSaveError,
  ] = useState<string | null>(null);

  const [
    estimateSaveSuccess,
    setEstimateSaveSuccess,
  ] = useState(false);

  const loadProperties =
    useCallback(async () => {
      setLoadingProperties(true);
      setPropertiesError(null);

      try {
        const result =
          await getPropertiesOverview();

        setPropertiesData(result);
      } catch (error) {
        console.error(error);

        setPropertiesError(
          "Impossibile caricare i dati immobiliari.",
        );
      } finally {
        setLoadingProperties(false);
      }
    }, []);

  const loadSaleExpenses =
    useCallback(async () => {
      setLoadingSaleExpenses(true);
      setSaleExpensesError(null);

      try {
        const result =
          await getLedgerTransactions(1000);

        setLedgerTransactions(
          result.transactions,
        );
      } catch (error) {
        console.error(error);

        setSaleExpensesError(
          "Impossibile caricare le spese di vendita dal ledger.",
        );
      } finally {
        setLoadingSaleExpenses(false);
      }
    }, []);

  const loadPlanning =
    useCallback(async () => {
      setLoadingPlanning(true);
      setPlanningError(null);

      try {
        const result =
          await assessPlanningAllocationScenario({
            initialCapitalAdjustment: 0,
            annualReturnAdjustmentPct: 0,
            annualCostAdjustmentPct: 0,
            annualRevenueAdjustmentPct: 0,
            expenseInflationDeltaPct: 0,
            events: [],

            allocation: {
              liquidityReturnDeltaPct: 0,
              investmentsReturnDeltaPct: 0,
              realEstateReturnDeltaPct: 0,
              otherAssetsReturnDeltaPct: 0,
              liquidityTaxRatePct: 0,
              investmentsTaxRatePct: 0,
              rebalancingCostRatePct: 0,
              rebalancingMinimumCost: 0,

              positiveCashFlowDestination:
                "LIQUIDITY",

              deficitFundingOrder: [
                "LIQUIDITY",
                "INVESTMENTS",
                "OTHER_ASSETS",
                "REAL_ESTATE",
              ],

              transfers: [],
            },
          });

        setPlanningAssessment(result);
      } catch (error) {
        console.error(error);

        setPlanningError(
          "Impossibile caricare gli impegni futuri dal Planning.",
        );
      } finally {
        setLoadingPlanning(false);
      }
    }, []);

  const loadSettings =
    useCallback(async () => {
      setLoadingSettings(true);
      setSettingsError(null);

      try {
        const result =
          await getPlatformSettings();

        setPlatformSettings(result);

        setEstimatedTaxReserveInput(
          String(result.estimatedTaxReserve),
        );

        setFutureSaleCostsInput(
          String(result.futureSaleCosts),
        );
      } catch (error) {
        console.error(error);

        setSettingsError(
          "Impossibile caricare la residenza fiscale configurata.",
        );
      } finally {
        setLoadingSettings(false);
      }
    }, []);

  const loadTaxAnalysis =
    useCallback(async () => {
      setLoadingTaxAnalysis(true);
      setTaxAnalysisError(null);

      try {
        const result =
          await getElToroTaxAnalysis();

        setTaxAnalysis(result);
      } catch (error) {
        console.error(error);

        setTaxAnalysisError(
          "Impossibile caricare l’analisi fiscale di El Toro.",
        );
      } finally {
        setLoadingTaxAnalysis(false);
      }
    }, []);

  useEffect(() => {
    // I loader gestiscono fetch e stati asincroni della pagina.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProperties();
    void loadSaleExpenses();
    void loadPlanning();
    void loadSettings();
    void loadTaxAnalysis();
  }, [
    loadProperties,
    loadSaleExpenses,
    loadPlanning,
    loadSettings,
    loadTaxAnalysis,
  ]);

  const heldForSale = useMemo(
    () =>
      propertiesData?.properties.filter(
        (property) =>
          property.status ===
          "HELD_FOR_SALE",
      ) ?? [],
    [propertiesData],
  );

  const saleSummary = useMemo(() => {
    const totals = heldForSale.reduce(
      (summary, property) => ({
        grossValue:
          summary.grossValue +
          property.grossValue,
        debt:
          summary.debt +
          property.debt,
        netEquity:
          summary.netEquity +
          property.netEquity,
        historicalCost:
          summary.historicalCost +
          (property.historicalCost ?? 0),
      }),
      {
        grossValue: 0,
        debt: 0,
        netEquity: 0,
        historicalCost: 0,
      },
    );

    const historicalCostComplete =
      heldForSale.length > 0 &&
      heldForSale.every(
        (property) =>
          property.historicalCost !== null,
      );

    const closingDates = heldForSale
      .map(
        (property) =>
          property.expectedClosingDate,
      )
      .filter(
        (
          value,
        ): value is string =>
          value !== null,
      )
      .sort();

    return {
      ...totals,
      historicalCost:
        historicalCostComplete
          ? totals.historicalCost
          : null,
      grossDifference:
        historicalCostComplete
          ? totals.grossValue -
            totals.historicalCost
          : null,
      earliestClosingDate:
        closingDates[0] ?? null,
    };
  }, [heldForSale]);

  const saleExpenseTransactions =
    useMemo(
      () =>
        ledgerTransactions.filter(
          (transaction) =>
            transaction.transactionType ===
              "PROPERTY_EXPENSE" &&
            transaction.position?.code ===
              "PROPERTY_EL_TORO" &&
            transaction.voidedAt === null,
        ),
      [ledgerTransactions],
    );

  const registeredSaleExpenses =
    useMemo(
      () =>
        saleExpenseTransactions.reduce(
          (total, transaction) =>
            total +
            Math.abs(
              transaction.baseAmount,
            ),
          0,
        ),
      [saleExpenseTransactions],
    );

  const effectiveRecordedSaleExpenses =
    taxAnalysis?.sale.recordedSellingCosts ??
    registeredSaleExpenses;

  const preliminaryNetProceeds =
    taxAnalysis?.sale.netProceedsBeforeTax ??
    Math.max(
      0,
      saleSummary.netEquity -
        effectiveRecordedSaleExpenses,
    );

  const firstPlanningYear =
    planningAssessment?.allocation.years[0] ??
    null;

  const grossFutureCommitments =
    firstPlanningYear
      ? firstPlanningYear.budget
          .extraordinaryExpenses +
        firstPlanningYear.budget
          .propertyInvestments
      : 0;

  const expectedPropertySales =
    firstPlanningYear?.budget
      .propertySales ?? 0;

  const netFutureCommitments =
    Math.max(
      0,
      grossFutureCommitments -
        expectedPropertySales,
    );

  const residualAfterCommitments =
    Math.max(
      0,
      preliminaryNetProceeds -
        netFutureCommitments,
    );

  const loadingSaleData =
    loadingProperties ||
    loadingSaleExpenses;

  const saleDataError =
    propertiesError ??
    saleExpensesError;

  const loadingResidualCapital =
    loadingSaleData ||
    loadingPlanning;

  const residualCapitalError =
    saleDataError ??
    planningError;

  const liquidityIpsLimit =
    planningAssessment?.allocation
      .ipsProjection.limits.find(
        (limit) =>
          limit.code ===
          "LIQUIDITY_GROSS_ASSETS",
      ) ?? null;

  const liquidityMinimumPct =
    liquidityIpsLimit?.minimum ?? 0;

  const liquidityTargetPct =
    liquidityIpsLimit?.target ??
    liquidityMinimumPct;

  const projectedYearEndAssets =
    firstPlanningYear?.endTotal ?? 0;

  const minimumLiquidityReserve =
    projectedYearEndAssets *
    liquidityMinimumPct /
    100;

  const targetLiquidityReserve =
    projectedYearEndAssets *
    liquidityTargetPct /
    100;

  const capitalAfterMinimumReserve =
    Math.max(
      0,
      residualAfterCommitments -
        minimumLiquidityReserve,
    );

  const capitalAfterTargetReserve =
    Math.max(
      0,
      residualAfterCommitments -
        targetLiquidityReserve,
    );

  const ipsLiquidityConfigured =
    Boolean(
      firstPlanningYear &&
      liquidityIpsLimit?.supported &&
      liquidityMinimumPct > 0,
    );

  const estimatedTaxReserve =
    parseEstimatedAmount(
      estimatedTaxReserveInput,
    );

  const futureSaleCosts =
    parseEstimatedAmount(
      futureSaleCostsInput,
    );

  const estimatesChanged =
    platformSettings !== null &&
    (
      estimatedTaxReserve !==
        platformSettings.estimatedTaxReserve ||
      futureSaleCosts !==
        platformSettings.futureSaleCosts
    );

  const effectiveEstimatedTaxReserve =
    estimatesChanged
      ? estimatedTaxReserve
      : taxAnalysis?.planningEstimates
          .estimatedTaxReserve ??
        estimatedTaxReserve;

  const effectiveFutureSaleCosts =
    estimatesChanged
      ? futureSaleCosts
      : taxAnalysis?.planningEstimates
          .futureSaleCosts ??
        futureSaleCosts;

  const capitalAfterTaxAndCosts =
    Math.max(
      0,
      capitalAfterTargetReserve -
        effectiveEstimatedTaxReserve -
        effectiveFutureSaleCosts,
    );

  const fiscalEstimateComplete =
    effectiveEstimatedTaxReserve > 0;

  const planningEstimateSaved =
    !estimatesChanged &&
    taxAnalysis?.planningEstimates.status ===
      "USER_ESTIMATE";

  const planningEstimateStatusLabel =
    estimatesChanged
      ? "Modifiche non salvate"
      : planningEstimateSaved
        ? "Stima manuale salvata"
        : "Stima non impostata";

  const refreshSaleData = () => {
    void loadProperties();
    void loadSaleExpenses();
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          mb: 3,
        }}
      >
        <AccountBalanceRoundedIcon
          color="primary"
          sx={{
            fontSize: 34,
            mt: 0.25,
          }}
        />

        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800 }}
          >
            Piano di allocazione del capitale
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Trasforma il capitale liberato da
            una vendita immobiliare in un
            piano finanziario coerente con
            Budget, patrimonio, IPS e
            obiettivi familiari.
          </Typography>
        </Box>
      </Box>

      <Alert
        severity="info"
        sx={{ mb: 3 }}
      >
        Fonti collegate: patrimonio immobiliare,
        ledger delle transazioni e Planning
        ufficiale. Il realizzo netto preliminare
        viene ora confrontato con gli impegni
        futuri previsti dal Budget.
      </Alert>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md:
              "repeat(2, minmax(0, 1fr))",
            xl:
              "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 2.25,
            border: "1px solid",
            borderColor: "primary.main",
            minHeight: 190,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography
              variant="overline"
              color="primary.main"
            >
              Fonte collegata
            </Typography>

            <Chip
              size="small"
              color={
                saleDataError
                  ? "error"
                  : heldForSale.length > 0
                    ? "success"
                    : "default"
              }
              label={
                saleDataError
                  ? "Errore"
                  : heldForSale.length > 0
                    ? "Dati disponibili"
                    : "Nessun immobile"
              }
            />
          </Box>

          <Typography
            variant="h6"
            sx={{
              mt: 0.5,
              fontWeight: 750,
            }}
          >
            Realizzo netto preliminare
          </Typography>

          {loadingSaleData ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 2,
              }}
            >
              <CircularProgress
                size={20}
              />

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Caricamento…
              </Typography>
            </Box>
          ) : saleDataError ? (
            <Button
              size="small"
              startIcon={
                <RefreshRoundedIcon />
              }
              onClick={refreshSaleData}
              sx={{ mt: 1.5 }}
            >
              Riprova
            </Button>
          ) : (
            <>
              <Typography
                variant="h5"
                sx={{
                  mt: 1.5,
                  fontWeight: 800,
                }}
              >
                {euro(
                  preliminaryNetProceeds,
                )}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75 }}
              >
                Patrimonio netto immobiliare
                meno le spese di vendita già
                registrate. Imposte stimate e
                costi futuri non sono inclusi.
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 1,
                }}
              >
                {heldForSale.length}{" "}
                {heldForSale.length === 1
                  ? "immobile"
                  : "immobili"}{" "}
                destinati alla vendita
              </Typography>
            </>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.25,
            border: "1px solid",
            borderColor:
              planningError
                ? "error.main"
                : "primary.main",
            minHeight: 190,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography
              variant="overline"
              color={
                planningError
                  ? "error.main"
                  : "primary.main"
              }
            >
              Fonte collegata
            </Typography>

            <Chip
              size="small"
              color={
                planningError
                  ? "error"
                  : firstPlanningYear
                    ? "success"
                    : "default"
              }
              label={
                planningError
                  ? "Errore"
                  : firstPlanningYear
                    ? "Planning disponibile"
                    : "Nessun dato"
              }
            />
          </Box>

          <Typography
            variant="h6"
            sx={{
              mt: 0.5,
              fontWeight: 750,
            }}
          >
            Riserve e impegni futuri
          </Typography>

          {loadingPlanning ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 2,
              }}
            >
              <CircularProgress size={20} />

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Caricamento…
              </Typography>
            </Box>
          ) : planningError ? (
            <Button
              size="small"
              startIcon={
                <RefreshRoundedIcon />
              }
              onClick={() =>
                void loadPlanning()
              }
              sx={{ mt: 1.5 }}
            >
              Riprova
            </Button>
          ) : (
            <>
              <Typography
                variant="h5"
                sx={{
                  mt: 1.5,
                  fontWeight: 800,
                }}
              >
                {euro(
                  netFutureCommitments,
                )}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75 }}
              >
                Impegni netti del{" "}
                {firstPlanningYear?.year ??
                  "primo anno"}{" "}
                dopo la vendita immobiliare
                prevista.
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 1,
                }}
              >
                Lordi{" "}
                {euro(
                  grossFutureCommitments,
                )}{" "}
                · vendite previste{" "}
                {euro(
                  expectedPropertySales,
                )}
              </Typography>
            </>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.25,
            border: "1px solid",
            borderColor:
              residualCapitalError
                ? "error.main"
                : "primary.main",
            minHeight: 190,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography
              variant="overline"
              color={
                residualCapitalError
                  ? "error.main"
                  : "primary.main"
              }
            >
              Calcolo automatico
            </Typography>

            <Chip
              size="small"
              color={
                residualCapitalError
                  ? "error"
                  : "success"
              }
              label={
                residualCapitalError
                  ? "Errore"
                  : "Dati disponibili"
              }
            />
          </Box>

          <Typography
            variant="h6"
            sx={{
              mt: 0.5,
              fontWeight: 750,
            }}
          >
            Capitale residuo dopo gli impegni
          </Typography>

          {loadingResidualCapital ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 2,
              }}
            >
              <CircularProgress size={20} />

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Calcolo…
              </Typography>
            </Box>
          ) : residualCapitalError ? (
            <Typography
              variant="body2"
              color="error.main"
              sx={{ mt: 1.5 }}
            >
              Calcolo non disponibile.
            </Typography>
          ) : (
            <>
              <Typography
                variant="h5"
                sx={{
                  mt: 1.5,
                  fontWeight: 800,
                }}
              >
                {euro(
                  residualAfterCommitments,
                )}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75 }}
              >
                Realizzo netto preliminare meno
                gli impegni netti del{" "}
                {firstPlanningYear?.year ??
                  "primo anno"}.
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 1,
                }}
              >
                Non è ancora il capitale
                investibile definitivo: mancano
                fiscalità, riserva minima e
                fabbisogni di breve periodo.
              </Typography>
            </>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.25,
            border: "1px solid",
            borderColor:
              residualCapitalError
                ? "error.main"
                : ipsLiquidityConfigured
                  ? "primary.main"
                  : "warning.main",
            minHeight: 190,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography
              variant="overline"
              color={
                residualCapitalError
                  ? "error.main"
                  : ipsLiquidityConfigured
                    ? "primary.main"
                    : "warning.main"
              }
            >
              IPS collegato
            </Typography>

            <Chip
              size="small"
              color={
                residualCapitalError
                  ? "error"
                  : ipsLiquidityConfigured
                    ? "success"
                    : "warning"
              }
              label={
                residualCapitalError
                  ? "Errore"
                  : ipsLiquidityConfigured
                    ? "Target disponibile"
                    : "IPS non configurato"
              }
            />
          </Box>

          <Typography
            variant="h6"
            sx={{
              mt: 0.5,
              fontWeight: 750,
            }}
          >
            Disponibile dopo riserva IPS
          </Typography>

          {loadingResidualCapital ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 2,
              }}
            >
              <CircularProgress size={20} />

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Calcolo…
              </Typography>
            </Box>
          ) : residualCapitalError ? (
            <Typography
              variant="body2"
              color="error.main"
              sx={{ mt: 1.5 }}
            >
              Calcolo non disponibile.
            </Typography>
          ) : !ipsLiquidityConfigured ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.5 }}
            >
              Configurare minimo e target di
              liquidità nell’IPS.
            </Typography>
          ) : (
            <>
              <Typography
                variant="h5"
                sx={{
                  mt: 1.5,
                  fontWeight: 800,
                }}
              >
                {euro(
                  capitalAfterTargetReserve,
                )}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75 }}
              >
                Residuo dopo la riserva
                obiettivo IPS del{" "}
                {liquidityTargetPct.toLocaleString(
                  "it-IT",
                )}
                %.
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 1,
                }}
              >
                Riserva target{" "}
                {euro(
                  targetLiquidityReserve,
                )}{" "}
                · scenario minimo{" "}
                {euro(
                  capitalAfterMinimumReserve,
                )}
              </Typography>

              <Typography
                variant="caption"
                color="warning.main"
                sx={{
                  display: "block",
                  mt: 0.5,
                }}
              >
                Non definitivo: fiscalità e
                ulteriori fabbisogni di breve
                periodo non sono ancora inclusi.
              </Typography>
            </>
          )}
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          border: "1px solid",
          borderColor: fiscalEstimateComplete
            ? "success.main"
            : "warning.main",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "flex-start",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 750 }}
            >
              Fiscalità e costi futuri
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Inserisci esclusivamente le
              stime non ancora registrate nel
              ledger.
            </Typography>
          </Box>

          <Chip
            size="small"
            color={
              planningEstimateSaved
                ? "success"
                : "warning"
            }
            label={
              planningEstimateStatusLabel
            }
          />
        </Box>

          {loadingTaxAnalysis &&
          !taxAnalysis ? (
            <Alert
              severity="info"
              sx={{ mt: 2 }}
            >
              Caricamento dell’analisi fiscale
              di El Toro…
            </Alert>
          ) : taxAnalysisError ? (
            <Alert
              severity="warning"
              action={
                <Button
                  size="small"
                  onClick={() =>
                    void loadTaxAnalysis()
                  }
                >
                  Riprova
                </Button>
              }
              sx={{ mt: 2 }}
            >
              {taxAnalysisError}
            </Alert>
          ) : null}

        {settingsError ? (
          <Alert
            severity="warning"
            action={
              <Button
                size="small"
                onClick={() =>
                  void loadSettings()
                }
              >
                Riprova
              </Button>
            }
            sx={{ mt: 2 }}
          >
            {settingsError}
          </Alert>
        ) : (
          <Alert
            severity="info"
            sx={{ mt: 2 }}
          >
            Residenza fiscale attualmente
            configurata:{" "}
            <strong>
              {loadingSettings &&
              !taxAnalysis
                ? "caricamento…"
                : residenceLabel(
                    taxAnalysis
                      ?.fiscalResidence.current ??
                      platformSettings
                        ?.fiscalResidence,
                  )}
            </strong>
            . La posizione fiscale effettiva
            deve essere verificata alla data
            del rogito{" "}
            {dateLabel(
              taxAnalysis?.property
                .expectedClosingDate ??
                saleSummary
                  .earliestClosingDate,
            )}
            .
          </Alert>
        )}

        {taxAnalysis ? (
          <Alert
            severity="warning"
            sx={{ mt: 2 }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800 }}
            >
              Stato fiscale:{" "}
              {taxAnalysis.tax.status ===
              "NEEDS_VALIDATION"
                ? "da validare"
                : taxAnalysis.tax.status}
            </Typography>

            {taxAnalysis.warnings.map(
              (warning) => (
                <Typography
                  key={warning}
                  variant="body2"
                  sx={{ mt: 0.5 }}
                >
                  • {warning}
                </Typography>
              ),
            )}
          </Alert>
        ) : null}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md:
                "repeat(2, minmax(0, 1fr))",
            },
            gap: 2,
            mt: 2,
          }}
        >
          <TextField
            size="small"
            label="Riserva fiscale stimata (€)"
            value={
              estimatedTaxReserveInput
            }
              onChange={(event) => {
                setEstimatedTaxReserveInput(
                  event.target.value,
                );
                setEstimateSaveSuccess(false);
                setEstimateSaveError(null);
              }}
            slotProps={{
              htmlInput: {
                inputMode: "decimal",
              },
            }}
            helperText="Stima prudenziale da validare con il consulente fiscale."
          />

          <TextField
            size="small"
            label="Costi futuri di vendita (€)"
            value={futureSaleCostsInput}
              onChange={(event) => {
                setFutureSaleCostsInput(
                  event.target.value,
                );
                setEstimateSaveSuccess(false);
                setEstimateSaveError(null);
              }}
            slotProps={{
              htmlInput: {
                inputMode: "decimal",
              },
            }}
            helperText={`Solo costi non già compresi nei ${euro(
              effectiveRecordedSaleExpenses,
            )} registrati.`}
          />
        </Box>


        <Box
          sx={{
            mt: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
              disabled={
                loadingSettings ||
                savingEstimates ||
                !estimatesChanged
              }
            onClick={async () => {
              setSavingEstimates(true);
              setEstimateSaveError(null);
              setEstimateSaveSuccess(false);

              try {
                const result =
                  await updatePlatformSettings({
                    estimatedTaxReserve,
                    futureSaleCosts,
                  });

                setPlatformSettings(result);

                setEstimatedTaxReserveInput(
                  String(
                    result.estimatedTaxReserve,
                  ),
                );

                setFutureSaleCostsInput(
                  String(
                    result.futureSaleCosts,
                  ),
                );

                  await loadTaxAnalysis();

                setEstimateSaveSuccess(true);
              } catch (error) {
                console.error(error);

                setEstimateSaveError(
                  "Impossibile salvare le stime.",
                );
              } finally {
                setSavingEstimates(false);
              }
            }}
          >
            {savingEstimates
              ? "Salvataggio…"
              : "Salva stime"}
          </Button>

          {estimateSaveSuccess ? (
            <Chip
              size="small"
              color="success"
              label="Stime salvate"
            />
          ) : null}
        </Box>

        {estimateSaveError ? (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
          >
            {estimateSaveError}
          </Alert>
        ) : null}


        {taxAnalysis &&
        taxAnalysis.evidence
          .recordedSellingCostTransactionCount >
          0 ? (
          <Alert
            severity="info"
            sx={{ mt: 2 }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800 }}
            >
              Prova contabile dal ledger
            </Typography>

            <Typography
              variant="body2"
              sx={{ mt: 0.5 }}
            >
              Operazioni registrate:{" "}
              {
                taxAnalysis.evidence
                  .recordedSellingCostTransactionCount
              }
              {" · Totale: "}
              {euro(
                taxAnalysis.sale
                  .recordedSellingCosts,
              )}
            </Typography>

            {taxAnalysis.evidence
              .recordedSellingCostTransactions
              .map((transaction) => (
                <Box
                  key={transaction.id}
                  sx={{
                    mt: 1,
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: "action.hover",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 750 }}
                  >
                    {dateLabel(
                      transaction.date,
                    )}
                    {" · "}
                    {euro(
                      transaction.amount,
                    )}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      mt: 0.5,
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {transaction.notes ||
                      "Descrizione non disponibile"}
                  </Typography>
                </Box>
              ))}
          </Alert>
        ) : null}


        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm:
                "repeat(2, minmax(0, 1fr))",
              lg:
                "repeat(4, minmax(0, 1fr))",
            },
            gap: 1.5,
            mt: 2,
          }}
        >
          {[
            {
              label:
                "Disponibile dopo riserva IPS",
              value: euro(
                capitalAfterTargetReserve,
              ),
            },
            {
              label:
                "Riserva fiscale stimata",
              value: euro(
                effectiveEstimatedTaxReserve,
              ),
            },
            {
              label:
                "Costi futuri stimati",
              value: euro(
                effectiveFutureSaleCosts,
              ),
            },
            {
              label:
                "Disponibile dopo le stime",
              value: euro(
                capitalAfterTaxAndCosts,
              ),
            },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
              >
                {item.label}
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  mt: 0.25,
                  fontWeight: 800,
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>

        <Alert
          severity={
            fiscalEstimateComplete
              ? "warning"
              : "error"
          }
          sx={{ mt: 2 }}
        >
          {fiscalEstimateComplete
            ? "Il risultato è una stima di pianificazione e richiede validazione fiscale professionale prima di qualsiasi investimento."
            : "La riserva fiscale è ancora pari a zero. Il capitale mostrato non deve essere considerato definitivamente investibile."}
        </Alert>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            mt: 1.25,
          }}
        >
          Le stime inserite vengono salvate nel
          database tramite il pulsante Salva
          stime.
        </Typography>
      </Paper>

      <ElToroCapitalPlanPanel
        refreshToken={[
          taxAnalysis?.planningEstimates
            .estimatedTaxReserve ?? 0,
          taxAnalysis?.planningEstimates
            .futureSaleCosts ?? 0,
          taxAnalysis?.planningEstimates
            .status ?? "loading",
        ].join(":")}
      />

      {!loadingSaleData &&
        !saleDataError && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 750 }}
                >
                  Immobili destinati alla
                  vendita
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Prima riconciliazione del
                  capitale potenzialmente
                  disponibile.
                </Typography>
              </Box>

              <Button
                size="small"
                startIcon={
                  <RefreshRoundedIcon />
                }
                onClick={refreshSaleData}
              >
                Aggiorna
              </Button>
            </Box>

            {heldForSale.length === 0 ? (
              <Alert
                severity="warning"
                sx={{ mt: 2 }}
              >
                Nessun immobile è attualmente
                classificato come destinato
                alla vendita.
              </Alert>
            ) : (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs:
                        "repeat(2, minmax(0, 1fr))",
                      md:
                        "repeat(4, minmax(0, 1fr))",
                      xl:
                        "repeat(8, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                    mt: 2,
                    mb: 2,
                  }}
                >
                  {[
                    {
                      label: "Valore lordo",
                      value: euro(
                        saleSummary.grossValue,
                      ),
                    },
                    {
                      label:
                        "Debito collegato",
                      value: euro(
                        saleSummary.debt,
                      ),
                    },
                    {
                      label:
                        "Patrimonio netto",
                      value: euro(
                        saleSummary.netEquity,
                      ),
                    },
                    {
                      label:
                        "Costo storico",
                      value:
                        saleSummary.historicalCost ===
                        null
                          ? "Non disponibile"
                          : euro(
                              saleSummary.historicalCost,
                            ),
                    },
                    {
                      label:
                        "Differenza lorda",
                      value:
                        saleSummary.grossDifference ===
                        null
                          ? "Non disponibile"
                          : euro(
                              saleSummary.grossDifference,
                            ),
                    },
                    {
                      label:
                        "Spese registrate",
                      value: euro(
                        registeredSaleExpenses,
                      ),
                    },
                    {
                      label:
                        "Netto preliminare",
                      value: euro(
                        preliminaryNetProceeds,
                      ),
                    },
                    {
                      label:
                        "Prima chiusura prevista",
                      value: dateLabel(
                        saleSummary
                          .earliestClosingDate,
                      ),
                    },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor:
                          "action.hover",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {item.label}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.25,
                          fontWeight: 750,
                        }}
                      >
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {saleSummary.grossDifference !==
                  null && (
                  <Alert
                    severity="info"
                    sx={{ mb: 2 }}
                  >
                    La differenza lorda di{" "}
                    <strong>
                      {euro(
                        saleSummary.grossDifference,
                      )}
                    </strong>{" "}
                    rispetto al costo storico è
                    un dato patrimoniale. Non
                    rappresenta ancora la
                    plusvalenza imponibile né
                    l’imposta dovuta.
                  </Alert>
                )}

                <Alert
                  severity={
                    saleExpenseTransactions.length > 0
                      ? "success"
                      : "warning"
                  }
                  sx={{ mb: 2 }}
                >
                  Ledger collegato:{" "}
                  {saleExpenseTransactions.length}{" "}
                  {saleExpenseTransactions.length === 1
                    ? "movimento"
                    : "movimenti"}{" "}
                  relativi alla vendita El Toro,
                  per complessivi{" "}
                  <strong>
                    {euro(
                      registeredSaleExpenses,
                    )}
                  </strong>
                  .
                </Alert>

                <Box
                  sx={{
                    display: "grid",
                    gap: 1.25,
                  }}
                >
                  {heldForSale.map(
                    (property) => (
                      <Box
                        key={property.id}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            md:
                              "1.4fr repeat(3, minmax(0, 1fr))",
                          },
                          gap: 1.5,
                          p: 1.5,
                          border: "1px solid",
                          borderColor:
                            "divider",
                          borderRadius: 2,
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontWeight: 750,
                            }}
                          >
                            {property.name}
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {property.country ??
                              "Paese non definito"}{" "}
                            · chiusura{" "}
                            {dateLabel(
                              property
                                .expectedClosingDate,
                            )}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Valore lordo
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                            }}
                          >
                            {euro(
                              property.grossValue,
                            )}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Debito
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                            }}
                          >
                            {euro(
                              property.debt,
                            )}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Patrimonio netto
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                            }}
                          >
                            {euro(
                              property.netEquity,
                            )}
                          </Typography>
                        </Box>
                      </Box>
                    ),
                  )}
                </Box>
              </>
            )}
          </Paper>
        )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "1.4fr 1fr",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 750 }}
          >
            Processo decisionale
          </Typography>

          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              mt: 2,
            }}
          >
            {decisionSteps.map(
              (step, index) => (
                <Box
                  key={step}
                  sx={{
                    display: "flex",
                    alignItems:
                      "flex-start",
                    gap: 1.25,
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor:
                      "action.hover",
                  }}
                >
                  <CheckCircleOutlineRoundedIcon
                    color="primary"
                    sx={{ mt: 0.1 }}
                  />

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Fase {index + 1}
                    </Typography>

                    <Typography
                      variant="body2"
                    >
                      {step}
                    </Typography>
                  </Box>
                </Box>
              ),
            )}
          </Box>


        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 750 }}
          >
            Fonti da integrare
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              mb: 2,
            }}
          >
            Il motore utilizzerà solo dati
            verificati e aggiornati,
            distinguendo informazioni interne
            e dati pubblici di mercato.
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            {dataSources.map(
              (source) => (
                <Chip
                  key={source}
                  label={source}
                  variant="outlined"
                  color={
                    [
                      "Patrimonio",
                      "Ledger",
                      "Budget",
                      "Planning",
                      "IPS",
                    ].includes(source)
                      ? "success"
                      : "default"
                  }
                />
              ),
            )}
          </Box>
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 750 }}
        >
          Moduli collegati
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.75,
            mb: 2,
          }}
        >
          Consulta i dati che alimenteranno il
          futuro motore di allocazione.
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          {[
            ["Planning", "/planning"],
            ["Budget", "/budget"],
            ["IPS", "/ips"],
            [
              "Investimenti",
              "/investments",
            ],
          ].map(([label, path]) => (
            <Button
              key={path}
              component={RouterLink}
              to={path}
              variant="outlined"
              endIcon={
                <ArrowForwardRoundedIcon />
              }
            >
              {label}
            </Button>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
