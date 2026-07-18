import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Typography,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

import KpiCard from "../components/KpiCard";
import PlanningScenarioPanel from "../components/PlanningScenarioPanel";

import {
  getBudgetOverview,
  getPropertiesOverview,
  type BudgetOverviewResponse,
  type PropertiesOverviewResponse,
} from "../services/api";

type PlanningEvent = {
  id: string;
  sortKey: number;
  dateLabel: string;
  title: string;
  description: string;
  amount: number | null;
  type:
    | "PROPERTY"
    | "CAPITAL"
    | "PENSION"
    | "MILESTONE";
  severity: "success" | "warning" | "info";
};

export default function Planning() {
  const [budget, setBudget] =
    useState<BudgetOverviewResponse | null>(null);

  const [properties, setProperties] =
    useState<PropertiesOverviewResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPlanning() {
    setLoading(true);
    setError("");

    try {
      const [budgetResult, propertiesResult] =
        await Promise.all([
          getBudgetOverview(),
          getPropertiesOverview(),
        ]);

      setBudget(budgetResult);
      setProperties(propertiesResult);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile caricare il piano patrimoniale.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlanning();
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

  const percentage = (value: number) =>
    `${value.toLocaleString("it-IT", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`;

  const budget2027 = budget?.annualComparison.find(
    (item) =>
      item.year === 2027 &&
      item.scenario === "BUDGET",
  );

  const firstYear =
    budget?.longTerm.years[0] ?? null;

  const lastYear =
    budget?.longTerm.years[
      budget.longTerm.years.length - 1
    ] ?? null;

  const capitalDrawdown = useMemo(() => {
    if (
      !firstYear?.capitalStart ||
      budget?.longTerm.minimumCapital === null ||
      budget?.longTerm.minimumCapital === undefined
    ) {
      return 0;
    }

    return (
      ((firstYear.capitalStart -
        budget.longTerm.minimumCapital) /
        firstYear.capitalStart) *
      100
    );
  }, [budget, firstYear]);

  const events = useMemo<PlanningEvent[]>(() => {
    if (!budget || !properties) {
      return [];
    }

    const result: PlanningEvent[] = [];

    const propertyForSale =
      properties.properties.find(
        (property) =>
          property.status === "HELD_FOR_SALE" &&
          property.expectedClosingDate,
      );

    if (
      propertyForSale?.expectedClosingDate
    ) {
      const closingDate = new Date(
        propertyForSale.expectedClosingDate,
      );

      result.push({
        id: "property-sale",
        sortKey: closingDate.getTime(),
        dateLabel:
          closingDate.toLocaleDateString("it-IT"),
        title: `Vendita ${propertyForSale.name}`,
        description:
          "Rogito previsto e trasformazione dell’immobile in liquidità disponibile.",
        amount: propertyForSale.grossValue,
        type: "PROPERTY",
        severity: "info",
      });
    }

    if (budget2027) {
      result.push({
        id: "budget-2027",
        sortKey: new Date(
          "2027-01-01",
        ).getTime(),
        dateLabel: "2027",
        title:
          "Anno di riorganizzazione patrimoniale",
        description:
          "Anno caratterizzato da importanti spese straordinarie e investimenti immobiliari.",
        amount: budget2027.netCashFlow,
        type: "CAPITAL",
        severity:
          budget2027.netCashFlow < 0
            ? "warning"
            : "success",
      });
    }

    result.push({
      id: "pension-stefano",
      sortKey: new Date(
        "2034-12-31",
      ).getTime(),
      dateLabel: "Fine 2034",
      title: "Inizio pensione Stefano",
      description:
        "Avvio del flusso previdenziale italiano previsto dal piano familiare.",
      amount: null,
      type: "PENSION",
      severity: "success",
    });

    if (
      budget.longTerm.minimumCapitalYear &&
      budget.longTerm.minimumCapital !== null
    ) {
      result.push({
        id: "minimum-capital",
        sortKey: new Date(
          `${budget.longTerm.minimumCapitalYear}-06-30`,
        ).getTime(),
        dateLabel: String(
          budget.longTerm.minimumCapitalYear,
        ),
        title: "Punto minimo del capitale",
        description:
          "È il momento di massima pressione patrimoniale previsto dal piano.",
        amount: budget.longTerm.minimumCapital,
        type: "CAPITAL",
        severity: "warning",
      });
    }

    result.push({
      id: "pension-sandra",
      sortKey: new Date(
        "2047-01-01",
      ).getTime(),
      dateLabel: "2047",
      title: "Inizio pensione Sandra",
      description:
        "Secondo flusso previdenziale strutturale previsto dal piano familiare.",
      amount: null,
      type: "PENSION",
      severity: "success",
    });

    if (lastYear) {
      result.push({
        id: "planning-horizon",
        sortKey: new Date(
          `${lastYear.year}-12-31`,
        ).getTime(),
        dateLabel: String(lastYear.year),
        title: "Fine dell’orizzonte di piano",
        description:
          "Valore patrimoniale previsto alla conclusione della proiezione.",
        amount: lastYear.capitalEnd,
        type: "MILESTONE",
        severity:
          (lastYear.capitalEnd ?? 0) > 0
            ? "success"
            : "warning",
      });
    }

    return result.sort(
      (first, second) =>
        first.sortKey - second.sortKey,
    );
  }, [
    budget,
    properties,
    budget2027,
    lastYear,
  ]);

  const eventIcon = (
    type: PlanningEvent["type"],
  ) => {
    if (type === "PROPERTY") {
      return <HomeWorkRoundedIcon />;
    }

    if (type === "PENSION") {
      return <AccountBalanceRoundedIcon />;
    }

    if (type === "CAPITAL") {
      return <SavingsRoundedIcon />;
    }

    return <EventRoundedIcon />;
  };

  const iconBackground = (
    severity: PlanningEvent["severity"],
  ) => {
    if (severity === "success") {
      return {
        backgroundColor:
          "rgba(46, 150, 93, 0.12)",
        color: "success.main",
      };
    }

    if (severity === "warning") {
      return {
        backgroundColor:
          "rgba(230, 157, 34, 0.14)",
        color: "warning.main",
      };
    }

    return {
      backgroundColor:
        "rgba(43, 103, 183, 0.12)",
      color: "primary.main",
    };
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
            Planning
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Timeline patrimoniale, eventi
            strategici e sostenibilità futura.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => void loadPlanning()}
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

      <PlanningScenarioPanel />

      {budget && properties && (
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
                "linear-gradient(120deg, #152B46 0%, #234E79 55%, #387AAA 135%)",
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
                color: "rgba(255,255,255,0.72)",
                letterSpacing: "0.15em",
              }}
            >
              Strategic Planning
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: "rgba(255,255,255,0.76)",
              }}
            >
              Capitale previsto alla fine
              dell’orizzonte di piano
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
                lastYear?.capitalEnd ?? null,
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
                label={`Orizzonte ${budget.longTerm.startYear}–${budget.longTerm.endYear}`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={`${events.length} eventi strategici`}
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
              title="Capitale iniziale"
              value={euro(
                firstYear?.capitalStart ?? null,
              )}
              subtitle={`Inizio ${
                firstYear?.year ?? "—"
              }`}
              icon={<SavingsRoundedIcon />}
              tone="primary"
            />

            <KpiCard
              title="Capitale minimo"
              value={euro(
                budget.longTerm.minimumCapital,
              )}
              subtitle={`Previsto nel ${
                budget.longTerm
                  .minimumCapitalYear ?? "—"
              }`}
              icon={<WarningAmberRoundedIcon />}
              tone="warning"
            />

            <KpiCard
              title="Drawdown massimo"
              value={percentage(capitalDrawdown)}
              subtitle="Riduzione dal capitale iniziale"
              icon={<TimelineRoundedIcon />}
              tone="error"
            />

            <KpiCard
              title="Debito immobiliare"
              value={euro(
                properties.summary.debt,
              )}
              subtitle={`LTV ${percentage(
                properties.summary.weightedLtv,
              )}`}
              icon={<HomeWorkRoundedIcon />}
              tone="success"
            />
          </Box>

          {budget.longTerm
            .firstNegativeCapitalYear === null ? (
            <Alert
              severity="success"
              icon={<CheckCircleRoundedIcon />}
              sx={{ mb: 3 }}
            >
              Il piano mantiene capitale positivo
              per tutti i 40 anni analizzati. Il
              principale punto di attenzione rimane
              il minimo patrimoniale del{" "}
              {
                budget.longTerm
                  .minimumCapitalYear
              }
              .
            </Alert>
          ) : (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
            >
              Il capitale diventa negativo nel{" "}
              {
                budget.longTerm
                  .firstNegativeCapitalYear
              }
              .
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                xl: "minmax(0, 1.6fr) minmax(320px, 0.8fr)",
              },
              gap: 2.5,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: {
                  xs: 2.5,
                  md: 3.5,
                },
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
                Timeline patrimoniale
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                Principali eventi previsti dal piano
                familiare.
              </Typography>

              <Box>
                {events.map((event, index) => (
                  <Box
                    key={event.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "52px minmax(0, 1fr)",
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: "50%",
                          ...iconBackground(
                            event.severity,
                          ),
                        }}
                      >
                        {eventIcon(event.type)}
                      </Box>

                      {index <
                        events.length - 1 && (
                        <Box
                          sx={{
                            width: 2,
                            flexGrow: 1,
                            minHeight: 64,
                            my: 1,
                            backgroundColor:
                              "divider",
                          }}
                        />
                      )}
                    </Box>

                    <Box
                      sx={{
                        pb:
                          index <
                          events.length - 1
                            ? 3
                            : 0,
                      }}
                    >
                      <Chip
                        size="small"
                        label={event.dateLabel}
                        color={
                          event.severity ===
                          "warning"
                            ? "warning"
                            : event.severity ===
                                "success"
                              ? "success"
                              : "primary"
                        }
                        variant="outlined"
                        sx={{ mb: 1.2 }}
                      />

                      <Typography
                        variant="h6"
                        sx={{
                          fontSize: "1rem",
                          mb: 0.5,
                        }}
                      >
                        {event.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {event.description}
                      </Typography>

                      {event.amount !== null && (
                        <Typography
                          sx={{
                            mt: 1,
                            fontWeight: 750,
                            color:
                              event.amount < 0
                                ? "error.main"
                                : "text.primary",
                          }}
                        >
                          {euroPrecise(event.amount)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>

            <Box
              sx={{
                display: "grid",
                gap: 2.5,
                alignContent: "start",
              }}
            >
              <Paper
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
                  Rischi da monitorare
                </Typography>

                <Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700 }}
                  >
                    Pressione finanziaria 2027
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.4 }}
                  >
                    Saldo previsto:{" "}
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
                    Punto minimo del capitale
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
                    Passività immobiliari
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.4 }}
                  >
                    {euroPrecise(
                      properties.summary.debt,
                    )}{" "}
                    complessivi
                  </Typography>
                </Box>
              </Paper>

              <Paper
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
                  Valutazione del piano
                </Typography>

                <Chip
                  color="success"
                  label="Sostenibile"
                  sx={{ mb: 2 }}
                />

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  La proiezione non evidenzia
                  esaurimento del capitale. La fase
                  più delicata è concentrata tra il
                  2027 e il 2039, prima della
                  progressiva stabilizzazione dei
                  flussi.
                </Typography>
              </Paper>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
