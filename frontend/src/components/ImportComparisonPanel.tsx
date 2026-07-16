import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
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

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";

import {
  applyControlledImport,
  createImportComparison,
  rollbackControlledImport,
  type ImportApplicationResponse,
  type ImportComparisonItem,
  type ImportComparisonResponse,
  type ImportComparisonStatus,
  type ImportRollbackResponse,
} from "../services/api";

type ImportComparisonPanelProps = {
  enabled: boolean;
};

type ConfirmationMode =
  | "APPLY"
  | "ROLLBACK"
  | null;

function statusLabel(
  status: ImportComparisonStatus,
) {
  if (status === "UNCHANGED") {
    return "Invariata";
  }

  if (status === "MODIFIED") {
    return "Modificata";
  }

  if (status === "NEW") {
    return "Nuova";
  }

  if (status === "MISSING_IN_WORKBOOK") {
    return "Assente da Excel";
  }

  return "Manuale protetta";
}

function statusColor(
  status: ImportComparisonStatus,
):
  | "success"
  | "warning"
  | "error"
  | "info"
  | "default" {
  if (status === "UNCHANGED") {
    return "success";
  }

  if (status === "MODIFIED") {
    return "warning";
  }

  if (status === "NEW") {
    return "info";
  }

  if (status === "MISSING_IN_WORKBOOK") {
    return "error";
  }

  return "default";
}

