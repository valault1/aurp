import {
  TokenResponse,
  useGoogleLogin,
  googleLogout,
} from "@react-oauth/google";
import axios from "axios";
import * as React from "react";
import { User } from "shared/UserContext";

type Token = {
  expiresAt: Date;
  accessToken: string;
  scopes: string[];
};

const getExpiresAt = (expiresIn: number) => {
  var t = new Date();
  t.setSeconds(t.getSeconds() + expiresIn);
  return t;
};

const USER_KEY = "userInfo";
export const useLogin = () => {
  const [accessToken, setAccessToken] = React.useState<Token | undefined>(
    undefined
  );

  // Read user values from local storage
  let initialUserValue: User = !!localStorage.getItem(USER_KEY)
    ? JSON.parse(localStorage.getItem(USER_KEY))
    : undefined;
  if (new Date(initialUserValue?.expiresAt) < new Date()) {
    initialUserValue = undefined;
  }

  const [user, setUser] = React.useState<User>(initialUserValue);

  // Whenever user changes, update local storage
  React.useEffect(() => {
    localStorage.setItem(USER_KEY, user ? JSON.stringify(user) : "");
  }, [user]);

  const onLoginSuccess = (
    tokenResponse: Omit<
      TokenResponse,
      "error" | "error_description" | "error_uri"
    >
  ) =>
    setAccessToken({
      accessToken: tokenResponse.access_token,
      expiresAt: getExpiresAt(tokenResponse.expires_in),
      scopes: tokenResponse.scope.split(" "),
    });
  const onLoginError = (error: any) => console.log("Login Failed:", error);

  const login = useGoogleLogin({
    onSuccess: onLoginSuccess,
    onError: onLoginError,
    prompt: "consent",
  });

  React.useEffect(() => {
    if (accessToken) {
      axios
        .get(
          `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken.accessToken}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken.accessToken}`,
              Accept: "application/json",
            },
          }
        )
        .then((res) => {
          setUser({
            ...accessToken,
            name: res.data.name,
            email: res.data.email,
            picture: res.data.picture,
            id: res.data.id,
          });
        })
        .catch((err) => console.log(err));
    }
  }, [accessToken]);

  const logOutFunction = () => {
    googleLogout();
    setUser(undefined);
  };

  const loginFunction = () => login();
  return { logOutFunction, loginFunction, user };
};
