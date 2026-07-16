import { Box, Paper, Typography } from "@mui/material";

type Props = {
  title: string;
  description: string;
};

export default function PlaceholderPage({ title, description }: Props) {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        {title}
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 5,
          border: "1px solid",
          borderColor: "divider",
          textAlign: "center",
          boxShadow: "0 12px 32px rgba(26, 45, 75, 0.06)",
        }}
      >
        <Typography variant="h6" sx={{ mb: 1 }}>
          Modulo in preparazione
        </Typography>

        <Typography color="text.secondary">
          Questa sezione verrà collegata progressivamente al motore dati della
          GFO Platform.
        </Typography>
      </Paper>
    </Box>
  );
}