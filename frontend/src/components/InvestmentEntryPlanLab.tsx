import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";

import SaveRoundedIcon from "@mui/icons-material/SaveRounded";

import {
  getElToroInvestmentEntryPlan,
  updateElToroInvestmentEntryPlan,
  type InvestmentEntryPlan,
  type InvestmentEntryScenarioCode,
} from "../services/api";

type InvestmentEntryPlanLabProps = {
  recommendationId: string;
  refreshToken: string;
  recommendationIsCurrent: boolean;
};

function euro(value: number): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function percentage(value: number): string {
  return `${value.toLocaleString("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function parsePercentage(value: string): number {
  const normalized = value.trim().replace(",", ".");

  if (normalized.length === 0) {
    return Number.NaN;
  }

  return Number(normalized);
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function InvestmentEntryPlanLab({
  recommendationId,
  refreshToken,
  recommendationIsCurrent,
}: InvestmentEntryPlanLabProps) {
  const [plan, setPlan] = useState<InvestmentEntryPlan | null>(null);
  const [selectedScenario, setSelectedScenario] =
    useState<InvestmentEntryScenarioCode>("BASE");
  const [percentageInputs, setPercentageInputs] = useState<string[]>([]);
  const [fundingAccount, setFundingAccount] = useState("");
  const [executionBroker, setExecutionBroker] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hydrate = useCallback((nextPlan: InvestmentEntryPlan) => {
    const selected = nextPlan.scenarios.find(
      (scenario) => scenario.code === nextPlan.selectedScenario,
    );

    setPlan(nextPlan);
    setSelectedScenario(nextPlan.selectedScenario);
    setPercentageInputs(
      (selected?.percentages ?? []).map((value) => String(value)),
    );
    setFundingAccount(nextPlan.fundingAccount ?? "");
    setExecutionBroker(nextPlan.executionBroker ?? "");
    setNotes(nextPlan.notes ?? "");
    setDirty(false);
  }, []);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getElToroInvestmentEntryPlan();

      if (response.plan) {
        hydrate(response.plan);
      } else {
        setPlan(null);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Impossibile caricare il piano di ingresso.",
      );
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useEffect(() => {
    // Sincronizza la bozza quando cambia lo snapshot del Recommendation Engine.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPlan();
  }, [loadPlan, recommendationId, refreshToken]);

  const parsedPercentages = useMemo(
    () => percentageInputs.map(parsePercentage),
    [percentageInputs],
  );
  const percentageTotal = useMemo(
    () =>
      parsedPercentages.every(Number.isFinite)
        ? parsedPercentages.reduce((sum, value) => sum + value, 0)
        : Number.NaN,
    [parsedPercentages],
  );
  const scheduleIsValid =
    parsedPercentages.length > 0 &&
    parsedPercentages.every(
      (value) => Number.isFinite(value) && value > 0 && value <= 100,
    ) &&
    Math.abs(percentageTotal - 100) < 0.0001;
  const selectedDefinition = plan?.scenarios.find(
    (scenario) => scenario.code === selectedScenario,
  );
  const previewTranches = useMemo(() => {
    if (!plan || !selectedDefinition || !scheduleIsValid) {
      return [];
    }

    let cumulative = 0;

    return parsedPercentages.map((tranchePercentage, index) => {
      const amount =
        index === parsedPercentages.length - 1
          ? plan.validation.investibleCapital - cumulative
          : Math.round(
              plan.validation.investibleCapital *
                (tranchePercentage / 100) *
                100,
            ) / 100;

      cumulative = Math.round((cumulative + amount) * 100) / 100;

      return {
        number: index + 1,
        timing: selectedDefinition.tranches[index]?.timing ?? `Tranche ${index + 1}`,
        percentage: tranchePercentage,
        amount,
        temporaryParkingAfter: Math.max(
          0,
          Math.round(
            (plan.validation.investibleCapital - cumulative) * 100,
          ) / 100,
        ),
      };
    });
  }, [
    parsedPercentages,
    plan,
    scheduleIsValid,
    selectedDefinition,
  ]);

  const chooseScenario = (code: InvestmentEntryScenarioCode) => {
    if (!plan || code === selectedScenario) {
      return;
    }

    const scenario = plan.scenarios.find((item) => item.code === code);

    if (!scenario) {
      return;
    }

    setSelectedScenario(code);
    setPercentageInputs(
      scenario.percentages.map((value) => String(value)),
    );
    setDirty(true);
    setSuccess(null);
  };

  const changePercentage = (index: number, value: string) => {
    setPercentageInputs((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
    setDirty(true);
    setSuccess(null);
  };

  const savePlan = async () => {
    if (!plan || !scheduleIsValid) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await updateElToroInvestmentEntryPlan({
        recommendationId,
        selectedScenario,
        tranchePercentages: parsedPercentages,
        fundingAccount,
        executionBroker,
        notes,
      });

      if (!response.plan) {
        throw new Error("Il backend non ha restituito il piano salvato.");
      }

      hydrate(response.plan);
      setSuccess("Scenario preferito e piano tranche salvati.");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Impossibile salvare il piano di ingresso.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 160,
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error && !plan) {
    return (
      <Alert severity="error" action={<Button onClick={loadPlan}>Riprova</Button>}>
        {error}
      </Alert>
    );
  }

  if (!plan) {
    return (
      <Alert severity="info">
        Genera una proposta corrente per iniziare il piano di ingresso.
      </Alert>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 850 }}>
            Scenario &amp; Tranche Lab
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            Confronta la velocità di ingresso, modifica le quote e salva la
            bozza operativa preferita.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Chip
            size="small"
            color={plan.saved && !dirty ? "success" : "warning"}
            label={
              plan.saved && !dirty
                ? "Bozza salvata"
                : dirty
                  ? "Modifiche non salvate"
                  : "Bozza non salvata"
            }
          />

          <Button
            variant="contained"
            startIcon={
              saving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />
            }
            disabled={
              saving ||
              (!dirty && plan.saved) ||
              !scheduleIsValid ||
              !recommendationIsCurrent ||
              plan.recommendationId !== recommendationId
            }
            onClick={savePlan}
          >
            Salva piano
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}

      <Alert severity="warning" sx={{ mt: 2 }}>
        {plan.execution.blockingReason}
      </Alert>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "repeat(2, minmax(0, 1fr))",
          },
          gap: 1.5,
          mt: 2,
        }}
      >
        {plan.scenarios.map((scenario) => {
          const selected = scenario.code === selectedScenario;

          return (
            <Box
              key={scenario.code}
              sx={{
                p: 1.75,
                borderRadius: 2,
                border: "2px solid",
                borderColor: selected ? "primary.main" : "divider",
                bgcolor: selected ? "primary.50" : "background.paper",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                    {scenario.label}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    {scenario.tranches.length} tranche · {scenario.durationDays} giorni
                  </Typography>
                </Box>

                <Button
                  size="small"
                  variant={selected ? "contained" : "outlined"}
                  onClick={() => chooseScenario(scenario.code)}
                >
                  {selected ? "Selezionato" : "Seleziona"}
                </Button>
              </Box>

              <Typography variant="body2" sx={{ mt: 1 }}>
                {scenario.description}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1 }}
              >
                Ripartizione predefinita:{" "}
                {scenario.percentages.map(percentage).join(" · ")}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Typography variant="subtitle1" sx={{ mt: 3, fontWeight: 850 }}>
        Ripartizione modificabile
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
        Il totale deve essere 100%, pari a{" "}
        <strong>{euro(plan.validation.investibleCapital)}</strong>.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: `repeat(${Math.min(percentageInputs.length, 6)}, minmax(120px, 1fr))`,
          },
          gap: 1.25,
          mt: 1.5,
        }}
      >
        {percentageInputs.map((value, index) => (
          <TextField
            key={`${selectedScenario}-${index}`}
            label={`Tranche ${index + 1} (%)`}
            value={value}
            inputMode="decimal"
            onChange={(event) => changePercentage(index, event.target.value)}
            error={
              value.trim().length > 0 &&
              (!Number.isFinite(parsePercentage(value)) ||
                parsePercentage(value) <= 0 ||
                parsePercentage(value) > 100)
            }
            helperText={selectedDefinition?.tranches[index]?.timing ?? " "}
            size="small"
          />
        ))}
      </Box>

      <Alert
        severity={scheduleIsValid ? "success" : "error"}
        sx={{ mt: 1.5 }}
      >
        Totale tranche:{" "}
        <strong>
          {Number.isFinite(percentageTotal)
            ? percentage(percentageTotal)
            : "non valido"}
        </strong>
        {scheduleIsValid
          ? ` · ${euro(plan.validation.investibleCapital)} riconciliati.`
          : " · correggere prima del salvataggio."}
      </Alert>

      {scheduleIsValid && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 1.25,
            mt: 1.5,
          }}
        >
          {previewTranches.map((tranche) => (
            <Box
              key={tranche.number}
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            >
              <Typography variant="overline" color="primary.main">
                Tranche {tranche.number} · {tranche.timing}
              </Typography>

              <Typography variant="h6" sx={{ fontWeight: 850 }}>
                {euro(tranche.amount)}
              </Typography>

              <Typography variant="caption" color="text.secondary">
                {percentage(tranche.percentage)} del capitale core
              </Typography>

              <Typography variant="body2" sx={{ mt: 1 }}>
                Parcheggio XEON residuo:{" "}
                <strong>{euro(tranche.temporaryParkingAfter)}</strong>
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
          },
          gap: 1.5,
          mt: 2.5,
        }}
      >
        <TextField
          label="Conto di provenienza"
          value={fundingAccount}
          placeholder="Es. RakBank EUR"
          onChange={(event) => {
            setFundingAccount(event.target.value);
            setDirty(true);
            setSuccess(null);
          }}
          slotProps={{
            htmlInput: {
              maxLength: 120,
            },
          }}
        />

        <TextField
          label="Broker previsto"
          value={executionBroker}
          placeholder="Es. Fineco o Interactive Brokers"
          onChange={(event) => {
            setExecutionBroker(event.target.value);
            setDirty(true);
            setSuccess(null);
          }}
          slotProps={{
            htmlInput: {
              maxLength: 120,
            },
          }}
        />
      </Box>

      <TextField
        label="Note operative"
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          setDirty(true);
          setSuccess(null);
        }}
        slotProps={{
          htmlInput: {
            maxLength: 2_000,
          },
        }}
        multiline
        minRows={2}
        fullWidth
        sx={{ mt: 1.5 }}
      />

      {plan.validation.ips.withinLimits === false ? (
        <Alert severity="warning" sx={{ mt: 2 }}>
          La proiezione resta fuori da almeno un limite IPS perché il piano usa
          solo nuovo capitale e non vende automaticamente posizioni esistenti.
          <Box component="ul" sx={{ mt: 0.75, mb: 0, pl: 2.5 }}>
            {plan.validation.ips.breaches.map((breach) => (
              <li key={breach.code}>
                {breach.label}: proiezione {percentage(breach.projectedWeight)}
                {breach.direction === "ABOVE_MAXIMUM"
                  ? `, massimo ${percentage(breach.maximum ?? 0)}`
                  : `, minimo ${percentage(breach.minimum ?? 0)}`}
              </li>
            ))}
          </Box>
        </Alert>
      ) : plan.validation.ips.withinLimits === true ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          Proiezione del nuovo capitale entro i limiti IPS.
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          Limiti IPS non valutabili finché la classificazione non è completa.
        </Alert>
      )}

      {plan.updatedAt && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1.5 }}
        >
          Ultimo salvataggio: {dateLabel(plan.updatedAt)} · Piano v
          {plan.planVersion}
        </Typography>
      )}
    </Box>
  );
}
