import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import DataCatalog from "./pages/DataCatalog";
import PlaceholderPage from "./pages/PlaceholderPage";
import Wealth from "./pages/Wealth";
import Investments from "./pages/Investments";
import Liquidity from "./pages/Liquidity";

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
          element={
            <PlaceholderPage
              title="Immobili"
              description="Patrimonio immobiliare, debiti, costi e redditività."
            />
          }
        />

        <Route
          path="budget"
          element={
            <PlaceholderPage
              title="Budget"
              description="Budget annuale e piano pluriennale 2027–2066."
            />
          }
        />

        <Route
          path="planning"
          element={
            <PlaceholderPage
              title="Planning"
              description="Timeline patrimoniale, scenari e sostenibilità futura."
            />
          }
        />

        <Route path="data-catalog" element={<DataCatalog />} />

        <Route
          path="reports"
          element={
            <PlaceholderPage
              title="Report"
              description="Report patrimoniali, operativi e decisionali."
            />
          }
        />

        <Route
          path="decisions"
          element={
            <PlaceholderPage
              title="Decisioni"
              description="Registro delle decisioni strategiche del Family Office."
            />
          }
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

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;