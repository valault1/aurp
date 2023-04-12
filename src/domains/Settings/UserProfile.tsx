import styled from "@emotion/styled";
import { Card } from "@mui/material";
import { ENTITY_NAMES } from "api/entityDefinitions";
import { PrimaryButton } from "components/Form.elements";
import * as React from "react";
import { useContext } from "react";
import { UserContext } from "shared/UserContext";

const UserProfileWrapper = styled.div(() => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 40,
  marginTop: 20,
}));

const BasicUserInfoWrapper = styled(Card)(() => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  padding: 20,
}));

const AdminInfoWrapper = styled.div(() => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
}));

const InfoSectionsWrapper = styled.div(() => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
}));

const InfoSection = styled(Card)(() => ({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: 20,
}));

export const BasicUserProfile = () => {
  const { user, logOutFunction } = useContext(UserContext);

  return (
    <UserProfileWrapper>
      <BasicUserInfoWrapper>
        <h2>User account</h2>
        <div>{user.name}</div>
        <div>{user.email}</div>
        <PrimaryButton onClick={logOutFunction}>Log out</PrimaryButton>
      </BasicUserInfoWrapper>
    </UserProfileWrapper>
  );
};

export const AdminUserProfile = () => {
  const { user } = useContext(UserContext);

  return (
    <AdminInfoWrapper>
      <h2>Admin info</h2>
      <InfoSectionsWrapper>
        <InfoSection>
          <h3>Scopes</h3>
          {user.scopes
            .sort((a, b) => a.length - b.length)
            .map((scope) => (
              <div key={scope}>{scope}</div>
            ))}
        </InfoSection>
        <InfoSection>
          <h3> Ranges</h3>
          {ENTITY_NAMES.map((entityName) => (
            <div key={entityName}>
              {entityName}: {user.ranges?.[entityName]}
            </div>
          ))}
        </InfoSection>
      </InfoSectionsWrapper>
    </AdminInfoWrapper>
  );
};
