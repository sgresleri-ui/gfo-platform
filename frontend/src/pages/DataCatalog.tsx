import { useCallback, useEffect, useMemo, useState } from "react";
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
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import GridOnRoundedIcon from "@mui/icons-material/GridOnRounded";

import { analyzeWorkbook } from "../services/api";

type Worksheet = {
  index: number;
  name: string;
  rows: number;
  columns: number;
  cells: number;
  status: string;
};

type CatalogResponse = {
  success: boolean;
  workbook: string;
  sheetCount: number;
  worksheets: Worksheet[];
  message?: string;
};

export default function DataCatalog() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = (await analyzeWorkbook()) as CatalogResponse;

      if (!result.success) {
        throw new Error(result.message || "Analisi del workbook non riuscita.");
      }

      setCatalog(result);
    } catch (requestError) {
      console.error(requestError);
      setError("Impossibile analizzare il workbook.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const totalCells = useMemo(() => {
    return (
      catalog?.worksheets.reduce((sum, sheet) => sum + sheet.cells, 0) ?? 0
    );
  }, [catalog]);

  if (loading && !catalog) {
    return (
      <Box sx={{ minHeight: 420, display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4">Data Catalog</Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Inventario tecnico e stato dei fogli del workbook ufficiale.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => void loadCatalog()}
          disabled={loading}
        >
          {loading ? "Analisi..." : "Rianalizza Excel"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {catalog && (
        <>
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              p: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 12px 32px rgba(26, 45, 75, 0.06)",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "2fr repeat(3, minmax(130px, 1fr))",
                },
                gap: 3,
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 54,
                    height: 54,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 3,
                    color: "primary.main",
                    backgroundColor: "primary.light",
                  }}
                >
                  <DescriptionRoundedIcon />
                </Box>

                <Box>
                  <Typography variant="h6">{catalog.workbook}</Typography>

                  <Typography variant="body2" color="text.secondary">
                    Workbook ufficiale GFO
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Fogli
                </Typography>

                <Typography variant="h5">{catalog.sheetCount}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Celle catalogate
                </Typography>

                <Typography variant="h5">
                  {totalCells.toLocaleString("it-IT")}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Stato
                </Typography>

                <Box sx={{ mt: 0.5 }}>
                  <Chip label="Operativo" color="success" size="small" />
                </Box>
              </Box>
            </Box>
          </Paper>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 12px 32px rgba(26, 45, 75, 0.06)",
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={72}>#</TableCell>
                  <TableCell>Foglio</TableCell>
                  <TableCell align="right">Righe</TableCell>
                  <TableCell align="right">Colonne</TableCell>
                  <TableCell align="right">Celle</TableCell>
                  <TableCell align="center">Stato</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {catalog.worksheets.map((sheet) => (
                  <TableRow
                    key={sheet.index}
                    hover
                    sx={{
                      "&:last-child td": {
                        borderBottom: 0,
                      },
                    }}
                  >
                    <TableCell>{sheet.index}</TableCell>

                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.2,
                        }}
                      >
                        <TableChartRoundedIcon
                          sx={{
                            color: "primary.main",
                            fontSize: 20,
                          }}
                        />

                        <Typography variant="body2" sx={{ fontWeight: 650 }}>
                          {sheet.name}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="right">
                      {sheet.rows.toLocaleString("it-IT")}
                    </TableCell>

                    <TableCell align="right">
                      {sheet.columns.toLocaleString("it-IT")}
                    </TableCell>

                    <TableCell align="right">
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.8,
                        }}
                      >
                        <GridOnRoundedIcon
                          sx={{ fontSize: 16, color: "text.secondary" }}
                        />

                        {sheet.cells.toLocaleString("it-IT")}
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={sheet.status}
                        color="success"
                        variant="outlined"
                        size="small"
                      />
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