import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";

import KpiCard from "../components/KpiCard";
import {
  getPropertiesOverview,
  type PropertiesOverviewResponse,
} from "../services/api";

const COUNTRY_LABELS: Record<string, string> = {
  Spain: "Spagna",
  Italy: "Italia",
  UAE: "Emirati Arabi Uniti",
};

export default function Properties() {
  const [data, setData] =
    useState<PropertiesOverviewResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProperties() {
    setLoading(true);
    setError("");

    try {
      const result = await getPropertiesOverview();
      setData(result);
    } catch (requestError) {
      console.error(requestError);
      setError(
        "Impossibile caricare il patrimonio immobiliare.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProperties();
  }, []);

  const euro = (value: number) =>
    value.toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });

  const euroPrecise = (value: number) =>
    value.toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const percentage = (value: number) =>
    `${value.toLocaleString("it-IT", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`;

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("it-IT");

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
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
          justifyContent: "space-between",
          flexDirection: {
            xs: "column",
            sm: "row",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4">Immobili</Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Valori immobiliari, passività associate,
            patrimonio netto e loan-to-value.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => void loadProperties()}
          disabled={loading}
        >
          {loading ? "Aggiornamento..." : "Aggiorna"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
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
                "linear-gradient(120deg, #49330B 0%, #9A6816 55%, #D89C2B 135%)",
              boxShadow:
                "0 18px 42px rgba(125, 82, 15, 0.22)",

              "&::after": {
                content: '""',
                position: "absolute",
                width: 310,
                height: 310,
                borderRadius: "50%",
                top: -190,
                right: -60,
                backgroundColor:
                  "rgba(255,255,255,0.10)",
              },
            }}
          >
            <Typography
              variant="overline"
              sx={{
                color: "rgba(255,255,255,0.72)",
                letterSpacing: "0.15em",
              }}
            >
              Real Estate Portfolio
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: "rgba(255,255,255,0.76)",
              }}
            >
              Patrimonio immobiliare netto
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
              {euroPrecise(data.summary.netEquity)}
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                mt: 3,
              }}
            >
              <Chip
                label={`${data.summary.propertyCount} immobili`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              <Chip
                label={`Valore lordo ${euro(
                  data.summary.grossValue,
                )}`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.17)",
                }}
              />

              {data.asOfDate && (
                <Chip
                  label={`Valori al ${formatDate(
                    data.asOfDate,
                  )}`}
                  sx={{
                    color: "white",
                    backgroundColor:
                      "rgba(255,255,255,0.17)",
                  }}
                />
              )}
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
              title="Valore lordo"
              value={euro(data.summary.grossValue)}
              subtitle={`${data.summary.propertyCount} immobili`}
              icon={<HomeWorkRoundedIcon />}
              tone="warning"
            />

            <KpiCard
              title="Patrimonio netto"
              value={euro(data.summary.netEquity)}
              subtitle="Valore lordo meno passività"
              icon={<SavingsRoundedIcon />}
              tone="success"
            />

            <KpiCard
              title="Passività immobiliari"
              value={euro(data.summary.debt)}
              subtitle="Mutui e impegni residui"
              icon={<AccountBalanceRoundedIcon />}
              tone="error"
            />

            <KpiCard
              title="LTV consolidato"
              value={percentage(
                data.summary.weightedLtv,
              )}
              subtitle="Debito su valore lordo"
              icon={<PercentRoundedIcon />}
              tone="primary"
            />
          </Box>

          {data.summary.heldForSaleCount > 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {data.summary.heldForSaleCount === 1
                ? "Un immobile è classificato"
                : `${data.summary.heldForSaleCount} immobili sono classificati`}{" "}
              come destinato alla vendita, per un valore di{" "}
              {euroPrecise(
                data.summary.heldForSaleValue,
              )}
              .
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2.2,
              mb: 3,
            }}
          >
            {data.properties.map((property) => (
              <Paper
                key={property.id}
                elevation={0}
                sx={{
                  p: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow:
                    "0 12px 32px rgba(26,45,75,0.06)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 2,
                    mb: 2.5,
                  }}
                >
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{ mb: 0.5 }}
                    >
                      {property.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {property.country
                        ? COUNTRY_LABELS[
                            property.country
                          ] ?? property.country
                        : "Paese non disponibile"}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    color={
                      property.status ===
                      "HELD_FOR_SALE"
                        ? "warning"
                        : "success"
                    }
                    label={
                      property.status ===
                      "HELD_FOR_SALE"
                        ? "In vendita"
                        : "In portafoglio"
                    }
                  />
                </Box>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Valore lordo
                </Typography>

                <Typography
                  variant="h5"
                  sx={{ mt: 0.4, mb: 2.5 }}
                >
                  {euroPrecise(property.grossValue)}
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: 2,
                    mb: 2.5,
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Passività
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.3,
                        fontWeight: 700,
                        color:
                          property.debt > 0
                            ? "error.main"
                            : "text.primary",
                      }}
                    >
                      {euroPrecise(property.debt)}
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
                      sx={{
                        mt: 0.3,
                        fontWeight: 700,
                      }}
                    >
                      {euroPrecise(property.netEquity)}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.8,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Loan-to-value
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700 }}
                    >
                      {percentage(property.ltv)}
                    </Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={Math.min(property.ltv, 100)}
                    color={
                      property.ltv > 50
                        ? "error"
                        : property.ltv > 25
                          ? "warning"
                          : "success"
                    }
                    sx={{
                      height: 8,
                      borderRadius: 8,
                      backgroundColor: "#E9EEF6",

                      "& .MuiLinearProgress-bar": {
                        borderRadius: 8,
                      },
                    }}
                  />
                </Box>

                {property.historicalCost !== null && (
                  <Box
                    sx={{
                      mt: 2.5,
                      pt: 2,
                      borderTop: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Costo storico
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700 }}
                    >
                      {euroPrecise(
                        property.historicalCost,
                      )}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Differenza:{" "}
                      {euroPrecise(
                        property
                          .differenceFromHistoricalCost ??
                          0,
                      )}
                    </Typography>
                  </Box>
                )}

                {property.expectedClosingDate && (
                  <Alert
                    severity="warning"
                    sx={{ mt: 2 }}
                  >
                    Rogito previsto il{" "}
                    {formatDate(
                      property.expectedClosingDate,
                    )}
                  </Alert>
                )}
              </Paper>
            ))}
          </Box>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              boxShadow:
                "0 12px 32px rgba(26,45,75,0.06)",
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Immobile</TableCell>
                  <TableCell>Paese</TableCell>
                  <TableCell>Stato</TableCell>
                  <TableCell align="right">
                    Valore lordo
                  </TableCell>
                  <TableCell align="right">
                    Passività
                  </TableCell>
                  <TableCell align="right">
                    LTV
                  </TableCell>
                  <TableCell align="right">
                    Patrimonio netto
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.properties.map((property) => (
                  <TableRow key={property.id} hover>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700 }}
                      >
                        {property.name}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {property.country
                        ? COUNTRY_LABELS[
                            property.country
                          ] ?? property.country
                        : "—"}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={
                          property.status ===
                          "HELD_FOR_SALE"
                            ? "warning"
                            : "success"
                        }
                        label={
                          property.status ===
                          "HELD_FOR_SALE"
                            ? "In vendita"
                            : "In portafoglio"
                        }
                      />
                    </TableCell>

                    <TableCell align="right">
                      {euroPrecise(
                        property.grossValue,
                      )}
                    </TableCell>

                    <TableCell align="right">
                      {euroPrecise(property.debt)}
                    </TableCell>

                    <TableCell align="right">
                      {percentage(property.ltv)}
                    </TableCell>

                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 750 }}
                      >
                        {euroPrecise(
                          property.netEquity,
                        )}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
