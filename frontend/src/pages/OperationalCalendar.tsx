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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import KpiCard from "../components/KpiCard";

import {
  createOperationalTask,
  getOperationalCalendar,
  updateOperationalTask,
  type CreateOperationalTaskRequest,
  type OperationalCalendarResponse,
  type OperationalTask,
  type OperationalTaskCategory,
  type OperationalTaskPriority,
  type OperationalTaskStatus,
} from "../services/api";

type TaskForm = {
  dueDate: string;
  title: string;
  category: OperationalTaskCategory;
  priority: OperationalTaskPriority;
  status: OperationalTaskStatus;
  description: string;
  amount: string;
  linkedDocuments: string;
  notes: string;
};

function emptyForm(): TaskForm {
  return {
    dueDate: new Date()
      .toISOString()
      .slice(0, 10),
    title: "",
    category: "DOCUMENTATION",
    priority: "MEDIUM",
    status: "TODO",
    description: "",
    amount: "",
    linkedDocuments: "",
    notes: "",
  };
}

function categoryLabel(
  category: OperationalTaskCategory,
): string {
  const labels: Record<
    OperationalTaskCategory,
    string
  > = {
    INVESTMENT: "Investimenti",
    REBALANCING: "Ribilanciamento",
    TRANSFER: "Trasferimenti",
    TAX: "Fiscalità",
    INSURANCE: "Assicurazioni",
    PROPERTY: "Immobili",
    SUCCESSION: "Successione",
    DOCUMENTATION: "Documentazione",
    BANKING: "Banca",
    IBKR: "Interactive Brokers",
    FINECO: "Fineco",
    PLATFORM: "Piattaforma",
  };

  return labels[category];
}

function statusLabel(
  status: OperationalTaskStatus,
): string {
  if (status === "TODO") {
    return "Da iniziare";
  }

  if (status === "IN_PROGRESS") {
    return "In corso";
  }

  if (status === "COMPLETED") {
    return "Completata";
  }

  if (status === "DEFERRED") {
    return "Rinviata";
  }

  return "Annullata";
}

function statusColor(
  status: OperationalTaskStatus,
):
  | "default"
  | "info"
  | "warning"
  | "success" {
  if (status === "COMPLETED") {
    return "success";
  }

  if (status === "IN_PROGRESS") {
    return "warning";
  }

  if (status === "TODO") {
    return "info";
  }

  return "default";
}

function priorityLabel(
  priority: OperationalTaskPriority,
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
  priority: OperationalTaskPriority,
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

function formatDate(
  value: string,
): string {
  return new Date(value).toLocaleDateString(
    "it-IT",
  );
}

function isClosed(
  task: OperationalTask,
): boolean {
  return (
    task.status === "COMPLETED" ||
    task.status === "CANCELLED"
  );
}

function isOverdue(
  task: OperationalTask,
): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  return (
    !isClosed(task) &&
    dueDate.getTime() <
      today.getTime()
  );
}

