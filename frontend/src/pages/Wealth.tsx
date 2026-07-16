import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
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
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";

import KpiCard from "../components/KpiCard";
import {
  getWealthRegistry,
  type WealthPosition,
  type WealthRegistryResponse,
} from "../services/api";

type CategoryFilter =
  | "ALL"
  | "LIQUIDITY"
  | "INVESTMENT"
  | "REAL_ESTATE"
  | "OTHER_ASSET"
  | "LIABILITY";

const CATEGORY_LABELS: Record<string, string> = {
  LIQUIDITY: "Liquidità",
  INVESTMENT: "Investimenti",
  REAL_ESTATE: "Immobili",
  OTHER_ASSET: "Altri beni",
  LIABILITY: "Passività",
};

const SOURCE_LABELS: Record<string, string> = {
  EXCEL_GRESLERI2026: "Excel",
  USER_CONFIRMED_2026: "Confermato",
  PROVISIONAL_2026: "Provvisorio",
};

function categoryChipColor(category: string) {
  switch (category) {
    case "LIQUIDITY":
      return "success" as const;

    case "INVESTMENT":
      return "primary" as const;

    case "REAL_ESTATE":
      return "warning" as const;

    case "LIABILITY":
      return "error" as const;

    default:
      return "default" as const;
  }
}

