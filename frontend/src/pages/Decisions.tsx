import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Typography,
} from "@mui/material";

import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import PolicyRoundedIcon from "@mui/icons-material/PolicyRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import ComputerRoundedIcon from "@mui/icons-material/ComputerRounded";

import KpiCard from "../components/KpiCard";

type DecisionStatus =
  | "APPROVED"
  | "IN_PROGRESS"
  | "MONITORING";

type DecisionPriority =
  | "HIGH"
  | "MEDIUM"
  | "LOW";

type DecisionCategory =
  | "POLICY"
  | "PROPERTY"
  | "PLANNING"
  | "PLATFORM";

type DecisionEntry = {
  id: string;
  date: string;
  title: string;
  category: DecisionCategory;
  status: DecisionStatus;
  priority: DecisionPriority;
  motivation: string;
  analysis: string;
  alternatives: string[];
  finalDecision: string;
  impact: string;
  amount: number | null;
  result: string;
  lessons: string;
};

const DECISIONS: DecisionEntry[] = [
  {
    id: "ips-approval",
    date: "10/07/2026",
    title:
      "Adozione dell’Investment Policy Statement",
    category: "POLICY",
    status: "APPROVED",
    priority: "HIGH",
    motivation:
      "Creare una disciplina permanente per la conservazione e la crescita del patrimonio familiare nel lungo periodo.",
    analysis:
      "Sono stati definiti obiettivi, orizzonte temporale, profilo di rischio, asset allocation strategica, criteri ETF, regole di ribilanciamento e gestione della liquidità.",
    alternatives: [
      "Gestione degli investimenti senza una politica formalizzata",
      "Delega completa agli intermediari finanziari",
      "Portafoglio basato prevalentemente su singoli titoli",
    ],
    finalDecision:
      "Utilizzare l’IPS come documento guida vincolante per tutte le future decisioni patrimoniali e finanziarie.",
    impact:
      "Maggiore diversificazione, controllo del rischio, contenimento dei costi e coerenza delle operazioni nel tempo.",
    amount: null,
    result:
      "IPS approvato e utilizzato come riferimento strategico del Family Office.",
    lessons:
      "Le singole operazioni devono essere valutate nel contesto del patrimonio complessivo e non isolatamente.",
  },
  {
    id: "gfo-platform",
    date: "13/07/2026",
    title:
      "Sviluppo della GFO Platform",
    category: "PLATFORM",
    status: "IN_PROGRESS",
    priority: "HIGH",
    motivation:
      "Superare progressivamente i limiti operativi del file Gresleri2026.xlsm e creare un sistema centrale per la gestione del patrimonio.",
    analysis:
      "È stata scelta un’architettura con backend NestJS, database Prisma e frontend React, mantenendo inizialmente Excel come sorgente dati.",
    alternatives: [
      "Continuare a utilizzare esclusivamente Excel",
      "Acquistare un software Family Office commerciale",
      "Utilizzare applicazioni separate per ogni area patrimoniale",
    ],
    finalDecision:
      "Sviluppare internamente una piattaforma modulare che sostituisca progressivamente Excel senza interrompere l’operatività corrente.",
    impact:
      "Centralizzazione dei dati, maggiore controllo, tracciabilità delle decisioni e possibilità di simulazioni patrimoniali.",
    amount: null,
    result:
      "Operativi i moduli Dashboard, Patrimonio, Investimenti, Liquidità, Immobili, Budget, Planning e Report.",
    lessons:
      "Lo sviluppo deve procedere per moduli piccoli, verificabili e collegati a dati reali.",
  },
  {
    id: "el-toro-sale",
    date: "16/07/2026",
    title:
      "Classificazione e vendita dell’immobile El Toro",
    category: "PROPERTY",
    status: "IN_PROGRESS",
    priority: "HIGH",
    motivation:
      "Preparare correttamente la trasformazione dell’immobile in liquidità disponibile alla data del rogito.",
    analysis:
      "Sono stati verificati prezzo di vendita, costo storico, data prevista del rogito e trattamento patrimoniale fino al perfezionamento della vendita.",
    alternatives: [
      "Eliminare immediatamente l’immobile dal patrimonio",
      "Registrare subito il ricavato come liquidità",
      "Mantenere l’immobile senza evidenziare lo stato di vendita",
    ],
    finalDecision:
      "Mantenere El Toro nel patrimonio immobiliare, classificato come destinato alla vendita, fino al rogito previsto il 31 luglio 2026.",
    impact:
      "Valore immobiliare lordo di €2.150.000 che sarà successivamente trasformato in liquidità, al netto di costi e fiscalità.",
    amount: 2150000,
    result:
      "Immobile registrato correttamente nella piattaforma come PROPERTY_HELD_FOR_SALE.",
    lessons:
      "Gli eventi non perfezionati devono essere rappresentati distintamente dagli incassi già realizzati.",
  },
  {
    id: "budget-long-term",
    date: "16/07/2026",
    title:
      "Validazione del piano patrimoniale 2027–2066",
    category: "PLANNING",
    status: "MONITORING",
    priority: "HIGH",
    motivation:
      "Verificare la sostenibilità delle spese familiari, degli investimenti immobiliari e dei futuri flussi pensionistici.",
    analysis:
      "Il piano considera 40 anni, il forte assorbimento finanziario del 2027, le pensioni future e l’evoluzione annuale del capitale.",
    alternatives: [
      "Analisi limitata al solo budget annuale",
      "Proiezione senza eventi immobiliari straordinari",
      "Pianificazione senza considerare le pensioni",
    ],
    finalDecision:
      "Utilizzare il piano 2027–2066 come scenario base, aggiornandolo quando cambiano investimenti, immobili, inflazione o flussi familiari.",
    impact:
      "Disavanzo previsto nel 2027 di €1.194.270,57; capitale minimo di €1.325.163,80 nel 2039; capitale sempre positivo fino al 2066.",
    amount: -1194270.57,
    result:
      "Scenario base giudicato sostenibile, pur con una significativa riduzione del capitale nella prima fase.",
    lessons:
      "Il principale rischio non è l’esaurimento del patrimonio, ma la concentrazione degli esborsi tra il 2027 e il 2039.",
  },
];

