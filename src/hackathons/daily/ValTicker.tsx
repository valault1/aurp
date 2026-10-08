import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Typography, alpha, useTheme } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import Confetti from "react-confetti";
import {
  BarChart3,
  Check,
  ChevronRight,
  Copy,
  Flame,
  Lightbulb,
  LineChart,
  X as XIcon,
} from "lucide-react";
import { TickerChart } from "./TickerChart";
import {
  puzzleNumberForDate,
  puzzleSetForDate,
  seriesStats,
  toDateKey,
  type Company,
  type Puzzle,
} from "./tickerData";

const MONO = `'SF Mono', 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace`;
const UP = "#34d399";
const DOWN = "#fb7185";
const STORAGE_KEY = "ticker_daily_v1";

type RoundResult = {
  /** Ticker the player picked. */
  guess: string;
  correct: boolean;
  usedHint: boolean;
};

type Saved = {
  dayKey: string | null;
  results: RoundResult[];
  streak: number;
  maxStreak: number;
  played: number;
  totalCorrect: number;
  lastCompletedKey: string | null;
};

const EMPTY_SAVED: Saved = {
  dayKey: null,
  results: [],
  streak: 0,
  maxStreak: 0,
  played: 0,
  totalCorrect: 0,
  lastCompletedKey: null,
};

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_SAVED;
    return { ...EMPTY_SAVED, ...(JSON.parse(raw) as Partial<Saved>) };
  } catch {
    return EMPTY_SAVED;
  }
}

function persist(saved: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    /* private browsing — the day still plays, it just won't be remembered */
  }
}

function previousDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const prev = new Date(y!, m! - 1, d! - 1);
  return toDateKey(prev);
}

/** Eases a number up from zero, in step with the chart's plot-in animation. */
function useCountUp(target: number, duration: number, resetKey: unknown): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, resetKey]);
  return value;
}

