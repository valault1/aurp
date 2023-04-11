/*App.js*/

import * as React from "react";
import { useContext } from "react";
import { UserContext } from "shared/UserContext";
import { PrimaryButton } from "components/Form.elements";
import { EntityName } from "typescript";
import { ENTITY_NAMES } from "api/entityDefinitions";

export const GoogleCustomLogin: React.VFC = () => {
  const { user, logOutFunction, loginFunction } = useContext(UserContext);

  return (
    <>
      {user ? (
        <>
          <h2>User settings</h2>
          <img src={user.picture} alt="user" />
          <p>Name: {user.name}</p>
          <p>Email Address: {user.email}</p>
          <h2>Scopes</h2>
          {user.scopes
            .sort((a, b) => a.length - b.length)
            .map((scope) => (
              <div key={scope}>{scope}</div>
            ))}

          <h2> Ranges</h2>
          <div>
            These are the ranges we will query on each sheet for your inputted
            info
          </div>
          {ENTITY_NAMES.map((entityName) => (
            <div key={entityName}>
              {entityName}: {user.ranges?.[entityName]}
            </div>
          ))}
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
