import * as React from "react";
import Box from "@mui/material/Box";
import {
  DataGrid,
  GridCellEditStopParams,
  GridCellEditStopReasons,
  GridColDef,
  GridRowId,
  MuiEvent,
} from "@mui/x-data-grid";
import { Transaction } from "api/entityDefinitions";
import { format } from "date-fns";
import { TRANSACTION_DISPLAY_FORMAT } from "domains/Budgets/helpers/dateFormats";

export type TransactionsTableProps = {
  transactions?: Transaction[];
  setSelectedRows: (arr: any[]) => void;
};

export const TransactionsTable: React.VFC<TransactionsTableProps> = ({
  transactions,
  setSelectedRows,
}) => {
  const editable = true;
  const columns: GridColDef[] = [
    {
      field: "date",
      headerName: "Date",
      flex: 1,
      editable,
    },
    {
      field: "amount",
      headerName: "Amount",
      flex: 1,
      editable,
    },
    {
      field: "category",
      headerName: "Category",
      type: "singleSelect",
      valueOptions: ["United Kingdom", "Spain", "Brazil"],
      flex: 1,
      editable,
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
      editable,
    },
  ];

  const rows = transactions?.map((transaction, index) => ({
    ...transaction,
    amount: `$${transaction.amount}`,
    date: format(new Date(transaction.date), TRANSACTION_DISPLAY_FORMAT),
    id: index,
  }));
  return (
    <Box
      sx={{
        height: 400,
        width: "80%",
        minWidth: "500px",
        textAlign: "center",
      }}
    >
      <DataGrid
        rows={rows || []}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 100,
            },
          },
        }}
        onCellEditStop={(params: GridCellEditStopParams, event: MuiEvent) => {
          if (params.reason === GridCellEditStopReasons.cellFocusOut) {
            event.defaultMuiPrevented = true;
          }
          console.log("they edited something.");
          console.log({ params, event });
        }}
        pageSizeOptions={[5]}
        checkboxSelection
        onRowSelectionModelChange={(selectedRows) => {
          setSelectedRows(selectedRows);
        }}
      />
    </Box>
  );
};
