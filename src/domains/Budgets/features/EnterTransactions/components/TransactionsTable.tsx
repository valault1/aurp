import * as React from "react";
import Box from "@mui/material/Box";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Transaction } from "api/entityDefinitions";
import { format } from "date-fns";
import { TRANSACTION_DISPLAY_FORMAT } from "domains/Budgets/helpers/dateFormats";

export type TransactionsTableProps = {
  transactions?: Transaction[];
};

export const TransactionsTable: React.VFC<TransactionsTableProps> = ({
  transactions,
}) => {
  const columns: GridColDef[] = [
    {
      field: "date",
      headerName: "Date",
      flex: 1,
      editable: false,
    },
    {
      field: "amount",
      headerName: "Amount",
      flex: 1,
      editable: false,
    },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      editable: false,
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
      editable: false,
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
        pageSizeOptions={[5]}
        // checkboxSelection
        disableRowSelectionOnClick
      />
    </Box>
  );
};
