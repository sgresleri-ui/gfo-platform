import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Typography,
} from "@mui/material";

import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import type {
  PlanningScenarioAssessmentCheck,
  PlanningScenarioAssessmentCheckStatus,
  PlanningScenarioAssessmentResponse,
  PlanningScenarioAssessmentStatus,
} from "../services/api";

type Props = {
  assessment:
    PlanningScenarioAssessmentResponse | null;
};

function assessmentLabel(
  status: PlanningScenarioAssessmentStatus,
): string {
  if (status === "COMPLIANT") {
    return "Coerente con IPS";
  }

  if (status === "ATTENTION") {
    return "Attenzione IPS";
  }

  return "Non coerente con IPS";
}

function assessmentColor(
  status: PlanningScenarioAssessmentStatus,
): "success" | "warning" | "error" {
  if (status === "COMPLIANT") {
    return "success";
  }

  if (status === "ATTENTION") {
    return "warning";
  }

  return "error";
}

function checkLabel(
  status:
    PlanningScenarioAssessmentCheckStatus,
): string {
  if (status === "PASS") {
    return "OK";
  }

  if (status === "WARNING") {
    return "Attenzione";
  }

  if (status === "FAIL") {
    return "Criticità";
  }

  return "N/D";
}

function checkColor(
  status:
    PlanningScenarioAssessmentCheckStatus,
):
  | "success"
  | "warning"
  | "error"
  | "default" {
  if (status === "PASS") {
    return "success";
  }

  if (status === "WARNING") {
    return "warning";
  }

  if (status === "FAIL") {
    return "error";
  }

  return "default";
}

function formatActualValue(
  value: number | string | null,
): string {
  if (value === null) {
    return "—";
  }

  if (typeof value === "number") {
    return value.toLocaleString(
      "it-IT",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      },
    );
  }

  if (value === "SUSTAINABLE") {
    return "Sostenibile";
  }

  if (value === "AT_RISK") {
    return "A rischio";
  }

  if (value === "UNSUSTAINABLE") {
    return "Non sostenibile";
  }

  return value;
}

