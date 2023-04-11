import { EntityName } from "api/entityDefinitions";
import { getEntities } from "api/repository";
import * as React from "react";
import { UserContext } from "shared/UserContext";

export type RestaurantQuery<T> = {
  data?: T[];
  isLoading: boolean;
  error: any;
};

export function useEntitiesQuery<T>({
  entityName,
}: {
  entityName: EntityName;
}) {
  const [query, setQuery] = React.useState<RestaurantQuery<T>>({
    data: undefined,
    isLoading: false,
    error: undefined,
  });
  const { user } = React.useContext(UserContext);

  React.useEffect(() => {
    if (user) {
      setQuery((prev) => ({ ...prev, isLoading: true }));
      getEntities({
        accessToken: user.accessToken,
        range: user.ranges[entityName],
        entityName,
      })
        .then((restaurants) =>
          setQuery((prev) => ({ ...prev, data: restaurants, isLoading: false }))
        )
        .catch((error) => setQuery((prev) => ({ ...prev, error })));
    }
  }, [user, entityName]);

  return {
    isLoading: query.isLoading,
    data: query.data,
    error: query.error,
    restaurants: query.data,
  };
}
