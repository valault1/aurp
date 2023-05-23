import { Transaction } from "api/entityDefinitions";
import { FormsCurrencyInput } from "components/rhf/FormsCurrencyInput";
import { FormsTextInput } from "components/rhf/FormsTextInput";
import * as React from "react";
import { useForm } from "react-hook-form";
import styled from "@emotion/styled";
import { format } from "date-fns";
import { PrimaryButton } from "components/Form.elements";
import { useAddEntity } from "shared/hooks/useAddEntity";
import { FormsDropDown } from "components/rhf/FormsDropdown";
import { DATABASE_TRANSACTION_DATE_FORMAT } from "domains/Budgets/helpers/dateFormats";

const BudgetFormInput = styled.div(() => ({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  alignItems: "start",
  paddingTop: 20,
  width: "100%",
}));

const InputWrapper = styled.div(() => ({
  minWidth: 100,
}));
const InputsWrapper = styled.div(() => ({
  display: "flex",
  flexDirection: "row",
}));

export const TransactionForm = () => {
  const { control, watch, reset } = useForm<Transaction>({
    defaultValues: {
      amount: 0,
      date: new Date(),
      category: null,
      description: "",
    },
  });

  const { addEntity: addTransaction, isLoading: isLoadingAddTransaction } =
    useAddEntity<Transaction>({ entityName: "transaction" });

  const transaction = watch();

  const onSubmit = async () => {
    await addTransaction(transaction);
    reset();
  };

  return (
    <form onSubmit={onSubmit}>
      <BudgetFormInput>
        <h2>Add a transaction</h2>

        <InputsWrapper>
          <InputWrapper>
            <FormsTextInput
              control={control}
              label="Date"
              name="date"
              autoFocus
            />
          </InputWrapper>
          <InputWrapper>
            <FormsCurrencyInput
              control={control}
              label="Amount"
              name="amount"
            />
          </InputWrapper>
          <InputWrapper>
            <FormsDropDown<string>
              control={control}
              label="Category"
              name="category"
              getOptionLabel={(option) => option}
              options={["Restaurants", "House things", "electronics"]}
            />
          </InputWrapper>
          <InputWrapper>
            <FormsTextInput
              control={control}
              label="Description"
              name="description"
            />
          </InputWrapper>
        </InputsWrapper>

        <PrimaryButton loading={isLoadingAddTransaction} type="submit">
          Submit
        </PrimaryButton>
      </BudgetFormInput>
    </form>
  );
};
