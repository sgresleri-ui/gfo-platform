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
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getFinancialHistory,
  getPerformancePeriods,
  getPerformanceSummary,
  type FinancialHistoryResponse,
  type PerformancePeriodSnapshot,
  type PerformanceSummaryResponse,
} from "../services/api";

type Notice = {
  severity:
    | "success"
    | "info"
    | "warning"
    | "error";
  text: string;
};

type KpiCardProps = {
  label: string;
  value: string;
  subtitle: string;
  valueColor?: string;
};

function euro(value: number): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function signedEuro(value: number): string {
  if (value > 0) {
    return `+${euro(value)}`;
  }

  return euro(value);
}

function percentage(
  value: number | null,
): string {
  if (value === null) {
    return "Non disponibile";
  }

  const normalizedValue =
    Math.abs(value) < 0.005 ? 0 : value;

  const formatted =
    normalizedValue.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return normalizedValue > 0
    ? `+${formatted}%`
    : `${formatted}%`;
}

function dateTimeLabel(
  value: string,
): string {
  return new Date(value).toLocaleString(
    "it-IT",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function shortEuro(value: number): string {
  const absoluteValue =
    Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `${(
      value / 1_000_000
    ).toFixed(1)} M€`;
  }

  if (absoluteValue >= 1_000) {
    return `${(
      value / 1_000
    ).toFixed(0)} k€`;
  }

  return `${value.toFixed(0)} €`;
}

function valueColor(
  value: number | null,
): string {
  if (value === null || value === 0) {
    return "text.primary";
  }

  return value > 0
    ? "success.main"
    : "error.main";
}

function sourceLabel(
  source: string,
): string {
  if (
    source ===
    "CURRENT_DATABASE_CAPTURE"
  ) {
    return "Cattura database";
  }

  if (source === "EXCEL_IMPORT") {
    return "Importazione Excel";
  }

  return source;
}

function KpiCard({
  label,
  value,
  subtitle,
  valueColor:
    selectedValueColor =
      "text.primary",
}: KpiCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        minHeight: 125,
        border: "1px solid",
        borderColor: "divider",
        boxShadow:
          "0 12px 30px rgba(26,45,75,0.05)",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
      >
        {label}
      </Typography>

      <Typography
        variant="h5"
        sx={{
          mt: 0.8,
          fontWeight: 800,
          color: selectedValueColor,
        }}
      >
        {value}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.7 }}
      >
        {subtitle}
      </Typography>
    </Paper>
  );
}

