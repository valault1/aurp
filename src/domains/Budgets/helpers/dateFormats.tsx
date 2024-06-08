import { format } from "date-fns";

// Shows "Mon, Apr 3"
export const TRANSACTION_DISPLAY_FORMAT = "eee, LLL d";

// Shows "2023-04-03".
// Required for datepicker.
export const DATABASE_TRANSACTION_DATE_FORMAT = "yyyy-MM-dd";

export const DATE_FILTER_FORMAT = "MM-dd-yy";

export const formatDate = (d: Date) =>
  format(new Date(d), TRANSACTION_DISPLAY_FORMAT);

export const formatFilterDate = (d: Date) =>
  format(new Date(d), DATE_FILTER_FORMAT);
