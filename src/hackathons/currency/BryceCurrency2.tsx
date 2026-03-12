import { useState } from "react";
import { Box, Typography, Button } from "@mui/material";

const QUESTIONS = [
  { q: "What is 5 + 7?", options: ["10", "12", "14"], answer: "12", value: 10 },
  { q: "Capital of Italy?", options: ["Rome", "Paris", "Madrid"], answer: "Rome", value: 20 },
  { q: "React is maintained by?", options: ["Google", "Meta", "Microsoft"], answer: "Meta", value: 50 },
  {
    q: "What color do you get by mixing red and blue?",
    options: ["Green", "Purple", "Orange"],
    answer: "Purple",
    value: 15,
  },
  { q: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter"], answer: "Mars", value: 25 },
  { q: "What is the boiling point of water (°C)?", options: ["90", "100", "120"], answer: "100", value: 10 },
  { q: "Who wrote 'Hamlet'?", options: ["Shakespeare", "Dickens", "Austen"], answer: "Shakespeare", value: 30 },
  { q: "Which element has the symbol 'O'?", options: ["Oxygen", "Gold", "Osmium"], answer: "Oxygen", value: 10 },
  { q: "Fastest land animal?", options: ["Cheetah", "Lion", "Horse"], answer: "Cheetah", value: 20 },
  { q: "What is 9 x 6?", options: ["54", "56", "64"], answer: "54", value: 15 },
  { q: "Which ocean is the largest?", options: ["Atlantic", "Indian", "Pacific"], answer: "Pacific", value: 20 },
  { q: "What is the square root of 81?", options: ["9", "8", "7"], answer: "9", value: 10 },
  { q: "Who painted the Mona Lisa?", options: ["Van Gogh", "Da Vinci", "Picasso"], answer: "Da Vinci", value: 25 },
  {
    q: "Which language is used for web apps?",
    options: ["Python", "JavaScript", "C++"],
    answer: "JavaScript",
    value: 10,
  },
  { q: "What is the capital of Japan?", options: ["Seoul", "Tokyo", "Beijing"], answer: "Tokyo", value: 20 },
];

export function BryceCurrency2() {
  // Shuffle questions on mount
  const [order] = useState(() => QUESTIONS.map((_, i) => i).sort(() => Math.random() - 0.5));
  const [index, setIndex] = useState(0);
  const [money, setMoney] = useState(0);
  const [feedback, setFeedback] = useState<null | "correct" | "incorrect">(null);
  const [selected, setSelected] = useState<string | null>(null);

  const q = QUESTIONS[order[index]] || { q: "", options: [], answer: "", value: 0 };

  const choose = (option: string) => {
    setSelected(option);
    if (option === q.answer) {
      setMoney((m) => m + q.value);
      setFeedback("correct");
    } else {
      setFeedback("incorrect");
    }
    setTimeout(() => {
      setFeedback(null);
      setSelected(null);
      setIndex((i) => (i + 1) % order.length);
    }, 900);
  };

  return (
    <Box textAlign="center" maxWidth={500} mx="auto" mt={4} p={3} borderRadius={4} boxShadow={6} bgcolor="#181c24">
      <Typography
        variant="h4"
        mb={3}
        sx={{
          fontWeight: 900,
          letterSpacing: 2,
          color: feedback === "correct" ? "#0f0" : feedback === "incorrect" ? "#f00" : "#00eaff",
          textShadow:
            feedback === "correct"
              ? "0 2px 16px #0f0, 0 1px 4px #fff"
              : feedback === "incorrect"
                ? "0 2px 16px #f00, 0 1px 4px #fff"
                : "0 2px 16px #0ff, 0 1px 4px #fff",
          userSelect: "none",
        }}
      >
        Game Show Deposit
      </Typography>

      <Typography mb={2} fontWeight={700} color="#00eaff" fontSize={22}>
        Bank Balance: ${money}
      </Typography>

      <Typography mb={3} fontWeight={600} fontSize={20}>
        {q.q}
      </Typography>

      <Box display="flex" flexDirection="column" gap={2}>
        {q.options.map((o) => (
          <Button
            key={o}
            variant="contained"
            onClick={() => choose(o)}
            disabled={!!feedback}
            sx={{
              fontWeight: 700,
              fontSize: 18,
              bgcolor: feedback && o === q.answer ? "#0f0" : feedback && o === selected ? "#f00" : "#222",
              color: feedback && o === q.answer ? "#111" : feedback && o === selected ? "#fff" : "#00eaff",
              border: feedback && o === q.answer ? "2px solid #0f0" : undefined,
              boxShadow: feedback && o === q.answer ? "0 0 12px #0f0" : undefined,
              transition: "all 0.3s",
            }}
          >
            {o}
          </Button>
        ))}
      </Box>

      {feedback === "correct" && (
        <Typography mt={2} color="#0f0" fontWeight={700} fontSize={18}>
          Correct! +${q.value}
        </Typography>
      )}
      {feedback === "incorrect" && (
        <Typography mt={2} color="#f00" fontWeight={700} fontSize={18}>
          Incorrect!
        </Typography>
      )}
    </Box>
  );
}
