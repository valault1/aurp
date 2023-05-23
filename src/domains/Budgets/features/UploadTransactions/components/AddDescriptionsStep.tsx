import { Box } from "@mui/material";
import {
  DataGrid,
  GridCellEditStopParams,
  MuiEvent,
  GridCellEditStopReasons,
  GridColDef,
} from "@mui/x-data-grid";
import { PrimaryButton } from "components/Form.elements";
import { MintTransactionRow } from "domains/Budgets/sharedTypes";
import * as React from "react";

type AddDescriptionsStepProps = {
  rows: MintTransactionRow[];
  columns: GridColDef[];
  setRowsToDelete: (arr: any[]) => void;
  isLoadingSave: boolean;
  onSave: VoidFunction;
};

export const AddDescriptionsStep = ({
  rows,
  columns,
  setRowsToDelete,
  isLoadingSave,
  onSave,
}: AddDescriptionsStepProps) => {
  return (
    <>
      <Box sx={{ height: "400px" }}>
        These are your remaining transactions <br></br>
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
      <PrimaryButton onClick={onSave}>Save</PrimaryButton>
    </>
  );
};