export default function Wealth() {
  const [registry, setRegistry] =
    useState<WealthRegistryResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] =
    useState<CategoryFilter>("ALL");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  async function loadRegistry() {
    setLoading(true);
    setError("");

    try {
      const result = await getWealthRegistry();
      setRegistry(result);
    } catch (requestError) {
      console.error(requestError);
      setError(
        "Impossibile caricare il registro patrimoniale.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRegistry();
  }, []);

  const activePositions = useMemo(() => {
    return (
      registry?.positions.filter(
        (position) => position.status === "ACTIVE",
      ) ?? []
    );
  }, [registry]);

  const archivedCount = useMemo(() => {
    return (
      registry?.positions.filter(
        (position) => position.status !== "ACTIVE",
      ).length ?? 0
    );
  }, [registry]);

  const summary = useMemo(() => {
    let liquidity = 0;
    let investments = 0;
    let realEstate = 0;
    let otherAssets = 0;
    let liabilities = 0;

    for (const position of activePositions) {
      const value = Math.abs(position.valueBase);

      if (
        position.isLiability ||
        position.category === "LIABILITY"
      ) {
        liabilities += value;
        continue;
      }

      switch (position.category) {
        case "LIQUIDITY":
          liquidity += value;
          break;

        case "INVESTMENT":
          investments += value;
          break;

        case "REAL_ESTATE":
          realEstate += value;
          break;

        default:
          otherAssets += value;
      }
    }

    const grossAssets =
      liquidity +
      investments +
      realEstate +
      otherAssets;

    return {
      liquidity,
      investments,
      realEstate,
      otherAssets,
      liabilities,
      grossAssets,
      netWorth: grossAssets - liabilities,
    };
  }, [activePositions]);

  const filteredPositions = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return activePositions.filter((position) => {
      const matchesCategory =
        category === "ALL" ||
        position.category === category;

      const searchableText = [
        position.name,
        position.code,
        position.subcategory,
        position.country,
        position.currency,
        position.source,
        position.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [activePositions, category, search]);

  const visiblePositions = useMemo(() => {
    const start = page * rowsPerPage;

    return filteredPositions.slice(
      start,
      start + rowsPerPage,
    );
  }, [filteredPositions, page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [category, search]);

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

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("it-IT");

  const latestValuationDate = useMemo(() => {
    if (activePositions.length === 0) {
      return null;
    }

    return activePositions.reduce((latest, position) => {
      const current = new Date(position.valuationDate);

      return current > latest ? current : latest;
    }, new Date(activePositions[0].valuationDate));
  }, [activePositions]);

  if (loading && !registry) {
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
            Patrimonio
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Registro consolidato delle attività e delle
            passività familiari.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => void loadRegistry()}
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

      {registry && (
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
                "linear-gradient(120deg, #0A2B5B 0%, #174A9C 58%, #168C83 135%)",
              boxShadow:
                "0 18px 42px rgba(21, 61, 116, 0.18)",

              "&::after": {
                content: '""',
                position: "absolute",
                width: 300,
                height: 300,
                borderRadius: "50%",
                top: -180,
                right: -60,
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
              {registry.household.name}
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              Patrimonio netto consolidato
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
              {euroPrecise(summary.netWorth)}
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
                label={`${activePositions.length} posizioni attive`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.16)",
                }}
              />

              {latestValuationDate && (
                <Chip
                  label={`Valori al ${latestValuationDate.toLocaleDateString(
                    "it-IT",
                  )}`}
                  sx={{
                    color: "white",
                    backgroundColor:
                      "rgba(255,255,255,0.16)",
                  }}
                />
              )}

              <Chip
                label={`Attività lorde ${euro(
                  summary.grossAssets,
                )}`}
                sx={{
                  color: "white",
                  backgroundColor:
                    "rgba(255,255,255,0.16)",
                }}
              />
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
              title="Liquidità"
              value={euro(summary.liquidity)}
              subtitle="Conti bancari e disponibilità"
              icon={
                <AccountBalanceWalletRoundedIcon />
              }
              tone="success"
            />

            <KpiCard
              title="Investimenti"
              value={euro(summary.investments)}
              subtitle="Fondi ed ETF a valore di mercato"
              icon={<ShowChartRoundedIcon />}
              tone="primary"
            />

            <KpiCard
              title="Immobili"
              value={euro(summary.realEstate)}
              subtitle="Valore immobiliare lordo"
              icon={<HomeWorkRoundedIcon />}
              tone="warning"
            />

            <KpiCard
              title="Passività"
              value={euro(summary.liabilities)}
              subtitle="Mutui e impegni residui"
              icon={<CreditCardRoundedIcon />}
              tone="error"
            />
          </Box>

          {archivedCount > 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {archivedCount} posizioni storiche o
              provvisorie sono archiviate e non vengono
              incluse nei totali.
            </Alert>
          )}

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
                  md: "minmax(250px, 1fr) 230px auto",
                },
                gap: 2,
                alignItems: "center",
              }}
            >
              <TextField
                size="small"
                label="Cerca posizione"
                placeholder="Nome, ISIN, paese, portafoglio..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <FormControl size="small">
                <InputLabel id="wealth-category-label">
                  Categoria
                </InputLabel>

                <Select
                  labelId="wealth-category-label"
                  label="Categoria"
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target
                        .value as CategoryFilter,
                    )
                  }
                >
                  <MenuItem value="ALL">
                    Tutte
                  </MenuItem>

                  <MenuItem value="LIQUIDITY">
                    Liquidità
                  </MenuItem>

                  <MenuItem value="INVESTMENT">
                    Investimenti
                  </MenuItem>

                  <MenuItem value="REAL_ESTATE">
                    Immobili
                  </MenuItem>

                  <MenuItem value="OTHER_ASSET">
                    Altri beni
                  </MenuItem>

                  <MenuItem value="LIABILITY">
                    Passività
                  </MenuItem>
                </Select>
              </FormControl>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  textAlign: {
                    xs: "left",
                    md: "right",
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
                  <TableCell>Posizione</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Paese</TableCell>
                  <TableCell>Fonte</TableCell>
                  <TableCell>Valutazione</TableCell>
                  <TableCell align="right">
                    Valore
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visiblePositions.map(
                  (position: WealthPosition) => (
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
                          sx={{
                            display: "block",
                            mt: 0.35,
                          }}
                        >
                          {position.subcategory ??
                            position.code}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={categoryChipColor(
                            position.category,
                          )}
                          label={
                            CATEGORY_LABELS[
                              position.category
                            ] ?? position.category
                          }
                        />
                      </TableCell>

                      <TableCell>
                        {position.country ?? "—"}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {SOURCE_LABELS[
                            position.source
                          ] ?? position.source}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {formatDate(
                          position.valuationDate,
                        )}
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 750,
                            color: position.isLiability
                              ? "error.main"
                              : "text.primary",
                          }}
                        >
                          {position.isLiability
                            ? "− "
                            : ""}
                          {euroPrecise(
                            Math.abs(
                              position.valueBase,
                            ),
                          )}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ),
                )}

                {visiblePositions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
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
              rowsPerPageOptions={[10, 25, 50, 100]}
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
