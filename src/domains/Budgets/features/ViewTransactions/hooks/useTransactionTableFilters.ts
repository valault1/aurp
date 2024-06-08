import { Transaction } from "api/entityDefinitions";
import { startOfMonth } from "date-fns";
import * as React from "react";
export type useTransactionTableFiltersProps = {
  transactions?: Transaction[];
};

// used for debugging - in the middle of the month, I often have no transactions
const shouldUseLastMonthAsDefault = true;

export const useTransactionTableFilters = ({
  transactions,
}: useTransactionTableFiltersProps) => {
  const today = new Date();
  const START_OF_LAST_MONTH = startOfMonth(
    new Date(today.getFullYear(), today.getMonth() - 1)
  );
  const START_OF_THIS_MONTH = startOfMonth(today);
  const START_OF_NEXT_MONTH = startOfMonth(
    new Date(today.getFullYear(), today.getMonth() + 1)
  );
  const DEFAULT_MIN_DATE = shouldUseLastMonthAsDefault
    ? START_OF_LAST_MONTH
    : START_OF_THIS_MONTH;
  const DEFAULT_MAX_DATE = shouldUseLastMonthAsDefault
    ? START_OF_THIS_MONTH
    : START_OF_NEXT_MONTH;
  const [minDateFilter, setMinDateFilter] =
    React.useState<Date>(DEFAULT_MIN_DATE);
  const [maxDateFilter, setMaxDateFilter] =
    React.useState<Date>(DEFAULT_MAX_DATE);

  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((transaction) => {
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

  const onClickLastMonth = () => {
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
