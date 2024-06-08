import * as React from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import Stack from "@mui/material/Stack";
import styled from "@emotion/styled";
import { theme } from "components/theme/theme";

const Input = styled("input")({
  display: "none",
});

const DragFileZone = styled.div<{ backgroundColor?: string }>(
  ({ backgroundColor }) => ({
    height: "100%",
    width: "100%",
    minHeight: "300px",
    maxHeight: "300px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: "2px",
    borderRadius: "1rem",
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    backgroundColor,
  })
);

export type UploadFileButtonProps = {
  buttonText?: string;
  accept?: string;
  onChange: (f: File) => void;
};

export default function UploadFileButton({
  accept,
  buttonText,
  onChange,
}: UploadFileButtonProps) {
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);
  const onDropHandler = (ev: any) => {
    let file = ev.dataTransfer.files[0];
    setIsDraggingFile(false);
    ev.stopPropagation();
    ev.preventDefault();
    onChange(file);
  };

  const onDragOver = (e: any) => {
    let event = e as Event;
    event.stopPropagation();
    event.preventDefault();
  };

  const onDragEnd = (e: any) => {
    setIsDraggingFile(false);

    e.stopPropagation();
    e.preventDefault();
  };
  const onDragEnter = (e: any) => {
    setIsDraggingFile(true);

    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <DragFileZone
        onDragOver={onDragOver}
        onDragLeave={onDragEnd}
        onDragEnter={onDragEnter}
        onDrop={onDropHandler}
        backgroundColor={isDraggingFile && theme.colors.secondary}
      >
        {isDraggingFile && (
          // Note: this "pointerEvents: none" makes it so that hovering over child events
          // With the file doesn't run any of the enter/leave drag events
          <h3 style={{ pointerEvents: "none" }}>Release to upload file</h3>
        )}
        {!isDraggingFile && (
          <>
            <h3>Drag file here</h3>
            <p>Or, if you prefer</p>
            <label htmlFor="contained-button-file">
              <Input
                accept={accept}
                id="contained-button-file"
                multiple
                type="file"
                onChange={(e) => onChange(e.target.files[0])}
              />
              <Button variant="contained" component="span">
                {buttonText || "Browse"}
              </Button>
            </label>
          </>
        )}
      </DragFileZone>
      {/* <label htmlFor="icon-button-file">
        <Input accept="image/*" id="icon-button-file" type="file" />
        <IconButton
          color="primary"
          aria-label="upload picture"
          component="span"
        >
          <PhotoCamera />
        </IconButton>
      </label> */}
    </Stack>
  );
}
