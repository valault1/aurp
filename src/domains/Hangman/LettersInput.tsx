import { Stack } from "@mui/material";
import { PrimaryButton } from "components/Form.elements";
import { INITIAL_LETTERS } from "domains/Hangman/Hangman";
import React from "react";

export const LettersInput = ({
  guessedLetters,
  onClickLetter,
  gameIsOver,
}: {
  guessedLetters: string[];
  onClickLetter: (letter: string) => void;
  gameIsOver: boolean;
}) => {
  return (
    <Stack direction="row" gap={1} flexWrap="wrap">
      {INITIAL_LETTERS.map((letter) => (
        <PrimaryButton
          disabled={guessedLetters.includes(letter) || gameIsOver}
          onClick={() => onClickLetter(letter)}
        >
          {letter.toUpperCase()}
        </PrimaryButton>
      ))}
    </Stack>
  );
};
