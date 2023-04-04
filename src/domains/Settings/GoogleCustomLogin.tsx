/*App.js*/

import * as React from "react";
import { useContext } from "react";
import { UserContext } from "shared/UserContext";
import { PrimaryButton } from "components/Form.elements";

export const GoogleCustomLogin: React.VFC = () => {
  const { user, logOutFunction, loginFunction } = useContext(UserContext);

  return (
    <>
      {user ? (
        <>
          <h2>User settings</h2>
          <img src={user.picture} alt="user image" />
          <p>Name: {user.name}</p>
          <p>Email Address: {user.email}</p>
          <br />
          <br />
          <PrimaryButton onClick={logOutFunction}>Log out</PrimaryButton>
        </>
      ) : (
        <>
          <h2>You are not logged in. </h2>
          <PrimaryButton variant="contained" onClick={loginFunction}>
            Click to login
          </PrimaryButton>
        </>
      )}
    </>
  );
};
