import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";

import KpiCard from "../components/KpiCard";
import {
  getBudgetOverview,
  type BudgetOverviewResponse,
  type LongTermBudgetYear,
} from "../services/api";

export default function Budget() {
  const [data, setData] =
    useState<BudgetOverviewResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBudget() {
    setLoading(true);
    setError("");

    try {
      const result = await getBudgetOverview();
      setData(result);
    } catch (requestError) {
      console.error(requestError);
      setError("Impossibile caricare il budget.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBudget();
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

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("it-IT");

  const budget2027 = data?.annualComparison.find(
    (item) =>
      item.year === 2027 &&
      item.scenario === "BUDGET",
  );

  const finalYear =
    data?.longTerm.years[
      data.longTerm.years.length - 1
    ];

  const milestoneYears = useMemo(() => {
    if (!data) {
      return [];
    }

    const selected = new Set([
      2027,
      2030,
      2034,
      2035,
      2039,
      2040,
      2047,
      2050,
      2060,
      2066,
    ]);

    return data.longTerm.years.filter((year) =>
      selected.has(year.year),
    );
  }, [data]);

  const maximumCapital = useMemo(() => {
    if (!data) {
      return 1;
    }

    const values = data.longTerm.years
      .map((year) => year.capitalEnd)
      .filter(
        (value): value is number =>
          value !== null && value > 0,
      );

    return values.length > 0
      ? Math.max(...values)
      : 1;
  }, [data]);

  if (loading && !data) {
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
    <Box>
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
            Budget
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Budget annuale e sostenibilità
            patrimoniale dal 2027 al 2066.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => void loadBudget()}
          disabled={loading}
        >
          {loading
            ? "Aggiornamento..."
            : "Aggiorna"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {data && budget2027 && (
        <>
          <Paper
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
                "linear-gradient(120deg, #16385C 0%, #245B8E 55%, #4C8CC2 135%)",
              boxShadow:
                "0 18px 42px rgba(31, 76, 120, 0.22)",

              "&::after": {
                content: '""',
                position: "absolute",
                width: 320,
                height: 320,
                borderRadius: "50%",
                top: -190,
                right: -60,
                backgroundColor:
                  "rgba(255,255,255,0.10)",
              },
            }}
          >
            <Typography
              variant="overline"
              sx={{
                color: "rgba(255,255,255,0.72)",
                letterSpacing: "0.15em",
              }}
            >
              Budget 2027
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: "rgba(255,255,255,0.76)",
              }}
            >
              Flusso finanziario netto previsto
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
              {euroPrecise(
                budget2027.netCashFlow,
              )}
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
                label={`Costi ${euro(
                  budget2027.totalExpenses,
                )}`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={`Ricavi ${euro(
                  budget2027.revenues,
                )}`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={`Dati al ${formatDate(
                  data.asOfDate,
                )}`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />
            </Box>
          </Paper>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(4, minmax(0, 1fr))",
              },
              gap: 2.2,
              mb: 3,
            }}
          >
            <KpiCard
              title="Costi 2027"
              value={euro(
                budget2027.totalExpenses,
              )}
              subtitle="Ordinari e straordinari"
              icon={<PaymentsRoundedIcon />}
              tone="error"
            />

            <KpiCard
              title="Saldo 2027"
              value={euro(
                budget2027.netCashFlow,
              )}
              subtitle="Impatto sul capitale"
              icon={<TrendingDownRoundedIcon />}
              tone="warning"
            />

            <KpiCard
              title="Capitale minimo"
              value={euro(
                data.longTerm.minimumCapital,
              )}
              subtitle={
                data.longTerm.minimumCapitalYear
                  ? `Previsto nel ${data.longTerm.minimumCapitalYear}`
                  : "Anno non disponibile"
              }
              icon={<SavingsRoundedIcon />}
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
              icon={<TimelineRoundedIcon />}
              tone="success"
            />
          </Box>

          {data.longTerm.firstNegativeCapitalYear ===
          null ? (
            <Alert
              severity="success"
              sx={{ mb: 3 }}
            >
              Il piano non evidenzia anni con
              capitale negativo fino al{" "}
              {data.longTerm.endYear}.
              Il punto minimo è previsto nel{" "}
              {data.longTerm.minimumCapitalYear},
              con un capitale residuo di{" "}
              {euroPrecise(
                data.longTerm.minimumCapital,
              )}
              .
            </Alert>
          ) : (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
            >
              Il capitale diventa negativo nel{" "}
              {
                data.longTerm
                  .firstNegativeCapitalYear
              }
              .
            </Alert>
          )}

          {data.warnings.map((warning) => (
            <Alert
              key={warning}
              severity="warning"
              sx={{ mb: 2 }}
            >
              {warning}
            </Alert>
          ))}

          <Typography
            variant="h6"
            sx={{ mb: 1.5 }}
          >
            Confronto annuale
          </Typography>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              mb: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow:
                "0 12px 32px rgba(26,45,75,0.06)",
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Periodo</TableCell>
                  <TableCell align="right">
                    Spese ordinarie
                  </TableCell>
                  <TableCell align="right">
                    Straordinarie
                  </TableCell>
                  <TableCell align="right">
                    Costi totali
                  </TableCell>
                  <TableCell align="right">
                    Ricavi
                  </TableCell>
                  <TableCell align="right">
                    Saldo
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.annualComparison.map(
                  (item) => (
                    <TableRow
                      key={`${item.year}-${item.scenario}`}
                      hover
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {item.year}{" "}
                          {item.scenario ===
                          "FORECAST"
                            ? "Forecast"
                            : "Budget"}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        {euroPrecise(
                          item.ordinaryExpenses,
                        )}
                      </TableCell>

                      <TableCell align="right">
                        {euroPrecise(
                          item.extraordinaryExpenses,
                        )}
                      </TableCell>

                      <TableCell align="right">
                        {euroPrecise(
                          item.totalExpenses,
                        )}
                      </TableCell>

                      <TableCell align="right">
                        {euroPrecise(
                          item.revenues,
                        )}
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 750,
                            color:
                              item.netCashFlow < 0
                                ? "error.main"
                                : "success.main",
                          }}
                        >
                          {euroPrecise(
                            item.netCashFlow,
                          )}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography
            variant="h6"
            sx={{ mb: 1.5 }}
          >
            Evoluzione del capitale
          </Typography>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow:
                "0 12px 32px rgba(26,45,75,0.06)",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gap: 2.2,
              }}
            >
              {milestoneYears.map(
                (year: LongTermBudgetYear) => {
                  const capital =
                    year.capitalEnd ?? 0;

                  return (
                    <Box key={year.year}>
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
                          sx={{ fontWeight: 700 }}
                        >
                          {year.year}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {euroPrecise(
                            year.capitalEnd,
                          )}
                        </Typography>
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={Math.max(
                          0,
                          Math.min(
                            100,
                            (capital /
                              maximumCapital) *
                              100,
                          ),
                        )}
                        color={
                          year.year ===
                          data.longTerm
                            .minimumCapitalYear
                            ? "warning"
                            : "primary"
                        }
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
                  );
                },
              )}
            </Box>
          </Paper>

          <Typography
            variant="h6"
            sx={{ mb: 1.5 }}
          >
            Piano pluriennale 2027–2066
          </Typography>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              maxHeight: 580,
              border: "1px solid",
              borderColor: "divider",
              boxShadow:
                "0 12px 32px rgba(26,45,75,0.06)",
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Anno</TableCell>
                  <TableCell align="right">
                    Capitale iniziale
                  </TableCell>
                  <TableCell align="right">
                    Costi
                  </TableCell>
                  <TableCell align="right">
                    Ricavi
                  </TableCell>
                  <TableCell align="right">
                    Saldo
                  </TableCell>
                  <TableCell align="right">
                    Capitale finale
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.longTerm.years.map(
                  (year) => (
                    <TableRow
                      key={year.year}
                      hover
                      sx={{
                        backgroundColor:
                          year.year ===
                          data.longTerm
                            .minimumCapitalYear
                            ? "rgba(237, 170, 45, 0.10)"
                            : undefined,
                      }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {year.year}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        {euroPrecise(
                          year.capitalStart,
                        )}
                      </TableCell>

                      <TableCell align="right">
                        {euroPrecise(
                          year.totalCosts,
                        )}
                      </TableCell>

                      <TableCell align="right">
                        {euroPrecise(
                          year.totalRevenues,
                        )}
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            color:
                              year.netCashFlow < 0
                                ? "error.main"
                                : "success.main",
                          }}
                        >
                          {euroPrecise(
                            year.netCashFlow,
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 750 }}
                        >
                          {euroPrecise(
                            year.capitalEnd,
                          )}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
