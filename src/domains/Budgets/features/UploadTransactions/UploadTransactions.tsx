import * as React from "react";
import { MainContainer } from "components/MainPage.elements";
import { GridColDef } from "@mui/x-data-grid";
import { UploadFileStep } from "domains/Budgets/features/UploadTransactions/components/UploadFileStep";
import { CorrectTransactionsStep } from "domains/Budgets/features/UploadTransactions/components/CorrectTransactionsStep";
import { AddDescriptionsStep } from "domains/Budgets/features/UploadTransactions/components/AddDescriptionsStep";
import { useProcessRawTransactions } from "domains/Budgets/features/UploadTransactions/hooks/useTransactionFilters";
import { useAddEntities } from "shared/hooks/useAddEntities";
import { Transaction } from "api/entityDefinitions";
import { useToasts } from "shared/hooks/useToasts";

type UploadTransactionsState =
  | "uploadFile"
  | "correctTransactions"
  | "addDescriptions";

export const UploadTransactions = () => {
  const [currentStep, setCurrentStep] =
    React.useState<UploadTransactionsState>("uploadFile");
  const { isLoading: isLoadingAddTransactions, addEntities: saveTransactions } =
    useAddEntities<Transaction>({ entityName: "transaction" });

  const { onSuccess, onError } = useToasts();

  const {
    rawCsvRows,
    setRawCsvRows,
    removedTransactions,
    correctedTransactions,
    setRowsToDelete,
    finalTransactions,
  } = useProcessRawTransactions();

  const onSave = async () => {
    try {
      await saveTransactions(finalTransactions);
      onSuccess();
    } catch {
      onError();
    }
  };

  const rawCsvColumns: GridColDef[] = React.useMemo(() => {
    if (!rawCsvRows || rawCsvRows.length === 0) return [];
    return Object.keys(rawCsvRows[0]).map((propertyName) => ({
      field: propertyName,
    }));
  }, [rawCsvRows]);

  const processedColumns: GridColDef[] = [
    {
      field: "date",
      type: "date",
      valueGetter: ({ value }) => value && new Date(value),
      editable: true,
    },
    {
      field: "amount",
      editable: true,
    },
    {
      field: "category",
      editable: true,
      type: "singleSelect",
      valueOptions: ["United Kingdom", "Spain", "Brazil"],
    },
    {
      field: "description",
      editable: true,
    },
    {
      field: "type",
    },
    {
      field: "accountName",
    },
  ];

  return (
    <MainContainer>
      {currentStep === "uploadFile" && (
        <UploadFileStep
          rows={rawCsvRows}
          setRows={setRawCsvRows}
          onNext={() => setCurrentStep("correctTransactions")}
          columns={rawCsvColumns}
        />
      )}
      {currentStep === "correctTransactions" && (
        <CorrectTransactionsStep
          rows={removedTransactions}
          columns={processedColumns}
          setRowsToDelete={setRowsToDelete}
          onNext={() => setCurrentStep("addDescriptions")}
        />
      )}
      {currentStep === "addDescriptions" && (
        <AddDescriptionsStep
          rows={correctedTransactions}
          columns={processedColumns}
          setRowsToDelete={setRowsToDelete}
          isLoadingSave={isLoadingAddTransactions}
          onSave={onSave}
        />
      )}
    </MainContainer>
  );
};
