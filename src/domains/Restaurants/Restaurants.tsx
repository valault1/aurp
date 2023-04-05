import { PrimaryButton } from "components/Form.elements";
import { MainContainer } from "components/MainPage.elements";
import * as React from "react";
import { useRestaurantsQuery } from "shared/hooks/useRestaurantsQuery";

export const Restaurants = () => {
  const { restaurants, tags } = useRestaurantsQuery();
  const [currentRestaurant, setRestaurant] = React.useState("");

  const generateRestaurant = () => {
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
    <MainContainer>
      Welcome to restaurants!
      <br />
      <br />
      <PrimaryButton onClick={generateRestaurant}> I'm hungry </PrimaryButton>
      {currentRestaurant && (
        <>
          You should eat at: <br />
          <br />
          {currentRestaurant}
        </>
      )}
    </MainContainer>
  );
};
