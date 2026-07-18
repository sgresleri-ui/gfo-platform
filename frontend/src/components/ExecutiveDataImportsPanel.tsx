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
import DatasetRoundedIcon from "@mui/icons-material/DatasetRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

import {
  Link,
} from "react-router-dom";

import {
  getDataCatalogOverview,
  getImportHistory,
  getImportStatus,
  type DataCatalogOverviewResponse,
  type ImportHistoryResponse,
  type ImportRun,
  type ImportRunStatus,
  type ImportStatusResponse,
} from "../services/api";

type ExecutiveDataImports = {
  catalog: DataCatalogOverviewResponse;
  importStatus: ImportStatusResponse;
  history: ImportHistoryResponse;
};

function formatDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Non disponibile";
  }

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

function formatBytes(
  value: number | undefined,
): string {
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

function runStatusLabel(
  status: ImportRunStatus,
): string {
  if (status === "PREVIEW_READY") {
    return "Anteprima pronta";
  }

  if (status === "COMPARISON_READY") {
    return "Confronto pronto";
  }

  if (status === "BLOCKED") {
    return "Bloccata";
  }

  if (status === "FAILED") {
    return "Fallita";
  }

  if (status === "IMPORTED") {
    return "Importata";
  }

  return "Ripristinata";
}

function runStatusColor(
  status: ImportRunStatus,
):
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info" {
  if (
    status === "IMPORTED" ||
    status === "COMPARISON_READY"
  ) {
    return "success";
  }

  if (status === "PREVIEW_READY") {
    return "info";
  }

  if (status === "BLOCKED") {
    return "warning";
  }

  if (status === "FAILED") {
    return "error";
  }

  return "default";
}

