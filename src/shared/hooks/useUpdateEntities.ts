import * as React from "react";

import { UserContext } from "shared/UserContext";
import { EntityName } from "api/entityDefinitions";
import { updateEntities } from "api/repository";

export type Mutation<T> = {
  data?: T;
  isLoading: boolean;
  error: any;
};

export function useUpdateEntities<T>({
  entityName,
}: {
  entityName: EntityName;
}) {
  const [mutation, setMutation] = React.useState({
    data: undefined,
    isLoading: false,
    error: undefined,
  });
  const { user } = React.useContext(UserContext);

  const runUpdateEntities = async (entities: T[]) => {
    if (user) {
      setMutation((oldQuery) => ({ ...oldQuery, isLoading: true }));
      const result = await updateEntities({
        accessToken: user.accessToken,
        entityRange: user.ranges?.[entityName],
        entities,
        entityName,
        sheetId: user.sheetIds[entityName],
      });
      setMutation((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  const hasError = !!mutation.error;

  return {
    isLoading: mutation.isLoading,
    data: mutation.data,
    error: mutation.error,
    hasError,
    updateEntities: runUpdateEntities,
  };
}
