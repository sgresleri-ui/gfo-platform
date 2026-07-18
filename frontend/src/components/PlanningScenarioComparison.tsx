import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";

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

import {
  getPlanningScenarioBaseline,
  getStoredPlanningScenario,
  type PlanningScenarioBaselineResponse,
  type PlanningScenarioStatus,
  type StoredPlanningScenarioDetail,
  type StoredPlanningScenarioSummary,
} from "../services/api";

type Props = {
  scenarios:
    StoredPlanningScenarioSummary[];
};

type ComparisonMetric = {
  label: string;
  leftValue: number | null;
  rightValue: number | null;
  format:
    | "currency"
    | "percentage";
  favorable:
    | "higher"
    | "lower";
};

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

function formatSignedValue(
  value: number | null,
  format:
    | "currency"
    | "percentage",
): string {
  if (value === null) {
    return "—";
  }

  const absolute =
    format === "currency"
      ? Math.abs(value).toLocaleString(
          "it-IT",
          {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )
      : `${Math.abs(value).toLocaleString(
          "it-IT",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )}%`;

  if (value > 0) {
    return `+${absolute}`;
  }

  if (value < 0) {
    return `−${absolute}`;
  }

  return absolute;
}

function formatMetric(
  value: number | null,
  format:
    | "currency"
    | "percentage",
): string {
  return format === "currency"
    ? formatCurrency(value)
    : formatPercentage(value);
}

function statusLabel(
  status:
    | PlanningScenarioStatus
    | null,
): string {
  if (status === "SUSTAINABLE") {
    return "Sostenibile";
  }

  if (status === "AT_RISK") {
    return "A rischio";
  }

  if (status === "UNSUSTAINABLE") {
    return "Non sostenibile";
  }

  return "Non disponibile";
}

function statusColor(
  status:
    | PlanningScenarioStatus
    | null,
):
  | "success"
  | "warning"
  | "error"
  | "default" {
  if (status === "SUSTAINABLE") {
    return "success";
  }

  if (status === "AT_RISK") {
    return "warning";
  }

  if (status === "UNSUSTAINABLE") {
    return "error";
  }

  return "default";
}

function statusRank(
  status:
    | PlanningScenarioStatus
    | null,
): number {
  if (status === "SUSTAINABLE") {
    return 3;
  }

  if (status === "AT_RISK") {
    return 2;
  }

  if (status === "UNSUSTAINABLE") {
    return 1;
  }

  return 0;
}

function compareRobustness(
  left:
    StoredPlanningScenarioDetail,
  right:
    StoredPlanningScenarioDetail,
): number {
  const leftResult =
    left.lastResult;

  const rightResult =
    right.lastResult;

  if (
    !leftResult ||
    !rightResult
  ) {
    return 0;
  }

  const leftValues = [
    statusRank(
      left.sustainabilityStatus,
    ),

    leftResult.summary
      .firstNegativeCapitalYear ===
    null
      ? 1
      : 0,

    leftResult.summary
      .minimumCapital,

    leftResult.summary
      .finalCapital,

    -(
      leftResult.summary
        .maximumDrawdownPct ??
      Number.POSITIVE_INFINITY
    ),
  ];

  const rightValues = [
    statusRank(
      right.sustainabilityStatus,
    ),

    rightResult.summary
      .firstNegativeCapitalYear ===
    null
      ? 1
      : 0,

    rightResult.summary
      .minimumCapital,

    rightResult.summary
      .finalCapital,

    -(
      rightResult.summary
        .maximumDrawdownPct ??
      Number.POSITIVE_INFINITY
    ),
  ];

  for (
    let index = 0;
    index < leftValues.length;
    index += 1
  ) {
    if (
      leftValues[index] >
      rightValues[index]
    ) {
      return 1;
    }

    if (
      leftValues[index] <
      rightValues[index]
    ) {
      return -1;
    }
  }

  return 0;
}

export default function PlanningScenarioComparison({
  scenarios,
}: Props) {
  const [
    baseline,
    setBaseline,
  ] = useState<
    PlanningScenarioBaselineResponse | null
  >(null);

  const [
    leftId,
    setLeftId,
  ] = useState("");

  const [
    rightId,
    setRightId,
  ] = useState("");

  const [
    leftScenario,
    setLeftScenario,
  ] = useState<
    StoredPlanningScenarioDetail | null
  >(null);

  const [
    rightScenario,
    setRightScenario,
  ] = useState<
    StoredPlanningScenarioDetail | null
  >(null);

  const [loading, setLoading] =
    useState(false);

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
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (scenarios.length < 2) {
      setLeftId("");
      setRightId("");
      setLeftScenario(null);
      setRightScenario(null);
      return;
    }

    setLeftId((current) =>
      scenarios.some(
        (scenario) =>
          scenario.id === current,
      )
        ? current
        : scenarios[
            scenarios.length - 1
          ].id,
    );

    setRightId((current) =>
      scenarios.some(
        (scenario) =>
          scenario.id === current,
      )
        ? current
        : scenarios[0].id,
    );
  }, [scenarios]);

  useEffect(() => {
    if (
      !leftId ||
      !rightId ||
      leftId === rightId
    ) {
      setLeftScenario(null);
      setRightScenario(null);
      return;
    }

    let active = true;

    setLoading(true);
    setError("");

    Promise.all([
      getStoredPlanningScenario(
        leftId,
      ),
      getStoredPlanningScenario(
        rightId,
      ),
    ])
      .then(
        ([
          leftResponse,
          rightResponse,
        ]) => {
          if (!active) {
            return;
          }

          if (
            !leftResponse.lastResult ||
            !rightResponse.lastResult
          ) {
            throw new Error(
              "Risultati storici non disponibili.",
            );
          }

          setLeftScenario(
            leftResponse,
          );

          setRightScenario(
            rightResponse,
          );
        },
      )
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile confrontare gli scenari selezionati.",
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
  }, [leftId, rightId]);

  const comparisonMetrics =
    useMemo<
      ComparisonMetric[]
    >(() => {
      if (
        !leftScenario?.lastResult ||
        !rightScenario?.lastResult
      ) {
        return [];
      }

      return [
        {
          label:
            "Capitale finale",

          leftValue:
            leftScenario
              .lastResult.summary
              .finalCapital,

          rightValue:
            rightScenario
              .lastResult.summary
              .finalCapital,

          format: "currency",
          favorable: "higher",
        },
        {
          label:
            "Capitale minimo",

          leftValue:
            leftScenario
              .lastResult.summary
              .minimumCapital,

          rightValue:
            rightScenario
              .lastResult.summary
              .minimumCapital,

          format: "currency",
          favorable: "higher",
        },
        {
          label:
            "Drawdown massimo",

          leftValue:
            leftScenario
              .lastResult.summary
              .maximumDrawdownPct,

          rightValue:
            rightScenario
              .lastResult.summary
              .maximumDrawdownPct,

          format: "percentage",
          favorable: "lower",
        },
        {
          label:
            "Variazione dalla baseline",

          leftValue:
            leftScenario
              .lastResult.comparison
              .finalCapitalDelta,

          rightValue:
            rightScenario
              .lastResult.comparison
              .finalCapitalDelta,

          format: "currency",
          favorable: "higher",
        },
      ];
    }, [
      leftScenario,
      rightScenario,
    ]);

  const chartData = useMemo(() => {
    if (
      !baseline ||
      !leftScenario?.lastResult ||
      !rightScenario?.lastResult
    ) {
      return [];
    }

    const baselineMap =
      new Map<
        number,
        number | null
      >(
        baseline.budget.longTerm
          .years.map((year) => [
            year.year,
            year.capitalEnd,
          ]),
      );

    const leftMap =
      new Map<number, number>(
        leftScenario.lastResult
          .years.map((year) => [
            year.year,
            year.scenario
              .capitalEnd,
          ]),
      );

    const rightMap =
      new Map<number, number>(
        rightScenario.lastResult
          .years.map((year) => [
            year.year,
            year.scenario
              .capitalEnd,
          ]),
      );

    const years = Array.from(
      new Set([
        ...baselineMap.keys(),
        ...leftMap.keys(),
        ...rightMap.keys(),
      ]),
    ).sort(
      (first, second) =>
        first - second,
    );

    return years.map((year) => ({
      year,
      baseline:
        baselineMap.get(year) ??
        null,

      left:
        leftMap.get(year) ??
        null,

      right:
        rightMap.get(year) ??
        null,
    }));
  }, [
    baseline,
    leftScenario,
    rightScenario,
  ]);

  const robustnessComparison =
    leftScenario &&
    rightScenario
      ? compareRobustness(
          leftScenario,
          rightScenario,
        )
      : 0;

  const strongerScenario =
    robustnessComparison > 0
      ? leftScenario
      : robustnessComparison < 0
        ? rightScenario
        : null;

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 3,
        p: {
          xs: 2.5,
          md: 3,
        },
        border: "1px solid",
        borderColor: "divider",
        backgroundColor:
          "background.default",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.2,
          mb: 0.5,
        }}
      >
        <CompareArrowsRoundedIcon
          color="primary"
        />

        <Typography
          variant="h6"
          sx={{ fontWeight: 800 }}
        >
          Confronto multi-scenario
        </Typography>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2.5 }}
      >
        Confronta due simulazioni
        archiviate con la baseline
        ufficiale.
      </Typography>

      {scenarios.length < 2 ? (
        <Alert severity="info">
          Sono necessari almeno due
          scenari salvati. Calcola una
          seconda simulazione, assegnale
          un nome differente e premi
          “Salva scenario corrente”.
        </Alert>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md:
                  "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
              mb: 2.5,
            }}
          >
            <TextField
              select
              label="Scenario A"
              value={leftId}
              onChange={(event) =>
                setLeftId(
                  event.target.value,
                )
              }
              fullWidth
            >
              {scenarios.map(
                (scenario) => (
                  <MenuItem
                    key={scenario.id}
                    value={scenario.id}
                  >
                    {scenario.name}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              select
              label="Scenario B"
              value={rightId}
              onChange={(event) =>
                setRightId(
                  event.target.value,
                )
              }
              fullWidth
            >
              {scenarios.map(
                (scenario) => (
                  <MenuItem
                    key={scenario.id}
                    value={scenario.id}
                  >
                    {scenario.name}
                  </MenuItem>
                ),
              )}
            </TextField>
          </Box>

          {leftId === rightId ? (
            <Alert severity="warning">
              Seleziona due scenari
              differenti.
            </Alert>
          ) : error ? (
            <Alert severity="error">
              {error}
            </Alert>
          ) : loading ? (
            <Box
              sx={{
                minHeight: 140,
                display: "grid",
                placeItems: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            leftScenario &&
            rightScenario &&
            leftScenario.lastResult &&
            rightScenario.lastResult && (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md:
                        "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 2,
                    mb: 2.5,
                  }}
                >
                  {[
                    leftScenario,
                    rightScenario,
                  ].map((scenario) => (
                    <Paper
                      key={scenario.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        border:
                          "1px solid",
                        borderColor:
                          "divider",
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 800,
                        }}
                      >
                        {scenario.name}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 1,
                          mt: 1,
                        }}
                      >
                        <Chip
                          size="small"
                          label={statusLabel(
                            scenario
                              .sustainabilityStatus,
                          )}
                          color={statusColor(
                            scenario
                              .sustainabilityStatus,
                          )}
                          variant="outlined"
                        />

                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Minimo nel{" "}
                          {scenario
                            .minimumCapitalYear ??
                            "—"}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>

                <Alert
                  severity={
                    strongerScenario
                      ? "success"
                      : "info"
                  }
                  icon={
                    <EmojiEventsRoundedIcon />
                  }
                  sx={{ mb: 2.5 }}
                >
                  {strongerScenario
                    ? `Lo scenario patrimonialmente più robusto è “${strongerScenario.name}”, considerando sostenibilità, assenza di capitale negativo, capitale minimo, capitale finale e drawdown.`
                    : "I due scenari risultano equivalenti secondo i principali indicatori di robustezza patrimoniale."}
                </Alert>

                <Box
                  sx={{
                    display: "grid",
                    gap: 1.2,
                    mb: 2.5,
                  }}
                >
                  {comparisonMetrics.map(
                    (metric) => {
                      const difference =
                        metric.leftValue ===
                          null ||
                        metric.rightValue ===
                          null
                          ? null
                          : metric.rightValue -
                            metric.leftValue;

                      const favorableForRight =
                        difference !== null &&
                        (
                          metric.favorable ===
                          "higher"
                            ? difference > 0
                            : difference < 0
                        );

                      const unfavorableForRight =
                        difference !== null &&
                        (
                          metric.favorable ===
                          "higher"
                            ? difference < 0
                            : difference > 0
                        );

                      return (
                        <Paper
                          key={metric.label}
                          elevation={0}
                          sx={{
                            p: 1.8,
                            border:
                              "1px solid",
                            borderColor:
                              "divider",
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "1fr",
                              md:
                                "minmax(190px, 1fr) repeat(3, minmax(150px, 0.8fr))",
                            },
                            gap: 1.5,
                            alignItems:
                              "center",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 800,
                            }}
                          >
                            {metric.label}
                          </Typography>

                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {leftScenario.name}
                            </Typography>

                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 750,
                              }}
                            >
                              {formatMetric(
                                metric.leftValue,
                                metric.format,
                              )}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {rightScenario.name}
                            </Typography>

                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 750,
                              }}
                            >
                              {formatMetric(
                                metric.rightValue,
                                metric.format,
                              )}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Differenza B − A
                            </Typography>

                            <Chip
                              size="small"
                              label={formatSignedValue(
                                difference,
                                metric.format,
                              )}
                              color={
                                favorableForRight
                                  ? "success"
                                  : unfavorableForRight
                                    ? "error"
                                    : "default"
                              }
                              variant="outlined"
                              sx={{ mt: 0.4 }}
                            />
                          </Box>
                        </Paper>
                      );
                    },
                  )}
                </Box>

                <Paper
                  elevation={0}
                  sx={{
                    p: {
                      xs: 1.5,
                      md: 2.5,
                    },
                    border: "1px solid",
                    borderColor:
                      "divider",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ mb: 0.5 }}
                  >
                    Evoluzione comparata
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Baseline ufficiale e
                    capitale previsto dai due
                    scenari fino al 2066.
                  </Typography>

                  <Box
                    sx={{
                      width: "100%",
                      height: 400,
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
                          strokeDasharray="6 5"
                          dot={false}
                        />

                        <Line
                          type="monotone"
                          dataKey="left"
                          name={
                            leftScenario.name
                          }
                          stroke="#1F6FB2"
                          strokeWidth={3}
                          dot={false}
                        />

                        <Line
                          type="monotone"
                          dataKey="right"
                          name={
                            rightScenario.name
                          }
                          stroke="#B86A25"
                          strokeWidth={3}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </>
            )
          )}
        </>
      )}
    </Paper>
  );
}
