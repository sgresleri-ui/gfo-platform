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
  TextField,
  Typography,
} from "@mui/material";

import EditLocationAltRoundedIcon from "@mui/icons-material/EditLocationAltRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

import {
  getDataQualityCorrections,
  updatePositionCountry,
  type DataQualityCorrectionRecord,
  type DataQualityItem,
} from "../services/api";

type DataQualityCorrectionsProps = {
  items: DataQualityItem[];
  onCorrectionSaved: () => void;
};

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

function sourceLabel(
  source: string,
): string {
  if (source === "USER_CONFIRMED") {
    return "Conferma manuale";
  }

  return source;
}

export default function DataQualityCorrections({
  items,
  onCorrectionSaved,
}: DataQualityCorrectionsProps) {
  const [corrections, setCorrections] =
    useState<DataQualityCorrectionRecord[]>(
      [],
    );

  const [historyLoading, setHistoryLoading] =
    useState(true);

  const [selectedItem, setSelectedItem] =
    useState<DataQualityItem | null>(null);

  const [country, setCountry] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [confirmationStep, setConfirmationStep] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [notice, setNotice] =
    useState<{
      severity:
        | "success"
        | "error"
        | "warning";
      text: string;
    } | null>(null);

  const missingCountryItems =
    useMemo(
      () =>
        items.filter(
          (item) =>
            item.countryMissing,
        ),
      [items],
    );

  const loadHistory = useCallback(
    async () => {
      setHistoryLoading(true);

      try {
        const result =
          await getDataQualityCorrections();

        setCorrections(
          result.corrections,
        );
      } catch (error) {
        console.error(error);

        setNotice({
          severity: "error",
          text:
            "Impossibile caricare lo storico delle correzioni.",
        });
      } finally {
        setHistoryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  function openCorrection(
    item: DataQualityItem,
  ) {
    setSelectedItem(item);
    setCountry(
      item.country ?? "",
    );
    setReason("");
    setConfirmationStep(false);
    setNotice(null);
  }

  function closeCorrection() {
    if (saving) {
      return;
    }

    setSelectedItem(null);
    setCountry("");
    setReason("");
    setConfirmationStep(false);
  }

  function requestConfirmation() {
    if (!country.trim()) {
      setNotice({
        severity: "warning",
        text:
          "Indicare il Paese della posizione.",
      });

      return;
    }

    if (!reason.trim()) {
      setNotice({
        severity: "warning",
        text:
          "Indicare la motivazione della correzione.",
      });

      return;
    }

    setNotice(null);
    setConfirmationStep(true);
  }

  async function saveCorrection() {
    if (!selectedItem) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      await updatePositionCountry(
        selectedItem.id,
        country.trim(),
        reason.trim(),
      );

      closeCorrection();

      setNotice({
        severity: "success",
        text:
          "Paese aggiornato. La modifica è stata registrata nell’audit trail.",
      });

      await loadHistory();
      onCorrectionSaved();
    } catch (error) {
      console.error(error);

      setNotice({
        severity: "error",
        text:
          "La correzione non è stata salvata.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography
        variant="h5"
        sx={{
          mb: 0.6,
          fontWeight: 800,
        }}
      >
        Correzioni controllate
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Completamento manuale dei dati con
        conferma e storico permanente.
      </Typography>

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

      <Paper
        elevation={0}
        sx={{
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6">
            Paesi da completare
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            {missingCountryItems.length} posizioni
            richiedono l’indicazione del Paese.
          </Typography>
        </Box>

        {missingCountryItems.length === 0 ? (
          <Alert
            severity="success"
            sx={{ m: 2.5, mt: 0 }}
          >
            Tutte le posizioni hanno un Paese
            associato.
          </Alert>
        ) : (
          <TableContainer
            sx={{ maxHeight: 520 }}
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
                    Fonte
                  </TableCell>

                  <TableCell align="right">
                    Azione
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {missingCountryItems.map(
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
                        {item.category}
                      </TableCell>

                      <TableCell>
                        {item.source}
                      </TableCell>

                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={
                            <EditLocationAltRoundedIcon />
                          }
                          onClick={() =>
                            openCorrection(
                              item,
                            )
                          }
                        >
                          Correggi Paese
                        </Button>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: 2.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <HistoryRoundedIcon />

          <Box>
            <Typography variant="h6">
              Storico delle correzioni
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              {corrections.length} modifiche
              registrate.
            </Typography>
          </Box>
        </Box>

        {historyLoading ? (
          <Box
            sx={{
              p: 4,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <CircularProgress size={28} />
          </Box>
        ) : corrections.length === 0 ? (
          <Alert
            severity="info"
            sx={{ m: 2.5, mt: 0 }}
          >
            Non sono ancora state effettuate
            correzioni.
          </Alert>
        ) : (
          <TableContainer
            sx={{ maxHeight: 500 }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>
                    Data
                  </TableCell>

                  <TableCell>
                    Posizione
                  </TableCell>

                  <TableCell>
                    Campo
                  </TableCell>

                  <TableCell>
                    Valore precedente
                  </TableCell>

                  <TableCell>
                    Nuovo valore
                  </TableCell>

                  <TableCell>
                    Motivazione
                  </TableCell>

                  <TableCell>
                    Fonte
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {corrections.map(
                  (correction) => (
                    <TableRow
                      key={correction.id}
                      hover
                    >
                      <TableCell>
                        {dateTimeLabel(
                          correction.createdAt,
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily:
                              "monospace",
                          }}
                        >
                          {correction.entityCode ??
                            correction.entityId}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            correction.fieldName ===
                            "country"
                              ? "Paese"
                              : correction.fieldName
                          }
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        {correction.oldValue ??
                          "Non specificato"}
                      </TableCell>

                      <TableCell
                        sx={{ fontWeight: 750 }}
                      >
                        {correction.newValue}
                      </TableCell>

                      <TableCell>
                        {correction.reason}
                      </TableCell>

                      <TableCell>
                        {sourceLabel(
                          correction.source,
                        )}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={selectedItem !== null}
        onClose={closeCorrection}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {confirmationStep
            ? "Conferma la correzione"
            : "Correggi il Paese"}
        </DialogTitle>

        <DialogContent>
          {!confirmationStep ? (
            <>
              <DialogContentText
                sx={{ mb: 2 }}
              >
                Posizione:{" "}
                <strong>
                  {selectedItem?.name}
                </strong>
              </DialogContentText>

              <TextField
                label="Paese"
                value={country}
                onChange={(event) =>
                  setCountry(
                    event.target.value,
                  )
                }
                fullWidth
                required
                autoFocus
                sx={{ mb: 2 }}
                slotProps={{
                  htmlInput: {
                    maxLength: 80,
                  },
                }}
              />

              <TextField
                label="Motivazione"
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value,
                  )
                }
                multiline
                minRows={3}
                fullWidth
                required
                slotProps={{
                  htmlInput: {
                    maxLength: 500,
                  },
                }}
              />
            </>
          ) : (
            <>
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
              >
                La modifica aggiornerà il dato
                corrente e creerà una registrazione
                permanente nell’audit trail.
              </Alert>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Posizione
              </Typography>

              <Typography
                sx={{
                  mb: 2,
                  fontWeight: 750,
                }}
              >
                {selectedItem?.name}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Valore precedente
              </Typography>

              <Typography sx={{ mb: 2 }}>
                {selectedItem?.country ??
                  "Non specificato"}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Nuovo Paese
              </Typography>

              <Typography
                sx={{
                  mb: 2,
                  fontWeight: 800,
                }}
              >
                {country.trim()}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Motivazione
              </Typography>

              <Typography>
                {reason.trim()}
              </Typography>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            disabled={saving}
            onClick={
              confirmationStep
                ? () =>
                    setConfirmationStep(
                      false,
                    )
                : closeCorrection
            }
          >
            {confirmationStep
              ? "Indietro"
              : "Annulla"}
          </Button>

          {!confirmationStep ? (
            <Button
              variant="contained"
              onClick={
                requestConfirmation
              }
            >
              Continua
            </Button>
          ) : (
            <Button
              variant="contained"
              color="warning"
              disabled={saving}
              onClick={() =>
                void saveCorrection()
              }
            >
              {saving
                ? "Salvataggio..."
                : "Conferma correzione"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
