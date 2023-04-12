import * as React from "react";
import { buildAddEntitiesRequest } from "api/requestBuilders";
import { UserContext } from "shared/UserContext";
import axios from "axios";
import { EntityName } from "api/entityDefinitions";

export type Mutation<T> = {
  data?: T;
  isLoading: boolean;
  error: any;
};

export function useAddEntitiesMutation<T>({
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

  const addEntities = async (entities: T[]) => {
    if (user) {
      setMutation((oldQuery) => ({ ...oldQuery, isLoading: true }));
      const request = buildAddEntitiesRequest({
        accessToken: user.accessToken,
        range: user.ranges?.[entityName],
        entities,
        entityName,
      });
      const result = await axios.post(
        request.url,
        request.body,
        request.config
      );
      setMutation((prev) => ({
        ...prev,
        isLoading: false,
        data: result.data,
      }));
    }
  };

  const hasError = !!mutation.error;

  return {
    isLoading: mutation.isLoading,
    data: mutation.data,
    error: mutation.error,
    hasError,
    addEntities,
  };
}