function useMidnightCountdown(): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const ms = next.getTime() - now.getTime();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setLabel(`${h}h ${`${m}`.padStart(2, "0")}m ${`${s}`.padStart(2, "0")}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return label;
}

function signed(n: number, digits = 1): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

function resultEmoji(r: RoundResult): string {
  if (!r.correct) return "🟥";
  return r.usedHint ? "🟨" : "🟩";
}

/* ------------------------------------------------------------------ */
/* small pieces                                                        */
/* ------------------------------------------------------------------ */

function Label({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Typography
      sx={{
        fontFamily: MONO,
        fontSize: "0.62rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.4)",
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

function StatCell({
  label,
  value,
  color,
  compact,
}: {
  label: string;
  value: string;
  color?: string;
  /** Sits inline in the chart header rather than in an evenly-split row. */
  compact?: boolean;
}) {
  return (
    <Box
      sx={
        compact
          ? { flex: "0 0 auto", pl: { xs: 0, md: 2.5 }, pr: { xs: 2.5, md: 0 } }
          : { flex: "1 1 0", minWidth: 0, px: { xs: 1.5, md: 2 }, py: 1.25 }
      }
    >
      <Label sx={{ fontSize: "0.56rem", mb: 0.25 }}>{label}</Label>
      <Typography
        sx={{
          fontFamily: MONO,
          fontSize: compact ? "0.86rem" : { xs: "0.9rem", md: "1.05rem" },
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: color ?? "rgba(255,255,255,0.92)",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function MiniSpark({ series, color }: { series: number[]; color: string }) {
  const d = useMemo(() => {
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    return series
      .map((v, i) => {
        const x = (i / (series.length - 1)) * 72;
        const y = 24 - ((v - min) / span) * 22 - 1;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [series]);

  return (
    <svg viewBox="0 0 72 24" width={72} height={24} style={{ flexShrink: 0, overflow: "visible" }}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* main game                                                           */
/* ------------------------------------------------------------------ */

type Phase = "intro" | "playing" | "done";

export function ValTicker() {
  const theme = useTheme();
  const accent = theme.palette.primary.main;

  const today = useMemo(() => new Date(), []);
  const dayKey = toDateKey(today);
  const puzzleNumber = puzzleNumberForDate(today);
  const puzzles = puzzleSetForDate(today).puzzles;

  const [saved, setSaved] = useState<Saved>(() => loadSaved());
  const alreadyDone = saved.dayKey === dayKey && saved.results.length === puzzles.length;

  const [phase, setPhase] = useState<Phase>(alreadyDone ? "done" : "intro");
  const [roundIndex, setRoundIndex] = useState(alreadyDone ? puzzles.length - 1 : 0);
  const [results, setResults] = useState<RoundResult[]>(alreadyDone ? saved.results : []);
  const [picked, setPicked] = useState<string | null>(null);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const puzzle: Puzzle = puzzles[roundIndex]!;
  const stats = useMemo(() => seriesStats(puzzle.series), [puzzle]);
  const animatedChange = useCountUp(stats.changePct, 1500, roundIndex);
  const countdown = useMidnightCountdown();

  const score = results.filter((r) => r.correct).length;
  const revealed = picked !== null;

  const startGame = () => {
    setPhase("playing");
    setRoundIndex(0);
    setResults([]);
    setPicked(null);
    setEliminated([]);
  };

  const useHint = () => {
    if (revealed || eliminated.length > 0) return;
    const wrong = puzzle.options.filter((o) => o.ticker !== puzzle.answer.ticker);
    const choice = wrong[(puzzleNumber + roundIndex) % wrong.length]!;
    setEliminated([choice.ticker]);
  };

  const guess = (company: Company) => {
    if (revealed || eliminated.includes(company.ticker)) return;
    setPicked(company.ticker);
    setResults((prev) => [
      ...prev,
      {
        guess: company.ticker,
        correct: company.ticker === puzzle.answer.ticker,
        usedHint: eliminated.length > 0,
      },
    ]);
  };

  const finishDay = useCallback(
    (finalResults: RoundResult[]) => {
      setSaved((prev) => {
        // Re-finishing a day that is already recorded must not inflate the streak.
        if (prev.dayKey === dayKey && prev.results.length === puzzles.length) return prev;

        const continuing = prev.lastCompletedKey === previousDayKey(dayKey);
        const streak = continuing ? prev.streak + 1 : 1;
        const next: Saved = {
          dayKey,
          results: finalResults,
          streak,
          maxStreak: Math.max(prev.maxStreak, streak),
          played: prev.played + 1,
          totalCorrect: prev.totalCorrect + finalResults.filter((r) => r.correct).length,
          lastCompletedKey: dayKey,
        };
        persist(next);
        return next;
      });
    },
    [dayKey, puzzles.length],
  );

  const advance = () => {
    if (roundIndex < puzzles.length - 1) {
      setRoundIndex((i) => i + 1);
      setPicked(null);
      setEliminated([]);
    } else {
      finishDay(results);
      setPhase("done");
    }
  };

  const shareText = useMemo(() => {
    const grid = results.map(resultEmoji).join("");
    return `TICKER #${puzzleNumber} — ${score}/${puzzles.length}\n${grid}\n90 days of price action. Name the company.`;
  }, [results, puzzleNumber, score, puzzles.length]);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the grid is on screen to copy by hand */
    }
  };

  const accuracy = saved.played > 0 ? Math.round((saved.totalCorrect / (saved.played * 3)) * 100) : 0;

  return (
    <Box
      sx={{
        borderRadius: "24px",
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(165deg, #12141d 0%, #0a0b11 55%, #0c0e16 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: `0 30px 80px -30px rgba(0,0,0,0.9), 0 0 0 1px ${alpha(accent, 0.08)}`,
      }}
    >
      {/* terminal texture */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.5,
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.016) 0px, rgba(255,255,255,0.016) 1px, transparent 1px, transparent 3px)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "-30%",
          left: "50%",
          width: "700px",
          height: "500px",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          background: `radial-gradient(ellipse, ${alpha(accent, 0.16)} 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* chrome bar */}
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: { xs: 2, md: 3 },
          py: 1.75,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.015)",
        }}
      >
        <Box
          sx={{
            display: "grid",
            placeItems: "center",
            width: 30,
            height: 30,
            borderRadius: "9px",
            background: alpha(accent, 0.14),
            border: `1px solid ${alpha(accent, 0.3)}`,
            color: accent,
          }}
        >
          <LineChart size={16} />
        </Box>
        <Box>
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: "0.95rem",
              fontWeight: 800,
              letterSpacing: "0.26em",
              lineHeight: 1.1,
              color: "#fff",
            }}
          >
            TICKER
          </Typography>
          <Label sx={{ fontSize: "0.54rem", letterSpacing: "0.22em" }}>
            #{puzzleNumber} · {dayKey}
          </Label>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {saved.streak > 0 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              borderRadius: "100px",
              background: "rgba(251,146,60,0.1)",
              border: "1px solid rgba(251,146,60,0.25)",
              color: "#fb923c",
            }}
          >
            <Flame size={13} />
            <Typography
              sx={{ fontFamily: MONO, fontSize: "0.72rem", fontWeight: 700, lineHeight: 1 }}
            >
              {saved.streak}
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ position: "relative", p: { xs: 2, md: 2.75 } }}>
        <AnimatePresence mode="wait">
          {/* ---------------------------------------------- intro */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <Box sx={{ textAlign: "center", py: { xs: 4, md: 7 }, maxWidth: 520, mx: "auto" }}>
                <Typography
                  sx={{
                    fontFamily: MONO,
                    fontWeight: 900,
                    fontSize: { xs: "2.6rem", md: "4rem" },
                    letterSpacing: "0.1em",
                    lineHeight: 1,
                    background: `linear-gradient(180deg, #ffffff 0%, ${alpha(accent, 0.75)} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  TICKER
                </Typography>
                <Typography
                  sx={{
                    mt: 2,
                    fontSize: { xs: "1rem", md: "1.1rem" },
                    fontWeight: 300,
                    lineHeight: 1.7,
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  Three charts. Ninety days each. No names, no prices —
                  <br />
                  just the shape of the move. Name the company.
                </Typography>

                <Button
                  onClick={startGame}
                  sx={{
                    mt: 4.5,
                    px: 5,
                    py: 1.6,
                    borderRadius: "100px",
                    fontFamily: MONO,
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    letterSpacing: "0.18em",
                    color: "#0a0b11",
                    background: `linear-gradient(135deg, #ffffff 0%, ${alpha(accent, 0.85)} 160%)`,
                    transition: "all 0.3s cubic-bezier(0.165,0.84,0.44,1)",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: `0 14px 36px -10px ${alpha(accent, 0.7)}`,
                      background: `linear-gradient(135deg, #ffffff 0%, ${alpha(accent, 0.95)} 160%)`,
                    },
                  }}
                >
                  OPEN TODAY&apos;S CHARTS
                </Button>

                {saved.played > 0 && (
                  <Box
                    sx={{
                      mt: 5,
                      display: "flex",
                      justifyContent: "center",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      pt: 2.5,
                    }}
                  >
                    <StatCell label="streak" value={`${saved.streak}`} color="#fb923c" />
                    <StatCell label="best" value={`${saved.maxStreak}`} />
                    <StatCell label="played" value={`${saved.played}`} />
                    <StatCell label="accuracy" value={`${accuracy}%`} color={accent} />
                  </Box>
                )}
              </Box>
            </motion.div>
          )}

          {/* ---------------------------------------------- playing */}
          {phase === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* round header */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
                <Box sx={{ display: "flex", gap: 0.75 }}>
                  {puzzles.map((_, i) => {
                    const r = results[i];
                    const bg = r
                      ? r.correct
                        ? r.usedHint
                          ? "#fbbf24"
                          : UP
                        : DOWN
                      : i === roundIndex
                        ? accent
                        : "rgba(255,255,255,0.12)";
                    return (
                      <Box
                        key={i}
                        sx={{
                          width: i === roundIndex ? 28 : 18,
                          height: 4,
                          borderRadius: "2px",
                          background: bg,
                          boxShadow: i === roundIndex ? `0 0 10px ${alpha(accent, 0.8)}` : "none",
                          transition: "all 0.3s ease",
                        }}
                      />
                    );
                  })}
                </Box>
                <Label>
                  Chart {roundIndex + 1} of {puzzles.length}
                </Label>

                <Box sx={{ flexGrow: 1 }} />

                <Button
                  onClick={useHint}
                  disabled={revealed || eliminated.length > 0}
                  startIcon={<Lightbulb size={14} />}
                  sx={{
                    fontFamily: MONO,
                    fontSize: "0.66rem",
                    letterSpacing: "0.14em",
                    px: 1.75,
                    borderRadius: "100px",
                    color: "#fbbf24",
                    border: "1px solid rgba(251,191,36,0.28)",
                    "&:hover": { background: "rgba(251,191,36,0.1)" },
                    "&.Mui-disabled": {
                      color: "rgba(255,255,255,0.2)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    },
                  }}
                >
                  {eliminated.length > 0 ? "USED" : "HINT"}
                </Button>
              </Box>

              {/* chart panel */}
              <Box
                sx={{
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.022)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  p: { xs: 1.5, md: 2 },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-end",
                    flexWrap: "wrap",
                    rowGap: 1.5,
                    mb: 1.25,
                  }}
                >
                  <Box sx={{ mr: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                      <BarChart3 size={11} color="rgba(255,255,255,0.3)" />
                      <Label sx={{ fontSize: "0.56rem" }}>90-day change</Label>
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: MONO,
                        fontSize: { xs: "1.7rem", md: "2.1rem" },
                        fontWeight: 800,
                        lineHeight: 1.1,
                        fontVariantNumeric: "tabular-nums",
                        color: stats.changePct >= 0 ? UP : DOWN,
                        textShadow: `0 0 26px ${alpha(stats.changePct >= 0 ? UP : DOWN, 0.45)}`,
                      }}
                    >
                      {signed(animatedChange, 2)}
                    </Typography>
                  </Box>

                  <Box sx={{ flexGrow: 1 }} />

                  <Box sx={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap" }}>
                    <StatCell compact label="hi / lo range" value={`${stats.rangePct.toFixed(1)}%`} />
                    <StatCell
                      compact
                      label="biggest 1d"
                      value={signed(stats.biggestDayPct, 1)}
                      color={stats.biggestDayPct >= 0 ? UP : DOWN}
                    />
                    <StatCell
                      compact
                      label="max drawdown"
                      value={`${stats.maxDrawdownPct.toFixed(1)}%`}
                      color={DOWN}
                    />
                    <StatCell compact label="ann. vol" value={`${stats.volPct.toFixed(0)}%`} />
                  </Box>
                </Box>

                <TickerChart series={puzzle.series} animationKey={roundIndex} accent={accent} />

              </Box>

              {/* options */}
              <Box
                sx={{
                  mt: 2,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 1.25,
                }}
              >
                {puzzle.options.map((option) => {
                  const isAnswer = option.ticker === puzzle.answer.ticker;
                  const isPicked = option.ticker === picked;
                  const isOut = eliminated.includes(option.ticker);

                  let border = "rgba(255,255,255,0.09)";
                  let background = "rgba(255,255,255,0.025)";
                  let glow = "none";
                  let textColor = "rgba(255,255,255,0.92)";

                  if (revealed && isAnswer) {
                    border = UP;
                    background = alpha(UP, 0.12);
                    glow = `0 0 26px -6px ${alpha(UP, 0.8)}`;
                  } else if (revealed && isPicked) {
                    border = DOWN;
                    background = alpha(DOWN, 0.12);
                    glow = `0 0 26px -6px ${alpha(DOWN, 0.7)}`;
                  } else if (revealed || isOut) {
                    textColor = "rgba(255,255,255,0.3)";
                  }

                  return (
                    <motion.button
                      key={option.ticker}
                      onClick={() => guess(option)}
                      disabled={revealed || isOut}
                      whileHover={revealed || isOut ? undefined : { y: -2 }}
                      whileTap={revealed || isOut ? undefined : { scale: 0.985 }}
                      animate={
                        revealed && isPicked && !isAnswer
                          ? { x: [0, -7, 7, -4, 4, 0] }
                          : { x: 0 }
                      }
                      transition={{ duration: 0.4 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        textAlign: "left",
                        padding: "12px 16px",
                        borderRadius: 14,
                        border: `1px solid ${border}`,
                        background,
                        boxShadow: glow,
                        cursor: revealed || isOut ? "default" : "pointer",
                        opacity: isOut ? 0.35 : 1,
                        textDecoration: isOut ? "line-through" : "none",
                        transitionProperty: "background, border-color, box-shadow, opacity",
                        transitionDuration: "0.25s",
                        font: "inherit",
                        color: textColor,
                      }}
                    >
                      <Box
                        sx={{
                          display: "grid",
                          placeItems: "center",
                          minWidth: 52,
                          py: 0.4,
                          borderRadius: "7px",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          fontFamily: MONO,
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          color: "inherit",
                        }}
                      >
                        {option.ticker}
                      </Box>
                      <Typography sx={{ fontSize: "0.95rem", fontWeight: 500, color: "inherit" }}>
                        {option.name}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }} />
                      {revealed && isAnswer && <Check size={18} color={UP} />}
                      {revealed && isPicked && !isAnswer && <XIcon size={18} color={DOWN} />}
                    </motion.button>
                  );
                })}
              </Box>

              {/* reveal */}
              <AnimatePresence>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <Box
                      sx={{
                        mt: 2.5,
                        p: { xs: 2, md: 2.5 },
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${alpha(
                          results[roundIndex]?.correct ? UP : DOWN,
                          0.3,
                        )}`,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.25 }}>
                        <Typography
                          sx={{
                            fontFamily: MONO,
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            letterSpacing: "0.18em",
                            color: results[roundIndex]?.correct ? UP : DOWN,
                          }}
                        >
                          {results[roundIndex]?.correct ? "CALLED IT" : "NOT THIS ONE"}
                        </Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <Typography
                          sx={{
                            fontFamily: MONO,
                            fontSize: "0.8rem",
                            fontWeight: 800,
                            color: "#fff",
                          }}
                        >
                          {puzzle.answer.name}{" "}
                          <Box component="span" sx={{ color: "rgba(255,255,255,0.4)" }}>
                            ({puzzle.answer.ticker})
                          </Box>
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          lineHeight: 1.75,
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        {puzzle.blurb}
                      </Typography>

                      <Button
                        onClick={advance}
                        endIcon={<ChevronRight size={16} />}
                        sx={{
                          mt: 2,
                          px: 3,
                          py: 1.1,
                          borderRadius: "100px",
                          fontFamily: MONO,
                          fontWeight: 700,
                          fontSize: "0.74rem",
                          letterSpacing: "0.16em",
                          color: "#0a0b11",
                          background: "#fff",
                          "&:hover": {
                            background: "#fff",
                            boxShadow: `0 10px 28px -10px ${alpha(accent, 0.7)}`,
                            transform: "translateY(-1px)",
                          },
                        }}
                      >
                        {roundIndex < puzzles.length - 1 ? "NEXT CHART" : "SEE RESULTS"}
                      </Button>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ---------------------------------------------- done */}
          {phase === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Box sx={{ maxWidth: 560, mx: "auto", py: { xs: 2, md: 4 } }}>
                <Box sx={{ textAlign: "center" }}>
                  <Label>Ticker #{puzzleNumber}</Label>
                  <Typography
                    sx={{
                      fontFamily: MONO,
                      fontWeight: 900,
                      fontSize: { xs: "3.4rem", md: "4.4rem" },
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                      background: `linear-gradient(180deg, #ffffff 0%, ${alpha(accent, 0.7)} 100%)`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {score}/{puzzles.length}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: "1rem",
                      fontWeight: 300,
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    {score === 3
                      ? "Perfect read. You've been watching the tape."
                      : score === 2
                        ? "Two out of three — solid chart instincts."
                        : score === 1
                          ? "One on the board. The tape is tricky."
                          : "Rough open. Tomorrow's charts are new."}
                  </Typography>
                </Box>

                {/* per-round breakdown */}
                <Box sx={{ mt: 4, display: "flex", flexDirection: "column", gap: 1 }}>
                  {puzzles.map((p, i) => {
                    const r = results[i];
                    const ok = r?.correct;
                    const color = ok ? UP : DOWN;
                    const picks = p.options.find((o) => o.ticker === r?.guess);
                    return (
                      <Box
                        key={p.answer.ticker}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          px: 2,
                          py: 1.5,
                          borderRadius: "14px",
                          background: "rgba(255,255,255,0.025)",
                          border: `1px solid ${alpha(color, 0.22)}`,
                        }}
                      >
                        <MiniSpark series={p.series} color={color} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{ fontSize: "0.92rem", fontWeight: 600, color: "#fff" }}
                          >
                            {p.answer.name}
                          </Typography>
                          <Label sx={{ fontSize: "0.56rem" }}>
                            {ok
                              ? r?.usedHint
                                ? "correct · hint used"
                                : "correct"
                              : `you said ${picks?.name ?? "—"}`}
                          </Label>
                        </Box>
                        <Box sx={{ flexGrow: 1 }} />
                        <Typography
                          sx={{
                            fontFamily: MONO,
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                            color: seriesStats(p.series).changePct >= 0 ? UP : DOWN,
                          }}
                        >
                          {signed(seriesStats(p.series).changePct, 1)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>

                {/* share */}
                <Box
                  sx={{
                    mt: 3,
                    p: 2.5,
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.022)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    textAlign: "center",
                  }}
                >
                  <Typography sx={{ fontSize: "1.5rem", letterSpacing: "0.1em", mb: 1.5 }}>
                    {results.map(resultEmoji).join("")}
                  </Typography>
                  <Button
                    onClick={copyShare}
                    startIcon={copied ? <Check size={15} /> : <Copy size={15} />}
                    sx={{
                      px: 3,
                      py: 1,
                      borderRadius: "100px",
                      fontFamily: MONO,
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      letterSpacing: "0.16em",
                      color: copied ? UP : "#fff",
                      border: `1px solid ${copied ? alpha(UP, 0.4) : "rgba(255,255,255,0.15)"}`,
                      "&:hover": { background: "rgba(255,255,255,0.05)" },
                    }}
                  >
                    {copied ? "COPIED" : "SHARE RESULT"}
                  </Button>
                </Box>

                <Box
                  sx={{
                    mt: 3,
                    display: "flex",
                    justifyContent: "center",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    pt: 2.5,
                  }}
                >
                  <StatCell label="streak" value={`${saved.streak}`} color="#fb923c" />
                  <StatCell label="best" value={`${saved.maxStreak}`} />
                  <StatCell label="accuracy" value={`${accuracy}%`} color={accent} />
                  <StatCell label="next chart" value={countdown} />
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {phase === "done" && score === puzzles.length && (
        <Box sx={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9 }}>
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            numberOfPieces={220}
            recycle={false}
            gravity={0.22}
            colors={[accent, UP, "#fbbf24", "#ffffff"]}
          />
        </Box>
      )}
    </Box>
  );
}
