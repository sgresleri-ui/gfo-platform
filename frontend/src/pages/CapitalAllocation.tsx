import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Typography,
} from "@mui/material";

import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";

import {
  Link as RouterLink,
} from "react-router-dom";

const capitalBlocks = [
  {
    label: "Capitale netto da realizzo",
    description:
      "Ricavo della vendita al netto di imposte, commissioni e costi.",
  },
  {
    label: "Riserve e impegni futuri",
    description:
      "Liquidità di sicurezza, rate immobiliari e spese previste dal Budget.",
  },
  {
    label: "Capitale di breve periodo",
    description:
      "Somme necessarie per obiettivi e acquisti previsti nei prossimi anni.",
  },
  {
    label: "Capitale investibile",
    description:
      "Quota realmente disponibile per investimenti finanziari di lungo termine.",
  },
];

const decisionSteps = [
  "Calcolare il ricavo netto derivante dalla vendita.",
  "Sottrarre riserva fiscale, fondo di emergenza e impegni immobiliari.",
  "Verificare gli obiettivi futuri presenti nel Budget e nel Planning.",
  "Confrontare l’asset allocation risultante con i limiti dell’IPS.",
  "Definire quota, strumenti ETF UCITS e piano di ingresso per tranche.",
];

const dataSources = [
  "Patrimonio",
  "Budget",
  "Planning",
  "IPS",
  "Investimenti",
  "Fiscalità",
  "Mercati",
  "Geopolitica",
];

export default function CapitalAllocation() {
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          mb: 3,
        }}
      >
        <AccountBalanceRoundedIcon
          color="primary"
          sx={{ fontSize: 34, mt: 0.25 }}
        />

        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800 }}
          >
            Piano di allocazione del capitale
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Trasforma il capitale liberato da una vendita
            immobiliare in un piano finanziario coerente con
            Budget, patrimonio, IPS e obiettivi familiari.
          </Typography>
        </Box>
      </Box>

      <Alert
        severity="info"
        sx={{ mb: 3 }}
      >
        Questa prima versione definisce la struttura del
        processo decisionale. Le raccomandazioni automatiche
        saranno attivate solo dopo il collegamento verificato
        delle fonti patrimoniali, fiscali e di mercato.
      </Alert>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        {capitalBlocks.map((block) => (
          <Paper
            key={block.label}
            elevation={0}
            sx={{
              p: 2.25,
              border: "1px solid",
              borderColor: "divider",
              minHeight: 170,
            }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
            >
              Da collegare
            </Typography>

            <Typography
              variant="h6"
              sx={{ mt: 0.5, fontWeight: 750 }}
            >
              {block.label}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              {block.description}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "1.4fr 1fr",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 750 }}
          >
            Processo decisionale
          </Typography>

          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              mt: 2,
            }}
          >
            {decisionSteps.map((step, index) => (
              <Box
                key={step}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.25,
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                }}
              >
                <CheckCircleOutlineRoundedIcon
                  color="primary"
                  sx={{ mt: 0.1 }}
                />

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Fase {index + 1}
                  </Typography>

                  <Typography variant="body2">
                    {step}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 750 }}
          >
            Fonti da integrare
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, mb: 2 }}
          >
            Il motore utilizzerà solo dati verificati e
            aggiornati, distinguendo informazioni interne e
            dati pubblici di mercato.
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            {dataSources.map((source) => (
              <Chip
                key={source}
                label={source}
                variant="outlined"
              />
            ))}
          </Box>
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 750 }}
        >
          Moduli collegati
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.75, mb: 2 }}
        >
          Consulta i dati che alimenteranno il futuro motore
          di allocazione.
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          {[
            ["Planning", "/planning"],
            ["Budget", "/budget"],
            ["IPS", "/ips"],
            ["Investimenti", "/investments"],
          ].map(([label, path]) => (
            <Button
              key={path}
              component={RouterLink}
              to={path}
              variant="outlined"
              endIcon={<ArrowForwardRoundedIcon />}
            >
              {label}
            </Button>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
