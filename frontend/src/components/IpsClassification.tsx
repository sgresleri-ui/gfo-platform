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
  MenuItem,
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

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  getIpsClassificationAudit,
  getIpsClassifications,
  updateIpsPositionClassification,
  type IpsAllocationStatus,
  type IpsAssetClassCode,
  type IpsClassificationAudit,
  type IpsClassificationItem,
  type IpsClassificationOverviewResponse,
} from "../services/api";

type Notice = {
  severity:
    | "success"
    | "warning"
    | "error"
    | "info";
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

function percentage(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

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

function confidenceLabel(
  confidence:
    | "HIGH"
    | "MEDIUM"
    | null,
): string {
  if (confidence === "HIGH") {
    return "Confidenza alta";
  }

  if (confidence === "MEDIUM") {
    return "Da verificare";
  }

  return "Nessun suggerimento";
}

function confidenceColor(
  confidence:
    | "HIGH"
    | "MEDIUM"
    | null,
): "success" | "warning" | "default" {
  if (confidence === "HIGH") {
    return "success";
  }

  if (confidence === "MEDIUM") {
    return "warning";
  }

  return "default";
}

function statusLabel(
  status: IpsAllocationStatus,
): string {
  const labels: Record<
    IpsAllocationStatus,
    string
  > = {
    DATA_INCOMPLETE:
      "Dati incompleti",
    NOT_APPLICABLE:
      "Fuori perimetro",
    COMPLIANT:
      "Conforme",
    BELOW_MINIMUM:
      "Sotto il minimo",
    ABOVE_MAXIMUM:
      "Sopra il massimo",
  };

  return labels[status];
}

function statusColor(
  status: IpsAllocationStatus,
):
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info" {
  if (status === "COMPLIANT") {
    return "success";
  }

  if (status === "BELOW_MINIMUM") {
    return "warning";
  }

  if (status === "ABOVE_MAXIMUM") {
    return "error";
  }

  if (status === "DATA_INCOMPLETE") {
    return "info";
  }

  return "default";
}

export default function IpsClassification() {
  const [data, setData] =
    useState<IpsClassificationOverviewResponse | null>(
      null,
    );

  const [audits, setAudits] =
    useState<IpsClassificationAudit[]>(
      [],
    );

  const [loading, setLoading] =
    useState(true);

  const [selectedItem, setSelectedItem] =
    useState<IpsClassificationItem | null>(
      null,
    );

  const [selectedClass, setSelectedClass] =
    useState<IpsAssetClassCode | "">("");

  const [reason, setReason] =
    useState("");

  const [
    confirmationStep,
    setConfirmationStep,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const loadData = useCallback(
    async () => {
      setLoading(true);

      try {
        const [
          overview,
          auditResult,
        ] = await Promise.all([
          getIpsClassifications(),
          getIpsClassificationAudit(),
        ]);

        setData(overview);
        setAudits(auditResult.audits);
      } catch (error) {
        console.error(error);

        setNotice({
          severity: "error",
          text:
            "Impossibile caricare la classificazione IPS.",
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

  const classLabels = useMemo(
    () =>
      new Map(
        data?.allocation.map(
          (item) => [
            item.code,
            item.label,
          ],
        ) ?? [],
      ),
    [data],
  );

  const sortedItems = useMemo(
    () =>
      [...(data?.items ?? [])].sort(
        (left, right) => {
          if (
            left.ipsAssetClass === null &&
            right.ipsAssetClass !== null
          ) {
            return -1;
          }

          if (
            left.ipsAssetClass !== null &&
            right.ipsAssetClass === null
          ) {
            return 1;
          }

          return (
            right.valueBase -
            left.valueBase
          );
        },
      ),
    [data],
  );

  function openDialog(
    item: IpsClassificationItem,
    useSuggestion = false,
  ) {
    setSelectedItem(item);

    setSelectedClass(
      useSuggestion
        ? item.suggestedClass ?? ""
        : item.ipsAssetClass ?? "",
    );

    setReason(
      useSuggestion
        ? item.suggestionReason ?? ""
        : "",
    );

    setConfirmationStep(false);
    setNotice(null);
  }

  function resetDialog() {
    setSelectedItem(null);
    setSelectedClass("");
    setReason("");
    setConfirmationStep(false);
  }

  function closeDialog() {
    if (!saving) {
      resetDialog();
    }
  }

  function requestConfirmation() {
    if (!selectedClass) {
      setNotice({
        severity: "warning",
        text:
          "Selezionare una classe patrimoniale IPS.",
      });

      return;
    }

    if (!reason.trim()) {
      setNotice({
        severity: "warning",
        text:
          "Indicare la motivazione della classificazione.",
      });

      return;
    }

    setNotice(null);
    setConfirmationStep(true);
  }

  async function saveClassification() {
    if (
      !selectedItem ||
      !selectedClass
    ) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      await updateIpsPositionClassification(
        selectedItem.positionId,
        selectedClass,
        reason.trim(),
      );

      resetDialog();

      setNotice({
        severity: "success",
        text:
          "Classificazione IPS salvata e registrata nell’audit trail.",
      });

      await loadData();
    } catch (error) {
      console.error(error);

      setNotice({
        severity: "error",
        text:
          "La classificazione non è stata salvata.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 5,
          mt: 4,
          display: "flex",
          justifyContent: "center",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <CircularProgress />
      </Paper>
    );
  }

  if (!data) {
    return (
      <Alert
        severity="error"
        sx={{ mt: 4 }}
      >
        Classificazione IPS non disponibile.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 5 }}>
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
          mb: 2,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800 }}
          >
            Asset Allocation IPS
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Classificazione del portafoglio
            finanziario strategico.
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

      <Alert
        severity={
          data.summary
            .complianceAvailable
            ? "success"
            : "info"
        }
        sx={{ mb: 3 }}
      >
        {data.summary
          .complianceAvailable
          ? "Tutte le posizioni finanziarie sono classificate. Il controllo dell’asset allocation strategica è disponibile."
          : `La conformità strategica resterà sospesa finché non saranno classificate le ${data.summary.unclassifiedPositions} posizioni mancanti.`}
      </Alert>

      {data.summary.suggestedPositions > 0 && (
        <Alert
          severity="info"
          icon={<AutoAwesomeRoundedIcon />}
          sx={{ mb: 3 }}
        >
          Il motore ha individuato{" "}
          <strong>
            {data.summary.suggestedPositions}
          </strong>{" "}
          possibili classificazioni. Sono
          indicazioni preliminari e non vengono
          applicate automaticamente.
        </Alert>
      )}

      <Paper
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
          sx={{ mb: 0.5 }}
        >
          {data.policy.name}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
        >
          Denominatore:{" "}
          <strong>
            {data.policy.denominator}
          </strong>
          . {data.policy.note}
        </Typography>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs:
              "repeat(2, minmax(0, 1fr))",
            xl:
              "repeat(7, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          {
            label: "Posizioni",
            value: data.summary.positions,
          },
          {
            label: "Classificate",
            value:
              data.summary
                .classifiedPositions,
          },
          {
            label: "Da classificare",
            value:
              data.summary
                .unclassifiedPositions,
          },
          {
            label: "Con suggerimento",
            value:
              data.summary
                .suggestedPositions,
          },
          {
            label: "Copertura",
            value: percentage(
              data.summary
                .coveragePercentage,
            ),
          },
          {
            label: "Portafoglio strategico",
            value: euro(
              data.summary.strategicValue,
            ),
          },
          {
            label: "Liquidità operativa",
            value: euro(
              data.summary
                .operatingCashValue,
            ),
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
              variant="h6"
              sx={{
                mt: 0.7,
                fontWeight: 800,
              }}
            >
              {item.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Typography
        variant="h6"
        sx={{ mb: 1.5 }}
      >
        Allocazione strategica
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
                Classe IPS
              </TableCell>
              <TableCell align="right">
                Valore
              </TableCell>
              <TableCell align="right">
                Peso
              </TableCell>
              <TableCell align="right">
                Minimo
              </TableCell>
              <TableCell align="right">
                Obiettivo
              </TableCell>
              <TableCell align="right">
                Massimo
              </TableCell>
              <TableCell>
                Stato
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.allocation.map(
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
                      {item.label}
                    </Typography>

                    {!item.strategic && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Esclusa dal denominatore
                        strategico
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="right">
                    {euro(item.value)}
                  </TableCell>

                  <TableCell align="right">
                    {percentage(
                      item.weight,
                    )}
                  </TableCell>

                  <TableCell align="right">
                    {percentage(
                      item.minimum,
                    )}
                  </TableCell>

                  <TableCell align="right">
                    {percentage(
                      item.target,
                    )}
                  </TableCell>

                  <TableCell align="right">
                    {percentage(
                      item.maximum,
                    )}
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
                      variant={
                        item.status ===
                        "DATA_INCOMPLETE"
                          ? "outlined"
                          : "filled"
                      }
                    />
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
        Posizioni finanziarie
      </Typography>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          maxHeight: 680,
          mb: 3,
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
              <TableCell align="right">
                Valore
              </TableCell>
              <TableCell>
                Classe IPS
              </TableCell>
              <TableCell>
                Suggerimento
              </TableCell>
              <TableCell>
                Motivazione
              </TableCell>
              <TableCell align="right">
                Azione
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedItems.map(
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

                  <TableCell align="right">
                    {euro(item.valueBase)}
                  </TableCell>

                  <TableCell>
                    {item.ipsAssetClass ? (
                      <Chip
                        size="small"
                        color="success"
                        label={
                          classLabels.get(
                            item.ipsAssetClass,
                          ) ??
                          item.ipsAssetClass
                        }
                      />
                    ) : (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label="Da classificare"
                      />
                    )}
                  </TableCell>

                  <TableCell>
                    {item.suggestedClass ? (
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 750,
                          }}
                        >
                          {classLabels.get(
                            item.suggestedClass,
                          ) ??
                            item.suggestedClass}
                        </Typography>

                        <Chip
                          size="small"
                          color={confidenceColor(
                            item.suggestionConfidence,
                          )}
                          variant="outlined"
                          label={confidenceLabel(
                            item.suggestionConfidence,
                          )}
                          sx={{ mt: 0.6 }}
                        />
                      </Box>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  <TableCell>
                    {item.rationale ?? "—"}
                  </TableCell>

                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        item.suggestedClass &&
                        !item.ipsAssetClass ? (
                          <AutoAwesomeRoundedIcon />
                        ) : (
                          <EditRoundedIcon />
                        )
                      }
                      onClick={() =>
                        openDialog(
                          item,
                          Boolean(
                            item.suggestedClass &&
                              !item.ipsAssetClass,
                          ),
                        )
                      }
                    >
                      {item.ipsAssetClass
                        ? "Modifica"
                        : item.suggestedClass
                          ? "Valuta suggerimento"
                          : "Classifica"}
                    </Button>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
            gap: 1,
            alignItems: "center",
          }}
        >
          <HistoryRoundedIcon />

          <Box>
            <Typography variant="h6">
              Storico classificazioni
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              {audits.length} modifiche
              registrate.
            </Typography>
          </Box>
        </Box>

        {audits.length === 0 ? (
          <Alert
            severity="info"
            sx={{ m: 2.5, mt: 0 }}
          >
            Nessuna classificazione ancora
            registrata.
          </Alert>
        ) : (
          <TableContainer
            sx={{ maxHeight: 400 }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Posizione</TableCell>
                  <TableCell>
                    Classe precedente
                  </TableCell>
                  <TableCell>
                    Nuova classe
                  </TableCell>
                  <TableCell>
                    Motivazione
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {audits.map(
                  (audit) => (
                    <TableRow
                      key={audit.id}
                      hover
                    >
                      <TableCell>
                        {dateTimeLabel(
                          audit.createdAt,
                        )}
                      </TableCell>

                      <TableCell
                        sx={{
                          fontFamily:
                            "monospace",
                        }}
                      >
                        {audit.positionCode}
                      </TableCell>

                      <TableCell>
                        {audit.oldClass
                          ? classLabels.get(
                              audit.oldClass,
                            ) ??
                            audit.oldClass
                          : "Non classificata"}
                      </TableCell>

                      <TableCell>
                        {classLabels.get(
                          audit.newClass,
                        ) ??
                          audit.newClass}
                      </TableCell>

                      <TableCell>
                        {audit.reason}
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
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {confirmationStep
            ? "Conferma classificazione"
            : "Classifica posizione"}
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
                select
                label="Classe patrimoniale IPS"
                value={selectedClass}
                onChange={(event) =>
                  setSelectedClass(
                    event.target.value as
                      | IpsAssetClassCode
                      | "",
                  )
                }
                fullWidth
                required
                sx={{ mb: 2 }}
              >
                {data.allocation.map(
                  (item) => (
                    <MenuItem
                      key={item.code}
                      value={item.code}
                    >
                      {item.label}
                    </MenuItem>
                  ),
                )}
              </TextField>

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
              />
            </>
          ) : (
            <>
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
              >
                La classificazione verrà
                utilizzata nel controllo
                dell’asset allocation IPS e
                registrata nello storico.
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
                Classe selezionata
              </Typography>

              <Typography
                sx={{
                  mb: 2,
                  fontWeight: 800,
                }}
              >
                {selectedClass
                  ? classLabels.get(
                      selectedClass,
                    ) ??
                    selectedClass
                  : "—"}
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
                : closeDialog
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
                void saveClassification()
              }
            >
              {saving
                ? "Salvataggio..."
                : "Conferma classificazione"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
