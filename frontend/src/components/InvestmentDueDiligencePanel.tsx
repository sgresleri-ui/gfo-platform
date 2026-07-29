import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  Link,
  MenuItem,
  Select,
  TextField,
  Typography,
  type ChipProps,
} from "@mui/material";

import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";

import {
  getElToroInvestmentDueDiligence,
  updateElToroInvestmentDueDiligence,
  type InvestmentBrokerCode,
  type InvestmentBrokerExecutionEvidence,
  type InvestmentBrokerEffectiveStatus,
  type InvestmentBrokerUserStatus,
  type InvestmentDueDiligence,
  type InvestmentDueDiligenceCheckCode,
  type InvestmentDueDiligenceReview,
} from "../services/api";
import {
  parseFlexibleDecimal,
  parseLocaleAmountOrNull,
} from "../utils/amounts";
import {
  executionEvidenceMissingFields,
  isExecutionEvidenceComplete,
} from "../utils/executionEvidence";

type InvestmentDueDiligencePanelProps = {
  recommendationId: string;
  refreshToken: string;
  recommendationIsCurrent: boolean;
};

const BROKERS: Array<{
  code: InvestmentBrokerCode;
  label: string;
}> = [
  {
    code: "FINECO",
    label: "Fineco",
  },
  {
    code: "INTERACTIVE_BROKERS",
    label: "Interactive Brokers",
  },
];

const USER_BROKER_STATUSES: Array<{
  code: InvestmentBrokerUserStatus;
  label: string;
}> = [
  {
    code: "NOT_VERIFIED",
    label: "Da verificare nel conto",
  },
  {
    code: "USER_CONFIRMED",
    label: "Confermato nel conto",
  },
  {
    code: "NOT_AVAILABLE",
    label: "Non disponibile",
  },
];

