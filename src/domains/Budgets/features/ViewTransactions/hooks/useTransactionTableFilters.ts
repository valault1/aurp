import { Transaction } from "api/entityDefinitions";
import { startOfMonth } from "date-fns";
import * as React from "react";
export type useTransactionTableFiltersProps = {
  transactions?: Transaction[];
};

export const useTransactionTableFilters = ({
  transactions,
}: useTransactionTableFiltersProps) => {
  const today = new Date();
  const [minDateFilter, setMinDateFilter] = React.useState<Date>();
  const [maxDateFilter, setMaxDateFilter] = React.useState<Date>();

  console.log({ minDateFilter, maxDateFilter });

  const filteredTransactions = React.useMemo(() => {
    return transactions?.filter((transaction) => {
      if (transaction.description === "Test") console.log(transaction);
      return (
        new Date(transaction.date) >= minDateFilter &&
        new Date(transaction.date) <= maxDateFilter
      );
    });
  }, [transactions, minDateFilter, maxDateFilter]);

  const onClickThisMonth = () => {
    setMinDateFilter(startOfMonth(today));
    setMaxDateFilter(
      startOfMonth(new Date(today.getFullYear(), today.getMonth() + 1))
    );
  };

  return {
    minDateFilter,
    maxDateFilter,
    filteredTransactions,
    onClickThisMonth,
  };
};
