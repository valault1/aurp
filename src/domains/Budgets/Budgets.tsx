import { MainContainer } from "components/MainPage.elements";
import * as React from "react";
import { Tab, TabsComponent } from "components/TabsComponent";
import { EnterTransactions } from "domains/Budgets/features/EnterTransactions/EnterTransactions";
import { UploadTransactions } from "domains/Budgets/features/UploadTransactions/UploadTransactions";

export const Budgets = () => {
  const tabs: Tab[] = [
    {
      id: "enter",
      label: "enter Transactions",
      component: <EnterTransactions />,
    },
    {
      id: "upload",
      label: "Upload transactions",
      component: <UploadTransactions />,
    },
  ].filter((t) => !!t);

  return (
    <MainContainer>
      <TabsComponent
        tabs={tabs}
        orientation="vertical"
        ariaLabel="budgettabs"
      />
    </MainContainer>
  );
};
