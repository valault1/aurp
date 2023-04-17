import { MainContainer } from "components/MainPage.elements";
import { Tab, TabsComponent } from "components/TabsComponent";
import { GoogleCustomLogin } from "domains/Settings/GoogleCustomLogin";
import {
  AdminUserProfile,
  BasicUserProfile,
} from "domains/Settings/UserProfile";
import { TestingCenter } from "domains/TestingCenter/TestingCenter";
import * as React from "react";
import { useContext } from "react";
import { UserContext } from "shared/UserContext";

const ADMIN_EMAILS = ["valault1@gmail.com", "bstocksharp@gmail.com"];
const TESTING_CENTER_ALLOWED_EMAILS = [...ADMIN_EMAILS];

export const SettingsPage = () => {
  const { user } = useContext(UserContext);
  const userIsAdmin = React.useMemo(
    () => !!ADMIN_EMAILS.find((email) => email === user?.email),
    [user]
  );

  const canSeeTestingCenter = React.useMemo(
    () =>
      !!TESTING_CENTER_ALLOWED_EMAILS.find((email) => email === user?.email),
    [user]
  );

  const tabs: Tab[] = React.useMemo(
    () =>
      [
        {
          label: "Basic user info",
          id: "userinfo",
          component: <BasicUserProfile />,
        },
        userIsAdmin && {
          label: "Advanced user info",
          id: "adminuserinfo",
          component: <AdminUserProfile />,
        },
        canSeeTestingCenter && {
          label: "Testing Cener",
          id: "testingcenter",
          component: <TestingCenter />,
        },
      ].filter((a) => !!a),
    [userIsAdmin, canSeeTestingCenter]
  );

  return (
    <MainContainer>
      {user &&
        (tabs.length <= 1 ? (
          <BasicUserProfile />
        ) : (
          <TabsComponent
            tabs={tabs}
            ariaLabel="settingsTabs"
            orientation="vertical"
          />
        ))}
      {!user && <GoogleCustomLogin />}
    </MainContainer>
  );
};
