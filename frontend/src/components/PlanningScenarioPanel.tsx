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
  Divider,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import EconomicAssumptionProfileDialog, {
  type EconomicProfileSourceValues,
} from "./EconomicAssumptionProfileDialog";
import PlanningScenarioArchive from "./PlanningScenarioArchive";
import PlanningScenarioAssessmentPanel from "./PlanningScenarioAssessmentPanel";
import PlanningScenarioPresets from "./PlanningScenarioPresets";

import {
  archiveEconomicAssumptionProfile,
  createEconomicAssumptionProfile,
  getPlanningScenarioBaseline,
  getEconomicAssumptionProfiles,
  setDefaultEconomicAssumptionProfile,
  updateEconomicAssumptionProfile,
  assessPlanningAllocationScenario,
  applyAutomaticIpsRebalancingPlan,
  compareOptimizedIpsRebalancingStrategies,
  type EconomicAssumptionProfile,
  type EconomicAssumptionProfileInput,
  type StoredEconomicProfileSnapshot,
  type StoredEconomicProfileSnapshotInput,
  type PlanningAllocationResponse,
  type PlanningAllocationTransfer,
  type PlanningAutomaticIpsRebalancingResponse,
  type PlanningOptimizedIpsComparisonResponse,
  type PlanningOptimizedIpsStrategyResult,
  type PlanningScenarioBaselineResponse,
  type PlanningScenarioAssessmentResponse,
  type PlanningScenarioResponse,
  type SimulatePlanningScenarioInput,
} from "../services/api";

type ScenarioForm = {
  name: string;
  description: string;
  initialCapitalAdjustment: string;
  annualReturnAdjustmentPct: string;
  annualCostAdjustmentPct: string;
  annualRevenueAdjustmentPct: string;
  expenseInflationDeltaPct: string;

  liquidityReturnDeltaPct: string;
  investmentsReturnDeltaPct: string;
  realEstateReturnDeltaPct: string;
  otherAssetsReturnDeltaPct: string;

  liquidityTaxRatePct?: string;
  investmentsTaxRatePct?: string;

  rebalancingCostRatePct?: string;
  rebalancingMinimumCost?: string;
};

type ScenarioEventDraft = {
  id: string;
  year: string;
  label: string;
  amount: string;
  category: string;
};

const DEFAULT_FORM: ScenarioForm = {
  name: "Scenario personalizzato",
  description: "",
  initialCapitalAdjustment: "0",
  annualReturnAdjustmentPct: "0",
  annualCostAdjustmentPct: "0",
  annualRevenueAdjustmentPct: "0",
  expenseInflationDeltaPct: "0",

  liquidityReturnDeltaPct: "0",
  investmentsReturnDeltaPct: "0",
  realEstateReturnDeltaPct: "0",
  otherAssetsReturnDeltaPct: "0",

  liquidityTaxRatePct: "0",
  investmentsTaxRatePct: "0",

  rebalancingCostRatePct: "0",
  rebalancingMinimumCost: "0",
};

