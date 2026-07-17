import {
  useEffect,
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
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";

import {
  Link,
} from "react-router-dom";

import {
  getLiquidityOverview,
  getPerformanceSummary,
  type LiquidityOverviewResponse,
  type PerformanceSummaryResponse,
} from "../services/api";

type ExecutiveData = {
  performance: PerformanceSummaryResponse;
  liquidity: LiquidityOverviewResponse;
};

function euro(
  value: number,
): string {
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
  value: number | null,
): string {
  if (value === null) {
    return "Non disponibile";
  }

  const formatted =
    value.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return value > 0
    ? `+${formatted}%`
    : `${formatted}%`;
}

function dateLabel(
  value: string,
): string {
  return new Date(value).toLocaleDateString(
    "it-IT",
  );
}

export default function ExecutivePerformanceLiquidityPanel() {
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
      getPerformanceSummary(),
      getLiquidityOverview(),
    ])
      .then(
        ([
          performance,
          liquidity,
        ]) => {
          if (!active) {
            return;
          }

          setData({
            performance,
            liquidity,
          });

          setError("");
        },
      )
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile caricare performance e liquidità.",
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
        Performance e liquidità
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Risultato patrimoniale del periodo e
        struttura delle disponibilità liquide.
      </Typography>

      {loading && (
        <Box
          sx={{
            minHeight: 180,
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
                lg:
                  "repeat(2, minmax(0, 1fr))",
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
                <AssessmentRoundedIcon
                  color="primary"
                />

                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800 }}
                >
                  Performance patrimoniale
                </Typography>
              </Box>

              <Alert
                severity={
                  data.performance.warnings
                    .length > 0
                    ? "warning"
                    : "success"
                }
                sx={{ mb: 2 }}
              >
                Periodo dal{" "}
                <strong>
                  {dateLabel(
                    data.performance.period
                      .start,
                  )}
                </strong>{" "}
                al{" "}
                <strong>
                  {dateLabel(
                    data.performance.period
                      .end,
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
                    `Rendimento: ${percentage(
                      data.performance
                        .performance
                        .modifiedDietzReturn,
                    )}`
                  }
                  color={
                    (
                      data.performance
                        .performance
                        .modifiedDietzReturn ??
                      0
                    ) > 0
                      ? "success"
                      : "default"
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Risultato: ${signedEuro(
                      data.performance
                        .performance
                        .investmentResult,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Variazione patrimonio: ${signedEuro(
                      data.performance
                        .performance
                        .netWorthChange,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Flussi netti: ${signedEuro(
                      data.performance
                        .performance
                        .netExternalFlow,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Movimenti registrati: ${
                      data.performance
                        .transactionAnalysis
                        .postedTransactions
                    }`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Avvisi: ${
                      data.performance
                        .warnings.length
                    }`
                  }
                  color={
                    data.performance.warnings
                      .length > 0
                      ? "warning"
                      : "success"
                  }
                  variant="outlined"
                />
              </Box>

              <Button
                component={Link}
                to="/performance"
                variant="outlined"
                endIcon={
                  <ArrowForwardRoundedIcon />
                }
              >
                Apri performance
              </Button>
            </Box>

            <Box
              sx={{
                borderLeft: {
                  xs: "none",
                  lg: "1px solid",
                },
                borderColor: "divider",
                pl: {
                  xs: 0,
                  lg: 3,
                },
              }}
            >
              <Divider
                sx={{
                  display: {
                    xs: "block",
                    lg: "none",
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
                <AccountBalanceWalletRoundedIcon
                  color="primary"
                />

                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800 }}
                >
                  Liquidità consolidata
                </Typography>
              </Box>

              <Alert
                severity={
                  data.liquidity.dataQuality
                    .warnings.length > 0
                    ? "warning"
                    : "success"
                }
                sx={{ mb: 2 }}
              >
                Disponibilità complessive:{" "}
                <strong>
                  {euro(
                    data.liquidity.summary
                      .totalLiquidity,
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
                    `Conti: ${
                      data.liquidity.summary
                        .accountCount
                    }`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Istituti: ${
                      data.liquidity.summary
                        .institutionCount
                    }`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Conto maggiore: ${
                      data.liquidity.summary
                        .largestAccountWeight
                        .toLocaleString(
                          "it-IT",
                          {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          },
                        )
                    }%`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Top 3: ${
                      data.liquidity.summary
                        .topThreeConcentration
                        .toLocaleString(
                          "it-IT",
                          {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          },
                        )
                    }%`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Valuta estera: ${
                      data.liquidity.summary
                        .foreignCurrencyWeight
                        .toLocaleString(
                          "it-IT",
                          {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          },
                        )
                    }%`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Avvisi dati: ${
                      data.liquidity
                        .dataQuality
                        .warnings.length
                    }`
                  }
                  color={
                    data.liquidity.dataQuality
                      .warnings.length > 0
                      ? "warning"
                      : "success"
                  }
                  variant="outlined"
                />
              </Box>

              <Button
                component={Link}
                to="/liquidity"
                variant="outlined"
                endIcon={
                  <ArrowForwardRoundedIcon />
                }
              >
                Apri liquidità
              </Button>
            </Box>
          </Box>
        )}
    </Paper>
  );
}
