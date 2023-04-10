import {
  Autocomplete,
  FormControlLabel,
  FormGroup,
  TextField,
} from "@mui/material";
import * as React from "react";
import { Control, Controller } from "react-hook-form";

export type FormsMultiSelectProps<T> = {
  control: Control<any, any>;
  label: string;
  name: string;
  placeholder?: string;
  description?: string;
  descriptionPlacement?: "end" | "start" | "top" | "bottom";
  defaultValue?: T[];
  options: T[];
  getOptionLabel: (option: T) => string;
  required?: boolean;
};

export const FormsMultiSelect = <T extends unknown>({
  control,
  label,
  name,
  options,
  getOptionLabel,
  description = "",
  placeholder = "",
  descriptionPlacement = "start",
  required = false,
}: FormsMultiSelectProps<T>): JSX.Element => {
  return (
    <Controller
      control={control}
      name={name}
      rules={{
        required,
      }}
      render={({ field: { onChange, ..._field } }) => (
        <FormGroup>
          <FormControlLabel
            label={description}
            labelPlacement={descriptionPlacement}
            control={
              <Autocomplete
                multiple
                options={options}
                onChange={(_, data) => {
                  onChange(data);
                }}
                filterSelectedOptions
                getOptionLabel={getOptionLabel}
                renderInput={(params) => {
                  return (
                    <TextField
                      {...params}
                      label={label}
                      variant="standard"
                      placeholder={placeholder}
                    />
                  );
                }}
                {..._field}
              />
            }
          />
        </FormGroup>
      )}
    />
  );
};
