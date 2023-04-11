import * as React from "react";
import { buildAddEntityRequest } from "api/requestBuilders";
import { UserContext } from "shared/UserContext";
import axios from "axios";
import { EntityName } from "api/entityDefinitions";

export type Mutation<T> = {
  data?: T;
  isLoading: boolean;
  error: any;
};

export function useAddEntityMutation<T>({
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

  const addEntity = async (entity: T) => {
    if (user) {
      setMutation((oldQuery) => ({ ...oldQuery, isLoading: true }));
      const request = buildAddEntityRequest({
        accessToken: user.accessToken,
        range: user.ranges?.[entityName],
        entity,
        entityName,
      });
      await axios.post(request.url, request.body, request.config);
    }
  };

  const hasError = !!mutation.error;

  return {
    isLoading: mutation.isLoading,
    data: mutation.data,
    error: mutation.error,
    hasError,
    addEntity,
  };
}