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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import KpiCard from "../components/KpiCard";
import DocumentLinksManager from "../components/DocumentLinksManager";

import {
  createDocument,
  getDocumentFileUrl,
  deleteDocumentRecord,
  getDocumentsOverview,
  removeDocumentFile,
  updateDocument,
  uploadDocumentFile,
  type CreateDocumentRequest,
  type DocumentCategory,
  type DocumentConfidentiality,
  type DocumentRecord,
  type DocumentStatus,
  type DocumentsOverviewResponse,
} from "../services/api";

type DocumentForm = {
  title: string;
  category: DocumentCategory;
  documentType: string;
  status: DocumentStatus;
  issuer: string;
  country: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  confidentiality: DocumentConfidentiality;
  fileName: string;
  filePath: string;
  notes: string;
};

function createEmptyForm(): DocumentForm {
  return {
    title: "",
    category: "OTHER",
    documentType: "",
    status: "ACTIVE",
    issuer: "",
    country: "",
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
    confidentiality: "PRIVATE",
    fileName: "",
    filePath: "",
    notes: "",
  };
}


function createFormFromDocument(
  document: DocumentRecord,
): DocumentForm {
  return {
    title: document.title,
    category: document.category,
    documentType:
      document.documentType,
    status: document.status,
    issuer: document.issuer ?? "",
    country: document.country ?? "",
    documentNumber:
      document.documentNumber ?? "",
    issueDate:
      document.issueDate?.slice(
        0,
        10,
      ) ?? "",
    expiryDate:
      document.expiryDate?.slice(
        0,
        10,
      ) ?? "",
    confidentiality:
      document.confidentiality,
    fileName:
      document.fileName ?? "",
    filePath:
      document.filePath ?? "",
    notes: document.notes ?? "",
  };
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "BANKING",
  "INVESTMENT",
  "PROPERTY",
  "TAX",
  "INSURANCE",
  "SUCCESSION",
  "IDENTITY",
  "CORPORATE",
  "CONTRACT",
  "PLATFORM",
  "OTHER",
];

function categoryLabel(
  category: DocumentCategory,
): string {
  const labels: Record<DocumentCategory, string> = {
    BANKING: "Banca",
    INVESTMENT: "Investimenti",
    PROPERTY: "Immobili",
    TAX: "Fiscalità",
    INSURANCE: "Assicurazioni",
    SUCCESSION: "Successione",
    IDENTITY: "Identità",
    CORPORATE: "Societario",
    CONTRACT: "Contratti",
    PLATFORM: "Piattaforma",
    OTHER: "Altro",
  };

  return labels[category];
}

function statusLabel(
  status: DocumentStatus,
): string {
  if (status === "ACTIVE") {
    return "Attivo";
  }

  if (status === "DRAFT") {
    return "Bozza";
  }

  if (status === "EXPIRED") {
    return "Scaduto";
  }

  return "Archiviato";
}

function statusColor(
  status: DocumentStatus,
):
  | "success"
  | "warning"
  | "error"
  | "default" {
  if (status === "ACTIVE") {
    return "success";
  }

  if (status === "DRAFT") {
    return "warning";
  }

  if (status === "EXPIRED") {
    return "error";
  }

  return "default";
}

function confidentialityLabel(
  value: DocumentConfidentiality,
): string {
  if (value === "FAMILY") {
    return "Famiglia";
  }

  if (value === "RESTRICTED") {
    return "Riservato";
  }

  return "Privato";
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString(
    "it-IT",
  );
}