function euro(value: number | null) {
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

export default function ImportComparisonPanel({
  enabled,
}: ImportComparisonPanelProps) {
  const [comparison, setComparison] =
    useState<ImportComparisonResponse | null>(
      null,
    );

  const [application, setApplication] =
    useState<ImportApplicationResponse | null>(
      null,
    );

  const [rollback, setRollback] =
    useState<ImportRollbackResponse | null>(
      null,
    );

  const [loadingComparison, setLoadingComparison] =
    useState(false);

  const [loadingAction, setLoadingAction] =
    useState(false);

  const [confirmationMode, setConfirmationMode] =
    useState<ConfirmationMode>(null);

  const [error, setError] =
    useState("");

  async function compareWorkbook() {
    setLoadingComparison(true);
    setError("");
    setApplication(null);
    setRollback(null);

    try {
      const result =
        await createImportComparison();

      setComparison(result);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Confronto non riuscito. Analizzare nuovamente il workbook.",
      );
    } finally {
      setLoadingComparison(false);
    }
  }

  async function applyImport() {
    setLoadingAction(true);
    setError("");

    try {
      const result =
        await applyControlledImport();

      setApplication(result);
      setConfirmationMode(null);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "L’importazione controllata non è stata completata.",
      );

      setConfirmationMode(null);
    } finally {
      setLoadingAction(false);
    }
  }

  async function restoreSnapshot() {
    if (!application) {
      return;
    }

    setLoadingAction(true);
    setError("");

    try {
      const result =
        await rollbackControlledImport(
          application.runId,
        );

      setRollback(result);
      setConfirmationMode(null);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Il ripristino dello snapshot non è stato completato.",
      );

      setConfirmationMode(null);
    } finally {
      setLoadingAction(false);
    }
  }

  const summary =
    comparison?.comparison.summary;

  return (
    <Box sx={{ mb: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: "1px solid",
          borderColor: "divider",
          boxShadow:
            "0 12px 32px rgba(26,45,75,0.06)",
        }}
      >
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
          }}
        >
          <Box>
            <Typography variant="h6">
              Confronto Excel–Database
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.4 }}
            >
              Verifica le posizioni prima di
              modificare il database.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={
              loadingComparison ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : (
                <CompareArrowsRoundedIcon />
              )
            }
            disabled={
              !enabled ||
              loadingComparison ||
              loadingAction
            }
            onClick={() =>
              void compareWorkbook()
            }
          >
            {loadingComparison
              ? "Confronto..."
              : "Confronta posizioni"}
          </Button>
        </Box>

        {!enabled && (
          <Alert
            severity="info"
            sx={{ mt: 2.5 }}
          >
            Analizzare prima il workbook.
          </Alert>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mt: 2.5 }}
          >
            {error}
          </Alert>
        )}
      </Paper>

      {comparison && summary && (
        <>
          <Alert
            severity={
              summary.requiresReview
                ? "warning"
                : "success"
            }
            icon={<CheckCircleRoundedIcon />}
            sx={{ my: 3 }}
          >
            {summary.requiresReview
              ? "Sono presenti differenze da controllare prima dell’importazione."
              : "Excel e database risultano riconciliati."}
          </Alert>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
                xl: "repeat(6, minmax(0, 1fr))",
              },
              gap: 2,
              mb: 3,
            }}
          >
            {[
              {
                label: "Estratte",
                value:
                  summary.extractedPositions,
              },
              {
                label: "Invariate",
                value: summary.unchanged,
              },
              {
                label: "Modificate",
                value: summary.modified,
              },
              {
                label: "Nuove",
                value: summary.new,
              },
              {
                label: "Assenti",
                value:
                  summary.missingInWorkbook,
              },
              {
                label: "Manuali protette",
                value:
                  summary.protectedManual,
              },
            ].map((item) => (
              <Paper
                key={item.label}
                elevation={0}
                sx={{
                  p: 2.2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {item.label}
                </Typography>

                <Typography
                  variant="h5"
                  sx={{ mt: 0.5 }}
                >
                  {item.value}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2 }}
            >
              Riconciliazione valori
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                gap: 3,
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Database gestito da Excel
                </Typography>

                <Typography
                  variant="h6"
                  sx={{ mt: 0.5 }}
                >
                  {euro(
                    summary.databaseManagedValue,
                  )}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Valore estratto da Excel
                </Typography>

                <Typography
                  variant="h6"
                  sx={{ mt: 0.5 }}
                >
                  {euro(summary.workbookValue)}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Differenza
                </Typography>

                <Typography
                  variant="h6"
                  sx={{
                    mt: 0.5,
                    color:
                      summary.valueDifference ===
                      0
                        ? "success.main"
                        : "warning.main",
                  }}
                >
                  {euro(
                    summary.valueDifference,
                  )}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {!application && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                border: "1px solid",
                borderColor: "primary.main",
                backgroundColor:
                  "rgba(28, 78, 121, 0.025)",
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
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <ShieldRoundedIcon />
                    Importazione controllata
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.8 }}
                  >
                    Prima dell’importazione verrà
                    creato uno snapshot completo
                    delle posizioni patrimoniali.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                    <CloudUploadRoundedIcon />
                  }
                  disabled={loadingAction}
                  onClick={() =>
                    setConfirmationMode("APPLY")
                  }
                >
                  Applica importazione
                </Button>
              </Box>
            </Paper>
          )}

          {application && !rollback && (
            <Alert
              severity="success"
              sx={{ mb: 3 }}
              action={
                <Button
                  color="inherit"
                  startIcon={
                    <RestoreRoundedIcon />
                  }
                  disabled={loadingAction}
                  onClick={() =>
                    setConfirmationMode(
                      "ROLLBACK",
                    )
                  }
                >
                  Ripristina
                </Button>
              }
            >
              Importazione completata:{" "}
              {application.summary
                .appliedPositions}{" "}
              posizioni applicate. Snapshot
              preventivo creato correttamente.
            </Alert>
          )}

          {rollback && (
            <Alert
              severity="info"
              sx={{ mb: 3 }}
              icon={<RestoreRoundedIcon />}
            >
              Snapshot ripristinato:{" "}
              {rollback.restoredPositions}{" "}
              posizioni recuperate.
            </Alert>
          )}

          <Typography
            variant="h6"
            sx={{ mb: 1.5 }}
          >
            Dettaglio posizioni
          </Typography>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              maxHeight: 620,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>
                    Posizione
                  </TableCell>
                  <TableCell>
                    Categoria
                  </TableCell>
                  <TableCell>Stato</TableCell>
                  <TableCell align="right">
                    Database
                  </TableCell>
                  <TableCell align="right">
                    Excel
                  </TableCell>
                  <TableCell align="right">
                    Differenza
                  </TableCell>
                  <TableCell>
                    Origine
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {comparison.comparison.items.map(
                  (
                    item:
                      ImportComparisonItem,
                  ) => (
                    <TableRow
                      key={item.code}
                      hover
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 750,
                          }}
                        >
                          {item.name}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontFamily:
                              "monospace",
                          }}
                        >
                          {item.code}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {item.category}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          color={statusColor(
                            item.status,
                          )}
                          label={statusLabel(
                            item.status,
                          )}
                        />
                      </TableCell>

                      <TableCell align="right">
                        {euro(
                          item.databaseValue,
                        )}
                      </TableCell>

                      <TableCell align="right">
                        {euro(
                          item.workbookValue,
                        )}
                      </TableCell>

                      <TableCell align="right">
                        {euro(
                          item.difference,
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="caption"
                        >
                          {item.origin ??
                            item.source}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog
        open={confirmationMode !== null}
        onClose={() => {
          if (!loadingAction) {
            setConfirmationMode(null);
          }
        }}
      >
        <DialogTitle>
          {confirmationMode === "APPLY"
            ? "Confermare l’importazione?"
            : "Ripristinare lo snapshot?"}
        </DialogTitle>

        <DialogContent>
          <DialogContentText>
            {confirmationMode === "APPLY"
              ? "Verrà creato uno snapshot completo prima di aggiornare le posizioni gestite dal workbook. Le posizioni manuali, compreso El Toro, resteranno protette."
              : "Le posizioni patrimoniali verranno riportate esattamente allo stato precedente all’importazione."}
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={loadingAction}
            onClick={() =>
              setConfirmationMode(null)
            }
          >
            Annulla
          </Button>

          <Button
            variant="contained"
            color={
              confirmationMode === "ROLLBACK"
                ? "warning"
                : "primary"
            }
            disabled={loadingAction}
            onClick={() => {
              if (
                confirmationMode === "APPLY"
              ) {
                void applyImport();
              } else {
                void restoreSnapshot();
              }
            }}
          >
            {loadingAction
              ? "Operazione in corso..."
              : confirmationMode === "APPLY"
                ? "Conferma importazione"
                : "Conferma ripristino"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