export default function OperationalCalendar() {
  const [data, setData] =
    useState<OperationalCalendarResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [form, setForm] =
    useState<TaskForm>(emptyForm);

  async function loadCalendar() {
    setLoading(true);
    setError("");

    try {
      const result =
        await getOperationalCalendar();

      setData(result);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile caricare il Calendario Operativo.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCalendar();
  }, []);

  const orderedTasks = useMemo(() => {
    if (!data) {
      return [];
    }

    return [...data.tasks].sort(
      (left, right) => {
        if (
          isClosed(left) !==
          isClosed(right)
        ) {
          return isClosed(left) ? 1 : -1;
        }

        return (
          new Date(
            left.dueDate,
          ).getTime() -
          new Date(
            right.dueDate,
          ).getTime()
        );
      },
    );
  }, [data]);

  function updateForm<K extends keyof TaskForm>(
    field: K,
    value: TaskForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submitTask() {
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.dueDate
    ) {
      setError(
        "Data, titolo e descrizione sono obbligatori.",
      );

      return;
    }

    const amount =
      form.amount.trim() === ""
        ? null
        : Number(
            form.amount
              .trim()
              .replace(",", "."),
          );

    if (
      amount !== null &&
      !Number.isFinite(amount)
    ) {
      setError(
        "L’importo inserito non è valido.",
      );

      return;
    }

    const input:
      CreateOperationalTaskRequest = {
        dueDate: form.dueDate,
        title: form.title.trim(),
        category: form.category,
        priority: form.priority,
        status: form.status,
        description:
          form.description.trim(),
        amount,
        linkedDocuments:
          form.linkedDocuments
            .split(/\n|,/)
            .map((item) => item.trim())
            .filter(Boolean),
        notes:
          form.notes.trim() || null,
      };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await createOperationalTask(input);

      setDialogOpen(false);
      setForm(emptyForm());

      setSuccess(
        "Attività operativa registrata.",
      );

      await loadCalendar();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile registrare l’attività.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    task: OperationalTask,
    status: OperationalTaskStatus,
  ) {
    setError("");
    setSuccess("");

    try {
      await updateOperationalTask(
        task.id,
        {
          status,
        },
      );

      setSuccess(
        status === "COMPLETED"
          ? "Attività completata."
          : "Stato dell’attività aggiornato.",
      );

      await loadCalendar();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile aggiornare l’attività.",
      );
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
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4">
            Calendario Operativo
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Attività, scadenze, priorità e
            avanzamento operativo del Family
            Office.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1.2,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="outlined"
            startIcon={
              <RefreshRoundedIcon />
            }
            onClick={() =>
              void loadCalendar()
            }
            disabled={loading}
          >
            Aggiorna
          </Button>

          <Button
            variant="contained"
            startIcon={
              <AddRoundedIcon />
            }
            onClick={() => {
              setForm(emptyForm());
              setDialogOpen(true);
            }}
          >
            Nuova attività
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
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm:
                  "repeat(2, minmax(0, 1fr))",
                xl:
                  "repeat(4, minmax(0, 1fr))",
              },
              gap: 2.2,
              mb: 3,
            }}
          >
            <KpiCard
              title="Attività aperte"
              value={String(
                data.summary.open,
              )}
              subtitle="Da gestire"
              icon={
                <PendingActionsRoundedIcon />
              }
              tone="primary"
            />

            <KpiCard
              title="Entro 30 giorni"
              value={String(
                data.summary
                  .dueNextThirtyDays,
              )}
              subtitle="Scadenze imminenti"
              icon={
                <CalendarMonthRoundedIcon />
              }
              tone="warning"
            />

            <KpiCard
              title="Scadute"
              value={String(
                data.summary.overdue,
              )}
              subtitle="Richiedono intervento"
              icon={
                <WarningAmberRoundedIcon />
              }
              tone={
                data.summary.overdue > 0
                  ? "error"
                  : "success"
              }
            />

            <KpiCard
              title="Completate"
              value={String(
                data.summary.completed,
              )}
              subtitle="Attività concluse"
              icon={
                <CheckCircleRoundedIcon />
              }
              tone="success"
            />
          </Box>

          <Alert
            severity={
              data.summary.overdue > 0
                ? "error"
                : data.summary
                      .highPriorityOpen >
                    0
                ? "warning"
                : "success"
            }
            icon={
              <PriorityHighRoundedIcon />
            }
            sx={{ mb: 3 }}
          >
            {data.summary.overdue > 0
              ? `${data.summary.overdue} attività risultano scadute.`
              : data.summary
                    .highPriorityOpen > 0
              ? `${data.summary.highPriorityOpen} attività aperte risultano ad alta priorità.`
              : "Non risultano attività scadute o ad alta priorità."}
          </Alert>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                xl:
                  "repeat(2, minmax(0, 1fr))",
              },
              gap: 2.2,
            }}
          >
            {orderedTasks.map((task) => (
              <Paper
                key={task.id}
                elevation={0}
                sx={{
                  p: 2.5,
                  border: "1px solid",
                  borderColor:
                    isOverdue(task)
                      ? "error.main"
                      : "divider",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    flexWrap: "wrap",
                    gap: 1.5,
                    mb: 1.5,
                  }}
                >
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 800,
                      }}
                    >
                      {task.title}
                    </Typography>

                    <Typography
                      variant="body2"
                      color={
                        isOverdue(task)
                          ? "error.main"
                          : "text.secondary"
                      }
                      sx={{
                        mt: 0.4,
                        fontWeight:
                          isOverdue(task)
                            ? 700
                            : 400,
                      }}
                    >
                      Scadenza{" "}
                      {formatDate(
                        task.dueDate,
                      )}
                      {isOverdue(task)
                        ? " · Scaduta"
                        : ""}
                    </Typography>
                  </Box>

                  {task.amount !== null && (
                    <Typography
                      sx={{
                        fontWeight: 800,
                      }}
                    >
                      {euro(task.amount)}
                    </Typography>
                  )}
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.8,
                    mb: 1.5,
                  }}
                >
                  <Chip
                    size="small"
                    label={categoryLabel(
                      task.category,
                    )}
                    variant="outlined"
                  />

                  <Chip
                    size="small"
                    label={statusLabel(
                      task.status,
                    )}
                    color={statusColor(
                      task.status,
                    )}
                  />

                  <Chip
                    size="small"
                    label={
                      `Priorità ${priorityLabel(
                        task.priority,
                      )}`
                    }
                    color={priorityColor(
                      task.priority,
                    )}
                    variant="outlined"
                  />
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.6,
                    mb: 1.5,
                  }}
                >
                  {task.description}
                </Typography>

                {task.notes && (
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 1.5,
                      fontStyle: "italic",
                    }}
                  >
                    {task.notes}
                  </Typography>
                )}

                {task.linkedDocuments.length >
                  0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      mb: 1.5,
                    }}
                  >
                    Documenti:{" "}
                    {task.linkedDocuments.join(
                      ", ",
                    )}
                  </Typography>
                )}

                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  {task.status !==
                    "COMPLETED" && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() =>
                        void changeStatus(
                          task,
                          "COMPLETED",
                        )
                      }
                    >
                      Segna completata
                    </Button>
                  )}

                  {task.status ===
                    "COMPLETED" && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        void changeStatus(
                          task,
                          "TODO",
                        )
                      }
                    >
                      Riapri
                    </Button>
                  )}

                  {task.status ===
                    "TODO" && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        void changeStatus(
                          task,
                          "IN_PROGRESS",
                        )
                      }
                    >
                      Avvia
                    </Button>
                  )}

                  {task.status !==
                    "DEFERRED" &&
                    !isClosed(task) && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() =>
                          void changeStatus(
                            task,
                            "DEFERRED",
                          )
                        }
                      >
                        Rinvia
                      </Button>
                    )}
                </Box>
              </Paper>
            ))}
          </Box>
        </>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() =>
          !saving &&
          setDialogOpen(false)
        }
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Nuova attività operativa
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm:
                  "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
              pt: 1,
            }}
          >
            <TextField
              label="Data prevista"
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                updateForm(
                  "dueDate",
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
                    .value as OperationalTaskCategory,
                )
              }
            >
              {[
                "INVESTMENT",
                "REBALANCING",
                "TRANSFER",
                "TAX",
                "INSURANCE",
                "PROPERTY",
                "SUCCESSION",
                "DOCUMENTATION",
                "BANKING",
                "IBKR",
                "FINECO",
                "PLATFORM",
              ].map((category) => (
                <MenuItem
                  key={category}
                  value={category}
                >
                  {categoryLabel(
                    category as OperationalTaskCategory,
                  )}
                </MenuItem>
              ))}
            </TextField>

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
                  sm: "1 / -1",
                },
              }}
            />

            <TextField
              select
              label="Priorità"
              value={form.priority}
              onChange={(event) =>
                updateForm(
                  "priority",
                  event.target
                    .value as OperationalTaskPriority,
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
                    .value as OperationalTaskStatus,
                )
              }
            >
              <MenuItem value="TODO">
                Da iniziare
              </MenuItem>
              <MenuItem value="IN_PROGRESS">
                In corso
              </MenuItem>
              <MenuItem value="DEFERRED">
                Rinviata
              </MenuItem>
              <MenuItem value="COMPLETED">
                Completata
              </MenuItem>
            </TextField>

            <TextField
              label="Descrizione"
              value={form.description}
              onChange={(event) =>
                updateForm(
                  "description",
                  event.target.value,
                )
              }
              multiline
              minRows={3}
              required
              sx={{
                gridColumn: {
                  sm: "1 / -1",
                },
              }}
            />

            <TextField
              label="Importo collegato"
              value={form.amount}
              onChange={(event) =>
                updateForm(
                  "amount",
                  event.target.value,
                )
              }
              placeholder="0"
            />

            <TextField
              label="Documenti collegati"
              value={
                form.linkedDocuments
              }
              onChange={(event) =>
                updateForm(
                  "linkedDocuments",
                  event.target.value,
                )
              }
              placeholder="Un documento per riga"
              multiline
              minRows={2}
            />

            <TextField
              label="Note"
              value={form.notes}
              onChange={(event) =>
                updateForm(
                  "notes",
                  event.target.value,
                )
              }
              multiline
              minRows={2}
              sx={{
                gridColumn: {
                  sm: "1 / -1",
                },
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setDialogOpen(false)
            }
            disabled={saving}
          >
            Annulla
          </Button>

          <Button
            variant="contained"
            onClick={() =>
              void submitTask()
            }
            disabled={saving}
          >
            {saving
              ? "Salvataggio..."
              : "Registra attività"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
