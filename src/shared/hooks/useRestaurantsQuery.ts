import { getRestaurants } from "api/repository";
import * as React from "react";
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
      const restaurantRange = user.ranges["restaurant"];
      setQuery((prev) => ({ ...prev, isLoading: true }));
      getRestaurants(user.accessToken, restaurantRange)
        .then((restaurants) =>
          setQuery((prev) => ({ ...prev, data: restaurants, isLoading: false }))
        )
        .catch((error) => setQuery((prev) => ({ ...prev, error })));
    }
  }, [user]);

  return {
    isLoading: query.isLoading,
    data: query.data,
    error: query.error,
  };
};
