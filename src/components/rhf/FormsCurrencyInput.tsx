import { InputAdornment } from "@mui/material";
import {
  FormsNumberInput,
  FormsNumberInputProps,
} from "components/rhf/FormsNumberInput";
import * as React from "react";

export type FormsCurrencyInputProps = FormsNumberInputProps;

export const FormsCurrencyInput: React.VFC<FormsCurrencyInputProps> = (
  props
) => {
  return (
    <FormsNumberInput
      {...props}
      startAdornment={<InputAdornment position="start">$</InputAdornment>}
    />
  );
};
