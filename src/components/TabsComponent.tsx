import styled from "@emotion/styled";
import React from "react";
import { theme } from "./theme/theme";
import { Box, Tab as TabComponent, Tabs } from "@mui/material";

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
      {value === index && <Box>{children}</Box>}
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
  orientation?: "horizontal" | "vertical";
};

export const TabsComponent = ({
  tabs,
  ariaLabel,
  orientation = "horizontal",
}: TabsProps) => {
  const [value, setValue] = React.useState(0);
  return (
    <Box
      sx={{
        ...(orientation === "horizontal"
          ? { width: "100%", height: "100%", flexDirection: "column" }
          : {
              width: "100%",
              height: "100%",
              flexDirection: "row",
            }),
        color: theme.colors.textPrimary,
        display: "flex",
      }}
    >
      <Tabs
        variant="scrollable"
        scrollButtons
        orientation={orientation}
        value={value}
        onChange={(e, newValue) => setValue(newValue)}
        aria-label={ariaLabel}
        sx={{ borderRight: 1, borderColor: theme.colors.primary }}
      >
        {tabs.map((tab, index) => (
          <TabComponent label={tab.label} key={tab.id} {...a11yProps(index)} />
        ))}
      </Tabs>
      <TabsWrapper>
        {tabs.map((tab, index) => (
          <TabPanel value={value} index={index} key={tab.id}>
            {tab.component}
          </TabPanel>
        ))}
      </TabsWrapper>
    </Box>
  );
};
