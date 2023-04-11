import { RestaurantDTO, TransactionDTO } from "api/entityDefinitions";

// These are the types we use throughout our own app.
// Right now, they line up pretty heavily with the DTO types, but they may later diverge.
export type Restaurant = Omit<RestaurantDTO, "">;
export type Transaction = Omit<TransactionDTO, "">;