function euro(value: number): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function percentage(value: number | null): string {
  return value === null
    ? "Da verificare"
    : `${value.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`;
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

function sourceDateLabel(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function localDateTimeInput(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

type ValidatedNumericFieldProps = {
  fieldId: string;
  label: string;
  value: number | null;
  parser: (value: string) => number | null;
  allowZero?: boolean;
  example: string;
  onValueChange: (value: number | null) => void;
  onValidityChange: (fieldId: string, valid: boolean) => void;
};

function ValidatedNumericField({
  fieldId,
  label,
  value,
  parser,
  allowZero = false,
  example,
  onValueChange,
  onValidityChange,
}: ValidatedNumericFieldProps) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [validationError, setValidationError] = useState<string | null>(null);
  const lastCommittedValue = useRef<number | null>(value);

  useEffect(() => {
    if (Object.is(value, lastCommittedValue.current)) {
      return;
    }

    lastCommittedValue.current = value;
    // Sincronizza solo i valori arrivati da un nuovo caricamento/salvataggio.
    setDraft(value === null ? "" : String(value));
    setValidationError(null);
  }, [value]);

  const handleChange = (nextDraft: string) => {
    setDraft(nextDraft);

    if (nextDraft.trim().length === 0) {
      setValidationError(null);
      lastCommittedValue.current = null;
      onValidityChange(fieldId, true);
      onValueChange(null);
      return;
    }

    const parsed = parser(nextDraft);
    const valid =
      parsed !== null && (allowZero ? parsed >= 0 : parsed > 0);

    if (!valid) {
      setValidationError(`Valore non valido. Esempio: ${example}`);
      onValidityChange(fieldId, false);
      return;
    }

    setValidationError(null);
    lastCommittedValue.current = parsed;
    onValidityChange(fieldId, true);
    onValueChange(parsed);
  };

  return (
    <TextField
      size="small"
      label={label}
      value={draft}
      onChange={(event) => handleChange(event.target.value)}
      error={validationError !== null}
      helperText={validationError ?? undefined}
      slotProps={{
        htmlInput: {
          inputMode: "decimal",
        },
      }}
    />
  );
}

function executionMetrics(evidence: InvestmentBrokerExecutionEvidence): {
  complete: boolean;
  missingFields: string[];
  spreadPct: number | null;
  estimatedCost: number | null;
  estimatedCostPct: number | null;
} {
  const missingFields = executionEvidenceMissingFields(evidence);
  const validQuote =
    evidence.bid !== null &&
    evidence.bid > 0 &&
    evidence.ask !== null &&
    evidence.ask >= evidence.bid;
  const validOrder =
    evidence.referenceOrderAmount !== null &&
    evidence.referenceOrderAmount > 0;
  const validCommission =
    evidence.commissionAmount !== null && evidence.commissionAmount >= 0;

  if (!validQuote) {
    return {
      complete: false,
      missingFields,
      spreadPct: null,
      estimatedCost: null,
      estimatedCostPct: null,
    };
  }

  const mid = (evidence.bid! + evidence.ask!) / 2;
  const spreadPct = ((evidence.ask! - evidence.bid!) / mid) * 100;

  if (!validOrder || !validCommission) {
    return {
      complete: false,
      missingFields,
      spreadPct,
      estimatedCost: null,
      estimatedCostPct: null,
    };
  }

  const halfSpreadCost = evidence.referenceOrderAmount! * (spreadPct / 200);
  const estimatedCost = halfSpreadCost + evidence.commissionAmount!;

  return {
    complete: isExecutionEvidenceComplete(evidence),
    missingFields,
    spreadPct,
    estimatedCost,
    estimatedCostPct:
      (estimatedCost / evidence.referenceOrderAmount!) * 100,
  };
}

function executionComparison(review: InvestmentDueDiligenceReview): {
  broker: InvestmentBrokerCode;
  costPct: number;
  advantagePctPoints: number;
} | null {
  const ranked = BROKERS.map((broker) => ({
    broker: broker.code,
    metrics: executionMetrics(review.brokerExecution[broker.code]),
  }))
    .filter(
      (
        item,
      ): item is {
        broker: InvestmentBrokerCode;
        metrics: ReturnType<typeof executionMetrics> & {
          estimatedCostPct: number;
        };
      } => item.metrics.complete && item.metrics.estimatedCostPct !== null,
    )
    .sort(
      (first, second) =>
        first.metrics.estimatedCostPct - second.metrics.estimatedCostPct,
    );

  if (ranked.length !== 2) {
    return null;
  }

  return {
    broker: ranked[0].broker,
    costPct: ranked[0].metrics.estimatedCostPct,
    advantagePctPoints:
      ranked[1].metrics.estimatedCostPct -
      ranked[0].metrics.estimatedCostPct,
  };
}

function statusPresentation(status: InvestmentDueDiligence["status"]): {
  label: string;
  color: ChipProps["color"];
} {
  if (status === "READY_FOR_PROFESSIONAL_REVIEW") {
    return {
      label: "Pronta per revisione professionale",
      color: "success",
    };
  }

  if (status === "DRAFT_BROKER_VERIFICATION") {
    return {
      label: "Broker da verificare",
      color: "warning",
    };
  }

  if (status === "DRAFT_DUE_DILIGENCE") {
    return {
      label: "Due diligence incompleta",
      color: "warning",
    };
  }

  return {
    label: "Selezione da completare",
    color: "info",
  };
}

function brokerStatusPresentation(
  status: InvestmentBrokerEffectiveStatus,
): {
  label: string;
  color: ChipProps["color"];
} {
  if (status === "PUBLICLY_CONFIRMED") {
    return {
      label: "Confermato da fonte pubblica",
      color: "info",
    };
  }

  if (status === "USER_CONFIRMED") {
    return {
      label: "Confermato nel conto",
      color: "success",
    };
  }

  if (status === "NOT_AVAILABLE") {
    return {
      label: "Non disponibile",
      color: "error",
    };
  }

  return {
    label: "Da verificare",
    color: "warning",
  };
}

function documentaryEvidencePresentation(
  status:
    | "SOURCE_SUPPORTED"
    | "USER_REVIEW_REQUIRED"
    | "PROFESSIONAL_VALIDATION_REQUIRED",
): {
  label: string;
  color: ChipProps["color"];
} {
  if (status === "SOURCE_SUPPORTED") {
    return {
      label: "Supportato da fonti",
      color: "success",
    };
  }

  if (status === "PROFESSIONAL_VALIDATION_REQUIRED") {
    return {
      label: "Validazione professionale",
      color: "info",
    };
  }

  return {
    label: "Presa visione richiesta",
    color: "warning",
  };
}

function documentaryKindLabel(
  kind:
    | "PRODUCT_PAGE"
    | "PRIIPS_KID"
    | "PROSPECTUS"
    | "RISK_EXPLAINER"
    | "INDEX_PAGE"
    | "BULLION_HOLDINGS"
    | "MARKET_LISTING"
    | "BROKER_TERMS",
): string {
  const labels = {
    PRODUCT_PAGE: "Scheda prodotto",
    PRIIPS_KID: "PRIIPs KID",
    PROSPECTUS: "Prospetto",
    RISK_EXPLAINER: "Approfondimento rischi",
    INDEX_PAGE: "Indice",
    BULLION_HOLDINGS: "Oro allocato",
    MARKET_LISTING: "Quotazione",
    BROKER_TERMS: "Condizioni broker",
  } satisfies Record<typeof kind, string>;

  return labels[kind];
}

function cloneReviews(
  reviews: InvestmentDueDiligenceReview[],
): InvestmentDueDiligenceReview[] {
  return reviews.map((review) => ({
    ...review,
    checks: {
      ...review.checks,
    },
    documentReview: {
      ...review.documentReview,
    },
    brokerAvailability: {
      ...review.brokerAvailability,
    },
    brokerExecution: {
      FINECO: {
        ...review.brokerExecution.FINECO,
      },
      INTERACTIVE_BROKERS: {
        ...review.brokerExecution.INTERACTIVE_BROKERS,
      },
    },
  }));
}

export default function InvestmentDueDiligencePanel({
  recommendationId,
  refreshToken,
  recommendationIsCurrent,
}: InvestmentDueDiligencePanelProps) {
  const [dueDiligence, setDueDiligence] =
    useState<InvestmentDueDiligence | null>(null);
  const [reviews, setReviews] = useState<InvestmentDueDiligenceReview[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invalidNumericFields, setInvalidNumericFields] = useState<Set<string>>(
    () => new Set(),
  );

  const hydrate = useCallback((next: InvestmentDueDiligence) => {
    setDueDiligence(next);
    setReviews(
      cloneReviews(next.instruments.map((instrument) => instrument.review)),
    );
    setNotes(next.notes ?? "");
    setDirty(false);
    setInvalidNumericFields(new Set());
  }, []);

  const loadDueDiligence = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getElToroInvestmentDueDiligence();

      if (response.dueDiligence) {
        hydrate(response.dueDiligence);
      } else {
        setDueDiligence(null);
        setReviews([]);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Impossibile caricare la due diligence degli strumenti.",
      );
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useEffect(() => {
    // Aggiorna la shortlist quando cambia lo snapshot del Recommendation Engine.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDueDiligence();
  }, [loadDueDiligence, recommendationId, refreshToken]);

  useEffect(() => {
    const warnUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }

      event.preventDefault();
    };

    window.addEventListener("beforeunload", warnUnsavedChanges);

    return () => {
      window.removeEventListener("beforeunload", warnUnsavedChanges);
    };
  }, [dirty]);

  const reviewsByIsin = useMemo(
    () => new Map(reviews.map((review) => [review.isin, review])),
    [reviews],
  );
  const assetClasses = useMemo(() => {
    if (!dueDiligence) {
      return [];
    }

    return Array.from(
      new Map(
        dueDiligence.instruments.map((instrument) => [
          instrument.assetClass,
          {
            code: instrument.assetClass,
            label: instrument.assetClassLabel,
            amount: instrument.proposedAmount,
          },
        ]),
      ).values(),
    ).filter((item) => item.amount > 0);
  }, [dueDiligence]);

  const updateReview = (
    isin: string,
    updater: (
      review: InvestmentDueDiligenceReview,
    ) => InvestmentDueDiligenceReview,
  ) => {
    setReviews((current) =>
      current.map((review) => (review.isin === isin ? updater(review) : review)),
    );
    setDirty(true);
    setSuccess(null);
  };

  const setNumericFieldValidity = useCallback(
    (fieldId: string, valid: boolean) => {
      setInvalidNumericFields((current) => {
        const alreadyInvalid = current.has(fieldId);

        if ((valid && !alreadyInvalid) || (!valid && alreadyInvalid)) {
          return current;
        }

        const next = new Set(current);

        if (valid) {
          next.delete(fieldId);
        } else {
          next.add(fieldId);
        }

        return next;
      });
    },
    [],
  );

  const selectInstrument = (assetClass: string, isin: string) => {
    if (!dueDiligence) {
      return;
    }

    const classIsins = new Set(
      dueDiligence.instruments
        .filter((instrument) => instrument.assetClass === assetClass)
        .map((instrument) => instrument.isin),
    );

    setReviews((current) =>
      current.map((review) =>
        classIsins.has(review.isin)
          ? {
              ...review,
              selected: review.isin === isin,
            }
          : review,
      ),
    );
    setDirty(true);
    setSuccess(null);
  };

  const setCheck = (
    isin: string,
    check: InvestmentDueDiligenceCheckCode,
    checked: boolean,
  ) => {
    updateReview(isin, (review) => ({
      ...review,
      checks: {
        ...review.checks,
        [check]: checked,
      },
      documentReview: {
        acknowledged: false,
        packVersion: null,
        reviewedAt: null,
      },
    }));
  };

  const acknowledgeDocumentReview = (isin: string, packVersion: string) => {
    updateReview(isin, (review) => ({
      ...review,
      documentReview: {
        acknowledged: true,
        packVersion,
        reviewedAt: new Date().toISOString(),
      },
    }));
  };

  const saveDueDiligence = async () => {
    if (!dueDiligence) {
      return;
    }

    if (invalidNumericFields.size > 0) {
      setError(
        "Correggi i valori numerici evidenziati prima di salvare la revisione.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await updateElToroInvestmentDueDiligence({
        recommendationId,
        reviews,
        notes,
      });

      if (!response.dueDiligence) {
        throw new Error("Il backend non ha restituito la due diligence salvata.");
      }

      hydrate(response.dueDiligence);
      setSuccess(
        "Shortlist, verifiche documentali e instradamento broker salvati.",
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Impossibile salvare la due diligence.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 180,
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error && !dueDiligence) {
    return (
      <Alert
        severity="error"
        action={<Button onClick={loadDueDiligence}>Riprova</Button>}
      >
        {error}
      </Alert>
    );
  }

  if (!dueDiligence) {
    return (
      <Alert severity="info">
        Genera una proposta corrente per iniziare la due diligence degli
        strumenti.
      </Alert>
    );
  }

  const status = statusPresentation(dueDiligence.status);

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
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <FactCheckRoundedIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 850 }}>
              Instrument Due Diligence &amp; Broker Routing
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            Confronta il candidato principale con un’alternativa, documenta le
            verifiche e prepara l’instradamento delle tranche.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Chip
            size="small"
            color={dirty ? "warning" : status.color}
            label={dirty ? "Modifiche non salvate" : status.label}
          />

          <Button
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveRoundedIcon />
              )
            }
            disabled={
              saving ||
              !dirty ||
              invalidNumericFields.size > 0 ||
              !recommendationIsCurrent ||
              dueDiligence.recommendationId !== recommendationId
            }
            onClick={saveDueDiligence}
          >
            Salva revisione
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

      {invalidNumericFields.size > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Correggi i valori numerici evidenziati. Il testo inserito resta
          disponibile e il salvataggio è sospeso finché gli errori non sono
          risolti.
        </Alert>
      )}

      <Alert severity="warning" sx={{ mt: 2 }}>
        La fiscalità resta <strong>NEEDS_VALIDATION</strong>. Questa sezione
        costruisce una shortlist verificabile, ma non abilita ordini né
        trasforma i candidati in raccomandazioni definitive.
      </Alert>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 1,
          mt: 2,
        }}
      >
        {[
          {
            label: "Classi selezionate",
            value: `${dueDiligence.validation.progress.selectedAssetClasses}/${dueDiligence.validation.progress.requiredAssetClasses}`,
          },
          {
            label: "Checklist complete",
            value: `${dueDiligence.validation.progress.completedChecklists}/${dueDiligence.validation.progress.requiredAssetClasses}`,
          },
          {
            label: "Route broker confermate",
            value: `${dueDiligence.validation.progress.brokerRoutesConfirmed}/${dueDiligence.validation.progress.requiredAssetClasses}`,
          },
          {
            label: "Esecuzione",
            value: "BLOCCATA",
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
            <Typography variant="caption" color="text.secondary">
              {item.label}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 2 }}>
        {assetClasses.map((assetClass) => (
          <Accordion
            key={assetClass.code}
            defaultExpanded
            disableGutters
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "12px !important",
              mb: 1.5,
              "&:before": {
                display: "none",
              },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                  pr: 1,
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                    {assetClass.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Capitale proposto: {euro(assetClass.amount)}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  color={
                    dueDiligence.instruments.some(
                      (instrument) =>
                        instrument.assetClass === assetClass.code &&
                        reviewsByIsin.get(instrument.isin)?.selected,
                    )
                      ? "success"
                      : "warning"
                  }
                  label={
                    dueDiligence.instruments.some(
                      (instrument) =>
                        instrument.assetClass === assetClass.code &&
                        reviewsByIsin.get(instrument.isin)?.selected,
                    )
                      ? "1 strumento selezionato"
                      : "Selezione mancante"
                  }
                />
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    xl: "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 1.5,
                }}
              >
                {dueDiligence.instruments
                  .filter(
                    (instrument) =>
                      instrument.assetClass === assetClass.code,
                  )
                  .map((instrument) => {
                    const review = reviewsByIsin.get(instrument.isin);

                    if (!review) {
                      return null;
                    }

                    return (
                      <Box
                        key={instrument.isin}
                        sx={{
                          p: 1.75,
                          borderRadius: 2,
                          border: "2px solid",
                          borderColor: review.selected
                            ? "primary.main"
                            : "divider",
                          bgcolor: review.selected
                            ? "primary.50"
                            : "background.paper",
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
                            <Box
                              sx={{
                                display: "flex",
                                gap: 0.75,
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{ fontWeight: 900 }}
                              >
                                {instrument.ticker}
                              </Typography>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={
                                  instrument.role === "PRIMARY"
                                    ? "Candidato principale"
                                    : "Alternativa"
                                }
                              />
                              {instrument.ucitsClassification ===
                                "UCITS_ELIGIBLE_ETC_NOT_FUND" && (
                                <Chip
                                  size="small"
                                  color="warning"
                                  label="ETC, non fondo UCITS"
                                />
                              )}
                              {instrument.documentPack && (
                                <Chip
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                  label={`Fascicolo ${instrument.documentPack.version}`}
                                />
                              )}
                            </Box>

                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 750, mt: 0.5 }}
                            >
                              {instrument.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              ISIN {instrument.isin}
                            </Typography>
                          </Box>

                          <Button
                            size="small"
                            variant={review.selected ? "contained" : "outlined"}
                            onClick={() =>
                              selectInstrument(
                                instrument.assetClass,
                                instrument.isin,
                              )
                            }
                          >
                            {review.selected ? "Selezionato" : "Seleziona"}
                          </Button>
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
                          {[
                            ["Struttura", instrument.structure],
                            ["Replica", instrument.replication],
                            [
                              "Costo corrente",
                              percentage(instrument.ongoingChargePct),
                            ],
                            ["Dimensione", instrument.size],
                          ].map(([label, value]) => (
                            <Box key={label}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {label}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {value}
                              </Typography>
                            </Box>
                          ))}
                        </Box>

                        <Box component="ul" sx={{ mt: 1.5, mb: 0, pl: 2.5 }}>
                          {instrument.keyFacts.map((fact) => (
                            <Typography
                              component="li"
                              variant="body2"
                              key={fact}
                              sx={{ mb: 0.5 }}
                            >
                              {fact}
                            </Typography>
                          ))}
                        </Box>

                        <Alert severity="warning" sx={{ mt: 1.5 }}>
                          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                            {instrument.risks.map((risk) => (
                              <li key={risk}>{risk}</li>
                            ))}
                          </Box>
                        </Alert>

                        <Box
                          sx={{
                            mt: 1.5,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: "action.hover",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 850 }}
                              >
                                Esposizioni esistenti nella stessa classe IPS
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Analisi automatica delle 46 posizioni
                                riclassificate, incluso il look-through.
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              color={
                                instrument.portfolioOverlap.positionCount > 0
                                  ? "warning"
                                  : "success"
                              }
                              label={`${instrument.portfolioOverlap.positionCount} posizioni · ${euro(
                                instrument.portfolioOverlap.existingExposure,
                              )}`}
                            />
                          </Box>

                          {instrument.portfolioOverlap.positions.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              {instrument.portfolioOverlap.positions.map(
                                (position) => (
                                  <Box
                                    key={`${instrument.isin}-${position.code}`}
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "baseline",
                                      gap: 1,
                                      py: 0.5,
                                      borderBottom: "1px solid",
                                      borderColor: "divider",
                                      "&:last-of-type": {
                                        borderBottom: 0,
                                      },
                                    }}
                                  >
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 750 }}
                                      >
                                        {position.name}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {position.classificationMode ===
                                        "LOOK_THROUGH"
                                          ? `Look-through ${percentage(
                                              position.exposurePercentageOfPosition,
                                            )}`
                                          : "Classificazione diretta"}
                                      </Typography>
                                    </Box>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 800,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {euro(position.exposureValue)}
                                    </Typography>
                                  </Box>
                                ),
                              )}
                            </Box>
                          )}

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 1 }}
                          >
                            {instrument.portfolioOverlap.assessment}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            gap: 1.25,
                            flexWrap: "wrap",
                            mt: 1.25,
                          }}
                        >
                          {instrument.sources.map((source) => (
                            <Link
                              key={`${instrument.isin}-${source.url}`}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              variant="body2"
                            >
                              {source.publisher} ·{" "}
                              {sourceDateLabel(source.sourceDate)}
                              <OpenInNewRoundedIcon
                                sx={{
                                  ml: 0.35,
                                  fontSize: "0.9rem",
                                  verticalAlign: "text-bottom",
                                }}
                              />
                            </Link>
                          ))}
                        </Box>

                        {review.selected && (
                          <>
                            {instrument.documentPack && (
                              <>
                                <Divider sx={{ my: 2 }} />

                                <Box
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    border: "1px solid",
                                    borderColor: "primary.light",
                                    bgcolor: "primary.50",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "flex-start",
                                      gap: 1,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <Box>
                                      <Typography
                                        variant="subtitle2"
                                        sx={{ fontWeight: 900 }}
                                      >
                                        Fascicolo documentale{" "}
                                        {instrument.ticker}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        Versione{" "}
                                        {instrument.documentPack.version} ·
                                        fonti al{" "}
                                        {sourceDateLabel(
                                          instrument.documentPack.asOfDate,
                                        )}
                                      </Typography>
                                    </Box>
                                    <Chip
                                      size="small"
                                      color={
                                        instrument.documentPack.status ===
                                        "READY_FOR_REVIEW"
                                          ? "success"
                                          : "warning"
                                      }
                                      label={
                                        instrument.documentPack.status ===
                                        "READY_FOR_REVIEW"
                                          ? "Pronto per presa visione"
                                          : "Fonti da completare"
                                      }
                                    />
                                  </Box>

                                  <Alert severity="info" sx={{ mt: 1.25 }}>
                                    Le fonti sostengono la sintesi, ma non
                                    certificano automaticamente comprensione,
                                    adeguatezza o fiscalità. Apri i documenti e
                                    conferma manualmente i controlli sottostanti.
                                  </Alert>

                                  <Box
                                    sx={{
                                      display: "grid",
                                      gridTemplateColumns: {
                                        xs: "1fr",
                                        md: "repeat(2, minmax(0, 1fr))",
                                      },
                                      gap: 1,
                                      mt: 1.25,
                                    }}
                                  >
                                    {instrument.documentPack.documents.map(
                                      (document) => (
                                        <Box
                                          key={document.id}
                                          sx={{
                                            p: 1.1,
                                            borderRadius: 1.5,
                                            bgcolor: "background.paper",
                                            border: "1px solid",
                                            borderColor: "divider",
                                          }}
                                        >
                                          <Typography
                                            variant="overline"
                                            color="primary.main"
                                          >
                                            {documentaryKindLabel(document.kind)}
                                          </Typography>
                                          <Link
                                            href={document.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            variant="body2"
                                            sx={{
                                              display: "block",
                                              fontWeight: 800,
                                            }}
                                          >
                                            {document.title}
                                            <OpenInNewRoundedIcon
                                              sx={{
                                                ml: 0.35,
                                                fontSize: "0.9rem",
                                                verticalAlign: "text-bottom",
                                              }}
                                            />
                                          </Link>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ display: "block", mt: 0.4 }}
                                          >
                                            {document.publisher} ·{" "}
                                            {sourceDateLabel(
                                              document.sourceDate,
                                            )}
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            sx={{ display: "block", mt: 0.5 }}
                                          >
                                            {document.purpose}
                                          </Typography>
                                        </Box>
                                      ),
                                    )}
                                  </Box>

                                  <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: 850, mt: 1.5 }}
                                  >
                                    Evidenze per controllo
                                  </Typography>

                                  <Box sx={{ mt: 0.75 }}>
                                    {instrument.documentPack.evidence.map(
                                      (evidence) => {
                                        const evidenceStatus =
                                          documentaryEvidencePresentation(
                                            evidence.status,
                                          );
                                        const check =
                                          dueDiligence.checks.find(
                                            (item) =>
                                              item.code === evidence.checkCode,
                                          );

                                        return (
                                          <Box
                                            key={evidence.checkCode}
                                            sx={{
                                              py: 1,
                                              borderTop: "1px solid",
                                              borderColor: "divider",
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                display: "flex",
                                                justifyContent:
                                                  "space-between",
                                                alignItems: "center",
                                                gap: 1,
                                                flexWrap: "wrap",
                                              }}
                                            >
                                              <Typography
                                                variant="body2"
                                                sx={{ fontWeight: 800 }}
                                              >
                                                {check?.label ??
                                                  evidence.checkCode}
                                              </Typography>
                                              <Chip
                                                size="small"
                                                color={evidenceStatus.color}
                                                label={evidenceStatus.label}
                                              />
                                            </Box>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                              sx={{
                                                display: "block",
                                                mt: 0.4,
                                              }}
                                            >
                                              {evidence.summary}
                                            </Typography>
                                            <Box
                                              sx={{
                                                display: "flex",
                                                gap: 1,
                                                flexWrap: "wrap",
                                                mt: 0.45,
                                              }}
                                            >
                                              {evidence.sourceIds.map(
                                                (sourceId) => {
                                                  const source =
                                                    instrument.documentPack?.documents.find(
                                                      (document) =>
                                                        document.id === sourceId,
                                                    );

                                                  return source ? (
                                                    <Link
                                                      key={sourceId}
                                                      href={source.url}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      variant="caption"
                                                    >
                                                      {source.publisher}
                                                    </Link>
                                                  ) : null;
                                                },
                                              )}
                                            </Box>
                                            {evidence.limitations.map(
                                              (limitation) => (
                                                <Typography
                                                  key={limitation}
                                                  variant="caption"
                                                  color="warning.dark"
                                                  sx={{
                                                    display: "block",
                                                    mt: 0.25,
                                                  }}
                                                >
                                                  • {limitation}
                                                </Typography>
                                              ),
                                            )}
                                          </Box>
                                        );
                                      },
                                    )}
                                  </Box>

                                  <Alert severity="warning" sx={{ mt: 1 }}>
                                    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                                      {instrument.documentPack.limitations.map(
                                        (limitation) => (
                                          <li key={limitation}>{limitation}</li>
                                        ),
                                      )}
                                    </Box>
                                  </Alert>
                                </Box>
                              </>
                            )}

                            <Divider sx={{ my: 2 }} />

                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 850 }}
                            >
                              Conferme manuali di presa visione
                            </Typography>

                            <Box sx={{ mt: 0.5 }}>
                              {dueDiligence.checks.map((check) => (
                                <FormControlLabel
                                  key={check.code}
                                  sx={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    mx: 0,
                                    mb: 0.5,
                                  }}
                                  control={
                                    <Checkbox
                                      checked={review.checks[check.code]}
                                      onChange={(event) =>
                                        setCheck(
                                          instrument.isin,
                                          check.code,
                                          event.target.checked,
                                        )
                                      }
                                      sx={{ pt: 0.25 }}
                                    />
                                  }
                                  label={
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 750 }}
                                      >
                                        {check.label}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {check.description}
                                      </Typography>
                                    </Box>
                                  }
                                />
                              ))}
                            </Box>

                            {instrument.documentPack && (
                              <Box
                                sx={{
                                  mt: 1.25,
                                  p: 1.25,
                                  borderRadius: 2,
                                  border: "1px solid",
                                  borderColor:
                                    review.documentReview.acknowledged &&
                                    review.documentReview.packVersion ===
                                      instrument.documentPack.version
                                      ? "success.light"
                                      : "divider",
                                  bgcolor:
                                    review.documentReview.acknowledged &&
                                    review.documentReview.packVersion ===
                                      instrument.documentPack.version
                                      ? "success.50"
                                      : "action.hover",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 1,
                                  flexWrap: "wrap",
                                }}
                              >
                                <Box>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 850 }}
                                  >
                                    {review.documentReview.acknowledged &&
                                    review.documentReview.packVersion ===
                                      instrument.documentPack.version
                                      ? "Presa visione registrata"
                                      : "Presa visione non registrata"}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {review.documentReview.reviewedAt &&
                                    review.documentReview.packVersion ===
                                      instrument.documentPack.version
                                      ? `${dateLabel(
                                          review.documentReview.reviewedAt,
                                        )} · ${review.documentReview.packVersion}`
                                      : "Completa le cinque conferme prima di registrare data e versione del fascicolo."}
                                  </Typography>
                                </Box>
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={
                                    !dueDiligence.checks.every(
                                      (check) => review.checks[check.code],
                                    ) ||
                                    (review.documentReview.acknowledged &&
                                      review.documentReview.packVersion ===
                                        instrument.documentPack.version)
                                  }
                                  onClick={() =>
                                    acknowledgeDocumentReview(
                                      instrument.isin,
                                      instrument.documentPack!.version,
                                    )
                                  }
                                >
                                  Registra presa visione
                                </Button>
                              </Box>
                            )}

                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 850, mt: 1.5 }}
                            >
                              Disponibilità per broker
                            </Typography>

                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                  xs: "1fr",
                                  md: "repeat(2, minmax(0, 1fr))",
                                },
                                gap: 1,
                                mt: 1,
                              }}
                            >
                              {instrument.brokerRoutes.map((route) => {
                                const routeStatus =
                                  brokerStatusPresentation(
                                    review.brokerAvailability[route.broker] ===
                                      "NOT_VERIFIED"
                                      ? route.publicStatus
                                      : review.brokerAvailability[route.broker],
                                  );
                                const execution =
                                  review.brokerExecution[route.broker];
                                const metrics = executionMetrics(execution);
                                const updateExecution = (
                                  patch: Partial<InvestmentBrokerExecutionEvidence>,
                                ) =>
                                  updateReview(
                                    instrument.isin,
                                    (current) => ({
                                      ...current,
                                      brokerExecution: {
                                        ...current.brokerExecution,
                                        [route.broker]: {
                                          ...current.brokerExecution[
                                            route.broker
                                          ],
                                          ...patch,
                                        },
                                      },
                                    }),
                                  );

                                return (
                                  <Box
                                    key={route.broker}
                                    sx={{
                                      p: 1.25,
                                      borderRadius: 2,
                                      border: "1px solid",
                                      borderColor: "divider",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 1,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 850 }}
                                      >
                                        {route.brokerLabel}
                                      </Typography>
                                      <Chip
                                        size="small"
                                        color={routeStatus.color}
                                        label={routeStatus.label}
                                      />
                                    </Box>

                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: "block", mt: 0.75 }}
                                    >
                                      {route.note}
                                    </Typography>

                                    <FormControl
                                      size="small"
                                      fullWidth
                                      sx={{ mt: 1 }}
                                    >
                                      <InputLabel>
                                        Verifica nel conto
                                      </InputLabel>
                                      <Select
                                        label="Verifica nel conto"
                                        value={
                                          review.brokerAvailability[
                                            route.broker
                                          ]
                                        }
                                        onChange={(event) =>
                                          updateReview(
                                            instrument.isin,
                                            (current) => ({
                                              ...current,
                                              preferredBroker:
                                                event.target.value ===
                                                  "NOT_AVAILABLE" &&
                                                current.preferredBroker ===
                                                  route.broker
                                                  ? null
                                                  : current.preferredBroker,
                                              brokerAvailability: {
                                                ...current.brokerAvailability,
                                                [route.broker]: event.target
                                                  .value as InvestmentBrokerUserStatus,
                                              },
                                            }),
                                          )
                                        }
                                      >
                                        {USER_BROKER_STATUSES.map((option) => (
                                          <MenuItem
                                            key={option.code}
                                            value={option.code}
                                          >
                                            {option.label}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>

                                    {review.brokerAvailability[route.broker] ===
                                      "USER_CONFIRMED" && (
                                      <Box
                                        sx={{
                                          mt: 1.25,
                                          pt: 1.25,
                                          borderTop: "1px solid",
                                          borderColor: "divider",
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 1,
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          <Typography
                                            variant="caption"
                                            sx={{ fontWeight: 850 }}
                                          >
                                            Evidenza di esecuzione
                                          </Typography>
                                          <Chip
                                            size="small"
                                            color={
                                              metrics.complete
                                                ? "success"
                                                : "warning"
                                            }
                                            label={
                                              metrics.complete
                                                ? "Confronto completo"
                                                : metrics.missingFields.length >
                                                    0
                                                  ? `Manca: ${metrics.missingFields.join(
                                                      ", ",
                                                    )}`
                                                  : "Dati da completare"
                                            }
                                          />
                                        </Box>

                                        <Box
                                          sx={{
                                            display: "grid",
                                            gridTemplateColumns:
                                              "repeat(2, minmax(0, 1fr))",
                                            gap: 1,
                                            mt: 1,
                                          }}
                                        >
                                          <TextField
                                            size="small"
                                            label="Data e ora"
                                            type="datetime-local"
                                            fullWidth
                                            value={localDateTimeInput(
                                              execution.observedAt,
                                            )}
                                            onChange={(event) =>
                                              updateExecution({
                                                observedAt: event.target.value
                                                  ? new Date(
                                                      event.target.value,
                                                    ).toISOString()
                                                  : null,
                                              })
                                            }
                                            slotProps={{
                                              inputLabel: {
                                                shrink: true,
                                              },
                                            }}
                                            sx={{
                                              gridColumn: "1 / -1",
                                              minWidth: 0,
                                              "& input": {
                                                minWidth: 0,
                                              },
                                            }}
                                          />
                                          <TextField
                                            size="small"
                                            label="Mercato"
                                            placeholder="XETRA / IBIS2"
                                            fullWidth
                                            value={execution.venue ?? ""}
                                            onChange={(event) =>
                                              updateExecution({
                                                venue: event.target.value,
                                              })
                                            }
                                            sx={{
                                              gridColumn: "1 / -1",
                                              minWidth: 0,
                                            }}
                                          />
                                          <ValidatedNumericField
                                            fieldId={`${instrument.isin}-${route.broker}-bid`}
                                            label="Bid (€)"
                                            value={execution.bid}
                                            parser={parseFlexibleDecimal}
                                            example="149,7703 oppure 149.7703"
                                            onValueChange={(value) =>
                                              updateExecution({
                                                bid: value,
                                              })
                                            }
                                            onValidityChange={
                                              setNumericFieldValidity
                                            }
                                          />
                                          <ValidatedNumericField
                                            fieldId={`${instrument.isin}-${route.broker}-ask`}
                                            label="Ask (€)"
                                            value={execution.ask}
                                            parser={parseFlexibleDecimal}
                                            example="149,7703 oppure 149.7703"
                                            onValueChange={(value) =>
                                              updateExecution({
                                                ask: value,
                                              })
                                            }
                                            onValidityChange={
                                              setNumericFieldValidity
                                            }
                                          />
                                          <ValidatedNumericField
                                            fieldId={`${instrument.isin}-${route.broker}-order`}
                                            label="Ordine simulato (€)"
                                            value={
                                              execution.referenceOrderAmount
                                            }
                                            parser={parseLocaleAmountOrNull}
                                            example="70.016,43 oppure 70016.43"
                                            onValueChange={(value) =>
                                              updateExecution({
                                                referenceOrderAmount: value,
                                              })
                                            }
                                            onValidityChange={
                                              setNumericFieldValidity
                                            }
                                          />
                                          <ValidatedNumericField
                                            fieldId={`${instrument.isin}-${route.broker}-commission`}
                                            label="Commissione (€)"
                                            value={execution.commissionAmount}
                                            parser={parseLocaleAmountOrNull}
                                            allowZero
                                            example="0 oppure 35,01"
                                            onValueChange={(value) =>
                                              updateExecution({
                                                commissionAmount: value,
                                              })
                                            }
                                            onValidityChange={
                                              setNumericFieldValidity
                                            }
                                          />
                                        </Box>

                                        <FormControlLabel
                                          sx={{ mt: 0.5, mx: 0 }}
                                          control={
                                            <Checkbox
                                              size="small"
                                              checked={
                                                execution.regularSession
                                              }
                                              onChange={(event) =>
                                                updateExecution({
                                                  regularSession:
                                                    event.target.checked,
                                                })
                                              }
                                            />
                                          }
                                          label={
                                            <Typography variant="caption">
                                              Quotazione rilevata durante la
                                              sessione regolare del mercato
                                            </Typography>
                                          }
                                        />

                                        <Box
                                          sx={{
                                            mt: 0.5,
                                            p: 1,
                                            borderRadius: 1.5,
                                            bgcolor: "action.hover",
                                          }}
                                        >
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            Spread bid/ask
                                          </Typography>
                                          <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 800 }}
                                          >
                                            {metrics.spreadPct === null
                                              ? "Da calcolare"
                                              : `${metrics.spreadPct.toLocaleString(
                                                  "it-IT",
                                                  {
                                                    minimumFractionDigits: 3,
                                                    maximumFractionDigits: 3,
                                                  },
                                                )}%`}
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                              display: "block",
                                              mt: 0.5,
                                            }}
                                          >
                                            Costo indicativo acquisto
                                          </Typography>
                                          <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 800 }}
                                          >
                                            {metrics.estimatedCost === null ||
                                            metrics.estimatedCostPct === null
                                              ? "Da calcolare"
                                              : `${euro(
                                                  metrics.estimatedCost,
                                                )} · ${metrics.estimatedCostPct.toLocaleString(
                                                  "it-IT",
                                                  {
                                                    minimumFractionDigits: 3,
                                                    maximumFractionDigits: 3,
                                                  },
                                                )}%`}
                                          </Typography>
                                        </Box>

                                        <TextField
                                          size="small"
                                          label="Note quotazione"
                                          value={execution.notes ?? ""}
                                          onChange={(event) =>
                                            updateExecution({
                                              notes: event.target.value,
                                            })
                                          }
                                          multiline
                                          minRows={2}
                                          fullWidth
                                          slotProps={{
                                            htmlInput: {
                                              maxLength: 500,
                                            },
                                          }}
                                          sx={{ mt: 1 }}
                                        />
                                      </Box>
                                    )}

                                    <Link
                                      href={route.sourceUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      variant="caption"
                                      sx={{ display: "inline-block", mt: 1 }}
                                    >
                                      Fonte pubblica
                                    </Link>
                                  </Box>
                                );
                              })}
                            </Box>

                            {(() => {
                              const comparison = executionComparison(review);

                              if (!comparison) {
                                return (
                                  <Alert severity="info" sx={{ mt: 1.25 }}>
                                    Completa i dati di entrambi i broker per
                                    ottenere il confronto del costo indicativo.
                                  </Alert>
                                );
                              }

                              const brokerLabel =
                                BROKERS.find(
                                  (broker) =>
                                    broker.code === comparison.broker,
                                )?.label ?? comparison.broker;

                              return (
                                <Alert severity="success" sx={{ mt: 1.25 }}>
                                  <strong>{brokerLabel}</strong> presenta il
                                  costo indicativo più basso:{" "}
                                  {comparison.costPct.toLocaleString("it-IT", {
                                    minimumFractionDigits: 3,
                                    maximumFractionDigits: 3,
                                  })}
                                  % dell’ordine simulato, con un vantaggio di{" "}
                                  {comparison.advantagePctPoints.toLocaleString(
                                    "it-IT",
                                    {
                                      minimumFractionDigits: 3,
                                      maximumFractionDigits: 3,
                                    },
                                  )}{" "}
                                  punti percentuali. Il risultato non costituisce
                                  un ordine né una scelta definitiva del broker.
                                </Alert>
                              );
                            })()}

                            <FormControl
                              size="small"
                              fullWidth
                              sx={{ mt: 1.5 }}
                            >
                              <InputLabel>Broker preferito</InputLabel>
                              <Select
                                label="Broker preferito"
                                value={review.preferredBroker ?? ""}
                                onChange={(event) =>
                                  updateReview(
                                    instrument.isin,
                                    (current) => ({
                                      ...current,
                                      preferredBroker:
                                        String(event.target.value) === ""
                                          ? null
                                          : (event.target
                                              .value as InvestmentBrokerCode),
                                    }),
                                  )
                                }
                              >
                                <MenuItem value="">Da definire</MenuItem>
                                {BROKERS.filter(
                                  (broker) =>
                                    review.brokerAvailability[broker.code] !==
                                    "NOT_AVAILABLE",
                                ).map((broker) => (
                                  <MenuItem
                                    key={broker.code}
                                    value={broker.code}
                                  >
                                    {broker.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>

                            <TextField
                              label={`Note su ${instrument.ticker}`}
                              value={review.notes ?? ""}
                              onChange={(event) =>
                                updateReview(
                                  instrument.isin,
                                  (current) => ({
                                    ...current,
                                    notes: event.target.value,
                                  }),
                                )
                              }
                              multiline
                              minRows={2}
                              fullWidth
                              slotProps={{
                                htmlInput: {
                                  maxLength: 1_000,
                                },
                              }}
                              sx={{ mt: 1.5 }}
                            />
                          </>
                        )}
                      </Box>
                    );
                  })}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      <TextField
        label="Note generali di due diligence"
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          setDirty(true);
          setSuccess(null);
        }}
        multiline
        minRows={2}
        fullWidth
        slotProps={{
          htmlInput: {
            maxLength: 2_000,
          },
        }}
        sx={{ mt: 0.5 }}
      />

      {dueDiligence.routingPreview && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
            Anteprima routing per tranche
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            Scenario {dueDiligence.routingPreview.scenario.label}
            {dueDiligence.routingPreview.scenario.fundingAccount
              ? ` · provenienza ${dueDiligence.routingPreview.scenario.fundingAccount}`
              : " · conto di provenienza da definire"}
            . Importi indicativi; nessuna quantità o ordine viene generato.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1.25,
              mt: 1.5,
            }}
          >
            {dueDiligence.routingPreview.tranches.map((tranche) => (
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
                <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                  {euro(tranche.amount)}
                </Typography>

                <Box sx={{ mt: 1 }}>
                  {tranche.orders.map((order) => (
                    <Box
                      key={`${tranche.number}-${order.assetClass}`}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 1,
                        py: 0.5,
                      }}
                    >
                      <Typography variant="body2">
                        {order.ticker ?? order.label} · {euro(order.amount)}
                      </Typography>
                      <Chip
                        size="small"
                        color={
                          order.routeStatus === "READY_FOR_REVIEW"
                            ? "success"
                            : "warning"
                        }
                        label={
                          order.routeStatus === "READY_FOR_REVIEW"
                            ? order.broker === "FINECO"
                              ? "Fineco"
                              : "IBKR"
                            : "Route bloccata"
                        }
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Alert severity="info" sx={{ mt: 2 }}>
        <strong>Esecuzione bloccata.</strong>{" "}
        {dueDiligence.execution.blockingReasons.join(" ")}
      </Alert>

      {dueDiligence.updatedAt && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1.5 }}
        >
          Ultimo salvataggio: {dateLabel(dueDiligence.updatedAt)} · Due
          diligence v{dueDiligence.dueDiligenceVersion}
        </Typography>
      )}

      {dirty && (
        <Box
          sx={{
            position: "sticky",
            bottom: 12,
            zIndex: 10,
            mt: 2,
            p: 1.25,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "warning.light",
            bgcolor: "background.paper",
            boxShadow: 6,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 850 }}>
              Modifiche alla due diligence non salvate
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Salva prima di aggiornare o chiudere la pagina.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveRoundedIcon />
              )
            }
            disabled={
              saving ||
              invalidNumericFields.size > 0 ||
              !recommendationIsCurrent ||
              dueDiligence.recommendationId !== recommendationId
            }
            onClick={saveDueDiligence}
          >
            Salva revisione
          </Button>
        </Box>
      )}
    </Box>
  );
}
