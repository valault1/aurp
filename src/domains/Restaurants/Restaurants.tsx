import { Button } from "@mui/material";
import { MainContainer } from "components/MainPage.elements";
import * as React from "react";
import { useRestaurantsQuery } from "shared/hooks/useRestaurantsQuery";

export const Restaurants = () => {
  const { restaurants, tags } = useRestaurantsQuery();
  const [currentRestaurant, setRestaurant] = React.useState("");
  console.log({ restaurants, tags });

  const generateRestaurant = () => {
    let index = Math.floor(Math.random() * restaurants.length);

    setRestaurant(restaurants[index].name);
  };

  return (
    <MainContainer>
      Welcome to restaurants!
      <Button onClick={generateRestaurant}> I'm hungry </Button>
      {currentRestaurant && <>Chosen Restaurant : {currentRestaurant}</>}
    </MainContainer>
  );
};
