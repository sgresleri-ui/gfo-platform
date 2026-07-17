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

import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  getDataQuality,
  type DataQualityIssue,
  type DataQualityResponse,
} from "../services/api";

type KpiCardProps = {
  label: string;
  value: string;
  subtitle: string;
};

function euro(value: number): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function percentage(
  value: number,
): string {
  return `${value.toLocaleString(
    "it-IT",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}%`;
}

function dateTimeLabel(
  value: string,
): string {
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

function categoryLabel(
  category: string,
): string {
  if (category === "LIQUIDITY") {
    return "Liquidità";
  }

  if (category === "INVESTMENT") {
    return "Investimenti";
  }

  if (category === "REAL_ESTATE") {
    return "Immobili";
  }

  if (category === "OTHER_ASSET") {
    return "Altri attivi";
  }

  if (category === "LIABILITY") {
    return "Passività";
  }

  return category;
}

function issueColor(
  severity: DataQualityIssue["severity"],
):
  | "error"
  | "warning"
  | "info" {
  if (severity === "ERROR") {
    return "error";
  }

  if (severity === "WARNING") {
    return "warning";
  }

  return "info";
}

function sourceLabel(
  source: string,
): string {
  if (
    source ===
    "EXCEL_GRESLERI2026"
  ) {
    return "Excel Gresleri2026";
  }

  if (
    source ===
    "USER_CONFIRMED_2026"
  ) {
    return "Dato confermato manualmente";
  }

  return source;
}

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
        minHeight: 122,
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
          fontWeight: 800,
        }}
      >
        {value}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.6 }}
      >
        {subtitle}
      </Typography>
    </Paper>
  );
}

export default function DataQuality() {
  const [data, setData] =
    useState<DataQualityResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadData = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await getDataQuality();

        setData(result);
      } catch (requestError) {
        console.error(requestError);

        setError(
          "Impossibile caricare il controllo qualità dei dati.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const issueItems = useMemo(
    () =>
      data?.items.filter(
        (item) =>
          item.issueCount > 0,
      ) ?? [],
    [data],
  );

  if (loading && !data) {
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

  if (!data) {
    return (
      <Alert severity="error">
        {error ||
          "Controllo qualità non disponibile."}
      </Alert>
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
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              fontWeight: 800,
            }}
          >
            <FactCheckRoundedIcon
              fontSize="large"
            />
            Qualità Dati
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.7 }}
          >
            Completezza, aggiornamento e
            provenienza dei dati patrimoniali.
          </Typography>
        </Box>

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
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      <Alert
        severity="info"
        sx={{ mb: 3 }}
      >
        Le anomalie segnalate non
        modificano automaticamente i dati.
        Ogni correzione dovrà essere
        verificata e confermata.
      </Alert>

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
          label="Posizioni totali"
          value={String(
            data.summary.totalPositions,
          )}
          subtitle="Posizioni patrimoniali attive"
        />

        <KpiCard
          label="Con anomalie"
          value={String(
            data.summary
              .positionsWithIssues,
          )}
          subtitle={`${data.summary.positionsWithoutIssues} senza anomalie`}
        />

        <KpiCard
          label="Completezza Paese"
          value={percentage(
            data.summary
              .countryCompleteness,
          )}
          subtitle={`${data.summary.missingCountry} dati mancanti`}
        />

        <KpiCard
          label="Completezza Valuta"
          value={percentage(
            data.summary
              .currencyCompleteness,
          )}
          subtitle={`${data.summary.missingCurrency} dati mancanti`}
        />
      </Box>

      <Typography
        variant="h6"
        sx={{ mb: 1.5 }}
      >
        Aggiornamento delle valorizzazioni
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md:
              "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <KpiCard
          label="Entro 30 giorni"
          value={String(
            data.freshness.fresh30Days,
          )}
          subtitle={percentage(
            data.freshness
              .fresh30DaysPercentage,
          )}
        />

        <KpiCard
          label="Da 31 a 90 giorni"
          value={String(
            data.freshness
              .age31To90Days,
          )}
          subtitle="Da monitorare"
        />

        <KpiCard
          label="Da 91 a 180 giorni"
          value={String(
            data.freshness
              .age91To180Days,
          )}
          subtitle="Aggiornamento consigliato"
        />

        <KpiCard
          label="Oltre 180 giorni"
          value={String(
            data.freshness
              .olderThan180Days,
          )}
          subtitle="Valorizzazioni obsolete"
        />
      </Box>

      <Typography
        variant="h6"
        sx={{ mb: 1.5 }}
      >
        Provenienza dei dati
      </Typography>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                Fonte
              </TableCell>

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
                Contributo netto
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.sources.map(
              (source) => (
                <TableRow
                  key={source.source}
                  hover
                >
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 750,
                      }}
                    >
                      {sourceLabel(
                        source.source,
                      )}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontFamily:
                          "monospace",
                      }}
                    >
                      {source.source}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    {source.positions}

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "block",
                      }}
                    >
                      {source.assetPositions} attive ·{" "}
                      {source.liabilityPositions} passive
                    </Typography>
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    {euro(
                      source.grossAssets,
                    )}
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    {euro(
                      source.liabilities,
                    )}
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 800,
                    }}
                  >
                    {euro(
                      source.netContribution,
                    )}
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography
        variant="h6"
        sx={{ mb: 1.5 }}
      >
        Anomalie rilevate
      </Typography>

      {issueItems.length === 0 ? (
        <Alert severity="success">
          Nessuna anomalia rilevata nelle
          posizioni attive.
        </Alert>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            maxHeight: 680,
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

                <TableCell>
                  Paese
                </TableCell>

                <TableCell>
                  Valuta
                </TableCell>

                <TableCell>
                  Fonte
                </TableCell>

                <TableCell>
                  Data valorizzazione
                </TableCell>

                <TableCell>
                  Anomalie
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {issueItems.map(
                (item) => (
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
                      {categoryLabel(
                        item.category,
                      )}
                    </TableCell>

                    <TableCell>
                      {item.country ||
                        "Non specificato"}
                    </TableCell>

                    <TableCell>
                      {item.currency ||
                        "Non specificata"}
                    </TableCell>

                    <TableCell>
                      {sourceLabel(
                        item.source,
                      )}
                    </TableCell>

                    <TableCell>
                      {dateTimeLabel(
                        item.valuationDate,
                      )}

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                        }}
                      >
                        {item.ageDays} giorni
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.8,
                        }}
                      >
                        {item.issues.map(
                          (issue) => (
                            <Chip
                              key={
                                issue.code
                              }
                              size="small"
                              color={issueColor(
                                issue.severity,
                              )}
                              label={
                                issue.message
                              }
                              variant="outlined"
                            />
                          ),
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          mt: 2,
          display: "block",
        }}
      >
        Controllo eseguito il{" "}
        {dateTimeLabel(data.asOf)}.
      </Typography>
    </Box>
  );
}
