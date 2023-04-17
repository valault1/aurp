import {
  Autocomplete,
  FormControlLabel,
  FormGroup,
  TextField,
} from "@mui/material";
import * as React from "react";
import { Control, Controller } from "react-hook-form";

export type FormsDropdownProps<T> = {
  control: Control<any, any>;
  label: string;
  name: string;
  placeholder?: string;
  description?: string;
  descriptionPlacement?: "end" | "start" | "top" | "bottom";
  options: T[];
  getOptionLabel: (option: T) => string;
  required?: boolean;
  multiple?: boolean;
};

export const FormsDropDown = <T extends unknown>({
  control,
  label,
  name,
  options,
  getOptionLabel,
  description,
  placeholder,
  descriptionPlacement,
  required = false,
  multiple,
}: FormsDropdownProps<T>): JSX.Element => {
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
                multiple={multiple}
                options={options}
                onChange={(_, data) => {
                  onChange(data);
                }}
                sx={{ width: 200 }}
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
