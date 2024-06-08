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
import { FormsDateInput } from "components/rhf/FormsDateInput";
import { POSSIBLE_CATEGORIES } from "domains/Budgets/helpers/constants";

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
  flexDirection: "column",
  gap: 8,
}));

export type TransactionFormProps = {
  refetchTransactions: () => void;
};

export const TransactionForm: React.VFC<TransactionFormProps> = ({
  refetchTransactions,
}) => {
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

  const addTransactionAndRefetch = async (t: Transaction) => {
    await addTransaction(t);
    await refetchTransactions?.();
  };

  const transaction = watch();
  const dbTransaction = React.useMemo(() => {
    return { ...transaction, date: new Date(`${transaction.date}T12:00:00`) };
  }, [transaction]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    console.log("adding transaction ");
    console.log({ dbTransaction });
    // stop page from refreshing, which it does by default on submit
    e.preventDefault();
    await addTransactionAndRefetch(dbTransaction);
    reset();
  };

  return (
    <form onSubmit={(e) => onSubmit(e)}>
      <BudgetFormInput>
        <InputsWrapper>
          <InputWrapper>
            <FormsDateInput
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
              options={POSSIBLE_CATEGORIES}
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
