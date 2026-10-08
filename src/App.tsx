import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { Box, AppBar, Toolbar, Typography, Button, Container, Paper, Chip, IconButton, alpha, useTheme } from "@mui/material";
import { Settings as SettingsIcon, Code2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Login } from "@/components/Login";
import { Settings } from "@/components/Settings";
import { DevHub } from "@/components/DevHub";
import { TextInput } from "@/hackathons/text_input/TextInput";
import { Currency } from "@/hackathons/currency/Currency";
import { Frogger } from "@/hackathons/frogger/Frogger";
import { GameClones } from "@/hackathons/gameClones/GameClones";
import { VolumeInput } from "@/hackathons/volumeInput/VolumeInput";
import { SimpleCompetition } from "@/hackathons/simpleCompetition/SimpleCompetition";
import { Apex } from "@/hackathons/apex/Apex";
import { ServerGame } from "@/hackathons/serverGame/ServerGame";
import { SnugPage, NorrisQuestPage } from "@/hackathons/daily/ProdGames";
import { Daily } from "@/hackathons/daily/Daily";
import { motion } from "framer-motion";

export function App() {
  const { token, username, loading, logout } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY <= 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) return <Typography>Loading...</Typography>;

  const navItems = [
    { label: "Apex", path: "/apex" },
    { label: "Snug", path: "/snug" },
    { label: "NorrisQuest", path: "/norrisquest" },
  ];

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
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          opacity: atTop ? 1 : 0,
          pointerEvents: atTop ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Chip
            label="UI Reimagined"
            component={Link}
            to="/about"
            clickable
            sx={{
              textDecoration: "none",
              fontWeight: location.pathname === "/about" ? 900 : 700,
              letterSpacing: "0.5px",
              mr: 2,
              backgroundColor: location.pathname === "/about"
                ? alpha(theme.palette.primary.main, 0.2)
                : "rgba(255, 255, 255, 0.05)",
              color: "#ffffff",
              border: `1px solid ${location.pathname === "/about"
                ? theme.palette.primary.main
                : "rgba(255,255,255,0.1)"}`,
              backdropFilter: "blur(4px)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.3),
                transform: "translateY(-1px)",
              }
            }}
          />
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Button
                  key={item.path}
                  color="inherit"
                  component={Link}
                  to={item.path}
                  sx={{
                    fontWeight: isActive ? 800 : 500,
                    px: 3,
                    borderRadius: "12px",
                    position: "relative",
                    color: isActive ? "#ffffff" : "rgba(255,255,255,0.6)",
                    transition: "all 0.2s ease",
                    '&:hover': {
                      color: "#ffffff",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    }
                  }}
                >
                  <Box component="span" sx={{ position: "relative", zIndex: 2 }}>
                    {item.label}
                  </Box>
                  {isActive && (
                    <motion.div
                      layoutId="navHighlight"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      style={{
                        position: "absolute",
                        bottom: "4px",
                        left: "20%",
                        right: "20%",
                        height: "2px",
                        background: theme.palette.primary.main,
                        boxShadow: `0 0 10px ${theme.palette.primary.main}`,
                        borderRadius: "2px",
                        zIndex: 1,
                      }}
                    />
                  )}
                </Button>
              );
            })}
          </Box>
          {token && (
            <Button color="inherit" onClick={logout} sx={{ mr: 1, opacity: 0.7 }}>
              Logout
            </Button>
          )}

          <IconButton
            color="inherit"
            component={Link}
            to="/dev"
            title="Dev"
            sx={{
              backgroundColor: location.pathname === "/dev" ? alpha(theme.palette.primary.main, 0.1) : "transparent",
              color: location.pathname === "/dev" ? theme.palette.primary.main : "inherit",
              border: `1px solid ${location.pathname === "/dev" ? alpha(theme.palette.primary.main, 0.3) : "transparent"}`,
            }}
          >
            <Code2 size={20} />
          </IconButton>
          <IconButton
            color="inherit"
            component={Link}
            to="/settings"
            sx={{
              backgroundColor: location.pathname === "/settings" ? alpha(theme.palette.primary.main, 0.1) : "transparent",
              color: location.pathname === "/settings" ? theme.palette.primary.main : "inherit",
              border: `1px solid ${location.pathname === "/settings" ? alpha(theme.palette.primary.main, 0.3) : "transparent"}`,
            }}
          >
            <SettingsIcon size={20} />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<Navigate to="/apex" />} />
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
                  href="/apex"
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
        <Route path="/text/*" element={<TextInput />} />
        <Route path="/currency/*" element={<Currency />} />
        <Route path="/frogger/*" element={<Frogger />} />
        <Route path="/gameclones/*" element={<GameClones />} />
        <Route path="/volume/*" element={<VolumeInput />} />
        <Route path="/simple/*" element={<SimpleCompetition />} />
        <Route path="/apex/*" element={<Apex />} />
        <Route path="/servergame/*" element={<ServerGame />} />
        <Route path="/snug/*" element={<SnugPage />} />
        <Route path="/norrisquest/*" element={<NorrisQuestPage />} />
        <Route path="/daily/*" element={<Daily />} />
        <Route path="/login" element={<Login />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dev" element={<DevHub />} />
      </Routes>
    </Box>
  );
}

export default App;
