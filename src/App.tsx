import { ThemeProvider } from "@mui/material";
import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import NavBar from "./NavBar";
import { AppRoutes } from "./AppRoutes";
import { muiTheme, theme } from "./components/theme/theme";

export default function App() {
  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.textPrimary,
      }}
    >
      <ThemeProvider theme={muiTheme}>
        <Router>
          <NavBar />
          <AppRoutes />
        </Router>
      </ThemeProvider>
    </div>
  );
}
