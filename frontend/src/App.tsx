import Ips from "./pages/Ips";
import DataQuality from "./pages/DataQuality";
import Risk from "./pages/Risk";
import Performance from "./pages/Performance";
import Transactions from "./pages/Transactions";
import WealthHistory from "./pages/WealthHistory";
import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "./components/layout/MainLayout";

import Dashboard from "./pages/Dashboard";
import DataCatalog from "./pages/DataCatalog";
import ImportCenter from "./pages/ImportCenter";
import Budget from "./pages/Budget";
import Planning from "./pages/Planning";
import OperationalCalendar from "./pages/OperationalCalendar";
import Reports from "./pages/Reports";
import Decisions from "./pages/Decisions";
import Settings from "./pages/Settings";
import Investments from "./pages/Investments";
import Liquidity from "./pages/Liquidity";
import Properties from "./pages/Properties";
import Wealth from "./pages/Wealth";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<Dashboard />} />

        <Route path="wealth" element={<Wealth />} />

        <Route
          path="wealth-history"
          element={<WealthHistory />}
        />

        <Route
          path="transactions"
          element={<Transactions />}
        />

        <Route
          path="performance"
          element={<Performance />}
        />

        <Route
          path="risk"
          element={<Risk />}
        />

        <Route
          path="ips"
          element={<Ips />}
        />

        <Route
          path="data-quality"
          element={<DataQuality />}
        />

        <Route
          path="investments"
          element={<Investments />}
        />

        <Route
          path="liquidity"
          element={<Liquidity />}
        />

        <Route
          path="properties"
          element={<Properties />}
        />

        <Route
          path="budget"
          element={<Budget />}
        />

        <Route
          path="planning"
          element={<Planning />}
        />

        <Route
          path="operational-calendar"
          element={<OperationalCalendar />}
        />

        <Route
          path="data-catalog"
          element={<DataCatalog />}
        />

        <Route
          path="imports"
          element={<ImportCenter />}
        />

        <Route
          path="reports"
          element={<Reports />}
        />

        <Route
          path="decisions"
          element={<Decisions />}
        />

        <Route
          path="settings"
          element={<Settings />}
        />
      </Route>

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}

export default App;
