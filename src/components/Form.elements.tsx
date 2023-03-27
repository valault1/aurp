import styled from "@emotion/styled";
import { Button, ButtonProps, TextField, TextFieldProps } from "@mui/material";
import React from "react";

export const InputWrapper = styled.div(() => ({
  // for some reason, this gap doesn't show up?
  display: "flex",
  flexDirection: "column",
  gap: 8,
}));
export const LabelWrapper = styled.div(() => ({
  // paddingBottom: 8,
}));

export const InputRow = styled.div(() => ({
  display: "flex",
  gap: 8,
}));

const StyledTextInput = styled(TextField)<{}>({
  // input: {
  //   color: theme.colors.textPrimary,
  //   "&::placeholder": {
  //     color: "white",
  //   },
  // },
  // "& label.Mui-focused": {
  //   color: theme.colors.primary,
  // },
  // "& label": {
  //   color: theme.colors.primary,
  // },
  // "& .MuiOutlinedInput-root": {
  //   "& fieldset": {
  //     borderColor: theme.colors.primary,
  //   },
  //   "&:hover fieldset": {
  //     borderColor: theme.colors.primary,
  //   },
  //   "&.Mui-focused fieldset": {
  //     borderColor: theme.colors.primary,
  //   },
  // },
});
// Normal Text Field, but using the style defined above and defaulting variant to outlined
export const TextInput = (props: TextFieldProps) => (
  <StyledTextInput variant="outlined" {...props} />
);

const StyledPrimaryButton = styled(Button)<{}>({});
export const PrimaryButton = (props: ButtonProps) => (
  <StyledPrimaryButton variant="contained" {...props} />
);

const StyledSecondaryButton = styled(Button)<{}>({});
export const SecondaryButton = (props: ButtonProps) => (
  <StyledSecondaryButton color="secondary" variant="contained" {...props} />
);
