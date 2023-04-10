import axios, { AxiosResponse } from "axios";
import { Restaurant } from "domains/Restaurants/sharedTypes";
import * as React from "react";
import { buildAddRestaurantRequest } from "shared/helpers/requestBuilders";
import { UserContext } from "shared/UserContext";

export type Mutation = {
  data?: string[][];
  isLoading: boolean;
  error: any;
};

export const useAddRestaurantMutation = () => {
  const [mutation, setMutation] = React.useState({
    data: undefined,
    isLoading: false,
    error: undefined,
  });
  const { user } = React.useContext(UserContext);

  const addRestaurant = async ({
    range,
    restaurant,
  }: {
    range: string;
    restaurant: Restaurant;
  }) => {
    if (user) {
      setMutation((oldQuery) => ({ ...oldQuery, isLoading: true }));
      const request = buildAddRestaurantRequest({
        accessToken: user.accessToken,
        range,
        restaurant,
      });
      await axios.post(request.url, request.body, request.config);
    }
  };

  const hasError = !!mutation.error;

  return {
    isLoading: mutation.isLoading,
    data: mutation.data,
    error: mutation.error,
    hasError,
    addRestaurant,
  };
};
