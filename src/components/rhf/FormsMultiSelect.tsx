import {
  FormsDropDown,
  FormsDropdownProps,
} from "components/rhf/FormsDropdown";
import * as React from "react";

export type FormsMultiSelectProps<T> = Omit<FormsDropdownProps<T>, "multiple">;

export const FormsMultiSelect = <T extends unknown>(
  props: FormsMultiSelectProps<T>
): JSX.Element => {
  return <FormsDropDown {...props} multiple />;
};
