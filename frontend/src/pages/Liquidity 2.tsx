import { useEffect, useMemo, useState } from "react";
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
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import PieChartRoundedIcon from "@mui/icons-material/PieChartRounded";
import CurrencyExchangeRoundedIcon from "@mui/icons-material/CurrencyExchangeRounded";

import KpiCard from "../components/KpiCard";
import {
  getLiquidityOverview,
  type LiquidityOverviewResponse,
} from "../services/api";

const SOURCE_LABELS: Record<string, string> = {
  EXCEL_GRESLERI2026: "Excel",
  USER_CONFIRMED_2026: "Confermato",
  PROVISIONAL_2026: "Provvisorio",
};

const COUNTRY_LABELS: Record<string, string> = {
  Italy: "Italia",
  Spain: "Spagna",
  Ireland: "Irlanda",
  Lithuania: "Lituania",
  UAE: "Emirati Arabi Uniti",
};

export default function Liquidity() {
  const [data, setData] =
    useState<LiquidityOverviewResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLiquidity() {
    setLoading(true);
    setError("");

    try {
      const result = await getLiquidityOverview();
      setData(result);
    } catch (requestError) {
      console.error(requestError);
      setError(
        "Impossibile caricare i dati della liquidità.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLiquidity();
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

  const largestInstitution = useMemo(() => {
    return data?.institutions[0] ?? null;
  }, [data]);

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
          <Typography variant="h4">
            Liquidità
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Disponibilità bancarie, concentrazione per
            istituto ed esposizione valutaria.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => void loadLiquidity()}
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
                "linear-gradient(120deg, #073A42 0%, #087A78 58%, #1AA38F 135%)",
              boxShadow:
                "0 18px 42px rgba(8, 100, 98, 0.2)",

              "&::after": {
                content: '""',
                position: "absolute",
                width: 310,
                height: 310,
                borderRadius: "50%",
                top: -190,
                right: -60,
                backgroundColor:
                  "rgba(255,255,255,0.09)",
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
              Cash &amp; Liquidity Control
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: "rgba(255,255,255,0.76)",
              }}
            >
              Liquidità consolidata
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
              {euroPrecise(
                data.summary.totalLiquidity,
              )}
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
                label={`${data.summary.accountCount} conti`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.16)",
                }}
              />

              <Chip
                label={`${data.summary.institutionCount} istituti`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.16)",
                }}
              />

              {data.asOfDate && (
                <Chip
                  label={`Valori al ${new Date(
                    data.asOfDate,
                  ).toLocaleDateString("it-IT")}`}
                  sx={{
                    color: "white",
                    backgroundColor:
                      "rgba(255,255,255,0.16)",
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
              title="Liquidità totale"
              value={euro(
                data.summary.totalLiquidity,
              )}
              subtitle="Controvalore consolidato in EUR"
              icon={
                <AccountBalanceWalletRoundedIcon />
              }
              tone="success"
            />

            <KpiCard
              title="Istituti"
              value={String(
                data.summary.institutionCount,
              )}
              subtitle={`${data.summary.accountCount} conti complessivi`}
              icon={<AccountBalanceRoundedIcon />}
              tone="primary"
            />

            <KpiCard
              title="Conto principale"
              value={percentage(
                data.summary.largestAccountWeight,
              )}
              subtitle={euro(
                data.summary.largestAccountValue,
              )}
              icon={<PieChartRoundedIcon />}
              tone="warning"
            />

            <KpiCard
              title="Esposizione valutaria"
              value={percentage(
                data.summary.foreignCurrencyWeight,
              )}
              subtitle={euro(
                data.summary.foreignCurrencyValue,
              )}
              icon={<CurrencyExchangeRoundedIcon />}
              tone="error"
            />
          </Box>

          {data.dataQuality.warnings.map(
            (warning) => (
              <Alert
                key={warning}
                severity="warning"
                sx={{ mb: 3 }}
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
                lg: "1.2fr 1fr",
              },
              gap: 2.2,
              mb: 3,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow:
                  "0 12px 32px rgba(26, 45, 75, 0.06)",
              }}
            >
              <Typography variant="h6">
                Distribuzione per istituto
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, mb: 3 }}
              >
                Concentrazione della liquidità presso banche
                e intermediari.
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2.4,
                }}
              >
                {data.institutions.map(
                  (institution) => (
                    <Box key={institution.name}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 2,
                          mb: 0.8,
                        }}
                      >
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700 }}
                          >
                            {institution.name}
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {institution.accountCount}{" "}
                            {institution.accountCount === 1
                              ? "conto"
                              : "conti"}
                          </Typography>
                        </Box>

                        <Box
                          sx={{ textAlign: "right" }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700 }}
                          >
                            {euroPrecise(
                              institution.value,
                            )}
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {percentage(
                              institution.weight,
                            )}
                          </Typography>
                        </Box>
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={Math.min(
                          institution.weight,
                          100,
                        )}
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
                  ),
                )}
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow:
                  "0 12px 32px rgba(26, 45, 75, 0.06)",
              }}
            >
              <Typography variant="h6">
                Controllo concentrazione
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, mb: 3 }}
              >
                Indicatori principali del rischio di
                controparte bancaria.
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2.5,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Principale istituto
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{ mt: 0.4 }}
                  >
                    {largestInstitution?.name ?? "—"}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {largestInstitution
                      ? `${euroPrecise(
                          largestInstitution.value,
                        )} · ${percentage(
                          largestInstitution.weight,
                        )}`
                      : "Nessun dato"}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Prime tre disponibilità
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{ mt: 0.4 }}
                  >
                    {percentage(
                      data.summary
                        .topThreeConcentration,
                    )}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {euroPrecise(
                      data.summary.topThreeValue,
                    )}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Valute rilevate
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    {data.currencies.map(
                      (currency) => (
                        <Chip
                          key={currency.name}
                          size="small"
                          variant="outlined"
                          label={`${currency.name} · ${percentage(
                            currency.weight,
                          )}`}
                        />
                      ),
                    )}
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              boxShadow:
                "0 12px 32px rgba(26, 45, 75, 0.06)",
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Conto</TableCell>
                  <TableCell>Istituto</TableCell>
                  <TableCell>Paese</TableCell>
                  <TableCell>Valuta</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Fonte</TableCell>
                  <TableCell>Valutazione</TableCell>
                  <TableCell align="right">
                    Peso
                  </TableCell>
                  <TableCell align="right">
                    Controvalore
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.accounts.map((account) => (
                  <TableRow
                    key={account.id}
                    hover
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700 }}
                      >
                        {account.name}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {account.code}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {account.institution}
                    </TableCell>

                    <TableCell>
                      {account.country
                        ? COUNTRY_LABELS[
                            account.country
                          ] ?? account.country
                        : "—"}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={
                          account.currency === "EUR"
                            ? "primary"
                            : "warning"
                        }
                        label={account.currency}
                      />
                    </TableCell>

                    <TableCell>
                      {account.accountType}
                    </TableCell>

                    <TableCell>
                      {SOURCE_LABELS[
                        account.source
                      ] ?? account.source}
                    </TableCell>

                    <TableCell>
                      {formatDate(
                        account.valuationDate,
                      )}
                    </TableCell>

                    <TableCell align="right">
                      {percentage(account.weight)}
                    </TableCell>

                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 750 }}
                      >
                        {euroPrecise(
                          account.valueBase,
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
