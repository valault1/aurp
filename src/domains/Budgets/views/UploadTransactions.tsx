import * as React from "react";
import { MainContainer } from "components/MainPage.elements";
import { UploadFileStep } from "domains/Budgets/features/UploadTransactions/UploadFileStep";
import { CorrectTransactionsStep } from "domains/Budgets/features/UploadTransactions/CorrectTransactionsStep";
import { GridColDef } from "@mui/x-data-grid";
import { Transaction } from "api/entityDefinitions";
import { TextField } from "@mui/material";

type UploadTransactionsState = "uploadFile" | "correctTransactions";

export const UploadTransactions = () => {
  const [currentStep, setCurrentStep] =
    React.useState<UploadTransactionsState>("uploadFile");

  const [rows, setRows] = React.useState<any[]>(undefined);

  const [rowsToDelete, setRowsToDelete] = React.useState<any[]>(undefined);

  const processedRows = React.useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return rows.map((unprocessedTransaction, idx) => ({
      date: unprocessedTransaction.Date,
      description: unprocessedTransaction.Description,
      amount: `$${unprocessedTransaction.Amount}`,
      category: unprocessedTransaction.Category,
      type: unprocessedTransaction["Transaction Type"],
      accountName: unprocessedTransaction["Account Name"],
      id: idx.toString(),
    }));
  }, [rows]);

  const columns: GridColDef[] = React.useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return Object.keys(rows[0]).map((propertyName) => ({
      field: propertyName,
    }));
  }, [rows]);

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

  console.log({ rowsToDelete });

  return (
    <MainContainer>
      {currentStep === "uploadFile" && (
        <UploadFileStep
          rows={rows}
          setRows={setRows}
          onNext={() => setCurrentStep("correctTransactions")}
          columns={columns}
        />
      )}
      {currentStep === "correctTransactions" && (
        <CorrectTransactionsStep
          rows={processedRows}
          columns={processedColumns}
          setRowsToDelete={setRowsToDelete}
        />
      )}
    </MainContainer>
  );
};
