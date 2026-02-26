import { createContext, useState, type ReactNode, useContext } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme } from "@/theme";

type ThemeContextType = {
  isDark: boolean;
  toggleDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const toggleDarkMode = () => setIsDark(!isDark);

  return (
    <ThemeProvider theme={createAppTheme(isDark)}>
      <ThemeContext.Provider value={{ isDark, toggleDarkMode }}>
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
