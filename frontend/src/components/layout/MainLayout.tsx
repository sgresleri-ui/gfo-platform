import PolicyRoundedIcon from "@mui/icons-material/PolicyRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { useMemo, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
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
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

import { Outlet, useLocation, useNavigate } from "react-router-dom";

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

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentTitle = useMemo(() => {
    return (
      navigation.find((item) => item.path === location.pathname)?.label ??
      "GFO Platform"
    );
  }, [location.pathname]);

  const drawer = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
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

      <List sx={{ px: 1.5, py: 2 }}>
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

      <Box sx={{ flexGrow: 1 }} />

      <Box sx={{ px: 2.5, pb: 2.5 }}>
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

          <TextField
            size="small"
            placeholder="Cerca nella piattaforma..."
            sx={{
              display: { xs: "none", sm: "block" },
              ml: "auto",
              width: { sm: 250, lg: 360 },

              "& .MuiOutlinedInput-root": {
                backgroundColor: "#F6F8FC",
                borderRadius: 3,
              },
            }}
          />

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
              borderRight: "none",
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
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}