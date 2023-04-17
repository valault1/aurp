import { Box, Paper, Typography } from "@mui/material";
import { PrimaryButton } from "components/Form.elements";
import { MainContainer } from "components/MainPage.elements";
import * as React from "react";
import { Restaurant } from "api/entityDefinitions";
import { useGetEntities } from "shared/hooks/useGetEntities";

export const Restaurants = () => {
  const { data: restaurants } = useGetEntities<Restaurant>({
    entityName: "restaurant",
  });
  const [currentRestaurant, setRestaurant] = React.useState("");
  const background = require("shared/img/background.jpg");

  const generateRestaurant = () => {
    if (restaurants.length === 0) return;
    let index = Math.floor(Math.random() * restaurants.length);
    // Make sure we don't give them the same one again
    while (
      restaurants[index].name === currentRestaurant &&
      restaurants.length > 1
    ) {
      index = Math.floor(Math.random() * restaurants.length);
    }
    setRestaurant(restaurants[index].name);
  };

  return (
    <MainContainer
      style={{
        backgroundImage: `url(${background})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        position: "absolute",
        overflow: "none",
        justifyContent: "center",
      }}
    >
      <Paper
        elevation={5}
        style={{
          width: "30%",
          height: "30%",
          minWidth: "100px",
          minHeight: "200px",
        }}
      >
        <Box style={{ padding: 10, margin: "auto", textAlign: "center" }}>
          <Typography> Welcome to Restaurants</Typography>
          <PrimaryButton onClick={generateRestaurant}>I'm hungry</PrimaryButton>
          <Typography>
            {currentRestaurant && (
              <>
                You should eat at: <br />
                <br />
                {currentRestaurant}
              </>
            )}
          </Typography>
        </Box>
      </Paper>
    </MainContainer>
  );
};

//    backgroundImage: `url(${background})`,
// backgroundPosition: "center",
// backgroundSize: "cover",
// height: "100vh",
