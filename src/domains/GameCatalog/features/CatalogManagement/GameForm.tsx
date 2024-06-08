import styled from "@emotion/styled";
import { Game } from "api/entityDefinitions";
import { PrimaryButton } from "components/Form.elements";
import { FormsDropDown } from "components/rhf/FormsDropdown";
import { FormsTextInput } from "components/rhf/FormsTextInput";
import { POSSIBLE_GAME_CATEGORIES } from "domains/GameCatalog/constants";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useAddEntity } from "shared/hooks/useAddEntity";

const GameFormInput = styled.div(() => ({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  alignItems: "start",
  paddingTop: 20,
  width: "100%",
}));

const InputWrapper = styled.div(() => ({
  minWidth: 100,
}));
const InputsWrapper = styled.div(() => ({
  display: "flex",
  flexDirection: "row",
}));

export type GameFormProps = { refetchGames?: VoidFunction };
export const GameForm: React.VFC<GameFormProps> = ({ refetchGames }) => {
  const { control, watch, reset } = useForm<Game>({
    defaultValues: {
      name: "",
      description: "",
      rules: "",
    },
  });

  const { addEntity: addGame, isLoading: isLoadingAddGame } =
    useAddEntity<Game>({ entityName: "game" });

  const addGameAndRefetch = async (g: Game) => {
    await addGame(g);
    await refetchGames?.();
  };

  const game = watch();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    console.log("adding game ");
    // stop page from refreshing, which it does by default on submit
    e.preventDefault();
    await addGameAndRefetch(game);
    reset();
  };

  return (
    <form onSubmit={(e) => onSubmit(e)}>
      <GameFormInput>
        <InputsWrapper>
          <InputWrapper>
            <FormsTextInput
              control={control}
              label="Name"
              name="name"
              autoFocus
            />
          </InputWrapper>
          <InputWrapper>
            <FormsTextInput
              control={control}
              label="Description"
              name="description"
            />
          </InputWrapper>
          <InputWrapper>
            <FormsDropDown<string>
              control={control}
              label="Category"
              name="category"
              getOptionLabel={(option) => option}
              options={POSSIBLE_GAME_CATEGORIES}
            />
          </InputWrapper>
          <InputWrapper>
            <FormsTextInput control={control} label="Rules" name="rules" />
          </InputWrapper>
        </InputsWrapper>

        <PrimaryButton loading={isLoadingAddGame} type="submit">
          Submit
        </PrimaryButton>
      </GameFormInput>
    </form>
  );
};
