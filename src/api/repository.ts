// this file makes the calls, and returns formatted, typed objects

import axios from "axios";
import {
  buildGetEntitiesQuery,
  buildUserRangeQuery,
} from "api/requestBuilders";
import {
  EntityName,
  EntitySheetRange,
  ENTITY_NAMES,
} from "./entityDefinitions";

let EXCEL_RANGES = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

const defaultValuesCleaner = (dbValues: any[]): any => {
  if (!dbValues) return [];
  const cleanedValues: string[] = dbValues.filter((value: any) => {
    try {
      JSON.parse(value);
      return true;
    } catch (err) {
      return false;
    }
  });

  return cleanedValues.map((raw: string) => JSON.parse(raw));
};

export const getUserRanges = async ({
  userId,
  accessToken,
}: {
  userId: string;
  accessToken: string;
}): Promise<EntitySheetRange | undefined> => {
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

  return defaultValuesCleaner(values);
};