function parseNumber(
  value: string,
): number {
  const normalized = value
    .trim()
    .replace(",", ".");

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

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

function formatCompactCurrency(
  value: number,
): string {
  return value.toLocaleString(
    "it-IT",
    {
      notation: "compact",
      maximumFractionDigits: 1,
    },
  );
}

function formatPercentage(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return `${value.toLocaleString(
    "it-IT",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}%`;
}

function formatSignedCurrency(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  const absoluteValue =
    Math.abs(value).toLocaleString(
      "it-IT",
      {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );

  if (value > 0) {
    return `+${absoluteValue}`;
  }

  if (value < 0) {
    return `−${absoluteValue}`;
  }

  return absoluteValue;
}

function applyEconomicProfileValues(
  current: ScenarioForm,
  profile: EconomicAssumptionProfile,
): ScenarioForm {
  return {
    ...current,

    liquidityReturnDeltaPct:
      String(
        profile.liquidityReturnDeltaPct,
      ),

    investmentsReturnDeltaPct:
      String(
        profile.investmentsReturnDeltaPct,
      ),

    realEstateReturnDeltaPct:
      String(
        profile.realEstateReturnDeltaPct,
      ),

    otherAssetsReturnDeltaPct:
      String(
        profile.otherAssetsReturnDeltaPct,
      ),

    liquidityTaxRatePct:
      String(
        profile.liquidityTaxRatePct,
      ),

    investmentsTaxRatePct:
      String(
        profile.investmentsTaxRatePct,
      ),

    rebalancingCostRatePct:
      String(
        profile.rebalancingCostRatePct,
      ),

    rebalancingMinimumCost:
      String(
        profile.rebalancingMinimumCost,
      ),
  };
}

export default function PlanningScenarioPanel() {
  const [
    baseline,
    setBaseline,
  ] = useState<
    PlanningScenarioBaselineResponse | null
  >(null);

  const [
    result,
    setResult,
  ] = useState<
    PlanningScenarioResponse | null
  >(null);

  const [
    assessment,
    setAssessment,
  ] = useState<
    PlanningScenarioAssessmentResponse | null
  >(null);

  const [
    allocationResult,
    setAllocationResult,
  ] = useState<
    PlanningAllocationResponse | null
  >(null);

  const [
    allocationTransfers,
    setAllocationTransfers,
  ] = useState<
    PlanningAllocationTransfer[]
  >([]);

  const [
    automaticIpsPlan,
    setAutomaticIpsPlan,
  ] = useState<
    PlanningAutomaticIpsRebalancingResponse | null
  >(null);

  const [
    optimizedIpsComparison,
    setOptimizedIpsComparison,
  ] = useState<
    PlanningOptimizedIpsComparisonResponse | null
  >(null);

  const [form, setForm] =
    useState<ScenarioForm>(
      DEFAULT_FORM,
    );

  const [
    economicProfiles,
    setEconomicProfiles,
  ] = useState<
    EconomicAssumptionProfile[]
  >([]);

  const [
    selectedEconomicProfileId,
    setSelectedEconomicProfileId,
  ] = useState("");

  const [
    loadingEconomicProfiles,
    setLoadingEconomicProfiles,
  ] = useState(true);

  const [
    economicProfileMessage,
    setEconomicProfileMessage,
  ] = useState("");

  const [
    economicProfileDialogOpen,
    setEconomicProfileDialogOpen,
  ] = useState(false);

  const [
    economicProfileDialogMode,
    setEconomicProfileDialogMode,
  ] = useState<
    "create" | "edit"
  >("create");

  const [
    savingEconomicProfile,
    setSavingEconomicProfile,
  ] = useState(false);

  const [events, setEvents] =
    useState<
      ScenarioEventDraft[]
    >([]);

  const [
    loadingBaseline,
    setLoadingBaseline,
  ] = useState(true);

  const [
    simulating,
    setSimulating,
  ] = useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    getPlanningScenarioBaseline()
      .then((response) => {
        if (active) {
          setBaseline(response);
        }
      })
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile caricare la baseline ufficiale.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingBaseline(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getEconomicAssumptionProfiles()
      .then((profiles) => {
        if (!active) {
          return;
        }

        setEconomicProfiles(profiles);

        const defaultProfile =
          profiles.find(
            (profile) =>
              profile.isDefault,
          );

        if (defaultProfile) {
          setSelectedEconomicProfileId(
            defaultProfile.id,
          );

          setForm((current) =>
            applyEconomicProfileValues(
              current,
              defaultProfile,
            ),
          );
        }
      })
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile caricare i profili economici.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingEconomicProfiles(
            false,
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const chartData = useMemo(
    () =>
      result?.years.map(
        (year) => ({
          year: year.year,
          baseline:
            year.baseline
              .capitalEnd,
          scenario:
            year.scenario
              .capitalEnd,
        }),
      ) ?? [],
    [result],
  );

  const allocationChartData =
    useMemo(
      () =>
        allocationResult?.years.map(
          (year) => ({
            year: year.year,
            LIQUIDITY:
              year.end.LIQUIDITY,
            INVESTMENTS:
              year.end.INVESTMENTS,
            REAL_ESTATE:
              year.end.REAL_ESTATE,
            OTHER_ASSETS:
              year.end.OTHER_ASSETS,
          }),
        ) ?? [],
      [allocationResult],
    );

  const selectedEconomicProfile =
    useMemo(
      () =>
        economicProfiles.find(
          (profile) =>
            profile.id ===
            selectedEconomicProfileId,
        ) ?? null,
      [
        economicProfiles,
        selectedEconomicProfileId,
      ],
    );

  const economicProfileSourceValues =
    useMemo<
      EconomicProfileSourceValues
    >(
      () => ({
        liquidityReturnDeltaPct:
          form.liquidityReturnDeltaPct,

        investmentsReturnDeltaPct:
          form.investmentsReturnDeltaPct,

        realEstateReturnDeltaPct:
          form.realEstateReturnDeltaPct,

        otherAssetsReturnDeltaPct:
          form.otherAssetsReturnDeltaPct,

        liquidityTaxRatePct:
          form.liquidityTaxRatePct ??
          "0",

        investmentsTaxRatePct:
          form.investmentsTaxRatePct ??
          "0",

        rebalancingCostRatePct:
          form.rebalancingCostRatePct ??
          "0",

        rebalancingMinimumCost:
          form.rebalancingMinimumCost ??
          "0",
      }),
      [
        form.liquidityReturnDeltaPct,
        form.investmentsReturnDeltaPct,
        form.realEstateReturnDeltaPct,
        form.otherAssetsReturnDeltaPct,
        form.liquidityTaxRatePct,
        form.investmentsTaxRatePct,
        form.rebalancingCostRatePct,
        form.rebalancingMinimumCost,
      ],
    );

  const currentEconomicProfileSnapshot =
    useMemo<
      StoredEconomicProfileSnapshotInput
    >(
      () => ({
        profileId:
          selectedEconomicProfile
            ?.id ?? null,

        code:
          selectedEconomicProfile
            ?.code ?? null,

        name:
          selectedEconomicProfile
            ?.name ??
          "Ipotesi economiche manuali",

        description:
          selectedEconomicProfile
            ?.description ?? null,

        fiscalResidence:
          selectedEconomicProfile
            ?.fiscalResidence ?? null,

        liquidityReturnDeltaPct:
          parseNumber(
            form
              .liquidityReturnDeltaPct,
          ),

        investmentsReturnDeltaPct:
          parseNumber(
            form
              .investmentsReturnDeltaPct,
          ),

        realEstateReturnDeltaPct:
          parseNumber(
            form
              .realEstateReturnDeltaPct,
          ),

        otherAssetsReturnDeltaPct:
          parseNumber(
            form
              .otherAssetsReturnDeltaPct,
          ),

        liquidityTaxRatePct:
          parseNumber(
            form
              .liquidityTaxRatePct ??
              "0",
          ),

        investmentsTaxRatePct:
          parseNumber(
            form
              .investmentsTaxRatePct ??
              "0",
          ),

        rebalancingCostRatePct:
          parseNumber(
            form
              .rebalancingCostRatePct ??
              "0",
          ),

        rebalancingMinimumCost:
          parseNumber(
            form
              .rebalancingMinimumCost ??
              "0",
          ),

        sourceProfileUpdatedAt:
          selectedEconomicProfile
            ?.updatedAt ?? null,
      }),
      [
        selectedEconomicProfile,
        form.liquidityReturnDeltaPct,
        form.investmentsReturnDeltaPct,
        form.realEstateReturnDeltaPct,
        form.otherAssetsReturnDeltaPct,
        form.liquidityTaxRatePct,
        form.investmentsTaxRatePct,
        form.rebalancingCostRatePct,
        form.rebalancingMinimumCost,
      ],
    );

  function updateForm(
    field: keyof ScenarioForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateEconomicProfile() {
    setEconomicProfileDialogMode(
      "create",
    );

    setEconomicProfileDialogOpen(
      true,
    );
  }

  function openEditEconomicProfile() {
    if (!selectedEconomicProfile) {
      setEconomicProfileMessage(
        "Seleziona il profilo da modificare.",
      );

      return;
    }

    setEconomicProfileDialogMode(
      "edit",
    );

    setEconomicProfileDialogOpen(
      true,
    );
  }

  async function saveEconomicProfile(
    input:
      EconomicAssumptionProfileInput,
  ) {
    setSavingEconomicProfile(true);

    try {
      const savedProfile =
        economicProfileDialogMode ===
          "edit" &&
        selectedEconomicProfile
          ? await updateEconomicAssumptionProfile(
              selectedEconomicProfile.id,
              input,
            )
          : await createEconomicAssumptionProfile(
              input,
            );

      const profiles =
        await getEconomicAssumptionProfiles();

      setEconomicProfiles(profiles);

      setSelectedEconomicProfileId(
        savedProfile.id,
      );

      setForm((current) =>
        applyEconomicProfileValues(
          current,
          savedProfile,
        ),
      );

      setEconomicProfileDialogOpen(
        false,
      );

      setEconomicProfileMessage(
        economicProfileDialogMode ===
          "edit"
          ? `Profilo “${savedProfile.name}” aggiornato e applicato.`
          : `Profilo “${savedProfile.name}” creato e applicato.`,
      );
    } catch (requestError) {
      console.error(requestError);

      window.alert(
        requestError instanceof Error
          ? requestError.message
          : "Impossibile salvare il profilo economico.",
      );
    } finally {
      setSavingEconomicProfile(false);
    }
  }

  async function makeSelectedProfileDefault() {
    if (
      !selectedEconomicProfile ||
      selectedEconomicProfile.isDefault
    ) {
      return;
    }

    setSavingEconomicProfile(true);

    try {
      const updated =
        await setDefaultEconomicAssumptionProfile(
          selectedEconomicProfile.id,
        );

      const profiles =
        await getEconomicAssumptionProfiles();

      setEconomicProfiles(profiles);

      setSelectedEconomicProfileId(
        updated.id,
      );

      setEconomicProfileMessage(
        `“${updated.name}” è ora il profilo predefinito.`,
      );
    } catch (requestError) {
      console.error(requestError);

      setEconomicProfileMessage(
        "Impossibile impostare il profilo predefinito.",
      );
    } finally {
      setSavingEconomicProfile(false);
    }
  }

  async function archiveSelectedProfile() {
    if (!selectedEconomicProfile) {
      return;
    }

    if (
      selectedEconomicProfile.isDefault
    ) {
      setEconomicProfileMessage(
        "Il profilo predefinito non può essere archiviato. Imposta prima un altro profilo come predefinito.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Archiviare il profilo “${selectedEconomicProfile.name}”?`,
      );

    if (!confirmed) {
      return;
    }

    setSavingEconomicProfile(true);

    try {
      await archiveEconomicAssumptionProfile(
        selectedEconomicProfile.id,
      );

      const profiles =
        await getEconomicAssumptionProfiles();

      setEconomicProfiles(profiles);

      const nextProfile =
        profiles.find(
          (profile) =>
            profile.isDefault,
        ) ??
        profiles[0] ??
        null;

      setSelectedEconomicProfileId(
        nextProfile?.id ?? "",
      );

      if (nextProfile) {
        setForm((current) =>
          applyEconomicProfileValues(
            current,
            nextProfile,
          ),
        );
      }

      setEconomicProfileMessage(
        `Profilo “${selectedEconomicProfile.name}” archiviato.`,
      );
    } catch (requestError) {
      console.error(requestError);

      setEconomicProfileMessage(
        "Impossibile archiviare il profilo economico.",
      );
    } finally {
      setSavingEconomicProfile(false);
    }
  }

  function applySelectedEconomicProfile() {
    const selectedProfile =
      economicProfiles.find(
        (profile) =>
          profile.id ===
          selectedEconomicProfileId,
      );

    if (!selectedProfile) {
      setEconomicProfileMessage(
        "Seleziona un profilo economico.",
      );

      return;
    }

    setForm((current) =>
      applyEconomicProfileValues(
        current,
        selectedProfile,
      ),
    );

    setResult(null);
    setAssessment(null);
    setAllocationResult(null);
    setAutomaticIpsPlan(null);
    setOptimizedIpsComparison(null);

    setEconomicProfileMessage(
      `Profilo “${selectedProfile.name}” applicato. Esegui nuovamente la simulazione.`,
    );
  }

  function addEvent() {
    const defaultYear =
      baseline?.budget.longTerm
        .startYear ?? 2027;

    setEvents((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        year:
          String(defaultYear),
        label: "",
        amount: "0",
        category:
          "EXTRAORDINARY",
      },
    ]);
  }

  function updateEvent(
    id: string,
    field:
      | "year"
      | "label"
      | "amount"
      | "category",
    value: string,
  ) {
    setEvents((current) =>
      current.map((event) =>
        event.id === id
          ? {
              ...event,
              [field]: value,
            }
          : event,
      ),
    );
  }

  function removeEvent(
    id: string,
  ) {
    setEvents((current) =>
      current.filter(
        (event) =>
          event.id !== id,
      ),
    );
  }

  function resetScenario() {
    setForm(DEFAULT_FORM);
    setEvents([]);
    setResult(null);
    setAssessment(null);
    setAllocationResult(null);
    setOptimizedIpsComparison(null);
    setAutomaticIpsPlan(null);
    setAllocationTransfers([]);
    setError("");
  }

  async function runScenario(
    transfersOverride?:
      PlanningAllocationTransfer[],
  ) {
    setSimulating(true);
    setError("");
    setAllocationResult(null);
    setOptimizedIpsComparison(null);
    setAutomaticIpsPlan(null);

    try {
      const invalidEvent =
        events.find(
          (event) =>
            !event.label.trim() ||
            !Number.isInteger(
              Number(event.year),
            ) ||
            !Number.isFinite(
              parseNumber(
                event.amount,
              ),
            ),
        );

      if (invalidEvent) {
        setError(
          "Completa correttamente tutti gli eventi straordinari.",
        );
        return;
      }

      const input: SimulatePlanningScenarioInput =
        {
          name:
            form.name.trim() ||
            "Scenario personalizzato",

          description:
            form.description.trim(),

          initialCapitalAdjustment:
            parseNumber(
              form.initialCapitalAdjustment,
            ),

          annualReturnAdjustmentPct:
            parseNumber(
              form.annualReturnAdjustmentPct,
            ),

          annualCostAdjustmentPct:
            parseNumber(
              form.annualCostAdjustmentPct,
            ),

          annualRevenueAdjustmentPct:
            parseNumber(
              form.annualRevenueAdjustmentPct,
            ),

          expenseInflationDeltaPct:
            parseNumber(
              form.expenseInflationDeltaPct,
            ),

          events: events.map(
            (event) => ({
              year: Number(
                event.year,
              ),

              label:
                event.label.trim(),

              amount:
                parseNumber(
                  event.amount,
                ),

              category:
                event.category,
            }),
          ),
        };

      const effectiveTransfers =
        transfersOverride ??
        allocationTransfers;

      const response =
        await assessPlanningAllocationScenario({
          ...input,

          allocation: {
            liquidityReturnDeltaPct:
              parseNumber(
                form.liquidityReturnDeltaPct,
              ),

            investmentsReturnDeltaPct:
              parseNumber(
                form.investmentsReturnDeltaPct,
              ),

            realEstateReturnDeltaPct:
              parseNumber(
                form.realEstateReturnDeltaPct,
              ),

            otherAssetsReturnDeltaPct:
              parseNumber(
                form.otherAssetsReturnDeltaPct,
              ),

            liquidityTaxRatePct:
              parseNumber(
                form.liquidityTaxRatePct ??
                  "0",
              ),

            investmentsTaxRatePct:
              parseNumber(
                form.investmentsTaxRatePct ??
                  "0",
              ),

            rebalancingCostRatePct:
              parseNumber(
                form.rebalancingCostRatePct ??
                  "0",
              ),

            rebalancingMinimumCost:
              parseNumber(
                form.rebalancingMinimumCost ??
                  "0",
              ),

            positiveCashFlowDestination:
              "LIQUIDITY",

            deficitFundingOrder: [
              "LIQUIDITY",
              "INVESTMENTS",
              "OTHER_ASSETS",
              "REAL_ESTATE",
            ],

            transfers:
              effectiveTransfers,
          },
        });

      setResult(
        response.scenario,
      );

      setAssessment(response);

      setAllocationResult(
        response.allocation,
      );

      setAllocationTransfers(
        effectiveTransfers,
      );
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile calcolare lo scenario. Controlla i valori inseriti.",
      );
    } finally {
      setSimulating(false);
    }
  }



  async function applyIpsRemediation() {
    const plan =
      allocationResult
        ?.ipsProjection
        .remediationPlans[0];

    if (
      !plan ||
      plan.recommendedAmount <= 0
    ) {
      return;
    }

    const transfer:
      PlanningAllocationTransfer = {
        year:
          plan.year,

        label:
          `${plan.label} ${plan.year}`,

        from:
          plan.source,

        to:
          plan.destination,

        amount:
          plan.recommendedAmount,

        timing:
          plan.timing,
      };

    /*
     * Mantiene i ribilanciamenti
     * degli anni precedenti.
     * Sostituisce soltanto un eventuale
     * trasferimento dello stesso anno
     * e tra le stesse asset class.
     */
    const nextTransfers = [
      ...allocationTransfers.filter(
        (item) =>
          !(
            item.year ===
              transfer.year &&
            item.from ===
              transfer.from &&
            item.to ===
              transfer.to &&
            item.timing ===
              transfer.timing
          ),
      ),

      transfer,
    ];

    setAutomaticIpsPlan(null);
    setSimulating(true);
    setError("");

    try {
      const input:
        SimulatePlanningScenarioInput = {
          name:
            form.name.trim() ||
            "Scenario personalizzato",

          description:
            form.description.trim(),

          initialCapitalAdjustment:
            parseNumber(
              form.initialCapitalAdjustment,
            ),

          annualReturnAdjustmentPct:
            parseNumber(
              form.annualReturnAdjustmentPct,
            ),

          annualCostAdjustmentPct:
            parseNumber(
              form.annualCostAdjustmentPct,
            ),

          annualRevenueAdjustmentPct:
            parseNumber(
              form.annualRevenueAdjustmentPct,
            ),

          expenseInflationDeltaPct:
            parseNumber(
              form.expenseInflationDeltaPct,
            ),

          events: events.map(
            (event) => ({
              year:
                Number(event.year),

              label:
                event.label.trim(),

              amount:
                parseNumber(
                  event.amount,
                ),

              category:
                event.category,
            }),
          ),
        };

      const integratedResponse =
        await assessPlanningAllocationScenario({
          ...input,

          allocation: {
            liquidityReturnDeltaPct:
              parseNumber(
                form.liquidityReturnDeltaPct,
              ),

            investmentsReturnDeltaPct:
              parseNumber(
                form.investmentsReturnDeltaPct,
              ),

            realEstateReturnDeltaPct:
              parseNumber(
                form.realEstateReturnDeltaPct,
              ),

            otherAssetsReturnDeltaPct:
              parseNumber(
                form.otherAssetsReturnDeltaPct,
              ),

            liquidityTaxRatePct:
              parseNumber(
                form.liquidityTaxRatePct ??
                  "0",
              ),

            investmentsTaxRatePct:
              parseNumber(
                form.investmentsTaxRatePct ??
                  "0",
              ),

            rebalancingCostRatePct:
              parseNumber(
                form.rebalancingCostRatePct ??
                  "0",
              ),

            rebalancingMinimumCost:
              parseNumber(
                form.rebalancingMinimumCost ??
                  "0",
              ),

            positiveCashFlowDestination:
              "LIQUIDITY",

            deficitFundingOrder: [
              "LIQUIDITY",
              "INVESTMENTS",
              "OTHER_ASSETS",
              "REAL_ESTATE",
            ],

            transfers:
              nextTransfers,
          },
        });

      setAllocationTransfers(
        nextTransfers,
      );

      setResult(
        integratedResponse.scenario,
      );

      setAssessment(
        integratedResponse,
      );

      setAllocationResult(
        integratedResponse.allocation,
      );
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile applicare il ribilanciamento IPS.",
      );
    } finally {
      setSimulating(false);
    }
  }

  async function applyFullIpsPlan() {
    setSimulating(true);
    setError("");
    setAutomaticIpsPlan(null);

    try {
      const input:
        SimulatePlanningScenarioInput = {
          name:
            form.name.trim() ||
            "Scenario personalizzato",

          description:
            form.description.trim(),

          initialCapitalAdjustment:
            parseNumber(
              form.initialCapitalAdjustment,
            ),

          annualReturnAdjustmentPct:
            parseNumber(
              form.annualReturnAdjustmentPct,
            ),

          annualCostAdjustmentPct:
            parseNumber(
              form.annualCostAdjustmentPct,
            ),

          annualRevenueAdjustmentPct:
            parseNumber(
              form.annualRevenueAdjustmentPct,
            ),

          expenseInflationDeltaPct:
            parseNumber(
              form.expenseInflationDeltaPct,
            ),

          events: events.map(
            (event) => ({
              year:
                Number(event.year),

              label:
                event.label.trim(),

              amount:
                parseNumber(
                  event.amount,
                ),

              category:
                event.category,
            }),
          ),
        };

      const automaticResponse =
        await applyAutomaticIpsRebalancingPlan(
          {
            ...input,

            allocation: {
              liquidityReturnDeltaPct:
                parseNumber(
                  form.liquidityReturnDeltaPct,
                ),

              investmentsReturnDeltaPct:
                parseNumber(
                  form.investmentsReturnDeltaPct,
                ),

              realEstateReturnDeltaPct:
                parseNumber(
                  form.realEstateReturnDeltaPct,
                ),

              otherAssetsReturnDeltaPct:
                parseNumber(
                  form.otherAssetsReturnDeltaPct,
                ),

              liquidityTaxRatePct:
                parseNumber(
                  form.liquidityTaxRatePct ??
                    "0",
                ),

              investmentsTaxRatePct:
                parseNumber(
                  form.investmentsTaxRatePct ??
                    "0",
                ),

              rebalancingCostRatePct:
                parseNumber(
                  form.rebalancingCostRatePct ??
                    "0",
                ),

              rebalancingMinimumCost:
                parseNumber(
                  form.rebalancingMinimumCost ??
                    "0",
                ),

              positiveCashFlowDestination:
                "LIQUIDITY",

              deficitFundingOrder: [
                "LIQUIDITY",
                "INVESTMENTS",
                "OTHER_ASSETS",
                "REAL_ESTATE",
              ],

              transfers:
                allocationTransfers,
            },
          },

          40,
        );

      const finalAssessment =
        automaticResponse
          .finalAssessment;

      setAllocationTransfers(
        automaticResponse
          .finalTransfers,
      );

      setResult(
        finalAssessment.scenario,
      );

      setAssessment(
        finalAssessment,
      );

      setAllocationResult(
        finalAssessment.allocation,
      );

      setAutomaticIpsPlan(
        automaticResponse,
      );
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile applicare il piano IPS automatico.",
      );
    } finally {
      setSimulating(false);
    }
  }

  async function compareOptimizedIpsStrategies() {
    setSimulating(true);
    setError("");
    setOptimizedIpsComparison(null);

    try {
      const input:
        SimulatePlanningScenarioInput = {
          name:
            form.name.trim() ||
            "Scenario personalizzato",

          description:
            form.description.trim(),

          initialCapitalAdjustment:
            parseNumber(
              form.initialCapitalAdjustment,
            ),

          annualReturnAdjustmentPct:
            parseNumber(
              form.annualReturnAdjustmentPct,
            ),

          annualCostAdjustmentPct:
            parseNumber(
              form.annualCostAdjustmentPct,
            ),

          annualRevenueAdjustmentPct:
            parseNumber(
              form.annualRevenueAdjustmentPct,
            ),

          expenseInflationDeltaPct:
            parseNumber(
              form.expenseInflationDeltaPct,
            ),

          events: events.map(
            (event) => ({
              year:
                Number(event.year),

              label:
                event.label.trim(),

              amount:
                parseNumber(
                  event.amount,
                ),

              category:
                event.category,
            }),
          ),
        };

      const comparison =
        await compareOptimizedIpsRebalancingStrategies({
          ...input,

          allocation: {
            liquidityReturnDeltaPct:
              parseNumber(
                form.liquidityReturnDeltaPct,
              ),

            investmentsReturnDeltaPct:
              parseNumber(
                form.investmentsReturnDeltaPct,
              ),

            realEstateReturnDeltaPct:
              parseNumber(
                form.realEstateReturnDeltaPct,
              ),

            otherAssetsReturnDeltaPct:
              parseNumber(
                form.otherAssetsReturnDeltaPct,
              ),

            liquidityTaxRatePct:
              parseNumber(
                form.liquidityTaxRatePct ??
                  "0",
              ),

            investmentsTaxRatePct:
              parseNumber(
                form.investmentsTaxRatePct ??
                  "0",
              ),

            rebalancingCostRatePct:
              parseNumber(
                form.rebalancingCostRatePct ??
                  "0",
              ),

            rebalancingMinimumCost:
              parseNumber(
                form.rebalancingMinimumCost ??
                  "0",
              ),

            positiveCashFlowDestination:
              "LIQUIDITY",

            deficitFundingOrder: [
              "LIQUIDITY",
              "INVESTMENTS",
              "OTHER_ASSETS",
              "REAL_ESTATE",
            ],

            transfers:
              allocationTransfers,
          },
        });

      setOptimizedIpsComparison(
        comparison,
      );
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile confrontare le strategie IPS ottimizzate.",
      );
    } finally {
      setSimulating(false);
    }
  }

  function applyOptimizedIpsStrategy(
    strategy:
      PlanningOptimizedIpsStrategyResult,
  ) {
    setAllocationTransfers(
      strategy.finalTransfers,
    );

    setResult(
      strategy
        .finalAssessment
        .scenario,
    );

    setAssessment(
      strategy.finalAssessment,
    );

    setAllocationResult(
      strategy
        .finalAssessment
        .allocation,
    );

    setAutomaticIpsPlan(null);
  }

  function applyScenarioPreset(
    assumptions:
      SimulatePlanningScenarioInput,
  ) {
    setForm({
      name:
        assumptions.name ??
        "Scenario personalizzato",

      description:
        assumptions.description ??
        "",

      initialCapitalAdjustment:
        String(
          assumptions
            .initialCapitalAdjustment ??
            0,
        ),

      annualReturnAdjustmentPct:
        String(
          assumptions
            .annualReturnAdjustmentPct ??
            0,
        ),

      annualCostAdjustmentPct:
        String(
          assumptions
            .annualCostAdjustmentPct ??
            0,
        ),

      annualRevenueAdjustmentPct:
        String(
          assumptions
            .annualRevenueAdjustmentPct ??
            0,
        ),

      expenseInflationDeltaPct:
        String(
          assumptions
            .expenseInflationDeltaPct ??
            0,
        ),

      liquidityReturnDeltaPct:
        "0",

      investmentsReturnDeltaPct:
        "0",

      realEstateReturnDeltaPct:
        "0",

      otherAssetsReturnDeltaPct:
        "0",
    });

    setEvents(
      (assumptions.events ?? []).map(
        (event, index) => ({
          id:
            `preset-${Date.now()}-${index}`,

          year:
            String(event.year),

          label:
            event.label,

          amount:
            String(event.amount),

          category:
            event.category ??
            "EXTRAORDINARY",
        }),
      ),
    );

    setResult(null);
    setAssessment(null);
    setAllocationResult(null);
    setOptimizedIpsComparison(null);
    setAutomaticIpsPlan(null);
    setAllocationTransfers([]);
    setError("");
  }

  function loadStoredScenario(
    assumptions:
      SimulatePlanningScenarioInput,
    storedResult:
      PlanningScenarioResponse | null,
    economicProfile:
      StoredEconomicProfileSnapshot | null,
  ) {
    setForm({
      name:
        assumptions.name ??
        "Scenario personalizzato",

      description:
        assumptions.description ??
        "",

      initialCapitalAdjustment:
        String(
          assumptions
            .initialCapitalAdjustment ??
            0,
        ),

      annualReturnAdjustmentPct:
        String(
          assumptions
            .annualReturnAdjustmentPct ??
            0,
        ),

      annualCostAdjustmentPct:
        String(
          assumptions
            .annualCostAdjustmentPct ??
            0,
        ),

      annualRevenueAdjustmentPct:
        String(
          assumptions
            .annualRevenueAdjustmentPct ??
            0,
        ),

      expenseInflationDeltaPct:
        String(
          assumptions
            .expenseInflationDeltaPct ??
            0,
        ),

      liquidityReturnDeltaPct:
        String(
          economicProfile
            ?.liquidityReturnDeltaPct ??
            0,
        ),

      investmentsReturnDeltaPct:
        String(
          economicProfile
            ?.investmentsReturnDeltaPct ??
            0,
        ),

      realEstateReturnDeltaPct:
        String(
          economicProfile
            ?.realEstateReturnDeltaPct ??
            0,
        ),

      otherAssetsReturnDeltaPct:
        String(
          economicProfile
            ?.otherAssetsReturnDeltaPct ??
            0,
        ),

      liquidityTaxRatePct:
        String(
          economicProfile
            ?.liquidityTaxRatePct ??
            0,
        ),

      investmentsTaxRatePct:
        String(
          economicProfile
            ?.investmentsTaxRatePct ??
            0,
        ),

      rebalancingCostRatePct:
        String(
          economicProfile
            ?.rebalancingCostRatePct ??
            0,
        ),

      rebalancingMinimumCost:
        String(
          economicProfile
            ?.rebalancingMinimumCost ??
            0,
        ),
    });

    setEvents(
      (assumptions.events ?? []).map(
        (event, index) => ({
          id:
            `stored-${Date.now()}-${index}`,

          year:
            String(event.year),

          label:
            event.label,

          amount:
            String(event.amount),

          category:
            event.category ??
            "EXTRAORDINARY",
        }),
      ),
    );

    const matchingProfile =
      economicProfile
        ? economicProfiles.find(
            (profile) =>
              profile.id ===
                economicProfile.profileId ||
              profile.code ===
                economicProfile.code,
          ) ?? null
        : null;

    setSelectedEconomicProfileId(
      matchingProfile?.id ?? "",
    );

    setEconomicProfileMessage(
      economicProfile
        ? `Snapshot economico storico “${economicProfile.name ?? "Ipotesi manuali"}” ripristinato.`
        : "Scenario storico senza snapshot economico: sono stati applicati valori neutri.",
    );

    setResult(storedResult);
    setAssessment(null);
    setAllocationResult(null);
    setOptimizedIpsComparison(null);
    setAutomaticIpsPlan(null);
    setAllocationTransfers([]);
    setError("");
  }

  const statusColor =
    result?.summary.status ===
    "SUSTAINABLE"
      ? "success"
      : result?.summary.status ===
          "AT_RISK"
        ? "warning"
        : "error";

  const statusLabel =
    result?.summary.status ===
    "SUSTAINABLE"
      ? "Capitale sostenibile"
      : result?.summary.status ===
          "AT_RISK"
        ? "Capitale a rischio"
        : "Capitale non sostenibile";

  if (loadingBaseline) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          minHeight: 160,
          display: "grid",
          placeItems: "center",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: {
          xs: 2.5,
          md: 3.5,
        },
        mb: 3,
        border: "1px solid",
        borderColor: "divider",
        boxShadow:
          "0 12px 32px rgba(26,45,75,0.06)",
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
          mb: 2.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1.3,
            alignItems: "center",
          }}
        >
          <ScienceRoundedIcon
            color="primary"
          />

          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
              }}
            >
              Scenario Lab
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.3 }}
            >
              Simulazioni patrimoniali
              senza modificare i dati
              ufficiali.
            </Typography>
          </Box>
        </Box>

        <Chip
          icon={<LockRoundedIcon />}
          label="Baseline bloccata"
          color="success"
          variant="outlined"
        />
      </Box>

      {baseline && (
        <Alert
          severity="info"
          icon={<LockRoundedIcon />}
          sx={{ mb: 2.5 }}
        >
          La baseline ufficiale deriva da{" "}
          <strong>
            {baseline.source.workbook}
          </strong>
          , con orizzonte{" "}
          {
            baseline.budget.longTerm
              .startYear
          }
          –
          {
            baseline.budget.longTerm
              .endYear
          }
          . Le simulazioni non modificano
          Excel o database.
        </Alert>
      )}


      <PlanningScenarioPresets
        startYear={
          baseline?.budget.longTerm
            .startYear ?? null
        }
        onApplyPreset={
          applyScenarioPreset
        }
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2.5 }}
        >
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md:
              "repeat(2, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <TextField
          label="Nome scenario"
          value={form.name}
          onChange={(event) =>
            updateForm(
              "name",
              event.target.value,
            )
          }
          fullWidth
        />

        <TextField
          label="Descrizione"
          value={
            form.description
          }
          onChange={(event) =>
            updateForm(
              "description",
              event.target.value,
            )
          }
          fullWidth
        />
      </Box>

      <Typography
        variant="subtitle1"
        sx={{
          mt: 3,
          mb: 1.5,
          fontWeight: 800,
        }}
      >
        Ipotesi rispetto alla baseline
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm:
              "repeat(2, minmax(0, 1fr))",
            xl:
              "repeat(5, minmax(0, 1fr))",
          },
          gap: 1.5,
        }}
      >
        <TextField
          label="Rettifica capitale iniziale"
          type="number"
          value={
            form.initialCapitalAdjustment
          }
          onChange={(event) =>
            updateForm(
              "initialCapitalAdjustment",
              event.target.value,
            )
          }
          helperText="Euro"
          fullWidth
        />

        <TextField
          label="Rendimento annuale"
          type="number"
          value={
            form.annualReturnAdjustmentPct
          }
          onChange={(event) =>
            updateForm(
              "annualReturnAdjustmentPct",
              event.target.value,
            )
          }
          helperText="Variazione %"
          fullWidth
        />

        <TextField
          label="Costi annuali"
          type="number"
          value={
            form.annualCostAdjustmentPct
          }
          onChange={(event) =>
            updateForm(
              "annualCostAdjustmentPct",
              event.target.value,
            )
          }
          helperText="Variazione %"
          fullWidth
        />

        <TextField
          label="Ricavi annuali"
          type="number"
          value={
            form.annualRevenueAdjustmentPct
          }
          onChange={(event) =>
            updateForm(
              "annualRevenueAdjustmentPct",
              event.target.value,
            )
          }
          helperText="Variazione %"
          fullWidth
        />

        <TextField
          label="Inflazione aggiuntiva"
          type="number"
          value={
            form.expenseInflationDeltaPct
          }
          onChange={(event) =>
            updateForm(
              "expenseInflationDeltaPct",
              event.target.value,
            )
          }
          helperText="Punti % annui"
          fullWidth
        />
      </Box>

      <Box
        sx={{
          mt: 3,
          mb: 1.5,
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800 }}
          >
            Eventi straordinari
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Acquisti, vendite o altri
            movimenti una tantum.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            <AddRoundedIcon />
          }
          onClick={addEvent}
        >
          Aggiungi evento
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          mt: 2,
          mb: 2,
          p: {
            xs: 1.5,
            md: 2,
          },
          border: "1px solid",
          borderColor: "divider",
          backgroundColor:
            "rgba(31,111,178,0.025)",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 800,
          }}
        >
          Profilo ipotesi economiche
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.4,
            mb: 1.5,
          }}
        >
          Carica un insieme salvato di
          rendimenti, aliquote fiscali e
          costi di ribilanciamento.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md:
                "minmax(0, 1fr) auto",
            },
            gap: 1.2,
            alignItems: "center",
          }}
        >
          <TextField
            select
            size="small"
            label="Profilo salvato"
            value={
              selectedEconomicProfileId
            }
            disabled={
              loadingEconomicProfiles ||
              economicProfiles.length === 0
            }
            onChange={(changeEvent) => {
              setSelectedEconomicProfileId(
                changeEvent.target.value,
              );

              setEconomicProfileMessage(
                "",
              );
            }}
          >
            {economicProfiles.length ===
            0 ? (
              <MenuItem
                value=""
                disabled
              >
                Nessun profilo disponibile
              </MenuItem>
            ) : (
              economicProfiles.map(
                (profile) => (
                  <MenuItem
                    key={profile.id}
                    value={profile.id}
                  >
                    {profile.name}
                    {profile.isDefault
                      ? " · Predefinito"
                      : ""}
                  </MenuItem>
                ),
              )
            )}
          </TextField>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Button
              variant="contained"
              disabled={
                loadingEconomicProfiles ||
                savingEconomicProfile ||
                !selectedEconomicProfile
              }
              onClick={
                applySelectedEconomicProfile
              }
            >
              Applica
            </Button>

            <Button
              variant="outlined"
              disabled={
                savingEconomicProfile
              }
              onClick={
                openCreateEconomicProfile
              }
            >
              Nuovo
            </Button>

            <Button
              variant="outlined"
              disabled={
                savingEconomicProfile ||
                !selectedEconomicProfile
              }
              onClick={
                openEditEconomicProfile
              }
            >
              Modifica
            </Button>

            <Button
              variant="outlined"
              disabled={
                savingEconomicProfile ||
                !selectedEconomicProfile ||
                selectedEconomicProfile
                  .isDefault
              }
              onClick={
                makeSelectedProfileDefault
              }
            >
              Predefinito
            </Button>

            <Button
              variant="outlined"
              color="error"
              disabled={
                savingEconomicProfile ||
                !selectedEconomicProfile ||
                selectedEconomicProfile
                  .isDefault
              }
              onClick={
                archiveSelectedProfile
              }
            >
              Archivia
            </Button>
          </Box>
        </Box>

        <EconomicAssumptionProfileDialog
          open={
            economicProfileDialogOpen
          }
          mode={
            economicProfileDialogMode
          }
          profile={
            economicProfileDialogMode ===
            "edit"
              ? selectedEconomicProfile
              : null
          }
          sourceValues={
            economicProfileSourceValues
          }
          saving={
            savingEconomicProfile
          }
          onClose={() =>
            setEconomicProfileDialogOpen(
              false,
            )
          }
          onSave={
            saveEconomicProfile
          }
        />

        {economicProfileMessage ? (
          <Alert
            severity="info"
            sx={{
              mt: 1.5,
            }}
          >
            {economicProfileMessage}
          </Alert>
        ) : null}

        <Divider
          sx={{
            my: 2,
          }}
        />

        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 800,
          }}
        >
          Rendimenti per asset class
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.4,
            mb: 1.8,
          }}
        >
          Variazioni aggiuntive rispetto
          al rendimento generale dello
          scenario.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm:
                "repeat(2, minmax(0, 1fr))",
              lg:
                "repeat(4, minmax(0, 1fr))",
            },
            gap: 1.4,
          }}
        >
          <TextField
            label="Liquidità · delta %"
            type="number"
            size="small"
            value={
              form.liquidityReturnDeltaPct
            }
            onChange={(changeEvent) =>
              updateForm(
                "liquidityReturnDeltaPct",
                changeEvent.target.value,
              )
            }
            slotProps={{
              htmlInput: {
                step: 0.1,
              },
            }}
          />

          <TextField
            label="Investimenti · delta %"
            type="number"
            size="small"
            value={
              form.investmentsReturnDeltaPct
            }
            onChange={(changeEvent) =>
              updateForm(
                "investmentsReturnDeltaPct",
                changeEvent.target.value,
              )
            }
            slotProps={{
              htmlInput: {
                step: 0.1,
              },
            }}
          />

          <TextField
            label="Immobili · delta %"
            type="number"
            size="small"
            value={
              form.realEstateReturnDeltaPct
            }
            onChange={(changeEvent) =>
              updateForm(
                "realEstateReturnDeltaPct",
                changeEvent.target.value,
              )
            }
            slotProps={{
              htmlInput: {
                step: 0.1,
              },
            }}
          />

          <TextField
            label="Altri attivi · delta %"
            type="number"
            size="small"
            value={
              form.otherAssetsReturnDeltaPct
            }
            onChange={(changeEvent) =>
              updateForm(
                "otherAssetsReturnDeltaPct",
                changeEvent.target.value,
              )
            }
            slotProps={{
              htmlInput: {
                step: 0.1,
              },
            }}
          />

          <TextField
            label="Imposta liquidità %"
            type="number"
            size="small"
            value={
              form.liquidityTaxRatePct ??
              "0"
            }
            onChange={(changeEvent) =>
              updateForm(
                "liquidityTaxRatePct",
                changeEvent.target.value,
              )
            }
            slotProps={{
              htmlInput: {
                min: 0,
                max: 100,
                step: 0.1,
              },
            }}
          />

          <TextField
            label="Imposta investimenti %"
            type="number"
            size="small"
            value={
              form.investmentsTaxRatePct ??
              "0"
            }
            onChange={(changeEvent) =>
              updateForm(
                "investmentsTaxRatePct",
                changeEvent.target.value,
              )
            }
            slotProps={{
              htmlInput: {
                min: 0,
                max: 100,
                step: 0.1,
              },
            }}
          />

          <TextField
            label="Costo ribilanciamento %"
            type="number"
            size="small"
            value={
              form.rebalancingCostRatePct ??
              "0"
            }
            onChange={(changeEvent) =>
              updateForm(
                "rebalancingCostRatePct",
                changeEvent.target.value,
              )
            }
            slotProps={{
              htmlInput: {
                min: 0,
                max: 10,
                step: 0.01,
              },
            }}
          />

          <TextField
            label="Costo minimo operazione €"
            type="number"
            size="small"
            value={
              form.rebalancingMinimumCost ??
              "0"
            }
            onChange={(changeEvent) =>
              updateForm(
                "rebalancingMinimumCost",
                changeEvent.target.value,
              )
            }
            slotProps={{
              htmlInput: {
                min: 0,
                step: 1,
              },
            }}
          />
        </Box>
      </Paper>

      {events.length === 0 ? (
        <Alert severity="info">
          Nessun evento straordinario
          aggiunto.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1.2,
          }}
        >
          {events.map(
            (event) => (
              <Paper
                key={event.id}
                elevation={0}
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor:
                    "divider",
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md:
                      "120px minmax(220px, 1fr) 180px 160px auto",
                  },
                  gap: 1.2,
                  alignItems: "center",
                }}
              >
                <TextField
                  label="Anno"
                  type="number"
                  size="small"
                  value={event.year}
                  onChange={(
                    changeEvent,
                  ) =>
                    updateEvent(
                      event.id,
                      "year",
                      changeEvent
                        .target.value,
                    )
                  }
                />

                <TextField
                  label="Descrizione"
                  size="small"
                  value={event.label}
                  onChange={(
                    changeEvent,
                  ) =>
                    updateEvent(
                      event.id,
                      "label",
                      changeEvent
                        .target.value,
                    )
                  }
                />

                <TextField
                  label="Importo"
                  type="number"
                  size="small"
                  value={event.amount}
                  onChange={(
                    changeEvent,
                  ) =>
                    updateEvent(
                      event.id,
                      "amount",
                      changeEvent
                        .target.value,
                    )
                  }
                  helperText={
                    "Negativo = uscita"
                  }
                />

                <TextField
                  label="Categoria"
                  size="small"
                  value={
                    event.category
                  }
                  onChange={(
                    changeEvent,
                  ) =>
                    updateEvent(
                      event.id,
                      "category",
                      changeEvent
                        .target.value,
                    )
                  }
                />

                <IconButton
                  color="error"
                  aria-label="Elimina evento"
                  onClick={() =>
                    removeEvent(
                      event.id,
                    )
                  }
                >
                  <DeleteOutlineRoundedIcon />
                </IconButton>
              </Paper>
            ),
          )}
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent:
            "flex-end",
          flexWrap: "wrap",
          gap: 1.2,
          mt: 3,
        }}
      >
        <Button
          variant="outlined"
          startIcon={
            <RestartAltRoundedIcon />
          }
          onClick={resetScenario}
          disabled={simulating}
        >
          Reimposta
        </Button>

        <Button
          variant="contained"
          startIcon={
            simulating ? (
              <CircularProgress
                size={17}
                color="inherit"
              />
            ) : (
              <PlayArrowRoundedIcon />
            )
          }
          onClick={() =>
            void runScenario()
          }
          disabled={simulating}
        >
          {simulating
            ? "Calcolo..."
            : "Calcola scenario"}
        </Button>
      </Box>

      {result && (
        <>
          <Divider sx={{ my: 3.5 }} />

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
              gap: 1.5,
              mb: 2.5,
            }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                }}
              >
                {result.scenario.name}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.3 }}
              >
                Confronto con la baseline
                ufficiale.
              </Typography>
            </Box>

            <Chip
              label={statusLabel}
              color={statusColor}
              sx={{
                fontWeight: 800,
              }}
            />
          </Box>

          {result.warnings.map(
            (warning) => (
              <Alert
                key={warning}
                severity={
                  result.summary.status ===
                  "UNSUSTAINABLE"
                    ? "error"
                    : result.summary.status ===
                        "AT_RISK"
                      ? "warning"
                      : "info"
                }
                sx={{ mb: 1.2 }}
              >
                {warning}
              </Alert>
            ),
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm:
                  "repeat(2, minmax(0, 1fr))",
                xl:
                  "repeat(4, minmax(0, 1fr))",
              },
              gap: 1.5,
              mt: 2.5,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Capitale finale
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  mt: 0.5,
                  fontWeight: 800,
                }}
              >
                {formatCurrency(
                  result.summary
                    .finalCapital,
                )}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Variazione dalla baseline
              </Typography>

              <Typography
                variant="h6"
                color={
                  (
                    result.comparison
                      .finalCapitalDelta ??
                    0
                  ) >= 0
                    ? "success.main"
                    : "error.main"
                }
                sx={{
                  mt: 0.5,
                  fontWeight: 800,
                }}
              >
                {formatSignedCurrency(
                  result.comparison
                    .finalCapitalDelta,
                )}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                {formatPercentage(
                  result.comparison
                    .finalCapitalDeltaPct,
                )}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Capitale minimo
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  mt: 0.5,
                  fontWeight: 800,
                }}
              >
                {formatCurrency(
                  result.summary
                    .minimumCapital,
                )}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Nel{" "}
                {result.summary
                  .minimumCapitalYear ??
                  "—"}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Drawdown massimo
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                  mt: 0.5,
                }}
              >
                {(
                  result.summary
                    .maximumDrawdownPct ??
                  0
                ) > 50 ? (
                  <TrendingDownRoundedIcon
                    color="error"
                  />
                ) : (
                  <TrendingUpRoundedIcon
                    color="success"
                  />
                )}

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                  }}
                >
                  {formatPercentage(
                    result.summary
                      .maximumDrawdownPct,
                  )}
                </Typography>
              </Box>
            </Paper>
          </Box>

          <PlanningScenarioAssessmentPanel
            assessment={assessment}
          />

          {allocationResult && (
            <Paper
              elevation={0}
              sx={{
                mt: 2.5,
                p: {
                  xs: 1.5,
                  md: 2.5,
                },
                border: "1px solid",
                borderColor:
                  "divider",
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
                  gap: 1,
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                    }}
                  >
                    Asset allocation
                    prospettica
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.3 }}
                  >
                    Evoluzione annuale di
                    liquidità, investimenti,
                    immobili e altri attivi.
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  color={
                    allocationResult
                      .ipsProjection
                      .status ===
                    "NON_COMPLIANT"
                      ? "error"
                      : allocationResult
                            .ipsProjection
                            .status ===
                          "ATTENTION"
                        ? "warning"
                        : allocationResult
                              .ipsProjection
                              .status ===
                            "COMPLIANT"
                          ? "success"
                          : "default"
                  }
                  label={
                    allocationResult
                      .ipsProjection
                      .configurationStatus ===
                    "NOT_CONFIGURED"
                      ? "Limiti IPS non configurati"
                      : allocationResult
                            .ipsProjection
                            .status ===
                          "NON_COMPLIANT"
                        ? "Non conforme con IPS"
                        : allocationResult
                              .ipsProjection
                              .status ===
                            "ATTENTION"
                          ? "Attenzione IPS"
                          : allocationResult
                                .ipsProjection
                                .status ===
                              "COMPLIANT"
                            ? "Conforme con IPS"
                            : "IPS non valutato"
                  }
                />
              </Box>

              <Alert
                severity={
                  allocationResult
                    .ipsProjection
                    .status ===
                  "NON_COMPLIANT"
                    ? "error"
                    : allocationResult
                          .ipsProjection
                          .status ===
                        "ATTENTION"
                      ? "warning"
                      : allocationResult
                            .ipsProjection
                            .status ===
                          "COMPLIANT"
                        ? "success"
                        : "info"
                }
                sx={{ mb: 2 }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  {
                    allocationResult
                      .ipsProjection
                      .note
                  }
                </Typography>

                {allocationResult
                  .ipsProjection
                  .activeLimitCount >
                  0 && (
                  <Typography
                    variant="caption"
                    component="div"
                    sx={{ mt: 0.5 }}
                  >
                    Limiti attivi:{" "}
                    {
                      allocationResult
                        .ipsProjection
                        .activeLimitCount
                    }
                    {" · "}
                    Valutati:{" "}
                    {
                      allocationResult
                        .ipsProjection
                        .assessedLimitCount
                    }
                    {" · "}
                    Limiti violati:{" "}
                    {
                      allocationResult
                        .ipsProjection
                        .breachedLimitCount
                    }
                    {" · "}
                    Violazioni annuali:{" "}
                    {
                      allocationResult
                        .ipsProjection
                        .projectedBreaches
                    }
                    {" · "}
                    Limiti in attenzione:{" "}
                    {
                      allocationResult
                        .ipsProjection
                        .attentionLimitCount
                    }
                    {" · "}
                    Annualità fuori target:{" "}
                    {
                      allocationResult
                        .ipsProjection
                        .projectedTargetAttentions
                    }
                    {" · "}
                    Prima violazione:{" "}
                    {
                      allocationResult
                        .ipsProjection
                        .firstBreachYear ??
                      "—"
                    }
                    {" · "}
                    Prima attenzione:{" "}
                    {
                      allocationResult
                        .ipsProjection
                        .firstAttentionYear ??
                      "—"
                    }
                  </Typography>
                )}
              </Alert>

              {allocationResult
                .ipsProjection
                .remediationPlans[0] && (
                <Paper
                  elevation={0}
                  sx={{
                    mb: 2,
                    p: 2,
                    border:
                      "1px solid",
                    borderColor:
                      "warning.main",
                    backgroundColor:
                      "rgba(237, 108, 2, 0.04)",
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
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 800,
                        }}
                      >
                        Ribilanciamento IPS
                        suggerito
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.3 }}
                      >
                        {
                          allocationResult
                            .ipsProjection
                            .remediationPlans[0]
                            .note
                        }
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Button
                        variant="outlined"
                        color="warning"
                        disabled={simulating}
                        onClick={() =>
                          void applyIpsRemediation()
                        }
                      >
                        Applica una correzione
                      </Button>

                      <Button
                        variant="contained"
                        color="warning"
                        disabled={simulating}
                        onClick={() =>
                          void applyFullIpsPlan()
                        }
                      >
                        Applica piano IPS completo
                      </Button>

                      <Button
                        variant="outlined"
                        disabled={simulating}
                        onClick={() =>
                          void compareOptimizedIpsStrategies()
                        }
                      >
                        Confronta strategie
                      </Button>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm:
                          "repeat(2, minmax(0, 1fr))",
                        lg:
                          "repeat(4, minmax(0, 1fr))",
                      },
                      gap: 1.2,
                      mt: 1.8,
                    }}
                  >
                    <Typography
                      variant="body2"
                    >
                      Anno:{" "}
                      <strong>
                        {
                          allocationResult
                            .ipsProjection
                            .remediationPlans[0]
                            .year
                        }
                      </strong>
                    </Typography>

                    <Typography
                      variant="body2"
                    >
                      Per il minimo IPS:{" "}
                      <strong>
                        {formatCurrency(
                          allocationResult
                            .ipsProjection
                            .remediationPlans[0]
                            .amountToMinimum,
                        )}
                      </strong>
                    </Typography>

                    <Typography
                      variant="body2"
                    >
                      Per il target IPS:{" "}
                      <strong>
                        {formatCurrency(
                          allocationResult
                            .ipsProjection
                            .remediationPlans[0]
                            .amountToTarget,
                        )}
                      </strong>
                    </Typography>

                    <Typography
                      variant="body2"
                    >
                      Importo consigliato:{" "}
                      <strong>
                        {formatCurrency(
                          allocationResult
                            .ipsProjection
                            .remediationPlans[0]
                            .recommendedAmount,
                        )}
                      </strong>
                    </Typography>
                  </Box>

                  {!allocationResult
                    .ipsProjection
                    .remediationPlans[0]
                    .fullyFundable && (
                    <Alert
                      severity="warning"
                      sx={{ mt: 1.5 }}
                    >
                      Gli investimenti
                      disponibili non sono
                      sufficienti per
                      raggiungere integralmente
                      il target.
                    </Alert>
                  )}
                </Paper>
              )}

              {optimizedIpsComparison && (
                <Paper
                  elevation={0}
                  sx={{
                    mb: 2,
                    p: 2,
                    border: "1px solid",
                    borderColor:
                      "primary.main",
                    backgroundColor:
                      "rgba(25, 118, 210, 0.035)",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                    }}
                  >
                    Confronto strategie IPS
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 0.4,
                      mb: 1.8,
                    }}
                  >
                    {
                      optimizedIpsComparison
                        .rationale
                    }
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        lg:
                          "repeat(3, minmax(0, 1fr))",
                      },
                      gap: 1.5,
                    }}
                  >
                    {[
                      optimizedIpsComparison
                        .minimumCompliance,
                      optimizedIpsComparison
                        .targetOptimized,
                      optimizedIpsComparison
                        .economicBalanced,
                    ].map(
                      (strategy) => (
                        <Paper
                          key={
                            strategy.strategy
                          }
                          elevation={0}
                          sx={{
                            p: 1.8,
                            border:
                              "1px solid",
                            borderColor:
                              strategy.strategy ===
                              optimizedIpsComparison
                                .recommendedStrategy
                                ? "success.main"
                                : "divider",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              gap: 1,
                              alignItems:
                                "flex-start",
                            }}
                          >
                            <Box>
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: 800,
                                }}
                              >
                                {
                                  strategy.label
                                }
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mt: 0.3,
                                }}
                              >
                                {
                                  strategy.description
                                }
                              </Typography>
                            </Box>

                            {strategy.strategy ===
                              optimizedIpsComparison
                                .recommendedStrategy && (
                              <Chip
                                size="small"
                                color="success"
                                label="Consigliata"
                              />
                            )}
                          </Box>

                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(2, minmax(0, 1fr))",
                              gap: 1,
                              mt: 1.5,
                            }}
                          >
                            <Typography
                              variant="body2"
                            >
                              Interventi:{" "}
                              <strong>
                                {
                                  strategy.interventions
                                }
                              </strong>
                            </Typography>

                            <Typography
                              variant="body2"
                            >
                              Stato finale:{" "}
                              <strong>
                                {
                                  strategy.finalStatus
                                }
                              </strong>
                            </Typography>

                            <Typography
                              variant="body2"
                            >
                              Liquidità finale:{" "}
                              <strong>
                                {formatPercentage(
                                  strategy.finalLiquidityWeight,
                                )}
                              </strong>
                            </Typography>

                            <Typography
                              variant="body2"
                            >
                              Investimenti finali:{" "}
                              <strong>
                                {formatPercentage(
                                  strategy.finalInvestmentsWeight,
                                )}
                              </strong>
                            </Typography>

                            <Typography
                              variant="body2"
                            >
                              Movimenti lordi:{" "}
                              <strong>
                                {formatCurrency(
                                  strategy.grossTransferred,
                                )}
                              </strong>
                            </Typography>

                            <Typography
                              variant="body2"
                            >
                              Netto verso liquidità:{" "}
                              <strong>
                                {formatCurrency(
                                  strategy.netToLiquidity,
                                )}
                              </strong>
                            </Typography>

                            <Typography
                              variant="body2"
                            >
                              Patrimonio finale:{" "}
                              <strong>
                                {formatCurrency(
                                  strategy.finalNetWorth,
                                )}
                              </strong>
                            </Typography>

                            <Typography
                              variant="body2"
                            >
                              Imposte sui rendimenti:{" "}
                              <strong>
                                {formatCurrency(
                                  strategy.totalReturnTaxes,
                                )}
                              </strong>
                            </Typography>

                            <Typography
                              variant="body2"
                            >
                              Costi ribilanciamento:{" "}
                              <strong>
                                {formatCurrency(
                                  strategy.totalRebalancingCosts,
                                )}
                              </strong>
                            </Typography>

                            <Typography
                              variant="body2"
                            >
                              Oneri economici totali:{" "}
                              <strong>
                                {formatCurrency(
                                  strategy.totalEconomicCharges,
                                )}
                              </strong>
                            </Typography>
                          </Box>

                          <Button
                            fullWidth
                            sx={{ mt: 1.7 }}
                            variant={
                              strategy.strategy ===
                              optimizedIpsComparison
                                .recommendedStrategy
                                ? "contained"
                                : "outlined"
                            }
                            color={
                              strategy.strategy ===
                              optimizedIpsComparison
                                .recommendedStrategy
                                ? "success"
                                : "primary"
                            }
                            onClick={() =>
                              applyOptimizedIpsStrategy(
                                strategy,
                              )
                            }
                          >
                            Applica questa strategia
                          </Button>
                        </Paper>
                      ),
                    )}
                  </Box>
                </Paper>
              )}

              {automaticIpsPlan && (
                <Paper
                  elevation={0}
                  sx={{
                    mb: 2,
                    p: 2,
                    border: "1px solid",
                    borderColor:
                      automaticIpsPlan
                        .fullyResolved
                        ? "success.main"
                        : "warning.main",
                    backgroundColor:
                      automaticIpsPlan
                        .fullyResolved
                        ? "rgba(46, 125, 50, 0.04)"
                        : "rgba(237, 108, 2, 0.04)",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 800,
                    }}
                  >
                    Piano IPS automatico
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 0.4,
                    }}
                  >
                    {
                      automaticIpsPlan
                        .fullyResolved
                        ? "Conformità IPS raggiunta."
                        : "Il piano ha applicato tutte le correzioni disponibili, ma restano elementi da gestire."
                    }
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm:
                          "repeat(2, minmax(0, 1fr))",
                        lg:
                          "repeat(4, minmax(0, 1fr))",
                      },
                      gap: 1.2,
                      mt: 1.5,
                    }}
                  >
                    <Typography
                      variant="body2"
                    >
                      Interventi:{" "}
                      <strong>
                        {
                          automaticIpsPlan
                            .iterations
                        }
                      </strong>
                    </Typography>

                    <Typography
                      variant="body2"
                    >
                      Totale trasferito:{" "}
                      <strong>
                        {formatCurrency(
                          automaticIpsPlan
                            .totalTransferred,
                        )}
                      </strong>
                    </Typography>

                    <Typography
                      variant="body2"
                    >
                      Violazioni:{" "}
                      <strong>
                        {
                          automaticIpsPlan
                            .initialBreaches
                        }
                        {" → "}
                        {
                          automaticIpsPlan
                            .finalBreaches
                        }
                      </strong>
                    </Typography>

                    <Typography
                      variant="body2"
                    >
                      Stato finale:{" "}
                      <strong>
                        {
                          automaticIpsPlan
                            .finalStatus
                        }
                      </strong>
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gap: 0.8,
                      mt: 1.5,
                    }}
                  >
                    {automaticIpsPlan
                      .interventions
                      .map(
                        (intervention) => (
                          <Paper
                            key={
                              `${intervention.iteration}-${intervention.year}`
                            }
                            elevation={0}
                            sx={{
                              p: 1.2,
                              border:
                                "1px solid",
                              borderColor:
                                "divider",
                            }}
                          >
                            <Typography
                              variant="body2"
                            >
                              <strong>
                                {
                                  intervention
                                    .year
                                }
                              </strong>
                              {" · "}
                              {formatCurrency(
                                intervention
                                  .amount,
                              )}
                              {" · "}
                              {
                                intervention
                                  .breachesBefore
                              }
                              {" → "}
                              {
                                intervention
                                  .breachesAfter
                              }
                              {
                                " violazioni"
                              }
                            </Typography>
                          </Paper>
                        ),
                      )}
                  </Box>
                </Paper>
              )}

              {allocationResult.summary
                .minimumLiquidity <= 0 && (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                >
                  La liquidità raggiunge{" "}
                  {formatCurrency(
                    allocationResult
                      .summary
                      .minimumLiquidity,
                  )}{" "}
                  nel{" "}
                  {allocationResult
                    .summary
                    .minimumLiquidityYear ??
                    "—"}
                  . Il piano non conserva
                  un margine liquido di
                  sicurezza.
                </Alert>
              )}

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm:
                      "repeat(2, minmax(0, 1fr))",
                    lg:
                      "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 1.4,
                  mb: 2,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.6,
                    border:
                      "1px solid",
                    borderColor:
                      "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Patrimonio iniziale
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{
                      mt: 0.4,
                      fontWeight: 800,
                    }}
                  >
                    {formatCurrency(
                      allocationResult
                        .allocation
                        .initialTotal,
                    )}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 1.6,
                    border:
                      "1px solid",
                    borderColor:
                      "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Patrimonio finale
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{
                      mt: 0.4,
                      fontWeight: 800,
                    }}
                  >
                    {formatCurrency(
                      allocationResult
                        .summary
                        .finalNetWorth,
                    )}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 1.6,
                    border:
                      "1px solid",
                    borderColor:
                      allocationResult
                          .summary
                          .minimumLiquidity <=
                        0
                        ? "error.main"
                        : "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Liquidità minima
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{
                      mt: 0.4,
                      fontWeight: 800,
                    }}
                  >
                    {formatCurrency(
                      allocationResult
                        .summary
                        .minimumLiquidity,
                    )}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Nel{" "}
                    {allocationResult
                      .summary
                      .minimumLiquidityYear ??
                      "—"}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 1.6,
                    border:
                      "1px solid",
                    borderColor:
                      "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Concentrazione immobiliare
                    massima
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{
                      mt: 0.4,
                      fontWeight: 800,
                    }}
                  >
                    {formatPercentage(
                      allocationResult
                        .summary
                        .maximumRealEstateWeight,
                    )}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Nel{" "}
                    {allocationResult
                      .summary
                      .maximumRealEstateWeightYear ??
                      "—"}
                  </Typography>
                </Paper>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md:
                      "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 1.4,
                  mb: 2.5,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.6,
                    border:
                      "1px solid",
                    borderColor:
                      "divider",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      mb: 1,
                    }}
                  >
                    Allocazione finale
                  </Typography>

                  <Typography
                    variant="body2"
                  >
                    Liquidità:{" "}
                    <strong>
                      {formatPercentage(
                        allocationResult
                          .allocation
                          .finalWeights
                          .LIQUIDITY,
                      )}
                    </strong>
                  </Typography>

                  <Typography
                    variant="body2"
                  >
                    Investimenti:{" "}
                    <strong>
                      {formatPercentage(
                        allocationResult
                          .allocation
                          .finalWeights
                          .INVESTMENTS,
                      )}
                    </strong>
                  </Typography>

                  <Typography
                    variant="body2"
                  >
                    Immobili:{" "}
                    <strong>
                      {formatPercentage(
                        allocationResult
                          .allocation
                          .finalWeights
                          .REAL_ESTATE,
                      )}
                    </strong>
                  </Typography>

                  <Typography
                    variant="body2"
                  >
                    Altri attivi:{" "}
                    <strong>
                      {formatPercentage(
                        allocationResult
                          .allocation
                          .finalWeights
                          .OTHER_ASSETS,
                      )}
                    </strong>
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 1.6,
                    border:
                      "1px solid",
                    borderColor:
                      "divider",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      mb: 1,
                    }}
                  >
                    Movimenti immobiliari
                    iniziali
                  </Typography>

                  <Typography
                    variant="body2"
                  >
                    Acquisti:{" "}
                    <strong>
                      {formatCurrency(
                        allocationResult
                          .years[0]
                          ?.propertyMovements
                          .purchases
                          .reduce(
                            (
                              total,
                              movement,
                            ) =>
                              total +
                              movement.amount,
                            0,
                          ) ?? 0,
                      )}
                    </strong>
                  </Typography>

                  <Typography
                    variant="body2"
                  >
                    Vendite:{" "}
                    <strong>
                      {formatCurrency(
                        allocationResult
                          .years[0]
                          ?.propertyMovements
                          .sales
                          .reduce(
                            (
                              total,
                              movement,
                            ) =>
                              total +
                              movement.amount,
                            0,
                          ) ?? 0,
                      )}
                    </strong>
                  </Typography>

                  <Typography
                    variant="body2"
                  >
                    Plus/minusvalenza:{" "}
                    <strong>
                      {formatSignedCurrency(
                        allocationResult
                          .years[0]
                          ?.propertyMovements
                          .saleGainLoss ??
                          0,
                      )}
                    </strong>
                  </Typography>
                </Paper>
              </Box>

              {allocationResult
                .openingReconciliation
                .excludedProperties
                .length > 0 && (
                <Alert
                  severity="info"
                  sx={{ mb: 2.5 }}
                >
                  Immobili esclusi dal
                  patrimonio iniziale:{" "}
                  {allocationResult
                    .openingReconciliation
                    .excludedProperties
                    .map(
                      (property) =>
                        property.name,
                    )
                    .join(", ")}
                  .
                </Alert>
              )}

              <Box
                sx={{
                  width: "100%",
                  height: 390,
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart
                    data={
                      allocationChartData
                    }
                    margin={{
                      top: 10,
                      right: 20,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="year"
                      minTickGap={22}
                    />

                    <YAxis
                      tickFormatter={
                        formatCompactCurrency
                      }
                      width={75}
                    />

                    <Tooltip />

                    <Legend />

                    <Area
                      type="monotone"
                      dataKey="LIQUIDITY"
                      name="Liquidità"
                      stackId="allocation"
                      stroke="#2E86AB"
                      fill="#8ECAE6"
                    />

                    <Area
                      type="monotone"
                      dataKey="INVESTMENTS"
                      name="Investimenti"
                      stackId="allocation"
                      stroke="#3A7D44"
                      fill="#90BE6D"
                    />

                    <Area
                      type="monotone"
                      dataKey="REAL_ESTATE"
                      name="Immobili"
                      stackId="allocation"
                      stroke="#C87941"
                      fill="#F4A261"
                    />

                    <Area
                      type="monotone"
                      dataKey="OTHER_ASSETS"
                      name="Altri attivi"
                      stackId="allocation"
                      stroke="#7251B5"
                      fill="#B8A1E3"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          )}

          <Paper
            elevation={0}
            sx={{
              mt: 2.5,
              p: {
                xs: 1.5,
                md: 2.5,
              },
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 0.5 }}
            >
              Baseline contro scenario
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              Evoluzione del capitale
              fino al{" "}
              {
                result.baselineSource
                  .endYear
              }
              .
            </Typography>

            <Box
              sx={{
                width: "100%",
                height: 380,
              }}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="year"
                    minTickGap={22}
                  />

                  <YAxis
                    tickFormatter={
                      formatCompactCurrency
                    }
                    width={75}
                  />

                  <Tooltip />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="baseline"
                    name="Baseline ufficiale"
                    stroke="#7A8A99"
                    strokeWidth={2}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="scenario"
                    name="Scenario"
                    stroke="#1F6FB2"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </>
      )}

      <PlanningScenarioArchive
        currentResult={result}
        currentEconomicProfile={
          currentEconomicProfileSnapshot
        }
        onLoadScenario={
          loadStoredScenario
        }
      />

    </Paper>
  );
}
