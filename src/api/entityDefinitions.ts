export const ENTITY_SHEET_NAMES = {
  restaurant: "RestaurantsV2",
  transaction: "Transactions",
};

export type EntityName = keyof typeof ENTITY_SHEET_NAMES;

export const ENTITY_NAMES = Object.keys(ENTITY_SHEET_NAMES) as EntityName[];

/** EntitySheetRange is a type to represent the range that should be queried for the logged in user for each entity */
export type EntitySheetRanges = {
  [key in EntityName]: string;
};

/** EntitySheetIds is a type to represent the range that should be queried for the logged in user for each entity */
export type EntitySheetIds = {
  [key in EntityName]: string;
};

export type Entity = {
  cellIndex?: string;
};

export type Restaurant = {
  name: string;
  tags: string[];
} & Entity;

export type Transaction = {
  date: Date;
  description: string;
  category: string;
  mintCategory: string;
  amount: number;
  dateCreated: Date;
  account: string;
} & Entity;
