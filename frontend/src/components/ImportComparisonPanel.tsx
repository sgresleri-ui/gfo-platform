import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

import {
  createImportComparison,
  type ImportComparisonItem,
  type ImportComparisonResponse,
  type ImportComparisonStatus,
} from "../services/api";

type ImportComparisonPanelProps = {
  enabled: boolean;
};

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
  const [data, setData] =
    useState<ImportComparisonResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function compareWorkbook() {
    setLoading(true);
    setError("");

    try {
      const result =
        await createImportComparison();

      setData(result);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Confronto non riuscito. Eseguire prima l’analisi del workbook.",
      );
    } finally {
      setLoading(false);
    }
  }

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
              Verifica dettagliata delle posizioni
              senza applicare modifiche.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={
              loading ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : (
                <CompareArrowsRoundedIcon />
              )
            }
            disabled={!enabled || loading}
            onClick={() =>
              void compareWorkbook()
            }
          >
            {loading
              ? "Confronto..."
              : "Confronta posizioni"}
          </Button>
        </Box>

        {!enabled && (
          <Alert
            severity="info"
            sx={{ mt: 2.5 }}
          >
            Analizzare prima il workbook per
            abilitare il confronto.
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

      {data && (
        <>
          <Alert
            severity={
              data.comparison.summary
                .requiresReview
                ? "warning"
                : "success"
            }
            icon={<CheckCircleRoundedIcon />}
            sx={{ my: 3 }}
          >
            {data.comparison.summary
              .requiresReview
              ? "Sono presenti differenze che richiedono revisione."
              : "Excel e database risultano riconciliati. Nessuna modifica necessaria."}
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
                  data.comparison.summary
                    .extractedPositions,
              },
              {
                label: "Invariate",
                value:
                  data.comparison.summary
                    .unchanged,
              },
              {
                label: "Modificate",
                value:
                  data.comparison.summary
                    .modified,
              },
              {
                label: "Nuove",
                value:
                  data.comparison.summary.new,
              },
              {
                label: "Assenti",
                value:
                  data.comparison.summary
                    .missingInWorkbook,
              },
              {
                label: "Manuali protette",
                value:
                  data.comparison.summary
                    .protectedManual,
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
                    data.comparison.summary
                      .databaseManagedValue,
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
                  {euro(
                    data.comparison.summary
                      .workbookValue,
                  )}
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
                      data.comparison.summary
                        .valueDifference === 0
                        ? "success.main"
                        : "warning.main",
                  }}
                >
                  {euro(
                    data.comparison.summary
                      .valueDifference,
                  )}
                </Typography>
              </Box>
            </Box>
          </Paper>

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
              boxShadow:
                "0 12px 32px rgba(26,45,75,0.06)",
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Posizione</TableCell>
                  <TableCell>Categoria</TableCell>
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
                  <TableCell>Origine</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.comparison.items.map(
                  (
                    item: ImportComparisonItem,
                  ) => (
                    <TableRow
                      key={item.code}
                      hover
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 750 }}
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
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color:
                              item.difference ===
                                null ||
                              item.difference === 0
                                ? "text.primary"
                                : "warning.main",
                          }}
                        >
                          {euro(
                            item.difference,
                          )}
                        </Typography>
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
    </Box>
  );
}
