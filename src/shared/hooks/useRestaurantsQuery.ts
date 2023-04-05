import axios, { AxiosResponse } from "axios";
import * as React from "react";
import { selectRestaurants } from "shared/selectors/selectRestaurants";
import { UserContext } from "shared/UserContext";

const GOOGLE_SHEET_ID = "1SB6iJTv9u3RkHC5l7g9q2L8UeqKBt--AQNdqRUdk5UQ";
const GOOGLE_SHEETS_API_ENDPOINT =
  "https://sheets.googleapis.com/v4/spreadsheets/";
const GET_SPREADSHEET_URL = `${GOOGLE_SHEETS_API_ENDPOINT}${GOOGLE_SHEET_ID}`;
const GET_RESTAURANTS_URL = `${GET_SPREADSHEET_URL}${"/values/Restaurants"}`;

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

  const onError = React.useCallback(
    (err: any) => {
      setQuery({ data: undefined, isLoading: false, error: err });
    },
    [setQuery]
  );
  const onSuccess = React.useCallback(
    (res: AxiosResponse<any, any>) => {
      setQuery({ data: res.data.values, isLoading: false, error: undefined });
    },
    [setQuery]
  );

  React.useEffect(() => {
    if (user) {
      setQuery((oldQuery) => ({ ...oldQuery, isLoading: true }));
      axios
        .get(GET_RESTAURANTS_URL, {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
            Accept: "application/json",
          },
          params: {},
        })
        .then(onSuccess)
        .catch(onError);
    }
  }, [user, onSuccess, onError]);

  const hasError = !!query.error;

  const restaurants = React.useMemo(() => {
    return selectRestaurants(query.data);
  }, []);
  return { ...query, hasError };
};
