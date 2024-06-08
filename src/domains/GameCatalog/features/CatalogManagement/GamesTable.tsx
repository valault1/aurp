import * as React from "react";
import Box from "@mui/material/Box";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Game } from "api/entityDefinitions";
import { useToasts } from "shared/hooks/useToasts";
import { POSSIBLE_GAME_CATEGORIES } from "domains/GameCatalog/constants";

export type GamesTableProps = {
  games?: Game[];
  // setSelectedRows?: (arr: any[]) => void;
  // updateTransactions: (entities: Transaction[]) => Promise<void>;
};

export const GamesTable: React.VFC<GamesTableProps> = ({
  games,
  // setSelectedRows,
  // updateTransactions,
}) => {
  const editable = true;
  const { onError } = useToasts();
  const categoryOptions = POSSIBLE_GAME_CATEGORIES.sort();

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      // type can be: "string" | "number" | "boolean" | "date" | "dateTime" | "singleSelect" | "actions"
      type: "string",
      flex: 1,
    },
    {
      field: "description",
      headerName: "Description",
      type: "string",
      flex: 1,
    },
    {
      field: "category",
      headerName: "Category",
      type: "singleSelect",
      valueOptions: categoryOptions,
      flex: 1,
    },
    {
      field: "rules",
      headerName: "Rules",
      flex: 1,
      editable,
    },
  ];

  const [rows, setRows] = React.useState<(Game & { id: number })[]>([]);

  React.useEffect(() => {
    setRows(
      games?.map((transaction, index) => ({
        ...transaction,
        id: index,
      }))
    );
  }, [games]);

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
        // processRowUpdate={async (updatedRow, originalRow) => {
        //   updateTransactions([updatedRow]).catch((err) => {
        //     onError();
        //     // set the value back to the original, to show that the update didn't work
        //     setRows((prev) => {
        //       return prev.map((row) => {
        //         if (row.id === originalRow.id) return originalRow;
        //         return row;
        //       });
        //     });
        //     throw new Error("Error updating transaction");
        //   });

        //   return updatedRow;
        // }}
        pageSizeOptions={[5]}
        // checkboxSelection={!!setSelectedRows}
        // onRowSelectionModelChange={(selectedRows) => {
        //   setSelectedRows?.(selectedRows);
        // }}
      />
    </Box>
  );
};
