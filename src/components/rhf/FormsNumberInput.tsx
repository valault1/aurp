import {
  FormsTextInput,
  FormsTextInputProps,
} from "components/rhf/FormsTextInput";
import * as React from "react";

export type FormsNumberInputProps = Omit<FormsTextInputProps, "type">;

export const FormsNumberInput: React.VFC<FormsNumberInputProps> = (props) => {
  return <FormsTextInput {...props} type="number" />;
};
