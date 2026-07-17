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
  FormControlLabel,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import PolicyRoundedIcon from "@mui/icons-material/PolicyRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import {
  getIpsCompliance,
  updateIpsLimit,
  type IpsComplianceAssessment,
  type IpsComplianceResponse,
  type IpsComplianceStatus,
  type IpsUnit,
} from "../services/api";

type LimitForm = {
  minimum: string;
  maximum: string;
  target: string;
  enabled: boolean;
  rationale: string;
};

type Notice = {
  severity:
    | "success"
    | "warning"
    | "error"
    | "info";
  text: string;
};

type KpiCardProps = {
  label: string;
  value: string;
  subtitle: string;
};

const EMPTY_FORM: LimitForm = {
  minimum: "",
  maximum: "",
  target: "",
  enabled: false,
  rationale: "",
};

function euro(value: number): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function percentage(value: number): string {
  return `${value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatValue(
  value: number,
  unit: IpsUnit,
): string {
  return unit === "EUR"
    ? euro(value)
    : percentage(value);
}

function optionalValue(
  value: number | null,
  unit: IpsUnit,
): string {
  return value === null
    ? "Non definito"
    : formatValue(value, unit);
}

function parseOptionalNumber(
  value: string,
): number | null {
  const normalized =
    value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  return Number(normalized);
}

function isInvalidNumber(
  value: number | null,
): boolean {
  return (
    value !== null &&
    !Number.isFinite(value)
  );
}

function dimensionLabel(
  dimension: string,
): string {
  const labels: Record<string, string> = {
    ASSET_ALLOCATION:
      "Asset allocation",
    LEVERAGE:
      "Indebitamento",
    CONCENTRATION:
      "Concentrazione",
    CURRENCY:
      "Esposizione valutaria",
    NET_WORTH:
      "Patrimonio netto",
    LIQUIDITY:
      "Liquidità",
  };

  return labels[dimension] ?? dimension;
}

function statusLabel(
  status: IpsComplianceStatus,
): string {
  const labels: Record<
    IpsComplianceStatus,
    string
  > = {
    NOT_CONFIGURED:
      "Non configurato",
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
  status: IpsComplianceStatus,
):
  | "default"
  | "success"
  | "warning"
  | "error" {
  if (status === "COMPLIANT") {
    return "success";
  }

  if (status === "BELOW_MINIMUM") {
    return "warning";
  }

  if (status === "ABOVE_MAXIMUM") {
    return "error";
  }

  return "default";
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

export default function Ips() {
  const [data, setData] =
    useState<IpsComplianceResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [selectedLimit, setSelectedLimit] =
    useState<IpsComplianceAssessment | null>(
      null,
    );

  const [form, setForm] =
    useState<LimitForm>(EMPTY_FORM);

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
        const result =
          await getIpsCompliance();

        setData(result);
      } catch (error) {
        console.error(error);

        setNotice({
          severity: "error",
          text:
            "Impossibile caricare la conformità IPS.",
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

  const dimensions = useMemo(
    () =>
      Array.from(
        new Set(
          data?.assessments.map(
            (assessment) =>
              assessment.dimension,
          ) ?? [],
        ),
      ),
    [data],
  );

  function resetDialog() {
    setSelectedLimit(null);
    setForm(EMPTY_FORM);
    setConfirmationStep(false);
  }

  function closeDialog() {
    if (!saving) {
      resetDialog();
    }
  }

  function openLimit(
    limit: IpsComplianceAssessment,
  ) {
    setSelectedLimit(limit);

    setForm({
      minimum:
        limit.minimum === null
          ? ""
          : String(limit.minimum),

      maximum:
        limit.maximum === null
          ? ""
          : String(limit.maximum),

      target:
        limit.target === null
          ? ""
          : String(limit.target),

      enabled:
        limit.enabled,

      rationale:
        limit.rationale ?? "",
    });

    setConfirmationStep(false);
    setNotice(null);
  }

  function validateForm(): boolean {
    const minimum =
      parseOptionalNumber(
        form.minimum,
      );

    const maximum =
      parseOptionalNumber(
        form.maximum,
      );

    const target =
      parseOptionalNumber(
        form.target,
      );

    if (
      isInvalidNumber(minimum) ||
      isInvalidNumber(maximum) ||
      isInvalidNumber(target)
    ) {
      setNotice({
        severity: "warning",
        text:
          "I limiti devono essere numeri validi.",
      });

      return false;
    }

    if (
      minimum !== null &&
      maximum !== null &&
      minimum > maximum
    ) {
      setNotice({
        severity: "warning",
        text:
          "Il limite minimo non può superare il limite massimo.",
      });

      return false;
    }

    if (
      form.enabled &&
      minimum === null &&
      maximum === null &&
      target === null
    ) {
      setNotice({
        severity: "warning",
        text:
          "Per attivare il controllo occorre definire almeno un limite o un obiettivo.",
      });

      return false;
    }

    if (
      form.enabled &&
      !form.rationale.trim()
    ) {
      setNotice({
        severity: "warning",
        text:
          "Indicare il riferimento o la motivazione IPS.",
      });

      return false;
    }

    return true;
  }

  function requestConfirmation() {
    if (!validateForm()) {
      return;
    }

    setNotice(null);
    setConfirmationStep(true);
  }

  async function saveLimit() {
    if (!selectedLimit) {
      return;
    }

    const minimum =
      parseOptionalNumber(
        form.minimum,
      );

    const maximum =
      parseOptionalNumber(
        form.maximum,
      );

    const target =
      parseOptionalNumber(
        form.target,
      );

    if (
      isInvalidNumber(minimum) ||
      isInvalidNumber(maximum) ||
      isInvalidNumber(target)
    ) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      await updateIpsLimit(
        selectedLimit.code,
        {
          minimum,
          maximum,
          target,
          enabled: form.enabled,

          rationale:
            form.rationale.trim() ||
            null,
        },
      );

      resetDialog();

      setNotice({
        severity: "success",
        text:
          "Limite IPS aggiornato e conformità ricalcolata.",
      });

      await loadData();
    } catch (error) {
      console.error(error);

      setNotice({
        severity: "error",
        text:
          "Il limite IPS non è stato aggiornato.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return (
      <Box
        sx={{
          minHeight: 420,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Alert severity="error">
        Motore IPS non disponibile.
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
            <PolicyRoundedIcon
              fontSize="large"
            />
            IPS e Conformità
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.7 }}
          >
            Controllo del patrimonio rispetto
            all’Investment Policy Statement.
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
        severity="info"
        sx={{ mb: 3 }}
      >
        Nessuna soglia viene applicata
        automaticamente. Un indicatore diventa
        operativo solo dopo conferma esplicita
        dei limiti previsti dall’IPS ufficiale.
      </Alert>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs:
              "repeat(2, minmax(0, 1fr))",
            xl:
              "repeat(5, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <KpiCard
          label="Indicatori"
          value={String(
            data.summary.total,
          )}
          subtitle="Indicatori supportati"
        />

        <KpiCard
          label="Configurati"
          value={String(
            data.summary.configured,
          )}
          subtitle="Limiti IPS attivi"
        />

        <KpiCard
          label="Non configurati"
          value={String(
            data.summary.notConfigured,
          )}
          subtitle="Nessuna soglia applicata"
        />

        <KpiCard
          label="Conformi"
          value={String(
            data.summary.compliant,
          )}
          subtitle="Entro i limiti"
        />

        <KpiCard
          label="Violazioni"
          value={String(
            data.summary.breaches,
          )}
          subtitle="Fuori dai limiti IPS"
        />
      </Box>

      {dimensions.map(
        (dimension) => {
          const assessments =
            data.assessments.filter(
              (assessment) =>
                assessment.dimension ===
                dimension,
            );

          return (
            <Box
              key={dimension}
              sx={{ mb: 3 }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 1.5 }}
              >
                {dimensionLabel(
                  dimension,
                )}
              </Typography>

              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        Indicatore
                      </TableCell>

                      <TableCell align="right">
                        Valore attuale
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

                      <TableCell>
                        Riferimento IPS
                      </TableCell>

                      <TableCell align="right">
                        Azione
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {assessments.map(
                      (assessment) => (
                        <TableRow
                          key={
                            assessment.code
                          }
                          hover
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 750,
                              }}
                            >
                              {
                                assessment.label
                              }
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {
                                assessment.description
                              }
                            </Typography>
                          </TableCell>

                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 800,
                            }}
                          >
                            {formatValue(
                              assessment
                                .currentValue,
                              assessment.unit,
                            )}
                          </TableCell>

                          <TableCell align="right">
                            {optionalValue(
                              assessment.minimum,
                              assessment.unit,
                            )}
                          </TableCell>

                          <TableCell align="right">
                            {optionalValue(
                              assessment.target,
                              assessment.unit,
                            )}
                          </TableCell>

                          <TableCell align="right">
                            {optionalValue(
                              assessment.maximum,
                              assessment.unit,
                            )}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              color={statusColor(
                                assessment.status,
                              )}
                              label={statusLabel(
                                assessment.status,
                              )}
                              variant={
                                assessment.status ===
                                "NOT_CONFIGURED"
                                  ? "outlined"
                                  : "filled"
                              }
                            />
                          </TableCell>

                          <TableCell>
                            {assessment.rationale ??
                              "Non definito"}
                          </TableCell>

                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={
                                <TuneRoundedIcon />
                              }
                              onClick={() =>
                                openLimit(
                                  assessment,
                                )
                              }
                            >
                              {assessment.enabled
                                ? "Modifica"
                                : "Configura"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        },
      )}

      <Dialog
        open={selectedLimit !== null}
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {confirmationStep
            ? "Conferma limite IPS"
            : "Configura indicatore IPS"}
        </DialogTitle>

        <DialogContent>
          {!confirmationStep ? (
            <>
              <DialogContentText
                sx={{ mb: 2 }}
              >
                {selectedLimit?.label}
              </DialogContentText>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm:
                      "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 2,
                  mb: 2,
                }}
              >
                <TextField
                  label="Minimo"
                  value={form.minimum}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        minimum:
                          event.target.value,
                      }),
                    )
                  }
                />

                <TextField
                  label="Obiettivo"
                  value={form.target}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        target:
                          event.target.value,
                      }),
                    )
                  }
                />

                <TextField
                  label="Massimo"
                  value={form.maximum}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        maximum:
                          event.target.value,
                      }),
                    )
                  }
                />
              </Box>

              <TextField
                label="Riferimento o motivazione IPS"
                value={form.rationale}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      rationale:
                        event.target.value,
                    }),
                  )
                }
                multiline
                minRows={3}
                fullWidth
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={form.enabled}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          enabled:
                            event.target.checked,
                        }),
                      )
                    }
                  />
                }
                label="Attiva il controllo di conformità"
              />
            </>
          ) : (
            <>
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
              >
                Il limite verrà utilizzato nel
                controllo operativo del patrimonio.
              </Alert>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Indicatore
              </Typography>

              <Typography
                sx={{
                  fontWeight: 750,
                  mb: 2,
                }}
              >
                {selectedLimit?.label}
              </Typography>

              <Typography>
                Minimo:{" "}
                <strong>
                  {form.minimum ||
                    "non definito"}
                </strong>
              </Typography>

              <Typography>
                Obiettivo:{" "}
                <strong>
                  {form.target ||
                    "non definito"}
                </strong>
              </Typography>

              <Typography sx={{ mb: 2 }}>
                Massimo:{" "}
                <strong>
                  {form.maximum ||
                    "non definito"}
                </strong>
              </Typography>

              <Typography>
                Controllo:{" "}
                <strong>
                  {form.enabled
                    ? "attivo"
                    : "disattivato"}
                </strong>
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
                void saveLimit()
              }
            >
              {saving
                ? "Salvataggio..."
                : "Conferma limite"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
