import {
  lazy,
  Suspense,
} from "react";
import {
  Box,
  CircularProgress,
} from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";

import RouteErrorBoundary from "./components/RouteErrorBoundary";
import MainLayout from "./components/layout/MainLayout";
import { pageLoaders } from "./routes/pageLoaders";

const Budget = lazy(pageLoaders.budget);
const CapitalAllocation = lazy(pageLoaders.capitalAllocation);
const Dashboard = lazy(pageLoaders.dashboard);
const DataCatalog = lazy(pageLoaders.dataCatalog);
const DataQuality = lazy(pageLoaders.dataQuality);
const Decisions = lazy(pageLoaders.decisions);
const Documents = lazy(pageLoaders.documents);
const ImportCenter = lazy(pageLoaders.importCenter);
const Investments = lazy(pageLoaders.investments);
const Ips = lazy(pageLoaders.ips);
const Liquidity = lazy(pageLoaders.liquidity);
const OperationalCalendar = lazy(pageLoaders.operationalCalendar);
const Performance = lazy(pageLoaders.performance);
const Planning = lazy(pageLoaders.planning);
const Properties = lazy(pageLoaders.properties);
const Reports = lazy(pageLoaders.reports);
const ReportSnapshotPrint = lazy(pageLoaders.reportSnapshotPrint);
const Risk = lazy(pageLoaders.risk);
const Settings = lazy(pageLoaders.settings);
const Transactions = lazy(pageLoaders.transactions);
const Wealth = lazy(pageLoaders.wealth);
const WealthHistory = lazy(pageLoaders.wealthHistory);

function FullPageLoading() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <CircularProgress />
    </Box>
  );
}

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
            path="capital-allocation"
            element={<CapitalAllocation />}
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
          path="documents"
          element={<Documents />}
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
        path="/reports/snapshots/:id/print"
        element={
          <RouteErrorBoundary fullPage>
            <Suspense
              fallback={
                <FullPageLoading />
              }
            >
              <ReportSnapshotPrint />
            </Suspense>
          </RouteErrorBoundary>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}

export default App;
