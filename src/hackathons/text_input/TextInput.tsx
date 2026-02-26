import { Box, Typography, Tabs, Tab } from "@mui/material";
import { useState } from "react";
import { Rearranger } from "./Rearranger";
import { BattleInput } from "./BattleInput";

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export function TextInput() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={value} onChange={handleChange} aria-label="bad input competition tabs">
          <Tab label="Val" />
          <Tab label="Bryce" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <Rearranger />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
          <BattleInput />
        </div>
      </TabPanel>
    </Box>
  );
}
