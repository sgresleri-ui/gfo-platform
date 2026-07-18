import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Box,
  Chip,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";

import type {
  ExecutiveReportSnapshotSummary,
} from "../services/api";

type Props = {
  snapshots:
    ExecutiveReportSnapshotSummary[];
};

type MetricKey =
  | "netWorth"
  | "grossAssets"
  | "liabilities"
  | "liquidity"
  | "investments"
  | "realEstate"
  | "otherAssets";

type ComparisonMetric = {
  key: MetricKey;
  label: string;
  inverse?: boolean;
};

const METRICS: ComparisonMetric[] = [
  {
    key: "netWorth",
    label: "Patrimonio netto",
  },
  {
    key: "grossAssets",
    label: "Attivi lordi",
  },
  {
    key: "liabilities",
    label: "Passività",
    inverse: true,
  },
  {
    key: "liquidity",
    label: "Liquidità",
  },
  {
    key: "investments",
    label: "Investimenti",
  },
  {
    key: "realEstate",
    label: "Immobili",
  },
  {
    key: "otherAssets",
    label: "Altri attivi",
  },
];

function formatCurrency(
  value: number | null,
  currency: string,
): string {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString(
    "it-IT",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function formatSignedCurrency(
  value: number | null,
  currency: string,
): string {
  if (value === null) {
    return "—";
  }

  const formatted =
    Math.abs(value).toLocaleString(
      "it-IT",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );

  if (value > 0) {
    return `+${formatted}`;
  }

  if (value < 0) {
    return `−${formatted}`;
  }

  return formatted;
}

function formatPercentage(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  const formatted =
    Math.abs(value).toLocaleString(
      "it-IT",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );

  if (value > 0) {
    return `+${formatted}%`;
  }

  if (value < 0) {
    return `−${formatted}%`;
  }

  return `${formatted}%`;
}

function formatDateTime(
  value: string,
): string {
  return new Date(
    value,
  ).toLocaleString(
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

function calculatePercentageChange(
  start: number | null,
  end: number | null,
): number | null {
  if (
    start === null ||
    end === null ||
    start === 0
  ) {
    return null;
  }

  return (
    ((end - start) /
      Math.abs(start)) *
    100
  );
}

export default function ReportSnapshotComparison({
  snapshots,
}: Props) {
  const [fromId, setFromId] =
    useState("");

  const [toId, setToId] =
    useState("");

  useEffect(() => {
    if (snapshots.length < 2) {
      setFromId("");
      setToId("");
      return;
    }

    setFromId((current) =>
      snapshots.some(
        (snapshot) =>
          snapshot.id === current,
      )
        ? current
        : snapshots[
            snapshots.length - 1
          ].id,
    );

    setToId((current) =>
      snapshots.some(
        (snapshot) =>
          snapshot.id === current,
      )
        ? current
        : snapshots[0].id,
    );
  }, [snapshots]);

  const fromSnapshot = useMemo(
    () =>
      snapshots.find(
        (snapshot) =>
          snapshot.id === fromId,
      ) ?? null,
    [fromId, snapshots],
  );

  const toSnapshot = useMemo(
    () =>
      snapshots.find(
        (snapshot) =>
          snapshot.id === toId,
      ) ?? null,
    [toId, snapshots],
  );

  const periodDays = useMemo(() => {
    if (
      !fromSnapshot ||
      !toSnapshot
    ) {
      return null;
    }

    return Math.round(
      (
        new Date(
          toSnapshot.generatedAt,
        ).getTime() -
        new Date(
          fromSnapshot.generatedAt,
        ).getTime()
      ) /
        86400000,
    );
  }, [
    fromSnapshot,
    toSnapshot,
  ]);

  function changeColor(
    metric: ComparisonMetric,
    change: number | null,
  ): "default" | "success" | "error" {
    if (
      change === null ||
      Math.abs(change) < 0.005
    ) {
      return "default";
    }

    const favorable =
      metric.inverse
        ? change < 0
        : change > 0;

    return favorable
      ? "success"
      : "error";
  }

  return (
    <Paper
      className="report-section"
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
          display: "flex",
          alignItems: "center",
          gap: 1.2,
          mb: 0.5,
        }}
      >
        <CompareArrowsRoundedIcon
          color="primary"
        />

        <Typography variant="h6">
          Confronto storico
        </Typography>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2.5 }}
      >
        Variazioni patrimoniali fra due
        fotografie archiviate.
      </Typography>

      {snapshots.length < 2 ? (
        <Alert severity="info">
          Serve almeno una seconda
          fotografia per effettuare il
          confronto storico.
        </Alert>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md:
                  "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
              mb: 2.5,
            }}
          >
            <TextField
              select
              label="Da"
              value={fromId}
              onChange={(event) =>
                setFromId(
                  event.target.value,
                )
              }
            >
              {snapshots.map(
                (snapshot) => (
                  <MenuItem
                    key={snapshot.id}
                    value={snapshot.id}
                  >
                    {formatDateTime(
                      snapshot.generatedAt,
                    )}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              select
              label="A"
              value={toId}
              onChange={(event) =>
                setToId(
                  event.target.value,
                )
              }
            >
              {snapshots.map(
                (snapshot) => (
                  <MenuItem
                    key={snapshot.id}
                    value={snapshot.id}
                  >
                    {formatDateTime(
                      snapshot.generatedAt,
                    )}
                  </MenuItem>
                ),
              )}
            </TextField>
          </Box>

          {fromId === toId ? (
            <Alert severity="warning">
              Selezionare due fotografie
              differenti.
            </Alert>
          ) : (
            fromSnapshot &&
            toSnapshot && (
              <>
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
                    p: 2,
                    borderRadius: 2,
                    backgroundColor:
                      "action.hover",
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Periodo confrontato
                    </Typography>

                    <Typography
                      variant="subtitle2"
                      sx={{
                        mt: 0.3,
                        fontWeight: 800,
                      }}
                    >
                      {formatDateTime(
                        fromSnapshot
                          .generatedAt,
                      )}{" "}
                      →{" "}
                      {formatDateTime(
                        toSnapshot
                          .generatedAt,
                      )}
                    </Typography>
                  </Box>

                  <Chip
                    label={
                      periodDays === null
                        ? "Periodo non disponibile"
                        : `${periodDays} giorni`
                    }
                    variant="outlined"
                  />
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gap: 1.2,
                  }}
                >
                  {METRICS.map(
                    (metric) => {
                      const startValue =
                        fromSnapshot[
                          metric.key
                        ];

                      const endValue =
                        toSnapshot[
                          metric.key
                        ];

                      const change =
                        startValue === null ||
                        endValue === null
                          ? null
                          : endValue -
                            startValue;

                      const percentageChange =
                        calculatePercentageChange(
                          startValue,
                          endValue,
                        );

                      return (
                        <Paper
                          key={metric.key}
                          elevation={0}
                          sx={{
                            p: 1.8,
                            border:
                              "1px solid",
                            borderColor:
                              "divider",
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "1fr",
                              sm:
                                "minmax(170px, 1fr) repeat(3, minmax(130px, 0.7fr))",
                            },
                            gap: 1.5,
                            alignItems:
                              "center",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 800,
                            }}
                          >
                            {metric.label}
                          </Typography>

                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Da
                            </Typography>

                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                              }}
                            >
                              {formatCurrency(
                                startValue,
                                fromSnapshot
                                  .currency,
                              )}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              A
                            </Typography>

                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                              }}
                            >
                              {formatCurrency(
                                endValue,
                                toSnapshot
                                  .currency,
                              )}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Variazione
                            </Typography>

                            <Box
                              sx={{
                                display: "flex",
                                alignItems:
                                  "center",
                                gap: 0.7,
                                flexWrap:
                                  "wrap",
                                mt: 0.2,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 800,
                                }}
                              >
                                {formatSignedCurrency(
                                  change,
                                  toSnapshot
                                    .currency,
                                )}
                              </Typography>

                              <Chip
                                size="small"
                                label={formatPercentage(
                                  percentageChange,
                                )}
                                color={changeColor(
                                  metric,
                                  change,
                                )}
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        </Paper>
                      );
                    },
                  )}
                </Box>
              </>
            )
          )}
        </>
      )}
    </Paper>
  );
}
