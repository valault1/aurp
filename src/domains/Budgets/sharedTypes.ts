import { Transaction } from "api/entityDefinitions";

export type MintTransaction = {
  date: string;
  description: string;
  amount: string;
  category: string;
  type: string;
  accountName: string;
};

export type MintTransactionRow = MintTransaction & { id: string };

export type TransactionRow = Transaction & { id: number };
