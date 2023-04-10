import { AxiosResponse } from "axios";
import * as React from "react";
import { getRestaurants } from "shared/helpers/repository";
import { UserContext } from "shared/UserContext";

export type RestaurantQuery = {
  data?: string[][];
  isLoading: boolean;
  error: any;
};

export const useRestaurantsQuery = () => {
  const [query, setQuery] = React.useState({
    data: undefined,
    isLoading: false,
    error: undefined,
  });
  const { user } = React.useContext(UserContext);

  React.useEffect(() => {
    if (user) {
      const restaurantRange = user.ranges.find(
        (r) => r.entityName === "restaurant"
      ).range;
      const restaurants = getRestaurants(
        user.accessToken,
        restaurantRange
      ).then((restaurants) =>
        setQuery((prev) => ({ ...prev, data: restaurants }))
      );
    }
  }, [user]);

  const hasError = !!query.error;

  return {
    isLoading: query.isLoading,
    data: query.data,
    error: query.error,
    hasError,
    restaurants: query.data,
  };
};
