import {
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
  Divider,
  Paper,
  Typography,
} from "@mui/material";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";

import {
  Link,
} from "react-router-dom";

import {
  getBudgetOverview,
  getPropertiesOverview,
  type BudgetOverviewResponse,
  type PropertiesOverviewResponse,
} from "../services/api";

type ExecutiveData = {
  properties: PropertiesOverviewResponse;
  budget: BudgetOverviewResponse;
};

function euro(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function signedEuro(
  value: number,
): string {
  return value > 0
    ? `+${euro(value)}`
    : euro(value);
}

function percentage(
  value: number,
): string {
  return `${value.toLocaleString(
    "it-IT",
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  )}%`;
}

function dateLabel(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString(
    "it-IT",
  );
}

export default function ExecutivePropertyBudgetPlanningPanel() {
  const [data, setData] =
    useState<ExecutiveData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      getPropertiesOverview(),
      getBudgetOverview(),
    ])
      .then(
        ([
          properties,
          budget,
        ]) => {
          if (!active) {
            return;
          }

          setData({
            properties,
            budget,
          });

          setError("");
        },
      )
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile caricare immobili, budget e planning.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const budget2027 = useMemo(
    () =>
      data?.budget.annualComparison.find(
        (item) =>
          item.year === 2027 &&
          item.scenario === "BUDGET",
      ) ?? null,
    [data],
  );

  const propertyForSale = useMemo(
    () =>
      data?.properties.properties.find(
        (property) =>
          property.status ===
            "HELD_FOR_SALE" &&
          property.expectedClosingDate !==
            null,
      ) ?? null,
    [data],
  );

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2.2,
        p: 3,
        border: "1px solid",
        borderColor: "divider",
        boxShadow:
          "0 12px 32px rgba(26, 45, 75, 0.06)",
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 0.5 }}
      >
        Immobili, budget e planning
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Patrimonio immobiliare, flussi
        previsionali e sostenibilità del piano
        familiare.
      </Typography>

      {loading && (
        <Box
          sx={{
            minHeight: 190,
            display: "grid",
            placeItems: "center",
          }}
        >
          <CircularProgress size={30} />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {!loading &&
        data &&
        !error && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                xl:
                  "repeat(3, minmax(0, 1fr))",
              },
              gap: 3,
            }}
          >
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1.5,
                }}
              >
                <HomeWorkRoundedIcon
                  color="primary"
                />

                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800 }}
                >
                  Patrimonio immobiliare
                </Typography>
              </Box>

              <Alert
                severity={
                  data.properties.summary
                    .heldForSaleCount > 0
                    ? "info"
                    : "success"
                }
                sx={{ mb: 2 }}
              >
                Patrimonio immobiliare netto:{" "}
                <strong>
                  {euro(
                    data.properties.summary
                      .netEquity,
                  )}
                </strong>
                .
              </Alert>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  mb: 2.5,
                }}
              >
                <Chip
                  label={
                    `Immobili: ${
                      data.properties.summary
                        .propertyCount
                    }`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Valore lordo: ${euro(
                      data.properties.summary
                        .grossValue,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Debito: ${euro(
                      data.properties.summary
                        .debt,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `LTV: ${percentage(
                      data.properties.summary
                        .weightedLtv,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `In vendita: ${
                      data.properties.summary
                        .heldForSaleCount
                    }`
                  }
                  color={
                    data.properties.summary
                      .heldForSaleCount > 0
                      ? "info"
                      : "default"
                  }
                  variant="outlined"
                />
              </Box>

              <Button
                component={Link}
                to="/properties"
                variant="outlined"
                endIcon={
                  <ArrowForwardRoundedIcon />
                }
              >
                Apri immobili
              </Button>
            </Box>

            <Box
              sx={{
                borderLeft: {
                  xs: "none",
                  xl: "1px solid",
                },
                borderColor: "divider",
                pl: {
                  xs: 0,
                  xl: 3,
                },
              }}
            >
              <Divider
                sx={{
                  display: {
                    xs: "block",
                    xl: "none",
                  },
                  mb: 3,
                }}
              />

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1.5,
                }}
              >
                <PaymentsRoundedIcon
                  color="primary"
                />

                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800 }}
                >
                  Budget
                </Typography>
              </Box>

              <Alert
                severity={
                  data.budget.warnings.length >
                    0 ||
                  (
                    budget2027?.netCashFlow ??
                    0
                  ) < 0
                    ? "warning"
                    : "success"
                }
                sx={{ mb: 2 }}
              >
                {budget2027
                  ? `Flusso netto previsto per il 2027: ${signedEuro(
                      budget2027.netCashFlow,
                    )}.`
                  : "Budget 2027 non disponibile."}
              </Alert>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  mb: 2.5,
                }}
              >
                <Chip
                  label={
                    `Spese 2027: ${euro(
                      budget2027
                        ?.totalExpenses ??
                        null,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Entrate 2027: ${euro(
                      budget2027?.revenues ??
                        null,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Flusso medio: ${signedEuro(
                      data.budget.longTerm
                        .averageNetCashFlow,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Avvisi: ${
                      data.budget.warnings.length
                    }`
                  }
                  color={
                    data.budget.warnings.length >
                    0
                      ? "warning"
                      : "success"
                  }
                  variant="outlined"
                />
              </Box>

              <Button
                component={Link}
                to="/budget"
                variant="outlined"
                endIcon={
                  <ArrowForwardRoundedIcon />
                }
              >
                Apri budget
              </Button>
            </Box>

            <Box
              sx={{
                borderLeft: {
                  xs: "none",
                  xl: "1px solid",
                },
                borderColor: "divider",
                pl: {
                  xs: 0,
                  xl: 3,
                },
              }}
            >
              <Divider
                sx={{
                  display: {
                    xs: "block",
                    xl: "none",
                  },
                  mb: 3,
                }}
              />

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1.5,
                }}
              >
                <TimelineRoundedIcon
                  color="primary"
                />

                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800 }}
                >
                  Planning
                </Typography>
              </Box>

              <Alert
                severity={
                  data.budget.longTerm
                    .firstNegativeCapitalYear
                  !== null
                    ? "warning"
                    : "success"
                }
                sx={{ mb: 2 }}
              >
                {data.budget.longTerm
                  .firstNegativeCapitalYear !==
                null
                  ? `Il capitale diventa negativo nel ${data.budget.longTerm.firstNegativeCapitalYear}.`
                  : "Nel periodo analizzato non risultano anni con capitale finale negativo."}
              </Alert>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  mb: 2.5,
                }}
              >
                <Chip
                  label={
                    `Orizzonte: ${
                      data.budget.longTerm
                        .startYear ??
                      "—"
                    }–${
                      data.budget.longTerm
                        .endYear ??
                      "—"
                    }`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Capitale minimo: ${euro(
                      data.budget.longTerm
                        .minimumCapital,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Anno minimo: ${
                      data.budget.longTerm
                        .minimumCapitalYear ??
                      "—"
                    }`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Prossimo rogito: ${dateLabel(
                      propertyForSale
                        ?.expectedClosingDate ??
                        null,
                    )}`
                  }
                  color={
                    propertyForSale
                      ? "info"
                      : "default"
                  }
                  variant="outlined"
                />
              </Box>

              <Button
                component={Link}
                to="/planning"
                variant="outlined"
                endIcon={
                  <ArrowForwardRoundedIcon />
                }
              >
                Apri planning
              </Button>
            </Box>
          </Box>
        )}
    </Paper>
  );
}
