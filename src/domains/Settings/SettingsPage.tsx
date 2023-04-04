import { MainContainer } from "components/MainPage.elements";
import { GoogleCustomLogin } from "domains/Settings/GoogleCustomLogin";
import * as React from "react";

export const SettingsPage = () => {
  return (
    <MainContainer>
      <GoogleCustomLogin />
    </MainContainer>
  );
};
