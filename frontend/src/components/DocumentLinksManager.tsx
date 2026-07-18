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
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import AddLinkRoundedIcon from "@mui/icons-material/AddLinkRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";

import {
  createDocumentLink,
  deleteDocumentLink,
  getDecisionsOverview,
  getDocumentsOverview,
  getLiquidityOverview,
  getOperationalCalendar,
  getPropertiesOverview,
  getWealthRegistry,
  type DecisionEntry,
  type DocumentLink,
  type DocumentLinkEntityType,
  type DocumentLinkRelationType,
  type DocumentRecord,
  type LiquidityAccount,
  type OperationalTask,
  type PropertyRecord,
  type WealthPosition,
} from "../services/api";

type Props = {
  document: DocumentRecord;
  onChanged: () => void | Promise<void>;
};

type LinkCatalog = {
  tasks: OperationalTask[];
  decisions: DecisionEntry[];
  properties: PropertyRecord[];
  accounts: LiquidityAccount[];
  positions: WealthPosition[];
};

type LinkOption = {
  id: string;
  label: string;
};

const ENTITY_TYPES: DocumentLinkEntityType[] = [
  "HOUSEHOLD",
  "OPERATIONAL_TASK",
  "DECISION",
  "PROPERTY",
  "ACCOUNT",
  "POSITION",
];

function entityTypeLabel(
  value: string,
): string {
  const labels: Record<string, string> = {
    HOUSEHOLD: "Family Office",
    OPERATIONAL_TASK: "Calendario Operativo",
    DECISION: "Decisione",
    PROPERTY: "Immobile",
    ACCOUNT: "Conto",
    POSITION: "Posizione patrimoniale",
  };

  return labels[value] ?? value;
}

function relationTypeLabel(
  value: string,
): string {
  if (value === "PRIMARY") {
    return "Principale";
  }

  if (value === "REFERENCE") {
    return "Riferimento";
  }

  return "A supporto";
}

