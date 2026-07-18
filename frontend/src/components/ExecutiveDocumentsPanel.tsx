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
  Paper,
  Typography,
} from "@mui/material";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";

import {
  Link,
} from "react-router-dom";

import {
  getDocumentsOverview,
  type DocumentRecord,
  type DocumentsOverviewResponse,
} from "../services/api";

function formatDate(
  value: string,
): string {
  return new Date(value).toLocaleDateString(
    "it-IT",
  );
}

export default function ExecutiveDocumentsPanel() {
  const [data, setData] =
    useState<DocumentsOverviewResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    getDocumentsOverview()
      .then((result) => {
        if (!active) {
          return;
        }

        setData(result);
        setError("");
      })
      .catch((requestError) => {
        console.error(requestError);

        if (active) {
          setError(
            "Impossibile caricare lo stato documentale.",
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

  const upcomingDocuments =
    useMemo(() => {
      if (!data) {
        return [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return data.documents
        .filter(
          (document) =>
            document.expiryDate !==
              null &&
            document.status !==
              "ARCHIVED" &&
            new Date(
              document.expiryDate,
            ).getTime() >=
              today.getTime(),
        )
        .sort(
          (
            left: DocumentRecord,
            right: DocumentRecord,
          ) =>
            new Date(
              left.expiryDate ?? "",
            ).getTime() -
            new Date(
              right.expiryDate ?? "",
            ).getTime(),
        )
        .slice(0, 3);
    }, [data]);

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2.2,
        p: 3,
        border: "1px solid",
        borderColor: "divider",
        boxShadow:
          "0 12px 32px rgba(26, 45, 75, 0.06)",
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
        <FolderRoundedIcon
          color="primary"
        />

        <Typography variant="h6">
          Document Center
        </Typography>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Stato dell’archivio, file mancanti e
        prossime scadenze documentali.
      </Typography>

      {loading && (
        <Box
          sx={{
            minHeight: 150,
            display: "grid",
            placeItems: "center",
          }}
        >
          <CircularProgress size={30} />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {!loading &&
        data &&
        !error && (
          <>
            <Alert
              severity={
                data.summary.expired > 0
                  ? "error"
                  : data.summary
                        .expiringWithinNinetyDays >
                      0 ||
                    data.summary.missingFile >
                      0
                  ? "warning"
                  : "success"
              }
              sx={{ mb: 2.5 }}
            >
              {data.summary.expired > 0
                ? `${data.summary.expired} documenti risultano scaduti.`
                : data.summary
                      .expiringWithinNinetyDays >
                    0
                ? `${data.summary.expiringWithinNinetyDays} documenti scadono entro 90 giorni.`
                : data.summary.missingFile > 0
                ? `${data.summary.missingFile} record non hanno ancora un file associato.`
                : "Archivio documentale senza scadenze o anomalie aperte."}
            </Alert>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                mb: 2.5,
              }}
            >
              <Chip
                label={
                  `Totali: ${data.summary.total}`
                }
                variant="outlined"
              />

              <Chip
                label={
                  `Attivi: ${data.summary.active}`
                }
                color="success"
                variant="outlined"
              />

              <Chip
                label={
                  `In scadenza: ${data.summary.expiringWithinNinetyDays}`
                }
                color={
                  data.summary
                    .expiringWithinNinetyDays >
                  0
                    ? "warning"
                    : "default"
                }
                variant="outlined"
              />

              <Chip
                label={
                  `File mancanti: ${data.summary.missingFile}`
                }
                color={
                  data.summary.missingFile >
                  0
                    ? "warning"
                    : "default"
                }
                variant="outlined"
              />

              <Chip
                label={
                  `Collegati: ${data.summary.linked}`
                }
                variant="outlined"
              />
            </Box>

            {upcomingDocuments.length >
            0 ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    lg:
                      "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 2,
                  mb: 2.5,
                }}
              >
                {upcomingDocuments.map(
                  (document) => (
                    <Paper
                      key={document.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        border: "1px solid",
                        borderColor:
                          "divider",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Scadenza{" "}
                        {formatDate(
                          document.expiryDate ??
                            "",
                        )}
                      </Typography>

                      <Typography
                        variant="subtitle2"
                        sx={{
                          mt: 0.5,
                          fontWeight: 800,
                        }}
                      >
                        {document.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.8 }}
                      >
                        {document.documentType}
                      </Typography>
                    </Paper>
                  ),
                )}
              </Box>
            ) : (
              data.summary.total === 0 && (
                <Alert
                  severity="info"
                  sx={{ mb: 2.5 }}
                >
                  Il Document Center non contiene
                  ancora documenti.
                </Alert>
              )
            )}

            <Button
              component={Link}
              to="/documents"
              variant="outlined"
              endIcon={
                <ArrowForwardRoundedIcon />
              }
            >
              Apri Document Center
            </Button>
          </>
        )}
    </Paper>
  );
}
