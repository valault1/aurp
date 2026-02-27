import { Box } from "@mui/material";
import { useState } from "react";
import { Rearranger } from "./Rearranger";
import { BattleInput } from "./BattleInput";
import { CompetitionToggle, type Competitor } from "@/components/CompetitionToggle";

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

export function TextInput() {
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
                    <Box>
                        {activeIterationId === "v1" && <Rearranger />}
                    </Box>
                )}

                {activeCompetitorId === "bryce" && (
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                        {activeIterationId === "v1" && <BattleInput />}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
