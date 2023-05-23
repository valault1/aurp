import { ENABLE_REFETCH_AFTER_DELETE_ENTITIES } from "api/repository";
import { AxiosRequestConfig } from "axios";
import { EntityName, ENTITY_SHEET_NAMES } from "./entityDefinitions";

const GOOGLE_SHEET_ID = "1SB6iJTv9u3RkHC5l7g9q2L8UeqKBt--AQNdqRUdk5UQ";
const GOOGLE_SHEETS_API_ENDPOINT =
  "https://sheets.googleapis.com/v4/spreadsheets";

export type QueryInfo = {
  url: string;
  config?: AxiosRequestConfig<any>;
};

export type MutationInfo = QueryInfo & {
  body: any;
};

// Documentation on sheets endpoints:
// https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get

//Get user ids endpoint: https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}
const RANGE_TO_QUERY_FOR_IDS = "1:1";
export const getUserRangeQueryUrl = (entityName: EntityName) =>
  `${GOOGLE_SHEETS_API_ENDPOINT}/${GOOGLE_SHEET_ID}/values/${ENTITY_SHEET_NAMES[entityName]}!${RANGE_TO_QUERY_FOR_IDS}`;
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

// https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}
//Get sheet endpoint: https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}
export const getSheetIdsQueryUrl = () =>
  `${GOOGLE_SHEETS_API_ENDPOINT}/${GOOGLE_SHEET_ID}`;
export const buildSheetIdsQuery = (accessToken: string): QueryInfo => ({
  url: getSheetIdsQueryUrl(),
  config: {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    params: {},
  },
});

//GET VALUES endpoint: https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}
export const entitiesQueryUrl = (entityName: EntityName, range: string) =>
  `${GOOGLE_SHEETS_API_ENDPOINT}/${GOOGLE_SHEET_ID}/values/${ENTITY_SHEET_NAMES[entityName]}!${range}`;
export const buildGetEntitiesQuery = ({
  accessToken,
  range,
  entityName,
}: {
  accessToken: string;
  range: string;
  entityName: EntityName;
}): QueryInfo => ({
  url: entitiesQueryUrl(entityName, range),
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
export const addEntityUrl = (range: string, entityName: EntityName) =>
  `${GOOGLE_SHEETS_API_ENDPOINT}/${GOOGLE_SHEET_ID}/values/${ENTITY_SHEET_NAMES[entityName]}!${range}:append?valueInputOption=RAW`;
export const buildAddEntityRequest = ({
  accessToken,
  range,
  entity,
  entityName,
}: {
  accessToken: string;
  range: string;
  entity: any;
  entityName: EntityName;
}): MutationInfo => ({
  url: addEntityUrl(range, entityName),
  config: {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  },
  body: {
    range: `${ENTITY_SHEET_NAMES[entityName]}!${range}`,
    majorDimension: "ROWS",
    values: [[JSON.stringify(entity)]],
  },
});

// We use append to insert information
// update: https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}
export const addEntitiesUrl = (range: string, entityName: EntityName) =>
  `${GOOGLE_SHEETS_API_ENDPOINT}/${GOOGLE_SHEET_ID}/values/${ENTITY_SHEET_NAMES[entityName]}!${range}:append?valueInputOption=RAW`;
export const buildAddEntitiesRequest = ({
  accessToken,
  range,
  entities,
  entityName,
}: {
  accessToken: string;
  range: string;
  entities: any[];
  entityName: EntityName;
}): MutationInfo => ({
  url: addEntityUrl(range, entityName),
  config: {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  },
  body: {
    range: `${ENTITY_SHEET_NAMES[entityName]}!${range}`,
    majorDimension: "COLUMNS",
    values: [entities.map((entity) => JSON.stringify(entity))],
  },
});

// We use batchUpdate to delete cells
// doc: https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
// post: https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}:batchUpdate

export type ApiSheetRange = {
  sheetId: number;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
};

export const deleteEntitiesUrl = () =>
  `${GOOGLE_SHEETS_API_ENDPOINT}/${GOOGLE_SHEET_ID}:batchUpdate`;
export const buildDeleteEntitiesRequest = ({
  accessToken,
  entityRange,
  entityName,
  rangesToDelete,
}: {
  accessToken: string;
  entityRange: string;
  entityName: EntityName;
  rangesToDelete: ApiSheetRange[];
}): MutationInfo => ({
  url: deleteEntitiesUrl(),
  config: {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  },
  body: {
    requests: [
      ...rangesToDelete.map((rangeToDelete) => ({
        deleteRange: {
          range: rangeToDelete,
          shiftDimension: "ROWS",
        },
      })),
    ],
    includeSpreadsheetInResponse: false,
    responseRanges: [`${ENTITY_SHEET_NAMES[entityName]}!${entityRange}`],
    responseIncludeGridData: false,
  },
});
