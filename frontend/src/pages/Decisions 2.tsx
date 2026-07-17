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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import PolicyRoundedIcon from "@mui/icons-material/PolicyRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import ComputerRoundedIcon from "@mui/icons-material/ComputerRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import KpiCard from "../components/KpiCard";

import {
  createDecision,
  getDecisionsOverview,
  type CreateDecisionRequest,
  type DecisionCategory,
  type DecisionEntry,
  type DecisionPriority,
  type DecisionsOverviewResponse,
  type DecisionStatus,
} from "../services/api";

type DecisionForm = {
  date: string;
  title: string;
  category: DecisionCategory;
  status: DecisionStatus;
  priority: DecisionPriority;
  motivation: string;
  analysis: string;
  alternativesText: string;
  finalDecision: string;
  impact: string;
  amountText: string;
  result: string;
  lessons: string;
};

function createEmptyForm(): DecisionForm {
  return {
    date: new Date()
      .toISOString()
      .slice(0, 10),
    title: "",
    category: "PLANNING",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    motivation: "",
    analysis: "",
    alternativesText: "",
    finalDecision: "",
    impact: "",
    amountText: "",
    result: "",
    lessons: "",
  };
}

function statusLabel(
  status: DecisionStatus,
) {
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
): "success" | "warning" | "info" {
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
) {
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
): "error" | "warning" | "success" {
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
) {
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

  return labels[category] ?? category;
}

function categoryIcon(
  category: DecisionCategory,
) {
  if (category === "POLICY") {
    return <PolicyRoundedIcon />;
  }

  if (category === "PROPERTY") {
    return <HomeWorkRoundedIcon />;
  }

  if (category === "PLANNING") {
    return <AccountBalanceRoundedIcon />;
  }

  if (category === "PLATFORM") {
    return <ComputerRoundedIcon />;
  }

  if (category === "INVESTMENT") {
    return <ShowChartRoundedIcon />;
  }

  if (category === "LIQUIDITY") {
    return <SavingsRoundedIcon />;
  }

  if (category === "TAX") {
    return <ReceiptLongRoundedIcon />;
  }

  return <GavelRoundedIcon />;
}

