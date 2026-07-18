import {
  Box,
  Button,
  Chip,
  Paper,
  Typography,
} from "@mui/material";

import CrisisAlertRoundedIcon from "@mui/icons-material/CrisisAlertRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import type {
  SimulatePlanningScenarioInput,
} from "../services/api";

type Props = {
  startYear: number | null;

  onApplyPreset: (
    input:
      SimulatePlanningScenarioInput,
  ) => void;
};

type PresetDefinition = {
  id: string;
  title: string;
  description: string;
  label: string;
  severity:
    | "default"
    | "success"
    | "warning"
    | "error";
  icon: React.ReactNode;

  buildInput: (
    startYear: number,
  ) => SimulatePlanningScenarioInput;

  assumptions: string[];
};

export default function PlanningScenarioPresets({
  startYear,
  onApplyPreset,
}: Props) {
  const effectiveStartYear =
    startYear ?? 2027;

  const presets:
    PresetDefinition[] = [
    {
      id: "baseline",
      title: "Baseline",
      description:
        "Replica il piano ufficiale senza rettifiche.",
      label: "Neutrale",
      severity: "default",
      icon: (
        <RestartAltRoundedIcon />
      ),

      assumptions: [
        "Rendimento: invariato",
        "Costi: invariati",
        "Nessun evento aggiuntivo",
      ],

      buildInput: () => ({
        name:
          "Baseline ufficiale",

        description:
          "Scenario identico alla baseline ufficiale.",

        initialCapitalAdjustment:
          0,

        annualReturnAdjustmentPct:
          0,

        annualCostAdjustmentPct:
          0,

        annualRevenueAdjustmentPct:
          0,

        expenseInflationDeltaPct:
          0,

        events: [],
      }),
    },
    {
      id: "prudent",
      title: "Prudente",
      description:
        "Ipotesi moderatamente più conservative.",
      label: "Prudente",
      severity: "success",
      icon: <SecurityRoundedIcon />,

      assumptions: [
        "Rendimento: −0,5% annuo",
        "Costi: +2%",
        "Inflazione: +0,2 punti",
      ],

      buildInput: () => ({
        name:
          "Scenario prudente",

        description:
          "Rendimento leggermente inferiore e costi moderatamente superiori alla baseline.",

        initialCapitalAdjustment:
          0,

        annualReturnAdjustmentPct:
          -0.5,

        annualCostAdjustmentPct:
          2,

        annualRevenueAdjustmentPct:
          0,

        expenseInflationDeltaPct:
          0.2,

        events: [],
      }),
    },
    {
      id: "stress",
      title: "Stress",
      description:
        "Pressione finanziaria e maggiore costo immobiliare.",
      label: "Stress test",
      severity: "warning",
      icon: (
        <WarningAmberRoundedIcon />
      ),

      assumptions: [
        "Rendimento: −1% annuo",
        "Costi: +5%",
        "Evento: −€100.000",
      ],

      buildInput: (
        scenarioStartYear,
      ) => ({
        name:
          "Stress test 2027",

        description:
          "Rendimento inferiore, costi superiori e maggiore esborso immobiliare.",

        initialCapitalAdjustment:
          0,

        annualReturnAdjustmentPct:
          -1,

        annualCostAdjustmentPct:
          5,

        annualRevenueAdjustmentPct:
          0,

        expenseInflationDeltaPct:
          0.5,

        events: [
          {
            year:
              scenarioStartYear,

            label:
              "Maggior costo acquisto abitazione",

            amount:
              -100000,

            category:
              "PROPERTY",
          },
        ],
      }),
    },
    {
      id: "severe-crisis",
      title: "Crisi severa",
      description:
        "Scenario estremo per verificare la tenuta patrimoniale.",
      label: "Estremo",
      severity: "error",
      icon: (
        <CrisisAlertRoundedIcon />
      ),

      assumptions: [
        "Rendimento: −2% annuo",
        "Costi: +10%",
        "Ricavi: −5%",
        "Eventi: −€350.000",
      ],

      buildInput: (
        scenarioStartYear,
      ) => ({
        name:
          "Crisi severa",

        description:
          "Stress patrimoniale severo con minori rendimenti, aumento dei costi, riduzione dei ricavi e uscite straordinarie.",

        initialCapitalAdjustment:
          0,

        annualReturnAdjustmentPct:
          -2,

        annualCostAdjustmentPct:
          10,

        annualRevenueAdjustmentPct:
          -5,

        expenseInflationDeltaPct:
          1,

        events: [
          {
            year:
              scenarioStartYear,

            label:
              "Shock immobiliare e costi straordinari",

            amount:
              -250000,

            category:
              "PROPERTY",
          },
          {
            year:
              scenarioStartYear + 1,

            label:
              "Seconda uscita straordinaria",

            amount:
              -100000,

            category:
              "EXTRAORDINARY",
          },
        ],
      }),
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 2.5,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor:
          "background.default",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 0.5,
        }}
      >
        <TuneRoundedIcon
          color="primary"
        />

        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
          }}
        >
          Modelli di scenario
        </Typography>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        Applica un insieme predefinito
        di ipotesi e poi calcola la
        simulazione.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md:
              "repeat(2, minmax(0, 1fr))",
            xl:
              "repeat(4, minmax(0, 1fr))",
          },
          gap: 1.5,
        }}
      >
        {presets.map(
          (preset) => (
            <Paper
              key={preset.id}
              elevation={0}
              sx={{
                p: 2,
                display: "flex",
                flexDirection:
                  "column",
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
                  alignItems:
                    "flex-start",
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      placeItems:
                        "center",
                      color:
                        "primary.main",
                    }}
                  >
                    {preset.icon}
                  </Box>

                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 800,
                    }}
                  >
                    {preset.title}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={preset.label}
                  color={
                    preset.severity
                  }
                  variant="outlined"
                />
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 1.2,
                  minHeight: 42,
                }}
              >
                {preset.description}
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gap: 0.5,
                  mt: 1.5,
                  mb: 2,
                }}
              >
                {preset.assumptions.map(
                  (assumption) => (
                    <Typography
                      key={assumption}
                      variant="caption"
                      color="text.secondary"
                    >
                      • {assumption}
                    </Typography>
                  ),
                )}
              </Box>

              <Button
                variant="outlined"
                sx={{
                  mt: "auto",
                }}
                onClick={() => {
                  const input =
                    preset.buildInput(
                      effectiveStartYear,
                    );

                  onApplyPreset({
                    ...input,

                    events:
                      input.events?.map(
                        (event) => ({
                          ...event,
                        }),
                      ) ?? [],
                  });
                }}
              >
                Applica modello
              </Button>
            </Paper>
          ),
        )}
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: "block",
          mt: 1.8,
        }}
      >
        I modelli sono stress test
        gestionali e non costituiscono
        previsioni di rendimento.
      </Typography>
    </Paper>
  );
}
