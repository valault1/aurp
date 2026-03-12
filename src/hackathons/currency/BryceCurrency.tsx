import { useEffect, useState, useRef } from "react";
import { Box, Typography, Button, LinearProgress } from "@mui/material";
import Confetti from "react-confetti";

const REEL_COUNT = 4;

// Define speeds for each level (ms per tick) - all slowed down
const LEVELS = [
  [300, 300, 200, 150], // Level 1:
  [200, 200, 150, 100], // Level 2:
  [150, 150, 100, 70], // Level 3:
  [100, 100, 70, 40], // Level 4:
];
const MAX_LEVEL = LEVELS.length;

export function BryceCurrency() {
  const [digits, setDigits] = useState([0, 0, 0, 0]);
  const [spinning, setSpinning] = useState([false, false, false, false]);
  const [level, setLevel] = useState(1);
  const [target, setTarget] = useState(() => Number((Math.random() * 99).toFixed(2)));
  const [stops, setStops] = useState(0);
  const [wins, setWins] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const stored = localStorage.getItem("bryce-currency-highscore");
    return stored ? parseInt(stored, 10) : 0;
  });
  const [outline, setOutline] = useState<string | null>(null); // 'win', 'lose', or null
  const overlayRef = useRef<HTMLDivElement>(null);

  const value = Number(`${digits[0]}${digits[1]}.${digits[2]}${digits[3]}`);

  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];
    const speeds = LEVELS[level - 1];
    spinning.forEach((spin, i) => {
      if (spin && speeds) {
        intervals[i] = setInterval(() => {
          setDigits((prev) => {
            const copy = [...prev];
            copy[i] = ((copy[i] || 0) + 1) % 10;
            return copy;
          });
        }, speeds[i]);
      }
    });
    return () => intervals.forEach(clearInterval);
  }, [spinning, level]);

  const startSpin = () => {
    setSpinning([true, true, true, true]);
    setStops(0);
    setDigits([0, 0, 0, 0]);
    setGameOver(false);
    setOutline(null);
    setTarget(Number((Math.random() * 99).toFixed(2)));
  };

  const pullLever = () => {
    if (stops >= REEL_COUNT || gameOver) return;
    const index = stops;
    setSpinning((prev) => {
      const copy = [...prev];
      copy[index] = false;
      return copy;
    });
    setStops((s) => s + 1);
  };

  useEffect(() => {
    if (stops === REEL_COUNT) {
      if (value.toFixed(2) === target.toFixed(2)) {
        setWins((w) => w + 1);
        setShowConfetti(true);
        setOutline("win");
        // High score logic
        setHighScore((prev) => {
          const newScore = Math.max(prev, wins + 1);
          localStorage.setItem("bryce-currency-highscore", String(newScore));
          return newScore;
        });
        setTimeout(() => setShowConfetti(false), 3000);
        if (level < MAX_LEVEL) {
          setTimeout(() => {
            setLevel((l) => l + 1);
            setTarget(Number((Math.random() * 99).toFixed(2)));
            setDigits([0, 0, 0, 0]);
            setSpinning([false, false, false, false]);
            setStops(0);
            setOutline(null);
          }, 3200);
        } else {
          setTimeout(() => {
            setGameOver(true);
          }, 3200);
        }
      } else {
        setOutline("lose");
        setTimeout(() => setOutline(null), 1000);
        // Lose: reset to level 1
        setTimeout(() => {
          setLevel(1);
          setTarget(Number((Math.random() * 99).toFixed(2)));
          setDigits([0, 0, 0, 0]);
          setSpinning([false, false, false, false]);
          setStops(0);
        }, 1200);
      }
    }
  }, [stops]);

  return (
    <Box position="relative" minHeight={500}>
      {showConfetti && <Confetti />}

      {/* Animated Game Over Overlay */}
      {gameOver && (
        <Box
          ref={overlayRef}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            bgcolor: "rgba(0,0,32,0.92)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.7s cubic-bezier(.68,-0.55,.27,1.55)",
            transform: gameOver ? "translateY(0)" : "translateY(-100%)",
          }}
        >
          <Typography
            variant="h2"
            sx={{
              color: "#fff",
              fontWeight: 900,
              letterSpacing: 2,
              mb: 3,
              textShadow: "0 4px 32px #00f, 0 2px 8px #fff",
            }}
          >
            GAME OVER
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{ fontWeight: 700, fontSize: 24, px: 6, py: 2, borderRadius: 3, boxShadow: "0 2px 16px #00f8" }}
            onClick={() => {
              setLevel(1);
              setTarget(Number((Math.random() * 99).toFixed(2)));
              setDigits([0, 0, 0, 0]);
              setSpinning([false, false, false, false]);
              setStops(0);
              setGameOver(false);
              setWins(0);
              setOutline(null);
            }}
          >
            Reset
          </Button>
        </Box>
      )}

      {/* Flashy Title (no Bryce) */}
      <Typography
        variant="h3"
        mb={2}
        sx={{
          fontWeight: 900,
          letterSpacing: 2,
          color: "#00eaff",
          textShadow: "0 2px 16px #0ff, 0 1px 4px #fff, 0 0px 32px #0ff",
          textAlign: "center",
          userSelect: "none",
          textTransform: "uppercase",
        }}
      >
        💸 Deposit Dash 💸
      </Typography>

      {/* Progress Bar for Level (no blue background) */}
      <Box mb={2} mx="auto" width={320}>
        <LinearProgress
          variant="determinate"
          value={((level - 1) * 100) / (MAX_LEVEL - 1)}
          sx={{
            height: 12,
            borderRadius: 6,
            background: "transparent",
            boxShadow: "0 0 8px #00eaff88",
            "& .MuiLinearProgress-bar": {
              background: "linear-gradient(90deg, #00eaff, #00ff99)",
              boxShadow: "0 0 12px #0ff8",
            },
          }}
        />
        <Typography variant="caption" color="#00eaff" fontWeight={700} display="block" textAlign="center">
          Level {level} / {MAX_LEVEL}
        </Typography>
      </Box>

      <Typography mb={1}>
        Target Deposit: <b>${target.toFixed(2)}</b>
      </Typography>

      <Typography mb={3}>
        Current Amount: <b>${value.toFixed(2)}</b>
      </Typography>

      <Box
        display="flex"
        justifyContent="center"
        gap={2}
        mb={4}
        sx={{
          transition: "box-shadow 0.3s, border-color 0.3s",
          boxShadow:
            outline === "win"
              ? "0 0 0 6px #0f0a, 0 0 32px #0f0"
              : outline === "lose"
                ? "0 0 0 6px #f00a, 0 0 32px #f00"
                : "0 0 0 2px #00eaffa",

          borderRadius: 4,
          background: "rgba(0,0,0,0.7)",
        }}
      >
        <Typography fontSize={32}>$</Typography>
        {digits.map((d, i) => {
          let color = "lime";
          let borderColor = "#00eaff";
          let boxShadow;
          if (outline === "win") {
            color = "#0f0";
            borderColor = "#0f0";
            boxShadow = "0 0 16px #0f0";
          } else if (outline === "lose") {
            color = "#f00";
            borderColor = "#f00";
            boxShadow = "0 0 16px #f00";
          }
          return (
            <Box
              key={i}
              sx={{
                width: 60,
                height: 80,
                border: `2px solid ${borderColor}`,
                borderRadius: 2,
                fontSize: 40,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#111",
                color,
                boxShadow,
                transition: "box-shadow 0.3s, color 0.3s, border-color 0.3s",
              }}
            >
              {d}
            </Box>
          );
        })}
      </Box>

      <Box display="flex" justifyContent="center" gap={2} mb={3}>
        <Button variant="contained" onClick={startSpin} disabled={spinning.includes(true) || gameOver}>
          {gameOver ? "Game Over" : "Spin"}
        </Button>

        <Button variant="outlined" onClick={pullLever} disabled={!spinning.includes(true) || gameOver}>
          Pull Lever
        </Button>

        <Button
          variant="text"
          color="secondary"
          onClick={() => {
            setLevel(1);
            setTarget(Number((Math.random() * 99).toFixed(2)));
            setDigits([0, 0, 0, 0]);
            setSpinning([false, false, false, false]);
            setStops(0);
            setGameOver(false);
            setWins(0);
            setOutline(null);
          }}
        >
          Reset
        </Button>
      </Box>

      <Box display="flex" justifyContent="center" gap={4} mb={2}>
        <Typography mb={2} fontWeight={700} color="#00eaff">
          Wins: {wins}
        </Typography>
        <Typography mb={2} fontWeight={700} color="#ffb300">
          High Score: {highScore}
        </Typography>
      </Box>
    </Box>
  );
}
