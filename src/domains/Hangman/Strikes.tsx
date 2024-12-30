import styled from "@emotion/styled";
import { Stack } from "@mui/material";
import { PrimaryButton } from "components/Form.elements";
import { INITIAL_LETTERS } from "domains/Hangman/Hangman";
import React from "react";

const TallyMarks = styled.ol(() => ({
  height: "20px",
  padding: "1em 0",
  display: "flex",
  flexDirection: "column",
  gap: 1,
  ">": {
    display: "inline-block",
    height: "20px",
    border: "1px solid #000",
    marginRight: "4px",
    "&:nth-child(5n)": {
      transform: "rotate(300deg)",
      // -webkit-transform: rotate(300deg);
      // -moz-transform: rotate(300deg);
      // -o-transform: rotate(300deg);
      height: "30px",
      position: "relative",
      left: "-15px",
      top: "5px",
      marginRight: "1em",
      marginTop: "-10px",
    },
  },
}));

export const Strikes = ({ strikeGuesses }: { strikeGuesses: string[] }) => {
  return (
    <Stack direction="column" gap={1}>
      Strikes:
      <TallyMarks>{strikeGuesses.map((letter) => "|")}</TallyMarks>
    </Stack>
  );
};
