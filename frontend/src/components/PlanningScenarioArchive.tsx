import {
  useEffect,
  useState,
} from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";

import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";

import PlanningScenarioComparison from "./PlanningScenarioComparison";

import {
  archiveStoredPlanningScenario,
  createStoredPlanningScenario,
  getEconomicAssumptionProfiles,
  getStoredPlanningScenario,
  getStoredPlanningScenarios,
  rerunStoredPlanningScenario,
  type EconomicAssumptionProfile,
  type PlanningScenarioResponse,
  type SimulatePlanningScenarioInput,
  type StoredEconomicProfileSnapshot,
  type StoredEconomicProfileSnapshotInput,
  type StoredPlanningScenarioSummary,
} from "../services/api";

type Props = {
  currentResult:
    PlanningScenarioResponse | null;

  currentEconomicProfile:
    StoredEconomicProfileSnapshotInput | null;

  onLoadScenario: (
    assumptions:
      SimulatePlanningScenarioInput,
    result:
      PlanningScenarioResponse | null,
    economicProfile:
      StoredEconomicProfileSnapshot | null,
  ) => void;
};

function formatCurrency(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString(
    "it-IT",
    {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  return new Date(
    value,
  ).toLocaleString(
    "it-IT",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

type EconomicProfileDrift = {
  label: string;

  color:
    | "default"
    | "success"
    | "warning"
    | "error"
    | "info";

  detail: string;
};

function getEconomicProfileDrift(
  snapshot:
    StoredEconomicProfileSnapshot | null,
  profiles:
    EconomicAssumptionProfile[],
): EconomicProfileDrift {
  if (!snapshot) {
    return {
      label: "Non tracciato",
      color: "default",
      detail:
        "Lo scenario non contiene uno snapshot economico.",
    };
  }

  if (
    !snapshot.profileId &&
    !snapshot.code
  ) {
    return {
      label: "Ipotesi manuali",
      color: "info",
      detail:
        "Snapshot indipendente da un profilo salvato.",
    };
  }

  const currentProfile =
    profiles.find(
      (profile) =>
        profile.id ===
          snapshot.profileId ||
        profile.code ===
          snapshot.code,
    );

  if (!currentProfile) {
    return {
      label:
        "Profilo non disponibile",
      color: "error",
      detail:
        "Il profilo originario non è più presente.",
    };
  }

  if (currentProfile.isArchived) {
    return {
      label: "Profilo archiviato",
      color: "warning",
      detail:
        "Il profilo originario è stato archiviato.",
    };
  }

  const numericValuesChanged =
    [
      "liquidityReturnDeltaPct",
      "investmentsReturnDeltaPct",
      "realEstateReturnDeltaPct",
      "otherAssetsReturnDeltaPct",
      "liquidityTaxRatePct",
      "investmentsTaxRatePct",
      "rebalancingCostRatePct",
      "rebalancingMinimumCost",
    ].some((field) => {
      const key =
        field as keyof Pick<
          EconomicAssumptionProfile,
          | "liquidityReturnDeltaPct"
          | "investmentsReturnDeltaPct"
          | "realEstateReturnDeltaPct"
          | "otherAssetsReturnDeltaPct"
          | "liquidityTaxRatePct"
          | "investmentsTaxRatePct"
          | "rebalancingCostRatePct"
          | "rebalancingMinimumCost"
        >;

      return (
        Math.abs(
          currentProfile[key] -
            snapshot[key],
        ) > 0.000001
      );
    });

  const fiscalResidenceChanged =
    Boolean(
      snapshot.fiscalResidence &&
      currentProfile.fiscalResidence !==
        snapshot.fiscalResidence,
    );

  if (
    numericValuesChanged ||
    fiscalResidenceChanged
  ) {
    return {
      label: "Profilo modificato",
      color: "warning",
      detail:
        "Le ipotesi attuali differiscono dallo snapshot storico.",
    };
  }

  return {
    label: "Profilo invariato",
    color: "success",
    detail:
      "Le ipotesi attuali coincidono con lo snapshot storico.",
  };
}

export default function PlanningScenarioArchive({
  currentResult,
  currentEconomicProfile,
  onLoadScenario,
}: Props) {
  const [
    scenarios,
    setScenarios,
  ] = useState<
    StoredPlanningScenarioSummary[]
  >([]);

  const [
    economicProfiles,
    setEconomicProfiles,
  ] = useState<
    EconomicAssumptionProfile[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [activeId, setActiveId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function loadScenarios() {
    setLoading(true);

    try {
      const [
        response,
        profiles,
      ] = await Promise.all([
        getStoredPlanningScenarios(),
        getEconomicAssumptionProfiles(
          true,
        ),
      ]);

      setScenarios(
        response.scenarios,
      );

      setEconomicProfiles(
        profiles,
      );
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile caricare gli scenari salvati.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadScenarios();
  }, []);

  async function saveCurrentScenario() {
    if (!currentResult) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await createStoredPlanningScenario({
        ...currentResult.scenario
          .assumptions,

        economicProfile:
          currentEconomicProfile,
      });

      setSuccess(
        "Scenario salvato nel database.",
      );

      await loadScenarios();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile salvare lo scenario.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function openScenario(
    id: string,
  ) {
    setActiveId(id);
    setError("");
    setSuccess("");

    try {
      const scenario =
        await getStoredPlanningScenario(
          id,
        );

      if (!scenario.assumptions) {
        throw new Error(
          "Ipotesi non disponibili.",
        );
      }

      onLoadScenario(
        scenario.assumptions,
        scenario.lastResult,
        scenario.economicProfile,
      );

      setSuccess(
        `Scenario “${scenario.name}” caricato nello Scenario Lab.`,
      );
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile aprire lo scenario.",
      );
    } finally {
      setActiveId(null);
    }
  }

  async function rerunScenario(
    id: string,
  ) {
    setActiveId(id);
    setError("");
    setSuccess("");

    try {
      const response =
        await rerunStoredPlanningScenario(
          id,
        );

      const scenario =
        response.scenario;

      if (scenario.assumptions) {
        onLoadScenario(
          scenario.assumptions,
          scenario.lastResult,
          scenario.economicProfile,
        );
      }

      setSuccess(
        `Scenario “${scenario.name}” ricalcolato sulla baseline corrente.`,
      );

      await loadScenarios();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile ricalcolare lo scenario.",
      );
    } finally {
      setActiveId(null);
    }
  }

  async function archiveScenario(
    id: string,
  ) {
    setActiveId(id);
    setError("");
    setSuccess("");

    try {
      await archiveStoredPlanningScenario(
        id,
      );

      setSuccess(
        "Scenario archiviato.",
      );

      await loadScenarios();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile archiviare lo scenario.",
      );
    } finally {
      setActiveId(null);
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 3,
        p: {
          xs: 2.5,
          md: 3,
        },
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: {
            xs: "flex-start",
            md: "center",
          },
          flexDirection: {
            xs: "column",
            md: "row",
          },
          gap: 2,
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
          }}
        >
          <StorageRoundedIcon
            color="primary"
          />

          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800 }}
            >
              Scenari salvati
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Archivio permanente delle
              simulazioni patrimoniali.
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={
            saving ? (
              <CircularProgress
                size={17}
                color="inherit"
              />
            ) : (
              <SaveRoundedIcon />
            )
          }
          disabled={
            !currentResult ||
            saving
          }
          onClick={() =>
            void saveCurrentScenario()
          }
        >
          Salva scenario corrente
        </Button>
      </Box>

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
        >
          {success}
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box
          sx={{
            minHeight: 100,
            display: "grid",
            placeItems: "center",
          }}
        >
          <CircularProgress size={26} />
        </Box>
      ) : scenarios.length === 0 ? (
        <Alert severity="info">
          Nessuno scenario salvato.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1.2,
          }}
        >
          {scenarios.map(
            (scenario) => {
              const busy =
                activeId ===
                scenario.id;

              const profileDrift =
                getEconomicProfileDrift(
                  scenario.economicProfile,
                  economicProfiles,
                );

              const statusColor =
                scenario
                  .sustainabilityStatus ===
                "SUSTAINABLE"
                  ? "success"
                  : scenario
                        .sustainabilityStatus ===
                      "AT_RISK"
                    ? "warning"
                    : "error";

              const statusLabel =
                scenario
                  .sustainabilityStatus ===
                "SUSTAINABLE"
                  ? "Sostenibile"
                  : scenario
                        .sustainabilityStatus ===
                      "AT_RISK"
                    ? "A rischio"
                    : "Non sostenibile";

              return (
                <Paper
                  key={scenario.id}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor:
                      "divider",
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      lg:
                        "minmax(220px, 1.2fr) minmax(170px, 0.7fr) minmax(170px, 0.7fr) auto",
                    },
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 800,
                      }}
                    >
                      {scenario.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.3 }}
                    >
                      Ricalcolato:{" "}
                      {formatDateTime(
                        scenario
                          .lastSimulatedAt,
                      )}
                    </Typography>

                    <Box
                      sx={{
                        mt: 1,
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 0.8,
                      }}
                    >
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          scenario
                            .economicProfile
                            ?.name ??
                          "Ipotesi economiche non tracciate"
                        }
                      />

                      <Chip
                        size="small"
                        color={
                          profileDrift.color
                        }
                        label={
                          profileDrift.label
                        }
                      />

                      {scenario
                        .economicProfile
                        ?.capturedAt ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Snapshot:{" "}
                          {formatDateTime(
                            scenario
                              .economicProfile
                              .capturedAt,
                          )}
                        </Typography>
                      ) : null}
                    </Box>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "block",
                        mt: 0.5,
                      }}
                    >
                      {profileDrift.detail}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Capitale finale
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.3,
                        fontWeight: 800,
                      }}
                    >
                      {formatCurrency(
                        scenario
                          .finalCapital,
                      )}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Capitale minimo
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.3,
                        fontWeight: 800,
                      }}
                    >
                      {formatCurrency(
                        scenario
                          .minimumCapital,
                      )}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {scenario
                        .minimumCapitalYear
                        ? `nel ${scenario.minimumCapitalYear}`
                        : ""}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Chip
                      size="small"
                      color={statusColor}
                      variant="outlined"
                      label={statusLabel}
                    />

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        <FolderOpenRoundedIcon />
                      }
                      disabled={busy}
                      onClick={() =>
                        void openScenario(
                          scenario.id,
                        )
                      }
                    >
                      Apri
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        busy ? (
                          <CircularProgress
                            size={15}
                            color="inherit"
                          />
                        ) : (
                          <ReplayRoundedIcon />
                        )
                      }
                      disabled={busy}
                      onClick={() =>
                        void rerunScenario(
                          scenario.id,
                        )
                      }
                    >
                      Ricalcola
                    </Button>

                    <Button
                      size="small"
                      color="warning"
                      startIcon={
                        <ArchiveRoundedIcon />
                      }
                      disabled={busy}
                      onClick={() =>
                        void archiveScenario(
                          scenario.id,
                        )
                      }
                    >
                      Archivia
                    </Button>
                  </Box>
                </Paper>
              );
            },
          )}
        </Box>
      )}
      {!loading && (
        <PlanningScenarioComparison
          scenarios={scenarios}
        />
      )}

    </Paper>
  );
}
