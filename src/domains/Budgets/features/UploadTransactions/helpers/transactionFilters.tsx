import { MintTransactionRow } from "domains/Budgets/sharedTypes";

export const transactionsToRemoveFilter = (row: MintTransactionRow) => {
  return (
    (row.type === "credit" && row.accountName !== "Venmo") ||
    row.category === "Transfer"
  );
};

export const onlyRealTransactionsFilter = (row: MintTransactionRow) => {
  return !transactionsToRemoveFilter(row);
};