const euro = (value: number) =>
  value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function statusLabel(status: DecisionStatus) {
  if (status === "APPROVED") {
    return "Approvata";
  }

  if (status === "IN_PROGRESS") {
    return "In esecuzione";
  }

  return "Monitoraggio";
}

function statusColor(
  status: DecisionStatus,
): "success" | "warning" | "info" {
  if (status === "APPROVED") {
    return "success";
  }

  if (status === "IN_PROGRESS") {
    return "warning";
  }

  return "info";
}

function priorityLabel(
  priority: DecisionPriority,
) {
  if (priority === "HIGH") {
    return "Alta";
  }

  if (priority === "MEDIUM") {
    return "Media";
  }

  return "Bassa";
}

function categoryLabel(
  category: DecisionCategory,
) {
  if (category === "POLICY") {
    return "Politica patrimoniale";
  }

  if (category === "PROPERTY") {
    return "Immobili";
  }

  if (category === "PLANNING") {
    return "Pianificazione";
  }

  return "Piattaforma";
}

function categoryIcon(
  category: DecisionCategory,
) {
  if (category === "POLICY") {
    return <PolicyRoundedIcon />;
  }

  if (category === "PROPERTY") {
    return <HomeWorkRoundedIcon />;
  }

  if (category === "PLANNING") {
    return <AccountBalanceRoundedIcon />;
  }

  return <ComputerRoundedIcon />;
}

