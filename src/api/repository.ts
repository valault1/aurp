// this file makes the calls, and returns formatted, typed objects

import axios from "axios";
import {
  buildGetEntitiesQuery,
  buildGetRestaurantsRequest,
  buildUserRangeQuery,
} from "api/requestBuilders";
import { Restaurant } from "shared/sharedTypes";
import {
  EntityName,
  EntitySheetRange,
  ENTITY_NAMES,
} from "./entityDefinitions";

let EXCEL_RANGES = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

export const getUserRanges = async (
  userId: string,
  accessToken: string
): Promise<EntitySheetRange | undefined> => {
  const queries = ENTITY_NAMES.map((entityName) => {
    return buildUserRangeQuery(entityName as EntityName, accessToken);
  });

  const results = await Promise.all(
    queries.map((query) => axios.get(query.url, query.config))
  );

  let allRanges: any = {};

  for (let i = 0; i < ENTITY_NAMES.length; i++) {
    let cellvalues = results[i].data?.values;
    if (!cellvalues) continue;
    let usedIdIndex = cellvalues[0].findIndex((id: string) => id === userId);
    let columnLetter = EXCEL_RANGES[usedIdIndex];
    allRanges[ENTITY_NAMES[i]] = `${columnLetter}2:${columnLetter}`;
  }

  return allRanges;
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

export const getEntities = async ({
  entityName,
  accessToken,
  range,
}: {
  entityName: EntityName;
  accessToken: string;
  range: string;
}): Promise<any> => {
  const query = buildGetEntitiesQuery({ entityName, accessToken, range });
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
