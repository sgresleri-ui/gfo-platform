import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#174A9C",
      dark: "#0B2A59",
      light: "#E8F0FF",
    },
    secondary: {
      main: "#168C83",
    },
    success: {
      main: "#2E9D62",
    },
    warning: {
      main: "#E7A31A",
    },
    error: {
      main: "#D94B4B",
    },
    background: {
      default: "#F4F7FB",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#182233",
      secondary: "#647187",
    },
    divider: "#E1E7F0",
  },

  typography: {
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

    h4: {
      fontWeight: 750,
      letterSpacing: "-0.03em",
    },

    h5: {
      fontWeight: 720,
      letterSpacing: "-0.02em",
    },

    h6: {
      fontWeight: 700,
    },

    button: {
      fontWeight: 650,
      textTransform: "none",
    },
  },

  shape: {
    borderRadius: 14,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          minWidth: 320,
          minHeight: "100vh",
          backgroundColor: "#F4F7FB",
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },

      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingLeft: 18,
          paddingRight: 18,
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#F6F8FC",
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        head: {
          color: "#46556D",
          fontWeight: 700,
        },
      },
    },
  },
});

export default theme;