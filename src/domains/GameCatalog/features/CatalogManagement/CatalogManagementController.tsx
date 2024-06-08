import styled from "@emotion/styled";
import { Game } from "api/entityDefinitions";
import { GameForm } from "domains/GameCatalog/features/CatalogManagement/GameForm";
import { GamesTable } from "domains/GameCatalog/features/CatalogManagement/GamesTable";
import * as React from "react";
import { useGetEntities } from "shared/hooks/useGetEntities";
export type CatalogManagementControllerProps = {};

export const CatalogManagementController: React.VFC<
  CatalogManagementControllerProps
> = () => {
  const { data: games, refetch: refetchGames } = useGetEntities<Game>({
    entityName: "game",
  });
  console.log({ games });
  return (
    <div>
      <div>Catalog Management</div>
      <GamesTable games={games} />
      <GameForm refetchGames={refetchGames} />
    </div>
  );
};
