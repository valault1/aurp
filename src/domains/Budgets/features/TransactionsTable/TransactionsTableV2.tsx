import * as React from "react";
import Box from "@mui/material/Box";
import { Transaction } from "api/entityDefinitions";
import styled from "@emotion/styled";
import { formatDate } from "domains/Budgets/helpers/dateFormats";
import { formatCurrency } from "domains/Budgets/helpers/currencyFormatters";

export type TransactionsTableV2Props = {
  transactions?: Transaction[];
  setSelectedRows?: (arr: any[]) => void;
  updateTransactions: (entities: Transaction[]) => Promise<void>;
};

const TransactionRowWrapper = styled.div(() => ({
  display: "flex",
  flexDirection: "column",
  borderStyle: "solid",
}));

const TransactionInnerRowWrapper = styled.div(() => ({
  display: "flex",
  flexDirection: "row",
  width: "100%",
  padding: 4,
}));

const TransactionDetailWrapper = styled.b<{ flex: number }>(({ flex }) => ({
  flex,
  textAlign: "left",
}));

export const TransactionsTableV2: React.VFC<TransactionsTableV2Props> = ({
  transactions: originalTransactions,
  setSelectedRows,
  updateTransactions,
}) => {
  // we make a copy of transactions here, so that we can update it in memory without re-querying
  const [transactions, setTransactions] = React.useState(originalTransactions);

  // If the props change, update the state
  React.useMemo(() => {
    setTransactions(originalTransactions);
  }, [originalTransactions]);

  console.log({ transactions });

  return (
    <Box
      sx={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 1,
      }}
    >
      {transactions.map((transaction) => {
        return (
          <TransactionRowWrapper>
            <TransactionInnerRowWrapper>
              <TransactionDetailWrapper flex={3}>
                {formatDate(transaction.date)}
              </TransactionDetailWrapper>
              <TransactionDetailWrapper flex={2}>
                {formatCurrency(transaction.amount)}
              </TransactionDetailWrapper>
              <TransactionDetailWrapper flex={3}>
                {transaction.category}
              </TransactionDetailWrapper>
            </TransactionInnerRowWrapper>

            <TransactionInnerRowWrapper>
              <div> {transaction.description} </div>
            </TransactionInnerRowWrapper>
          </TransactionRowWrapper>
        );
      })}
    </Box>
  );
};
