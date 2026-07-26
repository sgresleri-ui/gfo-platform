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

const Budget = lazy(
  () => import("./pages/Budget"),
);
const Dashboard = lazy(
  () => import("./pages/Dashboard"),
);
const DataCatalog = lazy(
  () => import("./pages/DataCatalog"),
);
const DataQuality = lazy(
  () => import("./pages/DataQuality"),
);
const Decisions = lazy(
  () => import("./pages/Decisions"),
);
const Documents = lazy(
  () => import("./pages/Documents"),
);
const ImportCenter = lazy(
  () => import("./pages/ImportCenter"),
);
const Investments = lazy(
  () => import("./pages/Investments"),
);
const Ips = lazy(
  () => import("./pages/Ips"),
);
const Liquidity = lazy(
  () => import("./pages/Liquidity"),
);
const OperationalCalendar = lazy(
  () =>
    import(
      "./pages/OperationalCalendar"
    ),
);
const Performance = lazy(
  () => import("./pages/Performance"),
);
const Planning = lazy(
  () => import("./pages/Planning"),
);
const Properties = lazy(
  () => import("./pages/Properties"),
);
const Reports = lazy(
  () => import("./pages/Reports"),
);
const ReportSnapshotPrint = lazy(
  () =>
    import(
      "./pages/ReportSnapshotPrint"
    ),
);
const Risk = lazy(
  () => import("./pages/Risk"),
);
const Settings = lazy(
  () => import("./pages/Settings"),
);
const Transactions = lazy(
  () => import("./pages/Transactions"),
);
const Wealth = lazy(
  () => import("./pages/Wealth"),
);
const WealthHistory = lazy(
  () => import("./pages/WealthHistory"),
);

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