function isExpired(
  document: DocumentRecord,
): boolean {
  if (
    !document.expiryDate ||
    document.status === "ARCHIVED"
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(
    document.expiryDate,
  );
  expiry.setHours(0, 0, 0, 0);

  return expiry.getTime() <
    today.getTime();
}

function expiresWithinNinetyDays(
  document: DocumentRecord,
): boolean {
  if (
    !document.expiryDate ||
    isExpired(document) ||
    document.status === "ARCHIVED"
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);
  limit.setDate(
    limit.getDate() + 90,
  );

  const expiry = new Date(
    document.expiryDate,
  );

  return (
    expiry.getTime() >=
      today.getTime() &&
    expiry.getTime() <=
      limit.getTime()
  );
}

export default function Documents() {
  const [data, setData] =
    useState<DocumentsOverviewResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    uploadingDocumentId,
    setUploadingDocumentId,
  ] = useState<string | null>(null);

  const [
    deletingDocumentId,
    setDeletingDocumentId,
  ] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [
    editingDocument,
    setEditingDocument,
  ] = useState<DocumentRecord | null>(
    null,
  );

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [categoryFilter, setCategoryFilter] =
    useState<string>("ALL");

  const [statusFilter, setStatusFilter] =
    useState<string>("ALL");

  const [form, setForm] =
    useState<DocumentForm>(
      createEmptyForm,
    );

  async function loadDocuments() {
    setLoading(true);
    setError("");

    try {
      const result =
        await getDocumentsOverview();

      setData(result);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile caricare il Document Center.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.documents.filter(
      (document) =>
        (
          categoryFilter === "ALL" ||
          document.category ===
            categoryFilter
        ) &&
        (
          statusFilter === "ALL" ||
          document.status ===
            statusFilter
        ),
    );
  }, [
    data,
    categoryFilter,
    statusFilter,
  ]);

  function updateForm<
    K extends keyof DocumentForm,
  >(
    field: K,
    value: DocumentForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }


  function openCreateDialog() {
    setEditingDocument(null);
    setForm(createEmptyForm());
    setError("");
    setSuccess("");
    setDialogOpen(true);
  }

  function openEditDialog(
    document: DocumentRecord,
  ) {
    setEditingDocument(document);
    setForm(
      createFormFromDocument(
        document,
      ),
    );
    setError("");
    setSuccess("");
    setDialogOpen(true);
  }

  function closeDocumentDialog() {
    if (saving) {
      return;
    }

    setDialogOpen(false);
    setEditingDocument(null);
    setForm(createEmptyForm());
  }

  async function submitDocument() {
    if (
      !form.title.trim() ||
      !form.documentType.trim()
    ) {
      setError(
        "Titolo e tipo documento sono obbligatori.",
      );

      return;
    }

    const input:
      CreateDocumentRequest = {
        title: form.title.trim(),
        category: form.category,
        documentType:
          form.documentType.trim(),
        status: form.status,
        issuer:
          form.issuer.trim() || null,
        country:
          form.country.trim() || null,
        documentNumber:
          form.documentNumber.trim() ||
          null,
        issueDate:
          form.issueDate || null,
        expiryDate:
          form.expiryDate || null,
        confidentiality:
          form.confidentiality,
        fileName:
          form.fileName.trim() || null,
        filePath:
          form.filePath.trim() || null,
        notes:
          form.notes.trim() || null,
      };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingDocument) {
        await updateDocument(
          editingDocument.id,
          input,
        );
      } else {
        await createDocument(input);
      }

      setDialogOpen(false);
      setEditingDocument(null);
      setForm(createEmptyForm());

      setSuccess(
        editingDocument
          ? "Documento aggiornato."
          : "Documento registrato nel Document Center.",
      );

      await loadDocuments();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile registrare il documento.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(
    document: DocumentRecord,
    file: File,
  ) {
    setUploadingDocumentId(
      document.id,
    );

    setError("");
    setSuccess("");

    try {
      await uploadDocumentFile(
        document.id,
        file,
      );

      setSuccess(
        document.fileName
          ? "File del documento sostituito."
          : "File caricato nel Document Center.",
      );

      await loadDocuments();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile caricare il file.",
      );
    } finally {
      setUploadingDocumentId(null);
    }
  }

  async function removeAttachedFile(
    document: DocumentRecord,
  ) {
    const confirmed = window.confirm(
      `Rimuovere definitivamente il file associato a “${document.title}”? Il record documentale resterà disponibile.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingDocumentId(document.id);
    setError("");
    setSuccess("");

    try {
      await removeDocumentFile(
        document.id,
      );

      setSuccess(
        "Allegato rimosso definitivamente.",
      );

      await loadDocuments();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile rimuovere l’allegato.",
      );
    } finally {
      setDeletingDocumentId(null);
    }
  }

  async function deleteDocumentPermanently(
    document: DocumentRecord,
  ) {
    const confirmed = window.confirm(
      `Eliminare definitivamente “${document.title}”? Verranno cancellati il record, i collegamenti e l’eventuale file fisico. L’operazione non può essere annullata.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingDocumentId(document.id);
    setError("");
    setSuccess("");

    try {
      const result =
        await deleteDocumentRecord(
          document.id,
        );

      setSuccess(
        result.warning
          ? result.warning
          : "Documento eliminato definitivamente.",
      );

      await loadDocuments();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile eliminare il documento.",
      );
    } finally {
      setDeletingDocumentId(null);
    }
  }

  async function archiveDocument(
    document: DocumentRecord,
  ) {
    setError("");
    setSuccess("");

    try {
      await updateDocument(
        document.id,
        {
          status: "ARCHIVED",
        },
      );

      setSuccess(
        "Documento archiviato.",
      );

      await loadDocuments();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile archiviare il documento.",
      );
    }
  }

  async function reactivateDocument(
    document: DocumentRecord,
  ) {
    setError("");
    setSuccess("");

    try {
      await updateDocument(
        document.id,
        {
          status: "ACTIVE",
        },
      );

      setSuccess(
        "Documento riattivato.",
      );

      await loadDocuments();
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Impossibile riattivare il documento.",
      );
    }
  }

  if (loading && !data) {
    return (
      <Box
        sx={{
          minHeight: 420,
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
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
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4">
            Document Center
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Archivio documentale, scadenze,
            riservatezza e collegamenti
            patrimoniali.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1.2,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="outlined"
            startIcon={
              <RefreshRoundedIcon />
            }
            onClick={() =>
              void loadDocuments()
            }
            disabled={loading}
          >
            Aggiorna
          </Button>

          <Button
            variant="contained"
            startIcon={
              <AddRoundedIcon />
            }
            onClick={openCreateDialog}
          >
            Nuovo documento
          </Button>
        </Box>
      </Box>

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
        >
          {success}
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {data && (
        <>
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
              gap: 2.2,
              mb: 3,
            }}
          >
            <KpiCard
              title="Documenti"
              value={String(
                data.summary.total,
              )}
              subtitle="Record registrati"
              icon={
                <FolderRoundedIcon />
              }
              tone="primary"
            />

            <KpiCard
              title="Attivi"
              value={String(
                data.summary.active,
              )}
              subtitle="Documenti correnti"
              icon={
                <CheckCircleRoundedIcon />
              }
              tone="success"
            />

            <KpiCard
              title="In scadenza"
              value={String(
                data.summary
                  .expiringWithinNinetyDays,
              )}
              subtitle="Entro 90 giorni"
              icon={
                <WarningAmberRoundedIcon />
              }
              tone="warning"
            />

            <KpiCard
              title="Senza file"
              value={String(
                data.summary.missingFile,
              )}
              subtitle="Metadati senza allegato"
              icon={
                <DescriptionRoundedIcon />
              }
              tone={
                data.summary.missingFile > 0
                  ? "warning"
                  : "success"
              }
            />
          </Box>

          <Alert
            severity={
              data.summary.expired > 0
                ? "error"
                : data.summary
                      .expiringWithinNinetyDays >
                    0
                ? "warning"
                : "success"
            }
            sx={{ mb: 3 }}
          >
            {data.summary.expired > 0
              ? `${data.summary.expired} documenti risultano scaduti.`
              : data.summary
                    .expiringWithinNinetyDays >
                  0
              ? `${data.summary.expiringWithinNinetyDays} documenti scadono entro 90 giorni.`
              : "Non risultano documenti scaduti o in scadenza entro 90 giorni."}
          </Alert>

          <Paper
            elevation={0}
            sx={{
              p: 2.2,
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
                gap: 2,
              }}
            >
              <TextField
                select
                label="Categoria"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value,
                  )
                }
                size="small"
              >
                <MenuItem value="ALL">
                  Tutte le categorie
                </MenuItem>

                {DOCUMENT_CATEGORIES.map(
                  (category) => (
                    <MenuItem
                      key={category}
                      value={category}
                    >
                      {categoryLabel(
                        category,
                      )}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                select
                label="Stato"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value,
                  )
                }
                size="small"
              >
                <MenuItem value="ALL">
                  Tutti gli stati
                </MenuItem>
                <MenuItem value="ACTIVE">
                  Attivo
                </MenuItem>
                <MenuItem value="DRAFT">
                  Bozza
                </MenuItem>
                <MenuItem value="EXPIRED">
                  Scaduto
                </MenuItem>
                <MenuItem value="ARCHIVED">
                  Archiviato
                </MenuItem>
              </TextField>
            </Box>
          </Paper>

          {filteredDocuments.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: "center",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <FolderRoundedIcon
                sx={{
                  fontSize: 44,
                  color: "text.disabled",
                  mb: 1,
                }}
              />

              <Typography
                variant="h6"
                sx={{ mb: 0.7 }}
              >
                Nessun documento registrato
              </Typography>

              <Typography
                color="text.secondary"
              >
                Utilizza “Nuovo documento” per
                creare il primo record
                documentale.
              </Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  xl:
                    "repeat(2, minmax(0, 1fr))",
                },
                gap: 2.2,
              }}
            >
              {filteredDocuments.map(
                (document) => (
                  <Paper
                    key={document.id}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      border: "1px solid",
                      borderColor:
                        isExpired(document)
                          ? "error.main"
                          : expiresWithinNinetyDays(
                                document,
                              )
                            ? "warning.main"
                            : "divider",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        flexWrap: "wrap",
                        gap: 1.5,
                        mb: 1.4,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                          }}
                        >
                          {document.title}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.3 }}
                        >
                          {document.documentType}
                        </Typography>
                      </Box>

                      <Chip
                        size="small"
                        label={statusLabel(
                          document.status,
                        )}
                        color={statusColor(
                          document.status,
                        )}
                      />
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.8,
                        mb: 1.5,
                      }}
                    >
                      <Chip
                        size="small"
                        label={categoryLabel(
                          document.category,
                        )}
                        variant="outlined"
                      />

                      <Chip
                        size="small"
                        label={confidentialityLabel(
                          document.confidentiality,
                        )}
                        variant="outlined"
                      />

                      <Chip
                        size="small"
                        icon={<LinkRoundedIcon />}
                        label={`${document.links.length} collegamenti`}
                        variant="outlined"
                      />

                      {!document.fileName && (
                        <Chip
                          size="small"
                          label="File mancante"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm:
                            "repeat(2, minmax(0, 1fr))",
                        },
                        gap: 1,
                        mb: 1.5,
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Emittente:{" "}
                        <strong>
                          {document.issuer ??
                            "—"}
                        </strong>
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Paese:{" "}
                        <strong>
                          {document.country ??
                            "—"}
                        </strong>
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Emissione:{" "}
                        <strong>
                          {formatDate(
                            document.issueDate,
                          )}
                        </strong>
                      </Typography>

                      <Typography
                        variant="body2"
                        color={
                          isExpired(document)
                            ? "error.main"
                            : expiresWithinNinetyDays(
                                  document,
                                )
                              ? "warning.main"
                              : "text.secondary"
                        }
                      >
                        Scadenza:{" "}
                        <strong>
                          {formatDate(
                            document.expiryDate,
                          )}
                        </strong>
                      </Typography>
                    </Box>

                    {document.notes && (
                      <Typography
                        variant="body2"
                        sx={{
                          mb: 1.5,
                          fontStyle: "italic",
                        }}
                      >
                        {document.notes}
                      </Typography>
                    )}

                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                          <EditRoundedIcon />
                        }
                        onClick={() =>
                          openEditDialog(
                            document,
                          )
                        }
                      >
                        Modifica
                      </Button>

                      <Button
                        component="label"
                        size="small"
                        variant={
                          document.fileName
                            ? "outlined"
                            : "contained"
                        }
                        startIcon={
                          uploadingDocumentId ===
                          document.id ? (
                            <CircularProgress
                              size={16}
                              color="inherit"
                            />
                          ) : (
                            <UploadFileRoundedIcon />
                          )
                        }
                        disabled={
                          uploadingDocumentId ===
                          document.id
                        }
                      >
                        {uploadingDocumentId ===
                        document.id
                          ? "Caricamento..."
                          : document.fileName
                            ? "Sostituisci file"
                            : "Carica file"}

                        <input
                          hidden
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                          onChange={(event) => {
                            const file =
                              event.target.files?.[0];

                            event.target.value = "";

                            if (file) {
                              void uploadFile(
                                document,
                                file,
                              );
                            }
                          }}
                        />
                      </Button>

                      {document.fileName && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={
                            <OpenInNewRoundedIcon />
                          }
                          onClick={() => {
                            window.open(
                              getDocumentFileUrl(
                                document.id,
                              ),
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                        >
                          Apri file
                        </Button>
                      )}

                      {document.fileName && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          startIcon={
                            <RemoveCircleOutlineRoundedIcon />
                          }
                          disabled={
                            deletingDocumentId ===
                            document.id
                          }
                          onClick={() =>
                            void removeAttachedFile(
                              document,
                            )
                          }
                        >
                          Rimuovi file
                        </Button>
                      )}

                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={
                          deletingDocumentId ===
                          document.id ? (
                            <CircularProgress
                              size={16}
                              color="inherit"
                            />
                          ) : (
                            <DeleteForeverRoundedIcon />
                          )
                        }
                        disabled={
                          deletingDocumentId ===
                          document.id
                        }
                        onClick={() =>
                          void deleteDocumentPermanently(
                            document,
                          )
                        }
                      >
                        {deletingDocumentId ===
                        document.id
                          ? "Eliminazione..."
                          : "Elimina"}
                      </Button>

                      {document.status !==
                      "ARCHIVED" ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={
                            <ArchiveRoundedIcon />
                          }
                          onClick={() =>
                            void archiveDocument(
                              document,
                            )
                          }
                        >
                          Archivia
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            void reactivateDocument(
                              document,
                            )
                          }
                        >
                          Riattiva
                        </Button>
                      )}
                    </Box>
                  </Paper>
                ),
              )}
            </Box>
          )}
        </>
      )}

      <Dialog
        open={dialogOpen}
        onClose={closeDocumentDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {editingDocument
            ? "Modifica documento"
            : "Nuovo documento"}
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm:
                  "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
              pt: 1,
            }}
          >
            <TextField
              label="Titolo"
              value={form.title}
              onChange={(event) =>
                updateForm(
                  "title",
                  event.target.value,
                )
              }
              required
              sx={{
                gridColumn: {
                  sm: "1 / -1",
                },
              }}
            />

            <TextField
              select
              label="Categoria"
              value={form.category}
              onChange={(event) =>
                updateForm(
                  "category",
                  event.target
                    .value as DocumentCategory,
                )
              }
            >
              {DOCUMENT_CATEGORIES.map(
                (category) => (
                  <MenuItem
                    key={category}
                    value={category}
                  >
                    {categoryLabel(
                      category,
                    )}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              label="Tipo documento"
              value={form.documentType}
              onChange={(event) =>
                updateForm(
                  "documentType",
                  event.target.value,
                )
              }
              placeholder="Contratto, estratto conto, polizza..."
              required
            />

            <TextField
              select
              label="Stato"
              value={form.status}
              onChange={(event) =>
                updateForm(
                  "status",
                  event.target
                    .value as DocumentStatus,
                )
              }
            >
              <MenuItem value="ACTIVE">
                Attivo
              </MenuItem>
              <MenuItem value="DRAFT">
                Bozza
              </MenuItem>
              <MenuItem value="EXPIRED">
                Scaduto
              </MenuItem>
              <MenuItem value="ARCHIVED">
                Archiviato
              </MenuItem>
            </TextField>

            <TextField
              select
              label="Riservatezza"
              value={form.confidentiality}
              onChange={(event) =>
                updateForm(
                  "confidentiality",
                  event.target
                    .value as DocumentConfidentiality,
                )
              }
            >
              <MenuItem value="FAMILY">
                Famiglia
              </MenuItem>
              <MenuItem value="PRIVATE">
                Privato
              </MenuItem>
              <MenuItem value="RESTRICTED">
                Riservato
              </MenuItem>
            </TextField>

            <TextField
              label="Emittente"
              value={form.issuer}
              onChange={(event) =>
                updateForm(
                  "issuer",
                  event.target.value,
                )
              }
            />

            <TextField
              label="Paese"
              value={form.country}
              onChange={(event) =>
                updateForm(
                  "country",
                  event.target.value,
                )
              }
            />

            <TextField
              label="Numero documento"
              value={form.documentNumber}
              onChange={(event) =>
                updateForm(
                  "documentNumber",
                  event.target.value,
                )
              }
            />

            <TextField
              label="Data emissione"
              type="date"
              value={form.issueDate}
              onChange={(event) =>
                updateForm(
                  "issueDate",
                  event.target.value,
                )
              }
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              label="Data scadenza"
              type="date"
              value={form.expiryDate}
              onChange={(event) =>
                updateForm(
                  "expiryDate",
                  event.target.value,
                )
              }
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <Alert
              severity="info"
              sx={{
                gridColumn: {
                  sm: "1 / -1",
                },
              }}
            >
              Il file e il percorso di
              archiviazione sono gestiti
              automaticamente tramite il
              pulsante “Carica file”.
            </Alert>

            <TextField
              label="Note"
              value={form.notes}
              onChange={(event) =>
                updateForm(
                  "notes",
                  event.target.value,
                )
              }
              multiline
              minRows={3}
              sx={{
                gridColumn: {
                  sm: "1 / -1",
                },
              }}
            />
          </Box>

          {editingDocument && (
            <DocumentLinksManager
              document={editingDocument}
              onChanged={loadDocuments}
            />
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={closeDocumentDialog}
            disabled={saving}
          >
            Annulla
          </Button>

          <Button
            variant="contained"
            onClick={() =>
              void submitDocument()
            }
            disabled={saving}
          >
            {saving
              ? "Salvataggio..."
              : editingDocument
                ? "Salva modifiche"
                : "Registra documento"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
