import {
  FormControlLabel,
  FormGroup,
  Radio,
  Switch,
  TextField,
} from "@mui/material";
import * as React from "react";
import { Control, Controller, useForm } from "react-hook-form";

export const FormsTextInput: React.VFC<{
  control: Control<any, any>;
  label: string;
  name: string;
  type?: string;
}> = ({ control, label, name, type = "text" }) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field,
        fieldState: { invalid, isTouched, isDirty, error },
        formState,
      }) => {
        return (
          <FormGroup>
            <FormControlLabel
              control={<TextField {...field} type={type} label={label} />}
              label=""
            />
          </FormGroup>
        );
      }}
    />
  );
};
