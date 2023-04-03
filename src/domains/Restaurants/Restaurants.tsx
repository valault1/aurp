import { Button } from "@mui/material";
import { MainContainer } from "components/MainPage.elements";
import * as React from "react";
import { mock_restaurants } from "./mocks";

export const Restaurants = () => {
  const [currentRestaurant, setRestaurant] = React.useState("");

  const generateRestaurant = () => {
    let placeholder = Math.floor(Math.random() * mock_restaurants.length);

    setRestaurant(mock_restaurants[placeholder].name);
  };

  return (
    <MainContainer>
      Welcome to restaurants!
      <Button onClick={generateRestaurant}> I'm hungry </Button>
      {currentRestaurant && <>Chosen Restaurant : {currentRestaurant}</>}
    </MainContainer>
  );
};
