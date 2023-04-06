import { createContext } from "react";
import { EntityName } from "shared/helpers/requestBuilders";
/** EntitySheetRange is a type to represent the range that should be queried for the logged in user for each entity */
export type EntitySheetRange = {
  entityName: EntityName;
  range: string;
};

export type User =
  | {
      name: string;
      email: string;
      expiresAt: Date;
      accessToken: string;
      scopes: string[];
      picture: string;
      id: string;
      ranges: EntitySheetRange[];
    }
  | undefined;

export type UserContextData = {
  user?: User;
  loginFunction: VoidFunction;
  logOutFunction: VoidFunction;
};

export const UserContext = createContext<UserContextData>({
  user: undefined,
  loginFunction: () => {},
  logOutFunction: () => {},
});
