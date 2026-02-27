import { Box, Typography } from "@mui/material";

export function ValCurrency() {
    return (
        <Box sx={{ p: 4, textAlign: "center", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 4, color: "text.secondary" }}>
            <Typography variant="h5" fontWeight={700} mb={2}>Val's Currency Component</Typography>
            <Typography>Start building your currency input here!</Typography>
        </Box>
    );
}
