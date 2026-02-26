import { Box, Typography, Tabs, Tab } from "@mui/material";
import { useState } from "react";
import { Rearranger } from "./Rearranger";

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
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export function TextInput() {
    const [value, setValue] = useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={value} onChange={handleChange} aria-label="bad input competition tabs">
                    <Tab label="rearranger" />
                    <Tab label="option 2" />
                    <Tab label="option 3" />
                </Tabs>
            </Box>
            <TabPanel value={value} index={0}>
                <Rearranger />
            </TabPanel>
            <TabPanel value={value} index={1}>
                <Typography variant="h5">option 2</Typography>
            </TabPanel>
            <TabPanel value={value} index={2}>
                <Typography variant="h5">option 3</Typography>
            </TabPanel>
        </Box>
    );
}
