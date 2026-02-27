import { createTheme } from "@mui/material/styles";

export type ThemeMode = "ice" | "midnight" | "cyberpunk" | "forest" | "sunset";

export const createAppTheme = (mode: ThemeMode) => {
  const isLight = mode === "ice";

  let backgroundDefault = "#0d0e15";
  let backgroundPaper = "#161824";
  let navbarColor = "#161824";
  let primaryMain = "#6366f1"; // Default Indigo

  switch (mode) {
    case "ice":
      backgroundDefault = "#f4f6f8";
      backgroundPaper = "#ffffff";
      navbarColor = "#0a0a0a";
      primaryMain = "#2563eb"; // Blue 600
      break;
    case "midnight":
      backgroundDefault = "#0d0e15";
      backgroundPaper = "#161824";
      navbarColor = "#161824";
      primaryMain = "#818cf8"; // Indigo 400
      break;
    case "cyberpunk":
      backgroundDefault = "#09090b";
      backgroundPaper = "#18181b";
      navbarColor = "#18181b";
      primaryMain = "#f0abfc"; // Fuchsia 300
      break;
    case "forest":
      backgroundDefault = "#1b2d22";
      backgroundPaper = "#253a2d";
      navbarColor = "#253a2d";
      primaryMain = "#4ade80"; // Green 400
      break;
    case "sunset":
      backgroundDefault = "#26112c";
      backgroundPaper = "#3d1b46";
      navbarColor = "#3d1b46";
      primaryMain = "#fb923c"; // Orange 400
      break;
  }

  return createTheme({
    palette: {
      mode: isLight ? "light" : "dark",
      primary: {
        main: primaryMain,
      },
      secondary: {
        main: "#dda15e",
      },
      background: {
        default: backgroundDefault,
        paper: backgroundPaper,
      },
      success: {
        main: "#6ba547",
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: navbarColor,
            backgroundImage: "none", // disables the auto darkening on dark mode
            color: "#ffffff", // Ensure text is white on the dark navbar
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
          },
        },
      },
    },
  });
};
