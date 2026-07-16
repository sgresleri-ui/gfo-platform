import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "./components/layout/MainLayout";

import Dashboard from "./pages/Dashboard";
import DataCatalog from "./pages/DataCatalog";
import Budget from "./pages/Budget";
import Planning from "./pages/Planning";
import Reports from "./pages/Reports";
import Decisions from "./pages/Decisions";
import Investments from "./pages/Investments";
import Liquidity from "./pages/Liquidity";
import Properties from "./pages/Properties";
import Wealth from "./pages/Wealth";
import PlaceholderPage from "./pages/PlaceholderPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<Dashboard />} />

        <Route path="wealth" element={<Wealth />} />

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
          path="data-catalog"
          element={<DataCatalog />}
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
          element={
            <PlaceholderPage
              title="Impostazioni"
              description="Configurazione della piattaforma e delle sorgenti dati."
            />
          }
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
