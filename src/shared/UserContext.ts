import { createContext } from "react";

export type User = {
  name: string;
  email: string;
  expiresAt: Date;
  accessToken: string;
  scope: string;
  picture: string;
  id: string;
};

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
