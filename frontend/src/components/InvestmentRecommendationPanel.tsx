import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Typography,
  type ChipProps,
} from "@mui/material";

import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import InvestmentEntryPlanLab from "./InvestmentEntryPlanLab";

import {
  generateElToroInvestmentRecommendation,
  getElToroInvestmentRecommendation,
  type InvestmentRecommendation,
  type InvestmentRecommendationResponse,
  type InvestmentRecommendationStatus,
} from "../services/api";

type InvestmentRecommendationPanelProps = {
  refreshToken: string;
};

function euro(value: number): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function percentage(value: number | null): string {
  return value === null
    ? "n.d."
    : `${value.toLocaleString("it-IT", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}%`;
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

function sourceDateLabel(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function statusPresentation(status: InvestmentRecommendationStatus): {
  label: string;
  color: ChipProps["color"];
} {
  if (status === "BLOCKED_CAPITAL_PLAN") {
    return {
      label: "Piano capitale bloccato",
      color: "error",
    };
  }

  if (status === "NEEDS_DATA") {
    return {
      label: "Dati IPS incompleti",
      color: "warning",
    };
  }

  if (status === "NEEDS_MARKET_UPDATE") {
    return {
      label: "Mercati da aggiornare",
      color: "warning",
    };
  }

  if (status === "READY_FOR_APPROVAL") {
    return {
      label: "Pronta per approvazione",
      color: "success",
    };
  }

  return {
    label: "Richiede validazione",
    color: "info",
  };
}

function methodLabel(
  value: InvestmentRecommendation["allocation"]["method"],
): string {
  return value === "GAP_TO_IPS_TARGET"
    ? "Gap effettivi verso i target IPS"
    : "Riferimento sui target IPS";
}

export default function InvestmentRecommendationPanel({
  refreshToken,
}: InvestmentRecommendationPanelProps) {
  const [response, setResponse] =
    useState<InvestmentRecommendationResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadRecommendation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getElToroInvestmentRecommendation();

      setResponse(result);
    } catch (loadError) {
      console.error(loadError);

      setError("Impossibile caricare l’ultima proposta di investimento.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Ricarica anche quando cambiano stime o piano capitale.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRecommendation();
  }, [loadRecommendation, refreshToken]);

  const generateRecommendation = async () => {
    setGenerating(true);
    setError(null);

    try {
      const result = await generateElToroInvestmentRecommendation();

      setResponse(result);
    } catch (generationError) {
      console.error(generationError);

      setError(
        "Il motore non ha potuto generare la proposta. Verifica i dati collegati e riprova.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const recommendation = response?.recommendation ?? null;

  const status = recommendation
    ? statusPresentation(recommendation.status)
    : null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 3,
        border: "1px solid",
        borderColor:
          recommendation?.isCurrent === false ? "warning.main" : "primary.main",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1.25,
            alignItems: "flex-start",
          }}
        >
          <AutoGraphRoundedIcon color="primary" sx={{ mt: 0.25 }} />

          <Box>
            <Typography variant="overline" color="primary.main">
              Fase 5 operativa
            </Typography>

            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Recommendation Engine
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Nuovo capitale soltanto: target IPS, strumenti selezionati,
              overlap e ingresso in quattro tranche.
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {status && (
            <Chip size="small" color={status.color} label={status.label} />
          )}

          <Button
            size="small"
            startIcon={<RefreshRoundedIcon />}
            disabled={loading || generating}
            onClick={() => void loadRecommendation()}
          >
            Ricarica
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={
              generating ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <PlayCircleOutlineRoundedIcon />
              )
            }
            disabled={loading || generating}
            onClick={() => void generateRecommendation()}
          >
            {recommendation ? "Rigenera proposta" : "Genera proposta"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            py: 4,
          }}
        >
          <CircularProgress size={22} />

          <Typography variant="body2" color="text.secondary">
            Caricamento del motore…
          </Typography>
        </Box>
      ) : !recommendation ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Nessuna proposta salvata. Avvia il motore per creare uno snapshot
          verificabile della fase 5.
        </Alert>
      ) : (
        <Box sx={{ mt: 2.5 }}>
          {!recommendation.isCurrent && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Questa proposta non è più allineata agli input correnti.
              Rigenerala prima di valutarla.
              <Box
                component="ul"
                sx={{
                  mt: 1,
                  mb: 0,
                  pl: 2.5,
                }}
              >
                {recommendation.staleReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </Box>
            </Alert>
          )}

          {recommendation.allocation.method === "IPS_TARGET_REFERENCE" && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              La classificazione IPS non è completa. Gli importi sono un
              riferimento matematico sui target, non ancora una raccomandazione
              basata sui gap reali del portafoglio.
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(4, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            {[
              {
                label: "Capitale core analizzato",
                value: euro(recommendation.capitalPlan.investibleCapital),
              },
              {
                label: "Copertura IPS",
                value: percentage(
                  recommendation.dataQuality.coveragePercentage,
                ),
              },
              {
                label: "Metodo",
                value: methodLabel(recommendation.allocation.method),
              },
              {
                label: "Fiscalità",
                value: "NEEDS_VALIDATION",
              },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  p: 1.5,
                  bgcolor: "action.hover",
                  borderRadius: 2,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.4,
                    fontWeight: 800,
                  }}
                >
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Allocazione proposta del nuovo capitale
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Nessuna vendita automatica delle posizioni esistenti.
            </Typography>

            <Box
              sx={{
                display: "grid",
                gap: 1,
                mt: 1.5,
              }}
            >
              {recommendation.allocation.proposed.map((row) => (
                <Box
                  key={row.code}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "minmax(180px, 1.4fr) repeat(4, minmax(100px, 1fr))",
                    },
                    gap: 1.25,
                    alignItems: "center",
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 800,
                      }}
                    >
                      {row.label}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      {row.code}
                    </Typography>
                  </Box>

                  {[
                    {
                      label: "Attuale",
                      value:
                        row.currentWeight === null
                          ? "n.d."
                          : `${euro(row.currentValue)} · ${percentage(
                              row.currentWeight,
                            )}`,
                    },
                    {
                      label: "Target IPS",
                      value: percentage(row.targetWeight),
                    },
                    {
                      label: "Nuovo capitale",
                      value: `${euro(row.newCapitalAmount)} · ${percentage(
                        row.newCapitalWeight,
                      )}`,
                    },
                    {
                      label: "Proiezione",
                      value:
                        row.projectedWeight === null
                          ? "Dopo classificazione"
                          : `${euro(row.projectedValue)} · ${percentage(
                              row.projectedWeight,
                            )}`,
                    },
                  ].map((metric) => (
                    <Box key={metric.label}>
                      <Typography variant="caption" color="text.secondary">
                        {metric.label}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                        }}
                      >
                        {metric.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Strumenti candidati
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Candidati operativi, non ordini: verifica finale di KID, fiscalità,
            costi, quotazione e adeguatezza obbligatoria.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1.5,
              mt: 1.5,
            }}
          >
            {recommendation.instruments
              .filter((instrument) => instrument.proposedAmount > 0)
              .map((instrument) => (
                <Box
                  key={instrument.isin}
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 850,
                        }}
                      >
                        {instrument.ticker}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                        }}
                      >
                        {instrument.name}
                      </Typography>
                    </Box>

                    <Chip
                      size="small"
                      color="primary"
                      label={euro(instrument.proposedAmount)}
                    />
                  </Box>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      mt: 1,
                    }}
                  >
                    ISIN {instrument.isin} · {instrument.domicile} ·{" "}
                    {instrument.structure}
                  </Typography>

                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {instrument.role}
                  </Typography>

                  <Alert
                    severity={
                      instrument.overlap.exactHolding ? "warning" : "info"
                    }
                    sx={{ mt: 1.5 }}
                  >
                    {instrument.overlap.exactHolding
                      ? "Strumento già presente nel portafoglio."
                      : instrument.overlap.potentialOverlapValue > 0
                        ? `Overlap potenziale rilevato su ${euro(
                            instrument.overlap.potentialOverlapValue,
                          )} di posizioni esistenti.`
                        : "Nessun overlap evidente nello screening preliminare."}
                  </Alert>

                  <Link
                    href={instrument.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    variant="body2"
                    sx={{
                      display: "inline-block",
                      mt: 1.25,
                    }}
                  >
                    Scheda ufficiale
                  </Link>
                </Box>
              ))}
          </Box>

          <Divider sx={{ my: 3 }} />

          <InvestmentEntryPlanLab
            recommendationId={recommendation.id}
            refreshToken={refreshToken}
            recommendationIsCurrent={recommendation.isCurrent}
          />

          <Divider sx={{ my: 3 }} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "1.15fr 0.85fr",
              },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Contesto mercati e geopolitica
              </Typography>

              <Typography variant="caption" color="text.secondary">
                Snapshot al{" "}
                {sourceDateLabel(
                  recommendation.marketContext.asOfDate.slice(0, 10),
                )}{" "}
                · {recommendation.marketContext.regime}
              </Typography>

              <Typography variant="body2" sx={{ mt: 1 }}>
                {recommendation.marketContext.summary}
              </Typography>

              <Box
                component="ul"
                sx={{
                  mt: 1,
                  mb: 0,
                  pl: 2.5,
                }}
              >
                {recommendation.marketContext.observations.map(
                  (observation) => (
                    <Typography
                      component="li"
                      variant="body2"
                      key={observation}
                      sx={{ mb: 0.5 }}
                    >
                      {observation}
                    </Typography>
                  ),
                )}
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Fonti verificabili
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gap: 0.75,
                  mt: 1,
                }}
              >
                {recommendation.marketContext.sources.map((source) => (
                  <Link
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    variant="body2"
                  >
                    {source.publisher} · {sourceDateLabel(source.sourceDate)}
                  </Link>
                ))}
              </Box>
            </Box>
          </Box>

          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              Esecuzione bloccata
            </Typography>

            <Box
              component="ul"
              sx={{
                mt: 0.75,
                mb: 0,
                pl: 2.5,
              }}
            >
              {recommendation.execution.requiredActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </Box>
          </Alert>

          <Box
            component="ul"
            sx={{
              mt: 2,
              mb: 0,
              pl: 2.5,
              color: "text.secondary",
            }}
          >
            {recommendation.warnings.map((warning) => (
              <Typography
                key={warning}
                component="li"
                variant="caption"
                sx={{ mb: 0.5 }}
              >
                {warning}
              </Typography>
            ))}
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mt: 2,
            }}
          >
            Snapshot generato il {dateLabel(recommendation.generatedAt)} ·
            Engine v{recommendation.engineVersion}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
