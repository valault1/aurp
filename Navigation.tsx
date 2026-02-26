import * as React from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { Link, useLocation } from "react-router";

export default function Navigation() {
  const location = useLocation();
  // In a real app, this state would likely come from a ThemeContext
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
    // Logic to update your theme context would go here
  };

  // Ensure the value matches one of the tabs, or false if not found
  const currentTab = ["/", "/about"].includes(location.pathname)
    ? location.pathname
    : false;

  return (
    <Box sx={{ width: "100%", borderBottom: 1, borderColor: "divider" }}>
      <Tabs value={currentTab} aria-label="navigation tabs">
        <Tab label="Home" value="/" component={Link} to="/" />
        <Tab label="About" value="/about" component={Link} to="/about" />

        <Tab
          label={isDarkMode ? "Light Mode" : "Dark Mode"}
          value="dark-mode"
          onClick={toggleDarkMode}
          component="div"
        />
      </Tabs>
    </Box>
  );
}
