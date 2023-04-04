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
  scope: string;
};

const getExpiresAt = (expiresIn: number) => {
  var t = new Date();
  t.setSeconds(t.getSeconds() + expiresIn);
  return t;
};
export const useLogin = () => {
  const [accessToken, setAccessToken] = React.useState<Token | undefined>(
    undefined
  );
  const [user, setUser] = React.useState<User>(undefined);
  const onLoginSuccess = (
    tokenResponse: Omit<
      TokenResponse,
      "error" | "error_description" | "error_uri"
    >
  ) =>
    setAccessToken({
      accessToken: tokenResponse.access_token,
      expiresAt: getExpiresAt(tokenResponse.expires_in),
      scope: tokenResponse.scope,
    });
  const onLoginError = (error: any) => console.log("Login Failed:", error);

  const login = useGoogleLogin({
    onSuccess: onLoginSuccess,
    onError: onLoginError,
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
