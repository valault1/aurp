import { Box, useTheme, alpha } from "@mui/material";
import { useState } from "react";
import { CompetitionToggle, type Competitor } from "@/components/CompetitionToggle";
import { ValCurrency } from "./ValCurrency";
import { BryceCurrency } from "./BryceCurrency";

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

export function Currency() {
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
                        {activeIterationId === "v1" && <ValCurrency />}
                        {activeIterationId === "v2" && (
                            <Box sx={{ p: 4, textAlign: "center", border: `1px dashed ${alpha(theme.palette.text.primary, 0.2)}`, borderRadius: 4, color: "text.secondary" }}>
                                Val Currency Iteration v2 Placeholder
                            </Box>
                        )}
                        {activeIterationId === "v3" && (
                            <Box sx={{ p: 4, textAlign: "center", border: `1px dashed ${alpha(theme.palette.text.primary, 0.2)}`, borderRadius: 4, color: "text.secondary" }}>
                                Val Currency Iteration v3 Placeholder
                            </Box>
                        )}
                    </Box>
                )}

                {activeCompetitorId === "bryce" && (
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                        {activeIterationId === "v1" && <BryceCurrency />}
                        {activeIterationId === "v2" && (
                            <Box sx={{ p: 4, textAlign: "center", border: `1px dashed ${alpha(theme.palette.text.primary, 0.2)}`, borderRadius: 4, color: "text.secondary" }}>
                                Bryce Currency Iteration v2 Placeholder
                            </Box>
                        )}
                        {activeIterationId === "v3" && (
                            <Box sx={{ p: 4, textAlign: "center", border: `1px dashed ${alpha(theme.palette.text.primary, 0.2)}`, borderRadius: 4, color: "text.secondary" }}>
                                Bryce Currency Iteration v3 Placeholder
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
