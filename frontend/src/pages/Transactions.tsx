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

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FilterAltOffRoundedIcon from "@mui/icons-material/FilterAltOffRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  createLedgerTransaction,
  getLedgerPositions,
  getLedgerTransactions,
  getLedgerTransactionSummary,
  getLedgerTransactionTypes,
  voidLedgerTransaction,
  type LedgerPositionOption,
  type LedgerTransaction,
  type LedgerTransactionSummary,
  type LedgerTransactionType,
} from "../services/api";

type FormState = {
  transactionDate: string;
  transactionType: string;
  positionCode: string;
  quantity: string;
  unitPrice: string;
  grossAmount: string;
  fees: string;
  taxes: string;
  currency: string;
  fxRateToBase: string;
  sourceAccountCode: string;
  destinationAccountCode: string;
  externalReference: string;
  notes: string;
};

type Notice = {
  severity:
    | "success"
    | "error"
    | "info"
    | "warning";
  text: string;
};

function localDate(): string {
  const now = new Date();

  const local = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60000,
  );

  return local
    .toISOString()
    .slice(0, 10);
}

function emptyForm(): FormState {
  return {
    transactionDate: localDate(),
    transactionType: "",
    positionCode: "",
    quantity: "",
    unitPrice: "",
    grossAmount: "",
    fees: "0",
    taxes: "0",
    currency: "EUR",
    fxRateToBase: "1",
    sourceAccountCode: "",
    destinationAccountCode: "",
    externalReference: "",
    notes: "",
  };
}

function parseDecimal(
  value: string,
): number {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  return Number(normalized);
}

function optionalDecimal(
  value: string,
): number | null {
  if (!value.trim()) {
    return null;
  }

  return parseDecimal(value);
}

function euro(value: number): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function transactionDate(
  value: string,
): string {
  return new Date(value).toLocaleDateString(
    "it-IT",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}

function directionLabel(
  direction: LedgerTransaction["direction"],
): string {
  if (direction === "INFLOW") {
    return "Entrata";
  }

  if (direction === "OUTFLOW") {
    return "Uscita";
  }

  return "Trasferimento";
}

function directionColor(
  direction: LedgerTransaction["direction"],
): "success" | "error" | "info" {
  if (direction === "INFLOW") {
    return "success";
  }

  if (direction === "OUTFLOW") {
    return "error";
  }

  return "info";
}

function transactionStatusLabel(
  status: string,
): string {
  if (status === "POSTED") {
    return "Registrato";
  }

  if (status === "VOIDED") {
    return "Annullato";
  }

  return status;
}

function transactionStatusColor(
  status: string,
): "primary" | "default" | "warning" {
  if (status === "POSTED") {
    return "primary";
  }

  if (status === "VOIDED") {
    return "default";
  }

  return "warning";
}

function csvCell(
  value: string | number | null,
): string {
  const normalized =
    value === null ? "" : String(value);

  return `"${normalized.replace(
    /"/g,
    '""',
  )}"`;
}

function csvNumber(
  value: number,
): string {
  return value.toLocaleString(
    "it-IT",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false,
    },
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  subtitle: string;
};

function SummaryCard({
  label,
  value,
  subtitle,
}: SummaryCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.4,
        minHeight: 118,
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
          mt: 0.7,
          fontWeight: 750,
        }}
      >
        {value}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.5 }}
      >
        {subtitle}
      </Typography>
    </Paper>
  );
}

