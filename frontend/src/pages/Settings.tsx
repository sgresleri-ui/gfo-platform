import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import CurrencyExchangeRoundedIcon from "@mui/icons-material/CurrencyExchangeRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import CloudOffRoundedIcon from "@mui/icons-material/CloudOffRounded";

import KpiCard from "../components/KpiCard";

import {
  getBudgetOverview,
  getPropertiesOverview,
} from "../services/api";

type PlatformSettings = {
  householdName: string;
  ownerName: string;
  baseCurrency: string;
  timezone: string;
  fiscalResidence: string;
  plannedFiscalResidence: string;
  sourceWorkbook: string;
  dataFolder: string;
  automaticRefresh: boolean;
  showArchivedPositions: boolean;
  requireDecisionNotes: boolean;
};

type ConnectionStatus = {
  backendOnline: boolean;
  budgetAsOfDate: string | null;
  propertiesAsOfDate: string | null;
};

const STORAGE_KEY = "gfo-platform-settings";

const DEFAULT_SETTINGS: PlatformSettings = {
  householdName: "Family Office – Stefano Gresleri",
  ownerName: "Stefano Gresleri",
  baseCurrency: "EUR",
  timezone: "Europe/Madrid",
  fiscalResidence: "Spain",
  plannedFiscalResidence: "United Arab Emirates",
  sourceWorkbook: "Gresleri2026.xlsm",
  dataFolder: "/data",
  automaticRefresh: true,
  showArchivedPositions: false,
  requireDecisionNotes: true,
};

