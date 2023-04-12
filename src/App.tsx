import { ThemeProvider } from "@mui/material";
import * as React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import NavBar from "./NavBar";
import { AppRoutes } from "./AppRoutes";
import { muiTheme, theme } from "./components/theme/theme";
import { UserContext } from "shared/UserContext";
import { useLogin } from "shared/hooks/useLogin";

export default function App() {
  const { user, loginFunction, logOutFunction } = useLogin();
  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.textPrimary,
      }}
    >
      <UserContext.Provider value={{ user, loginFunction, logOutFunction }}>
        <ThemeProvider theme={muiTheme}>
          <Router>
            <NavBar />
            <AppRoutes />
          </Router>
        </ThemeProvider>
      </UserContext.Provider>
    </div>
  );
}
