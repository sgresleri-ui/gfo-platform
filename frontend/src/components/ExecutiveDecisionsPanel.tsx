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
  Paper,
  Typography,
} from "@mui/material";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";

import {
  Link,
} from "react-router-dom";

import {
  getDecisionsOverview,
  type DecisionCategory,
  type DecisionEntry,
  type DecisionPriority,
  type DecisionStatus,
  type DecisionsOverviewResponse,
} from "../services/api";

function euro(
  value: number,
): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function dateLabel(
  value: string,
): string {
  return new Date(value).toLocaleDateString(
    "it-IT",
  );
}

function statusLabel(
  status: DecisionStatus,
): string {
  if (status === "APPROVED") {
    return "Approvata";
  }

  if (status === "IN_PROGRESS") {
    return "In esecuzione";
  }

  return "Monitoraggio";
}

function statusColor(
  status: DecisionStatus,
):
  | "success"
  | "warning"
  | "info" {
  if (status === "APPROVED") {
    return "success";
  }

  if (status === "IN_PROGRESS") {
    return "warning";
  }

  return "info";
}

function priorityLabel(
  priority: DecisionPriority,
): string {
  if (priority === "HIGH") {
    return "Alta";
  }

  if (priority === "MEDIUM") {
    return "Media";
  }

  return "Bassa";
}

function priorityColor(
  priority: DecisionPriority,
):
  | "error"
  | "warning"
  | "success" {
  if (priority === "HIGH") {
    return "error";
  }

  if (priority === "MEDIUM") {
    return "warning";
  }

  return "success";
}

function categoryLabel(
  category: DecisionCategory,
): string {
  const labels: Record<
    DecisionCategory,
    string
  > = {
    POLICY: "Politica patrimoniale",
    PROPERTY: "Immobili",
    PLANNING: "Pianificazione",
    PLATFORM: "Piattaforma",
    INVESTMENT: "Investimenti",
    LIQUIDITY: "Liquidità",
    TAX: "Fiscalità",
  };

  return labels[category];
}

function priorityRank(
  priority: DecisionPriority,
): number {
  if (priority === "HIGH") {
    return 0;
  }

  if (priority === "MEDIUM") {
    return 1;
  }

  return 2;
}

function statusRank(
  status: DecisionStatus,
): number {
  if (status === "IN_PROGRESS") {
    return 0;
  }

  if (status === "MONITORING") {
    return 1;
  }

  return 2;
}