function euro(
  value: number | null,
) {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Decisions() {
  const [data, setData] =
    useState<DecisionsOverviewResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] =
    useState<DecisionForm>(
      createEmptyForm,
    );

  async function loadDecisions() {
    setLoading(true);
    setError("");

    try {
      const result =
        await getDecisionsOverview();

      setData(result);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile caricare il registro decisioni.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDecisions();
  }, []);

  function updateForm<
    Key extends keyof DecisionForm,
  >(
    key: Key,
    value: DecisionForm[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateDialog() {
    setForm(createEmptyForm());
    setError("");
    setSuccess("");
    setDialogOpen(true);
  }

  function closeCreateDialog() {
    if (!saving) {
      setDialogOpen(false);
    }
  }

  async function saveDecision() {
    setSaving(true);
    setError("");
    setSuccess("");

    const amountText =
      form.amountText
        .trim()
        .replace(/\./g, "")
        .replace(",", ".");

    const amount =
      amountText.length > 0
        ? Number(amountText)
        : null;

    if (
      amount !== null &&
      !Number.isFinite(amount)
    ) {
      setError(
        "L’importo inserito non è valido.",
      );
      setSaving(false);
      return;
    }

    const payload: CreateDecisionRequest = {
      date: form.date,
      title: form.title.trim(),
      category: form.category,
      status: form.status,
      priority: form.priority,
      motivation: form.motivation.trim(),
      analysis: form.analysis.trim(),

      alternatives:
        form.alternativesText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),

      finalDecision:
        form.finalDecision.trim(),

      impact: form.impact.trim(),
      amount,
      result: form.result.trim(),
      lessons: form.lessons.trim(),
    };

    try {
      await createDecision(payload);

      setDialogOpen(false);

      setSuccess(
        "Decisione registrata nel database. Lo storico precedente è rimasto invariato.",
      );

      await loadDecisions();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Registrazione non riuscita. Compilare tutti i campi obbligatori.",
      );
    } finally {
      setSaving(false);
    }
  }

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
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            md: "center",
          },
          flexDirection: {
            xs: "column",
            md: "row",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4">
            Decisioni
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Registro permanente delle decisioni
            strategiche del Family Office.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1.2,
          }}
        >
          <Button
            variant="outlined"
            startIcon={
              <RefreshRoundedIcon />
            }
            onClick={() =>
              void loadDecisions()
            }
            disabled={loading}
          >
            Aggiorna
          </Button>

          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreateDialog}
          >
            Nuova decisione
          </Button>
        </Box>
      </Box>

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
        >
          {success}
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {data && (
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
                "linear-gradient(120deg, #332353 0%, #584080 55%, #8565AD 135%)",
              boxShadow:
                "0 18px 42px rgba(69,45,105,0.23)",

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
                color:
                  "rgba(255,255,255,0.72)",
                letterSpacing: "0.15em",
              }}
            >
              Strategic Decision Log
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color:
                  "rgba(255,255,255,0.76)",
              }}
            >
              Decisioni registrate nel database
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
              {data.summary.total}
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
                label="Storico permanente"
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={`${data.summary.highPriority} priorità alte`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label="Database SQLite"
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
              title="Decisioni totali"
              value={String(
                data.summary.total,
              )}
              subtitle="Registro storico"
              icon={<GavelRoundedIcon />}
              tone="primary"
            />

            <KpiCard
              title="Approvate"
              value={String(
                data.summary.approved,
              )}
              subtitle="Decisioni formalizzate"
              icon={
                <CheckCircleRoundedIcon />
              }
              tone="success"
            />

            <KpiCard
              title="In esecuzione"
              value={String(
                data.summary.inProgress,
              )}
              subtitle="Attività operative"
              icon={
                <PendingActionsRoundedIcon />
              }
              tone="warning"
            />

            <KpiCard
              title="Priorità alta"
              value={String(
                data.summary.highPriority,
              )}
              subtitle="Da presidiare"
              icon={
                <PriorityHighRoundedIcon />
              }
              tone="error"
            />
          </Box>

          <Alert
            severity="info"
            sx={{ mb: 3 }}
          >
            Il registro è append-only. Le nuove
            decisioni vengono aggiunte senza
            modificare o cancellare lo storico
            precedente.
          </Alert>

          <Box
            sx={{
              display: "grid",
              gap: 2.5,
            }}
          >
            {data.decisions.map(
              (decision: DecisionEntry) => (
                <Paper
                  key={decision.id}
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
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      flexDirection: {
                        xs: "column",
                        md: "row",
                      },
                      gap: 2,
                      mb: 2.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        alignItems:
                          "flex-start",
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          flexShrink: 0,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: "14px",
                          color: "primary.main",
                          backgroundColor:
                            "rgba(32,91,170,0.10)",
                        }}
                      >
                        {categoryIcon(
                          decision.category,
                        )}
                      </Box>

                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontWeight: 700,
                          }}
                        >
                          {decision.date} ·{" "}
                          {categoryLabel(
                            decision.category,
                          )}
                        </Typography>

                        <Typography
                          variant="h6"
                          sx={{ mt: 0.5 }}
                        >
                          {decision.title}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip
                        size="small"
                        color={statusColor(
                          decision.status,
                        )}
                        label={statusLabel(
                          decision.status,
                        )}
                      />

                      <Chip
                        size="small"
                        variant="outlined"
                        color={priorityColor(
                          decision.priority,
                        )}
                        label={`Priorità ${priorityLabel(
                          decision.priority,
                        )}`}
                      />
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        lg: "repeat(2, minmax(0, 1fr))",
                      },
                      gap: 3,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 0.7 }}
                      >
                        Motivazione
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {decision.motivation}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 0.7 }}
                      >
                        Analisi effettuata
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {decision.analysis}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2.5 }} />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        lg: "minmax(0, 0.8fr) minmax(0, 1.2fr)",
                      },
                      gap: 3,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 1 }}
                      >
                        Alternative considerate
                      </Typography>

                      {decision.alternatives
                        .length > 0 ? (
                        <Box
                          component="ul"
                          sx={{
                            mt: 0,
                            mb: 0,
                            pl: 2.2,
                            color:
                              "text.secondary",
                          }}
                        >
                          {decision.alternatives.map(
                            (alternative) => (
                              <Typography
                                key={
                                  alternative
                                }
                                component="li"
                                variant="body2"
                                sx={{
                                  mb: 0.6,
                                }}
                              >
                                {alternative}
                              </Typography>
                            ),
                          )}
                        </Box>
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Nessuna alternativa
                          registrata.
                        </Typography>
                      )}
                    </Box>

                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 0.7 }}
                      >
                        Decisione finale
                      </Typography>

                      <Typography variant="body2">
                        {decision.finalDecision}
                      </Typography>

                      {decision.amount !==
                        null && (
                        <Typography
                          sx={{
                            mt: 1.2,
                            fontWeight: 800,
                            color:
                              decision.amount <
                              0
                                ? "error.main"
                                : "primary.main",
                          }}
                        >
                          {euro(
                            decision.amount,
                          )}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2.5 }} />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        lg: "repeat(3, minmax(0, 1fr))",
                      },
                      gap: 3,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 0.7 }}
                      >
                        Effetti sul patrimonio
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {decision.impact}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 0.7 }}
                      >
                        Risultato
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {decision.result}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 0.7 }}
                      >
                        Insegnamenti
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {decision.lessons}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ),
            )}
          </Box>
        </>
      )}

      <Dialog
        open={dialogOpen}
        onClose={closeCreateDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Registra nuova decisione
        </DialogTitle>

        <DialogContent>
          <Alert
            severity="warning"
            sx={{ mt: 1, mb: 3 }}
          >
            Una volta registrata, la decisione
            entrerà nello storico permanente.
          </Alert>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            <TextField
              label="Data"
              type="date"
              value={form.date}
              onChange={(event) =>
                updateForm(
                  "date",
                  event.target.value,
                )
              }
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              required
            />

            <TextField
              select
              label="Categoria"
              value={form.category}
              onChange={(event) =>
                updateForm(
                  "category",
                  event.target
                    .value as DecisionCategory,
                )
              }
            >
              <MenuItem value="POLICY">
                Politica patrimoniale
              </MenuItem>

              <MenuItem value="PROPERTY">
                Immobili
              </MenuItem>

              <MenuItem value="PLANNING">
                Pianificazione
              </MenuItem>

              <MenuItem value="PLATFORM">
                Piattaforma
              </MenuItem>

              <MenuItem value="INVESTMENT">
                Investimenti
              </MenuItem>

              <MenuItem value="LIQUIDITY">
                Liquidità
              </MenuItem>

              <MenuItem value="TAX">
                Fiscalità
              </MenuItem>
            </TextField>

            <TextField
              select
              label="Priorità"
              value={form.priority}
              onChange={(event) =>
                updateForm(
                  "priority",
                  event.target
                    .value as DecisionPriority,
                )
              }
            >
              <MenuItem value="HIGH">
                Alta
              </MenuItem>

              <MenuItem value="MEDIUM">
                Media
              </MenuItem>

              <MenuItem value="LOW">
                Bassa
              </MenuItem>
            </TextField>

            <TextField
              select
              label="Stato"
              value={form.status}
              onChange={(event) =>
                updateForm(
                  "status",
                  event.target
                    .value as DecisionStatus,
                )
              }
            >
              <MenuItem value="APPROVED">
                Approvata
              </MenuItem>

              <MenuItem value="IN_PROGRESS">
                In esecuzione
              </MenuItem>

              <MenuItem value="MONITORING">
                Monitoraggio
              </MenuItem>
            </TextField>

            <TextField
              label="Importo opzionale"
              value={form.amountText}
              onChange={(event) =>
                updateForm(
                  "amountText",
                  event.target.value,
                )
              }
              placeholder="Es. 250000 oppure -50000"
            />

            <TextField
              label="Titolo"
              value={form.title}
              onChange={(event) =>
                updateForm(
                  "title",
                  event.target.value,
                )
              }
              required
              sx={{
                gridColumn: {
                  md: "span 3",
                },
              }}
            />

            <TextField
              label="Motivazione"
              value={form.motivation}
              onChange={(event) =>
                updateForm(
                  "motivation",
                  event.target.value,
                )
              }
              multiline
              minRows={3}
              required
              sx={{
                gridColumn: {
                  md: "span 3",
                },
              }}
            />

            <TextField
              label="Analisi effettuata"
              value={form.analysis}
              onChange={(event) =>
                updateForm(
                  "analysis",
                  event.target.value,
                )
              }
              multiline
              minRows={3}
              required
              sx={{
                gridColumn: {
                  md: "span 3",
                },
              }}
            />

            <TextField
              label="Alternative considerate"
              value={form.alternativesText}
              onChange={(event) =>
                updateForm(
                  "alternativesText",
                  event.target.value,
                )
              }
              multiline
              minRows={3}
              helperText="Inserire un’alternativa per ogni riga."
              sx={{
                gridColumn: {
                  md: "span 3",
                },
              }}
            />

            <TextField
              label="Decisione finale"
              value={form.finalDecision}
              onChange={(event) =>
                updateForm(
                  "finalDecision",
                  event.target.value,
                )
              }
              multiline
              minRows={3}
              required
              sx={{
                gridColumn: {
                  md: "span 3",
                },
              }}
            />

            <TextField
              label="Effetti sul patrimonio"
              value={form.impact}
              onChange={(event) =>
                updateForm(
                  "impact",
                  event.target.value,
                )
              }
              multiline
              minRows={3}
              required
              sx={{
                gridColumn: {
                  md: "span 3",
                },
              }}
            />

            <TextField
              label="Risultato"
              value={form.result}
              onChange={(event) =>
                updateForm(
                  "result",
                  event.target.value,
                )
              }
              multiline
              minRows={3}
              required
              sx={{
                gridColumn: {
                  md: "span 3",
                },
              }}
            />

            <TextField
              label="Insegnamenti"
              value={form.lessons}
              onChange={(event) =>
                updateForm(
                  "lessons",
                  event.target.value,
                )
              }
              multiline
              minRows={3}
              required
              sx={{
                gridColumn: {
                  md: "span 3",
                },
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={closeCreateDialog}
            disabled={saving}
          >
            Annulla
          </Button>

          <Button
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress
                  size={17}
                  color="inherit"
                />
              ) : (
                <AddRoundedIcon />
              )
            }
            onClick={() =>
              void saveDecision()
            }
            disabled={saving}
          >
            {saving
              ? "Registrazione..."
              : "Registra decisione"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
