import styled from "@emotion/styled";
import React from "react";
import { theme } from "./theme/theme";
import { Box, Tab, Tabs, Typography } from "@mui/material";

export const TabsWrapper = styled.div(() => ({
  display: "flex",
  justifyContent: "center",
  width: "100%",
  borderBottom: "2",
  borderColor: "divider",
}));

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
export function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

export function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

export type Tab = {
  label: React.ReactNode;
  id: string;
  component: React.ReactNode;
};

type TabsProps = {
  tabs: Tab[];
  ariaLabel: string;
};

export const TabsComponent = ({ tabs, ariaLabel }: TabsProps) => {
  const [value, setValue] = React.useState(0);
  return (
    <Box sx={{ width: "100%", color: theme.colors.textPrimary }}>
      <Tabs
        variant="scrollable"
        scrollButtons
        value={value}
        onChange={(e, newValue) => setValue(newValue)}
        aria-label={ariaLabel}
      >
        {tabs.map((tab, index) => (
          <Tab label={tab.label} {...a11yProps(index)} />
        ))}
      </Tabs>
      <TabsWrapper>
        {tabs.map((tab, index) => (
          <TabPanel value={value} index={index}>
            {tab.component}
          </TabPanel>
        ))}
      </TabsWrapper>
    </Box>
  );
};
