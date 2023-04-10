import { ManageRestaurants } from "domains/Restaurants/ManageRestaurants";
import { Restaurants } from "domains/Restaurants/Restaurants";
import { SettingsPage } from "domains/Settings/SettingsPage";
import React from "react";
import { Route, Routes } from "react-router-dom";

type NavbarPage = {
  label: string;
  route?: string;
  isHidden?: boolean;
  element: React.ReactElement;
};

export function getRoute(label: string) {
  return label.toLowerCase().replace(/\s/g, "");
}

export const CONSTANT_ROUTES = {
  settings: "settings",
};

export const NAVBAR_PAGES: NavbarPage[] = [
  { label: "I'm hungry!", element: <Restaurants /> },
  { label: "Manage Restaurants", element: <ManageRestaurants /> },
];
export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {NAVBAR_PAGES.map((page) => {
        const path = page.route || getRoute(page.label);
        return <Route path={path} element={page.element} key={path} />;
      })}
      <Route path={"/"} element={<Restaurants />} />
      <Route path={CONSTANT_ROUTES.settings} element={<SettingsPage />} />
    </Routes>
  );
};
