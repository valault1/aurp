import { Transaction } from "api/entityDefinitions";
import * as React from "react";
import { useGetEntities } from "shared/hooks/useGetEntities";
import { TransactionsTable } from "domains/Budgets/features/ViewTransactions/components/TransactionsTable";
import styled from "@emotion/styled";
import { useDeleteEntities } from "shared/hooks/useDeleteEntities";
import { PrimaryButton } from "components/Form.elements";
import { functionTime } from "domains/TestingCenter/testHelpers";
import { CircularProgress } from "@mui/material";
import { useUpdateEntities } from "shared/hooks/useUpdateEntities";
import { TransactionRow } from "domains/Budgets/sharedTypes";
import { useTransactionTableFilters } from "domains/Budgets/features/ViewTransactions/hooks/useTransactionTableFilters";
import { formatFilterDate } from "domains/Budgets/helpers/dateFormats";
import { useAddEntity } from "shared/hooks/useAddEntity";
import { TransactionForm } from "domains/Budgets/features/ViewTransactions/components/TransactionForm";
import { TransactionsTableV2 } from "domains/Budgets/features/TransactionsTable/TransactionsTableV2";

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

  const { addEntity: addTransaction, isLoading: isLoadingAddTransaction } =
    useAddEntity<Transaction>({ entityName: "transaction" });

  const { updateEntities: updateTransactions } = useUpdateEntities<Transaction>(
    {
      entityName: "transaction",
    }
  );

  const [selectedRows, setSelectedRows] = React.useState([]);

  const onDelete = async () => {
    let time = await functionTime({
      functionToTest: () => deleteTransactions(selectedTransactions),
    });
    console.log(`deleting took ${time} milliseconds`);
    setSelectedRows([]);
  };

  const {
    filteredTransactions,
    onClickThisMonth,
    minDateFilter,
    maxDateFilter,
  } = useTransactionTableFilters({
    transactions,
  });

  const selectedTransactions = React.useMemo(() => {
    return selectedRows.map((i) => filteredTransactions[Number(i)]);
  }, [selectedRows, filteredTransactions]);

  const transactionRows: TransactionRow[] = React.useMemo(() => {
    return (
      filteredTransactions?.map((transaction, idx) => ({
        ...transaction,
        id: idx,
      })) ?? []
    );
  }, [filteredTransactions]);

  const transactionsSum = React.useMemo(() => {
    return filteredTransactions.reduce(
      (accumulator, currentTransaction) =>
        accumulator + Number(currentTransaction.amount),
      0
    );
  }, [filteredTransactions]);

  console.log({ transactions, filteredTransactions, selectedTransactions });

  return (
    <TransactionViewsWrapper>
      {isLoadingTransactions ? (
        <CircularProgress />
      ) : (
        <TransactionsTableV2
          transactions={transactionRows}
          setSelectedRows={setSelectedRows}
          updateTransactions={updateTransactions}
        />
      )}
      <TransactionForm refetchTransactions={refetch} />

      <div>{`Showing transactions from ${formatFilterDate(
        minDateFilter
      )} to ${formatFilterDate(maxDateFilter)}`}</div>

      <PrimaryButton loading={isLoadingDeleteTransactions} onClick={onDelete}>
        Delete selected rows
      </PrimaryButton>
      <PrimaryButton onClick={onClickThisMonth}>
        filter to this month
      </PrimaryButton>
      <div>total spent this month: {transactionsSum}</div>
    </TransactionViewsWrapper>
  );
};
