import type { ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";

type KpiTone = "primary" | "success" | "warning" | "error";

type Props = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  tone?: KpiTone;
};

const toneColors: Record<KpiTone, string> = {
  primary: "#174A9C",
  success: "#2E9D62",
  warning: "#E7A31A",
  error: "#D94B4B",
};

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  tone = "primary",
}: Props) {
  const accent = toneColors[tone];

  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        overflow: "hidden",
        minHeight: 150,
        p: 2.5,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 12px 32px rgba(26, 45, 75, 0.07)",
        transition: "transform 180ms ease, box-shadow 180ms ease",

        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 16px 38px rgba(26, 45, 75, 0.11)",
        },

        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 4,
          backgroundColor: accent,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              fontWeight: 700,
              mb: 1,
            }}
          >
            {title}
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: "text.primary",
              fontSize: { xs: "1.55rem", lg: "1.8rem" },
            }}
          >
            {value}
          </Typography>

          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 1.2,
                color: "text.secondary",
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {icon && (
          <Box
            sx={{
              width: 44,
              height: 44,
              display: "grid",
              placeItems: "center",
              borderRadius: 3,
              color: accent,
              backgroundColor: `${accent}14`,
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
    </Paper>
  );
}