function formatBytes(
  value: number | null,
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  if (value < 1024) {
    return `${value} byte`;
  }

  if (value < 1024 * 1024) {
    return `${(
      value / 1024
    ).toLocaleString("it-IT", {
      maximumFractionDigits: 1,
    })} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toLocaleString("it-IT", {
    maximumFractionDigits: 2,
  })} MB`;
}

export default function DocumentLinksManager({
  document,
  onChanged,
}: Props) {
  const [
    currentDocument,
    setCurrentDocument,
  ] = useState(document);

  const [catalog, setCatalog] =
    useState<LinkCatalog | null>(null);

  const [entityType, setEntityType] =
    useState<DocumentLinkEntityType>(
      "OPERATIONAL_TASK",
    );

  const [entityId, setEntityId] =
    useState("");

  const [relationType, setRelationType] =
    useState<DocumentLinkRelationType>(
      "SUPPORTING",
    );

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [removingLinkId, setRemovingLinkId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    setCurrentDocument(document);
  }, [document]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    Promise.all([
      getOperationalCalendar(),
      getDecisionsOverview(),
      getPropertiesOverview(),
      getLiquidityOverview(),
      getWealthRegistry(),
    ])
      .then(
        ([
          calendar,
          decisions,
          properties,
          liquidity,
          wealth,
        ]) => {
          if (!active) {
            return;
          }

          setCatalog({
            tasks: calendar.tasks,
            decisions:
              decisions.decisions,
            properties:
              properties.properties,
            accounts:
              liquidity.accounts,
            positions:
              wealth.positions,
          });
        },
      )
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile caricare le entità collegabili.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const optionsByType = useMemo<
    Record<
      DocumentLinkEntityType,
      LinkOption[]
    >
  >(() => {
    return {
      HOUSEHOLD: [
        {
          id: String(
            currentDocument.householdId,
          ),
          label:
            "Family Office – Stefano Gresleri",
        },
      ],

      OPERATIONAL_TASK:
        catalog?.tasks.map((task) => ({
          id: task.id,
          label: `${new Date(
            task.dueDate,
          ).toLocaleDateString(
            "it-IT",
          )} · ${task.title}`,
        })) ?? [],

      DECISION:
        catalog?.decisions.map(
          (decision) => ({
            id: decision.id,
            label: decision.title,
          }),
        ) ?? [],

      PROPERTY:
        catalog?.properties.map(
          (property) => ({
            id: String(property.id),
            label: property.name,
          }),
        ) ?? [],

      ACCOUNT:
        catalog?.accounts.map(
          (account) => ({
            id: String(account.id),
            label:
              `${account.name} · ${account.institution}`,
          }),
        ) ?? [],

      POSITION:
        catalog?.positions.map(
          (position) => ({
            id: String(position.id),
            label:
              `${position.name} · ${position.code}`,
          }),
        ) ?? [],
    };
  }, [catalog, currentDocument.householdId]);

  const availableOptions =
    optionsByType[entityType];

  useEffect(() => {
    setEntityId(
      availableOptions[0]?.id ?? "",
    );
  }, [
    entityType,
    availableOptions,
  ]);

  async function refreshDocument() {
    const overview =
      await getDocumentsOverview();

    const updated =
      overview.documents.find(
        (item) =>
          item.id === currentDocument.id,
      );

    if (updated) {
      setCurrentDocument(updated);
    }

    await onChanged();
  }

  async function addLink() {
    if (!entityId) {
      setError(
        "Selezionare l’entità da collegare.",
      );

      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await createDocumentLink(
        currentDocument.id,
        {
          entityType,
          entityId,
          relationType,
          notes:
            notes.trim() || null,
        },
      );

      setNotes("");
      setSuccess(
        "Collegamento documentale registrato.",
      );

      await refreshDocument();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile registrare il collegamento.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeLink(
    link: DocumentLink,
  ) {
    const confirmed = window.confirm(
      "Rimuovere questo collegamento documentale?",
    );

    if (!confirmed) {
      return;
    }

    setRemovingLinkId(link.id);
    setError("");
    setSuccess("");

    try {
      await deleteDocumentLink(
        currentDocument.id,
        link.id,
      );

      setSuccess(
        "Collegamento rimosso.",
      );

      await refreshDocument();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile rimuovere il collegamento.",
      );
    } finally {
      setRemovingLinkId(null);
    }
  }

  function linkEntityLabel(
    link: DocumentLink,
  ): string {
    const options =
      optionsByType[
        link.entityType as
          DocumentLinkEntityType
      ] ?? [];

    return (
      options.find(
        (option) =>
          option.id === link.entityId,
      )?.label ??
      link.entityId
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant="subtitle1"
        sx={{
          mb: 1.5,
          fontWeight: 800,
        }}
      >
        Dettaglio tecnico
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm:
                "repeat(2, minmax(0, 1fr))",
            },
            gap: 1.2,
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Nome file:{" "}
            <strong>
              {currentDocument.fileName ??
                "Nessun file"}
            </strong>
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Dimensione:{" "}
            <strong>
              {formatBytes(
                currentDocument.fileSize,
              )}
            </strong>
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Tipo MIME:{" "}
            <strong>
              {currentDocument.mimeType ??
                "—"}
            </strong>
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Origine:{" "}
            <strong>
              {currentDocument.source}
            </strong>
          </Typography>
        </Box>

        {currentDocument.checksum && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mt: 1.5,
              overflowWrap: "anywhere",
            }}
          >
            SHA-256:{" "}
            {currentDocument.checksum}
          </Typography>
        )}
      </Paper>

      <Typography
        variant="subtitle1"
        sx={{
          mb: 1.5,
          fontWeight: 800,
        }}
      >
        Collegamenti patrimoniali
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
        >
          {success}
        </Alert>
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
      ) : (
        <>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm:
                    "repeat(2, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              <TextField
                select
                label="Tipo entità"
                value={entityType}
                onChange={(event) =>
                  setEntityType(
                    event.target
                      .value as
                      DocumentLinkEntityType,
                  )
                }
              >
                {ENTITY_TYPES.map(
                  (type) => (
                    <MenuItem
                      key={type}
                      value={type}
                    >
                      {entityTypeLabel(type)}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                select
                label="Entità"
                value={entityId}
                onChange={(event) =>
                  setEntityId(
                    event.target.value,
                  )
                }
                disabled={
                  availableOptions.length === 0
                }
              >
                {availableOptions.map(
                  (option) => (
                    <MenuItem
                      key={option.id}
                      value={option.id}
                    >
                      {option.label}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                select
                label="Tipo relazione"
                value={relationType}
                onChange={(event) =>
                  setRelationType(
                    event.target
                      .value as
                      DocumentLinkRelationType,
                  )
                }
              >
                <MenuItem value="PRIMARY">
                  Principale
                </MenuItem>

                <MenuItem value="SUPPORTING">
                  A supporto
                </MenuItem>

                <MenuItem value="REFERENCE">
                  Riferimento
                </MenuItem>
              </TextField>

              <TextField
                label="Note collegamento"
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value,
                  )
                }
              />
            </Box>

            <Button
              variant="contained"
              startIcon={
                saving ? (
                  <CircularProgress
                    size={16}
                    color="inherit"
                  />
                ) : (
                  <AddLinkRoundedIcon />
                )
              }
              onClick={() =>
                void addLink()
              }
              disabled={
                saving || !entityId
              }
              sx={{ mt: 2 }}
            >
              {saving
                ? "Collegamento..."
                : "Aggiungi collegamento"}
            </Button>
          </Paper>

          {currentDocument.links.length ===
          0 ? (
            <Alert severity="info">
              Il documento non ha ancora
              collegamenti patrimoniali.
            </Alert>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 1.2,
              }}
            >
              {currentDocument.links.map(
                (link) => (
                  <Paper
                    key={link.id}
                    elevation={0}
                    sx={{
                      p: 1.7,
                      border: "1px solid",
                      borderColor:
                        "divider",
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                        }}
                      >
                        {linkEntityLabel(link)}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.8,
                          mt: 0.8,
                        }}
                      >
                        <Chip
                          size="small"
                          label={entityTypeLabel(
                            link.entityType,
                          )}
                          variant="outlined"
                        />

                        <Chip
                          size="small"
                          label={relationTypeLabel(
                            link.relationType,
                          )}
                          variant="outlined"
                        />
                      </Box>

                      {link.notes && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.8 }}
                        >
                          {link.notes}
                        </Typography>
                      )}
                    </Box>

                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      startIcon={
                        removingLinkId ===
                        link.id ? (
                          <CircularProgress
                            size={15}
                            color="inherit"
                          />
                        ) : (
                          <LinkOffRoundedIcon />
                        )
                      }
                      disabled={
                        removingLinkId ===
                        link.id
                      }
                      onClick={() =>
                        void removeLink(link)
                      }
                    >
                      Rimuovi
                    </Button>
                  </Paper>
                ),
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
