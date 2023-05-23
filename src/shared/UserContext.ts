import { createContext } from "react";
import { EntitySheetIds, EntitySheetRanges } from "api/entityDefinitions";

export type User =
  | {
      name: string;
      email: string;
      expiresAt: Date;
      accessToken: string;
      scopes: string[];
      picture: string;
      id: string;
      ranges?: EntitySheetRanges;
      sheetIds?: EntitySheetIds;
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
