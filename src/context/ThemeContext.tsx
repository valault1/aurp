import { createContext, useState, useEffect, type ReactNode, useContext } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createAppTheme, type ThemeMode } from "@/theme";

type ThemeContextType = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const VALID_THEMES: ThemeMode[] = ["ice", "midnight", "cyberpunk", "forest", "sunset"];

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("app_theme") as ThemeMode;
    return VALID_THEMES.includes(saved) ? saved : "midnight";
  });

  const setThemeMode = (mode: ThemeMode) => {
    localStorage.setItem("app_theme", mode);
    setThemeModeState(mode);
  };

  return (
    <ThemeProvider theme={createAppTheme(themeMode)}>
      <CssBaseline />
      <ThemeContext.Provider value={{ themeMode, setThemeMode }}>
        {children}
      </ThemeContext.Provider>
    </ThemeProvider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeContextProvider");
  }
  return context;
}
