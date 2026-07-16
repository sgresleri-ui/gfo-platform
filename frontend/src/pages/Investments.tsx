import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import DonutLargeRoundedIcon from "@mui/icons-material/DonutLargeRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

import KpiCard from "../components/KpiCard";
import {
  getInvestmentPortfolio,
  type InvestmentPortfolioResponse,
} from "../services/api";

export default function Investments() {
  const [data, setData] =
    useState<InvestmentPortfolioResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [portfolio, setPortfolio] = useState("ALL");
  const [instrumentType, setInstrumentType] =
    useState("ALL");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  async function loadPortfolio() {
    setLoading(true);
    setError("");

    try {
      const result = await getInvestmentPortfolio();
      setData(result);
    } catch (requestError) {
      console.error(requestError);
      setError(
        "Impossibile caricare il portafoglio investimenti.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPortfolio();
  }, []);

  const filteredPositions = useMemo(() => {
    if (!data) {
      return [];
    }

    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return data.positions.filter((position) => {
      const matchesPortfolio =
        portfolio === "ALL" ||
        position.portfolio === portfolio;

      const matchesInstrument =
        instrumentType === "ALL" ||
        position.instrumentType === instrumentType;

      const searchableText = [
        position.name,
        position.isin,
        position.market,
        position.portfolio,
        position.instrumentType,
        position.currency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      return (
        matchesPortfolio &&
        matchesInstrument &&
        matchesSearch
      );
    });
  }, [data, instrumentType, portfolio, search]);

  const visiblePositions = useMemo(() => {
    const start = page * rowsPerPage;

    return filteredPositions.slice(
      start,
      start + rowsPerPage,
    );
  }, [filteredPositions, page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [search, portfolio, instrumentType]);

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

  const quantity = (value: number | null) => {
    if (value === null) {
      return "—";
    }

    return value.toLocaleString("it-IT", {
      maximumFractionDigits: 4,
    });
  };

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
            Investimenti
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Analisi consolidata dei portafogli Advice,
            Advice+ e Interactive Brokers.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => void loadPortfolio()}
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
                "linear-gradient(120deg, #0A2B5B 0%, #174A9C 62%, #315EBB 130%)",
              boxShadow:
                "0 18px 42px rgba(21, 61, 116, 0.18)",

              "&::after": {
                content: '""',
                position: "absolute",
                width: 310,
                height: 310,
                borderRadius: "50%",
                top: -190,
                right: -65,
                backgroundColor:
                  "rgba(255,255,255,0.08)",
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
              Financial Portfolio
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              Valore complessivo di mercato
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
              {euroPrecise(data.summary.totalValue)}
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
                label={`${data.summary.positionCount} posizioni`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.16)",
                }}
              />

              <Chip
                label={`${data.summary.portfolioCount} portafogli`}
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
              title="Valore portafoglio"
              value={euro(data.summary.totalValue)}
              subtitle="Valore complessivo di mercato"
              icon={<ShowChartRoundedIcon />}
              tone="primary"
            />

            <KpiCard
              title="Posizioni"
              value={String(data.summary.positionCount)}
              subtitle={`${data.summary.portfolioCount} portafogli`}
              icon={<ViewListRoundedIcon />}
              tone="success"
            />

            <KpiCard
              title="Peso ETF"
              value={percentage(data.summary.etfWeight)}
              subtitle={`${data.summary.etfCount} ETF`}
              icon={<DonutLargeRoundedIcon />}
              tone="warning"
            />

            <KpiCard
              title="Concentrazione Top 5"
              value={percentage(
                data.summary.topFiveConcentration,
              )}
              subtitle={euro(data.summary.topFiveValue)}
              icon={<TrendingUpRoundedIcon />}
              tone="error"
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "1.1fr 1fr",
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
                Allocazione per portafoglio
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, mb: 3 }}
              >
                Distribuzione tra le diverse gestioni.
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2.4,
                }}
              >
                {data.portfolios.map((item) => (
                  <Box key={item.name}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 2,
                        mb: 0.8,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {item.name}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {item.positionCount} posizioni
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: "right" }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {euro(item.value)}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {percentage(item.weight)}
                        </Typography>
                      </Box>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={Math.min(item.weight, 100)}
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
                ))}
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
                Principali posizioni
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, mb: 2 }}
              >
                Prime cinque posizioni per valore.
              </Typography>

              {data.topPositions
                .slice(0, 5)
                .map((position, index) => (
                  <Box
                    key={position.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "34px minmax(0, 1fr) auto",
                      gap: 1.5,
                      alignItems: "center",
                      py: 1.5,
                      borderBottom:
                        index < 4
                          ? "1px solid"
                          : "none",
                      borderColor: "divider",
                    }}
                  >
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 2,
                        color: "primary.main",
                        backgroundColor: "primary.light",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {index + 1}
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontWeight: 700 }}
                      >
                        {position.name}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {position.portfolio}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700 }}
                      >
                        {euro(position.marketValue)}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {percentage(position.weight)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
            </Paper>
          </Box>

          <Paper
            elevation={0}
            sx={{
              mb: 2,
              p: 2.5,
              border: "1px solid",
              borderColor: "divider",
              boxShadow:
                "0 12px 32px rgba(26, 45, 75, 0.06)",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  lg: "minmax(250px, 1fr) 190px 190px auto",
                },
                gap: 2,
                alignItems: "center",
              }}
            >
              <TextField
                size="small"
                label="Cerca strumento"
                placeholder="Nome, ISIN, mercato..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <FormControl size="small">
                <InputLabel id="portfolio-filter-label">
                  Portafoglio
                </InputLabel>

                <Select
                  labelId="portfolio-filter-label"
                  label="Portafoglio"
                  value={portfolio}
                  onChange={(event) =>
                    setPortfolio(event.target.value)
                  }
                >
                  <MenuItem value="ALL">
                    Tutti
                  </MenuItem>

                  {data.portfolios.map((item) => (
                    <MenuItem
                      key={item.name}
                      value={item.name}
                    >
                      {item.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small">
                <InputLabel id="instrument-filter-label">
                  Strumento
                </InputLabel>

                <Select
                  labelId="instrument-filter-label"
                  label="Strumento"
                  value={instrumentType}
                  onChange={(event) =>
                    setInstrumentType(event.target.value)
                  }
                >
                  <MenuItem value="ALL">
                    Tutti
                  </MenuItem>

                  {data.instrumentTypes.map((item) => (
                    <MenuItem
                      key={item.name}
                      value={item.name}
                    >
                      {item.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  textAlign: {
                    xs: "left",
                    lg: "right",
                  },
                }}
              >
                {filteredPositions.length} risultati
              </Typography>
            </Box>
          </Paper>

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
                  <TableCell>Strumento</TableCell>
                  <TableCell>Portafoglio</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>ISIN</TableCell>
                  <TableCell align="right">
                    Quantità
                  </TableCell>
                  <TableCell align="right">
                    Prezzo
                  </TableCell>
                  <TableCell align="right">
                    Peso
                  </TableCell>
                  <TableCell align="right">
                    Valore
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visiblePositions.map((position) => (
                  <TableRow
                    key={position.id}
                    hover
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700 }}
                      >
                        {position.name}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {position.market ?? "Mercato n.d."}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={
                          position.portfolio === "IBKR"
                            ? "success"
                            : "primary"
                        }
                        label={position.portfolio}
                      />
                    </TableCell>

                    <TableCell>
                      {position.instrumentType}
                    </TableCell>

                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          fontSize: 12,
                        }}
                      >
                        {position.isin ?? "—"}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      {quantity(position.quantity)}
                    </TableCell>

                    <TableCell align="right">
                      {position.marketPrice === null
                        ? "—"
                        : euroPrecise(
                            position.marketPrice,
                          )}
                    </TableCell>

                    <TableCell align="right">
                      {percentage(position.weight)}
                    </TableCell>

                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 750 }}
                      >
                        {euroPrecise(
                          position.marketValue,
                        )}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}

                {visiblePositions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{ py: 6 }}
                    >
                      <Typography
                        color="text.secondary"
                      >
                        Nessuna posizione corrisponde ai
                        filtri selezionati.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <TablePagination
              component="div"
              count={filteredPositions.length}
              page={page}
              onPageChange={(_, newPage) =>
                setPage(newPage)
              }
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(
                  Number(event.target.value),
                );
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage="Righe per pagina"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} di ${count}`
              }
            />
          </TableContainer>
        </>
      )}
    </Box>
  );
}
