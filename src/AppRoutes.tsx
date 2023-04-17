import { MainContainer } from "components/MainPage.elements";
import { Budgets } from "domains/Budgets/Budgets";
import { ManageRestaurants } from "domains/Restaurants/ManageRestaurants";
import { Restaurants } from "domains/Restaurants/Restaurants";
import { SettingsPage } from "domains/Settings/SettingsPage";
import React, { useContext } from "react";
import { Route, Routes } from "react-router-dom";
import { UserContext } from "shared/UserContext";

type NavbarPage = {
  label: string;
  route?: string;
  isHidden?: boolean;
  element: React.ReactElement;
};

const GenericNotFound = (
  <MainContainer>Sorry, this page doesn't exist!</MainContainer>
);

export function getRoute(label: string) {
  return label.toLowerCase().replace(/\s/g, "");
}

export const CONSTANT_ROUTES = {
  settings: "settings",
};

export const NAVBAR_PAGES: NavbarPage[] = [
  { label: "I'm hungry!", element: <Restaurants /> },
  { label: "Manage Restaurants", element: <ManageRestaurants /> },
  { label: "Budgets", element: <Budgets /> },
];
export const AppRoutes: React.FC = () => {
  const { user } = useContext(UserContext);
  const loginElement = <SettingsPage />;
  const redirectIfLoggedOut = (component: React.ReactElement) =>
    user ? component : loginElement;
  return (
    <Routes>
      {NAVBAR_PAGES.map((page) => {
        const path = page.route || getRoute(page.label);
        return (
          <Route
            path={path}
            element={redirectIfLoggedOut(page.element)}
            key={path}
          />
        );
      })}
      <Route path={"/"} element={redirectIfLoggedOut(<Restaurants />)} />
      <Route
        path={CONSTANT_ROUTES.settings}
        element={redirectIfLoggedOut(<SettingsPage />)}
      />
      <Route path="*" element={GenericNotFound} />
    </Routes>
  );
};
