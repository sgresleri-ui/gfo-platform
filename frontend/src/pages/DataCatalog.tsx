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
  Divider,
  LinearProgress,
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
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import DatasetRoundedIcon from "@mui/icons-material/DatasetRounded";
import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import SourceRoundedIcon from "@mui/icons-material/SourceRounded";

import KpiCard from "../components/KpiCard";

import {
  getDataCatalogOverview,
  type DataCatalogOverviewResponse,
  type DataCatalogSourceStatus,
  type DataQualityStatus,
} from "../services/api";

const CATEGORY_LABELS: Record<
  string,
  string
> = {
  LIQUIDITY: "Liquidità",
  INVESTMENT: "Investimenti",
  REAL_ESTATE: "Immobili",
  OTHER_ASSET: "Altri attivi",
  LIABILITY: "Passività",
};

function sourceStatusLabel(
  status: DataCatalogSourceStatus,
) {
  if (status === "HEALTHY") {
    return "Operativa";
  }

  if (status === "WARNING") {
    return "Da verificare";
  }

  return "Errore";
}

function sourceStatusColor(
  status: DataCatalogSourceStatus,
): "success" | "warning" | "error" {
  if (status === "HEALTHY") {
    return "success";
  }

  if (status === "WARNING") {
    return "warning";
  }

  return "error";
}

function qualityStatusColor(
  status: DataQualityStatus,
): "success" | "warning" | "error" {
  if (status === "PASS") {
    return "success";
  }

  if (status === "WARNING") {
    return "warning";
  }

  return "error";
}

function qualityStatusLabel(
  status: DataQualityStatus,
) {
  if (status === "PASS") {
    return "Superato";
  }

  if (status === "WARNING") {
    return "Attenzione";
  }

  return "Errore";
}

