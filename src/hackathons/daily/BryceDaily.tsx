import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { Snug } from "./bryce/snug/Snug";
import { SnugArtSheet } from "./bryce/snug/ArtSheet";
import { Btn } from "./bryce/snug/parts";

export function BryceDailyV1() {
  const [view, setView] = useState<"play" | "art">("play");
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 0.75, p: 0.75, borderRadius: 999, background: "#f4ead6", boxShadow: "0 6px 18px rgba(30,15,8,.35)" }}>
          <Btn primary={view === "play"} onClick={() => setView("play")}>Play</Btn>
          <Btn primary={view === "art"} onClick={() => setView("art")}>Art sheet</Btn>
        </Box>
      </Box>
      {view === "play" ? <Snug /> : <SnugArtSheet />}
    </Box>
  );
}

export function BryceDailyV2() {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h4">Bryce Daily V2</Typography>
    </Box>
  );
}

export function BryceDailyV3() {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h4">Bryce Daily V3</Typography>
    </Box>
  );
}