export default function ExecutiveDecisionsPanel() {
  const [data, setData] =
    useState<DecisionsOverviewResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    getDecisionsOverview()
      .then((result) => {
        if (!active) {
          return;
        }

        setData(result);
        setError("");
      })
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile caricare le decisioni strategiche.",
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

  const openDecisions = useMemo(
    () =>
      data?.decisions.filter(
        (decision) =>
          decision.status !==
          "APPROVED",
      ) ?? [],
    [data],
  );

  const priorityDecisions = useMemo(
    () =>
      [...openDecisions]
        .sort(
          (
            left: DecisionEntry,
            right: DecisionEntry,
          ) => {
            const priorityDifference =
              priorityRank(
                left.priority,
              ) -
              priorityRank(
                right.priority,
              );

            if (
              priorityDifference !== 0
            ) {
              return priorityDifference;
            }

            const statusDifference =
              statusRank(left.status) -
              statusRank(right.status);

            if (
              statusDifference !== 0
            ) {
              return statusDifference;
            }

            return (
              new Date(
                right.decisionDate,
              ).getTime() -
              new Date(
                left.decisionDate,
              ).getTime()
            );
          },
        )
        .slice(0, 3),
    [openDecisions],
  );

  const openAmount = useMemo(
    () =>
      openDecisions.reduce(
        (total, decision) =>
          total +
          Math.abs(
            decision.amount ?? 0,
          ),
        0,
      ),
    [openDecisions],
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 0.5,
        }}
      >
        <GavelRoundedIcon
          color="primary"
        />

        <Typography variant="h6">
          Decisioni e priorità
        </Typography>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Decisioni strategiche in esecuzione,
        monitoraggio e attività ad alta
        priorità.
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
          <>
            <Alert
              severity={
                data.summary.highPriority >
                0
                  ? "warning"
                  : "success"
              }
              icon={
                <PriorityHighRoundedIcon />
              }
              sx={{ mb: 2.5 }}
            >
              {data.summary.highPriority >
              0
                ? `${data.summary.highPriority} decisioni risultano ad alta priorità.`
                : "Non risultano decisioni ad alta priorità."}
            </Alert>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                mb: 3,
              }}
            >
              <Chip
                label={
                  `Totali: ${data.summary.total}`
                }
                variant="outlined"
              />

              <Chip
                label={
                  `In esecuzione: ${data.summary.inProgress}`
                }
                color={
                  data.summary.inProgress >
                  0
                    ? "warning"
                    : "default"
                }
                variant="outlined"
              />

              <Chip
                label={
                  `Monitoraggio: ${data.summary.monitoring}`
                }
                color="info"
                variant="outlined"
              />

              <Chip
                label={
                  `Approvate: ${data.summary.approved}`
                }
                color="success"
                variant="outlined"
              />

              <Chip
                label={
                  `Priorità alta: ${data.summary.highPriority}`
                }
                color={
                  data.summary.highPriority >
                  0
                    ? "error"
                    : "default"
                }
                variant="outlined"
              />

              <Chip
                label={
                  `Importi associati aperti: ${euro(
                    openAmount,
                  )}`
                }
                variant="outlined"
              />
            </Box>

            <Typography
              variant="subtitle1"
              sx={{
                mb: 1.5,
                fontWeight: 800,
              }}
            >
              Attività strategiche prioritarie
            </Typography>

            {priorityDecisions.length ===
            0 ? (
              <Alert
                severity="success"
                sx={{ mb: 2.5 }}
              >
                Non risultano decisioni aperte.
              </Alert>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    lg:
                      "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 2,
                  mb: 2.5,
                }}
              >
                {priorityDecisions.map(
                  (decision) => (
                    <Paper
                      key={decision.id}
                      elevation={0}
                      sx={{
                        p: 2.2,
                        border: "1px solid",
                        borderColor:
                          "divider",
                      }}
                    >
                      <Box
                        sx={{
                          display:
                            "flex",
                          flexWrap:
                            "wrap",
                          gap: 0.8,
                          mb: 1.2,
                        }}
                      >
                        <Chip
                          size="small"
                          color={priorityColor(
                            decision.priority,
                          )}
                          label={
                            `Priorità ${priorityLabel(
                              decision.priority,
                            )}`
                          }
                        />

                        <Chip
                          size="small"
                          color={statusColor(
                            decision.status,
                          )}
                          variant="outlined"
                          label={statusLabel(
                            decision.status,
                          )}
                        />
                      </Box>

                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                          mb: 0.7,
                        }}
                      >
                        {decision.title}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          mb: 1.2,
                        }}
                      >
                        {categoryLabel(
                          decision.category,
                        )}
                        {" · "}
                        {dateLabel(
                          decision.decisionDate,
                        )}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          lineHeight: 1.55,
                          mb: 1.2,
                        }}
                      >
                        {decision.finalDecision}
                      </Typography>

                      {decision.amount !==
                        null && (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 750,
                          }}
                        >
                          Importo:{" "}
                          {euro(
                            decision.amount,
                          )}
                        </Typography>
                      )}
                    </Paper>
                  ),
                )}
              </Box>
            )}

            <Button
              component={Link}
              to="/decisions"
              variant="outlined"
              endIcon={
                <ArrowForwardRoundedIcon />
              }
            >
              Apri registro decisioni
            </Button>
          </>
        )}
    </Paper>
  );
}
