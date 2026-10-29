import { Box, Typography } from "@mui/material";
import { SongStudio } from "./val/SongStudio";

export function ValMusicV1() {
  return <SongStudio />;
}

export function ValMusicV2() {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="h5">Val v2</Typography>
      <Typography color="text.secondary">Coming soon</Typography>
    </Box>
  );
}

export function ValMusicV3() {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="h5">Val v3</Typography>
      <Typography color="text.secondary">Coming soon</Typography>
    </Box>
  );
}
