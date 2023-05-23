import {
  FormsTextInputProps,
  FormsTextInput,
} from "components/rhf/FormsTextInput";
import * as React from "react";

export type FormsDateInputProps = Exclude<FormsTextInputProps, "date">;

export const FormsDateInput: React.VFC<FormsDateInputProps> = (props) => {
  return <FormsTextInput {...props} type="date" />;
};
