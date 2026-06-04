import { Box, Typography, useTheme } from "@mui/material";

export function BryceVolumeInputV1() {
  const theme = useTheme();

  return (
    <Box sx={{ p: 4, borderRadius: 2, bgcolor: "background.paper", boxShadow: theme.shadows[4] }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Bryce's Volume Input V1</Typography>
      {/* Implementation goes here */}
    </Box>
  );
} 
