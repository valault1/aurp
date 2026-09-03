import { Box, Typography } from "@mui/material";
import { BonkGame } from "./val/BonkGame";

export function ValServerGameV1() {
  return <BonkGame />;
}

export function ValServerGameV2() {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h4">Val Server Game V2</Typography>
    </Box>
  );
}

export function ValServerGameV3() {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h4">Val Server Game V3</Typography>
    </Box>
  );
}
