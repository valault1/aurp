import { Box } from "@mui/material";
import { useState } from "react";
import { CompetitionToggle, type Competitor } from "@/components/CompetitionToggle";
import { ValSimpleCompetitionV1, ValSimpleCompetitionV2, ValSimpleCompetitionV3 } from "./ValSimpleCompetition";
import { BryceSimpleCompetitionV1, BryceSimpleCompetitionV2, BryceSimpleCompetitionV3 } from "./BryceSimpleCompetition";

const COMPETITORS: Competitor[] = [
  {
    id: "val",
    name: "Val",
    iterations: ["v1", "v2", "v3"],
  },
  {
    id: "bryce",
    name: "Bryce",
    iterations: ["v1", "v2", "v3"],
  },
];

export function SimpleCompetition() {
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

      <Box sx={{ mt: 4, minHeight: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        {activeCompetitorId === "val" && (
          <>
            {activeIterationId === "v1" && <ValSimpleCompetitionV1 />}
            {activeIterationId === "v2" && <ValSimpleCompetitionV2 />}
            {activeIterationId === "v3" && <ValSimpleCompetitionV3 />}
          </>
        )}

        {activeCompetitorId === "bryce" && (
          <>
            {activeIterationId === "v1" && <BryceSimpleCompetitionV1 />}
            {activeIterationId === "v2" && <BryceSimpleCompetitionV2 />}
            {activeIterationId === "v3" && <BryceSimpleCompetitionV3 />}
          </>
        )}
      </Box>
    </Box>
  );
}
