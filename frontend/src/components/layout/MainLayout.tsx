import PolicyRoundedIcon from "@mui/icons-material/PolicyRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Fragment,
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
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
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

import {
  Link as RouterLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import RouteErrorBoundary from "../RouteErrorBoundary";
import { pageLoaders } from "../../routes/pageLoaders";

const drawerWidth = 264;

const navigation = [
  {
    section: "Monitoraggio",
    label: "Dashboard",
    path: "/dashboard",
    icon: <DashboardRoundedIcon />,
    load: pageLoaders.dashboard,
  },
  {
    section: "Monitoraggio",
    label: "Patrimonio",
    path: "/wealth",
    icon: <AccountBalanceWalletRoundedIcon />,
    load: pageLoaders.wealth,
  },
  {
    section: "Monitoraggio",
    label: "Storico Patrimoniale",
    path: "/wealth-history",
    icon: <TimelineRoundedIcon />,
    load: pageLoaders.wealthHistory,
  },
  {
    section: "Monitoraggio",
    label: "Registro Movimenti",
    path: "/transactions",
    icon: <ReceiptLongRoundedIcon />,
    load: pageLoaders.transactions,
  },
  {
    section: "Monitoraggio",
    label: "Performance",
    path: "/performance",
    icon: <AssessmentRoundedIcon />,
    load: pageLoaders.performance,
  },
  {
    section: "Monitoraggio",
    label: "Rischio",
    path: "/risk",
    icon: <ShieldRoundedIcon />,
    load: pageLoaders.risk,
  },
  {
    section: "Monitoraggio",
    label: "IPS e Conformità",
    path: "/ips",
    icon: <PolicyRoundedIcon />,
    load: pageLoaders.ips,
  },
  {
    section: "Monitoraggio",
    label: "Qualità Dati",
    path: "/data-quality",
    icon: <FactCheckRoundedIcon />,
    load: pageLoaders.dataQuality,
  },
  {
    section: "Gestione patrimoniale",
    label: "Investimenti",
    path: "/investments",
    icon: <ShowChartRoundedIcon />,
    load: pageLoaders.investments,
  },
  {
    section: "Gestione patrimoniale",
    label: "Liquidità",
    path: "/liquidity",
    icon: <SavingsRoundedIcon />,
    load: pageLoaders.liquidity,
  },
  {
    section: "Gestione patrimoniale",
    label: "Immobili",
    path: "/properties",
    icon: <HomeWorkRoundedIcon />,
    load: pageLoaders.properties,
  },
  {
    section: "Gestione patrimoniale",
    label: "Budget",
    path: "/budget",
    icon: <ReceiptLongRoundedIcon />,
    load: pageLoaders.budget,
  },
  {
    section: "Gestione patrimoniale",
    label: "Planning",
    path: "/planning",
    icon: <TimelineRoundedIcon />,
    load: pageLoaders.planning,
  },
  {
    section: "Operatività",
    label: "Calendario Operativo",
    path: "/operational-calendar",
    icon: <CalendarMonthRoundedIcon />,
    load: pageLoaders.operationalCalendar,
  },
  {
    section: "Operatività",
    label: "Data Catalog",
    path: "/data-catalog",
    icon: <StorageRoundedIcon />,
    load: pageLoaders.dataCatalog,
  },
  {
    section: "Operatività",
    label: "Import Center",
    path: "/imports",
    icon: <UploadFileRoundedIcon />,
    load: pageLoaders.importCenter,
  },
  {
    section: "Operatività",
    label: "Report",
    path: "/reports",
    icon: <DescriptionRoundedIcon />,
    load: pageLoaders.reports,
  },
  {
    section: "Operatività",
    label: "Document Center",
    path: "/documents",
    icon: <FolderRoundedIcon />,
    load: pageLoaders.documents,
  },
  {
    section: "Operatività",
    label: "Decisioni",
    path: "/decisions",
    icon: <GavelRoundedIcon />,
    load: pageLoaders.decisions,
  },
  {
    section: "Operatività",
    label: "Impostazioni",
    path: "/settings",
    icon: <SettingsRoundedIcon />,
    load: pageLoaders.settings,
  },
];

function preloadPage(loader: () => Promise<unknown>) {
  void loader().catch(() => undefined);
}

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
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const desktopSelectedNavigationRef =
    useRef<HTMLAnchorElement>(null);
  const mobileSelectedNavigationRef =
    useRef<HTMLAnchorElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] =
    useState(false);
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
        event.preventDefault();
        setActiveSearchIndex(0);
        setMobileSearchOpen(true);
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

  const currentNavigationItem = useMemo(() => {
    return navigation.find((item) => item.path === location.pathname);
  }, [location.pathname]);

  const currentTitle =
    currentNavigationItem?.label ?? "GFO Platform";
  const currentSection =
    currentNavigationItem?.section ?? "Family Office";

  useEffect(() => {
    document.title = `${currentTitle} | GFO Platform`;
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [currentTitle, location.pathname]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      desktopSelectedNavigationRef.current?.scrollIntoView({
        block: "nearest",
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      mobileSelectedNavigationRef.current?.scrollIntoView({
        block: "nearest",
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [location.pathname, mobileOpen]);

  const searchResults = useMemo(() => {
    const query = normalizeSearchText(searchValue.trim());

    if (!query) {
      return navigation;
    }

    return navigation.filter(
      (item) =>
        normalizeSearchText(item.label).includes(query) ||
        normalizeSearchText(item.section).includes(query),
    );
  }, [searchValue]);

  useEffect(() => {
    if (
      (!searchOpen && !mobileSearchOpen) ||
      searchResults.length === 0
    ) {
      return;
    }

    const activeResultIndex = Math.min(
      activeSearchIndex,
      searchResults.length - 1,
    );
    const activeResult = searchResults[activeResultIndex];
    const activeOptionId = `${
      mobileSearchOpen ? "mobile-" : ""
    }platform-search-option-${activeResultIndex}`;

    preloadPage(activeResult.load);
    document.getElementById(activeOptionId)?.scrollIntoView({
      block: "nearest",
    });
  }, [
    activeSearchIndex,
    mobileSearchOpen,
    searchOpen,
    searchResults,
  ]);

  const openSearchResult = (path: string) => {
    navigate(path);
    setSearchValue("");
    setSearchOpen(false);
    setMobileSearchOpen(false);
    setActiveSearchIndex(0);
    setMobileOpen(false);
  };

  const closeMobileSearch = () => {
    setMobileSearchOpen(false);
    setSearchValue("");
    setActiveSearchIndex(0);
  };

  const clearSearch = (input: HTMLInputElement | null) => {
    setSearchValue("");
    setActiveSearchIndex(0);
    input?.focus();
  };

  const renderDrawer = (mobile: boolean) => (
    <Box
      sx={{
        position: "relative",
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
      <Box
        component={RouterLink}
        to="/dashboard"
        aria-label="Vai alla Dashboard"
        onMouseEnter={() => preloadPage(pageLoaders.dashboard)}
        onFocus={() => preloadPage(pageLoaders.dashboard)}
        onTouchStart={() => preloadPage(pageLoaders.dashboard)}
        onClick={() => setMobileOpen(false)}
        sx={{
          display: "block",
          px: 2.5,
          py: 3,
          color: "inherit",
          textDecoration: "none",

          "&:focus-visible": {
            outline: "2px solid rgba(255,255,255,0.82)",
            outlineOffset: -4,
          },
        }}
      >
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

      {mobile && (
        <IconButton
          aria-label="Chiudi il menu di navigazione"
          title="Chiudi menu"
          onClick={() => setMobileOpen(false)}
          sx={{
            position: "absolute",
            zIndex: 1,
            top: 18,
            right: 12,
            color: "rgba(255,255,255,0.82)",
            bgcolor: "rgba(255,255,255,0.07)",

            "&:hover": {
              bgcolor: "rgba(255,255,255,0.13)",
            },
          }}
        >
          <CloseRoundedIcon />
        </IconButton>
      )}

      <Divider sx={{ borderColor: "rgba(255,255,255,0.09)" }} />

      <List
        aria-label="Navigazione principale"
        sx={{
          px: 1.5,
          py: 1.5,
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
        {navigation.map((item, index) => {
          const selected = location.pathname === item.path;
          const beginsSection =
            index === 0 ||
            navigation[index - 1].section !== item.section;

          return (
            <Fragment key={item.path}>
              {beginsSection && (
                <ListSubheader
                  disableSticky
                  sx={{
                    px: 1.25,
                    pt: index === 0 ? 0 : 1.35,
                    pb: 0.7,
                    color: "rgba(255,255,255,0.43)",
                    bgcolor: "transparent",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.13em",
                    lineHeight: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  {item.section}
                </ListSubheader>
              )}

              <ListItemButton
                ref={
                  selected
                    ? mobile
                      ? mobileSelectedNavigationRef
                      : desktopSelectedNavigationRef
                    : undefined
                }
                component={RouterLink}
                to={item.path}
                selected={selected}
                aria-current={selected ? "page" : undefined}
                onMouseEnter={() => preloadPage(item.load)}
                onFocus={() => preloadPage(item.load)}
                onTouchStart={() => preloadPage(item.load)}
                onClick={() => setMobileOpen(false)}
                sx={{
                  mb: 0.45,
                  minHeight: 44,
                  borderRadius: 2.5,
                  color: selected
                    ? "white"
                    : "rgba(255,255,255,0.74)",

                  "& .MuiListItemIcon-root": {
                    minWidth: 40,
                    color: selected
                      ? "white"
                      : "rgba(255,255,255,0.62)",
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
            </Fragment>
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
      <Box
        component="span"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: "absolute",
          width: 1,
          height: 1,
          p: 0,
          m: -1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Pagina aperta: {currentSection}, {currentTitle}
      </Box>

      <Box
        component="a"
        href="#main-content"
        sx={{
          position: "fixed",
          zIndex: (theme) => theme.zIndex.tooltip + 1,
          top: 12,
          left: 12,
          px: 2,
          py: 1.25,
          borderRadius: 2,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          boxShadow: 4,
          fontSize: 14,
          fontWeight: 700,
          textDecoration: "none",
          transform: "translateY(calc(-100% - 24px))",
          transition: "transform 160ms ease",

          "&:focus-visible": {
            outline: "3px solid",
            outlineColor: "primary.contrastText",
            outlineOffset: 2,
            transform: "translateY(0)",
          },
        }}
      >
        Vai al contenuto principale
      </Box>

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
        <Toolbar sx={{ minHeight: 76, gap: { xs: 1, sm: 2 } }}>
          <IconButton
            aria-label="Apri il menu di navigazione"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: "none" } }}
          >
            <MenuRoundedIcon />
          </IconButton>

          <Box
            sx={{
              minWidth: { xs: 0, md: 180 },
              maxWidth: {
                xs: "42vw",
                sm: 150,
                md: 180,
                lg: 260,
              },
              flexGrow: { xs: 1, sm: 0 },
              flexShrink: 1,
            }}
          >
            <Typography
              variant="caption"
              noWrap
              sx={{
                display: { xs: "none", sm: "block" },
                mb: 0.15,
                color: "text.secondary",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.1em",
                lineHeight: 1.2,
                textTransform: "uppercase",
              }}
            >
              {currentSection}
            </Typography>

            <Typography
              variant="h6"
              noWrap
              title={currentTitle}
              sx={{ lineHeight: 1.2 }}
            >
              {currentTitle}
            </Typography>
          </Box>

          <Box
            sx={{
              position: "relative",
              display: { xs: "none", sm: "block" },
              ml: "auto",
              width: { sm: 220, lg: 360 },
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

                if (event.key === "Home" || event.key === "End") {
                  event.preventDefault();
                  setSearchOpen(true);
                  setActiveSearchIndex(
                    event.key === "Home"
                      ? 0
                      : searchResults.length - 1,
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
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        flexShrink: 0,
                      }}
                    >
                      {searchValue && (
                        <IconButton
                          size="small"
                          aria-label="Azzera ricerca"
                          title="Azzera ricerca"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={() =>
                            clearSearch(searchInputRef.current)
                          }
                          sx={{ p: 0.5 }}
                        >
                          <CloseRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      )}

                      <Box
                        component="span"
                        aria-hidden
                        title={`Scorciatoia: ${searchShortcutLabel}`}
                        sx={{
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
                      ? `platform-search-option-${Math.min(
                          activeSearchIndex,
                          searchResults.length - 1,
                        )}`
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
                      onMouseEnter={() => {
                        setActiveSearchIndex(index);
                        preloadPage(item.load);
                      }}
                      onFocus={() => preloadPage(item.load)}
                      onTouchStart={() => preloadPage(item.load)}
                      onClick={() => openSearchResult(item.path)}
                      sx={{
                        minHeight: 52,
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
                        secondary={item.section}
                        slotProps={{
                          primary: {
                            sx: {
                              fontSize: 14,
                              fontWeight: 600,
                            },
                          },
                          secondary: {
                            sx: {
                              mt: 0.15,
                              fontSize: 11,
                              lineHeight: 1.2,
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

          <IconButton
            aria-label="Cerca una sezione"
            title="Cerca una sezione"
            onClick={() => {
              setSearchValue("");
              setActiveSearchIndex(0);
              setMobileSearchOpen(true);
            }}
            sx={{
              display: { xs: "inline-flex", sm: "none" },
              ml: "auto",
            }}
          >
            <SearchRoundedIcon />
          </IconButton>

          <Box
            component={RouterLink}
            to="/settings"
            aria-label="Apri le Impostazioni del profilo"
            title="Apri Impostazioni"
            onMouseEnter={() => preloadPage(pageLoaders.settings)}
            onFocus={() => preloadPage(pageLoaders.settings)}
            onTouchStart={() => preloadPage(pageLoaders.settings)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              ml: { xs: 0, sm: 1 },
              p: 0.5,
              borderRadius: 2,
              color: "inherit",
              textDecoration: "none",

              "&:hover": {
                bgcolor: "action.hover",
              },

              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
              },
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

      <Dialog
        open={mobileSearchOpen}
        onClose={closeMobileSearch}
        fullWidth
        maxWidth="xs"
        aria-labelledby="mobile-platform-search-title"
        slotProps={{
          paper: {
            sx: {
              m: 2,
              maxHeight: "calc(100dvh - 32px)",
              borderRadius: 3,
            },
          },
        }}
      >
        <DialogTitle
          id="mobile-platform-search-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            pb: 1,
          }}
        >
          Vai a una sezione

          <IconButton
            aria-label="Chiudi la ricerca"
            onClick={closeMobileSearch}
            edge="end"
          >
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: "8px !important", pb: 2 }}>
          <TextField
            fullWidth
            autoFocus
            size="small"
            inputRef={mobileSearchInputRef}
            value={searchValue}
            placeholder="Cerca nella piattaforma..."
            onChange={(event) => {
              setSearchValue(event.target.value);
              setActiveSearchIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeMobileSearch();
                return;
              }

              if (searchResults.length === 0) {
                return;
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveSearchIndex(
                  (index) => (index + 1) % searchResults.length,
                );
                return;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveSearchIndex(
                  (index) =>
                    (index - 1 + searchResults.length) %
                    searchResults.length,
                );
                return;
              }

              if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                setActiveSearchIndex(
                  event.key === "Home"
                    ? 0
                    : searchResults.length - 1,
                );
                return;
              }

              if (event.key === "Enter") {
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
                endAdornment: searchValue ? (
                  <IconButton
                    size="small"
                    aria-label="Azzera ricerca"
                    title="Azzera ricerca"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() =>
                      clearSearch(mobileSearchInputRef.current)
                    }
                    sx={{ p: 0.5 }}
                  >
                    <CloseRoundedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                ) : undefined,
              },
              htmlInput: {
                role: "combobox",
                "aria-label": "Cerca una sezione della piattaforma",
                "aria-autocomplete": "list",
                "aria-expanded": true,
                "aria-controls": "mobile-platform-search-results",
                "aria-activedescendant":
                  searchResults.length > 0
                    ? `mobile-platform-search-option-${Math.min(
                        activeSearchIndex,
                        searchResults.length - 1,
                      )}`
                    : undefined,
              },
            }}
            sx={{
              mb: 1.25,

              "& .MuiOutlinedInput-root": {
                backgroundColor: "#F6F8FC",
                borderRadius: 2.5,
              },
            }}
          />

          <Box
            id="mobile-platform-search-results"
            role="listbox"
            sx={{
              maxHeight: "min(460px, calc(100dvh - 180px))",
              overflowY: "auto",
            }}
          >
            {searchResults.length === 0 ? (
              <Typography
                color="text.secondary"
                sx={{ px: 1.5, py: 2, fontSize: 14 }}
              >
                Nessuna sezione trovata
              </Typography>
            ) : (
              searchResults.map((item, index) => (
                <ListItemButton
                  key={item.path}
                  id={`mobile-platform-search-option-${index}`}
                  role="option"
                  aria-selected={index === activeSearchIndex}
                  selected={index === activeSearchIndex}
                  onMouseEnter={() => {
                    setActiveSearchIndex(index);
                    preloadPage(item.load);
                  }}
                  onFocus={() => preloadPage(item.load)}
                  onTouchStart={() => preloadPage(item.load)}
                  onClick={() => openSearchResult(item.path)}
                  sx={{
                    minHeight: 52,
                    borderRadius: 2,

                    "&.Mui-selected": {
                      bgcolor: "action.selected",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 38,
                      color: "primary.main",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    secondary={item.section}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: 14,
                          fontWeight: 600,
                        },
                      },
                      secondary: {
                        sx: {
                          mt: 0.15,
                          fontSize: 11,
                          lineHeight: 1.2,
                        },
                      },
                    }}
                  />
                </ListItemButton>
              ))
            )}
          </Box>
        </DialogContent>
      </Dialog>

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
          {renderDrawer(true)}
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
          {renderDrawer(false)}
        </Drawer>
      </Box>

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
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
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  sx={{
                    minHeight: { xs: 320, sm: 420 },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1.5,
                    textAlign: "center",
                  }}
                >
                  <CircularProgress
                    size={32}
                    thickness={4}
                    aria-hidden="true"
                  />

                  <Box>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 700 }}
                    >
                      Caricamento {currentTitle}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Preparazione dei dati in corso…
                    </Typography>
                  </Box>
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
