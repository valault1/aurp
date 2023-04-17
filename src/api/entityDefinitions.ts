export const ENTITY_SHEET_NAMES = {
  restaurant: "RestaurantsV2",
  transaction: "Transactions",
};

export type EntityName = keyof typeof ENTITY_SHEET_NAMES;

export const ENTITY_NAMES = Object.keys(ENTITY_SHEET_NAMES) as EntityName[];

/** EntitySheetRange is a type to represent the range that should be queried for the logged in user for each entity */
export type EntitySheetRange = {
  [key in EntityName]: string;
};

export type Restaurant = {
  name: string;
  tags: string[];
};

export type Transaction = {
  date: string;
  description: string;
  category: string;
  amount: number;
};
