import { Box, Typography, Paper, Container, FormControl, Select, MenuItem, SelectChangeEvent } from "@mui/material";
import { useTheme } from "@/context/ThemeContext";
import type { ThemeMode } from "@/theme";

const THEME_OPTIONS: { value: ThemeMode; label: string; description: string }[] = [
    { value: "ice", label: "Ice Theme", description: "Clean, cool-toned bright aesthetic." },
    { value: "midnight", label: "Midnight Theme", description: "Deep, elegant dark aesthetic." },
    { value: "cyberpunk", label: "Cyberpunk Theme", description: "High-contrast sci-fi aesthetic." },
    { value: "forest", label: "Forest Theme", description: "Moody, lush, premium earthy theme." },
    { value: "sunset", label: "Sunset Theme", description: "Warm, retro-wave aesthetic." },
];

export function Settings() {
    const { themeMode, setThemeMode } = useTheme();

    const handleThemeChange = (event: SelectChangeEvent<string>) => {
        setThemeMode(event.target.value as ThemeMode);
    };

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Typography variant="h4" fontWeight={900} mb={4}>
                Settings
            </Typography>

            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    background: "background.paper",
                }}
            >
                <Typography variant="h6" fontWeight={700} mb={3}>
                    Appearance
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" mb={2} textTransform="uppercase" letterSpacing={1}>
                            Theme Preference
                        </Typography>

                        <FormControl fullWidth variant="outlined">
                            <Select
                                value={themeMode}
                                onChange={handleThemeChange}
                                displayEmpty
                            >
                                {THEME_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value} sx={{ py: 1.5 }}>
                                        <Box>
                                            <Typography fontWeight={600}>{option.label}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {option.description}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                    </Box>
                </Box>
            </Paper>
        </Container>
    );
}
