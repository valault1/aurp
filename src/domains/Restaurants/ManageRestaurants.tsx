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
  console.log(restaurant);

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

  const validateRestaurentInput = () => {
    return restaurant.name;
  };

  return (
    <MainContainer>
      <Stack direction="row" spacing={2}>
        <Box>
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
              description={"What kind of food do they have?"}
              descriptionPlacement="top"
              label="Name of restaurant"
              name="name"
            />
          </form>
          <br />
        </Box>
        <Box>
          {/**This form disables autocomplete on the text input*/}
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
      <PrimaryButton disabled={!validateRestaurentInput()} onClick={onSubmit}>
        Submit
      </PrimaryButton>
      {lastSubmittedRestaurant && (
        <>
          <br />
          {lastSubmittedRestaurant} has been added to your list!
        </>
      )}

      <Typography>
        See All Restaurants on your list :
        {restaurants &&
          restaurants.map((restaurant: Restaurant) => {
            return (
              <Stack direction="row" spacing={0.25} margin={0.5}>
                <Box
                  component="span"
                  sx={{
                    minWidth: 200,
                    height: 30,
                    padding: 0.25,
                    border: "1px solid #F08080",
                    "&:hover": {
                      border: "1px solid #FFD6A5",
                    },
                  }}
                >
                  {restaurant.name}
                </Box>
                <Box
                  component="span"
                  sx={{
                    width: 200,
                    height: 30,
                    padding: 0.25,
                    border: "1px solid #F08080",
                    "&:hover": {
                      border: "1px solid #FFD6A5",
                    },
                  }}
                >
                  {restaurant.tags}
                </Box>
              </Stack>
            );
          })}
      </Typography>
    </MainContainer>
  );
};
