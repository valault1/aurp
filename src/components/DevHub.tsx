import { Link } from "react-router-dom";
import { Box, Container, Paper, Typography } from "@mui/material";

export const DEV_HACKATHONS = [
  { label: "Text", path: "/text", description: "Text input reimagined" },
  { label: "Currency", path: "/currency", description: "Currency input reimagined" },
  { label: "Frogger", path: "/frogger", description: "Frogger takes" },
  { label: "Game Clones", path: "/gameclones", description: "Classic game clones" },
  { label: "Volume", path: "/volume", description: "Volume input reimagined" },
  { label: "Simple", path: "/simple", description: "Simple competition" },
  { label: "Server Game", path: "/servergame", description: "Server-backed game" },
  { label: "Daily", path: "/daily", description: "Daily games" },
];

export function DevHub() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Typography variant="h4" fontWeight={900} mb={1}>
        Dev
      </Typography>
      <Typography color="text.secondary" mb={4}>
        Hackathon experiments in progress.
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 2,
        }}
      >
        {DEV_HACKATHONS.map((item) => (
          <Paper
            key={item.path}
            component={Link}
            to={item.path}
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              textDecoration: "none",
              color: "inherit",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: "primary.main",
                transform: "translateY(-2px)",
              },
            }}
          >
            <Typography variant="h6" fontWeight={700}>
              {item.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {item.description}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Container>
  );
}
