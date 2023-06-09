import { FormControlLabel, FormGroup, Switch } from "@mui/material";
import * as React from "react";
import { Control, Controller } from "react-hook-form";

export const FormsSwitch: React.VFC<{
  control: Control<any, any>;
  label: string;
  name: string;
  labelPlacement?: "end" | "start" | "top" | "bottom";
  disabled?: boolean;
}> = ({ control, label, name, labelPlacement = "top", disabled }) => {
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
              control={<Switch {...field} disabled={disabled} />}
              label={label}
              labelPlacement={labelPlacement}
            />
          </FormGroup>
        );
      }}
    />
  );
};
