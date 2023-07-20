import { MainContainer } from "components/MainPage.elements";
import * as React from "react";
import { Tab, TabsComponent } from "components/TabsComponent";
import { EnterTransactions } from "domains/Budgets/features/ViewTransactions/EnterTransactions";
import { UploadTransactions } from "domains/Budgets/features/UploadTransactions/UploadTransactions";
import { TransactionViews } from "domains/Budgets/features/ViewTransactions/TransactionViews";

export const Budgets = () => {
  const tabs: Tab[] = [
    {
      id: "views",
      label: "View Transactions",
      component: <TransactionViews />,
    },
    {
      id: "enter",
      label: "Enter Transactions",
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
