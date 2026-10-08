import { Box } from "@mui/material";
import { CompetitionToggle, type Competitor, useCompetitionState } from "@/components/CompetitionToggle";
import { ValDailyV1, ValDailyV2, ValDailyV3 } from "./ValDaily";
import { BryceDailyV1, BryceDailyV2, BryceDailyV3 } from "./BryceDaily";

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

export function Daily() {
    const { activeCompetitorId, activeIterationId, handleToggleChange } = useCompetitionState("val", "v1");

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
                    <Box>
                        {activeIterationId === "v1" && <ValDailyV1 />}
                        {activeIterationId === "v2" && <ValDailyV2 />}
                        {activeIterationId === "v3" && <ValDailyV3 />}
                    </Box>
                )}

                {activeCompetitorId === "bryce" && (
                    <Box>
                        {activeIterationId === "v1" && <BryceDailyV1 />}
                        {activeIterationId === "v2" && <BryceDailyV2 />}
                        {activeIterationId === "v3" && <BryceDailyV3 />}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
