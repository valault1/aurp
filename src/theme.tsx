import { createTheme } from "@mui/material/styles";

export type ThemeMode = "ice" | "midnight" | "cyberpunk" | "forest" | "sunset";

export const createAppTheme = (mode: ThemeMode) => {
  const isLight = mode === "ice";

  let backgroundDefault = "#0d0e15";
  let backgroundPaper = "#161824";
  let navbarColor = "#161824";

  switch (mode) {
    case "ice":
      backgroundDefault = "#f4f6f8";
      backgroundPaper = "#ffffff";
      navbarColor = "#0a0a0a";
      break;
    case "midnight":
      backgroundDefault = "#0d0e15";
      backgroundPaper = "#161824";
      navbarColor = "#161824";
      break;
    case "cyberpunk":
      backgroundDefault = "#09090b";
      backgroundPaper = "#18181b";
      navbarColor = "#18181b";
      break;
    case "forest":
      backgroundDefault = "#1b2d22";
      backgroundPaper = "#253a2d";
      navbarColor = "#253a2d";
      break;
    case "sunset":
      backgroundDefault = "#26112c";
      backgroundPaper = "#3d1b46";
      navbarColor = "#3d1b46";
      break;
  }

  return createTheme({
    palette: {
      mode: isLight ? "light" : "dark",
      primary: {
        main: "#40386c",
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
