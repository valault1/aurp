// this file makes the calls, and returns formatted, typed objects

import axios from "axios";
import { Restaurant } from "domains/Restaurants/sharedTypes";
import {
  buildGetRestaurantsRequest,
  buildUserRangeQuery,
} from "shared/helpers/requestBuilders";
import { EntitySheetRange } from "shared/UserContext";

let EXCEL_RANGES = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

export const getUserRanges = async (
  userId: string,
  accessToken: string
): Promise<EntitySheetRange[]> => {
  const query = buildUserRangeQuery("restaurant", accessToken);
  let result = await axios.get(query.url, query.config);
  let values = result.data?.values;
  if (!values) return [];
  let usedIdIndex = values[0].findIndex((id: string) => id === userId);
  let columnLetter = EXCEL_RANGES[usedIdIndex];
  return [
    { entityName: "restaurant", range: `${columnLetter}2:${columnLetter}` },
  ];
};

export const getRestaurants = async (
  accessToken: string,
  range: string
): Promise<Restaurant[]> => {
  const query = buildGetRestaurantsRequest(accessToken, range);
  let result = await axios.get(query.url, query.config);
  let values = result.data?.values;

  if (!values) return [];
  const cleanedValues: string[] = values.filter((value: any) => {
    try {
      JSON.parse(value);
      return true;
    } catch (err) {
      return false;
    }
  });

  return cleanedValues.map((raw: string) => JSON.parse(raw));
};
