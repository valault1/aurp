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

const EnterTransactionsWrapper = styled.div(() => ({
  display: "flex",
  flexDirection: "column",
  gap: 20,
}));

export const EnterTransactions = () => {
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
  const selectedEntities = React.useMemo(() => {
    return selectedRows.map((i) => transactions[Number(i)]);
  }, [selectedRows, transactions]);

  const onDelete = async () => {
    let time = await functionTime({
      functionToTest: () => deleteTransactions(selectedEntities),
    });
    console.log(`function took ${time} milliseconds`);
    setSelectedRows([]);
  };

  return (
    <EnterTransactionsWrapper>
      <TransactionForm refetchTransactions={refetch} />
      {isLoadingTransactions ? (
        <CircularProgress />
      ) : (
        <TransactionsTable
          transactions={transactions}
          setSelectedRows={setSelectedRows}
          updateTransactions={updateTransactions}
        />
      )}
      <PrimaryButton loading={isLoadingDeleteTransactions} onClick={onDelete}>
        Delete selected rows
      </PrimaryButton>
    </EnterTransactionsWrapper>
  );
};
