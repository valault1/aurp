import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";

export function Navigation() {
  const location = useLocation();
  const { isDark, toggleDarkMode } = useTheme();

  const currentTab = ["/", "/about"].includes(location.pathname)
    ? location.pathname
    : false;

  return (
    <Box sx={{ width: "100%", borderBottom: 1, borderColor: "divider" }}>
      <Tabs value={currentTab} aria-label="navigation tabs">
        <Tab label="Home" value="/" component={Link} to="/" />
        <Tab label="About" value="/about" component={Link} to="/about" />
        <Tab
          label="Dark Mode"
          value="/darkmode"
          component={Link}
          to="/darkmode"
        />
      </Tabs>
    </Box>
  );
}
