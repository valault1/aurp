import { Box, Typography } from "@mui/material";
import { ShooterClient } from "./bryceShooter/ShooterClient";

/** The live build. Everything lands here; v2 and v3 are unused. */
export function BryceServerGameV1() {
  return <ShooterClient />;
}

export function BryceServerGameV2() {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h4">Bryce Server Game V2</Typography>
      <Typography sx={{ mt: 1, opacity: 0.6 }}>Unused — the shooter lives on v1.</Typography>
    </Box>
  );
}

export function BryceServerGameV3() {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h4">Bryce Server Game V3</Typography>
      <Typography sx={{ mt: 1, opacity: 0.6 }}>Unused — the shooter lives on v1.</Typography>
    </Box>
  );
}
