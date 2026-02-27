import { Routes, Route, Navigate, Link } from "react-router-dom";
import { Box, AppBar, Toolbar, Typography, Button, Container, Paper, Chip, IconButton } from "@mui/material";
import { Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Login } from "@/components/Login";
import { Settings } from "@/components/Settings";
import { TextInput } from "@/hackathons/text_input/TextInput";
import { Currency } from "@/hackathons/currency/Currency";

export function App() {
  const { token, username, loading, logout } = useAuth();

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
          <Chip
            label="UI Reimagined"
            component={Link}
            to="/about"
            clickable
            sx={{
              textDecoration: "none",
              fontWeight: 800,
              letterSpacing: "1px",
              mr: 4,
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              color: "inherit",
              border: "1px solid rgba(255,255,255,0.3)",
              backdropFilter: "blur(4px)",
              '&:hover': {
                backgroundColor: "rgba(255, 255, 255, 0.25)",
              }
            }}
          />
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
            <Button
              color="inherit"
              component={Link}
              to="/text"
              sx={{ fontWeight: "bold" }}
            >
              Text
            </Button>
            <Button
              color="inherit"
              component={Link}
              to="/currency"
              sx={{ fontWeight: "bold" }}
            >
              Currency
            </Button>
          </Box>
          {token && (
            <Button color="inherit" onClick={logout} sx={{ mr: 2 }}>
              Logout
            </Button>
          )}

          <IconButton
            color="inherit"
            component={Link}
            to="/settings"
            aria-label="settings"
          >
            <SettingsIcon size={20} />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<Navigate to="/text-input" />} />
        <Route
          path="/about"
          element={
            <Box
              sx={{
                minHeight: "calc(100vh - 64px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                p: 4,
                background: "#0a0a0a",
                position: "relative",
                overflow: "hidden",
                color: "#ffffff"
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: "20%",
                  left: "10%",
                  width: "500px",
                  height: "500px",
                  background: "radial-gradient(circle, rgba(100,50,255,0.15) 0%, rgba(0,0,0,0) 70%)",
                  filter: "blur(40px)",
                  borderRadius: "50%",
                  animation: "pulse 10s ease-in-out infinite alternate",
                  "@keyframes pulse": {
                    "0%": { transform: "scale(1)" },
                    "100%": { transform: "scale(1.2)" },
                  },
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: "10%",
                  right: "10%",
                  width: "600px",
                  height: "600px",
                  background: "radial-gradient(circle, rgba(0,200,255,0.1) 0%, rgba(0,0,0,0) 70%)",
                  filter: "blur(50px)",
                  borderRadius: "50%",
                  animation: "pulseReverse 12s ease-in-out infinite alternate",
                  "@keyframes pulseReverse": {
                    "0%": { transform: "scale(1.2)" },
                    "100%": { transform: "scale(1)" },
                  },
                }}
              />
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 4, md: 8 },
                  borderRadius: "24px",
                  background: "rgba(255, 255, 255, 0.03)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  maxWidth: "800px",
                  textAlign: "center",
                  zIndex: 1,
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: "0.2em",
                    color: "rgba(255, 255, 255, 0.5)",
                    mb: 2,
                    display: "block"
                  }}
                >
                  By Bryce & Val
                </Typography>
                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 900,
                    mb: 3,
                    fontSize: { xs: "3rem", md: "5rem" },
                    background: "linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.5) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "-0.02em",
                  }}
                >
                  UI Reimagined
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 300,
                    color: "rgba(255,255,255,0.7)",
                    mb: 6,
                    lineHeight: 1.8,
                    maxWidth: "600px",
                    mx: "auto",
                  }}
                >
                  We believe true innovation requires breaking conventions.
                  Experience newer, cooler, and radically experimental ways to interact
                  with digital spaces.
                </Typography>
                <Button
                  variant="outlined"
                  href="/text-input"
                  sx={{
                    px: 6,
                    py: 2,
                    borderRadius: "100px",
                    fontWeight: 500,
                    fontSize: "1rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#ffffff",
                    borderColor: "rgba(255,255,255,0.3)",
                    transition: "all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)",
                    "&:hover": {
                      background: "#ffffff",
                      color: "#0a0a0a",
                      borderColor: "#ffffff",
                      transform: "translateY(-2px)",
                      boxShadow: "0 10px 30px rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  Explore Interfaces
                </Button>
              </Paper>
            </Box>
          }
        />
        <Route path="/text" element={<TextInput />} />
        <Route path="/currency" element={<Currency />} />
        <Route path="/login" element={<Login />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Box>
  );
}

export default App;
