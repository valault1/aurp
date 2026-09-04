import { Box, Typography } from "@mui/material";
import { ShooterClient } from "./bryceShooter/ShooterClient";
import { ArenaClient } from "./provingGrounds/ArenaClient";

/** NETLAB — the twitch shooter. */
export function BryceServerGameV1() {
  return <ShooterClient />;
}

/** PROVING GROUNDS — point-and-click RPG, farm then duel. */
export function BryceServerGameV2() {
  return <ArenaClient />;
}

export function BryceServerGameV3() {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h4">Bryce Server Game V3</Typography>
      <Typography sx={{ mt: 1, opacity: 0.6 }}>Unused — the shooter lives on v1.</Typography>
    </Box>
  );
}
