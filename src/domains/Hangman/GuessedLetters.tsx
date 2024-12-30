import styled from "@emotion/styled";
import { Stack } from "@mui/material";
import { PrimaryButton } from "components/Form.elements";
import { INITIAL_LETTERS } from "domains/Hangman/Hangman";
import React from "react";

const WIDTH = 200;
export const GuessedLetters = ({
  guessedLetters,
}: {
  guessedLetters: string[];
}) => {
  return (
    <Stack direction="column" gap={4}>
      Letters guessed:
      <br />
      <Stack
        direction="row"
        gap={2}
        flexWrap="wrap"
        maxWidth={`${WIDTH}px`}
        minWidth={`${WIDTH}px`}
      >
        {guessedLetters.map((letter) => (
          <div>{letter.toUpperCase()}</div>
        ))}
      </Stack>
    </Stack>
  );
};
