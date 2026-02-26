import { Routes, Route, Navigate } from "react-router-dom";
import { Box, AppBar, Toolbar, Typography, Button } from "@mui/material";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Login } from "@/components/Login";
import { WeatherDisplay } from "@/components/WeatherDisplay";
import { Navigation } from "@/components/Navigation";
import { Sunset } from "./components/Sunset";
import { AppRoutes } from "@/components/AppRoutes";

export function App() {
  const { isDark, toggleDarkMode } = useTheme();
  const { token, username, loading, logout } = useAuth();
  const { token, loading, logout } = useAuth();

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "background.default",
        color: "text.primary",
      }}
    >
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Bun + React
          </Typography>
          <Button color="inherit" onClick={toggleDarkMode}>
            {isDark ? "☀️" : "🌙"}
          </Button>
          {token && (
            <Button color="inherit" onClick={logout}>
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Navigation />

      <Routes>
        <Route
          path="/"
          element={
            token ? (
              <Box sx={{ p: 3 }}>
                <Typography variant="h4">Welcome, {username}!</Typography>
                <WeatherDisplay />
              </Box>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/about"
          element={
            <Box sx={{ p: 3 }}>
              <Typography variant="h4">About</Typography>
            </Box>
          }
        />
        <Route
          path="/darkmode"
          element={
            <Box sx={{ p: 3 }}>
              <Sunset />
            </Box>
          }
        />
        <Route path="/login" element={<Login />} />
      </Routes>
      <AppRoutes />
    </Box>
  );
}

export default App;
