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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Typography,
} from "@mui/material";

import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

import ReportSnapshotComparison from "./ReportSnapshotComparison";

import {
  createExecutiveReportSnapshot,
  getExecutiveReportSnapshot,
  getExecutiveReportSnapshots,
  type ExecutiveReportSnapshotDetail,
  type ExecutiveReportSnapshotSummary,
} from "../services/api";

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

export default function ReportSnapshotsPanel() {
  const [
    snapshots,
    setSnapshots,
  ] = useState<
    ExecutiveReportSnapshotSummary[]
  >([]);

  const [
    selectedSnapshot,
    setSelectedSnapshot,
  ] = useState<
    ExecutiveReportSnapshotDetail | null
  >(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    openingSnapshotId,
    setOpeningSnapshotId,
  ] = useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function loadSnapshots() {
    setLoading(true);
    setError("");

    try {
      const response =
        await getExecutiveReportSnapshots();

      setSnapshots(
        response.snapshots,
      );
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile caricare lo storico dei report.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSnapshots();
  }, []);

  async function saveSnapshot() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await createExecutiveReportSnapshot();

      setSuccess(
        response.duplicate
          ? "Questa fotografia era già presente nell’archivio."
          : "Fotografia del report salvata nell’archivio storico.",
      );

      await loadSnapshots();

      const detail =
        await getExecutiveReportSnapshot(
          response.snapshot.id,
        );

      setSelectedSnapshot(detail);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile salvare la fotografia del report.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function openSnapshot(
    snapshotId: string,
  ) {
    setOpeningSnapshotId(
      snapshotId,
    );
    setError("");

    try {
      const detail =
        await getExecutiveReportSnapshot(
          snapshotId,
        );

      setSelectedSnapshot(detail);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile aprire il report archiviato.",
      );
    } finally {
      setOpeningSnapshotId(null);
    }
  }

  return (
    <>
      <Paper
        className="report-section"
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
            }}
          >
            <HistoryRoundedIcon
              color="primary"
            />

            <Box>
              <Typography
                variant="h6"
              >
                Archivio storico dei report
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.3 }}
              >
                Fotografie immutabili e
                verificabili del patrimonio.
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress
                  size={17}
                  color="inherit"
                />
              ) : (
                <SaveRoundedIcon />
              )
            }
            onClick={() =>
              void saveSnapshot()
            }
            disabled={saving}
          >
            {saving
              ? "Salvataggio..."
              : "Salva fotografia"}
          </Button>
        </Box>

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
          >
            {success}
          </Alert>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {!loading && (
          <ReportSnapshotComparison
            snapshots={snapshots}
          />
        )}

        {loading ? (
          <Box
            sx={{
              minHeight: 100,
              display: "grid",
              placeItems: "center",
            }}
          >
            <CircularProgress size={28} />
          </Box>
        ) : snapshots.length === 0 ? (
          <Alert severity="info">
            Non sono ancora presenti
            fotografie storiche.
          </Alert>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 1.4,
            }}
          >
            {snapshots.map(
              (snapshot) => (
                <Paper
                  key={snapshot.id}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor:
                      "divider",
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md:
                        "minmax(220px, 1fr) minmax(180px, 0.7fr) auto",
                    },
                    gap: 2,
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 800,
                      }}
                    >
                      Report del{" "}
                      {formatDateTime(
                        snapshot.generatedAt,
                      )}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.4 }}
                    >
                      Versione{" "}
                      {snapshot.version} ·{" "}
                      {snapshot.availableSections}/
                      {snapshot.totalSections} sezioni
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Patrimonio netto
                    </Typography>

                    <Typography
                      variant="subtitle2"
                      sx={{
                        mt: 0.2,
                        fontWeight: 800,
                      }}
                    >
                      {formatCurrency(
                        snapshot.netWorth,
                        snapshot.currency,
                      )}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Chip
                      size="small"
                      label={
                        snapshot.status ===
                        "COMPLETE"
                          ? "Completo"
                          : "Parziale"
                      }
                      color={
                        snapshot.status ===
                        "COMPLETE"
                          ? "success"
                          : "warning"
                      }
                      variant="outlined"
                    />

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        <PrintRoundedIcon />
                      }
                      onClick={() => {
                        window.open(
                          `/reports/snapshots/${snapshot.id}/print`,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      PDF
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        openingSnapshotId ===
                        snapshot.id ? (
                          <CircularProgress
                            size={15}
                            color="inherit"
                          />
                        ) : (
                          <OpenInNewRoundedIcon />
                        )
                      }
                      disabled={
                        openingSnapshotId ===
                        snapshot.id
                      }
                      onClick={() =>
                        void openSnapshot(
                          snapshot.id,
                        )
                      }
                    >
                      Apri
                    </Button>
                  </Box>
                </Paper>
              ),
            )}
          </Box>
        )}
      </Paper>

      <Dialog
        open={
          selectedSnapshot !== null
        }
        onClose={() =>
          setSelectedSnapshot(null)
        }
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Report executive archiviato
        </DialogTitle>

        <DialogContent>
          {selectedSnapshot && (
            <Box sx={{ pt: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: {
                    xs: "flex-start",
                    sm: "center",
                  },
                  flexDirection: {
                    xs: "column",
                    sm: "row",
                  },
                  gap: 1.5,
                  mb: 3,
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                    }}
                  >
                    {formatCurrency(
                      selectedSnapshot.netWorth,
                      selectedSnapshot.currency,
                    )}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.4 }}
                  >
                    Generato il{" "}
                    {formatDateTime(
                      selectedSnapshot.generatedAt,
                    )}
                  </Typography>
                </Box>

                <Chip
                  icon={
                    <VerifiedRoundedIcon />
                  }
                  label={
                    selectedSnapshot
                      .checksumVerified
                      ? "Checksum verificato"
                      : "Checksum non valido"
                  }
                  color={
                    selectedSnapshot
                      .checksumVerified
                      ? "success"
                      : "error"
                  }
                />
              </Box>

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
                  gap: 2,
                }}
              >
                {[
                  [
                    "Attivi lordi",
                    selectedSnapshot
                      .grossAssets,
                  ],
                  [
                    "Passività",
                    selectedSnapshot
                      .liabilities,
                  ],
                  [
                    "Liquidità",
                    selectedSnapshot
                      .liquidity,
                  ],
                  [
                    "Investimenti",
                    selectedSnapshot
                      .investments,
                  ],
                  [
                    "Immobili",
                    selectedSnapshot
                      .realEstate,
                  ],
                  [
                    "Altri attivi",
                    selectedSnapshot
                      .otherAssets,
                  ],
                ].map(
                  ([label, value]) => (
                    <Paper
                      key={String(label)}
                      elevation={0}
                      sx={{
                        p: 1.8,
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
                          mt: 0.4,
                          fontWeight: 800,
                        }}
                      >
                        {formatCurrency(
                          value as
                            | number
                            | null,
                          selectedSnapshot
                            .currency,
                        )}
                      </Typography>
                    </Paper>
                  ),
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography
                variant="subtitle1"
                sx={{
                  mb: 1.5,
                  fontWeight: 800,
                }}
              >
                Sezioni conservate
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                {selectedSnapshot.payload
                  ? Object.entries(
                      selectedSnapshot
                        .payload.sections,
                    ).map(
                      ([
                        name,
                        section,
                      ]) => (
                        <Chip
                          key={name}
                          size="small"
                          label={name}
                          color={
                            section.status ===
                            "AVAILABLE"
                              ? "success"
                              : "error"
                          }
                          variant="outlined"
                        />
                      ),
                    )
                  : (
                    <Typography
                      color="text.secondary"
                    >
                      Payload non disponibile.
                    </Typography>
                  )}
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 3,
                  overflowWrap:
                    "anywhere",
                }}
              >
                SHA-256:{" "}
                {selectedSnapshot.checksum}
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setSelectedSnapshot(null)
            }
          >
            Chiudi
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
