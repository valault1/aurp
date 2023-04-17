import * as React from "react";
import Box from "@mui/material/Box";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Transaction } from "api/entityDefinitions";
import { Stack, Dialog } from "@mui/material";
import { SecondaryButton, PrimaryButton } from "components/Form.elements";
import UploadFileButton from "components/UploadFileButton";
import styled from "@emotion/styled";

const csv = require("csvtojson");

const UploadTransactionsWrapper = styled.div(() => ({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  height: "100%",
}));

export type UploadFileStepProps = {
  rows: any[] | undefined;
  setRows: (rows: any[]) => void;
  onNext: () => void;
  columns: GridColDef[];
};

export const UploadFileStep: React.VFC<UploadFileStepProps> = ({
  rows,
  setRows,
  onNext,
  columns,
}) => {
  const [uploadedFile, setUploadedFile] = React.useState<File>(undefined);
  const [isWarningDialogOpen, setIsWarningDialogOpen] = React.useState(false);
  const processFile = (f: File) => {
    console.log("processing file");
    console.log({ f });
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      let rows = await csv({
        output: "json",
      }).fromString(text);
      setRows(rows.map((row: any, idx: number) => ({ ...row, id: idx })));
    };
    setUploadedFile(f);
    reader.readAsText(f);
  };

  const clearData = () => {
    setUploadedFile(undefined);
    setRows(undefined);
  };

  return (
    <UploadTransactionsWrapper>
      {!rows && (
        <>
          <div>
            <h3>Upload your transactions (.csv only)</h3>
          </div>
          <UploadFileButton accept=".csv" onChange={processFile} />
        </>
      )}
      {rows && (
        <Box
          sx={{
            height: "450px",
          }}
        >
          <p>Data from file: {uploadedFile.name}</p>
          <DataGrid
            columnVisibilityModel={{
              // Hide id column
              id: false,
            }}
            rows={rows}
            columns={columns}
          />
          <br></br>
          <Stack direction="row" justifyContent="space-between">
            <SecondaryButton onClick={() => setIsWarningDialogOpen(true)}>
              Use a different file
            </SecondaryButton>
            <PrimaryButton onClick={onNext}>Next step</PrimaryButton>
          </Stack>
        </Box>
      )}
      <Dialog open={isWarningDialogOpen}>
        Are you sure you want to clear your file?
        <SecondaryButton onClick={() => setIsWarningDialogOpen(false)}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          onClick={() => {
            setIsWarningDialogOpen(false);
            clearData();
          }}
        >
          Confirm
        </PrimaryButton>
      </Dialog>
    </UploadTransactionsWrapper>
  );
};
