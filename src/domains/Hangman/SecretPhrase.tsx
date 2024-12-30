import { Stack } from "@mui/material";
import { PrimaryButton } from "components/Form.elements";
import { INITIAL_LETTERS, SECRET_PHRASE } from "domains/Hangman/Hangman";
import React from "react";

export const SecretPhrase = ({
  guessedLetters,
}: {
  guessedLetters: string[];
}) => {
  return (
    <Stack
      direction="row"
      gap={1}
      flexWrap="wrap"
      height="100%"
      justifyContent="center"
      alignItems="center"
      marginBottom="-50px"
    >
      {SECRET_PHRASE.map((letter) => {
        const hasGuessedLetter = guessedLetters.includes(letter);
        const letterToUse =
          hasGuessedLetter || letter === " " ? letter.toUpperCase() : "_";

        return <div>{letterToUse}</div>;
      })}
    </Stack>
  );
};