export default function ExecutiveDataImportsPanel() {
  const [data, setData] =
    useState<ExecutiveDataImports | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      getDataCatalogOverview(),
      getImportStatus(),
      getImportHistory(),
    ])
      .then(
        ([
          catalog,
          importStatus,
          history,
        ]) => {
          if (!active) {
            return;
          }

          setData({
            catalog,
            importStatus,
            history,
          });

          setError("");
        },
      )
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile caricare lo stato dei dati e delle importazioni.",
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

  const sortedRuns = useMemo(
    () =>
      data
        ? [...data.history.runs].sort(
            (
              left: ImportRun,
              right: ImportRun,
            ) =>
              new Date(
                right.createdAt,
              ).getTime() -
              new Date(
                left.createdAt,
              ).getTime(),
          )
        : [],
    [data],
  );

  const latestRun =
    data?.importStatus.latestMatchingRun ??
    sortedRuns[0] ??
    null;

  const recentRuns =
    sortedRuns.slice(0, 3);

  const failedOrBlockedRuns =
    sortedRuns.filter(
      (run) =>
        run.status === "FAILED" ||
        run.status === "BLOCKED",
    ).length;

  const completedImports =
    sortedRuns.filter(
      (run) =>
        run.status === "IMPORTED",
    ).length;

  const alertSeverity:
    | "success"
    | "warning"
    | "error" = !data
    ? "warning"
    : !data.importStatus.exists ||
        data.catalog.summary.errorSources >
          0 ||
        latestRun?.status === "FAILED"
    ? "error"
    : data.catalog.summary
          .warningSources > 0 ||
        latestRun?.status === "BLOCKED"
    ? "warning"
    : "success";

  function alertMessage(): string {
    if (!data) {
      return "";
    }

    if (!data.importStatus.exists) {
      return "Il workbook configurato non è disponibile nel percorso previsto.";
    }

    if (
      data.catalog.summary.errorSources >
      0
    ) {
      return `${data.catalog.summary.errorSources} fonti dati risultano in errore.`;
    }

    if (
      latestRun?.status === "FAILED"
    ) {
      return "L’ultima elaborazione del workbook è fallita.";
    }

    if (
      latestRun?.status === "BLOCKED"
    ) {
      return "L’ultima elaborazione del workbook è stata bloccata dai controlli.";
    }

    if (
      data.catalog.summary
        .warningSources > 0
    ) {
      return `${data.catalog.summary.warningSources} fonti dati richiedono una verifica.`;
    }

    return "Fonti dati operative e workbook correttamente disponibile.";
  }

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
      <Typography
        variant="h6"
        sx={{ mb: 0.5 }}
      >
        Stato dati e importazioni
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Affidabilità delle fonti,
        disponibilità del workbook e storico
        delle elaborazioni controllate.
      </Typography>

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
        !error && (
          <>
            <Alert
              severity={alertSeverity}
              sx={{ mb: 3 }}
            >
              {alertMessage()}
            </Alert>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  xl:
                    "repeat(3, minmax(0, 1fr))",
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
                  <DatasetRoundedIcon
                    color="primary"
                  />

                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800 }}
                  >
                    Data Catalog
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <Chip
                    label={
                      `Qualità: ${data.catalog.summary.qualityScore.toLocaleString(
                        "it-IT",
                        {
                          maximumFractionDigits: 1,
                        },
                      )}%`
                    }
                    color={
                      data.catalog.summary
                        .errorSources > 0
                        ? "error"
                        : data.catalog.summary
                              .warningSources >
                            0
                        ? "warning"
                        : "success"
                    }
                    variant="outlined"
                  />

                  <Chip
                    label={
                      `Fonti: ${data.catalog.summary.sourceCount}`
                    }
                    variant="outlined"
                  />

                  <Chip
                    label={
                      `Operative: ${data.catalog.summary.healthySources}`
                    }
                    color="success"
                    variant="outlined"
                  />

                  <Chip
                    label={
                      `Da verificare: ${data.catalog.summary.warningSources}`
                    }
                    color={
                      data.catalog.summary
                        .warningSources > 0
                        ? "warning"
                        : "default"
                    }
                    variant="outlined"
                  />

                  <Chip
                    label={
                      `Errori: ${data.catalog.summary.errorSources}`
                    }
                    color={
                      data.catalog.summary
                        .errorSources > 0
                        ? "error"
                        : "default"
                    }
                    variant="outlined"
                  />

                  <Chip
                    label={
                      `Posizioni attive: ${data.catalog.summary.activePositions}`
                    }
                    variant="outlined"
                  />
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2.5 }}
                >
                  Ultima valorizzazione:{" "}
                  <strong>
                    {formatDate(
                      data.catalog.summary
                        .latestValuationDate,
                    )}
                  </strong>
                </Typography>

                <Button
                  component={Link}
                  to="/data-catalog"
                  variant="outlined"
                  endIcon={
                    <ArrowForwardRoundedIcon />
                  }
                >
                  Apri Data Catalog
                </Button>
              </Box>

              <Box
                sx={{
                  borderLeft: {
                    xs: "none",
                    xl: "1px solid",
                  },
                  borderColor: "divider",
                  pl: {
                    xs: 0,
                    xl: 3,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <DescriptionRoundedIcon
                    color="primary"
                  />

                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800 }}
                  >
                    Workbook
                  </Typography>
                </Box>

                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    mb: 1,
                  }}
                >
                  {data.importStatus.fileName}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <Chip
                    label={
                      data.importStatus.exists
                        ? "File disponibile"
                        : "File non trovato"
                    }
                    color={
                      data.importStatus.exists
                        ? "success"
                        : "error"
                    }
                    variant="outlined"
                  />

                  <Chip
                    label={
                      data.importStatus
                        .alreadyAnalyzed
                        ? "Già analizzato"
                        : "Da analizzare"
                    }
                    color={
                      data.importStatus
                        .alreadyAnalyzed
                        ? "info"
                        : "warning"
                    }
                    variant="outlined"
                  />

                  <Chip
                    label={
                      `Dimensione: ${formatBytes(
                        data.importStatus
                          .fileSize,
                      )}`
                    }
                    variant="outlined"
                  />
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Ultima modifica:{" "}
                  <strong>
                    {formatDate(
                      data.importStatus
                        .workbookModifiedAt,
                    )}
                  </strong>
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    overflowWrap:
                      "anywhere",
                    mb: 2.5,
                  }}
                >
                  Percorso:{" "}
                  {
                    data.importStatus
                      .workbookPath
                  }
                </Typography>

                <Button
                  component={Link}
                  to="/imports"
                  variant="outlined"
                  endIcon={
                    <ArrowForwardRoundedIcon />
                  }
                >
                  Apri Import Center
                </Button>
              </Box>

              <Box
                sx={{
                  borderLeft: {
                    xs: "none",
                    xl: "1px solid",
                  },
                  borderColor: "divider",
                  pl: {
                    xs: 0,
                    xl: 3,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <HistoryRoundedIcon
                    color="primary"
                  />

                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800 }}
                  >
                    Elaborazioni
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <Chip
                    label={
                      `Storico: ${data.history.count}`
                    }
                    variant="outlined"
                  />

                  <Chip
                    label={
                      `Import completati: ${completedImports}`
                    }
                    color="success"
                    variant="outlined"
                  />

                  <Chip
                    label={
                      `Bloccati o falliti: ${failedOrBlockedRuns}`
                    }
                    color={
                      failedOrBlockedRuns >
                      0
                        ? "warning"
                        : "default"
                    }
                    variant="outlined"
                  />
                </Box>

                {latestRun ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      border: "1px solid",
                      borderColor:
                        "divider",
                    }}
                  >
                    <Chip
                      size="small"
                      label={runStatusLabel(
                        latestRun.status,
                      )}
                      color={runStatusColor(
                        latestRun.status,
                      )}
                      sx={{ mb: 1.2 }}
                    />

                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 800,
                        mb: 0.7,
                      }}
                    >
                      {latestRun.fileName}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {latestRun.sheetCount} fogli
                      {" · "}
                      {
                        latestRun.activePositions
                      }{" "}
                      posizioni attive
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "block",
                        mt: 0.8,
                      }}
                    >
                      {formatDate(
                        latestRun.completedAt ??
                          latestRun.createdAt,
                      )}
                    </Typography>
                  </Paper>
                ) : (
                  <Alert
                    severity="info"
                    sx={{ mb: 2 }}
                  >
                    Nessuna elaborazione
                    disponibile.
                  </Alert>
                )}

                {recentRuns.length > 1 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Ultime elaborazioni registrate:{" "}
                    {recentRuns.length}.
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        )}
    </Paper>
  );
}
