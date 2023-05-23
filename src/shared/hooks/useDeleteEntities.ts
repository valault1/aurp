import * as React from "react";
import { UserContext } from "shared/UserContext";
import { Entity, EntityName } from "api/entityDefinitions";
import {
  deleteEntities,
  ENABLE_REFETCH_AFTER_DELETE_ENTITIES,
} from "api/repository";

export type Mutation<T> = {
  data?: T;
  isLoading: boolean;
  error: any;
};

/**
 * Returns the average of two numbers.
 *
 * @remarks
 * You must supply a refetch entities, to make sure that cell numbers are refreshed after the
 *
 * @param entityName - name of the entity to be deleted
 * @param refetchEntities - The function from useGetEntities, that will refetch the entities
 * @returns The arithmetic mean of `x` and `y`
 *
 * @beta
 */
export function useDeleteEntities<T extends Entity>({
  entityName,
  refetchEntities,
}: {
  entityName: EntityName;
  setEntities: (entities: T[]) => void;
  refetchEntities: VoidFunction;
}) {
  const [mutation, setMutation] = React.useState({
    isLoading: false,
    error: undefined,
  });
  const { user } = React.useContext(UserContext);

  const runDeleteEntities = async (entities: T[]) => {
    if (user) {
      setMutation((oldQuery) => ({ ...oldQuery, isLoading: true }));

      await deleteEntities<T>({
        accessToken: user.accessToken,
        entityRange: user.ranges[entityName],
        entityName,
        entities,
        sheetId: user.sheetIds[entityName],
      });

      setMutation((prev) => ({
        ...prev,
        isLoading: false,
      }));
      await refetchEntities();
    }
  };

  const hasError = !!mutation.error;

  return {
    isLoading: mutation.isLoading,
    error: mutation.error,
    hasError,
    deleteEntities: runDeleteEntities,
  };
}
