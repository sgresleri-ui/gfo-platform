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
  Typography,
} from "@mui/material";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getExecutiveReportSnapshot,
  type ExecutiveReportSnapshotDetail,
} from "../services/api";

type AllocationItem = {
  label: string;
  value: number;
  percentage: number;
};

function formatCurrency(
  value: number | null,
  currency: string,
): string {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString(
    "it-IT",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function formatPercentage(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return `${value.toLocaleString(
    "it-IT",
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  )}%`;
}

function formatDateTime(
  value: string,
): string {
  return new Date(
    value,
  ).toLocaleString(
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

export default function ReportSnapshotPrint() {
  const { id } = useParams<{
    id: string;
  }>();

  const navigate = useNavigate();

  const [
    snapshot,
    setSnapshot,
  ] = useState<
    ExecutiveReportSnapshotDetail | null
  >(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!id) {
      setError(
        "Identificativo dello snapshot non disponibile.",
      );
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);
    setError("");

    getExecutiveReportSnapshot(id)
      .then((result) => {
        if (active) {
          setSnapshot(result);
        }
      })
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile caricare il report archiviato.",
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
  }, [id]);

  const allocation =
    useMemo<AllocationItem[]>(() => {
      if (
        !snapshot ||
        snapshot.netWorth === null ||
        snapshot.netWorth <= 0
      ) {
        return [];
      }

      const values = [
        {
          label: "Liquidità",
          value:
            snapshot.liquidity ?? 0,
        },
        {
          label:
            "Investimenti finanziari",
          value:
            snapshot.investments ?? 0,
        },
        {
          label: "Immobili",
          value:
            snapshot.realEstate ?? 0,
        },
        {
          label: "Altri attivi",
          value:
            snapshot.otherAssets ?? 0,
        },
      ].filter(
        (item) => item.value > 0,
      );

      return values.map((item) => ({
        ...item,
        percentage:
          (
            item.value /
            snapshot.netWorth!
          ) * 100,
      }));
    }, [snapshot]);

  const budget =
    snapshot?.payload?.sections
      .budget.data ?? null;

  const properties =
    snapshot?.payload?.sections
      .properties.data ?? null;

  const investments =
    snapshot?.payload?.sections
      .investments.data ?? null;

  const liquidity =
    snapshot?.payload?.sections
      .liquidity.data ?? null;

  const budget2027 =
    budget?.annualComparison.find(
      (item) =>
        item.year === 2027 &&
        item.scenario === "BUDGET",
    ) ?? null;

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !snapshot) {
    return (
      <Box
        sx={{
          maxWidth: 900,
          mx: "auto",
          p: 4,
        }}
      >
        <Alert severity="error">
          {error ||
            "Report archiviato non disponibile."}
        </Alert>

        <Button
          startIcon={
            <ArrowBackRoundedIcon />
          }
          onClick={() =>
            navigate("/reports")
          }
          sx={{ mt: 2 }}
        >
          Torna ai report
        </Button>
      </Box>
    );
  }

  return (
    <>
      <style>
        {`
          @page {
            size: A4;
            margin: 14mm;
          }

          @media print {
            html,
            body {
              background: white !important;
            }

            .snapshot-print-toolbar {
              display: none !important;
            }

            .snapshot-print-page {
              width: auto !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .snapshot-print-section {
              break-inside: avoid;
            }

            .snapshot-print-break {
              break-before: page;
            }
          }
        `}
      </style>

      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor:
            "grey.100",
          py: 3,
        }}
      >
        <Box
          className="snapshot-print-toolbar"
          sx={{
            maxWidth: 1100,
            mx: "auto",
            px: 2,
            mb: 2,
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Button
            variant="outlined"
            startIcon={
              <ArrowBackRoundedIcon />
            }
            onClick={() =>
              navigate("/reports")
            }
          >
            Torna ai report
          </Button>

          <Button
            variant="contained"
            startIcon={
              <PrintRoundedIcon />
            }
            onClick={() =>
              window.print()
            }
          >
            Stampa / Salva PDF
          </Button>
        </Box>

        <Paper
          className="snapshot-print-page"
          elevation={0}
          sx={{
            width: "210mm",
            maxWidth:
              "calc(100vw - 32px)",
            minHeight: "297mm",
            mx: "auto",
            p: {
              xs: 3,
              md: 5,
            },
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "white",
          }}
        >
          <Box
            className="snapshot-print-section"
            sx={{
              position: "relative",
              overflow: "hidden",
              p: 4,
              mb: 3,
              borderRadius: 2,
              color: "white",
              background:
                "linear-gradient(120deg, #102844 0%, #1F4E79 58%, #3478AD 135%)",
            }}
          >
            <Typography
              variant="overline"
              sx={{
                letterSpacing:
                  "0.16em",
                color:
                  "rgba(255,255,255,0.72)",
              }}
            >
              GFO FAMILY OFFICE
            </Typography>

            <Typography
              variant="h4"
              sx={{
                mt: 1,
                fontWeight: 800,
              }}
            >
              Executive Report Archiviato
            </Typography>

            <Typography
              sx={{
                mt: 2,
                color:
                  "rgba(255,255,255,0.78)",
              }}
            >
              Patrimonio netto consolidato
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: {
                  xs: "2rem",
                  md: "2.8rem",
                },
                fontWeight: 850,
                lineHeight: 1.05,
              }}
            >
              {formatCurrency(
                snapshot.netWorth,
                snapshot.currency,
              )}
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                mt: 3,
              }}
            >
              <Chip
                label={`Generato il ${formatDateTime(
                  snapshot.generatedAt,
                )}`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={`Versione ${snapshot.version}`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={`${snapshot.availableSections}/${snapshot.totalSections} sezioni`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />
            </Box>
          </Box>

          <Box
            className="snapshot-print-section"
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm:
                  "repeat(2, minmax(0, 1fr))",
                md:
                  "repeat(4, minmax(0, 1fr))",
              },
              gap: 1.5,
              mb: 3,
            }}
          >
            {[
              [
                "Attivi lordi",
                snapshot.grossAssets,
              ],
              [
                "Passività",
                snapshot.liabilities,
              ],
              [
                "Liquidità",
                snapshot.liquidity,
              ],
              [
                "Investimenti",
                snapshot.investments,
              ],
              [
                "Immobili",
                snapshot.realEstate,
              ],
              [
                "Altri attivi",
                snapshot.otherAssets,
              ],
              [
                "Completezza",
                null,
              ],
              [
                "Stato",
                null,
              ],
            ].map(
              ([label, value]) => (
                <Paper
                  key={String(label)}
                  elevation={0}
                  sx={{
                    p: 1.7,
                    border: "1px solid",
                    borderColor:
                      "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    {label}
                  </Typography>

                  <Typography
                    variant="subtitle2"
                    sx={{
                      mt: 0.5,
                      fontWeight: 800,
                    }}
                  >
                    {label ===
                    "Completezza"
                      ? `${snapshot.completenessPercentage}%`
                      : label === "Stato"
                        ? snapshot.status ===
                          "COMPLETE"
                          ? "Completo"
                          : "Parziale"
                        : formatCurrency(
                            value as
                              | number
                              | null,
                            snapshot.currency,
                          )}
                  </Typography>
                </Paper>
              ),
            )}
          </Box>

          <Box
            className="snapshot-print-section"
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md:
                  "minmax(0, 1.25fr) minmax(280px, 0.75fr)",
              },
              gap: 2,
              mb: 3,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 0.5 }}
              >
                Asset allocation
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Distribuzione sul patrimonio
                netto archiviato.
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gap: 1.7,
                }}
              >
                {allocation.map(
                  (item) => (
                    <Box key={item.label}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 2,
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                          }}
                        >
                          {item.label}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                          }}
                        >
                          {formatCurrency(
                            item.value,
                            snapshot.currency,
                          )}{" "}
                          ·{" "}
                          {formatPercentage(
                            item.percentage,
                          )}
                        </Typography>
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={Math.min(
                          100,
                          item.percentage,
                        )}
                        sx={{
                          height: 8,
                          borderRadius: 6,
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
                p: 2.5,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 2 }}
              >
                Rischi principali
              </Typography>

              <Typography
                variant="body2"
                sx={{ fontWeight: 700 }}
              >
                Disavanzo 2027
              </Typography>

              <Typography
                variant="body2"
                color="error.main"
                sx={{ mt: 0.4 }}
              >
                {formatCurrency(
                  budget2027?.netCashFlow ??
                    null,
                  snapshot.currency,
                )}
              </Typography>

              <Divider sx={{ my: 1.7 }} />

              <Typography
                variant="body2"
                sx={{ fontWeight: 700 }}
              >
                Capitale minimo
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.4 }}
              >
                {budget
                  ? `${formatCurrency(
                      budget.longTerm
                        .minimumCapital,
                      snapshot.currency,
                    )} nel ${
                      budget.longTerm
                        .minimumCapitalYear
                    }`
                  : "—"}
              </Typography>

              <Divider sx={{ my: 1.7 }} />

              <Typography
                variant="body2"
                sx={{ fontWeight: 700 }}
              >
                LTV immobiliare
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.4 }}
              >
                {formatPercentage(
                  properties?.summary
                    .weightedLtv ?? null,
                )}
              </Typography>

              <Divider sx={{ my: 1.7 }} />

              <Typography
                variant="body2"
                sx={{ fontWeight: 700 }}
              >
                Top 5 investimenti finanziari
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.4 }}
              >
                {formatPercentage(
                  investments?.summary
                    .topFiveConcentration ??
                    null,
                )}
              </Typography>

              <Divider sx={{ my: 1.7 }} />

              <Typography
                variant="body2"
                sx={{ fontWeight: 700 }}
              >
                Liquidità in valuta estera
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.4 }}
              >
                {formatPercentage(
                  liquidity?.summary
                    .foreignCurrencyWeight ??
                    null,
                )}
              </Typography>
            </Paper>
          </Box>

          <Paper
            className="snapshot-print-section snapshot-print-break"
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2 }}
            >
              Sezioni del report conservate
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm:
                    "repeat(2, minmax(0, 1fr))",
                  md:
                    "repeat(3, minmax(0, 1fr))",
                },
                gap: 1,
              }}
            >
              {snapshot.payload
                ? Object.entries(
                    snapshot.payload
                      .sections,
                  ).map(
                    ([
                      name,
                      section,
                    ]) => (
                      <Box
                        key={name}
                        sx={{
                          p: 1.3,
                          border:
                            "1px solid",
                          borderColor:
                            "divider",
                          borderRadius: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 750,
                          }}
                        >
                          {name}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display:
                              "block",
                            mt: 0.4,
                          }}
                        >
                          {section.source}
                        </Typography>

                        <Chip
                          size="small"
                          label={
                            section.status ===
                            "AVAILABLE"
                              ? "Disponibile"
                              : "Non disponibile"
                          }
                          color={
                            section.status ===
                            "AVAILABLE"
                              ? "success"
                              : "error"
                          }
                          variant="outlined"
                          sx={{ mt: 0.8 }}
                        />
                      </Box>
                    ),
                  )
                : null}
            </Box>
          </Paper>

          <Paper
            className="snapshot-print-section"
            elevation={0}
            sx={{
              p: 2.5,
              border: "1px solid",
              borderColor:
                snapshot.checksumVerified
                  ? "success.main"
                  : "error.main",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1.2,
              }}
            >
              <VerifiedRoundedIcon
                color={
                  snapshot.checksumVerified
                    ? "success"
                    : "error"
                }
              />

              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 800 }}
              >
                Verifica di integrità
              </Typography>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Snapshot ID:{" "}
              <strong>
                {snapshot.id}
              </strong>
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.8,
                overflowWrap: "anywhere",
              }}
            >
              SHA-256:{" "}
              <strong>
                {snapshot.checksum}
              </strong>
            </Typography>

            <Typography
              variant="body2"
              color={
                snapshot.checksumVerified
                  ? "success.main"
                  : "error.main"
              }
              sx={{
                mt: 1,
                fontWeight: 800,
              }}
            >
              {snapshot.checksumVerified
                ? "Integrità del payload verificata."
                : "Verifica del checksum non superata."}
            </Typography>
          </Paper>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mt: 3,
              textAlign: "center",
            }}
          >
            GFO Platform · Family Office –
            Stefano Gresleri · Documento
            generato da una fotografia
            archiviata e immutabile.
          </Typography>
        </Paper>
      </Box>
    </>
  );
}
