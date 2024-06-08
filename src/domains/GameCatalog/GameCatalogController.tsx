import { MainContainer } from "components/MainPage.elements";
import * as React from "react";
import { Tab, TabsComponent } from "components/TabsComponent";
import { FindAGameController } from "domains/GameCatalog/features/FindAGame/FindAGameController";
import { CatalogManagementController } from "domains/GameCatalog/features/CatalogManagement/CatalogManagementController";

export const GameCatalogController = () => {
  const tabs: Tab[] = [
    {
      id: "findagame",
      label: "Find a game",
      component: <FindAGameController />,
    },
    {
      id: "catalogmanagement",
      label: "Manage catalog",
      component: <CatalogManagementController />,
    },
  ].filter((t) => !!t);

  return (
    <MainContainer>
      <TabsComponent
        tabs={tabs}
        orientation="vertical"
        ariaLabel="gamecatalogtabs"
      />
    </MainContainer>
  );
};