export default function Transactions() {
  const [types, setTypes] =
    useState<LedgerTransactionType[]>([]);

  const [positions, setPositions] =
    useState<LedgerPositionOption[]>([]);

  const [transactions, setTransactions] =
    useState<LedgerTransaction[]>([]);

  const [summary, setSummary] =
    useState<LedgerTransactionSummary | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [formOpen, setFormOpen] =
    useState(false);

  const [confirmationOpen, setConfirmationOpen] =
    useState(false);

  const [voidingTransaction, setVoidingTransaction] =
    useState<LedgerTransaction | null>(
      null,
    );

  const [voidReason, setVoidReason] =
    useState("");

  const [voiding, setVoiding] =
    useState(false);

  const [form, setForm] =
    useState<FormState>(emptyForm());

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("");

  const [directionFilter, setDirectionFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  const loadData = useCallback(
    async () => {
      setLoading(true);

      try {
        const [
          typeResult,
          positionResult,
          transactionResult,
          summaryResult,
        ] = await Promise.all([
          getLedgerTransactionTypes(),
          getLedgerPositions(),
          getLedgerTransactions(500),
          getLedgerTransactionSummary(),
        ]);

        setTypes(typeResult.types);
        setPositions(positionResult.positions);
        setTransactions(
          transactionResult.transactions,
        );
        setSummary(summaryResult);
      } catch (error) {
        console.error(error);

        setNotice({
          severity: "error",
          text:
            "Impossibile caricare il Registro Movimenti.",
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

  const transactionTypeLabels =
    useMemo(
      () =>
        new Map(
          types.map((type) => [
            type.code,
            type.label,
          ]),
        ),
      [types],
    );

  const filteredTransactions =
    useMemo(() => {
      const normalizedSearch =
        searchQuery
          .trim()
          .toLowerCase();

      return transactions.filter(
        (transaction) => {
          if (
            typeFilter &&
            transaction.transactionType !==
              typeFilter
          ) {
            return false;
          }

          if (
            directionFilter &&
            transaction.direction !==
              directionFilter
          ) {
            return false;
          }

          if (
            statusFilter &&
            transaction.status !==
              statusFilter
          ) {
            return false;
          }

          const operationDate =
            transaction.transactionDate
              .slice(0, 10);

          if (
            dateFrom &&
            operationDate < dateFrom
          ) {
            return false;
          }

          if (
            dateTo &&
            operationDate > dateTo
          ) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          const searchableText = [
            transaction.transactionType,
            transactionTypeLabels.get(
              transaction.transactionType,
            ),
            transaction.position?.name,
            transaction.position?.code,
            transaction.notes,
            transaction.voidReason,
            transaction.externalReference,
            transaction.sourceAccountCode,
            transaction.destinationAccountCode,
            transaction.currency,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            normalizedSearch,
          );
        },
      );
    }, [
      transactions,
      transactionTypeLabels,
      searchQuery,
      typeFilter,
      directionFilter,
      statusFilter,
      dateFrom,
      dateTo,
    ]);

  function clearFilters() {
    setSearchQuery("");
    setTypeFilter("");
    setDirectionFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  }

  function exportTransactions() {
    if (
      filteredTransactions.length === 0
    ) {
      setNotice({
        severity: "info",
        text:
          "Nessun movimento disponibile per l’esportazione.",
      });

      return;
    }

    const header = [
      "Data",
      "Tipo",
      "Posizione",
      "Codice posizione",
      "Direzione",
      "Stato",
      "Importo lordo",
      "Commissioni",
      "Imposte",
      "Importo netto",
      "Valuta",
      "Cambio EUR",
      "Importo base EUR",
      "Conto origine",
      "Conto destinazione",
      "Riferimento esterno",
      "Note",
      "Motivo annullamento",
    ];

    const rows =
      filteredTransactions.map(
        (transaction) => [
          transaction.transactionDate
            .slice(0, 10),

          transactionTypeLabels.get(
            transaction.transactionType,
          ) ??
            transaction.transactionType,

          transaction.position?.name ??
            "",

          transaction.position?.code ??
            "",

          directionLabel(
            transaction.direction,
          ),

          transactionStatusLabel(
            transaction.status,
          ),

          csvNumber(
            transaction.grossAmount,
          ),

          csvNumber(
            transaction.fees,
          ),

          csvNumber(
            transaction.taxes,
          ),

          csvNumber(
            transaction.netAmount,
          ),

          transaction.currency,

          transaction.fxRateToBase ===
          null
            ? ""
            : csvNumber(
                transaction.fxRateToBase,
              ),

          csvNumber(
            transaction.baseAmount,
          ),

          transaction.sourceAccountCode ??
            "",

          transaction
            .destinationAccountCode ??
            "",

          transaction.externalReference ??
            "",

          transaction.notes ?? "",

          transaction.voidReason ?? "",
        ],
      );

    const csv = [
      header,
      ...rows,
    ]
      .map((row) =>
        row.map(csvCell).join(";"),
      )
      .join("\n");

    const blob = new Blob(
      ["\ufeff" + csv],
      {
        type:
          "text/csv;charset=utf-8;",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      `gfo-registro-movimenti-${localDate()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function updateForm(
    field: keyof FormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openForm() {
    setForm(emptyForm());
    setNotice(null);
    setFormOpen(true);
  }

  function validateForm(): string | null {
    if (!form.transactionType) {
      return "Selezionare il tipo di operazione.";
    }

    if (
      !form.transactionDate ||
      Number.isNaN(
        new Date(
          form.transactionDate,
        ).getTime(),
      )
    ) {
      return "Inserire una data valida.";
    }

    const grossAmount =
      parseDecimal(form.grossAmount);

    if (
      !Number.isFinite(grossAmount) ||
      grossAmount <= 0
    ) {
      return "L’importo lordo deve essere maggiore di zero.";
    }

    if (
      form.currency.trim().length !== 3
    ) {
      return "La valuta deve avere tre lettere.";
    }

    if (
      form.currency.toUpperCase() !==
      "EUR"
    ) {
      const fxRate =
        parseDecimal(form.fxRateToBase);

      if (
        !Number.isFinite(fxRate) ||
        fxRate <= 0
      ) {
        return "Inserire un cambio valido verso EUR.";
      }
    }

    if (
      form.transactionType === "TRANSFER" &&
      (
        !form.sourceAccountCode.trim() ||
        !form.destinationAccountCode.trim()
      )
    ) {
      return "Il trasferimento richiede conto di origine e destinazione.";
    }

    return null;
  }

  function requestConfirmation() {
    const validationError =
      validateForm();

    if (validationError) {
      setNotice({
        severity: "warning",
        text: validationError,
      });

      return;
    }

    setConfirmationOpen(true);
  }

  async function saveTransaction() {
    setSaving(true);
    setNotice(null);

    try {
      const result =
        await createLedgerTransaction({
          confirm: true,

          transactionDate:
            form.transactionDate,

          transactionType:
            form.transactionType,

          positionCode:
            form.positionCode || null,

          quantity:
            optionalDecimal(
              form.quantity,
            ),

          unitPrice:
            optionalDecimal(
              form.unitPrice,
            ),

          grossAmount:
            parseDecimal(
              form.grossAmount,
            ),

          fees:
            optionalDecimal(form.fees) ??
            0,

          taxes:
            optionalDecimal(form.taxes) ??
            0,

          currency:
            form.currency
              .trim()
              .toUpperCase(),

          fxRateToBase:
            form.currency
              .trim()
              .toUpperCase() === "EUR"
              ? 1
              : parseDecimal(
                  form.fxRateToBase,
                ),

          sourceAccountCode:
            form.sourceAccountCode ||
            null,

          destinationAccountCode:
            form.destinationAccountCode ||
            null,

          source: "MANUAL_UI",

          externalReference:
            form.externalReference ||
            null,

          notes:
            form.notes || null,
        });

      setConfirmationOpen(false);
      setFormOpen(false);

      setNotice({
        severity: "success",
        text:
          `Movimento registrato correttamente: ${result.transaction.transactionType}.`,
      });

      await loadData();
    } catch (error) {
      console.error(error);

      setConfirmationOpen(false);

      setNotice({
        severity: "error",
        text:
          "Il movimento non è stato registrato. Controllare i dati inseriti.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function voidSelectedTransaction() {
    if (!voidingTransaction) {
      return;
    }

    const normalizedReason =
      voidReason.trim();

    if (!normalizedReason) {
      setNotice({
        severity: "warning",
        text:
          "Indicare la motivazione dell’annullamento.",
      });

      return;
    }

    setVoiding(true);
    setNotice(null);

    try {
      await voidLedgerTransaction(
        voidingTransaction.id,
        normalizedReason,
      );

      setVoidingTransaction(null);
      setVoidReason("");

      setNotice({
        severity: "success",
        text:
          "Movimento annullato e conservato nell’audit trail.",
      });

      await loadData();
    } catch (error) {
      console.error(error);

      setNotice({
        severity: "error",
        text:
          "Il movimento non è stato annullato.",
      });
    } finally {
      setVoiding(false);
    }
  }

  if (loading && !summary) {
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

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
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
            <ReceiptLongRoundedIcon
              fontSize="large"
            />
            Registro Movimenti
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.7 }}
          >
            Operazioni finanziarie,
            patrimoniali e trasferimenti.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1.2,
          }}
        >
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

          <Button
            variant="outlined"
            startIcon={
              <DownloadRoundedIcon />
            }
            disabled={
              filteredTransactions.length ===
              0
            }
            onClick={exportTransactions}
          >
            Esporta CSV
          </Button>

          <Button
            variant="contained"
            startIcon={
              <AddRoundedIcon />
            }
            onClick={openForm}
          >
            Nuovo movimento
          </Button>
        </Box>
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
        <SummaryCard
          label="Movimenti"
          value={String(
            summary?.transactions ?? 0,
          )}
          subtitle="Operazioni registrate"
        />

        <SummaryCard
          label="Entrate"
          value={euro(
            summary?.inflows ?? 0,
          )}
          subtitle="Flussi in entrata"
        />

        <SummaryCard
          label="Uscite"
          value={euro(
            summary?.outflows ?? 0,
          )}
          subtitle="Flussi in uscita"
        />

        <SummaryCard
          label="Flusso netto"
          value={euro(
            summary?.netCashFlow ?? 0,
          )}
          subtitle={`Commissioni ${euro(
            summary?.fees ?? 0,
          )} · Imposte ${euro(
            summary?.taxes ?? 0,
          )}`}
        />
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md:
                "repeat(3, minmax(0, 1fr))",
              xl:
                "repeat(6, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          <TextField
            label="Cerca"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value,
              )
            }
            placeholder="Posizione, note, conto..."
          />

          <TextField
            select
            label="Tipo operazione"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value,
              )
            }
          >
            <MenuItem value="">
              Tutti
            </MenuItem>

            {types.map((type) => (
              <MenuItem
                key={type.code}
                value={type.code}
              >
                {type.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Direzione"
            value={directionFilter}
            onChange={(event) =>
              setDirectionFilter(
                event.target.value,
              )
            }
          >
            <MenuItem value="">
              Tutte
            </MenuItem>
            <MenuItem value="INFLOW">
              Entrata
            </MenuItem>
            <MenuItem value="OUTFLOW">
              Uscita
            </MenuItem>
            <MenuItem value="TRANSFER">
              Trasferimento
            </MenuItem>
          </TextField>

          <TextField
            select
            label="Stato"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
          >
            <MenuItem value="">
              Tutti
            </MenuItem>
            <MenuItem value="POSTED">
              Registrati
            </MenuItem>
            <MenuItem value="VOIDED">
              Annullati
            </MenuItem>
          </TextField>

          <TextField
            label="Dal"
            type="date"
            value={dateFrom}
            onChange={(event) =>
              setDateFrom(
                event.target.value,
              )
            }
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />

          <TextField
            label="Al"
            type="date"
            value={dateTo}
            onChange={(event) =>
              setDateTo(
                event.target.value,
              )
            }
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 2,
            mt: 2,
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {filteredTransactions.length} di{" "}
            {transactions.length} movimenti
          </Typography>

          <Button
            size="small"
            startIcon={
              <FilterAltOffRoundedIcon />
            }
            onClick={clearFilters}
          >
            Azzera filtri
          </Button>
        </Box>
      </Paper>

      <Typography
        variant="h6"
        sx={{ mb: 1.5 }}
      >
        Operazioni registrate
      </Typography>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: "65vh",

          "&::-webkit-scrollbar": {
            height: 10,
            width: 10,
          },

          "&::-webkit-scrollbar-thumb": {
            backgroundColor:
              "rgba(26, 45, 75, 0.28)",
            borderRadius: 10,
          },
        }}
      >
        <Table
          stickyHeader
          sx={{
            minWidth: 1720,

            "& th, & td": {
              verticalAlign: "top",
            },

            "& th:nth-of-type(1), & td:nth-of-type(1)": {
              minWidth: 105,
              whiteSpace: "nowrap",
            },

            "& th:nth-of-type(2), & td:nth-of-type(2)": {
              minWidth: 135,
            },

            "& th:nth-of-type(3), & td:nth-of-type(3)": {
              minWidth: 170,
            },

            "& th:nth-of-type(4), & td:nth-of-type(4)": {
              minWidth: 105,
            },

            "& th:nth-of-type(5), & td:nth-of-type(5)": {
              minWidth: 105,
            },

            "& th:nth-of-type(6), & td:nth-of-type(6), & th:nth-of-type(7), & td:nth-of-type(7), & th:nth-of-type(8), & td:nth-of-type(8), & th:nth-of-type(9), & td:nth-of-type(9)": {
              minWidth: 115,
              whiteSpace: "nowrap",
            },

            "& th:nth-of-type(10), & td:nth-of-type(10)": {
              minWidth: 430,
              maxWidth: 520,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              lineHeight: 1.4,
            },

            "& th:nth-of-type(11), & td:nth-of-type(11)": {
              minWidth: 115,
              whiteSpace: "nowrap",
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Operazione</TableCell>
              <TableCell>Posizione</TableCell>
              <TableCell>Direzione</TableCell>
              <TableCell>Stato</TableCell>
              <TableCell align="right">
                Importo lordo
              </TableCell>
              <TableCell align="right">
                Commissioni
              </TableCell>
              <TableCell align="right">
                Imposte
              </TableCell>
              <TableCell align="right">
                Importo base
              </TableCell>
              <TableCell>Note</TableCell>
              <TableCell align="right">
                Azioni
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  align="center"
                  sx={{
                    py: 6,
                    color:
                      "text.secondary",
                  }}
                >
                  Nessun movimento corrisponde ai filtri selezionati.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map(
                (transaction) => (
                  <TableRow
                    key={transaction.id}
                    hover
                  >
                    <TableCell>
                      {transactionDate(
                        transaction.transactionDate,
                      )}
                    </TableCell>

                    <TableCell>
                      {transactionTypeLabels.get(
                        transaction.transactionType,
                      ) ??
                        transaction.transactionType}
                    </TableCell>

                    <TableCell>
                      {transaction.position
                        ?.name ?? "—"}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        color={directionColor(
                          transaction.direction,
                        )}
                        label={directionLabel(
                          transaction.direction,
                        )}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        color={transactionStatusColor(
                          transaction.status,
                        )}
                        label={transactionStatusLabel(
                          transaction.status,
                        )}
                        variant={
                          transaction.status ===
                          "VOIDED"
                            ? "outlined"
                            : "filled"
                        }
                      />
                    </TableCell>

                    <TableCell align="right">
                      {transaction.grossAmount.toLocaleString(
                        "it-IT",
                        {
                          style: "currency",
                          currency:
                            transaction.currency,
                        },
                      )}
                    </TableCell>

                    <TableCell align="right">
                      {transaction.fees.toLocaleString(
                        "it-IT",
                        {
                          style: "currency",
                          currency:
                            transaction.currency,
                        },
                      )}
                    </TableCell>

                    <TableCell align="right">
                      {transaction.taxes.toLocaleString(
                        "it-IT",
                        {
                          style: "currency",
                          currency:
                            transaction.currency,
                        },
                      )}
                    </TableCell>

                    <TableCell align="right">
                      {euro(
                        transaction.baseAmount,
                      )}
                    </TableCell>

                    <TableCell>
                      {transaction.status ===
                      "VOIDED"
                        ? transaction.voidReason ??
                          "Movimento annullato"
                        : transaction.notes ?? "—"}
                    </TableCell>

                    <TableCell align="right">
                      {transaction.status ===
                      "POSTED" ? (
                        <Button
                          size="small"
                          color="error"
                          startIcon={
                            <BlockRoundedIcon />
                          }
                          onClick={() => {
                            setVoidReason("");
                            setVoidingTransaction(
                              transaction,
                            );
                          }}
                        >
                          Annulla
                        </Button>
                      ) : (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Conservato
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ),
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={formOpen}
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
          }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Nuovo movimento
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md:
                  "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
              pt: 1,
            }}
          >
            <TextField
              label="Data operazione"
              type="date"
              value={form.transactionDate}
              onChange={(event) =>
                updateForm(
                  "transactionDate",
                  event.target.value,
                )
              }
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              required
            />

            <TextField
              select
              label="Tipo operazione"
              value={form.transactionType}
              onChange={(event) =>
                updateForm(
                  "transactionType",
                  event.target.value,
                )
              }
              required
            >
              {types.map((type) => (
                <MenuItem
                  key={type.code}
                  value={type.code}
                >
                  {type.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Posizione collegata"
              value={form.positionCode}
              onChange={(event) =>
                updateForm(
                  "positionCode",
                  event.target.value,
                )
              }
            >
              <MenuItem value="">
                Nessuna posizione
              </MenuItem>

              {positions.map((position) => (
                <MenuItem
                  key={position.code}
                  value={position.code}
                >
                  {position.name} —{" "}
                  {position.category}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Importo lordo"
              value={form.grossAmount}
              onChange={(event) =>
                updateForm(
                  "grossAmount",
                  event.target.value,
                )
              }
              inputMode="decimal"
              required
            />

            <TextField
              label="Quantità"
              value={form.quantity}
              onChange={(event) =>
                updateForm(
                  "quantity",
                  event.target.value,
                )
              }
              inputMode="decimal"
            />

            <TextField
              label="Prezzo unitario"
              value={form.unitPrice}
              onChange={(event) =>
                updateForm(
                  "unitPrice",
                  event.target.value,
                )
              }
              inputMode="decimal"
            />

            <TextField
              label="Commissioni"
              value={form.fees}
              onChange={(event) =>
                updateForm(
                  "fees",
                  event.target.value,
                )
              }
              inputMode="decimal"
            />

            <TextField
              label="Imposte"
              value={form.taxes}
              onChange={(event) =>
                updateForm(
                  "taxes",
                  event.target.value,
                )
              }
              inputMode="decimal"
            />

            <TextField
              label="Valuta"
              value={form.currency}
              onChange={(event) =>
                updateForm(
                  "currency",
                  event.target.value
                    .toUpperCase(),
                )
              }
              slotProps={{
                htmlInput: {
                  maxLength: 3,
                },
              }}
              required
            />

            <TextField
              label="Cambio verso EUR"
              value={form.fxRateToBase}
              onChange={(event) =>
                updateForm(
                  "fxRateToBase",
                  event.target.value,
                )
              }
              inputMode="decimal"
              disabled={
                form.currency
                  .trim()
                  .toUpperCase() === "EUR"
              }
            />

            <TextField
              label="Conto di origine"
              value={form.sourceAccountCode}
              onChange={(event) =>
                updateForm(
                  "sourceAccountCode",
                  event.target.value,
                )
              }
            />

            <TextField
              label="Conto di destinazione"
              value={
                form.destinationAccountCode
              }
              onChange={(event) =>
                updateForm(
                  "destinationAccountCode",
                  event.target.value,
                )
              }
            />

            <TextField
              label="Riferimento esterno"
              value={
                form.externalReference
              }
              onChange={(event) =>
                updateForm(
                  "externalReference",
                  event.target.value,
                )
              }
            />

            <TextField
              label="Note"
              value={form.notes}
              onChange={(event) =>
                updateForm(
                  "notes",
                  event.target.value,
                )
              }
              multiline
              minRows={2}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={saving}
            onClick={() =>
              setFormOpen(false)
            }
          >
            Annulla
          </Button>

          <Button
            variant="contained"
            disabled={saving}
            onClick={requestConfirmation}
          >
            Registra movimento
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmationOpen}
        onClose={() => {
          if (!saving) {
            setConfirmationOpen(false);
          }
        }}
      >
        <DialogTitle>
          Confermare il movimento?
        </DialogTitle>

        <DialogContent>
          <DialogContentText>
            L’operazione verrà registrata
            definitivamente nel Patrimonial
            Ledger. Non modificherà
            automaticamente il valore corrente
            delle posizioni.
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={saving}
            onClick={() =>
              setConfirmationOpen(false)
            }
          >
            Indietro
          </Button>

          <Button
            variant="contained"
            disabled={saving}
            onClick={() =>
              void saveTransaction()
            }
          >
            {saving
              ? "Registrazione..."
              : "Conferma"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={voidingTransaction !== null}
        onClose={() => {
          if (!voiding) {
            setVoidingTransaction(null);
            setVoidReason("");
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Annullare il movimento?
        </DialogTitle>

        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Il movimento resterà nel registro
            con stato “Annullato”. Non verrà
            cancellato dal database.
          </DialogContentText>

          <TextField
            label="Motivazione dell’annullamento"
            value={voidReason}
            onChange={(event) =>
              setVoidReason(
                event.target.value,
              )
            }
            multiline
            minRows={3}
            fullWidth
            required
            autoFocus
          />
        </DialogContent>

        <DialogActions>
          <Button
            disabled={voiding}
            onClick={() => {
              setVoidingTransaction(null);
              setVoidReason("");
            }}
          >
            Indietro
          </Button>

          <Button
            variant="contained"
            color="error"
            disabled={
              voiding ||
              !voidReason.trim()
            }
            onClick={() =>
              void voidSelectedTransaction()
            }
          >
            {voiding
              ? "Annullamento..."
              : "Conferma annullamento"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
