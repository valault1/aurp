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
  description?: string;
  descriptionPlacement?: "end" | "start" | "top" | "bottom";
  defaultValue?: T[];
  options: T[];
  getOptionLabel: (option: T) => string;
};

export const FormsMultiSelect = <T extends unknown>({
  control,
  label,
  name,
  defaultValue,
  options,
  getOptionLabel,
  description = "",
  descriptionPlacement = "start",
}: FormsMultiSelectProps<T>): JSX.Element => {
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
              control={
                <Autocomplete
                  multiple
                  id="tags-outlined"
                  options={options}
                  getOptionLabel={getOptionLabel}
                  defaultValue={defaultValue}
                  filterSelectedOptions
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={label}
                      placeholder="Favorites"
                    />
                  )}
                />
              }
              label={description}
              labelPlacement={descriptionPlacement}
            />
          </FormGroup>
        );
      }}
    />
  );
};
