import * as React from "react";
import Box from "@mui/material/Box";
import { DataGrid, GridCellEditStopParams, GridColDef } from "@mui/x-data-grid";
import { Transaction } from "api/entityDefinitions";
import { format } from "date-fns";
import { TRANSACTION_DISPLAY_FORMAT } from "domains/Budgets/helpers/dateFormats";
import { useToasts } from "shared/hooks/useToasts";

export type TransactionsTableProps = {
  transactions?: Transaction[];
  setSelectedRows?: (arr: any[]) => void;
  updateTransactions: (entities: Transaction[]) => Promise<void>;
};

export const TransactionsTable: React.VFC<TransactionsTableProps> = ({
  transactions,
  setSelectedRows,
  updateTransactions,
}) => {
  const editable = true;
  const { onError } = useToasts();
  const categoryOptions = [
    "Mortgage",
    "Utilities",
    "Other House",
    "Tithing",
    "Gas",
    "Other Car",
    "Eating Out",
    "Groceries",
    "Technology",
    "House Things",
    "Hanging Out",
    "Education",
    "Gifts",
    "Travel",
    "Health",
    "Other",
    "Rent",
  ].sort();

  const columns: GridColDef[] = [
    {
      field: "date",
      headerName: "Date",
      // type can be: "string" | "number" | "boolean" | "date" | "dateTime" | "singleSelect" | "actions"
      type: "date",
      valueFormatter: ({ value }) =>
        format(new Date(value), TRANSACTION_DISPLAY_FORMAT),
      flex: 1,
      editable,
    },
    {
      field: "amount",
      headerName: "Amount",
      valueFormatter: ({ value }) => `$${value}`,
      flex: 1,
      editable,
    },
    {
      field: "category",
      headerName: "Category",
      type: "singleSelect",
      valueOptions: categoryOptions,
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

  const [rows, setRows] = React.useState<(Transaction & { id: number })[]>([]);

  React.useEffect(() => {
    setRows(
      transactions?.map((transaction, index) => ({
        ...transaction,
        id: index,
      }))
    );
  }, [transactions]);

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
        processRowUpdate={async (updatedRow, originalRow) => {
          updateTransactions([updatedRow]).catch((err) => {
            onError();
            // set the value back to the original, to show that the update didn't work
            setRows((prev) => {
              return prev.map((row) => {
                if (row.id === originalRow.id) return originalRow;
                return row;
              });
            });
            throw new Error("Error updating transaction");
          });

          return updatedRow;
        }}
        pageSizeOptions={[5]}
        checkboxSelection={!!setSelectedRows}
        onRowSelectionModelChange={(selectedRows) => {
          setSelectedRows?.(selectedRows);
        }}
      />
    </Box>
  );
};
