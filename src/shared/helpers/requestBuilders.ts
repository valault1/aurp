import { AxiosRequestConfig } from "axios";
import { Restaurant } from "domains/Restaurants/sharedTypes";

const GOOGLE_SHEET_ID = "1SB6iJTv9u3RkHC5l7g9q2L8UeqKBt--AQNdqRUdk5UQ";
const GOOGLE_SHEETS_API_ENDPOINT =
  "https://sheets.googleapis.com/v4/spreadsheets";

const RESTAURANTS_SHEET_NAME = "RestaurantsV2";

export type EntityName = "restaurant";

const SHEET_NAMES = {
  restaurant: RESTAURANTS_SHEET_NAME,
};

export type QueryInfo = {
  url: string;
  config?: AxiosRequestConfig<any>;
};

export type MutationInfo = QueryInfo & {
  body: any;
};

// Documentation on sheets endpoints:
// https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get

//GET VALUES endpoint: https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}
export const restaurantsQueryUrl = (range: string) =>
  `${GOOGLE_SHEETS_API_ENDPOINT}/${GOOGLE_SHEET_ID}/values/${SHEET_NAMES["restaurant"]}!${range}`;
export const buildGetRestaurantsRequest = (
  accessToken: string,
  range: string
): QueryInfo => ({
  url: restaurantsQueryUrl(range),
  config: {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    params: {},
  },
});

//Get user ids endpoint: https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}
const RANGE_TO_QUERY_FOR_IDS = "1:1";
export const getUserRangeQueryUrl = (entityName: EntityName) =>
  `${GOOGLE_SHEETS_API_ENDPOINT}/${GOOGLE_SHEET_ID}/values/${SHEET_NAMES[entityName]}!${RANGE_TO_QUERY_FOR_IDS}`;
export const buildUserRangeQuery = (
  entityName: EntityName,
  accessToken: string
): QueryInfo => ({
  url: getUserRangeQueryUrl(entityName),
  config: {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    params: {},
  },
});

// We use append to insert information
// update: https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}
export const RESTAURANTS_UPDATE_URL = (range: string) =>
  `${GOOGLE_SHEETS_API_ENDPOINT}/${GOOGLE_SHEET_ID}/values/${RESTAURANTS_SHEET_NAME}!${range}:append?valueInputOption=RAW`;
export const buildAddRestaurantRequest = ({
  accessToken,
  range,
  restaurant,
}: {
  accessToken: string;
  range: string;
  restaurant: Restaurant;
}): MutationInfo => ({
  url: RESTAURANTS_UPDATE_URL(range),
  config: {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  },
  body: {
    range: `${RESTAURANTS_SHEET_NAME}!${range}`,
    majorDimension: "ROWS",
    values: [[JSON.stringify(restaurant)]],
  },
});
