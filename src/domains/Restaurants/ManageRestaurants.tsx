import { PrimaryButton } from "components/Form.elements";
import { MainContainer } from "components/MainPage.elements";
import { FormsTextInput } from "components/rhf/FormsTextInput";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useAddEntityMutation } from "shared/hooks/useAddEntityMutation";
import { Restaurant } from "shared/sharedTypes";

export const ManageRestaurants = () => {
  const { addEntity: addRestaurant } = useAddEntityMutation<Restaurant>({
    entityName: "restaurant",
  });
  const { control, watch, setValue } = useForm<Restaurant>({
    defaultValues: { name: "", tags: [] },
  });
  const [lastSubmittedRestaurant, setLastSubmittedRestaurant] =
    React.useState<string>("");

  const restaurant = watch();

  const onSubmit = async () => {
    try {
      await addRestaurant(restaurant);
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
