import {
  useEffect,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";

import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import KpiCard from "../components/KpiCard";
import ExecutiveIpsPanel from "../components/ExecutiveIpsPanel";
import ExecutiveRiskDataPanel from "../components/ExecutiveRiskDataPanel";
import ExecutivePerformanceLiquidityPanel from "../components/ExecutivePerformanceLiquidityPanel";
import ExecutivePropertyBudgetPlanningPanel from "../components/ExecutivePropertyBudgetPlanningPanel";
import ExecutiveDecisionsPanel from "../components/ExecutiveDecisionsPanel";
import ExecutiveDataImportsPanel from "../components/ExecutiveDataImportsPanel";
import ExecutiveOperationalCalendarPanel from "../components/ExecutiveOperationalCalendarPanel";
import ExecutiveDocumentsPanel from "../components/ExecutiveDocumentsPanel";
import {
  getDashboard,
  type DashboardSummary,
} from "../services/api";

export default function Dashboard() {
  const [data, setData] =
    useState<DashboardSummary | null>(
      null,
    );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void getDashboard()
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((requestError) => {
        console.error(requestError);

        if (!cancelled) {
          setError(
            "Impossibile caricare i dati della dashboard.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function refreshDashboard() {
    setLoading(true);
    setError("");

    void getDashboard()
      .then((result) => {
        setData(result);
      })
      .catch((requestError) => {
        console.error(requestError);
        setError(
          "Impossibile caricare i dati della dashboard.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const euro = (value: number) =>
    value.toLocaleString("it-IT", {
      style: "currency",
      currency:
        data?.currency ?? "EUR",
      maximumFractionDigits: 0,
    });

  const updateDate = data?.asOfDate
    ? new Date(
        data.asOfDate,
      ).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "non disponibile";

  if (loading && !data) {
    return (
      <Box
        role="status"
        aria-live="polite"
        aria-busy="true"
        sx={{
          minHeight: 420,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          textAlign: "center",
        }}
      >
        <CircularProgress
          size={32}
          thickness={4}
          aria-hidden="true"
        />

        <Box>
          <Typography
            variant="body1"
            sx={{ fontWeight: 700 }}
          >
            Caricamento Dashboard
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Consolidamento dei dati
            patrimoniali in corso…
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          minHeight: 420,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={
                <RefreshRoundedIcon />
              }
              onClick={
                refreshDashboard
              }
            >
              Riprova
            </Button>
          }
          sx={{
            width:
              "min(560px, calc(100vw - 32px))",
          }}
        >
          {error ||
            "Dati della dashboard non disponibili."}
        </Alert>
      </Box>
    );
  }

  return (
    <Box aria-busy={loading}>
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          overflow: "hidden",
          mb: 3,
          p: { xs: 3, md: 4 },
          color: "white",
          background:
            "linear-gradient(120deg, #0A2B5B 0%, #174A9C 52%, #168C83 130%)",
          boxShadow: "0 18px 42px rgba(21, 61, 116, 0.18)",

          "&::after": {
            content: '""',
            position: "absolute",
            width: 310,
            height: 310,
            borderRadius: "50%",
            top: -180,
            right: -70,
            backgroundColor: "rgba(255,255,255,0.08)",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: {
              xs: "stretch",
              sm: "flex-start",
            },
            flexDirection: {
              xs: "column",
              sm: "row",
            },
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{
                color:
                  "rgba(255,255,255,0.72)",
                letterSpacing: "0.15em",
              }}
            >
              Family Wealth Control Room
            </Typography>

            <Typography
              variant="h4"
              sx={{ mt: 0.5, mb: 1 }}
            >
              Patrimonio familiare
            </Typography>

            <Typography
              sx={{
                color:
                  "rgba(255,255,255,0.76)",
              }}
            >
              Valorizzazione più recente:{" "}
              {updateDate}
              {" · "}
              {data.positionCount}{" "}
              {data.positionCount === 1
                ? "posizione attiva"
                : "posizioni attive"}
            </Typography>
          </Box>

          <Button
            size="small"
            variant="outlined"
            color="inherit"
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress
                  size={16}
                  thickness={5}
                  color="inherit"
                  aria-hidden="true"
                />
              ) : (
                <RefreshRoundedIcon />
              )
            }
            onClick={
              refreshDashboard
            }
            sx={{
              flexShrink: 0,
              borderColor:
                "rgba(255,255,255,0.5)",
              "&:hover": {
                borderColor: "white",
                bgcolor:
                  "rgba(255,255,255,0.08)",
              },
            }}
          >
            {loading
              ? "Aggiornamento…"
              : "Aggiorna"}
          </Button>
        </Box>

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            mt: 3,
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: "rgba(255,255,255,0.72)" }}
          >
            Patrimonio netto
          </Typography>

          <Typography
            sx={{
              fontSize: { xs: "2.2rem", md: "3rem" },
              lineHeight: 1.1,
              fontWeight: 800,
              letterSpacing: "-0.045em",
            }}
          >
            {euro(data.netWorth)}
          </Typography>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(5, minmax(0, 1fr))",
          },
          gap: 2.2,
          mb: 3,
        }}
      >
        <KpiCard
          title="Liquidità"
          value={euro(data.liquidity)}
          subtitle="Disponibilità sui conti"
          icon={<AccountBalanceWalletRoundedIcon />}
          tone="success"
        />

        <KpiCard
          title="Investimenti"
          value={euro(data.investments)}
          subtitle="Valore finanziario di mercato"
          icon={<ShowChartRoundedIcon />}
          tone="primary"
        />

        <KpiCard
          title="Immobili"
          value={euro(data.realEstate)}
          subtitle="Valore lordo consolidato"
          icon={<HomeWorkRoundedIcon />}
          tone="warning"
        />

        <KpiCard
          title="Altri attivi"
          value={euro(data.otherAssets)}
          subtitle="Attività patrimoniali residuali"
          icon={<CategoryRoundedIcon />}
          tone="primary"
        />

        <KpiCard
          title="Passività"
          value={euro(data.liabilities)}
          subtitle="Debiti e impegni residui"
          icon={<CreditCardRoundedIcon />}
          tone="error"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "1.5fr 1fr",
          },
          gap: 2.2,
          alignItems: "stretch",
        }}
      >
        <ExecutiveRiskDataPanel />

        <ExecutiveIpsPanel />
      </Box>

      <ExecutivePerformanceLiquidityPanel />

      <ExecutivePropertyBudgetPlanningPanel />

      <ExecutiveDecisionsPanel />

      <ExecutiveDataImportsPanel />

      <ExecutiveOperationalCalendarPanel />

      <ExecutiveDocumentsPanel />
    </Box>
  );
}
