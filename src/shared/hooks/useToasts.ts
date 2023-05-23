import {
  AppearanceTypes,
  useToasts as standardUseToasts,
} from "react-toast-notifications";

export const useToasts = () => {
  const { addToast: standardAddToast } = standardUseToasts();

  const addToast = (
    message: string,
    appearance: AppearanceTypes = "success"
  ) => {
    standardAddToast(message, { appearance });
  };

  const onError = () =>
    addToast("Something went wrong. Please refresh and try again.", "error");

  const onSuccess = () => addToast("Changes saved!");

  return { addToast, onError, onSuccess };
};
