import { Transaction } from "api/entityDefinitions";
import * as React from "react";
import { useGetEntities } from "shared/hooks/useGetEntities";
import { TransactionsTable } from "domains/Budgets/features/ViewTransactions/components/TransactionsTable";
import { TransactionForm } from "domains/Budgets/features/ViewTransactions/components/TransactionForm";
import styled from "@emotion/styled";
import { useDeleteEntities } from "shared/hooks/useDeleteEntities";
import { PrimaryButton } from "components/Form.elements";
import { functionTime } from "domains/TestingCenter/testHelpers";
import { CircularProgress } from "@mui/material";
import { useUpdateEntities } from "shared/hooks/useUpdateEntities";
import { startOfMonth } from "date-fns";
import { TransactionRow } from "domains/Budgets/sharedTypes";
import { useTransactionTableFilters } from "domains/Budgets/features/ViewTransactions/hooks/useTransactionTableFilters";

const TransactionViewsWrapper = styled.div(() => ({
  display: "flex",
  flexDirection: "column",
  gap: 20,
}));

export const TransactionViews = () => {
  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    setEntities,
    refetch,
  } = useGetEntities<Transaction>({
    entityName: "transaction",
  });

  const {
    deleteEntities: deleteTransactions,
    isLoading: isLoadingDeleteTransactions,
  } = useDeleteEntities<Transaction>({
    entityName: "transaction",
    setEntities,
    refetchEntities: refetch,
  });

  const { updateEntities: updateTransactions } = useUpdateEntities<Transaction>(
    {
      entityName: "transaction",
    }
  );

  const [selectedRows, setSelectedRows] = React.useState([]);
  const selectedTransactions = React.useMemo(() => {
    return selectedRows.map((i) => transactions[Number(i)]);
  }, [selectedRows, transactions]);

  const onDelete = async () => {
    let time = await functionTime({
      functionToTest: () => deleteTransactions(selectedTransactions),
    });
    console.log(`deleting took ${time} milliseconds`);
    setSelectedRows([]);
  };

  const { filteredTransactions, onClickThisMonth } = useTransactionTableFilters(
    {
      transactions,
    }
  );

  const transactionRows: TransactionRow[] = React.useMemo(() => {
    return (
      filteredTransactions?.map((transaction, idx) => ({
        ...transaction,
        id: idx,
      })) ?? []
    );
  }, [filteredTransactions]);

  return (
    <TransactionViewsWrapper>
      {isLoadingTransactions ? (
        <CircularProgress />
      ) : (
        <TransactionsTable
          transactions={transactionRows}
          setSelectedRows={setSelectedRows}
          updateTransactions={updateTransactions}
        />
      )}
      <PrimaryButton loading={isLoadingDeleteTransactions} onClick={onDelete}>
        Delete selected rows
      </PrimaryButton>
      <PrimaryButton onClick={onClickThisMonth}>
        filter to this month
      </PrimaryButton>
    </TransactionViewsWrapper>
  );
};
