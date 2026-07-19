import {
  useEffect,
  useState,
} from "react";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

import type {
  EconomicAssumptionProfile,
  EconomicAssumptionProfileInput,
} from "../services/api";

export type EconomicProfileSourceValues = {
  liquidityReturnDeltaPct: string;
  investmentsReturnDeltaPct: string;
  realEstateReturnDeltaPct: string;
  otherAssetsReturnDeltaPct: string;

  liquidityTaxRatePct: string;
  investmentsTaxRatePct: string;

  rebalancingCostRatePct: string;
  rebalancingMinimumCost: string;
};

type EconomicProfileDraft = {
  code: string;
  name: string;
  description: string;
  fiscalResidence: string;

  liquidityReturnDeltaPct: string;
  investmentsReturnDeltaPct: string;
  realEstateReturnDeltaPct: string;
  otherAssetsReturnDeltaPct: string;

  liquidityTaxRatePct: string;
  investmentsTaxRatePct: string;

  rebalancingCostRatePct: string;
  rebalancingMinimumCost: string;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";

  profile:
    | EconomicAssumptionProfile
    | null;

  sourceValues:
    EconomicProfileSourceValues;

  saving: boolean;

  onClose: () => void;

  onSave: (
    input:
      EconomicAssumptionProfileInput,
  ) => void;
};

