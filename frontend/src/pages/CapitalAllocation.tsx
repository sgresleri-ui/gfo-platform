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
  Typography,
} from "@mui/material";

import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  Link as RouterLink,
} from "react-router-dom";

import {
  assessPlanningAllocationScenario,
  getLedgerTransactions,
  getPropertiesOverview,
  type LedgerTransaction,
  type PlanningIntegratedScenarioAssessmentResponse,
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

const capitalBlocks = [
  {
    label: "Capitale investibile",
    description:
      "Quota realmente disponibile per investimenti finanziari di lungo termine.",
    source: "Motore di allocazione",
  },
];

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

  useEffect(() => {
    void loadProperties();
    void loadSaleExpenses();
    void loadPlanning();
  }, [
    loadProperties,
    loadSaleExpenses,
    loadPlanning,
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

  const preliminaryNetProceeds =
    Math.max(
      0,
      saleSummary.netEquity -
        registeredSaleExpenses,
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

        {capitalBlocks.map(
          (block) => (
            <Paper
              key={block.label}
              elevation={0}
              sx={{
                p: 2.25,
                border: "1px solid",
                borderColor: "divider",
                minHeight: 190,
              }}
            >
              <Typography
                variant="overline"
                color="text.secondary"
              >
                Da collegare
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  mt: 0.5,
                  fontWeight: 750,
                }}
              >
                {block.label}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                {block.description}
              </Typography>

              <Chip
                size="small"
                variant="outlined"
                label={block.source}
                sx={{ mt: 2 }}
              />
            </Paper>
          ),
        )}
      </Box>

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
