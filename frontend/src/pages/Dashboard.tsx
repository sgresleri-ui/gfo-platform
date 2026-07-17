import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";

import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";

import KpiCard from "../components/KpiCard";
import ExecutiveIpsPanel from "../components/ExecutiveIpsPanel";
import ExecutiveRiskDataPanel from "../components/ExecutiveRiskDataPanel";
import ExecutivePerformanceLiquidityPanel from "../components/ExecutivePerformanceLiquidityPanel";
import ExecutivePropertyBudgetPlanningPanel from "../components/ExecutivePropertyBudgetPlanningPanel";
import { getDashboard } from "../services/api";

type DashboardData = {
  netWorth: number;
  liquidity: number;
  investments: number;
  realEstate: number;
  liabilities: number;
};

const initialData: DashboardData = {
  netWorth: 0,
  liquidity: 0,
  investments: 0,
  realEstate: 0,
  liabilities: 0,
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard()
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((requestError) => {
        console.error(requestError);
        setError("Impossibile caricare i dati della dashboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  const euro = (value: number) =>
    value.toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });

  const updateDate = new Date().toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <Box sx={{ minHeight: 420, display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
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
        <Typography
          variant="overline"
          sx={{
            color: "rgba(255,255,255,0.72)",
            letterSpacing: "0.15em",
          }}
        >
          Family Wealth Control Room
        </Typography>

        <Typography variant="h4" sx={{ mt: 0.5, mb: 1 }}>
          Patrimonio familiare
        </Typography>

        <Typography sx={{ color: "rgba(255,255,255,0.76)" }}>
          Situazione consolidata aggiornata al {updateDate}
        </Typography>

        <Box sx={{ mt: 3 }}>
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
            xl: "repeat(4, minmax(0, 1fr))",
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
        }}
      >
        <ExecutiveRiskDataPanel />

        <ExecutiveIpsPanel />
      </Box>

      <ExecutivePerformanceLiquidityPanel />

      <ExecutivePropertyBudgetPlanningPanel />
    </Box>
  );
}