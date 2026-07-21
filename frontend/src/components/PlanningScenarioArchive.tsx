import {
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
  DialogTitle,
  MenuItem,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import UnarchiveRoundedIcon from "@mui/icons-material/UnarchiveRounded";

import PlanningScenarioComparison from "./PlanningScenarioComparison";

import {
  archiveStoredPlanningScenario,
  createStoredPlanningScenario,
  getEconomicAssumptionProfiles,
  getStoredPlanningScenario,
  getStoredPlanningScenarios,
  rerunStoredPlanningScenario,
  restoreStoredPlanningScenario,
  updateStoredPlanningScenario,
  type EconomicAssumptionProfile,
  type PlanningScenarioResponse,
  type SimulatePlanningScenarioInput,
  type StoredEconomicProfileSnapshot,
  type StoredEconomicProfileSnapshotInput,
  type StoredPlanningScenarioSummary,
} from "../services/api";

type Props = {
  economicProfilesRefreshKey:
    number;

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
  changes: string[];
};

function formatEconomicDriftValue(
  value: number,
  format:
    | "percentage"
    | "currency",
): string {
  if (format === "currency") {
    return value.toLocaleString(
      "it-IT",
      {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      },
    );
  }

  return `${value.toLocaleString(
    "it-IT",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    },
  )}%`;
}

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
      changes: [],
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
      changes: [],
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
      changes: [],
    };
  }

  if (currentProfile.isArchived) {
    return {
      label: "Profilo archiviato",
      color: "warning",
      detail:
        "Il profilo originario è stato archiviato.",
      changes: [],
    };
  }

  const changes: string[] = [];

  const numericFields = [
    {
      key:
        "liquidityReturnDeltaPct",
      label:
        "Rendimento liquidità",
      format:
        "percentage",
    },
    {
      key:
        "investmentsReturnDeltaPct",
      label:
        "Rendimento investimenti",
      format:
        "percentage",
    },
    {
      key:
        "realEstateReturnDeltaPct",
      label:
        "Rendimento immobili",
      format:
        "percentage",
    },
    {
      key:
        "otherAssetsReturnDeltaPct",
      label:
        "Rendimento altri attivi",
      format:
        "percentage",
    },
    {
      key:
        "liquidityTaxRatePct",
      label:
        "Imposta liquidità",
      format:
        "percentage",
    },
    {
      key:
        "investmentsTaxRatePct",
      label:
        "Imposta investimenti",
      format:
        "percentage",
    },
    {
      key:
        "rebalancingCostRatePct",
      label:
        "Costo ribilanciamento",
      format:
        "percentage",
    },
    {
      key:
        "rebalancingMinimumCost",
      label:
        "Costo minimo operazione",
      format:
        "currency",
    },
  ] as const;

  numericFields.forEach(
    (field) => {
      const previousValue =
        snapshot[field.key];

      const currentValue =
        currentProfile[field.key];

      if (
        Math.abs(
          currentValue -
            previousValue,
        ) <= 0.000001
      ) {
        return;
      }

      changes.push(
        `${field.label}: ${formatEconomicDriftValue(
          previousValue,
          field.format,
        )} → ${formatEconomicDriftValue(
          currentValue,
          field.format,
        )}`,
      );
    },
  );

  const fiscalResidenceChanged =
    Boolean(
      snapshot.fiscalResidence &&
      currentProfile.fiscalResidence !==
        snapshot.fiscalResidence,
    );

  if (fiscalResidenceChanged) {
    changes.push(
      `Residenza fiscale: ${
        snapshot.fiscalResidence
      } → ${
        currentProfile.fiscalResidence
      }`,
    );
  }

  const numericValuesChanged =
    changes.length > 0;

  if (
    numericValuesChanged ||
    fiscalResidenceChanged
  ) {
    return {
      label: "Profilo modificato",
      color: "warning",
      detail:
        "Le ipotesi attuali differiscono dallo snapshot storico.",
      changes,
    };
  }

  return {
    label: "Profilo invariato",
    color: "success",
    detail:
      "Le ipotesi attuali coincidono con lo snapshot storico.",
    changes: [],
  };
}

