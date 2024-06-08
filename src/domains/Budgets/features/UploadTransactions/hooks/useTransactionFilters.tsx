import { Transaction } from "api/entityDefinitions";
import {
  onlyRealTransactionsFilter,
  transactionsToRemoveFilter,
} from "domains/Budgets/features/UploadTransactions/helpers/transactionFilters";
import { MintTransactionRow } from "domains/Budgets/sharedTypes";
import * as React from "react";

export const useProcessRawTransactions = () => {
  const [rawCsvRows, setRawCsvRows] = React.useState<any[]>(undefined);
  const [rowsToDelete, setRowsToDelete] = React.useState<string[]>([]);
  const processedRows: MintTransactionRow[] = React.useMemo(() => {
    if (!rawCsvRows || rawCsvRows.length === 0) return [];
    return rawCsvRows.map((unprocessedTransaction, idx) => ({
      date: unprocessedTransaction.Date,
      description: unprocessedTransaction.Description,
      amount: unprocessedTransaction.Amount,
      category: unprocessedTransaction.Category,
      type: unprocessedTransaction["Transaction Type"],
      accountName: unprocessedTransaction["Account Name"],
      id: idx.toString(),
    }));
  }, [rawCsvRows]);

  const removedTransactions: MintTransactionRow[] = React.useMemo(() => {
    return processedRows.filter(transactionsToRemoveFilter);
  }, [processedRows]);

  const correctedTransactions: MintTransactionRow[] = React.useMemo(() => {
    // take removedTransactions, and add back in selected rows
    return processedRows
      .filter(onlyRealTransactionsFilter)
      .concat(
        removedTransactions.filter(
          (row) => rowsToDelete.find((id) => row.id === id) !== undefined
        )
      );
  }, [processedRows, removedTransactions, rowsToDelete]);

  const finalTransactions: Transaction[] = React.useMemo(() => {
    return correctedTransactions.map((row) => {
      const transaction: Transaction = {
        date: new Date(row.date),
        description: row.description,
        mintCategory: row.category,
        category: row.category,
        amount:
          Number(row.amount.substring(1)) * (row.type === "credit" ? -1 : 1),
        account: row.accountName,
        dateCreated: new Date(),
      };
      return transaction;
    });
  }, [correctedTransactions]);
  return {
    rawCsvRows,
    setRawCsvRows,
    removedTransactions,
    correctedTransactions,
    setRowsToDelete,
    finalTransactions,
  };
};
