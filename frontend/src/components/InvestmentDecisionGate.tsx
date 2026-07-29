import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Typography,
  type ChipProps,
} from "@mui/material";

import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  createElToroInvestmentDecisionPackage,
  getElToroInvestmentDecisionPackage,
  type InvestmentDecisionGateResponse,
  type InvestmentDecisionGateStatus,
} from "../services/api";

type InvestmentDecisionGateProps = {
  recommendationId: string;
  refreshToken: string;
  recommendationIsCurrent: boolean;
};

function euro(value: number): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function readinessPresentation(status: InvestmentDecisionGateStatus): {
  label: string;
  color: ChipProps["color"];
} {
  if (status === "READY") {
    return {
      label: "Pronto",
      color: "success",
    };
  }

  if (status === "PENDING") {
    return {
      label: "In attesa",
      color: "warning",
    };
  }

  return {
    label: "Bloccato",
    color: "error",
  };
}

export default function InvestmentDecisionGate({
  recommendationId,
  refreshToken,
  recommendationIsCurrent,
}: InvestmentDecisionGateProps) {
  const [gate, setGate] = useState<InvestmentDecisionGateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadGate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getElToroInvestmentDecisionPackage();
      setGate(response);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Impossibile caricare il gate decisionale.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Ricarica il gate quando cambia lo snapshot del Recommendation Engine.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGate();
  }, [loadGate, recommendationId, refreshToken]);

  const freezePackage = async () => {
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await createElToroInvestmentDecisionPackage(
        recommendationId,
      );
      setGate(response);
      setSuccess(
        response.created === false
          ? "La configurazione corrente era già stata congelata."
          : "Pacchetto preliminare congelato e registrato nel Registro Decisioni.",
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Impossibile congelare il pacchetto decisionale.",
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: 160, display: "grid", placeItems: "center" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!gate) {
    return (
      <Alert
        severity="error"
        action={<Button onClick={loadGate}>Riprova</Button>}
      >
        {error ?? "Gate decisionale non disponibile."}
      </Alert>
    );
  }

  const decisionPackage = gate.decisionPackage;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <FactCheckRoundedIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 850 }}>
              Investment Decision Gate
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            Congela una baseline verificabile per la revisione professionale,
            senza autorizzare l’acquisto.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            startIcon={<RefreshRoundedIcon />}
            onClick={loadGate}
            disabled={creating}
          >
            Ricarica stato
          </Button>
          <Button
            variant="contained"
            startIcon={
              creating ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <LockRoundedIcon />
              )
            }
            disabled={
              creating ||
              !gate.canFreeze ||
              !recommendationIsCurrent ||
              decisionPackage?.isCurrent === true
            }
            onClick={freezePackage}
          >
            Congela per validazione
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
          gap: 1,
          mt: 2,
        }}
      >
        {gate.readiness.map((check) => {
          const presentation = readinessPresentation(check.status);

          return (
            <Paper
              key={check.code}
              variant="outlined"
              sx={{ p: 1.25, borderRadius: 2 }}
            >
              <Typography variant="caption" color="text.secondary">
                {check.label}
              </Typography>
              <Box sx={{ mt: 0.75 }}>
                <Chip
                  size="small"
                  color={presentation.color}
                  label={presentation.label}
                />
              </Box>
            </Paper>
          );
        })}
      </Box>

      {gate.blockingReasons.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {gate.blockingReasons.join(" ")}
        </Alert>
      )}

      {decisionPackage && (
        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2.5,
            borderColor: decisionPackage.isCurrent
              ? "success.light"
              : "warning.light",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                Pacchetto preliminare v{decisionPackage.version}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Creato il {dateLabel(decisionPackage.createdAt)} · registrato
                nel Registro Decisioni
              </Typography>
            </Box>
            <Chip
              size="small"
              color={decisionPackage.isCurrent ? "success" : "warning"}
              label={
                decisionPackage.isCurrent
                  ? "Baseline corrente"
                  : "Superato da modifiche"
              }
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 1,
              mt: 1.5,
            }}
          >
            {decisionPackage.payload.dueDiligence.selectedInstruments.map(
              (instrument) => (
                <Box
                  key={instrument.isin}
                  sx={{ p: 1.25, bgcolor: "action.hover", borderRadius: 2 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                    {instrument.ticker} · {instrument.assetClassLabel}
                  </Typography>
                  <Typography variant="body2">
                    {euro(instrument.proposedAmount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {instrument.preferredBroker === "FINECO"
                      ? "Fineco"
                      : "Interactive Brokers"}
                    {instrument.documentPackVersion
                      ? ` · ${instrument.documentPackVersion}`
                      : ""}
                  </Typography>
                </Box>
              ),
            )}
          </Box>

          <Typography variant="body2" sx={{ mt: 1.5 }}>
            Scenario{" "}
            <strong>{decisionPackage.payload.routing.scenario.label}</strong> ·{" "}
            {decisionPackage.payload.routing.tranches.length} tranche ·{" "}
            {euro(decisionPackage.payload.investibleCapital)}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            Impronta: {decisionPackage.checksum.slice(0, 16)}…
          </Typography>
        </Paper>
      )}

      <Alert severity="info" sx={{ mt: 2 }}>
        <strong>Esecuzione BLOCCATA.</strong>{" "}
        {gate.execution.blockingReasons.join(" ")}
      </Alert>
    </Box>
  );
}
