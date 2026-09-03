import { Box } from "@mui/material";
import { BryceLapRacer } from "@/hackathons/simpleCompetition/lapRacer/BryceLapRacer";

export function Apex() {
  return (
    <Box sx={{ width: "100%", maxWidth: "1200px", mx: "auto", p: { xs: 2, md: 4 }, display: "flex", justifyContent: "center" }}>
      <BryceLapRacer />
    </Box>
  );
}
