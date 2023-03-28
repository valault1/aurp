import { Box, Button, Container, TextField } from "@mui/material";
import { MainContainer } from "components/MainPage.elements";
import * as React from "react";

export const SettingsPage = () => {
  const [userName, setUserName] = React.useState(() => {
    const savedItem = localStorage.getItem("userName");
    const parsedItem = JSON.parse(savedItem);
    return parsedItem || "";
  });

  const handleUserName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(event.target.value);
  };

  React.useEffect(() => {
    localStorage.setItem("userName", JSON.stringify(userName));
  }, [userName]);

  return (
    <MainContainer>
      Welcome to the settings page!
      <Box sx={{ marginTop: 5 }}>Login to save your Restaurent Preferences</Box>
      <Box>
        <TextField
          id="username-input"
          label="userName"
          variant="standard"
          value={userName}
          onChange={handleUserName}
          // disabled={gameStarted}
        />
      </Box>
    </MainContainer>
  );
};
