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
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";

import {
  Link,
} from "react-router-dom";

import {
  getOperationalCalendar,
  type OperationalCalendarResponse,
  type OperationalTask,
} from "../services/api";

function formatDate(
  value: string,
): string {
  return new Date(value).toLocaleDateString(
    "it-IT",
  );
}

function euro(
  value: number,
): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function isOpen(
  task: OperationalTask,
): boolean {
  return (
    task.status !== "COMPLETED" &&
    task.status !== "CANCELLED"
  );
}

export default function ExecutiveOperationalCalendarPanel() {
  const [data, setData] =
    useState<OperationalCalendarResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    getOperationalCalendar()
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
            "Impossibile caricare le attività operative.",
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

  const nextTasks = useMemo(
    () =>
      data
        ? data.tasks
            .filter(isOpen)
            .sort(
              (left, right) =>
                new Date(
                  left.dueDate,
                ).getTime() -
                new Date(
                  right.dueDate,
                ).getTime(),
            )
            .slice(0, 3)
        : [],
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 0.5,
        }}
      >
        <CalendarMonthRoundedIcon
          color="primary"
        />

        <Typography variant="h6">
          Calendario Operativo
        </Typography>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Scadenze e attività prioritarie del
        Family Office.
      </Typography>

      {loading && (
        <Box
          sx={{
            minHeight: 160,
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
                data.summary.overdue > 0
                  ? "error"
                  : data.summary
                        .highPriorityOpen >
                      0
                  ? "warning"
                  : "success"
              }
              sx={{ mb: 2.5 }}
            >
              {data.summary.overdue > 0
                ? `${data.summary.overdue} attività risultano scadute.`
                : `${data.summary.dueNextThirtyDays} attività scadono nei prossimi 30 giorni.`}
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
                  `Aperte: ${data.summary.open}`
                }
                variant="outlined"
              />

              <Chip
                label={
                  `In corso: ${data.summary.inProgress}`
                }
                color="warning"
                variant="outlined"
              />

              <Chip
                label={
                  `Alta priorità: ${data.summary.highPriorityOpen}`
                }
                color={
                  data.summary
                    .highPriorityOpen > 0
                    ? "error"
                    : "default"
                }
                variant="outlined"
              />

              <Chip
                label={
                  `Completate: ${data.summary.completed}`
                }
                color="success"
                variant="outlined"
              />
            </Box>

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
              {nextTasks.map((task) => (
                <Paper
                  key={task.id}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor:
                      "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    {formatDate(
                      task.dueDate,
                    )}
                  </Typography>

                  <Typography
                    variant="subtitle2"
                    sx={{
                      mt: 0.5,
                      mb: 1,
                      fontWeight: 800,
                    }}
                  >
                    {task.title}
                  </Typography>

                  <Chip
                    size="small"
                    label={
                      task.priority ===
                      "HIGH"
                        ? "Priorità alta"
                        : task.priority ===
                          "MEDIUM"
                        ? "Priorità media"
                        : "Priorità bassa"
                    }
                    color={
                      task.priority ===
                      "HIGH"
                        ? "error"
                        : task.priority ===
                          "MEDIUM"
                        ? "warning"
                        : "success"
                    }
                    variant="outlined"
                  />

                  {task.amount !== null && (
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 1.2,
                        fontWeight: 800,
                      }}
                    >
                      {euro(task.amount)}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>

            <Button
              component={Link}
              to="/operational-calendar"
              variant="outlined"
              endIcon={
                <ArrowForwardRoundedIcon />
              }
            >
              Apri Calendario Operativo
            </Button>
          </>
        )}
    </Paper>
  );
}