export default function Performance() {
  const [periods, setPeriods] =
    useState<
      PerformancePeriodSnapshot[]
    >([]);

  const [report, setReport] =
    useState<
      PerformanceSummaryResponse | null
    >(null);

  const [financialHistory, setFinancialHistory] =
    useState<FinancialHistoryResponse | null>(
      null,
    );

  const [fromSnapshot, setFromSnapshot] =
    useState("");

  const [toSnapshot, setToSnapshot] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const analyzePeriod = useCallback(
    async (
      fromValue: string,
      toValue: string,
    ) => {
      setAnalyzing(true);
      setNotice(null);

      try {
        const result =
          await getPerformanceSummary(
            fromValue,
            toValue,
          );

        setReport(result);
      } catch (error) {
        console.error(error);

        setNotice({
          severity: "error",
          text:
            "Impossibile calcolare la performance per il periodo selezionato.",
        });
      } finally {
        setAnalyzing(false);
      }
    },
    [],
  );

  const loadPage = useCallback(
    async () => {
      setLoading(true);
      setNotice(null);

      try {
        const [
          result,
          historyResult,
        ] = await Promise.all([
          getPerformancePeriods(),
          getFinancialHistory(),
        ]);

        setPeriods(result.snapshots);
        setFinancialHistory(
          historyResult,
        );

        if (
          result.snapshots.length >= 2
        ) {
          const first =
            result.snapshots[0];

          const last =
            result.snapshots[
              result.snapshots.length - 1
            ];

          setFromSnapshot(
            first.snapshotDate,
          );

          setToSnapshot(
            last.snapshotDate,
          );

          await analyzePeriod(
            first.snapshotDate,
            last.snapshotDate,
          );
        } else {
          setReport(null);
        }
      } catch (error) {
        console.error(error);

        setNotice({
          severity: "error",
          text:
            "Impossibile caricare il motore Performance.",
        });
      } finally {
        setLoading(false);
      }
    },
    [analyzePeriod],
  );

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const selectedFrom =
    periods.find(
      (snapshot) =>
        snapshot.snapshotDate ===
        fromSnapshot,
    ) ?? null;

  const selectedTo =
    periods.find(
      (snapshot) =>
        snapshot.snapshotDate ===
        toSnapshot,
    ) ?? null;

  const assetClassData = useMemo(
    () =>
      report
        ? [
            {
              name: "Liquidità",
              variazione:
                report.assetClassChanges
                  .liquidity,
            },
            {
              name: "Investimenti",
              variazione:
                report.assetClassChanges
                  .investments,
            },
            {
              name: "Immobili",
              variazione:
                report.assetClassChanges
                  .realEstate,
            },
            {
              name: "Altri attivi",
              variazione:
                report.assetClassChanges
                  .otherAssets,
            },
            {
              name: "Passività",
              variazione:
                report.assetClassChanges
                  .liabilities,
            },
          ]
        : [],
    [report],
  );

  const netWorthData = useMemo(
    () =>
      report
        ? [
            {
              name: "Patrimonio iniziale",
              valore:
                report.performance
                  .startingNetWorth,
            },
            {
              name: "Patrimonio finale",
              valore:
                report.performance
                  .endingNetWorth,
            },
          ]
        : [],
    [report],
  );

  const financialHistorySummary =
    useMemo(() => {
      const points =
        financialHistory?.points ?? [];

      if (points.length < 2) {
        return null;
      }

      const initial =
        points[0].financialAssets;

      const final =
        points[points.length - 1]
          .financialAssets;

      const change =
        final - initial;

      const changePercentage =
        initial !== 0
          ? (change / initial) * 100
          : null;

      return {
        initial,
        final,
        change,
        changePercentage,
      };
    }, [financialHistory]);

  function requestAnalysis() {
    if (
      !fromSnapshot ||
      !toSnapshot
    ) {
      setNotice({
        severity: "warning",
        text:
          "Selezionare la fotografia iniziale e quella finale.",
      });

      return;
    }

    if (
      new Date(fromSnapshot) >=
      new Date(toSnapshot)
    ) {
      setNotice({
        severity: "warning",
        text:
          "La fotografia iniziale deve precedere quella finale.",
      });

      return;
    }

    void analyzePeriod(
      fromSnapshot,
      toSnapshot,
    );
  }

  if (loading && periods.length === 0) {
    return (
      <Box
        sx={{
          minHeight: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: {
            xs: "flex-start",
            md: "center",
          },
          flexDirection: {
            xs: "column",
            md: "row",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              fontWeight: 800,
            }}
          >
            <AssessmentRoundedIcon
              fontSize="large"
            />
            Performance Patrimoniale
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.7 }}
          >
            Rendimento depurato dai
            versamenti e dai prelievi
            esterni.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            <RefreshRoundedIcon />
          }
          disabled={loading || analyzing}
          onClick={() =>
            void loadPage()
          }
        >
          Aggiorna
        </Button>
      </Box>

      {notice && (
        <Alert
          severity={notice.severity}
          sx={{ mb: 3 }}
          onClose={() =>
            setNotice(null)
          }
        >
          {notice.text}
        </Alert>
      )}

      {financialHistory &&
        financialHistory.points.length >
          0 && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
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
                alignItems: {
                  xs: "flex-start",
                  md: "center",
                },
                flexDirection: {
                  xs: "column",
                  md: "row",
                },
                gap: 1.5,
                mb: 2,
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 750 }}
                >
                  Patrimonio finanziario
                  storico
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Serie mensile Excel
                  gennaio–luglio{" "}
                  {financialHistory.year}.
                  Sono esclusi immobili,
                  passività e valore storico
                  IBKR.
                </Typography>
              </Box>

              <Chip
                color="primary"
                variant="outlined"
                label={`${financialHistory.count} rilevazioni`}
              />
            </Box>

            {financialHistorySummary && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm:
                      "repeat(2, minmax(0, 1fr))",
                    xl:
                      "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 2,
                  mb: 3,
                }}
              >
                <KpiCard
                  label="Valore iniziale"
                  value={euro(
                    financialHistorySummary
                      .initial,
                  )}
                  subtitle="Gennaio 2026"
                />

                <KpiCard
                  label="Valore finale"
                  value={euro(
                    financialHistorySummary
                      .final,
                  )}
                  subtitle="Luglio 2026"
                />

                <KpiCard
                  label="Variazione finanziaria"
                  value={signedEuro(
                    financialHistorySummary
                      .change,
                  )}
                  subtitle="Differenza assoluta"
                  valueColor={valueColor(
                    financialHistorySummary
                      .change,
                  )}
                />

                <KpiCard
                  label="Variazione percentuale"
                  value={percentage(
                    financialHistorySummary
                      .changePercentage,
                  )}
                  subtitle="Non depurata dai flussi"
                  valueColor={valueColor(
                    financialHistorySummary
                      .changePercentage,
                  )}
                />
              </Box>
            )}

            <Box sx={{ height: 360 }}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    financialHistory.points
                  }
                  margin={{
                    top: 10,
                    right: 25,
                    left: 25,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="label"
                  />

                  <YAxis
                    width={85}
                    tickFormatter={(
                      value:
                        | number
                        | string,
                    ) =>
                      shortEuro(
                        Number(value),
                      )
                    }
                  />

                  <Tooltip
                    formatter={(value) =>
                      euro(Number(value))
                    }
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="financialAssets"
                    name="Patrimonio finanziario"
                    stroke="#1d4f7a"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="investments"
                    name="Investimenti"
                    stroke="#4d8b74"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="liquidity"
                    name="Liquidità"
                    stroke="#b7791f"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            <Alert
              severity="info"
              sx={{ mt: 2 }}
            >
              Questa serie non rappresenta
              il patrimonio netto familiare
              complessivo.
            </Alert>
          </Paper>
        )}

      {periods.length < 2 ? (
        <Alert severity="info">
          Sono necessarie almeno due
          fotografie patrimoniali per
          calcolare la performance.
        </Alert>
      ) : (
        <>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2 }}
            >
              Periodo di analisi
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md:
                    "repeat(3, minmax(0, 1fr))",
                },
                gap: 2,
                alignItems: "center",
              }}
            >
              <TextField
                select
                label="Fotografia iniziale"
                value={fromSnapshot}
                onChange={(event) =>
                  setFromSnapshot(
                    event.target.value,
                  )
                }
              >
                {periods.map(
                  (snapshot) => (
                    <MenuItem
                      key={snapshot.id}
                      value={
                        snapshot.snapshotDate
                      }
                    >
                      {dateTimeLabel(
                        snapshot.snapshotDate,
                      )}{" "}
                      —{" "}
                      {sourceLabel(
                        snapshot.source,
                      )}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                select
                label="Fotografia finale"
                value={toSnapshot}
                onChange={(event) =>
                  setToSnapshot(
                    event.target.value,
                  )
                }
              >
                {periods.map(
                  (snapshot) => (
                    <MenuItem
                      key={snapshot.id}
                      value={
                        snapshot.snapshotDate
                      }
                    >
                      {dateTimeLabel(
                        snapshot.snapshotDate,
                      )}{" "}
                      —{" "}
                      {sourceLabel(
                        snapshot.source,
                      )}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <Button
                variant="contained"
                disabled={analyzing}
                onClick={requestAnalysis}
                sx={{ minHeight: 54 }}
              >
                {analyzing
                  ? "Calcolo..."
                  : "Calcola performance"}
              </Button>
            </Box>

            {selectedFrom &&
              selectedTo && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  Da{" "}
                  {euro(
                    selectedFrom.netWorth,
                  )}{" "}
                  a{" "}
                  {euro(
                    selectedTo.netWorth,
                  )}
                </Typography>
              )}
          </Paper>

          {report && (
            <>
              {report.warnings.map(
                (warning) => (
                  <Alert
                    key={warning}
                    severity="warning"
                    sx={{ mb: 2 }}
                  >
                    {warning}
                  </Alert>
                ),
              )}

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
                    alignItems: {
                      xs: "flex-start",
                      md: "center",
                    },
                    flexDirection: {
                      xs: "column",
                      md: "row",
                    },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant="h6"
                    >
                      Metodo di calcolo
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {
                        report.methodology
                          .description
                      }
                    </Typography>
                  </Box>

                  <Chip
                    color="primary"
                    label="Modified Dietz"
                  />
                </Box>
              </Paper>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm:
                      "repeat(2, minmax(0, 1fr))",
                    xl:
                      "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 2,
                  mb: 3,
                }}
              >
                <KpiCard
                  label="Rendimento"
                  value={percentage(
                    report.performance
                      .modifiedDietzReturn,
                  )}
                  subtitle={`${report.period.days} giorni`}
                  valueColor={valueColor(
                    report.performance
                        .modifiedDietzReturn !== null &&
                      Math.abs(
                        report.performance
                          .modifiedDietzReturn,
                      ) < 0.005
                      ? 0
                      : report.performance
                          .modifiedDietzReturn,
                  )}
                />

                <KpiCard
                  label="Risultato patrimoniale"
                  value={signedEuro(
                    report.performance
                      .investmentResult,
                  )}
                  subtitle="Depurato dai flussi esterni"
                  valueColor={valueColor(
                    report.performance
                      .investmentResult,
                  )}
                />

                <KpiCard
                  label="Variazione patrimonio"
                  value={signedEuro(
                    report.performance
                      .netWorthChange,
                  )}
                  subtitle="Differenza tra le fotografie"
                  valueColor={valueColor(
                    report.performance
                      .netWorthChange,
                  )}
                />

                <KpiCard
                  label="Flussi esterni netti"
                  value={signedEuro(
                    report.performance
                      .netExternalFlow,
                  )}
                  subtitle="Entrate meno uscite esterne"
                  valueColor={valueColor(
                    report.performance
                      .netExternalFlow,
                  )}
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    xl:
                      "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 3,
                  mb: 3,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ mb: 0.5 }}
                  >
                    Patrimonio iniziale e
                    finale
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Confronto dei due valori
                    patrimoniali selezionati.
                  </Typography>

                  <Box sx={{ height: 320 }}>
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart
                        data={netWorthData}
                        margin={{
                          top: 10,
                          right: 20,
                          left: 20,
                          bottom: 40,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                        />

                        <XAxis
                          dataKey="name"
                          angle={-10}
                          textAnchor="end"
                          interval={0}
                        />

                        <YAxis
                          width={80}
                          tickFormatter={(
                            value:
                              | number
                              | string,
                          ) =>
                            shortEuro(
                              Number(value),
                            )
                          }
                        />

                        <Tooltip
                          formatter={(value) =>
                            euro(
                              Number(value),
                            )
                          }
                        />

                        <Bar
                          dataKey="valore"
                          name="Patrimonio netto"
                          fill="#1d4f7a"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ mb: 0.5 }}
                  >
                    Variazione per asset
                    class
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Differenza tra fotografia
                    iniziale e finale.
                  </Typography>

                  <Box sx={{ height: 320 }}>
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart
                        data={assetClassData}
                        margin={{
                          top: 10,
                          right: 20,
                          left: 20,
                          bottom: 50,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                        />

                        <XAxis
                          dataKey="name"
                          angle={-20}
                          textAnchor="end"
                          interval={0}
                        />

                        <YAxis
                          width={80}
                          tickFormatter={(
                            value:
                              | number
                              | string,
                          ) =>
                            shortEuro(
                              Number(value),
                            )
                          }
                        />

                        <Tooltip
                          formatter={(value) =>
                            signedEuro(
                              Number(value),
                            )
                          }
                        />

                        <Legend />

                        <Bar
                          dataKey="variazione"
                          name="Variazione"
                          fill="#4d8b74"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Box>

              <Typography
                variant="h6"
                sx={{ mb: 1.5 }}
              >
                Analisi dei flussi
              </Typography>

              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  mb: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        Voce
                      </TableCell>
                      <TableCell align="right">
                        Valore
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {[
                      {
                        label:
                          "Entrate esterne",
                        value:
                          report.performance
                            .contributions,
                      },
                      {
                        label:
                          "Uscite esterne",
                        value:
                          report.performance
                            .withdrawals,
                      },
                      {
                        label:
                          "Redditi da investimenti",
                        value:
                          report
                            .transactionAnalysis
                            .investmentIncome,
                      },
                      {
                        label:
                          "Spese patrimoniali",
                        value:
                          report
                            .transactionAnalysis
                            .investmentExpenses,
                      },
                      {
                        label:
                          "Commissioni",
                        value:
                          report
                            .transactionAnalysis
                            .fees,
                      },
                      {
                        label:
                          "Imposte",
                        value:
                          report
                            .transactionAnalysis
                            .taxes,
                      },
                      {
                        label:
                          "Acquisti",
                        value:
                          report
                            .transactionAnalysis
                            .purchases,
                      },
                      {
                        label:
                          "Vendite",
                        value:
                          report
                            .transactionAnalysis
                            .sales,
                      },
                      {
                        label:
                          "Trasferimenti interni",
                        value:
                          report
                            .transactionAnalysis
                            .internalTransfers,
                      },
                    ].map((item) => (
                      <TableRow
                        key={item.label}
                        hover
                      >
                        <TableCell>
                          {item.label}
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                          }}
                        >
                          {euro(item.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ mb: 2 }}
                >
                  Dettaglio periodo
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md:
                        "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 3,
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Fotografia iniziale
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontWeight: 750,
                      }}
                    >
                      {dateTimeLabel(
                        report.period.start,
                      )}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {sourceLabel(
                        report.startSnapshot
                          .source,
                      )}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Fotografia finale
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontWeight: 750,
                      }}
                    >
                      {dateTimeLabel(
                        report.period.end,
                      )}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {sourceLabel(
                        report.endSnapshot
                          .source,
                      )}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </>
          )}
        </>
      )}
    </Box>
  );
}
