import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import {
  Box,
  Typography,
} from "@mui/material";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";

type RouteErrorBoundaryProps = {
  children: ReactNode;
  fullPage?: boolean;
};

type RouteErrorBoundaryState = {
  hasError: boolean;
};

export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      "Impossibile caricare la sezione richiesta.",
      error,
      errorInfo,
    );
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Box
        role="alert"
        sx={{
          minHeight: this.props.fullPage ? "100vh" : 420,
          display: "grid",
          placeItems: "center",
          px: 3,
          py: 6,
        }}
      >
        <Box
          sx={{
            maxWidth: 520,
            textAlign: "center",
          }}
        >
          <ErrorOutlineRoundedIcon
            color="warning"
            sx={{ mb: 1.5, fontSize: 48 }}
          />

          <Typography variant="h5" sx={{ mb: 1, fontWeight: 750 }}>
            Sezione temporaneamente non disponibile
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Il contenuto non è stato caricato correttamente. Può dipendere
            dalla connessione o da un aggiornamento appena pubblicato.
          </Typography>

          <Box
            component="button"
            type="button"
            onClick={() => window.location.reload()}
            sx={{
              px: 2.5,
              py: 1.25,
              border: 0,
              borderRadius: 2,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              font: "inherit",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(20, 73, 154, 0.24)",

              "&:hover": {
                bgcolor: "primary.dark",
              },

              "&:focus-visible": {
                outline: "3px solid",
                outlineColor: "primary.light",
                outlineOffset: 2,
              },
            }}
          >
            Ricarica la pagina
          </Box>
        </Box>
      </Box>
    );
  }
}
