import { Box, useTheme } from "@mui/material";
import { useState } from "react";
import { CompetitionToggle, type Competitor } from "@/components/CompetitionToggle";
import { ValVolumeInputV1 } from "./ValVolumeInput";
import { BryceVolumeInputV1 } from "./BryceVolumeInput";

const COMPETITORS: Competitor[] = [
  {
    id: "val",
    name: "Val",
    iterations: ["v1"],
  },
  {
    id: "bryce",
    name: "Bryce",
    iterations: ["v1"],
  },
];

export function VolumeInput() {
  const theme = useTheme();
  const [activeCompetitorId, setActiveCompetitorId] = useState<string>("val");
  const [activeIterationId, setActiveIterationId] = useState<string>("v1");

  const handleToggleChange = (competitorId: string, iterationId: string) => {
    setActiveCompetitorId(competitorId);
    setActiveIterationId(iterationId);
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "1200px", mx: "auto", p: { xs: 2, md: 4 } }}>
      <CompetitionToggle
        competitors={COMPETITORS}
        activeCompetitorId={activeCompetitorId}
        activeIterationId={activeIterationId}
        onChange={handleToggleChange}
      />

      <Box sx={{ mt: 4 }}>
        {activeCompetitorId === "val" && (
          <Box sx={{ minHeight: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
            {activeIterationId === "v1" && <ValVolumeInputV1 />}
          </Box>
        )}

        {activeCompetitorId === "bryce" && (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
            {activeIterationId === "v1" && <BryceVolumeInputV1 />}
          </Box>
        )}
      </Box>
    </Box>
  );
}
