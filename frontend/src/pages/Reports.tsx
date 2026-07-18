import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";

import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";

import KpiCard from "../components/KpiCard";
import ReportSnapshotsPanel from "../components/ReportSnapshotsPanel";

import {
  getExecutiveReport,
  type ExecutiveReportResponse,
} from "../services/api";

type AssetAllocationItem = {
  name: string;
  value: number;
  percentage: number;
};

type OperationalAction = {
  title: string;
  description: string;
  priority: "Alta" | "Media" | "Bassa";
  date: string;
};


const REPORT_SECTION_LABELS:
  Record<string, string> = {
    wealthSummary:
      "Sintesi patrimoniale",
    wealthRegistry:
      "Registro patrimoniale",
    investments:
      "Investimenti",
    liquidity:
      "Liquidità",
    properties:
      "Immobili",
    budget:
      "Budget e planning",
    performance:
      "Performance",
    risk:
      "Rischio",
    dataQuality:
      "Qualità dei dati",
    operationalCalendar:
      "Calendario operativo",
    documents:
      "Document Center",
    dataCatalog:
      "Catalogo dati",
  };

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function nestedNumber(
  source: unknown,
  possiblePaths: string[][],
): number | null {
  for (const path of possiblePaths) {
    let current: unknown = source;

    for (const key of path) {
      if (!isRecord(current)) {
        current = null;
        break;
      }

      current = current[key];
    }

    if (
      typeof current === "number" &&
      Number.isFinite(current)
    ) {
      return current;
    }

    if (typeof current === "string") {
      const parsed = Number(current);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function categoryValueBase(
  source: unknown,
  category: string,
): number | null {
  if (!isRecord(source)) {
    return null;
  }

  const possibleArrays = [
    source.positions,
    source.items,
    source.records,
    source.data,
  ];

  let positions: unknown[] | null = null;

  for (const candidate of possibleArrays) {
    if (Array.isArray(candidate)) {
      positions = candidate;
      break;
    }
  }

  if (!positions) {
    for (const value of Object.values(source)) {
      if (
        Array.isArray(value) &&
        value.some(
          (item) =>
            isRecord(item) &&
            "category" in item &&
            "valueBase" in item,
        )
      ) {
        positions = value;
        break;
      }
    }
  }

  if (!positions) {
    return null;
  }

  let total = 0;
  let found = false;

  for (const position of positions) {
    if (!isRecord(position)) {
      continue;
    }

    if (position.category !== category) {
      continue;
    }

    if (position.status === "ARCHIVED") {
      continue;
    }

    if (position.isLiability === true) {
      continue;
    }

    const rawValue = position.valueBase;

    const value =
      typeof rawValue === "number"
        ? rawValue
        : typeof rawValue === "string"
          ? Number(rawValue)
          : NaN;

    if (Number.isFinite(value)) {
      total += value;
      found = true;
    }
  }

  return found ? total : null;
}

export default function Reports() {
  const [report, setReport] =
    useState<ExecutiveReportResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [partialWarning, setPartialWarning] =
    useState("");

  const budget =
    report?.sections.budget.data ??
    null;

  const properties =
    report?.sections.properties.data ??
    null;

  const investments =
    report?.sections.investments.data ??
    null;

  const liquidity =
    report?.sections.liquidity.data ??
    null;

  const wealth = useMemo(() => {
    const summary =
      report?.sections.wealthSummary
        .data ?? null;

    const registry =
      report?.sections.wealthRegistry
        .data ?? null;

    if (!summary && !registry) {
      return null;
    }

    return {
      summary,
      household:
        registry?.household ?? null,
      positions:
        registry?.positions ?? [],
      count:
        registry?.count ?? 0,
    };
  }, [report]);

  async function loadReport() {
    setLoading(true);
    setError("");
    setPartialWarning("");

    try {
      const result =
        await getExecutiveReport();

      setReport(result);

      if (result.status === "PARTIAL") {
        setPartialWarning(
          `Report parziale: ${result.completeness.availableSections} sezioni disponibili su ${result.completeness.totalSections}.`,
        );
      }
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile caricare il report executive consolidato.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  const euro = (value: number | null) => {
    if (value === null) {
      return "—";
    }

    return value.toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });
  };

  const euroPrecise = (value: number | null) => {
    if (value === null) {
      return "—";
    }

    return value.toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const percentage = (value: number | null) => {
    if (value === null) {
      return "—";
    }

    return `${value.toLocaleString("it-IT", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`;
  };

  const reportDate = report
    ? new Date(
        report.generatedAt,
      ).toLocaleDateString(
        "it-IT",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        },
      )
    : "—";

  const reportDateTime = report
    ? new Date(
        report.generatedAt,
      ).toLocaleString(
        "it-IT",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      )
    : "—";

  const liquidityValue =
    nestedNumber(liquidity, [
      ["summary", "totalLiquidity"],
      ["summary", "totalValue"],
      ["summary", "total"],
      ["totalLiquidity"],
      ["total"],
    ]) ??
    nestedNumber(wealth, [
      ["summary", "liquidity"],
      ["liquidity"],
    ]);

  const investmentsValue =
    nestedNumber(investments, [
      ["summary", "totalValue"],
      ["summary", "marketValue"],
      ["summary", "investments"],
      ["totalValue"],
    ]) ??
    nestedNumber(wealth, [
      ["summary", "investments"],
      ["investments"],
    ]);

  const otherAssetsValue =
    nestedNumber(wealth, [
      ["summary", "otherAssets"],
      ["summary", "otherAssetsValue"],
      ["otherAssets"],
      ["otherAssetsValue"],
    ]) ??
    categoryValueBase(
      wealth,
      "OTHER_ASSET",
    ) ??
    0;

  const wealthNetWorth =
    nestedNumber(wealth, [
      ["summary", "netWorth"],
      ["summary", "totalNetWorth"],
      ["netWorth"],
      ["totalNetWorth"],
    ]);

  const realEstateNet =
    properties?.summary.netEquity ?? null;

  const calculatedNetWorth = useMemo(() => {
    const values = [
      liquidityValue,
      investmentsValue,
      realEstateNet,
      otherAssetsValue,
    ].filter(
      (value): value is number =>
        value !== null &&
        Number.isFinite(value),
    );

    if (values.length === 0) {
      return null;
    }

    return values.reduce(
      (total, value) => total + value,
      0,
    );
  }, [
    liquidityValue,
    investmentsValue,
    realEstateNet,
    otherAssetsValue,
  ]);

  const netWorth =
    wealthNetWorth ?? calculatedNetWorth;

  const topFiveConcentration =
    nestedNumber(investments, [
      ["summary", "topFiveConcentration"],
      ["summary", "top5Concentration"],
      ["topFiveConcentration"],
      ["top5Concentration"],
    ]);

  const foreignCurrencyExposure =
    nestedNumber(liquidity, [
      ["summary", "foreignCurrencyWeight"],
      ["summary", "foreignCurrencyExposure"],
      ["foreignCurrencyWeight"],
      ["foreignCurrencyExposure"],
    ]);

  const budget2027 =
    budget?.annualComparison.find(
      (item) =>
        item.year === 2027 &&
        item.scenario === "BUDGET",
    ) ?? null;

  const finalYear =
    budget?.longTerm.years[
      budget.longTerm.years.length - 1
    ] ?? null;

  const assetAllocation =
    useMemo<AssetAllocationItem[]>(() => {
      if (!netWorth || netWorth <= 0) {
        return [];
      }

      const source = [
        {
          name: "Liquidità",
          value: liquidityValue ?? 0,
        },
        {
          name: "Investimenti finanziari",
          value: investmentsValue ?? 0,
        },
        {
          name: "Immobili netti",
          value: realEstateNet ?? 0,
        },
        {
          name: "Altri attivi",
          value: otherAssetsValue,
        },
      ].filter((item) => item.value > 0);

      return source.map((item) => ({
        ...item,
        percentage:
          (item.value / netWorth) * 100,
      }));
    }, [
      netWorth,
      liquidityValue,
      investmentsValue,
      realEstateNet,
      otherAssetsValue,
    ]);

  const operationalActions =
    useMemo<OperationalAction[]>(() => {
      if (!budget || !properties) {
        return [];
      }

      const actions: OperationalAction[] = [];

      const heldForSale =
        properties.properties.find(
          (property) =>
            property.status ===
            "HELD_FOR_SALE",
        );

      if (heldForSale) {
        actions.push({
          title: `Completare vendita ${heldForSale.name}`,
          description:
            "Verificare incasso netto, costi finali, fiscalità e destinazione della liquidità.",
          priority: "Alta",
          date:
            heldForSale.expectedClosingDate
              ? new Date(
                  heldForSale.expectedClosingDate,
                ).toLocaleDateString("it-IT")
              : "2026",
        });
      }

      actions.push({
        title:
          "Proteggere la liquidità per il 2027",
        description:
          "Mantenere una riserva sufficiente a coprire acquisti immobiliari, spese straordinarie e margine di sicurezza.",
        priority: "Alta",
        date: "2026–2027",
      });

      actions.push({
        title:
          "Ribilanciare il portafoglio finanziario",
        description:
          "Valutare il ribilanciamento dopo gli incassi immobiliari, rispettando IPS, diversificazione e costi.",
        priority: "Media",
        date: "Dopo il rogito",
      });

      actions.push({
        title:
          "Monitorare il minimo patrimoniale",
        description: `Aggiornare annualmente le ipotesi che conducono al punto minimo previsto nel ${budget.longTerm.minimumCapitalYear}.`,
        priority: "Media",
        date: "Annuale",
      });

      return actions;
    }, [budget, properties]);

  const priorityColor = (
    priority: OperationalAction["priority"],
  ) => {
    if (priority === "Alta") {
      return "error";
    }

    if (priority === "Media") {
      return "warning";
    }

    return "success";
  };

  if (loading && !budget) {
    return (
      <Box
        sx={{
          minHeight: 420,
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        "@media print": {
          "& button": {
            display: "none",
          },

          "& .report-section": {
            breakInside: "avoid",
          },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
          justifyContent: "space-between",
          flexDirection: {
            xs: "column",
            sm: "row",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4">
            Report Executive
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Situazione patrimoniale, rischi e
            piano operativo del Family Office.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1.5,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<PrintRoundedIcon />}
            onClick={() => window.print()}
          >
            Stampa
          </Button>

          <Button
            variant="contained"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => void loadReport()}
            disabled={loading}
          >
            {loading
              ? "Aggiornamento..."
              : "Aggiorna"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {partialWarning && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
        >
          {partialWarning}
        </Alert>
      )}

      <ReportSnapshotsPanel />

      {report && (
        <Paper
          className="report-section"
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
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 800 }}
              >
                Stato del report consolidato
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.4 }}
              >
                Generato il {reportDateTime}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Chip
                label={
                  report.status ===
                  "COMPLETE"
                    ? "Report completo"
                    : "Report parziale"
                }
                color={
                  report.status ===
                  "COMPLETE"
                    ? "success"
                    : "warning"
                }
              />

              <Chip
                label={`${report.completeness.percentage.toLocaleString(
                  "it-IT",
                  {
                    maximumFractionDigits: 2,
                  },
                )}% · ${report.completeness.availableSections}/${report.completeness.totalSections} sezioni`}
                variant="outlined"
              />
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
                  "repeat(3, minmax(0, 1fr))",
              },
              gap: 1.2,
            }}
          >
            {Object.entries(
              report.sections,
            ).map(
              ([name, section]) => (
                <Box
                  key={name}
                  sx={{
                    p: 1.4,
                    border: "1px solid",
                    borderColor:
                      "divider",
                    borderRadius: 1.5,
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
                      variant="body2"
                      sx={{
                        fontWeight: 750,
                      }}
                    >
                      {REPORT_SECTION_LABELS[
                        name
                      ] ?? name}
                    </Typography>

                    <Chip
                      size="small"
                      label={
                        section.status ===
                        "AVAILABLE"
                          ? "OK"
                          : "Non disponibile"
                      }
                      color={
                        section.status ===
                        "AVAILABLE"
                          ? "success"
                          : "error"
                      }
                      variant="outlined"
                    />
                  </Box>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      mt: 0.6,
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {section.source}
                  </Typography>
                </Box>
              ),
            )}
          </Box>
        </Paper>
      )}

      {budget && properties && (
        <>
          <Paper
            className="report-section"
            elevation={0}
            sx={{
              position: "relative",
              overflow: "hidden",
              mb: 3,
              p: {
                xs: 3,
                md: 4,
              },
              color: "white",
              background:
                "linear-gradient(120deg, #102844 0%, #1F4E79 55%, #3478AD 135%)",
              boxShadow:
                "0 18px 42px rgba(25, 62, 99, 0.23)",

              "&::after": {
                content: '""',
                position: "absolute",
                width: 330,
                height: 330,
                borderRadius: "50%",
                top: -205,
                right: -55,
                backgroundColor:
                  "rgba(255,255,255,0.10)",
              },
            }}
          >
            <Typography
              variant="overline"
              sx={{
                color:
                  "rgba(255,255,255,0.72)",
                letterSpacing: "0.15em",
              }}
            >
              Family Office Executive Report
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color:
                  "rgba(255,255,255,0.76)",
              }}
            >
              Patrimonio netto consolidato
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: {
                  xs: "2.25rem",
                  md: "3.1rem",
                },
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: "-0.045em",
              }}
            >
              {euroPrecise(netWorth)}
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                mt: 3,
              }}
            >
              <Chip
                label={`Report del ${reportDate}`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={`Orizzonte ${budget.longTerm.startYear}–${budget.longTerm.endYear}`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={`${properties.summary.propertyCount} immobili`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />
            </Box>
          </Paper>

          <Box
            className="report-section"
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(5, minmax(0, 1fr))",
              },
              gap: 2.2,
              mb: 3,
            }}
          >
            <KpiCard
              title="Liquidità"
              value={euro(liquidityValue)}
              subtitle="Disponibilità finanziarie"
              icon={
                <AccountBalanceWalletRoundedIcon />
              }
              tone="primary"
            />

            <KpiCard
              title="Investimenti"
              value={euro(investmentsValue)}
              subtitle="Valore di mercato"
              icon={<ShowChartRoundedIcon />}
              tone="success"
            />

            <KpiCard
              title="Immobili netti"
              value={euro(realEstateNet)}
              subtitle={`Debito ${euro(
                properties.summary.debt,
              )}`}
              icon={<HomeWorkRoundedIcon />}
              tone="warning"
            />

            <KpiCard
              title="Altri attivi"
              value={euro(otherAssetsValue)}
              subtitle="Prodotti assicurativi"
              icon={<Inventory2RoundedIcon />}
              tone="primary"
            />

            <KpiCard
              title="Capitale finale"
              value={euro(
                finalYear?.capitalEnd ?? null,
              )}
              subtitle={`Proiezione al ${
                finalYear?.year ?? "—"
              }`}
              icon={<SavingsRoundedIcon />}
              tone="success"
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                xl: "minmax(0, 1.2fr) minmax(340px, 0.8fr)",
              },
              gap: 2.5,
              mb: 3,
            }}
          >
            <Paper
              className="report-section"
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow:
                  "0 12px 32px rgba(26,45,75,0.06)",
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 0.5 }}
              >
                Asset allocation consolidata
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                Distribuzione indicativa del
                patrimonio netto.
              </Typography>

              {assetAllocation.length > 0 ? (
                <Box
                  sx={{
                    display: "grid",
                    gap: 2.3,
                  }}
                >
                  {assetAllocation.map(
                    (item) => (
                      <Box key={item.name}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            gap: 2,
                            mb: 0.7,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                            }}
                          >
                            {item.name}
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                            }}
                          >
                            {euro(item.value)} ·{" "}
                            {percentage(
                              item.percentage,
                            )}
                          </Typography>
                        </Box>

                        <LinearProgress
                          variant="determinate"
                          value={Math.min(
                            100,
                            item.percentage,
                          )}
                          sx={{
                            height: 10,
                            borderRadius: 8,
                            backgroundColor:
                              "#E9EEF6",

                            "& .MuiLinearProgress-bar":
                              {
                                borderRadius: 8,
                              },
                          }}
                        />
                      </Box>
                    ),
                  )}
                </Box>
              ) : (
                <Typography
                  color="text.secondary"
                >
                  Dati patrimoniali non
                  disponibili.
                </Typography>
              )}
            </Paper>

            <Paper
              className="report-section"
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow:
                  "0 12px 32px rgba(26,45,75,0.06)",
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 2 }}
              >
                Rischi principali
              </Typography>

              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700 }}
                >
                  Disavanzo 2027
                </Typography>

                <Typography
                  variant="body2"
                  color="error.main"
                  sx={{ mt: 0.4 }}
                >
                  {euroPrecise(
                    budget2027?.netCashFlow ??
                      null,
                  )}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700 }}
                >
                  Capitale minimo
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.4 }}
                >
                  {euroPrecise(
                    budget.longTerm
                      .minimumCapital,
                  )}{" "}
                  nel{" "}
                  {
                    budget.longTerm
                      .minimumCapitalYear
                  }
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700 }}
                >
                  LTV immobiliare
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.4 }}
                >
                  {percentage(
                    properties.summary
                      .weightedLtv,
                  )}
                </Typography>
              </Box>

              {topFiveConcentration !== null && (
                <>
                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700 }}
                    >
                      Top 5 investimenti finanziari
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.4 }}
                    >
                      {percentage(
                        topFiveConcentration,
                      )}
                    </Typography>
                  </Box>
                </>
              )}

              {foreignCurrencyExposure !==
                null && (
                <>
                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700 }}
                    >
                      Liquidità in valuta estera
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.4 }}
                    >
                      {percentage(
                        foreignCurrencyExposure,
                      )}
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>
          </Box>

          <Alert
            className="report-section"
            severity={
              budget.longTerm
                .firstNegativeCapitalYear ===
              null
                ? "success"
                : "error"
            }
            icon={
              budget.longTerm
                .firstNegativeCapitalYear ===
              null ? (
                <CheckCircleRoundedIcon />
              ) : (
                <WarningAmberRoundedIcon />
              )
            }
            sx={{ mb: 3 }}
          >
            {budget.longTerm
              .firstNegativeCapitalYear ===
            null
              ? `Il piano mantiene capitale positivo fino al ${budget.longTerm.endYear}. Il minimo patrimoniale è previsto nel ${budget.longTerm.minimumCapitalYear}.`
              : `Il capitale diventa negativo nel ${budget.longTerm.firstNegativeCapitalYear}.`}
          </Alert>

          <Paper
            className="report-section"
            elevation={0}
            sx={{
              p: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow:
                "0 12px 32px rgba(26,45,75,0.06)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                mb: 0.5,
              }}
            >
              <EventNoteRoundedIcon
                color="primary"
              />

              <Typography variant="h6">
                Piano operativo
              </Typography>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Attività prioritarie emerse dal
              report patrimoniale.
            </Typography>

            <Box
              sx={{
                display: "grid",
                gap: 2,
              }}
            >
              {operationalActions.map(
                (action, index) => (
                  <Box
                    key={action.title}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "72px minmax(0, 1fr) auto",
                      },
                      gap: 2,
                      alignItems: "start",
                      pb:
                        index <
                        operationalActions.length -
                          1
                          ? 2
                          : 0,
                      borderBottom:
                        index <
                        operationalActions.length -
                          1
                          ? "1px solid"
                          : "none",
                      borderColor: "divider",
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 700 }}
                    >
                      {action.date}
                    </Typography>

                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 750,
                          mb: 0.4,
                        }}
                      >
                        {action.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {action.description}
                      </Typography>
                    </Box>

                    <Chip
                      size="small"
                      color={priorityColor(
                        action.priority,
                      )}
                      label={action.priority}
                    />
                  </Box>
                ),
              )}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}
