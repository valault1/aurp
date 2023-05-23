import { EntityName } from "api/entityDefinitions";
import { getEntities } from "api/repository";
import * as React from "react";
import { UserContext } from "shared/UserContext";

export type Query<T> = {
  data?: T[];
  isLoading: boolean;
  error: any;
};

export function useGetEntities<T>({ entityName }: { entityName: EntityName }) {
  const [query, setQuery] = React.useState<Query<T>>({
    data: undefined,
    isLoading: false,
    error: undefined,
  });

  // ONLY to be used by useDeleteEntities
  const setEntities = (entities: T[]) =>
    setQuery((oldQuery) => ({ ...oldQuery, data: entities }));
  const { user } = React.useContext(UserContext);

  const refetch = React.useCallback(async () => {
    setQuery((prev) => ({ ...prev, isLoading: true }));
    let result = await getEntities({
      accessToken: user.accessToken,
      range: user.ranges?.[entityName],
      entityName,
    });
    setQuery((prev) => ({ ...prev, data: result, isLoading: false }));
  }, [entityName, user?.accessToken, user?.ranges]);
  React.useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user, refetch]);

  return {
    isLoading: query.isLoading,
    data: query.data,
    error: query.error,
    refetch,
    // NOTE: Only to be passed in to useDeleteEntities, so the data can be reset by the result from that call.
    setEntities,
  };
}
