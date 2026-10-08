import { Box } from "@mui/material";
import { Snug } from "./bryce/snug/Snug";
import { SixDegrees } from "./val/sixDegrees/SixDegrees";

function Page({ children }: { children: React.ReactNode }) {
    return <Box sx={{ width: "100%", maxWidth: "1200px", mx: "auto", p: { xs: 2, md: 4 } }}>{children}</Box>;
}

/** Prod: Bryce's Daily v1. */
export function SnugPage() {
    return <Page><Snug /></Page>;
}

/** Prod: Val's Daily v3 (Six Degrees). */
export function NorrisQuestPage() {
    return <Page><SixDegrees /></Page>;
}
