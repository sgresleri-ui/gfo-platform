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
import DataObjectRoundedIcon from "@mui/icons-material/DataObjectRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";

import {
  Link,
} from "react-router-dom";

type JsonRecord =
  Record<string, unknown>;

type ExecutiveData = {
  risk: unknown;
  quality: unknown;
};

const API_URL = String(
  import.meta.env.VITE_API_URL ??
    "http://localhost:3000",
).replace(/\/$/, "");

function isRecord(
  value: unknown,
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeKey(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function toNumber(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .replace("%", "")
    .replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function findNumber(
  payload: unknown,
  candidateKeys: string[],
): number | null {
  const candidates = new Set(
    candidateKeys.map(normalizeKey),
  );

  function walk(
    value: unknown,
  ): number | null {
    if (Array.isArray(value)) {
      for (const item of value) {
        const result = walk(item);

        if (result !== null) {
          return result;
        }
      }

      return null;
    }

    if (!isRecord(value)) {
      return null;
    }

    for (const [
      key,
      child,
    ] of Object.entries(value)) {
      if (
        candidates.has(
          normalizeKey(key),
        )
      ) {
        const direct =
          toNumber(child);

        if (direct !== null) {
          return direct;
        }

        if (isRecord(child)) {
          for (const nestedKey of [
            "percentage",
            "weight",
            "share",
            "ratio",
            "count",
            "total",
            "grossAssetsPercentage",
            "percentageOfGrossAssets",
          ]) {
            const nested =
              toNumber(
                child[nestedKey],
              );

            if (nested !== null) {
              return nested;
            }
          }
        }
      }
    }

    for (const child of Object.values(
      value,
    )) {
      const result = walk(child);

      if (result !== null) {
        return result;
      }
    }

    return null;
  }

  return walk(payload);
}

function findAllocationWeight(
  payload: unknown,
  labels: string[],
): number | null {
  const normalizedLabels =
    labels.map(normalizeKey);

  function walk(
    value: unknown,
  ): number | null {
    if (Array.isArray(value)) {
      for (const item of value) {
        const result = walk(item);

        if (result !== null) {
          return result;
        }
      }

      return null;
    }

    if (!isRecord(value)) {
      return null;
    }

    const descriptor = [
      value.code,
      value.label,
      value.name,
      value.category,
      value.assetClass,
      value.dimension,
    ]
      .filter(
        (item): item is string =>
          typeof item === "string",
      )
      .join(" ");

    const normalizedDescriptor =
      normalizeKey(descriptor);

    const matches =
      normalizedLabels.some(
        (label) =>
          normalizedDescriptor.includes(
            label,
          ),
      );

    if (matches) {
      for (const key of [
        "percentage",
        "weight",
        "share",
        "grossAssetsPercentage",
        "percentageOfGrossAssets",
      ]) {
        const result =
          toNumber(value[key]);

        if (result !== null) {
          return result;
        }
      }
    }

    for (const child of Object.values(
      value,
    )) {
      const result = walk(child);

      if (result !== null) {
        return result;
      }
    }

    return null;
  }

  return walk(payload);
}

function percentage(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  const normalized =
    Math.abs(value) <= 1
      ? value * 100
      : value;

  return `${normalized.toLocaleString(
    "it-IT",
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  )}%`;
}

function countLabel(
  value: number | null,
): string {
  return value === null
    ? "—"
    : value.toLocaleString("it-IT");
}

function metricLabel(
  value: number | null,
): string {
  return value === null
    ? "—"
    : value.toLocaleString("it-IT", {
        maximumFractionDigits: 0,
      });
}

async function fetchJson(
  endpoint: string,
): Promise<unknown> {
  const response = await fetch(
    `${API_URL}${endpoint}`,
  );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`,
    );
  }

  return response.json() as Promise<unknown>;
}

export default function ExecutiveRiskDataPanel() {
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
      fetchJson("/risk/overview"),
      fetchJson("/risk/data-quality"),
    ])
      .then(([risk, quality]) => {
        if (!active) {
          return;
        }

        setData({
          risk,
          quality,
        });

        setError("");
      })
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile caricare rischio e qualità dati.",
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

  const metrics = useMemo(() => {
    if (!data) {
      return null;
    }

    const top1 = findNumber(
      data.risk,
      [
        "top1",
        "top1Weight",
        "top1Share",
        "top1Percentage",
        "top1GrossAssets",
        "top1GrossAssetsPercentage",
      ],
    );

    const top5 = findNumber(
      data.risk,
      [
        "top5",
        "top5Weight",
        "top5Share",
        "top5Percentage",
        "top5GrossAssets",
        "top5GrossAssetsPercentage",
      ],
    );

    const realEstate =
      findAllocationWeight(
        data.risk,
        [
          "REAL_ESTATE",
          "REAL ESTATE",
          "IMMOBILI",
          "IMMOBILIARE",
        ],
      ) ??
      findNumber(
        data.risk,
        [
          "realEstatePercentage",
          "realEstateWeight",
          "realEstateShare",
          "realEstateGrossAssets",
        ],
      );

    const hhi = findNumber(
      data.risk,
      [
        "hhi",
        "herfindahl",
        "herfindahlIndex",
      ],
    );

    const positions = findNumber(
      data.quality,
      [
        "positions",
        "totalPositions",
        "positionCount",
      ],
    );

    const positionsWithIssues =
      findNumber(
        data.quality,
        [
          "positionsWithIssues",
          "issuePositions",
          "problemPositions",
          "positionsIssues",
        ],
      );

    const missingCountry =
      findNumber(
        data.quality,
        [
          "missingCountry",
          "missingCountries",
          "positionsMissingCountry",
          "countryMissing",
        ],
      );

    const missingCurrency =
      findNumber(
        data.quality,
        [
          "missingCurrency",
          "missingCurrencies",
          "positionsMissingCurrency",
          "currencyMissing",
        ],
      );

    const futureDates =
      findNumber(
        data.quality,
        [
          "futureDates",
          "futureValuationDates",
          "positionsWithFutureDates",
        ],
      );

    return {
      top1,
      top5,
      realEstate,
      hhi,
      positions,
      positionsWithIssues,
      missingCountry,
      missingCurrency,
      futureDates,
    };
  }, [data]);

  const hasDataIssues =
    metrics?.positionsWithIssues !==
      null &&
    metrics?.positionsWithIssues !==
      undefined &&
    metrics.positionsWithIssues > 0;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
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
        Rischio e qualità dati
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Presidio sintetico della
        concentrazione patrimoniale e
        dell’affidabilità dei dati.
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
        metrics &&
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
                <ShieldRoundedIcon
                  color="primary"
                />

                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800 }}
                >
                  Concentrazione e rischio
                </Typography>
              </Box>

              <Alert
                severity="info"
                sx={{ mb: 2 }}
              >
                Metriche descrittive del
                patrimonio consolidato. Non
                vengono applicate nuove soglie
                operative.
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
                    `Top 1: ${percentage(
                      metrics.top1,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Top 5: ${percentage(
                      metrics.top5,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Immobili: ${percentage(
                      metrics.realEstate,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `HHI (0–10.000): ${metricLabel(
                      metrics.hhi,
                    )}`
                  }
                  variant="outlined"
                />
              </Box>

              <Button
                component={Link}
                to="/risk"
                variant="outlined"
                endIcon={
                  <ArrowForwardRoundedIcon />
                }
              >
                Apri analisi rischio
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
                <DataObjectRoundedIcon
                  color="primary"
                />

                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800 }}
                >
                  Qualità dati
                </Typography>
              </Box>

              <Alert
                severity={
                  hasDataIssues
                    ? "warning"
                    : "success"
                }
                sx={{ mb: 2 }}
              >
                {hasDataIssues
                  ? `${countLabel(
                      metrics.positionsWithIssues,
                    )} posizioni richiedono completamento o verifica dei dati.`
                  : "Non risultano criticità di qualità dati nel riepilogo corrente."}
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
                    `Posizioni: ${countLabel(
                      metrics.positions,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Con problemi: ${countLabel(
                      metrics.positionsWithIssues,
                    )}`
                  }
                  color={
                    hasDataIssues
                      ? "warning"
                      : "default"
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Paese mancante: ${countLabel(
                      metrics.missingCountry,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Valuta mancante: ${countLabel(
                      metrics.missingCurrency,
                    )}`
                  }
                  variant="outlined"
                />

                <Chip
                  label={
                    `Date future: ${countLabel(
                      metrics.futureDates,
                    )}`
                  }
                  variant="outlined"
                />
              </Box>

              <Button
                component={Link}
                to="/data-quality"
                variant="outlined"
                endIcon={
                  <ArrowForwardRoundedIcon />
                }
              >
                Apri qualità dati
              </Button>
            </Box>
          </Box>
        )}
    </Paper>
  );
}
