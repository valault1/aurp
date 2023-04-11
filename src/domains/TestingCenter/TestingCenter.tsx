import { PrimaryButton, TextInput } from "components/Form.elements";
import { MainContainer } from "components/MainPage.elements";
import * as React from "react";
import { useAddEntitiesMutation } from "shared/hooks/useAddEntitiesMutation";
import { useEntitiesQuery } from "shared/hooks/useEntitiesQuery";
import { Transaction } from "shared/sharedTypes";
import { useToasts } from "react-toast-notifications";
import {
  addRandomEntities,
  functionTime,
  runTests,
} from "domains/TestingCenter/testHelpers";
import { Card } from "@mui/material";
import styled from "@emotion/styled";

const TestingCenterWrapper = styled.div(() => ({
  display: "flex",
  gap: 12,
  maxWidth: 800,
}));

const ModuleWrapper = styled(Card)(() => ({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: "100%",
  paddingLeft: 20,
  paddingRight: 20,
  paddingBottom: 20,
}));

export const TestingCenter = () => {
  const { addToast } = useToasts();
  const { addEntities, isLoading: isLoadingAddEntities } =
    useAddEntitiesMutation<Transaction>({
      entityName: "transaction",
    });

  const { refetch, isLoading: isLoadingEntitiesQuery } =
    useEntitiesQuery<Transaction>({
      entityName: "transaction",
    });

  const [numEntitiesToAdd, setNumEntitiesToAdd] = React.useState(100);
  const handleChangeNumEntitiesToAdd = (e: any) => {
    try {
      const num = Number(e.target.value);
      if (!isNaN(num)) {
        setNumEntitiesToAdd(num);
      }
    } catch (error) {}
  };

  const generateRandomTransaction = () => {
    return {
      amount: Math.random() * 100,
      date: new Date(),
      category: "Miscellaneous",
      description: "just a random transaction",
    };
  };

  const getTransactions = async () => {
    const startTime = Date.now();
    try {
      await refetch();
      let endTime = Date.now();
      const timeElapsed = endTime - startTime;
      addToast(`Success! took ${timeElapsed} milliseconds`);
    } catch (error) {
      addToast("There was an error.", { appearance: "error" });
    }
  };

  const addTransactions = async (n: number) => {
    functionTime({
      functionToTest: () =>
        addRandomEntities({
          n,
          generateEntity: generateRandomTransaction,
          addEntities,
        }),
      onSuccess: (functionTimeMs) =>
        addToast(`Success! took ${functionTimeMs} milliseconds`),
      onError: () => addToast("There was an error.", { appearance: "error" }),
    });
  };

  return (
    <MainContainer>
      <h1>Testing Center</h1>
      <TestingCenterWrapper>
        <ModuleWrapper sx={{ flex: 1 }}>
          <h2>Queries</h2>

          <PrimaryButton
            loading={isLoadingEntitiesQuery}
            onClick={() => getTransactions()}
          >
            Query all entities
          </PrimaryButton>
          <PrimaryButton
            loading={isLoadingEntitiesQuery}
            onClick={() => runTests({ n: 100, functionToTest: refetch })}
          >
            Query all entities 100 times (takes 2 minutes)
          </PrimaryButton>
        </ModuleWrapper>
        <ModuleWrapper sx={{ flex: 1 }}>
          <h2>Mutations</h2>
          <PrimaryButton
            loading={isLoadingAddEntities}
            onClick={() => addTransactions(numEntitiesToAdd)}
          >
            Add {numEntitiesToAdd} entities
          </PrimaryButton>

          <PrimaryButton
            loading={isLoadingAddEntities}
            onClick={() =>
              runTests({
                n: 100,
                functionToTest: () =>
                  addRandomEntities({
                    n: 800,
                    generateEntity: generateRandomTransaction,
                    addEntities,
                  }),
              })
            }
          >
            Add {numEntitiesToAdd} entities 100 times (takes 2 minutes)
          </PrimaryButton>
          <TextInput
            value={numEntitiesToAdd.toString()}
            onChange={handleChangeNumEntitiesToAdd}
            label={"number of entities to add"}
          />
        </ModuleWrapper>
        <br />
        <br />
        <br />
      </TestingCenterWrapper>
      <br />
      <br />
    </MainContainer>
  );
};
