import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  captureLedgerCurrentState,
  getLedgerNetWorthHistory,
  getLedgerSummary,
  type LedgerHistoryResponse,
  type LedgerSummaryResponse,
} from "../services/api";

type Notice = {
  severity:
    | "success"
    | "info"
    | "warning"
    | "error";
  text: string;
};

function euro(value: number): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortEuro(value: number): string {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} M€`;
  }

  if (absoluteValue >= 1_000) {
    return `${(value / 1_000).toFixed(0)} k€`;
  }

  return `${value.toFixed(0)} €`;
}

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString(
    "it-IT",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}

function dateTimeLabel(value: string): string {
  return new Date(value).toLocaleString(
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

type KpiCardProps = {
  label: string;
  value: string;
  subtitle?: string;
};

function KpiCard({
  label,
  value,
  subtitle,
}: KpiCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        minHeight: 120,
        border: "1px solid",
        borderColor: "divider",
        boxShadow:
          "0 12px 30px rgba(26,45,75,0.05)",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
      >
        {label}
      </Typography>

      <Typography
        variant="h5"
        sx={{
          mt: 0.8,
          fontWeight: 750,
        }}
      >
        {value}
      </Typography>

      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.7 }}
        >
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}

export default function WealthHistory() {
  const [summary, setSummary] =
    useState<LedgerSummaryResponse | null>(
      null,
    );

  const [history, setHistory] =
    useState<LedgerHistoryResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [capturing, setCapturing] =
    useState(false);

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const loadData = useCallback(
    async () => {
      setLoading(true);

      try {
        const [
          summaryResult,
          historyResult,
        ] = await Promise.all([
          getLedgerSummary(),
          getLedgerNetWorthHistory(1000),
        ]);

        setSummary(summaryResult);
        setHistory(historyResult);
      } catch (error) {
        console.error(error);

        setNotice({
          severity: "error",
          text:
            "Impossibile caricare lo storico patrimoniale.",
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const snapshots =
    history?.snapshots ?? [];

  const latest =
    snapshots.length > 0
      ? snapshots[snapshots.length - 1]
      : null;

  const chartData = useMemo(
    () =>
      snapshots.map((snapshot) => ({
        date:
          dateLabel(
            snapshot.snapshotDate,
          ),

        patrimonioNetto:
          snapshot.netWorth,

        attivitaLorde:
          snapshot.grossAssets,

        passivita:
          snapshot.liabilities,
      })),
    [snapshots],
  );

  const compositionData = useMemo(
    () =>
      latest
        ? [
            {
              name: "Patrimonio",
              liquidita:
                latest.liquidity,
              investimenti:
                latest.investments,
              immobili:
                latest.realEstate,
              altriAttivi:
                latest.otherAssets,
            },
          ]
        : [],
    [latest],
  );

  async function captureSnapshot() {
    setCapturing(true);
    setNotice(null);

    try {
      const result =
        await captureLedgerCurrentState();

      setDialogOpen(false);

      setNotice({
        severity:
          result.created
            ? "success"
            : "info",

        text:
          result.created
            ? `Nuova fotografia registrata: ${result.valuationsCreated ?? result.snapshot.positionCount} posizioni valorizzate.`
            : result.reason ??
              "Lo stato corrente era già stato registrato.",
      });

      await loadData();
    } catch (error) {
      console.error(error);

      setDialogOpen(false);

      setNotice({
        severity: "error",
        text:
          "La fotografia patrimoniale non è stata registrata.",
      });
    } finally {
      setCapturing(false);
    }
  }

  if (loading && !history) {
    return (
      <Box
        sx={{
          minHeight: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 1.2,
            }}
          >
            <TimelineRoundedIcon
              fontSize="large"
            />
            Storico Patrimoniale
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.7 }}
          >
            Evoluzione del patrimonio netto
            e delle principali asset class.
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
            disabled={loading}
            onClick={() =>
              void loadData()
            }
          >
            Aggiorna
          </Button>

          <Button
            variant="contained"
            startIcon={
              <CameraAltRoundedIcon />
            }
            disabled={capturing}
            onClick={() =>
              setDialogOpen(true)
            }
          >
            Registra fotografia
          </Button>
        </Box>
      </Box>

      {notice && (
        <Alert
          severity={notice.severity}
          sx={{ mb: 3 }}
          onClose={() =>
            setNotice(null)
          }
        >
          {notice.text}
        </Alert>
      )}

      {!latest ? (
        <Alert severity="info">
          Nessuna fotografia patrimoniale
          disponibile.
        </Alert>
      ) : (
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
              gap: 2,
              mb: 3,
            }}
          >
            <KpiCard
              label="Patrimonio netto"
              value={euro(
                latest.netWorth,
              )}
              subtitle={`Fotografia del ${dateLabel(
                latest.snapshotDate,
              )}`}
            />

            <KpiCard
              label="Attività lorde"
              value={euro(
                latest.grossAssets,
              )}
              subtitle={`${latest.positionCount} posizioni attive`}
            />

            <KpiCard
              label="Passività"
              value={euro(
                latest.liabilities,
              )}
              subtitle="Debiti patrimoniali"
            />

            <KpiCard
              label="Fotografie storiche"
              value={String(
                summary?.snapshots ??
                  snapshots.length,
              )}
              subtitle={`${summary?.valuations ?? 0} valorizzazioni archiviate`}
            />
          </Box>

          {snapshots.length === 1 && (
            <Alert
              severity="info"
              sx={{ mb: 3 }}
            >
              È presente una sola fotografia.
              Il grafico mostrerà una vera
              evoluzione dopo le prossime
              rilevazioni patrimoniali.
            </Alert>
          )}

          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow:
                "0 12px 32px rgba(26,45,75,0.05)",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 0.5 }}
            >
              Evoluzione del patrimonio
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2.5 }}
            >
              Patrimonio netto, attività
              lorde e passività nel tempo.
            </Typography>

            <Box sx={{ height: 360 }}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 20,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="date"
                    tickMargin={10}
                  />

                  <YAxis
                    width={82}
                    tickFormatter={(
                      value:
                        | number
                        | string,
                    ) =>
                      shortEuro(
                        Number(value),
                      )
                    }
                  />

                  <Tooltip
                    formatter={(value) =>
                      euro(Number(value))
                    }
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="patrimonioNetto"
                    name="Patrimonio netto"
                    stroke="#1d4f7a"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="attivitaLorde"
                    name="Attività lorde"
                    stroke="#4d8b74"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="passivita"
                    name="Passività"
                    stroke="#b66a5a"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow:
                "0 12px 32px rgba(26,45,75,0.05)",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 0.5 }}
            >
              Composizione delle attività
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2.5 }}
            >
              Valore corrente per asset
              class, al lordo delle
              passività.
            </Typography>

            <Box sx={{ height: 300 }}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={compositionData}
                  layout="vertical"
                  margin={{
                    top: 10,
                    right: 20,
                    left: 20,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    type="number"
                    tickFormatter={(
                      value:
                        | number
                        | string,
                    ) =>
                      shortEuro(
                        Number(value),
                      )
                    }
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                  />

                  <Tooltip
                    formatter={(value) =>
                      euro(Number(value))
                    }
                  />

                  <Legend />

                  <Bar
                    dataKey="liquidita"
                    name="Liquidità"
                    stackId="assets"
                    fill="#5b8def"
                  />

                  <Bar
                    dataKey="investimenti"
                    name="Investimenti"
                    stackId="assets"
                    fill="#43a047"
                  />

                  <Bar
                    dataKey="immobili"
                    name="Immobili"
                    stackId="assets"
                    fill="#d59b45"
                  />

                  <Bar
                    dataKey="altriAttivi"
                    name="Altri attivi"
                    stackId="assets"
                    fill="#8e6bbd"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Typography
            variant="h6"
            sx={{ mb: 1.5 }}
          >
            Registro delle fotografie
          </Typography>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Fonte</TableCell>
                  <TableCell align="right">
                    Posizioni
                  </TableCell>
                  <TableCell align="right">
                    Attività
                  </TableCell>
                  <TableCell align="right">
                    Passività
                  </TableCell>
                  <TableCell align="right">
                    Patrimonio netto
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {[...snapshots]
                  .reverse()
                  .map((snapshot) => (
                    <TableRow
                      key={snapshot.id}
                      hover
                    >
                      <TableCell>
                        {dateTimeLabel(
                          snapshot.snapshotDate,
                        )}
                      </TableCell>

                      <TableCell>
                        {snapshot.source ===
                        "CURRENT_DATABASE_CAPTURE"
                          ? "Cattura database"
                          : snapshot.source}
                      </TableCell>

                      <TableCell align="right">
                        {snapshot.positionCount}
                      </TableCell>

                      <TableCell align="right">
                        {euro(
                          snapshot.grossAssets,
                        )}
                      </TableCell>

                      <TableCell align="right">
                        {euro(
                          snapshot.liabilities,
                        )}
                      </TableCell>

                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 750,
                        }}
                      >
                        {euro(
                          snapshot.netWorth,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (!capturing) {
            setDialogOpen(false);
          }
        }}
      >
        <DialogTitle>
          Registrare una nuova fotografia?
        </DialogTitle>

        <DialogContent>
          <DialogContentText>
            Verranno salvati il patrimonio
            netto, la composizione delle
            attività e il valore delle 52
            posizioni correnti. Nessun dato
            operativo verrà modificato.
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={capturing}
            onClick={() =>
              setDialogOpen(false)
            }
          >
            Annulla
          </Button>

          <Button
            variant="contained"
            disabled={capturing}
            onClick={() =>
              void captureSnapshot()
            }
          >
            {capturing
              ? "Registrazione..."
              : "Conferma fotografia"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
