import { Box, Typography, useTheme, alpha } from "@mui/material";

export function ValCurrency() {
    const theme = useTheme();
    return (
        <Box sx={{ p: 4, textAlign: "center", border: `1px dashed ${alpha(theme.palette.text.primary, 0.2)}`, borderRadius: 4, color: "text.secondary" }}>
            <Typography variant="h5" fontWeight={700} mb={2}>Val's Currency Component</Typography>
            <Typography>Start building your currency input here!</Typography>
        </Box>
    );
}
