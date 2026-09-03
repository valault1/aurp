import { Box } from "@mui/material";
import { CompetitionToggle, type Competitor, useCompetitionState } from "@/components/CompetitionToggle";
import { ValServerGameV1, ValServerGameV2, ValServerGameV3 } from "./ValServerGame";
import { BryceServerGameV1, BryceServerGameV2, BryceServerGameV3 } from "./BryceServerGame";

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

export function ServerGame() {
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
                        {activeIterationId === "v1" && <ValServerGameV1 />}
                        {activeIterationId === "v2" && <ValServerGameV2 />}
                        {activeIterationId === "v3" && <ValServerGameV3 />}
                    </Box>
                )}

                {activeCompetitorId === "bryce" && (
                    <Box>
                        {activeIterationId === "v1" && <BryceServerGameV1 />}
                        {activeIterationId === "v2" && <BryceServerGameV2 />}
                        {activeIterationId === "v3" && <BryceServerGameV3 />}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
