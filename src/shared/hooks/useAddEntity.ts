import * as React from "react";
import { buildAddEntityRequest } from "api/requestBuilders";
import { UserContext } from "shared/UserContext";
import axios from "axios";
import { EntityName } from "api/entityDefinitions";
import { addEntity } from "api/repository";

export type Mutation<T> = {
  data?: T;
  isLoading: boolean;
  error: any;
};

export function useAddEntity<T>({ entityName }: { entityName: EntityName }) {
  const [mutation, setMutation] = React.useState({
    data: undefined,
    isLoading: false,
    error: undefined,
  });
  const { user } = React.useContext(UserContext);

  const runAddEntity = async (entity: T) => {
    if (user) {
      setMutation((oldQuery) => ({ ...oldQuery, isLoading: true }));
      try {
        const result = await addEntity({
          entityName,
          accessToken: user.accessToken,
          newEntity: entity,
          range: user.ranges?.[entityName],
        });
        setMutation((prev) => ({
          ...prev,
          isLoading: false,
          data: result.data,
        }));
      } catch (error) {
        setMutation((prev) => ({
          ...prev,
          isLoading: false,
          error,
        }));
      }
    }
  };

  const hasError = !!mutation.error;

  return {
    isLoading: mutation.isLoading,
    data: mutation.data,
    error: mutation.error,
    hasError,
    addEntity: runAddEntity,
  };
}
