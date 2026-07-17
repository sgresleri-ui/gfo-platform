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

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getRiskOverview,
  type RiskOverviewResponse,
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

function percentage(value: number): string {
  return `${value.toLocaleString(
    "it-IT",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}%`;
}

function shortEuro(value: number): string {
  const absoluteValue =
    Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `${(
      value / 1_000_000
    ).toFixed(1)} M€`;
  }

  if (absoluteValue >= 1_000) {
    return `${(
      value / 1_000
    ).toFixed(0)} k€`;
  }

  return `${value.toFixed(0)} €`;
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

export default function Risk() {
  const [data, setData] =
    useState<RiskOverviewResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadRisk = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await getRiskOverview();

        setData(result);
      } catch (requestError) {
        console.error(requestError);

        setError(
          "Impossibile caricare l’analisi di rischio patrimoniale.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadRisk();
  }, [loadRisk]);

  const assetClassData = useMemo(
    () =>
      data?.assetClasses.map(
        (item) => ({
          name: item.label,
          valore:
            item.netContribution,
        }),
      ) ?? [],
    [data],
  );

  const countryData = useMemo(
    () =>
      data?.countryExposure
        .slice(0, 10)
        .map((item) => ({
          name: item.country,
          valore: item.value,
        })) ?? [],
    [data],
  );

  const currencyData = useMemo(
    () =>
      data?.currencyExposure.map(
        (item) => ({
          name: item.currency,
          valore: item.value,
        }),
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
          "Analisi di rischio non disponibile."}
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
            <ShieldRoundedIcon
              fontSize="large"
            />
            Rischio e Concentrazione
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.7 }}
          >
            Esposizione patrimoniale,
            concentrazione e struttura
            delle passività.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            <RefreshRoundedIcon />
          }
          disabled={loading}
          onClick={() =>
            void loadRisk()
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
        Questa analisi è descrittiva.
        Le soglie di rischio e i limiti
        operativi saranno definiti
        esclusivamente sulla base
        dell’Investment Policy Statement.
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
          label="Patrimonio netto"
          value={euro(
            data.summary.netWorth,
          )}
          subtitle={`${data.summary.positions} posizioni attive`}
        />

        <KpiCard
          label="Attività lorde"
          value={euro(
            data.summary.grossAssets,
          )}
          subtitle={`${data.summary.assetPositions} posizioni attive`}
        />

        <KpiCard
          label="Passività"
          value={euro(
            data.summary.liabilities,
          )}
          subtitle={`${percentage(
            data.ratios
              .liabilitiesGrossAssets,
          )} delle attività lorde`}
        />

        <KpiCard
          label="Attività finanziarie"
          value={euro(
            data.summary
              .marketableAssets,
          )}
          subtitle={`${percentage(
            data.ratios
              .marketableGrossAssets,
          )} delle attività lorde`}
        />
      </Box>

      <Typography
        variant="h6"
        sx={{ mb: 1.5 }}
      >
        Indicatori di concentrazione
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md:
              "repeat(3, minmax(0, 1fr))",
            xl:
              "repeat(6, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <KpiCard
          label="Liquidità"
          value={percentage(
            data.ratios
              .liquidityGrossAssets,
          )}
          subtitle={euro(
            data.summary.liquidity,
          )}
        />

        <KpiCard
          label="Investimenti"
          value={percentage(
            data.ratios
              .investmentsGrossAssets,
          )}
          subtitle={euro(
            data.summary.investments,
          )}
        />

        <KpiCard
          label="Immobili"
          value={percentage(
            data.ratios
              .realEstateGrossAssets,
          )}
          subtitle={euro(
            data.summary.realEstate,
          )}
        />

        <KpiCard
          label="Prima posizione"
          value={percentage(
            data.ratios
              .top1GrossAssets,
          )}
          subtitle={
            data.concentration
              .largestPosition?.name ??
            "Non disponibile"
          }
        />

        <KpiCard
          label="Prime 5 posizioni"
          value={percentage(
            data.ratios
              .top5GrossAssets,
          )}
          subtitle={euro(
            data.concentration
              .top5Value,
          )}
        />

        <KpiCard
          label="Indice HHI"
          value={data.ratios.hhi.toLocaleString(
            "it-IT",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )}
          subtitle="Indice descrittivo 0–10.000"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl:
              "repeat(2, minmax(0, 1fr))",
          },
          gap: 3,
          mb: 3,
        }}
      >
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
            sx={{ mb: 0.5 }}
          >
            Asset class
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            Contributo netto al patrimonio
            per categoria.
          </Typography>

          <Box sx={{ height: 350 }}>
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={assetClassData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 20,
                  bottom: 45,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />

                <YAxis
                  width={84}
                  tickFormatter={(value) =>
                    shortEuro(
                      Number(value),
                    )
                  }
                />

                <Tooltip
                  formatter={(value) =>
                    euro(Number(value))
                  }
                />

                <Legend />

                <Bar
                  dataKey="valore"
                  name="Valore netto"
                  fill="#1d4f7a"
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

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
            sx={{ mb: 0.5 }}
          >
            Esposizione geografica
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            Prime esposizioni per Paese,
            al lordo delle passività.
          </Typography>

          <Box sx={{ height: 350 }}>
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={countryData}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 20,
                  left: 35,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  type="number"
                  tickFormatter={(value) =>
                    shortEuro(
                      Number(value),
                    )
                  }
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                />

                <Tooltip
                  formatter={(value) =>
                    euro(Number(value))
                  }
                />

                <Bar
                  dataKey="valore"
                  name="Esposizione"
                  fill="#4d8b74"
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
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
          sx={{ mb: 0.5 }}
        >
          Esposizione valutaria
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          Valuta nominale delle posizioni
          attive, valorizzate in EUR.
        </Typography>

        <Box sx={{ height: 320 }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={currencyData}
              margin={{
                top: 10,
                right: 20,
                left: 20,
                bottom: 25,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis dataKey="name" />

              <YAxis
                width={84}
                tickFormatter={(value) =>
                  shortEuro(
                    Number(value),
                  )
                }
              />

              <Tooltip
                formatter={(value) =>
                  euro(Number(value))
                }
              />

              <Bar
                dataKey="valore"
                name="Esposizione"
                fill="#d59b45"
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Typography
        variant="h6"
        sx={{ mb: 1.5 }}
      >
        Principali posizioni
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
              <TableCell>Posizione</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Paese</TableCell>
              <TableCell>Valuta</TableCell>
              <TableCell align="right">
                Valore
              </TableCell>
              <TableCell align="right">
                Peso attività
              </TableCell>
              <TableCell align="right">
                Peso patrimonio netto
              </TableCell>
              <TableCell>Tipo</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.topPositions.map(
              (position) => (
                <TableRow
                  key={position.code}
                  hover
                >
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 750,
                      }}
                    >
                      {position.name}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontFamily:
                          "monospace",
                      }}
                    >
                      {position.code}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {position.categoryLabel}
                  </TableCell>

                  <TableCell>
                    {position.country ??
                      "Non specificato"}
                  </TableCell>

                  <TableCell>
                    {position.currency}
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    {euro(
                      position.valueBase,
                    )}
                  </TableCell>

                  <TableCell align="right">
                    {percentage(
                      position
                        .weightGrossAssets,
                    )}
                  </TableCell>

                  <TableCell align="right">
                    {percentage(
                      position.weightNetWorth,
                    )}
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      color={
                        position.isLiability
                          ? "warning"
                          : "success"
                      }
                      label={
                        position.isLiability
                          ? "Passività"
                          : "Attività"
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
        variant="caption"
        color="text.secondary"
        sx={{
          mt: 2,
          display: "block",
        }}
      >
        Analisi aggiornata al{" "}
        {dateTimeLabel(data.asOf)}.
      </Typography>
    </Box>
  );
}
