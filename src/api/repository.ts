// this file makes the calls, and returns formatted, typed objects

import axios from "axios";
import {
  ApiSheetRange,
  buildDeleteEntitiesRequest,
  buildGetEntitiesQuery,
  buildSheetIdsQuery,
  buildUserRangeQuery,
} from "api/requestBuilders";
import {
  Entity,
  EntityName,
  EntitySheetIds,
  EntitySheetRanges,
  ENTITY_NAMES,
  ENTITY_SHEET_NAMES,
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

  return cleanedValues.map((raw: string, index: number) => ({
    ...JSON.parse(raw),
    cellIndex: (index + 2).toString(),
  }));
};

export const getSheetIds = async ({
  accessToken,
}: {
  accessToken: string;
}): Promise<EntitySheetIds | undefined> => {
  const query = buildSheetIdsQuery(accessToken);

  const result = await axios.get(query.url, query.config);
  console.log({ sheetIdsQueryResult: result });

  let entitySheetIds: any = {};
  let sheets: any[] = result?.data?.sheets;
  console.log({ sheets });
  for (let entityName of ENTITY_NAMES) {
    let entitySheetName = ENTITY_SHEET_NAMES[entityName];
    let entitySheet = sheets.find(
      (sheet) => sheet.properties.title === entitySheetName
    );
    entitySheetIds[entityName] = entitySheet.properties.sheetId;
  }

  console.log({ entitySheetIds });

  return entitySheetIds;
};

export const getUserRanges = async ({
  userId,
  accessToken,
}: {
  userId: string;
  accessToken: string;
}): Promise<EntitySheetRanges | undefined> => {
  const queries = ENTITY_NAMES.map((entityName) => {
    return buildUserRangeQuery(entityName as EntityName, accessToken);
  });

  const results = await Promise.all(
    queries.map((query) => axios.get(query.url, query.config))
  );

  let entitySheetRanges: any = {};

  for (let i = 0; i < ENTITY_NAMES.length; i++) {
    let cellvalues = results[i].data?.values;
    if (!cellvalues) continue;
    let usedIdIndex = cellvalues[0].findIndex((id: string) => id === userId);
    let columnLetter = EXCEL_RANGES[usedIdIndex];
    entitySheetRanges[ENTITY_NAMES[i]] = `${columnLetter}2:${columnLetter}`;
  }

  return entitySheetRanges;
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

// note: only combines rows (vertically).
// Does this so that we don't send a ton of ranges.
// Currently the ranges are all exactly one tall and wide.
export const consolidateRanges = (ranges: ApiSheetRange[]): ApiSheetRange[] => {
  if (ranges.length === 1) return ranges;
  const sortedRanges = ranges.sort(
    (a, b) => Number(b.startRowIndex) - Number(a.startRowIndex)
  );
  const newRangeIndexes = [];
  let currentRowIndex = sortedRanges[0].startRowIndex;
  let startingIndex = currentRowIndex;
  for (let i = 1; i < sortedRanges.length; i++) {
    let cellNumber = sortedRanges[i].startRowIndex;
    let prevCellNumber = sortedRanges[i - 1].startRowIndex;
    if (cellNumber !== prevCellNumber - 1) {
      newRangeIndexes.push([prevCellNumber, startingIndex + 1]);
      startingIndex = cellNumber;
    }
  }

  newRangeIndexes.push([
    sortedRanges[sortedRanges.length - 1].startRowIndex,
    startingIndex + 1,
  ]);

  const defaultRange = ranges[0];
  const newRanges: ApiSheetRange[] = newRangeIndexes.map((range) => ({
    ...defaultRange,
    startRowIndex: range[0],
    endRowIndex: range[1],
  }));

  console.log({ newRanges: newRanges });
  return newRanges;
};

const getRangesToDelete = <T extends Entity>({
  entities,
  entityRange,
  entityName,
  sheetId,
}: {
  entities: T[];
  entityRange: string;
  entityName: EntityName;
  sheetId: string;
}): ApiSheetRange[] => {
  // delete entities from the bottom up. This way, we don't have to worry about shifting cell indexes.
  const sortedEntities = entities.sort(
    (a, b) => Number(b.cellIndex) - Number(a.cellIndex)
  );
  const columnLetter = entityRange.split(":")[0].split("2")[0];
  const columnNumber = EXCEL_RANGES.findIndex(
    (letter) => letter === columnLetter
  );

  const ranges = sortedEntities.map((e) => ({
    sheetId: Number(sheetId),
    startRowIndex: Number(e.cellIndex) - 1,
    endRowIndex: Number(e.cellIndex),
    startColumnIndex: columnNumber,
    endColumnIndex: columnNumber + 1,
  }));

  const consolidatedRanges = consolidateRanges(ranges);
  return consolidatedRanges;
};

// NOTE FOR FUTURE: I tested this. With large datasets, refetch is faster.
// Refetching also ends up taking less data transfer (32kb vs 4kb)
export const ENABLE_REFETCH_AFTER_DELETE_ENTITIES = true;

export const deleteEntities = async <T extends Entity>({
  accessToken,
  entityRange,
  entityName,
  entities,
  sheetId,
}: {
  accessToken: string;
  entityRange: string;
  entityName: EntityName;
  entities: T[];
  sheetId: string;
}): Promise<T[] | undefined> => {
  const request = buildDeleteEntitiesRequest({
    accessToken,
    entityRange,
    entityName,
    rangesToDelete: getRangesToDelete<T>({
      entities,
      entityRange,
      entityName,
      sheetId,
    }),
  });

  let result = await axios.post(request.url, request.body, request.config);

  return undefined;
  // BELOW: code is used if you want to get the values out of the delete request.
  // For this to work, you must also set includeSpreadsheetInResponse and responseIncludeGridData to true in requestBuilders function buildDeleteEntitiesRequest
  // let rowData =
  //   result.data?.updatedSpreadsheet?.sheets?.[0]?.data?.[0].rowData;
  // let values = rowData.map((row: any) => row.values[0].formattedValue);
  // return defaultValuesCleaner(values);
};