function CheckList({
  title,
  subtitle,
  checks,
}: {
  title: string;
  subtitle: string;
  checks:
    PlanningScenarioAssessmentCheck[];
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 800 }}
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.3, mb: 1.5 }}
      >
        {subtitle}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 1.2,
        }}
      >
        {checks.map((check) => (
          <Box
            key={check.code}
            sx={{
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.5,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "flex-start",
                gap: 1.5,
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 800 }}
                >
                  {check.title}
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {check.dimension}
                </Typography>
              </Box>

              <Chip
                size="small"
                label={checkLabel(
                  check.status,
                )}
                color={checkColor(
                  check.status,
                )}
                variant="outlined"
              />
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              {check.description}
            </Typography>

            <Box
              sx={{
                mt: 1,
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm:
                    "repeat(2, minmax(0, 1fr))",
                },
                gap: 1,
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Valore rilevato
                </Typography>

                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700 }}
                >
                  {formatActualValue(
                    check.actualValue,
                  )}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Soglia
                </Typography>

                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700 }}
                >
                  {check.threshold ?? "—"}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default function PlanningScenarioAssessmentPanel({
  assessment,
}: Props) {
  if (!assessment) {
    return null;
  }

  const baselineChecks =
    assessment.assessment.checks.filter(
      (check) =>
        check.origin === "BASELINE",
    );

  const scenarioChecks =
    assessment.assessment.checks.filter(
      (check) =>
        check.origin === "SCENARIO",
    );

  const overallStatus =
    assessment.assessment
      .overallStatus;

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2.5,
        p: {
          xs: 2.2,
          md: 3,
        },
        border: "1px solid",
        borderColor: "divider",
        backgroundColor:
          "background.default",
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
          <AssignmentTurnedInRoundedIcon
            color="primary"
          />

          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800 }}
            >
              Valutazione IPS dello scenario
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Coerenza patrimoniale, rischi
              strutturali e azioni correttive.
            </Typography>
          </Box>
        </Box>

        <Chip
          label={assessmentLabel(
            overallStatus,
          )}
          color={assessmentColor(
            overallStatus,
          )}
          sx={{
            fontWeight: 800,
          }}
        />
      </Box>

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
          gap: 1.4,
          mb: 2.5,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 1.8,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Punteggio
          </Typography>

          <Typography
            variant="h4"
            sx={{
              mt: 0.4,
              fontWeight: 850,
            }}
          >
            {assessment.assessment.score}
            /100
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 1.8,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Situazione di partenza
          </Typography>

          <Chip
            label={assessmentLabel(
              assessment.assessment
                .baselineStatus,
            )}
            color={assessmentColor(
              assessment.assessment
                .baselineStatus,
            )}
            variant="outlined"
            sx={{ mt: 1 }}
          />

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.8 }}
          >
            {
              assessment.assessment
                .baselineIssueCount
            }{" "}
            criticità o attenzioni
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 1.8,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Effetti dello scenario
          </Typography>

          <Chip
            label={assessmentLabel(
              assessment.assessment
                .scenarioStatus,
            )}
            color={assessmentColor(
              assessment.assessment
                .scenarioStatus,
            )}
            variant="outlined"
            sx={{ mt: 1 }}
          />

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.8 }}
          >
            {
              assessment.assessment
                .scenarioIssueCount
            }{" "}
            criticità o attenzioni
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 1.8,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Controlli
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              mt: 1,
            }}
          >
            <Chip
              size="small"
              icon={
                <CheckCircleRoundedIcon />
              }
              label={`${assessment.assessment.passCount} OK`}
              color="success"
              variant="outlined"
            />

            <Chip
              size="small"
              icon={
                <WarningAmberRoundedIcon />
              }
              label={`${assessment.assessment.warningCount} attenzioni`}
              color="warning"
              variant="outlined"
            />

            <Chip
              size="small"
              icon={
                <ErrorOutlineRoundedIcon />
              }
              label={`${assessment.assessment.failureCount} criticità`}
              color="error"
              variant="outlined"
            />
          </Box>
        </Paper>
      </Box>

      <Alert
        severity="info"
        sx={{ mb: 2.5 }}
      >
        {assessment.methodology.note}
      </Alert>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl:
              "repeat(2, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <CheckList
          title="Situazione di partenza"
          subtitle="Criticità già presenti prima della simulazione."
          checks={baselineChecks}
        />

        <CheckList
          title="Effetti dello scenario"
          subtitle="Rischi generati o amplificati dalle ipotesi inserite."
          checks={scenarioChecks}
        />
      </Box>

      {assessment.assessment
        .actions.length > 0 && (
        <>
          <Divider sx={{ my: 2.5 }} />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1.5,
            }}
          >
            <LightbulbRoundedIcon
              color="warning"
            />

            <Typography
              variant="h6"
              sx={{ fontWeight: 800 }}
            >
              Azioni correttive prioritarie
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 1.2,
            }}
          >
            {assessment.assessment
              .actions.map((action) => (
              <Paper
                key={action.code}
                elevation={0}
                sx={{
                  p: 1.7,
                  border: "1px solid",
                  borderColor: "divider",
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md:
                      "120px minmax(0, 1fr)",
                  },
                  gap: 1.5,
                }}
              >
                <Chip
                  size="small"
                  label={
                    action.priority === "HIGH"
                      ? "Alta"
                      : action.priority ===
                          "MEDIUM"
                        ? "Media"
                        : "Bassa"
                  }
                  color={
                    action.priority === "HIGH"
                      ? "error"
                      : action.priority ===
                          "MEDIUM"
                        ? "warning"
                        : "default"
                  }
                  variant="outlined"
                  sx={{
                    justifySelf:
                      "start",
                  }}
                />

                <Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 800 }}
                  >
                    {action.title}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.4 }}
                  >
                    {action.rationale}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        </>
      )}
    </Paper>
  );
}
