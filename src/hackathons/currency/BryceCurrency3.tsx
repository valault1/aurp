import { useState } from "react";
import { Box, Typography, TextField, Button, useTheme, alpha } from "@mui/material";

export function BryceCurrency3() {
  const theme = useTheme();
  const [amount, setAmount] = useState("");

  return (
    <Box
      sx={{
        p: 4,
        textAlign: "center",
        border: `1px dashed ${alpha(theme.palette.text.primary, 0.2)}`,
        borderRadius: 4,
        width: 400,
      }}
    >
      <Typography variant="h5" fontWeight={700} mb={3}>
        🏦 Bank Deposit
      </Typography>

      <TextField label="Deposit Amount" value={amount} onChange={(e) => setAmount(e.target.value)} fullWidth />

      <Button variant="contained" sx={{ mt: 3 }}>
        Deposit
      </Button>
    </Box>
  );
}
