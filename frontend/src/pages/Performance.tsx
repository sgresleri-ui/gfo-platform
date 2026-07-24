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
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
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
  getPositionAttribution,
  type FinancialHistoryResponse,
  type PerformancePeriodSnapshot,
  type PerformanceSummaryResponse,
  type PositionAttributionResponse,
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

function monthYearLabel(
  value: string,
): string {
  const label =
    new Date(value).toLocaleDateString(
      "it-IT",
      {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      },
    );

  return (
    label.charAt(0).toUpperCase() +
    label.slice(1)
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

function categoryLabel(
  category: string,
): string {
  const labels: Record<string, string> = {
    LIQUIDITY: "Liquidità",
    INVESTMENT: "Investimenti",
    REAL_ESTATE: "Immobili",
    OTHER_ASSET: "Altri attivi",
    LIABILITY: "Passività",
  };

  return labels[category] ?? category;
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

  const [attribution, setAttribution] =
    useState<PositionAttributionResponse | null>(
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

  const [
    attributionFilter,
    setAttributionFilter,
  ] = useState<
    "ALL" | "POSITIVE" | "NEGATIVE"
  >("ALL");

  function exportFinancialHistoryCsv() {
    if (!financialHistory) {
      return;
    }

    const decimal = (value: number) =>
      value.toFixed(2).replace(".", ",");

    const rows = [
      [
        "Mese",
        "Patrimonio finanziario",
        "Investimenti",
        "Liquidità",
        "Variazione mensile",
      ].join(";"),
      ...financialHistory.points.map(
        (point, index, points) => {
          const monthlyChange =
            index === 0
              ? ""
              : decimal(
                  point.financialAssets -
                    points[index - 1]
                      .financialAssets,
                );

          return [
            `${point.label} ${financialHistory.year}`,
            decimal(point.financialAssets),
            decimal(point.investments),
            decimal(point.liquidity),
            monthlyChange,
          ].join(";");
        },
      ),
    ];

    const blob = new Blob(
      ["\uFEFF" + rows.join("\n")],
      {
        type:
          "text/csv;charset=utf-8;",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      `patrimonio-finanziario-${financialHistory.year}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function exportPositionAttributionCsv() {
    if (!attribution) {
      return;
    }

    const decimal = (
      value: number | null,
    ) =>
      value === null
        ? ""
        : value
            .toFixed(2)
            .replace(".", ",");

    const statusLabel = (
      status:
        | "UNCHANGED"
        | "CHANGED"
        | "NEW"
        | "CLOSED",
    ) => {
      if (status === "UNCHANGED") {
        return "Invariata";
      }

      if (status === "CHANGED") {
        return "Variata";
      }

      if (status === "NEW") {
        return "Nuova";
      }

      return "Chiusa";
    };

    const rows = [
      [
        "Posizione",
        "Codice",
        "Categoria",
        "Stato",
        "Valore iniziale",
        "Valore finale",
        "Variazione valore",
        "Contributo patrimoniale",
        "Variazione percentuale",
        "Valuta base",
      ].join(";"),

      ...attribution.items.map(
        (item) =>
          [
            item.name,
            item.code,
            categoryLabel(
              item.category,
            ),
            statusLabel(
              item.comparisonStatus,
            ),
            decimal(item.startValue),
            decimal(item.endValue),
            decimal(item.valueChange),
            decimal(
              item.contributionChange,
            ),
            decimal(
              item.percentageChange,
            ),
            item.baseCurrency,
          ].join(";"),
      ),
    ];

    const blob = new Blob(
      ["\uFEFF" + rows.join("\n")],
      {
        type:
          "text/csv;charset=utf-8;",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const startDate =
      attribution.period.start.slice(
        0,
        10,
      );

    const endDate =
      attribution.period.end.slice(
        0,
        10,
      );

    link.href = url;
    link.download =
      `attribuzione-posizioni-${startDate}-${endDate}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  const analyzePeriod = useCallback(
    async (
      fromValue: string,
      toValue: string,
    ) => {
      setAnalyzing(true);
      setNotice(null);

      try {
        const [
          result,
          attributionResult,
        ] = await Promise.all([
          getPerformanceSummary(
            fromValue,
            toValue,
          ),
          getPositionAttribution(
            fromValue,
            toValue,
          ),
        ]);

        setReport(result);
        setAttribution(
          attributionResult,
        );
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
          setAttribution(null);
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

  const financialHistoryTableData =
    useMemo(
      () =>
        (
          financialHistory?.points ?? []
        ).map((point, index, points) => ({
          ...point,
          monthlyChange:
            index === 0
              ? null
              : point.financialAssets -
                points[index - 1]
                  .financialAssets,
        })),
      [financialHistory],
    );

  const filteredAttributionItems =
    useMemo(() => {
      const changedItems =
        attribution?.items.filter(
          (item) =>
            item.comparisonStatus !==
            "UNCHANGED",
        ) ?? [];

      if (attributionFilter === "POSITIVE") {
        return changedItems.filter(
          (item) =>
            item.contributionChange > 0,
        );
      }

      if (attributionFilter === "NEGATIVE") {
        return changedItems.filter(
          (item) =>
            item.contributionChange < 0,
        );
      }

      return changedItems;
    }, [attribution, attributionFilter]);

  const attributionChartData =
    useMemo(
      () =>
        (
          attribution?.items ?? []
        )
          .filter(
            (item) =>
              item.comparisonStatus !==
                "UNCHANGED" &&
              Math.abs(
                item.contributionChange,
              ) >= 0.01,
          )
          .map((item) => ({
            name: item.name,
            positivo:
              item.contributionChange > 0
                ? item.contributionChange
                : 0,
            negativo:
              item.contributionChange < 0
                ? item.contributionChange
                : 0,
          })),
      [attribution],
    );

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
                  Serie mensile Excel da{" "}
                  {monthYearLabel(
                    financialHistory.points[0]
                      .date,
                  )}{" "}
                  a{" "}
                  {monthYearLabel(
                    financialHistory.points[
                      financialHistory.points.length - 1
                    ].date,
                  )}.
                  Sono esclusi immobili,
                  passività e valore storico
                  IBKR.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Chip
                  color="primary"
                  variant="outlined"
                  label={`${financialHistory.count} rilevazioni`}
                />

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={
                    <DownloadRoundedIcon />
                  }
                  onClick={
                    exportFinancialHistoryCsv
                  }
                >
                  Esporta CSV
                </Button>
              </Box>
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
                  subtitle={monthYearLabel(
                    financialHistory.points[0]
                      .date,
                  )}
                />

                <KpiCard
                  label="Valore finale"
                  value={euro(
                    financialHistorySummary
                      .final,
                  )}
                  subtitle={monthYearLabel(
                    financialHistory.points[
                      financialHistory.points
                        .length - 1
                    ].date,
                  )}
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

              <Paper
                elevation={0}
                sx={{
                  mt: 3,
                  p: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 750 }}
                >
                  Composizione mensile degli investimenti
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5, mb: 2 }}
                >
                  Evoluzione di Advice, Advice+, Aviva e
                  polizza assicurativa.
                </Typography>

                <Box sx={{ height: 340 }}>
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={financialHistory.points}
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

                      <XAxis dataKey="label" />

                      <YAxis
                        width={85}
                        tickFormatter={(value) =>
                          shortEuro(Number(value))
                        }
                      />

                      <Tooltip
                        formatter={(value) =>
                          euro(Number(value))
                        }
                      />

                      <Legend />

                      <Bar
                        dataKey="components.advicePlus"
                        name="Advice+"
                        stackId="investimenti"
                        fill="#1d4f7a"
                      />

                      <Bar
                        dataKey="components.advice"
                        name="Advice"
                        stackId="investimenti"
                        fill="#4d8b74"
                      />

                      <Bar
                        dataKey="components.aviva"
                        name="Aviva"
                        stackId="investimenti"
                        fill="#8a6fb0"
                      />

                      <Bar
                        dataKey="components.insurance"
                        name="Polizza assicurativa"
                        stackId="investimenti"
                        fill="#b7791f"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>

              <Typography
                variant="h6"
                sx={{ mt: 3, mb: 1.5, fontWeight: 750 }}
              >
                Dettaglio mensile
              </Typography>

              <TableContainer
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Mese</TableCell>
                      <TableCell align="right">
                        Patrimonio finanziario
                      </TableCell>
                      <TableCell align="right">
                        Investimenti
                      </TableCell>
                      <TableCell align="right">
                        Liquidità
                      </TableCell>
                      <TableCell align="right">
                        Variazione mensile
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {financialHistoryTableData.map(
                      (point) => (
                        <TableRow
                          key={point.date}
                          hover
                        >
                          <TableCell sx={{ fontWeight: 700 }}>
                            {point.label}{" "}
                            {financialHistory.year}
                          </TableCell>

                          <TableCell align="right">
                            {euro(point.financialAssets)}
                          </TableCell>

                          <TableCell align="right">
                            {euro(point.investments)}
                          </TableCell>

                          <TableCell align="right">
                            {euro(point.liquidity)}
                          </TableCell>

                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 700,
                              color:
                                point.monthlyChange === null
                                  ? "text.secondary"
                                  : valueColor(point.monthlyChange),
                            }}
                          >
                            {point.monthlyChange === null
                              ? "—"
                              : signedEuro(point.monthlyChange)}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

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

              {attribution && (
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
                      mb: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="h6">
                        Attribuzione per posizione
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        Posizioni che hanno contribuito
                        alla variazione patrimoniale.
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip
                        color={
                          attribution.summary.reconciled
                            ? "success"
                            : "warning"
                        }
                        label={
                          attribution.summary.reconciled
                            ? "Riconciliato"
                            : "Da verificare"
                        }
                      />

                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                          <DownloadRoundedIcon />
                        }
                        onClick={
                          exportPositionAttributionCsv
                        }
                      >
                        Esporta CSV
                      </Button>
                    </Box>
                  </Box>

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
                    }}
                  >
                    <KpiCard
                      label="Posizioni analizzate"
                      value={String(
                        attribution.summary.positions,
                      )}
                      subtitle={`${attribution.summary.unchanged} invariate`}
                    />

                    <KpiCard
                      label="Posizioni variate"
                      value={String(
                        attribution.summary.changed,
                      )}
                      subtitle="Nel periodo selezionato"
                    />

                    <KpiCard
                      label="Contributori positivi"
                      value={String(
                        attribution.summary
                          .positiveContributors,
                      )}
                      subtitle="Variazione positiva"
                      valueColor="success.main"
                    />

                    <KpiCard
                      label="Contributori negativi"
                      value={String(
                        attribution.summary
                          .negativeContributors,
                      )}
                      subtitle="Variazione negativa"
                      valueColor="error.main"
                    />
                  </Box>
                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="h6"
                      sx={{ mb: 1.5 }}
                    >
                      Contributo alla variazione patrimoniale
                    </Typography>

                    <Box
                      sx={{
                        height: Math.max(
                          280,
                          attributionChartData.length *
                            55,
                        ),
                        mb: 3,
                      }}
                    >
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart
                          data={attributionChartData}
                          layout="vertical"
                          margin={{
                            top: 5,
                            right: 35,
                            left: 25,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                          />

                          <XAxis
                            type="number"
                            tickFormatter={(value) =>
                              shortEuro(
                                Number(value),
                              )
                            }
                          />

                          <YAxis
                            type="category"
                            dataKey="name"
                            width={145}
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
                            dataKey="positivo"
                            name="Contributo positivo"
                            fill="#4d8b74"
                          />

                          <Bar
                            dataKey="negativo"
                            name="Contributo negativo"
                            fill="#b84c4c"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>

                    <Typography
                      variant="h6"
                      sx={{ mb: 1.5 }}
                    >
                      Posizioni variate nel periodo
                    </Typography>

                    <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          flexWrap: "wrap",
                          mb: 1.5,
                        }}
                      >
                        {(
                          [
                            {
                              value: "ALL",
                              label: "Tutti",
                            },
                            {
                              value: "POSITIVE",
                              label: "Positivi",
                            },
                            {
                              value: "NEGATIVE",
                              label: "Negativi",
                            },
                          ] as const
                        ).map((filter) => (
                          <Button
                            key={filter.value}
                            size="small"
                            variant={
                              attributionFilter ===
                              filter.value
                                ? "contained"
                                : "outlined"
                            }
                            onClick={() =>
                              setAttributionFilter(
                                filter.value,
                              )
                            }
                          >
                            {filter.label}
                          </Button>
                        ))}
                      </Box>

                      <TableContainer
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        maxHeight: 420,
                      }}
                    >
                      <Table
                        size="small"
                        stickyHeader
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              Posizione
                            </TableCell>

                            <TableCell>
                              Categoria
                            </TableCell>

                            <TableCell align="right">
                              Valore iniziale
                            </TableCell>

                            <TableCell align="right">
                              Valore finale
                            </TableCell>

                            <TableCell align="right">
                              Contributo
                            </TableCell>

                            <TableCell align="center">
                              Stato
                            </TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {filteredAttributionItems.map(
                              (item) => (
                              <TableRow
                                key={item.positionId}
                                hover
                              >
                                <TableCell>
                                  <Typography
                                    sx={{
                                      fontWeight: 700,
                                    }}
                                  >
                                    {item.name}
                                  </Typography>

                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {item.code}
                                  </Typography>
                                </TableCell>

                                <TableCell>
                                  {categoryLabel(
                                    item.category,
                                  )}
                                </TableCell>

                                <TableCell align="right">
                                  {euro(
                                    item.startValue,
                                  )}
                                </TableCell>

                                <TableCell align="right">
                                  {euro(
                                    item.endValue,
                                  )}
                                </TableCell>

                                <TableCell
                                  align="right"
                                  sx={{
                                    fontWeight: 800,
                                    color: valueColor(
                                      item.contributionChange,
                                    ),
                                  }}
                                >
                                  {signedEuro(
                                    item.contributionChange,
                                  )}
                                </TableCell>

                                <TableCell align="center">
                                  <Chip
                                    size="small"
                                    color={
                                      item.comparisonStatus ===
                                      "NEW"
                                        ? "success"
                                        : item.comparisonStatus ===
                                            "CLOSED"
                                          ? "warning"
                                          : "primary"
                                    }
                                    variant="outlined"
                                    label={
                                      item.comparisonStatus ===
                                      "NEW"
                                        ? "Nuova"
                                        : item.comparisonStatus ===
                                            "CLOSED"
                                          ? "Chiusa"
                                          : "Variata"
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                </Paper>
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
