import { Box } from "@mui/material";
import { NorrisQuest } from "./val/norrisQuest/NorrisQuest";

function Page({ children }: { children: React.ReactNode }) {
    return <Box sx={{ width: "100%", maxWidth: "1200px", mx: "auto", p: { xs: 2, md: 4 } }}>{children}</Box>;
}

const SNUG_EMBED_URL = "https://www.bstocksharp.dev/embed/snug";

/** Bryce's Snug, served from his site so he can ship it without an aurp build; shares link back here. */
export function SnugFrame() {
    const src = `${SNUG_EMBED_URL}?share=${encodeURIComponent(`${window.location.origin}/snug`)}`;
    return <Box component="iframe" src={src} title="Snug" allow="clipboard-write; web-share" sx={{ flex: 1, minHeight: "80dvh", width: "100%", border: 0, display: "block" }} />;
}

/** Prod: Bryce's Daily v1. */
export function SnugPage() {
    return <SnugFrame />;
}

/** Prod: Val's Daily v3 (NorrisQuest). */
export function NorrisQuestPage() {
    return <Page><NorrisQuest /></Page>;
}