function readStoredSettings(): PlatformSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(
      stored,
    ) as Partial<PlatformSettings>;

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function Settings() {
  const [settings, setSettings] =
    useState<PlatformSettings>(
      readStoredSettings,
    );

  const [connection, setConnection] =
    useState<ConnectionStatus>({
      backendOnline: false,
      budgetAsOfDate: null,
      propertiesAsOfDate: null,
    });

  const [checking, setChecking] =
    useState(true);

  const [saved, setSaved] =
    useState(false);

  const [error, setError] =
    useState("");

  async function checkConnection() {
    setChecking(true);
    setError("");

    const [budgetResult, propertiesResult] =
      await Promise.allSettled([
        getBudgetOverview(),
        getPropertiesOverview(),
      ]);

    const backendOnline =
      budgetResult.status === "fulfilled" ||
      propertiesResult.status ===
        "fulfilled";

    setConnection({
      backendOnline,
      budgetAsOfDate:
        budgetResult.status === "fulfilled"
          ? budgetResult.value.asOfDate
          : null,
      propertiesAsOfDate:
        propertiesResult.status ===
        "fulfilled"
          ? propertiesResult.value.asOfDate
          : null,
    });

    if (!backendOnline) {
      setError(
        "Il backend non risponde. Verificare che NestJS sia attivo sulla porta 3000.",
      );
    }

    setChecking(false);
  }

  useEffect(() => {
    void checkConnection();
  }, []);

  function updateSetting<
    Key extends keyof PlatformSettings,
  >(
    key: Key,
    value: PlatformSettings[Key],
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setSaved(false);
  }

  function saveSettings() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings),
    );

    setSaved(true);
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(DEFAULT_SETTINGS),
    );

    setSaved(true);
  }

  function formatDate(
    value: string | null,
  ) {
    if (!value) {
      return "Non disponibile";
    }

    return new Date(
      value,
    ).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: {
            xs: "flex-start",
            md: "center",
          },
          justifyContent: "space-between",
          flexDirection: {
            xs: "column",
            md: "row",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4">
            Impostazioni
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Configurazione generale del
            Family Office e delle sorgenti dati.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1.2,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="outlined"
            startIcon={
              <RestartAltRoundedIcon />
            }
            onClick={resetSettings}
          >
            Ripristina
          </Button>

          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            onClick={saveSettings}
          >
            Salva
          </Button>
        </Box>
      </Box>

      {saved && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
        >
          Impostazioni salvate correttamente
          nel browser.
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

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
            "linear-gradient(120deg, #26384E 0%, #415D78 55%, #66839D 135%)",
          boxShadow:
            "0 18px 42px rgba(38, 56, 78, 0.23)",

          "&::after": {
            content: '""',
            position: "absolute",
            width: 330,
            height: 330,
            borderRadius: "50%",
            top: -205,
            right: -55,
            backgroundColor:
              "rgba(255,255,255,0.10)",
          },
        }}
      >
        <Typography
          variant="overline"
          sx={{
            color:
              "rgba(255,255,255,0.72)",
            letterSpacing: "0.15em",
          }}
        >
          Platform Configuration
        </Typography>

        <Typography
          sx={{
            mt: 1,
            color:
              "rgba(255,255,255,0.76)",
          }}
        >
          Ambiente operativo
        </Typography>

        <Typography
          sx={{
            mt: 0.5,
            fontSize: {
              xs: "2rem",
              md: "2.8rem",
            },
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          {settings.householdName}
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
            label={`Valuta ${settings.baseCurrency}`}
            sx={{
              color: "white",
              backgroundColor:
                "rgba(255,255,255,0.17)",
            }}
          />

          <Chip
            label={settings.sourceWorkbook}
            sx={{
              color: "white",
              backgroundColor:
                "rgba(255,255,255,0.17)",
            }}
          />

          <Chip
            label={
              connection.backendOnline
                ? "Backend connesso"
                : "Backend non disponibile"
            }
            sx={{
              color: "white",
              backgroundColor:
                "rgba(255,255,255,0.17)",
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
          title="Valuta base"
          value={settings.baseCurrency}
          subtitle="Valuta consolidata"
          icon={
            <CurrencyExchangeRoundedIcon />
          }
          tone="primary"
        />

        <KpiCard
          title="Residenza fiscale"
          value={settings.fiscalResidence}
          subtitle="Configurazione corrente"
          icon={
            <AccountBalanceRoundedIcon />
          }
          tone="warning"
        />

        <KpiCard
          title="Sorgente dati"
          value={settings.sourceWorkbook}
          subtitle={settings.dataFolder}
          icon={<StorageRoundedIcon />}
          tone="success"
        />

        <KpiCard
          title="Backend"
          value={
            checking
              ? "Verifica..."
              : connection.backendOnline
                ? "Online"
                : "Offline"
          }
          subtitle="localhost:3000"
          icon={
            connection.backendOnline ? (
              <CloudDoneRoundedIcon />
            ) : (
              <CloudOffRoundedIcon />
            )
          }
          tone={
            connection.backendOnline
              ? "success"
              : "error"
          }
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "repeat(2, minmax(0, 1fr))",
          },
          gap: 2.5,
          mb: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: {
              xs: 2.5,
              md: 3.5,
            },
            border: "1px solid",
            borderColor: "divider",
            boxShadow:
              "0 12px 32px rgba(26,45,75,0.06)",
          }}
        >
          <Typography
            variant="h6"
            sx={{ mb: 0.5 }}
          >
            Family Office
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Informazioni generali del nucleo
            patrimoniale.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gap: 2.2,
            }}
          >
            <TextField
              label="Nome Family Office"
              value={settings.householdName}
              onChange={(event) =>
                updateSetting(
                  "householdName",
                  event.target.value,
                )
              }
              fullWidth
            />

            <TextField
              label="Responsabile"
              value={settings.ownerName}
              onChange={(event) =>
                updateSetting(
                  "ownerName",
                  event.target.value,
                )
              }
              fullWidth
            />

            <TextField
              select
              label="Fuso orario"
              value={settings.timezone}
              onChange={(event) =>
                updateSetting(
                  "timezone",
                  event.target.value,
                )
              }
              fullWidth
            >
              <MenuItem value="Europe/Madrid">
                Europe/Madrid
              </MenuItem>

              <MenuItem value="Europe/Rome">
                Europe/Rome
              </MenuItem>

              <MenuItem value="Asia/Dubai">
                Asia/Dubai
              </MenuItem>
            </TextField>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: {
              xs: 2.5,
              md: 3.5,
            },
            border: "1px solid",
            borderColor: "divider",
            boxShadow:
              "0 12px 32px rgba(26,45,75,0.06)",
          }}
        >
          <Typography
            variant="h6"
            sx={{ mb: 0.5 }}
          >
            Configurazione finanziaria
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Valuta e riferimenti fiscali della
            piattaforma.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gap: 2.2,
            }}
          >
            <TextField
              select
              label="Valuta base"
              value={settings.baseCurrency}
              onChange={(event) =>
                updateSetting(
                  "baseCurrency",
                  event.target.value,
                )
              }
              fullWidth
            >
              <MenuItem value="EUR">
                EUR — Euro
              </MenuItem>

              <MenuItem value="USD">
                USD — Dollaro USA
              </MenuItem>

              <MenuItem value="AED">
                AED — Dirham EAU
              </MenuItem>
            </TextField>

            <TextField
              select
              label="Residenza fiscale corrente"
              value={settings.fiscalResidence}
              onChange={(event) =>
                updateSetting(
                  "fiscalResidence",
                  event.target.value,
                )
              }
              fullWidth
            >
              <MenuItem value="Spain">
                Spagna
              </MenuItem>

              <MenuItem value="Italy">
                Italia
              </MenuItem>

              <MenuItem value="United Arab Emirates">
                Emirati Arabi Uniti
              </MenuItem>
            </TextField>

            <TextField
              select
              label="Residenza fiscale pianificata"
              value={
                settings.plannedFiscalResidence
              }
              onChange={(event) =>
                updateSetting(
                  "plannedFiscalResidence",
                  event.target.value,
                )
              }
              fullWidth
            >
              <MenuItem value="Spain">
                Spagna
              </MenuItem>

              <MenuItem value="Italy">
                Italia
              </MenuItem>

              <MenuItem value="United Arab Emirates">
                Emirati Arabi Uniti
              </MenuItem>
            </TextField>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: {
              xs: 2.5,
              md: 3.5,
            },
            border: "1px solid",
            borderColor: "divider",
            boxShadow:
              "0 12px 32px rgba(26,45,75,0.06)",
          }}
        >
          <Typography
            variant="h6"
            sx={{ mb: 0.5 }}
          >
            Sorgente dati
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            File utilizzato dalla piattaforma
            per importare i dati patrimoniali.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gap: 2.2,
            }}
          >
            <TextField
              label="Workbook principale"
              value={settings.sourceWorkbook}
              onChange={(event) =>
                updateSetting(
                  "sourceWorkbook",
                  event.target.value,
                )
              }
              fullWidth
            />

            <TextField
              label="Cartella dati"
              value={settings.dataFolder}
              onChange={(event) =>
                updateSetting(
                  "dataFolder",
                  event.target.value,
                )
              }
              fullWidth
            />

            <Divider />

            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700 }}
              >
                Ultimo aggiornamento Budget
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.4 }}
              >
                {formatDate(
                  connection.budgetAsOfDate,
                )}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700 }}
              >
                Ultimo aggiornamento Immobili
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.4 }}
              >
                {formatDate(
                  connection.propertiesAsOfDate,
                )}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={
                checking ? (
                  <CircularProgress
                    size={17}
                  />
                ) : (
                  <RefreshRoundedIcon />
                )
              }
              onClick={() =>
                void checkConnection()
              }
              disabled={checking}
            >
              Verifica connessione
            </Button>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: {
              xs: 2.5,
              md: 3.5,
            },
            border: "1px solid",
            borderColor: "divider",
            boxShadow:
              "0 12px 32px rgba(26,45,75,0.06)",
          }}
        >
          <Typography
            variant="h6"
            sx={{ mb: 0.5 }}
          >
            Comportamento piattaforma
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Regole operative e visualizzazione
            dei dati.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gap: 2,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={
                    settings.automaticRefresh
                  }
                  onChange={(event) =>
                    updateSetting(
                      "automaticRefresh",
                      event.target.checked,
                    )
                  }
                />
              }
              label="Aggiornamento automatico dei dati"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={
                    settings.showArchivedPositions
                  }
                  onChange={(event) =>
                    updateSetting(
                      "showArchivedPositions",
                      event.target.checked,
                    )
                  }
                />
              }
              label="Mostra posizioni archiviate"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={
                    settings.requireDecisionNotes
                  }
                  onChange={(event) =>
                    updateSetting(
                      "requireDecisionNotes",
                      event.target.checked,
                    )
                  }
                />
              }
              label="Richiedi motivazione per le decisioni"
            />
          </Box>

          <Alert
            severity="info"
            sx={{ mt: 3 }}
          >
            In questa versione le impostazioni
            sono salvate localmente nel browser.
            Il successivo motore di configurazione
            le trasferirà nel database centrale.
          </Alert>
        </Paper>
      </Box>
    </Box>
  );
}
