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
  IconButton,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import PlanningScenarioArchive from "./PlanningScenarioArchive";

import {
  getPlanningScenarioBaseline,
  simulatePlanningScenario,
  type PlanningScenarioBaselineResponse,
  type PlanningScenarioResponse,
  type SimulatePlanningScenarioInput,
} from "../services/api";

type ScenarioForm = {
  name: string;
  description: string;
  initialCapitalAdjustment: string;
  annualReturnAdjustmentPct: string;
  annualCostAdjustmentPct: string;
  annualRevenueAdjustmentPct: string;
  expenseInflationDeltaPct: string;
};

type ScenarioEventDraft = {
  id: string;
  year: string;
  label: string;
  amount: string;
  category: string;
};

const DEFAULT_FORM: ScenarioForm = {
  name: "Scenario personalizzato",
  description: "",
  initialCapitalAdjustment: "0",
  annualReturnAdjustmentPct: "0",
  annualCostAdjustmentPct: "0",
  annualRevenueAdjustmentPct: "0",
  expenseInflationDeltaPct: "0",
};

function parseNumber(
  value: string,
): number {
  const normalized = value
    .trim()
    .replace(",", ".");

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function formatCurrency(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString(
    "it-IT",
    {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function formatCompactCurrency(
  value: number,
): string {
  return value.toLocaleString(
    "it-IT",
    {
      notation: "compact",
      maximumFractionDigits: 1,
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}%`;
}

function formatSignedCurrency(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  const absoluteValue =
    Math.abs(value).toLocaleString(
      "it-IT",
      {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );

  if (value > 0) {
    return `+${absoluteValue}`;
  }

  if (value < 0) {
    return `−${absoluteValue}`;
  }

  return absoluteValue;
}

export default function PlanningScenarioPanel() {
  const [
    baseline,
    setBaseline,
  ] = useState<
    PlanningScenarioBaselineResponse | null
  >(null);

  const [
    result,
    setResult,
  ] = useState<
    PlanningScenarioResponse | null
  >(null);

  const [form, setForm] =
    useState<ScenarioForm>(
      DEFAULT_FORM,
    );

  const [events, setEvents] =
    useState<
      ScenarioEventDraft[]
    >([]);

  const [
    loadingBaseline,
    setLoadingBaseline,
  ] = useState(true);

  const [
    simulating,
    setSimulating,
  ] = useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    getPlanningScenarioBaseline()
      .then((response) => {
        if (active) {
          setBaseline(response);
        }
      })
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile caricare la baseline ufficiale.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingBaseline(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const chartData = useMemo(
    () =>
      result?.years.map(
        (year) => ({
          year: year.year,
          baseline:
            year.baseline
              .capitalEnd,
          scenario:
            year.scenario
              .capitalEnd,
        }),
      ) ?? [],
    [result],
  );

  function updateForm(
    field: keyof ScenarioForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function addEvent() {
    const defaultYear =
      baseline?.budget.longTerm
        .startYear ?? 2027;

    setEvents((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        year:
          String(defaultYear),
        label: "",
        amount: "0",
        category:
          "EXTRAORDINARY",
      },
    ]);
  }

  function updateEvent(
    id: string,
    field:
      | "year"
      | "label"
      | "amount"
      | "category",
    value: string,
  ) {
    setEvents((current) =>
      current.map((event) =>
        event.id === id
          ? {
              ...event,
              [field]: value,
            }
          : event,
      ),
    );
  }

  function removeEvent(
    id: string,
  ) {
    setEvents((current) =>
      current.filter(
        (event) =>
          event.id !== id,
      ),
    );
  }

  function resetScenario() {
    setForm(DEFAULT_FORM);
    setEvents([]);
    setResult(null);
    setError("");
  }

  async function runScenario() {
    setSimulating(true);
    setError("");

    try {
      const invalidEvent =
        events.find(
          (event) =>
            !event.label.trim() ||
            !Number.isInteger(
              Number(event.year),
            ) ||
            !Number.isFinite(
              parseNumber(
                event.amount,
              ),
            ),
        );

      if (invalidEvent) {
        setError(
          "Completa correttamente tutti gli eventi straordinari.",
        );
        return;
      }

      const input: SimulatePlanningScenarioInput =
        {
          name:
            form.name.trim() ||
            "Scenario personalizzato",

          description:
            form.description.trim(),

          initialCapitalAdjustment:
            parseNumber(
              form.initialCapitalAdjustment,
            ),

          annualReturnAdjustmentPct:
            parseNumber(
              form.annualReturnAdjustmentPct,
            ),

          annualCostAdjustmentPct:
            parseNumber(
              form.annualCostAdjustmentPct,
            ),

          annualRevenueAdjustmentPct:
            parseNumber(
              form.annualRevenueAdjustmentPct,
            ),

          expenseInflationDeltaPct:
            parseNumber(
              form.expenseInflationDeltaPct,
            ),

          events: events.map(
            (event) => ({
              year: Number(
                event.year,
              ),

              label:
                event.label.trim(),

              amount:
                parseNumber(
                  event.amount,
                ),

              category:
                event.category,
            }),
          ),
        };

      const response =
        await simulatePlanningScenario(
          input,
        );

      setResult(response);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile calcolare lo scenario. Controlla i valori inseriti.",
      );
    } finally {
      setSimulating(false);
    }
  }


  function loadStoredScenario(
    assumptions:
      SimulatePlanningScenarioInput,
    storedResult:
      PlanningScenarioResponse | null,
  ) {
    setForm({
      name:
        assumptions.name ??
        "Scenario personalizzato",

      description:
        assumptions.description ??
        "",

      initialCapitalAdjustment:
        String(
          assumptions
            .initialCapitalAdjustment ??
            0,
        ),

      annualReturnAdjustmentPct:
        String(
          assumptions
            .annualReturnAdjustmentPct ??
            0,
        ),

      annualCostAdjustmentPct:
        String(
          assumptions
            .annualCostAdjustmentPct ??
            0,
        ),

      annualRevenueAdjustmentPct:
        String(
          assumptions
            .annualRevenueAdjustmentPct ??
            0,
        ),

      expenseInflationDeltaPct:
        String(
          assumptions
            .expenseInflationDeltaPct ??
            0,
        ),
    });

    setEvents(
      (assumptions.events ?? []).map(
        (event, index) => ({
          id:
            `stored-${Date.now()}-${index}`,

          year:
            String(event.year),

          label:
            event.label,

          amount:
            String(event.amount),

          category:
            event.category ??
            "EXTRAORDINARY",
        }),
      ),
    );

    setResult(storedResult);
    setError("");
  }

  const statusColor =
    result?.summary.status ===
    "SUSTAINABLE"
      ? "success"
      : result?.summary.status ===
          "AT_RISK"
        ? "warning"
        : "error";

  const statusLabel =
    result?.summary.status ===
    "SUSTAINABLE"
      ? "Sostenibile"
      : result?.summary.status ===
          "AT_RISK"
        ? "A rischio"
        : "Non sostenibile";

  if (loadingBaseline) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          minHeight: 160,
          display: "grid",
          placeItems: "center",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: {
          xs: 2.5,
          md: 3.5,
        },
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
            gap: 1.3,
            alignItems: "center",
          }}
        >
          <ScienceRoundedIcon
            color="primary"
          />

          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
              }}
            >
              Scenario Lab
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.3 }}
            >
              Simulazioni patrimoniali
              senza modificare i dati
              ufficiali.
            </Typography>
          </Box>
        </Box>

        <Chip
          icon={<LockRoundedIcon />}
          label="Baseline bloccata"
          color="success"
          variant="outlined"
        />
      </Box>

      {baseline && (
        <Alert
          severity="info"
          icon={<LockRoundedIcon />}
          sx={{ mb: 2.5 }}
        >
          La baseline ufficiale deriva da{" "}
          <strong>
            {baseline.source.workbook}
          </strong>
          , con orizzonte{" "}
          {
            baseline.budget.longTerm
              .startYear
          }
          –
          {
            baseline.budget.longTerm
              .endYear
          }
          . Le simulazioni non modificano
          Excel o database.
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2.5 }}
        >
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md:
              "repeat(2, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <TextField
          label="Nome scenario"
          value={form.name}
          onChange={(event) =>
            updateForm(
              "name",
              event.target.value,
            )
          }
          fullWidth
        />

        <TextField
          label="Descrizione"
          value={
            form.description
          }
          onChange={(event) =>
            updateForm(
              "description",
              event.target.value,
            )
          }
          fullWidth
        />
      </Box>

      <Typography
        variant="subtitle1"
        sx={{
          mt: 3,
          mb: 1.5,
          fontWeight: 800,
        }}
      >
        Ipotesi rispetto alla baseline
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm:
              "repeat(2, minmax(0, 1fr))",
            xl:
              "repeat(5, minmax(0, 1fr))",
          },
          gap: 1.5,
        }}
      >
        <TextField
          label="Rettifica capitale iniziale"
          type="number"
          value={
            form.initialCapitalAdjustment
          }
          onChange={(event) =>
            updateForm(
              "initialCapitalAdjustment",
              event.target.value,
            )
          }
          helperText="Euro"
          fullWidth
        />

        <TextField
          label="Rendimento annuale"
          type="number"
          value={
            form.annualReturnAdjustmentPct
          }
          onChange={(event) =>
            updateForm(
              "annualReturnAdjustmentPct",
              event.target.value,
            )
          }
          helperText="Variazione %"
          fullWidth
        />

        <TextField
          label="Costi annuali"
          type="number"
          value={
            form.annualCostAdjustmentPct
          }
          onChange={(event) =>
            updateForm(
              "annualCostAdjustmentPct",
              event.target.value,
            )
          }
          helperText="Variazione %"
          fullWidth
        />

        <TextField
          label="Ricavi annuali"
          type="number"
          value={
            form.annualRevenueAdjustmentPct
          }
          onChange={(event) =>
            updateForm(
              "annualRevenueAdjustmentPct",
              event.target.value,
            )
          }
          helperText="Variazione %"
          fullWidth
        />

        <TextField
          label="Inflazione aggiuntiva"
          type="number"
          value={
            form.expenseInflationDeltaPct
          }
          onChange={(event) =>
            updateForm(
              "expenseInflationDeltaPct",
              event.target.value,
            )
          }
          helperText="Punti % annui"
          fullWidth
        />
      </Box>

      <Box
        sx={{
          mt: 3,
          mb: 1.5,
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800 }}
          >
            Eventi straordinari
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Acquisti, vendite o altri
            movimenti una tantum.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            <AddRoundedIcon />
          }
          onClick={addEvent}
        >
          Aggiungi evento
        </Button>
      </Box>

      {events.length === 0 ? (
        <Alert severity="info">
          Nessun evento straordinario
          aggiunto.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1.2,
          }}
        >
          {events.map(
            (event) => (
              <Paper
                key={event.id}
                elevation={0}
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor:
                    "divider",
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md:
                      "120px minmax(220px, 1fr) 180px 160px auto",
                  },
                  gap: 1.2,
                  alignItems: "center",
                }}
              >
                <TextField
                  label="Anno"
                  type="number"
                  size="small"
                  value={event.year}
                  onChange={(
                    changeEvent,
                  ) =>
                    updateEvent(
                      event.id,
                      "year",
                      changeEvent
                        .target.value,
                    )
                  }
                />

                <TextField
                  label="Descrizione"
                  size="small"
                  value={event.label}
                  onChange={(
                    changeEvent,
                  ) =>
                    updateEvent(
                      event.id,
                      "label",
                      changeEvent
                        .target.value,
                    )
                  }
                />

                <TextField
                  label="Importo"
                  type="number"
                  size="small"
                  value={event.amount}
                  onChange={(
                    changeEvent,
                  ) =>
                    updateEvent(
                      event.id,
                      "amount",
                      changeEvent
                        .target.value,
                    )
                  }
                  helperText={
                    "Negativo = uscita"
                  }
                />

                <TextField
                  label="Categoria"
                  size="small"
                  value={
                    event.category
                  }
                  onChange={(
                    changeEvent,
                  ) =>
                    updateEvent(
                      event.id,
                      "category",
                      changeEvent
                        .target.value,
                    )
                  }
                />

                <IconButton
                  color="error"
                  aria-label="Elimina evento"
                  onClick={() =>
                    removeEvent(
                      event.id,
                    )
                  }
                >
                  <DeleteOutlineRoundedIcon />
                </IconButton>
              </Paper>
            ),
          )}
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent:
            "flex-end",
          flexWrap: "wrap",
          gap: 1.2,
          mt: 3,
        }}
      >
        <Button
          variant="outlined"
          startIcon={
            <RestartAltRoundedIcon />
          }
          onClick={resetScenario}
          disabled={simulating}
        >
          Reimposta
        </Button>

        <Button
          variant="contained"
          startIcon={
            simulating ? (
              <CircularProgress
                size={17}
                color="inherit"
              />
            ) : (
              <PlayArrowRoundedIcon />
            )
          }
          onClick={() =>
            void runScenario()
          }
          disabled={simulating}
        >
          {simulating
            ? "Calcolo..."
            : "Calcola scenario"}
        </Button>
      </Box>

      {result && (
        <>
          <Divider sx={{ my: 3.5 }} />

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
              gap: 1.5,
              mb: 2.5,
            }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                }}
              >
                {result.scenario.name}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.3 }}
              >
                Confronto con la baseline
                ufficiale.
              </Typography>
            </Box>

            <Chip
              label={statusLabel}
              color={statusColor}
              sx={{
                fontWeight: 800,
              }}
            />
          </Box>

          {result.warnings.map(
            (warning) => (
              <Alert
                key={warning}
                severity={
                  result.summary.status ===
                  "UNSUSTAINABLE"
                    ? "error"
                    : result.summary.status ===
                        "AT_RISK"
                      ? "warning"
                      : "info"
                }
                sx={{ mb: 1.2 }}
              >
                {warning}
              </Alert>
            ),
          )}

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
              gap: 1.5,
              mt: 2.5,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Capitale finale
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  mt: 0.5,
                  fontWeight: 800,
                }}
              >
                {formatCurrency(
                  result.summary
                    .finalCapital,
                )}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Variazione dalla baseline
              </Typography>

              <Typography
                variant="h6"
                color={
                  (
                    result.comparison
                      .finalCapitalDelta ??
                    0
                  ) >= 0
                    ? "success.main"
                    : "error.main"
                }
                sx={{
                  mt: 0.5,
                  fontWeight: 800,
                }}
              >
                {formatSignedCurrency(
                  result.comparison
                    .finalCapitalDelta,
                )}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                {formatPercentage(
                  result.comparison
                    .finalCapitalDeltaPct,
                )}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Capitale minimo
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  mt: 0.5,
                  fontWeight: 800,
                }}
              >
                {formatCurrency(
                  result.summary
                    .minimumCapital,
                )}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Nel{" "}
                {result.summary
                  .minimumCapitalYear ??
                  "—"}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Drawdown massimo
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                  mt: 0.5,
                }}
              >
                {(
                  result.summary
                    .maximumDrawdownPct ??
                  0
                ) > 50 ? (
                  <TrendingDownRoundedIcon
                    color="error"
                  />
                ) : (
                  <TrendingUpRoundedIcon
                    color="success"
                  />
                )}

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                  }}
                >
                  {formatPercentage(
                    result.summary
                      .maximumDrawdownPct,
                  )}
                </Typography>
              </Box>
            </Paper>
          </Box>

          <Paper
            elevation={0}
            sx={{
              mt: 2.5,
              p: {
                xs: 1.5,
                md: 2.5,
              },
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 0.5 }}
            >
              Baseline contro scenario
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              Evoluzione del capitale
              fino al{" "}
              {
                result.baselineSource
                  .endYear
              }
              .
            </Typography>

            <Box
              sx={{
                width: "100%",
                height: 380,
              }}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="year"
                    minTickGap={22}
                  />

                  <YAxis
                    tickFormatter={
                      formatCompactCurrency
                    }
                    width={75}
                  />

                  <Tooltip />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="baseline"
                    name="Baseline ufficiale"
                    stroke="#7A8A99"
                    strokeWidth={2}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="scenario"
                    name="Scenario"
                    stroke="#1F6FB2"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </>
      )}

      <PlanningScenarioArchive
        currentResult={result}
        onLoadScenario={
          loadStoredScenario
        }
      />

    </Paper>
  );
}
