import { Box } from "@mui/material";
import { CompetitionToggle, type Competitor, useCompetitionState } from "@/components/CompetitionToggle";
import { ValMusicV1, ValMusicV2, ValMusicV3 } from "./ValMusic";
import { BryceMusicV1, BryceMusicV2, BryceMusicV3 } from "./bryce/BryceMusic";

const COMPETITORS: Competitor[] = [
  { id: "val", name: "Val", iterations: ["v1", "v2", "v3"] },
  { id: "bryce", name: "Bryce", iterations: ["v1", "v2", "v3"] },
];

export function Music() {
  const { activeCompetitorId, activeIterationId, handleToggleChange } = useCompetitionState("val", "v1");

  return (
    <Box sx={{ width: "100%", maxWidth: "1400px", mx: "auto", p: { xs: 2, md: 4 } }}>
      <CompetitionToggle
        competitors={COMPETITORS}
        activeCompetitorId={activeCompetitorId}
        activeIterationId={activeIterationId}
        onChange={handleToggleChange}
      />

      <Box sx={{ mt: 4, minHeight: "60vh", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        {activeCompetitorId === "val" && (
          <>
            {activeIterationId === "v1" && <ValMusicV1 />}
            {activeIterationId === "v2" && <ValMusicV2 />}
            {activeIterationId === "v3" && <ValMusicV3 />}
          </>
        )}
        {activeCompetitorId === "bryce" && (
          <>
            {activeIterationId === "v1" && <BryceMusicV1 />}
            {activeIterationId === "v2" && <BryceMusicV2 />}
            {activeIterationId === "v3" && <BryceMusicV3 />}
          </>
        )}
      </Box>
    </Box>
  );
}
