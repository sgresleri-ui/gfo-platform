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
import PolicyRoundedIcon from "@mui/icons-material/PolicyRounded";

import {
  Link,
} from "react-router-dom";

import {
  getIpsClassifications,
  getIpsCompliance,
  type IpsClassificationOverviewResponse,
  type IpsComplianceResponse,
} from "../services/api";

type ExecutiveIpsData = {
  compliance: IpsComplianceResponse;
  classifications:
    IpsClassificationOverviewResponse;
};

type AlertSeverity =
  | "success"
  | "info"
  | "warning"
  | "error";

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

export default function ExecutiveIpsPanel() {
  const [data, setData] =
    useState<ExecutiveIpsData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      getIpsCompliance(),
      getIpsClassifications(),
    ])
      .then(
        ([
          compliance,
          classifications,
        ]) => {
          if (!active) {
            return;
          }

          setData({
            compliance,
            classifications,
          });

          setError("");
        },
      )
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile caricare lo stato IPS.",
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

  const executiveStatus = useMemo(() => {
    if (!data) {
      return null;
    }

    const compliance =
      data.compliance.summary;

    const classifications =
      data.classifications.summary;

    let severity: AlertSeverity =
      "success";

    let title =
      "Controllo IPS operativo";

    let message =
      "Il patrimonio finanziario è classificato e il controllo IPS è disponibile.";

    if (compliance.breaches > 0) {
      severity = "error";
      title =
        "Violazioni IPS da esaminare";

      message =
        `${compliance.breaches} indicatori risultano fuori dai limiti configurati.`;
    } else if (
      classifications
        .unclassifiedPositions > 0
    ) {
      severity = "warning";
      title =
        "Ribilanciamento sospeso";

      message =
        `Restano ${classifications.unclassifiedPositions} posizioni finanziarie da classificare.`;
    } else if (
      compliance.configured === 0
    ) {
      severity = "info";
      title =
        "Limiti IPS non ancora configurati";

      message =
        "La classificazione è disponibile, ma nessuna soglia generale è ancora attiva.";
    }

    return {
      severity,
      title,
      message,
    };
  }, [data]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        minHeight: 300,
        height: "100%",
        display: "flex",
        flexDirection: "column",
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
          mb: 2,
        }}
      >
        <PolicyRoundedIcon
          color="primary"
        />

        <Typography variant="h6">
          Stato IPS
        </Typography>
      </Box>

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
        executiveStatus && (
          <>
            <Alert
              severity={
                executiveStatus.severity
              }
              sx={{ mb: 2 }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 800 }}
              >
                {executiveStatus.title}
              </Typography>

              <Typography
                variant="body2"
                sx={{ mt: 0.4 }}
              >
                {executiveStatus.message}
              </Typography>
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
                size="small"
                color={
                  data.compliance.summary
                    .breaches > 0
                    ? "error"
                    : "success"
                }
                variant="outlined"
                label={
                  `Violazioni: ${data.compliance.summary.breaches}`
                }
              />

              <Chip
                size="small"
                color="info"
                variant="outlined"
                label={
                  `Copertura: ${percentage(
                    data.classifications
                      .summary
                      .coveragePercentage,
                  )}`
                }
              />

              <Chip
                size="small"
                color={
                  data.classifications
                    .summary
                    .unclassifiedPositions >
                  0
                    ? "warning"
                    : "success"
                }
                variant="outlined"
                label={
                  `Da classificare: ${
                    data.classifications
                      .summary
                      .unclassifiedPositions
                  }`
                }
              />

              <Chip
                size="small"
                variant="outlined"
                label={
                  `Da approfondire: ${
                    data.classifications
                      .summary
                      .pendingInformationPositions
                  }`
                }
              />

              <Chip
                size="small"
                variant="outlined"
                label={
                  `Rinviate: ${
                    data.classifications
                      .summary
                      .deferredPositions
                  }`
                }
              />
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2.5,
                lineHeight: 1.65,
              }}
            >
              Ribilanciamento:{" "}
              <strong>
                {data.classifications
                  .summary
                  .rebalanceAvailable
                  ? "disponibile"
                  : "sospeso"}
              </strong>
              .
            </Typography>

            <Button
              component={Link}
              to="/ips"
              variant="contained"
              endIcon={
                <ArrowForwardRoundedIcon />
              }
            >
              Apri IPS e conformità
            </Button>
          </>
        )}
    </Paper>
  );
}
