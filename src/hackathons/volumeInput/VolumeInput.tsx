import { Box } from "@mui/material";
import { useState } from "react";
import { CompetitionToggle, type Competitor } from "@/components/CompetitionToggle";
import { ValVolumeInputV1, ValVolumeInputV2, ValVolumeInputV3 } from "./ValVolumeInput";
import { BryceVolumeArea } from "./bryce/BryceVolumeArea";

const COMPETITORS: Competitor[] = [
  {
    id: "val",
    name: "Val",
    iterations: ["v1", "v2", "v3"],
  },
  {
    id: "bryce",
    name: "Bryce",
    iterations: ["v1", "v2", "v3", "v4", "v5"],
  },
];

export function VolumeInput() {
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
            {activeIterationId === "v2" && <ValVolumeInputV2 />}
            {activeIterationId === "v3" && <ValVolumeInputV3 />}
          </Box>
        )}

        {/* Bryce's area owns its own master-volume provider + global player panel,
            so that layer never shows on Val's tabs. */}
        {activeCompetitorId === "bryce" && <BryceVolumeArea iteration={activeIterationId} />}
      </Box>
    </Box>
  );
}