export default function DataCatalog() {
  const [data, setData] =
    useState<DataCatalogOverviewResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadCatalog() {
    setLoading(true);
    setError("");

    try {
      const result =
        await getDataCatalogOverview();

      setData(result);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile caricare il Data Catalog.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

  const maximumCategoryCount =
    useMemo(() => {
      if (!data) {
        return 1;
      }

      return Math.max(
        1,
        ...data.categories.map(
          (category) => category.count,
        ),
      );
    }, [data]);

  function formatDate(
    value: string | null,
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
            Data Catalog
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Sorgenti, qualità, aggiornamento e
            tracciabilità dei dati patrimoniali.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={
            <RefreshRoundedIcon />
          }
          onClick={() =>
            void loadCatalog()
          }
          disabled={loading}
        >
          {loading
            ? "Controllo..."
            : "Aggiorna controlli"}
        </Button>
      </Box>

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
                "linear-gradient(120deg, #123D3A 0%, #1D6862 55%, #31958C 135%)",
              boxShadow:
                "0 18px 42px rgba(20,82,77,0.23)",

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
              Data Governance
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color:
                  "rgba(255,255,255,0.76)",
              }}
            >
              Punteggio qualità dei dati
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
              {data.summary.qualityScore}%
            </Typography>

            <LinearProgress
              variant="determinate"
              value={
                data.summary.qualityScore
              }
              sx={{
                maxWidth: 520,
                height: 10,
                mt: 2.5,
                borderRadius: 10,
                backgroundColor:
                  "rgba(255,255,255,0.18)",

                "& .MuiLinearProgress-bar": {
                  borderRadius: 10,
                  backgroundColor: "white",
                },
              }}
            />

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                mt: 3,
              }}
            >
              <Chip
                label={`${data.summary.healthySources} sorgenti operative`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={`${data.summary.warningSources} avvisi`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={`Controllato ${formatDate(
                  data.generatedAt,
                )}`}
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
              title="Sorgenti dati"
              value={String(
                data.summary.sourceCount,
              )}
              subtitle="Database, workbook e registri"
              icon={<SourceRoundedIcon />}
              tone="primary"
            />

            <KpiCard
              title="Posizioni attive"
              value={String(
                data.summary.activePositions,
              )}
              subtitle="Incluse nei totali"
              icon={<DatasetRoundedIcon />}
              tone="success"
            />

            <KpiCard
              title="Posizioni archiviate"
              value={String(
                data.summary.archivedPositions,
              )}
              subtitle="Escluse dai totali"
              icon={<ArchiveRoundedIcon />}
              tone="warning"
            />

            <KpiCard
              title="Decisioni"
              value={String(
                data.summary.decisionEntries,
              )}
              subtitle="Registro strategico"
              icon={<FactCheckRoundedIcon />}
              tone="primary"
            />
          </Box>

          {data.summary.errorSources > 0 && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
            >
              Sono presenti{" "}
              {data.summary.errorSources} sorgenti
              con errori bloccanti.
            </Alert>
          )}

          <Typography
            variant="h6"
            sx={{ mb: 1.5 }}
          >
            Sorgenti dati
          </Typography>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              mb: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow:
                "0 12px 32px rgba(26,45,75,0.06)",
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sorgente</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Stato</TableCell>
                  <TableCell align="right">
                    Record
                  </TableCell>
                  <TableCell>
                    Ultimo aggiornamento
                  </TableCell>
                  <TableCell>Percorso</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.sources.map(
                  (source) => (
                    <TableRow
                      key={source.id}
                      hover
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 750 }}
                        >
                          {source.name}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {source.description}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {source.type}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          color={sourceStatusColor(
                            source.status,
                          )}
                          label={sourceStatusLabel(
                            source.status,
                          )}
                        />
                      </TableCell>

                      <TableCell align="right">
                        {source.records}
                      </TableCell>

                      <TableCell>
                        {formatDate(
                          source.lastUpdated,
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily:
                              "monospace",
                          }}
                        >
                          {source.location}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                xl: "minmax(0, 0.8fr) minmax(0, 1.2fr)",
              },
              gap: 2.5,
              mb: 3,
            }}
          >
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
              <Typography
                variant="h6"
                sx={{ mb: 0.5 }}
              >
                Posizioni per categoria
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                Numero di posizioni attive
                presenti nel registro.
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gap: 2.2,
                }}
              >
                {data.categories.map(
                  (category) => (
                    <Box key={category.name}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          mb: 0.7,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {CATEGORY_LABELS[
                            category.name
                          ] ?? category.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {category.count}
                        </Typography>
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={
                          (category.count /
                            maximumCategoryCount) *
                          100
                        }
                        sx={{
                          height: 9,
                          borderRadius: 8,
                          backgroundColor:
                            "#E9EEF6",

                          "& .MuiLinearProgress-bar":
                            {
                              borderRadius: 8,
                            },
                        }}
                      />
                    </Box>
                  ),
                )}
              </Box>
            </Paper>

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
              <Typography
                variant="h6"
                sx={{ mb: 0.5 }}
              >
                Controlli di qualità
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                Verifiche automatiche eseguite
                sulle sorgenti correnti.
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                }}
              >
                {data.qualityChecks.map(
                  (check, index) => (
                    <Box key={check.id}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems:
                            "flex-start",
                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            mt: 0.2,
                            color:
                              check.status ===
                              "PASS"
                                ? "success.main"
                                : check.status ===
                                    "WARNING"
                                  ? "warning.main"
                                  : "error.main",
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

                        <Box
                          sx={{ flexGrow: 1 }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              gap: 2,
                              mb: 0.4,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 750,
                              }}
                            >
                              {check.title}
                            </Typography>

                            <Chip
                              size="small"
                              variant="outlined"
                              color={qualityStatusColor(
                                check.status,
                              )}
                              label={qualityStatusLabel(
                                check.status,
                              )}
                            />
                          </Box>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            {check.message}
                          </Typography>
                        </Box>
                      </Box>

                      {index <
                        data.qualityChecks.length -
                          1 && (
                        <Divider sx={{ mt: 2 }} />
                      )}
                    </Box>
                  ),
                )}
              </Box>
            </Paper>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2 }}
            >
              Origine delle posizioni attive
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.2,
              }}
            >
              {data.origins.map((origin) => (
                <Chip
                  key={origin.name}
                  label={`${origin.name}: ${origin.count}`}
                  variant="outlined"
                />
              ))}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}
