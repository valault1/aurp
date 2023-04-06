import { PrimaryButton } from "components/Form.elements";
import { MainContainer } from "components/MainPage.elements";
import { FormsTextInput } from "components/rhf/FormsTextInput";
import { Restaurant } from "domains/Restaurants/sharedTypes";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useAddRestaurantMutation } from "shared/hooks/useAddRestaurantMutation";
import { UserContext } from "shared/UserContext";

export const ManageRestaurants = () => {
  const { addRestaurant } = useAddRestaurantMutation();
  const { control, watch, setValue } = useForm<Restaurant>({
    defaultValues: { name: "", tags: [] },
  });
  const [lastSubmittedRestaurant, setLastSubmittedRestaurant] =
    React.useState<string>("");
  const { user } = React.useContext(UserContext);

  const restaurant = watch();

  const onSubmit = async () => {
    try {
      await addRestaurant({
        range: user.ranges.find((range) => range.entityName === "restaurant")
          .range,
        restaurant,
      });
      setLastSubmittedRestaurant(restaurant.name);
      setValue("name", "");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <MainContainer>
      Add a restaurant
      <br />
      <br />
      {/**This form disables autocomplete on the text input*/}
      <form autoComplete="off">
        <input
          autoComplete="false"
          name="hidden"
          type="text"
          style={{ display: "none" }}
        />
        <FormsTextInput
          control={control}
          label="Name of restaurant"
          name="name"
        />
      </form>
      <br />
      <PrimaryButton onClick={onSubmit}>Submit</PrimaryButton>
      {lastSubmittedRestaurant && (
        <>
          <br />
          Got it - added {lastSubmittedRestaurant}
        </>
      )}
    </MainContainer>
  );
};
