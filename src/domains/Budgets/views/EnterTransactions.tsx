import { Transaction } from "api/entityDefinitions";
import { MainContainer } from "components/MainPage.elements";
import * as React from "react";
import { useGetEntities } from "shared/hooks/useGetEntities";
import { TransactionsTable } from "domains/Budgets/features/EnterTransactions/components/TransactionsTable";
import { TransactionForm } from "domains/Budgets/features/EnterTransactions/components/TransactionForm";
import { Tab, TabsComponent } from "components/TabsComponent";
import styled from "@emotion/styled";

const EnterTransactionsWrapper = styled.div(() => ({
  display: "flex",
  flexDirection: "column",
  gap: 20,
}));

export const EnterTransactions = () => {
  const { data: transactions } = useGetEntities<Transaction>({
    entityName: "transaction",
  });

  return (
    <EnterTransactionsWrapper>
      <TransactionForm />
      <TransactionsTable transactions={transactions} />
    </EnterTransactionsWrapper>
  );
};
