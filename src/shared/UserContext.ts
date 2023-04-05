import { createContext } from "react";

export type User =
  | {
      name: string;
      email: string;
      expiresAt: Date;
      accessToken: string;
      scopes: string[];
      picture: string;
      id: string;
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
