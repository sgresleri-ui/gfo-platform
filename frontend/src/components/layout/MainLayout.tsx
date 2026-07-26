import PolicyRoundedIcon from "@mui/icons-material/PolicyRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppBar,
  Avatar,
  Box,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

import { Outlet, useLocation, useNavigate } from "react-router-dom";

import RouteErrorBoundary from "../RouteErrorBoundary";

const drawerWidth = 264;

const navigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <DashboardRoundedIcon />,
  },
  {
    label: "Patrimonio",
    path: "/wealth",
    icon: <AccountBalanceWalletRoundedIcon />,
  },
  {
    label: "Storico Patrimoniale",
    path: "/wealth-history",
    icon: <TimelineRoundedIcon />,
  },
  {
    label: "Registro Movimenti",
    path: "/transactions",
    icon: <ReceiptLongRoundedIcon />,
  },
  {
    label: "Performance",
    path: "/performance",
    icon: <AssessmentRoundedIcon />,
  },
  {
    label: "Rischio",
    path: "/risk",
    icon: <ShieldRoundedIcon />,
  },
  {
    label: "IPS e Conformità",
    path: "/ips",
    icon: <PolicyRoundedIcon />,
  },

  {
    label: "Qualità Dati",
    path: "/data-quality",
    icon: <FactCheckRoundedIcon />,
  },





  {
    label: "Investimenti",
    path: "/investments",
    icon: <ShowChartRoundedIcon />,
  },
  {
    label: "Liquidità",
    path: "/liquidity",
    icon: <SavingsRoundedIcon />,
  },
  {
    label: "Immobili",
    path: "/properties",
    icon: <HomeWorkRoundedIcon />,
  },
  {
    label: "Budget",
    path: "/budget",
    icon: <ReceiptLongRoundedIcon />,
  },
  {
    label: "Planning",
    path: "/planning",
    icon: <TimelineRoundedIcon />,
  },
  {
    label: "Calendario Operativo",
    path: "/operational-calendar",
    icon: <CalendarMonthRoundedIcon />,
  },
  {
    label: "Data Catalog",
    path: "/data-catalog",
    icon: <StorageRoundedIcon />,
  },
  {
    label: "Import Center",
    path: "/imports",
    icon: <UploadFileRoundedIcon />,
  },

  {
    label: "Report",
    path: "/reports",
    icon: <DescriptionRoundedIcon />,
  },
  {
    label: "Document Center",
    path: "/documents",
    icon: <FolderRoundedIcon />,
  },
  {
    label: "Decisioni",
    path: "/decisions",
    icon: <GavelRoundedIcon />,
  },
  {
    label: "Impostazioni",
    path: "/settings",
    icon: <SettingsRoundedIcon />,
  },
];

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it");
}

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  const searchShortcutLabel = useMemo(() => {
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      ? "⌘ K"
      : "Ctrl K";
  }, []);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (
        event.key.toLocaleLowerCase("it") !== "k" ||
        (!event.metaKey && !event.ctrlKey)
      ) {
        return;
      }

      const searchInput = searchInputRef.current;

      if (!searchInput || searchInput.getClientRects().length === 0) {
        return;
      }

      event.preventDefault();
      searchInput.focus();
      setSearchOpen(true);
      setActiveSearchIndex(0);
    };

    window.addEventListener("keydown", focusSearch);

    return () => {
      window.removeEventListener("keydown", focusSearch);
    };
  }, []);

  const currentTitle = useMemo(() => {
    return (
      navigation.find((item) => item.path === location.pathname)?.label ??
      "GFO Platform"
    );
  }, [location.pathname]);

  useEffect(() => {
    document.title = `${currentTitle} | GFO Platform`;
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [currentTitle, location.pathname]);

  const searchResults = useMemo(() => {
    const query = normalizeSearchText(searchValue.trim());

    if (!query) {
      return navigation;
    }

    return navigation.filter((item) =>
      normalizeSearchText(item.label).includes(query),
    );
  }, [searchValue]);

  const openSearchResult = (path: string) => {
    navigate(path);
    setSearchValue("");
    setSearchOpen(false);
    setActiveSearchIndex(0);
    setMobileOpen(false);
  };

  const drawer = (
    <Box
      sx={{
        height: "100dvh",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        color: "white",
        background:
          "linear-gradient(180deg, #071A36 0%, #092650 55%, #071A36 100%)",
      }}
    >
      <Box sx={{ px: 2.5, py: 3 }}>
        <Typography
          variant="h5"
          sx={{
            color: "white",
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          GFO
        </Typography>

        <Typography
          variant="caption"
          sx={{
            color: "rgba(255,255,255,0.62)",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
          }}
        >
          Family Office
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.09)" }} />

      <List
        sx={{
          px: 1.5,
          py: 2,
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
          scrollbarWidth: "thin",

          "&::-webkit-scrollbar": {
            width: 6,
          },

          "&::-webkit-scrollbar-thumb": {
            backgroundColor:
              "rgba(255,255,255,0.22)",
            borderRadius: 10,
          },

          "&::-webkit-scrollbar-track": {
            backgroundColor:
              "transparent",
          },
        }}
      >
        {navigation.map((item) => {
          const selected = location.pathname === item.path;

          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                mb: 0.55,
                minHeight: 46,
                borderRadius: 2.5,
                color: selected ? "white" : "rgba(255,255,255,0.74)",

                "& .MuiListItemIcon-root": {
                  minWidth: 40,
                  color: selected ? "white" : "rgba(255,255,255,0.62)",
                },

                "&.Mui-selected": {
                  background:
                    "linear-gradient(90deg, #174A9C 0%, #215AB5 100%)",
                  boxShadow: "0 8px 18px rgba(0,0,0,0.22)",
                },

                "&.Mui-selected:hover": {
                  background:
                    "linear-gradient(90deg, #174A9C 0%, #215AB5 100%)",
                },

                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.07)",
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>

              <ListItemText
                primary={
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 14,
                      fontWeight: selected ? 700 : 500,
                    }}
                  >
                    {item.label}
                  </Typography>
                }
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box
        sx={{
          px: 2.5,
          py: 2,
          flexShrink: 0,
          borderTop: "1px solid",
          borderColor:
            "rgba(255,255,255,0.09)",
          backgroundColor:
            "rgba(3,16,37,0.30)",
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "rgba(255,255,255,0.48)" }}
        >
          GFO Platform
          <br />
          Planning Intelligence
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          ml: { md: `${drawerWidth}px` },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(16px)",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ minHeight: 76, gap: 2 }}>
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: "none" } }}
          >
            <MenuRoundedIcon />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              minWidth: { md: 180 },
              flexShrink: 0,
            }}
          >
            {currentTitle}
          </Typography>

          <Box
            sx={{
              position: "relative",
              display: { xs: "none", sm: "block" },
              ml: "auto",
              width: { sm: 250, lg: 360 },
            }}
          >
            <TextField
              fullWidth
              size="small"
              inputRef={searchInputRef}
              value={searchValue}
              placeholder="Vai a una sezione..."
              onFocus={() => {
                setSearchOpen(true);
                setActiveSearchIndex(0);
              }}
              onBlur={() => setSearchOpen(false)}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setSearchOpen(true);
                setActiveSearchIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearchOpen(false);
                  event.currentTarget.blur();
                  return;
                }

                if (searchResults.length === 0) {
                  return;
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSearchOpen(true);
                  setActiveSearchIndex(
                    (index) => (index + 1) % searchResults.length,
                  );
                  return;
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSearchOpen(true);
                  setActiveSearchIndex(
                    (index) =>
                      (index - 1 + searchResults.length) %
                      searchResults.length,
                  );
                  return;
                }

                if (event.key === "Enter" && searchOpen) {
                  event.preventDefault();
                  openSearchResult(
                    searchResults[
                      Math.min(
                        activeSearchIndex,
                        searchResults.length - 1,
                      )
                    ].path,
                  );
                }
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <SearchRoundedIcon
                      sx={{
                        mr: 1,
                        color: "text.secondary",
                        fontSize: 20,
                      }}
                    />
                  ),
                  endAdornment: (
                    <Box
                      component="span"
                      aria-hidden
                      title={`Scorciatoia: ${searchShortcutLabel}`}
                      sx={{
                        flexShrink: 0,
                        px: 0.8,
                        py: 0.25,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        color: "text.secondary",
                        bgcolor: "background.paper",
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1.4,
                      }}
                    >
                      {searchShortcutLabel}
                    </Box>
                  ),
                },
                htmlInput: {
                  role: "combobox",
                  "aria-label": "Cerca una sezione della piattaforma",
                  "aria-autocomplete": "list",
                  "aria-expanded": searchOpen,
                  "aria-controls": searchOpen
                    ? "platform-search-results"
                    : undefined,
                  "aria-activedescendant":
                    searchOpen && searchResults.length > 0
                      ? `platform-search-option-${activeSearchIndex}`
                      : undefined,
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#F6F8FC",
                  borderRadius: 3,
                },
              }}
            />

            {searchOpen && (
              <Box
                id="platform-search-results"
                role="listbox"
                onMouseDown={(event) => event.preventDefault()}
                sx={{
                  position: "absolute",
                  zIndex: 2,
                  top: "calc(100% + 8px)",
                  left: 0,
                  right: 0,
                  maxHeight: 380,
                  overflowY: "auto",
                  p: 0.75,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2.5,
                  bgcolor: "background.paper",
                  boxShadow: "0 18px 48px rgba(15, 36, 68, 0.18)",
                }}
              >
                {searchResults.length === 0 ? (
                  <Typography
                    color="text.secondary"
                    sx={{ px: 1.5, py: 1.25, fontSize: 14 }}
                  >
                    Nessuna sezione trovata
                  </Typography>
                ) : (
                  searchResults.map((item, index) => (
                    <ListItemButton
                      key={item.path}
                      id={`platform-search-option-${index}`}
                      role="option"
                      aria-selected={index === activeSearchIndex}
                      selected={index === activeSearchIndex}
                      onMouseEnter={() => setActiveSearchIndex(index)}
                      onClick={() => openSearchResult(item.path)}
                      sx={{
                        minHeight: 42,
                        borderRadius: 2,

                        "&.Mui-selected": {
                          bgcolor: "action.selected",
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 36,
                          color: "primary.main",
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        slotProps={{
                          primary: {
                            sx: {
                              fontSize: 14,
                              fontWeight: 600,
                            },
                          },
                        }}
                      />
                    </ListItemButton>
                  ))
                )}
              </Box>
            )}
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              ml: { xs: "auto", sm: 1 },
            }}
          >
            <Box sx={{ display: { xs: "none", lg: "block" }, textAlign: "right" }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Stefano Gresleri
              </Typography>

              <Typography variant="caption" color="text.secondary">
                Family Office
              </Typography>
            </Box>

            <Avatar
              sx={{
                width: 38,
                height: 38,
                bgcolor: "primary.main",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              SG
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },

            "& .MuiDrawer-paper": {
              width: drawerWidth,
              height: "100dvh",
              overflow: "hidden",
              borderRight: "none",
              backgroundColor: "#071A36",
            },
          }}
        >
          {drawer}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },

            "& .MuiDrawer-paper": {
              width: drawerWidth,
              height: "100dvh",
              overflow: "hidden",
              borderRight: "none",
              backgroundColor: "#071A36",
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minWidth: 0,
          pt: "76px",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 1560,
            mx: "auto",
            p: { xs: 2, sm: 3, lg: 4 },
          }}
        >
          <RouteErrorBoundary key={location.pathname}>
            <Suspense
              fallback={
                <Box
                  sx={{
                    minHeight: 420,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <CircularProgress />
                </Box>
              }
            >
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </Box>
      </Box>
    </Box>
  );
}
