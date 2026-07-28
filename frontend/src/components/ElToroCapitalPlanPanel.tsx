import {
  useCallback,
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
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import SaveRoundedIcon from "@mui/icons-material/SaveRounded";

import {
  getElToroCapitalAllocationPlan,
  updateElToroCapitalAllocationPlan,
  type ElToroCapitalAllocationPlanResponse,
} from "../services/api";
import { parseLocaleAmount } from "../utils/amounts";

type ElToroCapitalPlanPanelProps = {
  refreshToken: string;
  onPlanSaved?: () => void;
};

function euro(value: number): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function roundMoney(
  value: number,
): number {
  return (
    Math.round(
      (value + Number.EPSILON) * 100,
    ) / 100
  );
}

export default function ElToroCapitalPlanPanel({
  refreshToken,
  onPlanSaved,
}: ElToroCapitalPlanPanelProps) {
  const [
    plan,
    setPlan,
  ] =
    useState<ElToroCapitalAllocationPlanResponse | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState<string | null>(null);

  const [
    dubaiHomeReserveInput,
    setDubaiHomeReserveInput,
  ] = useState("0");

  const [
    familyTransitionReserveInput,
    setFamilyTransitionReserveInput,
  ] = useState("0");

  const [
    longTermCoreInvestmentInput,
    setLongTermCoreInvestmentInput,
  ] = useState("0");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    saveError,
    setSaveError,
  ] = useState<string | null>(null);

  const [
    saved,
    setSaved,
  ] = useState(false);

  const applyPlan = useCallback(
    (
      result:
        ElToroCapitalAllocationPlanResponse,
    ) => {
      setPlan(result);

      setDubaiHomeReserveInput(
        String(
          result.plan
            .dubaiHomeReserve,
        ),
      );

      setFamilyTransitionReserveInput(
        String(
          result.plan
            .familyTransitionReserve,
        ),
      );

      setLongTermCoreInvestmentInput(
        String(
          result.plan
            .longTermCoreInvestment,
        ),
      );
    },
    [],
  );

  const loadPlan =
    useCallback(async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const result =
          await getElToroCapitalAllocationPlan();

        applyPlan(result);
      } catch (error) {
        console.error(error);

        setLoadError(
          "Impossibile caricare il piano operativo El Toro.",
        );
      } finally {
        setLoading(false);
      }
    }, [applyPlan]);

  useEffect(() => {
    // Il token cambia quando vengono salvate nuove stime fiscali.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPlan();
  }, [loadPlan, refreshToken]);

  const dubaiHomeReserve =
    parseLocaleAmount(
      dubaiHomeReserveInput,
    );

  const familyTransitionReserve =
    parseLocaleAmount(
      familyTransitionReserveInput,
    );

  const longTermCoreInvestment =
    parseLocaleAmount(
      longTermCoreInvestmentInput,
    );

  const changed =
    plan !== null &&
    (
      dubaiHomeReserve !==
        plan.plan.dubaiHomeReserve ||
      familyTransitionReserve !==
        plan.plan
          .familyTransitionReserve ||
      longTermCoreInvestment !==
        plan.plan
          .longTermCoreInvestment
    );

  const reconciliation =
    useMemo(() => {
      const availableCapital =
        plan?.reconciliation
          .availableCapital ?? 0;

      const totalPlannedAllocation =
        roundMoney(
          dubaiHomeReserve +
            familyTransitionReserve +
            longTermCoreInvestment,
        );

      const balance =
        roundMoney(
          availableCapital -
            totalPlannedAllocation,
        );

      return {
        availableCapital,
        totalPlannedAllocation,
        unallocatedCapital:
          balance > 0
            ? balance
            : 0,
        fundingGap:
          balance < 0
            ? Math.abs(balance)
            : 0,
      };
    }, [
      dubaiHomeReserve,
      familyTransitionReserve,
      longTermCoreInvestment,
      plan,
    ]);

  const allocationStatus =
    changed
      ? "Modifiche non salvate"
      : reconciliation.fundingGap > 0
        ? "Copertura insufficiente"
        : reconciliation
              .unallocatedCapital > 0
          ? "Capitale non assegnato"
          : "Piano riconciliato";

  const statusColor =
    reconciliation.fundingGap > 0
      ? "error"
      : changed ||
          reconciliation
            .unallocatedCapital > 0
        ? "warning"
        : "success";

  if (loading && !plan) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <CircularProgress size={22} />

          <Typography color="text.secondary">
            Caricamento del piano operativo
            El Toro…
          </Typography>
        </Box>
      </Paper>
    );
  }

  if (loadError || !plan) {
    return (
      <Alert
        severity="error"
        action={
          <Button
            size="small"
            onClick={() =>
              void loadPlan()
            }
          >
            Riprova
          </Button>
        }
        sx={{ mb: 3 }}
      >
        {loadError ??
          "Piano operativo non disponibile."}
      </Alert>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 3,
        border: "1px solid",
        borderColor:
          reconciliation.fundingGap > 0
            ? "error.main"
            : reconciliation
                  .unallocatedCapital > 0
              ? "warning.main"
              : "success.main",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 750 }}
          >
            Piano operativo post-vendita
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Destinazione del capitale El
            Toro dopo debito, costi
            registrati e stime manuali.
          </Typography>
        </Box>

        <Chip
          size="small"
          color={statusColor}
          label={allocationStatus}
        />
      </Box>

      <Alert
        severity="warning"
        sx={{ mt: 2 }}
      >
        Stato fiscale:{" "}
        <strong>
          {plan.status.fiscal}
        </strong>
        . Il piano non è eseguibile prima
        della validazione professionale.
      </Alert>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg:
              "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
          mt: 2,
        }}
      >
        <TextField
          size="small"
          label="Riserva casa Dubai 2027 (€)"
          value={dubaiHomeReserveInput}
          onChange={(event) => {
            setDubaiHomeReserveInput(
              event.target.value,
            );
            setSaved(false);
            setSaveError(null);
          }}
          slotProps={{
            htmlInput: {
              inputMode: "decimal",
            },
          }}
          helperText="Capitale protetto: non investibile in azioni."
        />

        <TextField
          size="small"
          label="Riserva famiglia e trasferimento (€)"
          value={
            familyTransitionReserveInput
          }
          onChange={(event) => {
            setFamilyTransitionReserveInput(
              event.target.value,
            );
            setSaved(false);
            setSaveError(null);
          }}
          slotProps={{
            htmlInput: {
              inputMode: "decimal",
            },
          }}
          helperText="Famiglia, università e trasferimento."
        />

        <TextField
          size="small"
          label="Investimento core lungo periodo (€)"
          value={
            longTermCoreInvestmentInput
          }
          onChange={(event) => {
            setLongTermCoreInvestmentInput(
              event.target.value,
            );
            setSaved(false);
            setSaveError(null);
          }}
          slotProps={{
            htmlInput: {
              inputMode: "decimal",
            },
          }}
          helperText="Quota destinabile al portafoglio di lungo periodo."
        />
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
          gap: 1.5,
          mt: 2,
        }}
      >
        {[
          {
            label:
              "Capitale allocabile",
            value: euro(
              reconciliation
                .availableCapital,
            ),
          },
          {
            label:
              "Destinazioni pianificate",
            value: euro(
              reconciliation
                .totalPlannedAllocation,
            ),
          },
          {
            label:
              "Capitale non assegnato",
            value: euro(
              reconciliation
                .unallocatedCapital,
            ),
          },
          {
            label:
              "Copertura mancante",
            value: euro(
              reconciliation.fundingGap,
            ),
          },
        ].map((item) => (
          <Box
            key={item.label}
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: "action.hover",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
            >
              {item.label}
            </Typography>

            <Typography
              sx={{
                mt: 0.25,
                fontWeight: 800,
              }}
            >
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {plan.status.planningEstimates ===
      "NOT_SET" ? (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
        >
          Prima di finalizzare
          l’allocazione, salvare una
          riserva fiscale prudenziale e
          gli eventuali costi futuri.
        </Alert>
      ) : reconciliation.fundingGap >
        0 ? (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
        >
          Le destinazioni superano il
          capitale allocabile di{" "}
          <strong>
            {euro(
              reconciliation.fundingGap,
            )}
          </strong>
          .
        </Alert>
      ) : reconciliation
          .unallocatedCapital > 0 ? (
        <Alert
          severity="warning"
          sx={{ mt: 2 }}
        >
          Restano da assegnare{" "}
          <strong>
            {euro(
              reconciliation
                .unallocatedCapital,
            )}
          </strong>
          .
        </Alert>
      ) : (
        <Alert
          severity="success"
          sx={{ mt: 2 }}
        >
          Le destinazioni coprono
          esattamente il capitale
          allocabile. Rimane obbligatoria
          la validazione fiscale
          professionale.
        </Alert>
      )}

      <Box
        sx={{
          mt: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Button
          variant="contained"
          startIcon={
            <SaveRoundedIcon />
          }
          disabled={
            saving ||
            !changed ||
            reconciliation.fundingGap >
              0
          }
          onClick={async () => {
            setSaving(true);
            setSaved(false);
            setSaveError(null);

            try {
              const result =
                await updateElToroCapitalAllocationPlan({
                  dubaiHomeReserve,
                  familyTransitionReserve,
                  longTermCoreInvestment,
                });

              applyPlan(result);
              setSaved(true);
              onPlanSaved?.();
            } catch (error) {
              console.error(error);

              setSaveError(
                "Impossibile salvare il piano operativo.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving
            ? "Salvataggio…"
            : "Salva piano"}
        </Button>

        {saved ? (
          <Chip
            size="small"
            color="success"
            label="Piano salvato"
          />
        ) : null}

        <Typography
          variant="caption"
          color="text.secondary"
        >
          Origine:{" "}
          {plan.plan.source ===
          "DOCUMENTED_PLAN"
            ? "piano patrimoniale documentato"
            : "piano aggiornato manualmente"}
        </Typography>
      </Box>

      {saveError ? (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
        >
          {saveError}
        </Alert>
      ) : null}
    </Paper>
  );
}
