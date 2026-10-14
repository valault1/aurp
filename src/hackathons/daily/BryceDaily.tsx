import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { BrinkArtSheet } from "./bryce/brink/ArtSheet";
import { Brink } from "./bryce/brink/Brink";
import { InkButton } from "./bryce/brink/ink";
import { SnugFrame } from "./ProdGames";

export function BryceDailyV1() {
  return <SnugFrame />;
}

export function BryceDailyV2() {
  const [view, setView] = useState<"play" | "art">("play");
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 1 }}>
        <InkButton primary={view === "play"} onClick={() => setView("play")}>Play</InkButton>
        <InkButton primary={view === "art"} onClick={() => setView("art")}>Art sheet</InkButton>
      </Box>
      {view === "play" ? <Brink /> : <BrinkArtSheet />}
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
