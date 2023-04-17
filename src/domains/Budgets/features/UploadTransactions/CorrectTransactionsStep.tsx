import { Box } from "@mui/material";
import {
  DataGrid,
  GridCellEditStopParams,
  MuiEvent,
  GridCellEditStopReasons,
  GridColDef,
} from "@mui/x-data-grid";
import * as React from "react";

type CorrectTransactionsStepProps = {
  rows: any[];
  columns: GridColDef[];
  setRowsToDelete: (arr: any[]) => void;
};

export const CorrectTransactionsStep = ({
  rows,
  columns,
  setRowsToDelete,
}: CorrectTransactionsStepProps) => {
  return (
    <Box sx={{ height: "400px" }}>
      <DataGrid
        columnVisibilityModel={{
          // Hide id column
          id: false,
        }}
        rows={rows}
        columns={columns}
        onCellEditStop={(params: GridCellEditStopParams, event: MuiEvent) => {
          if (params.reason === GridCellEditStopReasons.cellFocusOut) {
            event.defaultMuiPrevented = true;
          }
          console.log("they edited something.");
          console.log({ params, event });
        }}
        checkboxSelection
        onRowSelectionModelChange={(selectedRows) => {
          setRowsToDelete(selectedRows);
        }}
      />
    </Box>
  );
};
