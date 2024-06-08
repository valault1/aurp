import { Transaction } from "api/entityDefinitions";

export const POSSIBLE_CATEGORIES = [
  "Eating Out",
  "Mortgage",
  "Utilities",
  "Other House",
  "Tithing",
  "Gas",
  "Other Car",
  "Groceries",
  "Technology",
  "House Things",
  "Hanging Out",
  "Education",
  "Gifts",
  "Travel",
  "Health",
  "Other",
  "Rent",
].sort();

export const defaultNewTransaction: Transaction = {
  date: new Date(),
  description: "",
  category: POSSIBLE_CATEGORIES[0],
  amount: 0,
  dateCreated: new Date(),
  account: "NOT SPECIFIED",
};
