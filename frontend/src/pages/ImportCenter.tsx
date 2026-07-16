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
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import FingerprintRoundedIcon from "@mui/icons-material/FingerprintRounded";
import DatasetRoundedIcon from "@mui/icons-material/DatasetRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";

import KpiCard from "../components/KpiCard";

import {
  createImportPreview,
  getImportHistory,
  getImportStatus,
  type ImportCheckStatus,
  type ImportHistoryResponse,
  type ImportRun,
  type ImportRunStatus,
  type ImportStatusResponse,
} from "../services/api";

function runStatusLabel(
  status: ImportRunStatus,
) {
  if (status === "PREVIEW_READY") {
    return "Anteprima pronta";
  }

  if (status === "BLOCKED") {
    return "Bloccata";
  }

  if (status === "IMPORTED") {
    return "Importata";
  }

  return "Errore";
}

function runStatusColor(
  status: ImportRunStatus,
): "success" | "warning" | "error" | "info" {
  if (status === "PREVIEW_READY") {
    return "info";
  }

  if (status === "IMPORTED") {
    return "success";
  }

  if (status === "BLOCKED") {
    return "warning";
  }

  return "error";
}

function checkStatusColor(
  status: ImportCheckStatus,
) {
  if (status === "PASS") {
    return "success.main";
  }

  if (status === "WARNING") {
    return "warning.main";
  }

  return "error.main";
}