export default function Decisions() {
  const approvedCount = DECISIONS.filter(
    (decision) =>
      decision.status === "APPROVED",
  ).length;

  const inProgressCount = DECISIONS.filter(
    (decision) =>
      decision.status === "IN_PROGRESS",
  ).length;

  const highPriorityCount = DECISIONS.filter(
    (decision) =>
      decision.priority === "HIGH",
  ).length;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">
          Decisioni
        </Typography>

        <Typography
          color="text.secondary"
          sx={{ mt: 0.5 }}
        >
          Registro storico delle decisioni
          strategiche del Family Office.
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          position: "relative",
          overflow: "hidden",
          mb: 3,
          p: {
            xs: 3,
            md: 4,
          },
          color: "white",
          background:
            "linear-gradient(120deg, #332353 0%, #584080 55%, #8565AD 135%)",
          boxShadow:
            "0 18px 42px rgba(69, 45, 105, 0.23)",

          "&::after": {
            content: '""',
            position: "absolute",
            width: 330,
            height: 330,
            borderRadius: "50%",
            top: -205,
            right: -55,
            backgroundColor:
              "rgba(255,255,255,0.10)",
          },
        }}
      >
        <Typography
          variant="overline"
          sx={{
            color:
              "rgba(255,255,255,0.72)",
            letterSpacing: "0.15em",
          }}
        >
          Strategic Decision Log
        </Typography>

        <Typography
          sx={{
            mt: 1,
            color:
              "rgba(255,255,255,0.76)",
          }}
        >
          Decisioni registrate
        </Typography>

        <Typography
          sx={{
            mt: 0.5,
            fontSize: {
              xs: "2.25rem",
              md: "3.1rem",
            },
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: "-0.045em",
          }}
        >
          {DECISIONS.length}
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            mt: 3,
          }}
        >
          <Chip
            label="Storico permanente"
            sx={{
              color: "white",
              backgroundColor:
                "rgba(255,255,255,0.17)",
            }}
          />

          <Chip
            label={`${highPriorityCount} priorità alte`}
            sx={{
              color: "white",
              backgroundColor:
                "rgba(255,255,255,0.17)",
            }}
          />

          <Chip
            label="Aggiornamento cronologico"
            sx={{
              color: "white",
              backgroundColor:
                "rgba(255,255,255,0.17)",
            }}
          />
        </Box>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2.2,
          mb: 3,
        }}
      >
        <KpiCard
          title="Decisioni totali"
          value={String(DECISIONS.length)}
          subtitle="Registro storico"
          icon={<GavelRoundedIcon />}
          tone="primary"
        />

        <KpiCard
          title="Approvate"
          value={String(approvedCount)}
          subtitle="Decisioni formalizzate"
          icon={<CheckCircleRoundedIcon />}
          tone="success"
        />

        <KpiCard
          title="In esecuzione"
          value={String(inProgressCount)}
          subtitle="Attività operative"
          icon={<PendingActionsRoundedIcon />}
          tone="warning"
        />

        <KpiCard
          title="Priorità alta"
          value={String(highPriorityCount)}
          subtitle="Da presidiare"
          icon={<PriorityHighRoundedIcon />}
          tone="error"
        />
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Il registro non deve essere modificato
        retroattivamente. Eventuali aggiornamenti,
        risultati o insegnamenti devono essere
        aggiunti preservando la decisione originale.
      </Alert>

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
        }}
      >
        {[...DECISIONS]
          .reverse()
          .map((decision) => (
            <Paper
              key={decision.id}
              elevation={0}
              sx={{
                p: {
                  xs: 2.5,
                  md: 3.5,
                },
                border: "1px solid",
                borderColor: "divider",
                boxShadow:
                  "0 12px 32px rgba(26,45,75,0.06)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
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
                    gap: 2,
                    alignItems: "flex-start",
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "14px",
                      color: "primary.main",
                      backgroundColor:
                        "rgba(32, 91, 170, 0.10)",
                    }}
                  >
                    {categoryIcon(
                      decision.category,
                    )}
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 700 }}
                    >
                      {decision.date} ·{" "}
                      {categoryLabel(
                        decision.category,
                      )}
                    </Typography>

                    <Typography
                      variant="h6"
                      sx={{ mt: 0.5 }}
                    >
                      {decision.title}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Chip
                    size="small"
                    color={statusColor(
                      decision.status,
                    )}
                    label={statusLabel(
                      decision.status,
                    )}
                  />

                  <Chip
                    size="small"
                    variant="outlined"
                    color={
                      decision.priority === "HIGH"
                        ? "error"
                        : decision.priority ===
                            "MEDIUM"
                          ? "warning"
                          : "success"
                    }
                    label={`Priorità ${priorityLabel(
                      decision.priority,
                    )}`}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    lg: "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 3,
                }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 0.7 }}
                  >
                    Motivazione
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {decision.motivation}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 0.7 }}
                  >
                    Analisi effettuata
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {decision.analysis}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    lg: "minmax(0, 0.8fr) minmax(0, 1.2fr)",
                  },
                  gap: 3,
                }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1 }}
                  >
                    Alternative considerate
                  </Typography>

                  <Box
                    component="ul"
                    sx={{
                      mt: 0,
                      mb: 0,
                      pl: 2.2,
                      color: "text.secondary",
                    }}
                  >
                    {decision.alternatives.map(
                      (alternative) => (
                        <Typography
                          key={alternative}
                          component="li"
                          variant="body2"
                          sx={{ mb: 0.6 }}
                        >
                          {alternative}
                        </Typography>
                      ),
                    )}
                  </Box>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 0.7 }}
                  >
                    Decisione finale
                  </Typography>

                  <Typography variant="body2">
                    {decision.finalDecision}
                  </Typography>

                  {decision.amount !== null && (
                    <Typography
                      sx={{
                        mt: 1.2,
                        fontWeight: 800,
                        color:
                          decision.amount < 0
                            ? "error.main"
                            : "primary.main",
                      }}
                    >
                      {euro(decision.amount)}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    lg: "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 3,
                }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 0.7 }}
                  >
                    Effetti sul patrimonio
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {decision.impact}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 0.7 }}
                  >
                    Risultato
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {decision.result}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 0.7 }}
                  >
                    Insegnamenti
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {decision.lessons}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          ))}
      </Box>
    </Box>
  );
}