export default function PlanningScenarioArchive({
  economicProfilesRefreshKey,
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

  const [
    scenarioEditorOpen,
    setScenarioEditorOpen,
  ] = useState(false);

  const [
    editingScenarioId,
    setEditingScenarioId,
  ] = useState<string | null>(
    null,
  );

  const [
    editingScenarioName,
    setEditingScenarioName,
  ] = useState("");

  const [
    editingScenarioDescription,
    setEditingScenarioDescription,
  ] = useState("");

  const [
    savingScenarioEdit,
    setSavingScenarioEdit,
  ] = useState(false);

  const [
    scenarioArchiveView,
    setScenarioArchiveView,
  ] = useState<
    "ACTIVE" | "ARCHIVED"
  >("ACTIVE");

  const [
    scenarioSearch,
    setScenarioSearch,
  ] = useState("");

  const [
    economicProfileFilter,
    setEconomicProfileFilter,
  ] = useState("ALL");

  const [
    sustainabilityFilter,
    setSustainabilityFilter,
  ] = useState("ALL");

  const [
    scenarioSort,
    setScenarioSort,
  ] = useState(
    "LAST_SIMULATED_AT",
  );

  const [
    scenarioSortDirection,
    setScenarioSortDirection,
  ] = useState<
    "ASC" | "DESC"
  >("DESC");

  async function loadScenarios() {
    setLoading(true);

    try {
      const [
        response,
        profiles,
      ] = await Promise.all([
        getStoredPlanningScenarios(
          true,
        ),
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
  }, [economicProfilesRefreshKey]);

  const activeScenarios =
    useMemo(
      () =>
        scenarios.filter(
          (scenario) =>
            scenario.status ===
            "ACTIVE",
        ),
      [scenarios],
    );

  const archivedScenarios =
    useMemo(
      () =>
        scenarios.filter(
          (scenario) =>
            scenario.status ===
            "ARCHIVED",
        ),
      [scenarios],
    );

  const visibleScenarios =
    scenarioArchiveView ===
    "ARCHIVED"
      ? archivedScenarios
      : activeScenarios;

  const economicProfileOptions =
    useMemo(() => {
      const options =
        new Map<string, string>();

      visibleScenarios.forEach(
        (scenario) => {
          const snapshot =
            scenario.economicProfile;

          if (!snapshot) {
            return;
          }

          const key =
            snapshot.profileId ||
            snapshot.code ||
            `name:${snapshot.name}`;

          options.set(
            key,
            snapshot.name ||
              snapshot.code ||
              "Profilo economico",
          );
        },
      );

      return Array.from(
        options.entries(),
      )
        .map(([value, label]) => ({
          value,
          label,
        }))
        .sort((left, right) =>
          left.label.localeCompare(
            right.label,
            "it",
          ),
        );
    }, [visibleScenarios]);

  const filteredScenarios =
    useMemo(() => {
      const normalizedSearch =
        scenarioSearch
          .trim()
          .toLocaleLowerCase(
            "it-IT",
          );

      const filtered =
        visibleScenarios.filter(
        (scenario) => {
          const profileSnapshot =
            scenario.economicProfile;

          const profileKey =
            profileSnapshot
              ? profileSnapshot
                    .profileId ||
                profileSnapshot.code ||
                `name:${profileSnapshot.name}`
              : "UNTRACKED";

          const profileName =
            profileSnapshot
              ?.name ?? "";

          const matchesSearch =
            !normalizedSearch ||
            scenario.name
              .toLocaleLowerCase(
                "it-IT",
              )
              .includes(
                normalizedSearch,
              ) ||
            profileName
              .toLocaleLowerCase(
                "it-IT",
              )
              .includes(
                normalizedSearch,
              );

          const matchesProfile =
            economicProfileFilter ===
              "ALL" ||
            economicProfileFilter ===
              profileKey;

          const matchesStatus =
            sustainabilityFilter ===
              "ALL" ||
            sustainabilityFilter ===
              scenario
                .sustainabilityStatus ||
            (sustainabilityFilter ===
              "NOT_SUSTAINABLE" &&
              scenario
                .sustainabilityStatus !==
                "SUSTAINABLE" &&
              scenario
                .sustainabilityStatus !==
                "AT_RISK");

          return (
            matchesSearch &&
            matchesProfile &&
            matchesStatus
          );
        },
      );

      const compareNullableNumbers = (
        leftValue: number | null,
        rightValue: number | null,
      ): number => {
        if (
          leftValue === null &&
          rightValue === null
        ) {
          return 0;
        }

        if (leftValue === null) {
          return 1;
        }

        if (rightValue === null) {
          return -1;
        }

        const comparison =
          leftValue - rightValue;

        return scenarioSortDirection ===
          "ASC"
          ? comparison
          : -comparison;
      };

      const sustainabilityRank = (
        status:
          StoredPlanningScenarioSummary[
            "sustainabilityStatus"
          ],
      ): number => {
        if (status === "SUSTAINABLE") {
          return 3;
        }

        if (status === "AT_RISK") {
          return 2;
        }

        return 1;
      };

      return filtered.sort(
        (left, right) => {
          let comparison = 0;

          switch (scenarioSort) {
            case "NAME":
              comparison =
                left.name.localeCompare(
                  right.name,
                  "it",
                  {
                    sensitivity:
                      "base",
                  },
                );

              if (
                scenarioSortDirection ===
                "DESC"
              ) {
                comparison =
                  -comparison;
              }

              break;

            case "FINAL_CAPITAL":
              comparison =
                compareNullableNumbers(
                  left.finalCapital,
                  right.finalCapital,
                );
              break;

            case "MINIMUM_CAPITAL":
              comparison =
                compareNullableNumbers(
                  left.minimumCapital,
                  right.minimumCapital,
                );
              break;

            case "SUSTAINABILITY":
              comparison =
                sustainabilityRank(
                  left.sustainabilityStatus,
                ) -
                sustainabilityRank(
                  right.sustainabilityStatus,
                );

              if (
                scenarioSortDirection ===
                "DESC"
              ) {
                comparison =
                  -comparison;
              }

              break;

            case "LAST_SIMULATED_AT":
            default:
              comparison =
                compareNullableNumbers(
                  left.lastSimulatedAt
                    ? Date.parse(
                        left.lastSimulatedAt,
                      )
                    : null,
                  right.lastSimulatedAt
                    ? Date.parse(
                        right.lastSimulatedAt,
                      )
                    : null,
                );
              break;
          }

          if (comparison !== 0) {
            return comparison;
          }

          return left.name.localeCompare(
            right.name,
            "it",
            {
              sensitivity: "base",
            },
          );
        },
      );
    }, [
      visibleScenarios,
      scenarioSearch,
      economicProfileFilter,
      sustainabilityFilter,
      scenarioSort,
      scenarioSortDirection,
    ]);

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

  function openScenarioEditor(
    scenario:
      StoredPlanningScenarioSummary,
  ) {
    setEditingScenarioId(
      scenario.id,
    );

    setEditingScenarioName(
      scenario.name,
    );

    setEditingScenarioDescription(
      scenario.description ?? "",
    );

    setScenarioEditorOpen(true);
    setError("");
    setSuccess("");
  }

  async function saveScenarioEdit() {
    if (!editingScenarioId) {
      return;
    }

    const normalizedName =
      editingScenarioName.trim();

    if (!normalizedName) {
      setError(
        "Il nome dello scenario è obbligatorio.",
      );

      return;
    }

    setSavingScenarioEdit(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await updateStoredPlanningScenario(
          editingScenarioId,
          {
            name: normalizedName,

            description:
              editingScenarioDescription
                .trim() || null,
          },
        );

      setScenarioEditorOpen(false);

      setSuccess(
        `Scenario “${response.scenario.name}” aggiornato.`,
      );

      await loadScenarios();
    } catch (requestError) {
      console.error(requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Impossibile modificare lo scenario.",
      );
    } finally {
      setSavingScenarioEdit(false);
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

  async function restoreScenario(
    id: string,
  ) {
    setActiveId(id);
    setError("");
    setSuccess("");

    try {
      await restoreStoredPlanningScenario(
        id,
      );

      setSuccess(
        "Scenario ripristinato tra gli scenari attivi.",
      );

      await loadScenarios();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile ripristinare lo scenario.",
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

      {!loading &&
        scenarios.length > 0 && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
            }}
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              value={scenarioArchiveView}
              onChange={(
                _event,
                nextView:
                  | "ACTIVE"
                  | "ARCHIVED"
                  | null,
              ) => {
                if (!nextView) {
                  return;
                }

                setScenarioArchiveView(
                  nextView,
                );

                setScenarioSearch("");
                setEconomicProfileFilter(
                  "ALL",
                );
                setSustainabilityFilter(
                  "ALL",
                );
              }}
              sx={{
                mb: 2,
                flexWrap: "wrap",
              }}
            >
              <ToggleButton value="ACTIVE">
                Attivi ({activeScenarios.length})
              </ToggleButton>

              <ToggleButton value="ARCHIVED">
                Archiviati ({archivedScenarios.length})
              </ToggleButton>
            </ToggleButtonGroup>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md:
                    "repeat(2, minmax(0, 1fr))",
                  xl:
                    "minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(170px, 1fr) minmax(180px, 1fr) auto auto",
                },
                gap: 1.5,
                alignItems: "center",
              }}
            >
              <TextField
                size="small"
                label="Cerca scenario"
                placeholder="Nome o profilo economico"
                value={scenarioSearch}
                onChange={(event) =>
                  setScenarioSearch(
                    event.target.value,
                  )
                }
              />

              <TextField
                select
                size="small"
                label="Profilo economico"
                value={
                  economicProfileFilter
                }
                onChange={(event) =>
                  setEconomicProfileFilter(
                    event.target.value,
                  )
                }
              >
                <MenuItem value="ALL">
                  Tutti i profili
                </MenuItem>

                <MenuItem value="UNTRACKED">
                  Non tracciato
                </MenuItem>

                {economicProfileOptions.map(
                  (profile) => (
                    <MenuItem
                      key={
                        profile.value
                      }
                      value={
                        profile.value
                      }
                    >
                      {profile.label}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                select
                size="small"
                label="Stato patrimoniale"
                value={
                  sustainabilityFilter
                }
                onChange={(event) =>
                  setSustainabilityFilter(
                    event.target.value,
                  )
                }
              >
                <MenuItem value="ALL">
                  Tutti gli stati
                </MenuItem>

                <MenuItem value="SUSTAINABLE">
                  Sostenibile
                </MenuItem>

                <MenuItem value="AT_RISK">
                  A rischio
                </MenuItem>

                <MenuItem value="NOT_SUSTAINABLE">
                  Non sostenibile
                </MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label="Ordina per"
                value={scenarioSort}
                onChange={(event) =>
                  setScenarioSort(
                    event.target.value,
                  )
                }
              >
                <MenuItem value="LAST_SIMULATED_AT">
                  Data di ricalcolo
                </MenuItem>

                <MenuItem value="NAME">
                  Nome
                </MenuItem>

                <MenuItem value="FINAL_CAPITAL">
                  Capitale finale
                </MenuItem>

                <MenuItem value="MINIMUM_CAPITAL">
                  Capitale minimo
                </MenuItem>

                <MenuItem value="SUSTAINABILITY">
                  Stato patrimoniale
                </MenuItem>
              </TextField>

              <Button
                variant="outlined"
                onClick={() =>
                  setScenarioSortDirection(
                    (current) =>
                      current === "ASC"
                        ? "DESC"
                        : "ASC",
                  )
                }
              >
                {scenarioSortDirection ===
                "ASC"
                  ? "Crescente ↑"
                  : "Decrescente ↓"}
              </Button>

              <Button
                variant="outlined"
                disabled={
                  !scenarioSearch &&
                  economicProfileFilter ===
                    "ALL" &&
                  sustainabilityFilter ===
                    "ALL" &&
                  scenarioSort ===
                    "LAST_SIMULATED_AT" &&
                  scenarioSortDirection ===
                    "DESC"
                }
                onClick={() => {
                  setScenarioSearch("");
                  setEconomicProfileFilter(
                    "ALL",
                  );
                  setSustainabilityFilter(
                    "ALL",
                  );
                  setScenarioSort(
                    "LAST_SIMULATED_AT",
                  );
                  setScenarioSortDirection(
                    "DESC",
                  );
                }}
              >
                Azzera filtri
              </Button>
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                mt: 1.2,
              }}
            >
              {filteredScenarios.length} di{" "}
              {visibleScenarios.length} scenari{" "}
              {scenarioArchiveView ===
              "ARCHIVED"
                ? "archiviati"
                : "attivi"}
            </Typography>
          </Paper>
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
      ) : visibleScenarios.length ===
        0 ? (
        <Alert severity="info">
          {scenarioArchiveView ===
          "ARCHIVED"
            ? "Nessuno scenario archiviato."
            : "Nessuno scenario attivo."}
        </Alert>
      ) : filteredScenarios.length ===
        0 ? (
        <Alert severity="info">
          Nessuno scenario corrisponde
          ai filtri selezionati.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1.2,
          }}
        >
          {filteredScenarios.map(
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

                    {scenario.description ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 0.4,
                          whiteSpace:
                            "pre-line",
                        }}
                      >
                        {scenario.description}
                      </Typography>
                    ) : null}

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

                    {profileDrift
                      .changes.length >
                    0 ? (
                      <Box
                        sx={{
                          mt: 0.6,
                          display: "grid",
                          gap: 0.25,
                        }}
                      >
                        {profileDrift
                          .changes.map(
                            (change) => (
                              <Typography
                                key={change}
                                variant="caption"
                                sx={{
                                  display:
                                    "block",
                                  fontWeight:
                                    700,
                                }}
                              >
                                • {change}
                              </Typography>
                            ),
                          )}
                      </Box>
                    ) : null}
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
                        <EditRoundedIcon />
                      }
                      disabled={busy}
                      onClick={() =>
                        openScenarioEditor(
                          scenario,
                        )
                      }
                    >
                      Modifica
                    </Button>

                    {scenario.status ===
                    "ARCHIVED" ? (
                      <Button
                        size="small"
                        color="success"
                        variant="outlined"
                        startIcon={
                          busy ? (
                            <CircularProgress
                              size={15}
                              color="inherit"
                            />
                          ) : (
                            <UnarchiveRoundedIcon />
                          )
                        }
                        disabled={busy}
                        onClick={() =>
                          void restoreScenario(
                            scenario.id,
                          )
                        }
                      >
                        Ripristina
                      </Button>
                    ) : (
                      <>
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
                      </>
                    )}
                  </Box>
                </Paper>
              );
            },
          )}
        </Box>
      )}
      {!loading &&
        scenarioArchiveView ===
          "ACTIVE" && (
          <PlanningScenarioComparison
            scenarios={activeScenarios}
          />
        )}

      <Dialog
        open={scenarioEditorOpen}
        fullWidth
        maxWidth="sm"
        onClose={() => {
          if (
            !savingScenarioEdit
          ) {
            setScenarioEditorOpen(
              false,
            );
          }
        }}
      >
        <DialogTitle>
          Modifica scenario salvato
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            pt: 2.5,
            display: "grid",
            gap: 2,
          }}
        >
          <TextField
            autoFocus
            required
            fullWidth
            label="Nome scenario"
            value={editingScenarioName}
            slotProps={{
              htmlInput: {
                maxLength: 160,
              },
            }}
            helperText={`${editingScenarioName.length}/160 caratteri`}
            onChange={(event) =>
              setEditingScenarioName(
                event.target.value,
              )
            }
          />

          <TextField
            fullWidth
            multiline
            minRows={4}
            label="Descrizione"
            value={
              editingScenarioDescription
            }
            slotProps={{
              htmlInput: {
                maxLength: 2000,
              },
            }}
            helperText={`${editingScenarioDescription.length}/2000 caratteri`}
            onChange={(event) =>
              setEditingScenarioDescription(
                event.target.value,
              )
            }
          />
        </DialogContent>

        <DialogActions>
          <Button
            disabled={
              savingScenarioEdit
            }
            onClick={() =>
              setScenarioEditorOpen(
                false,
              )
            }
          >
            Annulla
          </Button>

          <Button
            variant="contained"
            disabled={
              savingScenarioEdit ||
              !editingScenarioName.trim()
            }
            startIcon={
              savingScenarioEdit ? (
                <CircularProgress
                  size={16}
                  color="inherit"
                />
              ) : (
                <EditRoundedIcon />
              )
            }
            onClick={() =>
              void saveScenarioEdit()
            }
          >
            Salva modifiche
          </Button>
        </DialogActions>
      </Dialog>

    </Paper>
  );
}
