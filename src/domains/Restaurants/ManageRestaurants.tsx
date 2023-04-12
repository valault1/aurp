import { Box, Stack, Typography } from "@mui/material";
import { PrimaryButton } from "components/Form.elements";
import { MainContainer } from "components/MainPage.elements";
import { FormsMultiSelect } from "components/rhf/FormsMultiSelect";
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
      setValue("tags", []);
    } catch (e) {
      console.error(e);
    }
  };

  const validateRestaurantInput = () => {
    return restaurant.name;
  };

  return (
    <MainContainer>
      <Stack direction="row" spacing={2}>
        <Box>
          <form autoComplete="off">
            <input
              autoComplete="false"
              name="hidden"
              type="text"
              style={{ display: "none" }}
            />
            <FormsTextInput
              control={control}
              description={"What kind of food do they have?"}
              descriptionPlacement="top"
              label="Name of restaurant"
              name="name"
            />
          </form>
          <br />
        </Box>
        <Box>
          <FormsMultiSelect<string>
            control={control}
            label={"Tags"}
            name={"tags"}
            description={"What kind of food do they have?"}
            descriptionPlacement="top"
            options={["Burgers", "Pizza", "Greek"]}
            defaultValue={["Burgers"]}
            getOptionLabel={(option: string) => option}
          />
          <br />
        </Box>
      </Stack>
      <PrimaryButton disabled={!validateRestaurantInput()} onClick={onSubmit}>
        Submit
      </PrimaryButton>
      {lastSubmittedRestaurant && (
        <>
          <Typography style={{ margin: 15 }}>
            {lastSubmittedRestaurant} has been added to your list!
          </Typography>
        </>
      )}

      <RestaurantList />
    </MainContainer>
  );
};
