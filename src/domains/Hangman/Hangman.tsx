import { MainContainer } from "components/MainPage.elements";
import * as React from "react";
import { Tab, TabsComponent } from "components/TabsComponent";
import { Stack } from "@mui/material";
import { LettersInput } from "domains/Hangman/LettersInput";
import { GuessedLetters } from "domains/Hangman/GuessedLetters";
import { Strikes } from "domains/Hangman/Strikes";
import { SecretPhrase } from "domains/Hangman/SecretPhrase";

export const INITIAL_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
export const SECRET_PHRASE = "BANANAHAMMOCK".toLowerCase().split("");
export const MAX_STRIKES = 5;

export const Hangman = () => {
  // Ok, what will it do?
  // Have the person on the right.
  // I guess letters on the left, and it crosses them out and puts them below him on the right
  const [guessedLetters, setGuessedLetters] = React.useState<string[]>([]);
  const possibleGuessLetters = INITIAL_LETTERS.filter(
    (letter) => !guessedLetters.includes(letter)
  );

  const onClickLetter = (letter: string) => {
    setGuessedLetters((prev) => [...prev, letter]);
  };

  const hasWon = React.useMemo(() => {
    let result = true;
    const trimmedPhrase = SECRET_PHRASE.join("").replace(/\s/g, "");
    trimmedPhrase.split("").forEach((letter) => {
      if (!guessedLetters.includes(letter)) result = false;
    });
    console.log({ guessedLetters, trimmedPhrase });
    return result;
  }, [guessedLetters]);

  const strikeGuesses = React.useMemo(() => {
    return guessedLetters.filter((letter) => !SECRET_PHRASE.includes(letter));
  }, [guessedLetters]);

  const hasLost = strikeGuesses.length >= MAX_STRIKES;

  const gameOverMessage = React.useMemo(() => {
    if (hasWon) return "You win!";
    if (hasLost) return "You lose, idiot!";
    return "";
  }, [hasWon, hasLost]);

  return (
    <MainContainer>
      <Stack direction="column">
        <Stack height="500px">
          <SecretPhrase guessedLetters={guessedLetters} />
          {gameOverMessage && (
            <Stack width="100%" alignItems="center" justifyContent="center">
              {gameOverMessage}
            </Stack>
          )}
        </Stack>
        <Stack
          direction="row"
          height="100%"
          alignItems="center"
          justifyContent="center"
          gap={20}
        >
          <Stack direction="column" maxWidth="300px" flexWrap="wrap">
            <LettersInput
              guessedLetters={guessedLetters}
              onClickLetter={onClickLetter}
              gameIsOver={hasWon || hasLost}
            ></LettersInput>
          </Stack>
          <Stack direction="column" gap={2}>
            <Strikes strikeGuesses={strikeGuesses} />
            <GuessedLetters guessedLetters={guessedLetters} />
          </Stack>
        </Stack>
      </Stack>
    </MainContainer>
  );
};