function formatBytes(value?: number) {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  if (value < 1024) {
    return `${value} byte`;
  }

  if (value < 1024 * 1024) {
    return `${(
      value / 1024
    ).toLocaleString("it-IT", {
      maximumFractionDigits: 1,
    })} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toLocaleString("it-IT", {
    maximumFractionDigits: 2,
  })} MB`;
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Non disponibile";
  }

  return new Date(
    value,
  ).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortHash(
  value?: string,
) {
  if (!value) {
    return "—";
  }

  return `${value.slice(0, 16)}…`;
}

export default function ImportCenter() {
  const [status, setStatus] =
    useState<ImportStatusResponse | null>(
      null,
    );

  const [history, setHistory] =
    useState<ImportHistoryResponse | null>(
      null,
    );

  const [preview, setPreview] =
    useState<ImportRun | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function loadImportCenter() {
    setLoading(true);
    setError("");

    const [
      statusResult,
      historyResult,
    ] = await Promise.allSettled([
      getImportStatus(),
      getImportHistory(),
    ]);

    if (
      statusResult.status === "fulfilled"
    ) {
      setStatus(statusResult.value);
    } else {
      setStatus(null);
      setError(
        "Impossibile verificare il workbook configurato.",
      );
    }

    if (
      historyResult.status === "fulfilled"
    ) {
      setHistory(historyResult.value);
    } else {
      setHistory(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadImportCenter();
  }, []);

  async function analyzeWorkbook() {
    setAnalyzing(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await createImportPreview();

      setPreview(result);

      if (
        result.status ===
        "PREVIEW_READY"
      ) {
        setSuccess(
          result.preview.duplicateFile
            ? "Anteprima completata. Il file è identico a una versione già analizzata."
            : "Anteprima completata. Il workbook può passare alla fase di confronto.",
        );
      } else {
        setError(
          result.errorMessage ??
            "L’anteprima contiene errori bloccanti.",
        );
      }

      await loadImportCenter();
      setPreview(result);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Analisi non riuscita. Verificare backend, percorso e workbook.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading && !status) {
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

  const visiblePreview =
    preview ??
    status?.latestMatchingRun ??
    null;

  const previewDetails =
    visiblePreview &&
    "checks" in visiblePreview.preview
      ? visiblePreview.preview
      : null;

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
            Import Center
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Analisi controllata del workbook
            prima di qualsiasi modifica al database.
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
              void loadImportCenter()
            }
            disabled={loading || analyzing}
          >
            Aggiorna
          </Button>

          <Button
            variant="contained"
            startIcon={
              analyzing ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : (
                <SearchRoundedIcon />
              )
            }
            onClick={() =>
              void analyzeWorkbook()
            }
            disabled={
              analyzing ||
              loading ||
              status?.exists === false
            }
          >
            {analyzing
              ? "Analisi..."
              : "Analizza workbook"}
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

      {status && !status.exists && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {status.message ??
            "Workbook non trovato."}
          Percorso verificato:{" "}
          <strong>
            {status.workbookPath}
          </strong>
        </Alert>
      )}

      {status && status.exists && (
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
                "linear-gradient(120deg, #24344F 0%, #405B82 55%, #6683A8 135%)",
              boxShadow:
                "0 18px 42px rgba(38,58,88,0.23)",

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
              Controlled Data Import
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color:
                  "rgba(255,255,255,0.76)",
              }}
            >
              Workbook configurato
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: {
                  xs: "2rem",
                  md: "2.8rem",
                },
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: "-0.04em",
              }}
            >
              {status.fileName}
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
                label={formatBytes(
                  status.fileSize,
                )}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={`Modificato ${formatDate(
                  status.workbookModifiedAt,
                )}`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={
                  status.alreadyAnalyzed
                    ? "File già analizzato"
                    : "Nuovo file"
                }
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
              title="Workbook"
              value={status.fileName}
              subtitle={
                status.configuredFolder
              }
              icon={
                <DescriptionRoundedIcon />
              }
              tone="primary"
            />

            <KpiCard
              title="Fingerprint"
              value={shortHash(
                status.fileHash,
              )}
              subtitle="SHA-256"
              icon={
                <FingerprintRoundedIcon />
              }
              tone="success"
            />

            <KpiCard
              title="Fogli rilevati"
              value={String(
                visiblePreview?.sheetCount ??
                  "—",
              )}
              subtitle="Struttura workbook"
              icon={<DatasetRoundedIcon />}
              tone="warning"
            />

            <KpiCard
              title="Analisi registrate"
              value={String(
                history?.count ?? 0,
              )}
              subtitle="Storico Import Center"
              icon={<HistoryRoundedIcon />}
              tone="primary"
            />
          </Box>
        </>
      )}

      {visiblePreview && (
        <Paper
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
              mb: 2.5,
            }}
          >
            <Box>
              <Typography variant="h6">
                Ultima anteprima
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.4 }}
              >
                Analisi del{" "}
                {formatDate(
                  visiblePreview.completedAt,
                )}
              </Typography>
            </Box>

            <Chip
              color={runStatusColor(
                visiblePreview.status,
              )}
              label={runStatusLabel(
                visiblePreview.status,
              )}
            />
          </Box>

          {previewDetails && (
            <>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 2,
                  mb: 3,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Errori bloccanti
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{
                      color:
                        previewDetails.summary
                          .blockingErrors > 0
                          ? "error.main"
                          : "success.main",
                    }}
                  >
                    {
                      previewDetails.summary
                        .blockingErrors
                    }
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Avvisi
                  </Typography>

                  <Typography variant="h6">
                    {
                      previewDetails.summary
                        .warnings
                    }
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Posizioni attive
                  </Typography>

                  <Typography variant="h6">
                    {
                      previewDetails.summary
                        .activePositions
                    }
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Posizioni archiviate
                  </Typography>

                  <Typography variant="h6">
                    {
                      previewDetails.summary
                        .archivedPositions
                    }
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                }}
              >
                {previewDetails.checks.map(
                  (check, index) => (
                    <Box key={check.id}>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1.5,
                          alignItems:
                            "flex-start",
                        }}
                      >
                        <Box
                          sx={{
                            color:
                              checkStatusColor(
                                check.status,
                              ),
                          }}
                        >
                          {check.status ===
                          "PASS" ? (
                            <CheckCircleRoundedIcon />
                          ) : check.status ===
                            "WARNING" ? (
                            <WarningAmberRoundedIcon />
                          ) : (
                            <ErrorRoundedIcon />
                          )}
                        </Box>

                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 750,
                            }}
                          >
                            {check.title}
                          </Typography>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.3 }}
                          >
                            {check.message}
                          </Typography>
                        </Box>
                      </Box>

                      {index <
                        previewDetails.checks
                          .length -
                          1 && (
                        <Divider
                          sx={{ mt: 2 }}
                        />
                      )}
                    </Box>
                  ),
                )}
              </Box>

              <Alert
                severity={
                  previewDetails.safeToContinue
                    ? "success"
                    : "error"
                }
                sx={{ mt: 3 }}
              >
                {previewDetails.nextStep}
              </Alert>
            </>
          )}
        </Paper>
      )}

      <Typography
        variant="h6"
        sx={{ mb: 1.5 }}
      >
        Storico delle analisi
      </Typography>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          boxShadow:
            "0 12px 32px rgba(26,45,75,0.06)",
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>File</TableCell>
              <TableCell>Stato</TableCell>
              <TableCell>Hash</TableCell>
              <TableCell align="right">
                Fogli
              </TableCell>
              <TableCell align="right">
                Posizioni attive
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {history?.runs.length ? (
              history.runs.map((run) => (
                <TableRow
                  key={run.id}
                  hover
                >
                  <TableCell>
                    {formatDate(
                      run.createdAt,
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700 }}
                    >
                      {run.fileName}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      color={runStatusColor(
                        run.status,
                      )}
                      label={runStatusLabel(
                        run.status,
                      )}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily:
                          "monospace",
                      }}
                    >
                      {shortHash(
                        run.fileHash,
                      )}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    {run.sheetCount}
                  </TableCell>

                  <TableCell align="right">
                    {run.activePositions}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  align="center"
                >
                  <Typography
                    color="text.secondary"
                    sx={{ py: 3 }}
                  >
                    Nessuna analisi registrata.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