function normalizeCode(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseNumber(
  value: string,
): number {
  const parsed = Number(
    value
      .trim()
      .replace(",", "."),
  );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function createDraft(
  mode: "create" | "edit",
  profile:
    | EconomicAssumptionProfile
    | null,
  sourceValues:
    EconomicProfileSourceValues,
): EconomicProfileDraft {
  if (
    mode === "edit" &&
    profile
  ) {
    return {
      code: profile.code,
      name: profile.name,
      description:
        profile.description,
      fiscalResidence:
        profile.fiscalResidence,

      liquidityReturnDeltaPct:
        String(
          profile
            .liquidityReturnDeltaPct,
        ),

      investmentsReturnDeltaPct:
        String(
          profile
            .investmentsReturnDeltaPct,
        ),

      realEstateReturnDeltaPct:
        String(
          profile
            .realEstateReturnDeltaPct,
        ),

      otherAssetsReturnDeltaPct:
        String(
          profile
            .otherAssetsReturnDeltaPct,
        ),

      liquidityTaxRatePct:
        String(
          profile
            .liquidityTaxRatePct,
        ),

      investmentsTaxRatePct:
        String(
          profile
            .investmentsTaxRatePct,
        ),

      rebalancingCostRatePct:
        String(
          profile
            .rebalancingCostRatePct,
        ),

      rebalancingMinimumCost:
        String(
          profile
            .rebalancingMinimumCost,
        ),
    };
  }

  return {
    code: "",
    name: "",
    description: "",
    fiscalResidence: "Spain",

    liquidityReturnDeltaPct:
      sourceValues
        .liquidityReturnDeltaPct,

    investmentsReturnDeltaPct:
      sourceValues
        .investmentsReturnDeltaPct,

    realEstateReturnDeltaPct:
      sourceValues
        .realEstateReturnDeltaPct,

    otherAssetsReturnDeltaPct:
      sourceValues
        .otherAssetsReturnDeltaPct,

    liquidityTaxRatePct:
      sourceValues
        .liquidityTaxRatePct,

    investmentsTaxRatePct:
      sourceValues
        .investmentsTaxRatePct,

    rebalancingCostRatePct:
      sourceValues
        .rebalancingCostRatePct,

    rebalancingMinimumCost:
      sourceValues
        .rebalancingMinimumCost,
  };
}

export default function EconomicAssumptionProfileDialog({
  open,
  mode,
  profile,
  sourceValues,
  saving,
  onClose,
  onSave,
}: Props) {
  const [
    draft,
    setDraft,
  ] = useState<
    EconomicProfileDraft
  >(
    createDraft(
      mode,
      profile,
      sourceValues,
    ),
  );

  const [
    validationError,
    setValidationError,
  ] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(
      createDraft(
        mode,
        profile,
        sourceValues,
      ),
    );

    setValidationError("");
  }, [
    open,
    mode,
    profile,
    sourceValues,
  ]);

  function updateDraft(
    field:
      keyof EconomicProfileDraft,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,

      ...(field === "name" &&
      mode === "create"
        ? {
            code:
              normalizeCode(value),
          }
        : {}),
    }));
  }

  function submit() {
    const name =
      draft.name.trim();

    const code =
      normalizeCode(
        draft.code || name,
      );

    if (!name) {
      setValidationError(
        "Inserisci il nome del profilo.",
      );

      return;
    }

    if (!code) {
      setValidationError(
        "Il codice del profilo non è valido.",
      );

      return;
    }

    setValidationError("");

    onSave({
      code,
      name,

      description:
        draft.description.trim(),

      fiscalResidence:
        draft
          .fiscalResidence
          .trim() ||
        "Not specified",

      liquidityReturnDeltaPct:
        parseNumber(
          draft
            .liquidityReturnDeltaPct,
        ),

      investmentsReturnDeltaPct:
        parseNumber(
          draft
            .investmentsReturnDeltaPct,
        ),

      realEstateReturnDeltaPct:
        parseNumber(
          draft
            .realEstateReturnDeltaPct,
        ),

      otherAssetsReturnDeltaPct:
        parseNumber(
          draft
            .otherAssetsReturnDeltaPct,
        ),

      liquidityTaxRatePct:
        parseNumber(
          draft
            .liquidityTaxRatePct,
        ),

      investmentsTaxRatePct:
        parseNumber(
          draft
            .investmentsTaxRatePct,
        ),

      rebalancingCostRatePct:
        parseNumber(
          draft
            .rebalancingCostRatePct,
        ),

      rebalancingMinimumCost:
        parseNumber(
          draft
            .rebalancingMinimumCost,
        ),
    });
  }

  const numberFields = [
    {
      field:
        "liquidityReturnDeltaPct",
      label:
        "Liquidità · delta %",
      step: 0.1,
    },
    {
      field:
        "investmentsReturnDeltaPct",
      label:
        "Investimenti · delta %",
      step: 0.1,
    },
    {
      field:
        "realEstateReturnDeltaPct",
      label:
        "Immobili · delta %",
      step: 0.1,
    },
    {
      field:
        "otherAssetsReturnDeltaPct",
      label:
        "Altri attivi · delta %",
      step: 0.1,
    },
    {
      field:
        "liquidityTaxRatePct",
      label:
        "Imposta liquidità %",
      step: 0.1,
    },
    {
      field:
        "investmentsTaxRatePct",
      label:
        "Imposta investimenti %",
      step: 0.1,
    },
    {
      field:
        "rebalancingCostRatePct",
      label:
        "Costo ribilanciamento %",
      step: 0.01,
    },
    {
      field:
        "rebalancingMinimumCost",
      label:
        "Costo minimo operazione €",
      step: 1,
    },
  ] as const;

  return (
    <Dialog
      open={open}
      onClose={
        saving
          ? undefined
          : onClose
      }
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        {mode === "create"
          ? "Nuovo profilo economico"
          : "Modifica profilo economico"}
      </DialogTitle>

      <DialogContent>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
          }}
        >
          Il profilo salva rendimenti,
          aliquote fiscali e costi di
          ribilanciamento utilizzati
          nelle simulazioni.
        </Typography>

        {validationError ? (
          <Alert
            severity="error"
            sx={{
              mb: 2,
            }}
          >
            {validationError}
          </Alert>
        ) : null}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md:
                "repeat(2, minmax(0, 1fr))",
            },
            gap: 1.5,
          }}
        >
          <TextField
            label="Nome profilo"
            value={draft.name}
            required
            disabled={saving}
            onChange={(event) =>
              updateDraft(
                "name",
                event.target.value,
              )
            }
          />

          <TextField
            label="Codice"
            value={draft.code}
            disabled
            helperText="Generato automaticamente"
          />

          <TextField
            label="Residenza fiscale"
            value={
              draft.fiscalResidence
            }
            disabled={saving}
            onChange={(event) =>
              updateDraft(
                "fiscalResidence",
                event.target.value,
              )
            }
          />

          <TextField
            label="Descrizione"
            value={
              draft.description
            }
            disabled={saving}
            multiline
            minRows={2}
            onChange={(event) =>
              updateDraft(
                "description",
                event.target.value,
              )
            }
          />
        </Box>

        <Typography
          variant="subtitle2"
          sx={{
            mt: 3,
            mb: 1.5,
            fontWeight: 800,
          }}
        >
          Parametri economici
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm:
                "repeat(2, minmax(0, 1fr))",
            },
            gap: 1.5,
          }}
        >
          {numberFields.map(
            (item) => (
              <TextField
                key={item.field}
                label={item.label}
                type="number"
                value={
                  draft[item.field]
                }
                disabled={saving}
                onChange={(event) =>
                  updateDraft(
                    item.field,
                    event.target.value,
                  )
                }
                slotProps={{
                  htmlInput: {
                    step: item.step,
                  },
                }}
              />
            ),
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 2,
        }}
      >
        <Button
          onClick={onClose}
          disabled={saving}
        >
          Annulla
        </Button>

        <Button
          variant="contained"
          onClick={submit}
          disabled={saving}
        >
          {saving
            ? "Salvataggio..."
            : "Salva profilo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
