import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, IconButton, Typography, alpha, useTheme } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import Confetti from "react-confetti";
import {
  Building2,
  Check,
  Copy,
  Minus,
  Plane,
  Plus,
  Rocket,
  Ship,
  TrainFront,
} from "lucide-react";
import { PriceDial } from "./PriceDial";
import {
  CATEGORY_LABEL,
  MAX_SCORE_PER_LOT,
  describeMiss,
  formatExact,
  formatShort,
  fractionToValue,
  gradeFor,
  puzzleForDay,
  scoreGuess,
  snapToSigFigs,
  tierFor,
  todayIndex,
  valueToFraction,
  type Category,
  type Lot,
} from "./puzzles";
import { DISPLAY, GOLD, GOLD_DEEP, GOLD_SOFT, MONO, useGameColors } from "./tokens";
import { useDisplayFont } from "./useDisplayFont";

const STORAGE_PREFIX = "bigticket.v1.day";

const CATEGORY_ICON: Record<Category, typeof Building2> = {
  architecture: Building2,
  aviation: Plane,
  maritime: Ship,
  space: Rocket,
  infrastructure: TrainFront,
};

type Saved = { guesses: number[] };

function loadSaved(dayIndex: number): Saved | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${dayIndex}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved;
    if (!Array.isArray(parsed?.guesses)) return null;
    return { guesses: parsed.guesses.filter((g) => typeof g === "number" && g > 0) };
  } catch {
    return null;
  }
}

function saveGuesses(dayIndex: number, guesses: number[]) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${dayIndex}`, JSON.stringify({ guesses }));
  } catch {
    /* private browsing — the game still plays, it just won't persist */
  }
}

/** The opening position: geometric midpoint of the lot's range. */
function startValue(lot: Lot) {
  return snapToSigFigs(fractionToValue(0.5, lot.min, lot.max));
}

export function BigTicket() {
  useDisplayFont();
  const theme = useTheme();
  const dayIndex = useMemo(() => todayIndex(), []);
  const puzzle = useMemo(() => puzzleForDay(dayIndex), [dayIndex]);
  const lots = puzzle.lots;

  const [guesses, setGuesses] = useState<number[]>(() => loadSaved(dayIndex)?.guesses ?? []);
  const [revealed, setRevealed] = useState(false);
  const finished = guesses.length >= lots.length;
  // While an answer is on screen we stay on the lot that was just locked in.
  const lotIndex = revealed
    ? guesses.length - 1
    : Math.min(guesses.length, lots.length - 1);
  const lot = lots[lotIndex]!;

  const [value, setValue] = useState(() => startValue(lots[Math.min(guesses.length, lots.length - 1)]!));

  const lock = () => {
    setGuesses((prev) => {
      const next = [...prev, value];
      saveGuesses(dayIndex, next);
      return next;
    });
    setRevealed(true);
  };

  const advance = () => {
    setRevealed(false);
    const nextLot = lots[Math.min(guesses.length, lots.length - 1)]!;
    setValue(startValue(nextLot));
  };

  const nudge = (decades: number) => {
    const span = Math.log10(lot.max / lot.min);
    const t = valueToFraction(value, lot.min, lot.max) + decades / span;
    setValue(snapToSigFigs(fractionToValue(t, lot.min, lot.max)));
  };

  const total = guesses.reduce((sum, g, i) => sum + scoreGuess(g, lots[i]!.actual), 0);

  return (
    <Box sx={{ maxWidth: 760, mx: "auto", position: "relative" }}>
      <Masthead
        edition={puzzle.edition}
        lotCount={lots.length}
        completed={guesses.length}
        activeIndex={finished && !revealed ? -1 : lotIndex}
      />

      <AnimatePresence mode="wait">
        {finished && !revealed ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <Summary edition={puzzle.edition} lots={lots} guesses={guesses} total={total} />
          </motion.div>
        ) : (
          <motion.div
            key={`lot-${lotIndex}`}
            initial={{ opacity: 0, y: 24, rotateX: -4 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: -24, rotateX: 4 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ perspective: 1200 }}
          >
            <LotCard
              lot={lot}
              lotNumber={lotIndex + 1}
              value={value}
              onChange={setValue}
              onNudge={nudge}
              revealed={revealed}
              onLock={lock}
              onAdvance={advance}
              isFinalLot={lotIndex === lots.length - 1}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Typography
        sx={{
          mt: 3,
          textAlign: "center",
          fontSize: 12,
          letterSpacing: "0.1em",
          color: alpha(theme.palette.text.primary, 0.3),
        }}
      >
        {finished ? "One lot sheet per day. Scores are kept." : "Drag the rail. Scale is logarithmic."}
      </Typography>
    </Box>
  );
}

/* ------------------------------------------------------------------ *
 * Masthead
 * ------------------------------------------------------------------ */

function Masthead({
  edition,
  lotCount,
  completed,
  activeIndex,
}: {
  edition: number;
  lotCount: number;
  completed: number;
  activeIndex: number;
}) {
  const theme = useTheme();
  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    [],
  );

  return (
    <Box sx={{ textAlign: "center", mb: { xs: 3, md: 4 } }}>
      <Typography
        sx={{
          fontFamily: DISPLAY,
          fontSize: { xs: 34, md: 44 },
          fontWeight: 700,
          letterSpacing: { xs: "0.14em", md: "0.2em" },
          lineHeight: 1,
          textTransform: "uppercase",
          background: `linear-gradient(175deg, ${GOLD_SOFT} 0%, ${GOLD} 48%, ${GOLD_DEEP} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textIndent: { xs: "0.14em", md: "0.2em" },
        }}
      >
        Big Ticket
      </Typography>

      <Box
        sx={{
          mt: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
        }}
      >
        <Rule />
        <Typography
          sx={{
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: alpha(theme.palette.text.primary, 0.5),
            whiteSpace: "nowrap",
          }}
        >
          No.{edition} · {today}
        </Typography>
        <Rule />
      </Box>

      <Box sx={{ mt: 2, display: "flex", justifyContent: "center", gap: 1 }}>
        {Array.from({ length: lotCount }, (_, i) => (
          <Box
            key={i}
            sx={{
              width: i === activeIndex ? 22 : 7,
              height: 7,
              borderRadius: 999,
              background:
                i < completed
                  ? GOLD
                  : i === activeIndex
                    ? alpha(GOLD, 0.55)
                    : alpha(theme.palette.text.primary, 0.14),
              transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

function Rule() {
  return (
    <Box
      sx={{
        width: { xs: 28, sm: 64 },
        height: 1,
        background: `linear-gradient(90deg, transparent, ${alpha(GOLD, 0.5)}, transparent)`,
      }}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Lot card
 * ------------------------------------------------------------------ */

function LotCard({
  lot,
  lotNumber,
  value,
  onChange,
  onNudge,
  revealed,
  onLock,
  onAdvance,
  isFinalLot,
}: {
  lot: Lot;
  lotNumber: number;
  value: number;
  onChange: (v: number) => void;
  onNudge: (decades: number) => void;
  revealed: boolean;
  onLock: () => void;
  onAdvance: () => void;
  isFinalLot: boolean;
}) {
  const theme = useTheme();
  const c = useGameColors();
  const Icon = CATEGORY_ICON[lot.category];
  const tier = revealed ? tierFor(value, lot.actual) : null;
  const tierColor = tier ? c.tier(tier.id) : GOLD;
  const score = revealed ? scoreGuess(value, lot.actual) : 0;
  const animatedActual = useCountUp(revealed ? lot.actual : 0, 900, revealed);

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "22px",
        background: `linear-gradient(165deg, ${alpha(theme.palette.background.paper, 0.92)}, ${alpha(
          theme.palette.background.paper,
          0.62,
        )})`,
        backdropFilter: "blur(16px)",
        border: `1px solid ${alpha(GOLD, revealed ? 0.3 : 0.16)}`,
        boxShadow: `0 24px 70px -28px ${alpha("#000", 0.75)}, inset 0 1px 0 ${alpha(GOLD_SOFT, 0.1)}`,
        transition: "border-color 400ms ease",
      }}
    >
      {/* engraved hatching + category watermark */}
      <Box sx={{ position: "absolute", inset: 0, background: c.engraving, pointerEvents: "none" }} />
      <Box
        sx={{
          position: "absolute",
          right: -28,
          top: -24,
          opacity: 0.055,
          color: GOLD_SOFT,
          pointerEvents: "none",
        }}
      >
        <Icon size={230} strokeWidth={1} />
      </Box>

      <Box sx={{ position: "relative", p: { xs: 2.5, sm: 4 } }}>
        {/* Lot header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2.5 }}>
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.18em",
              px: 1,
              py: 0.4,
              borderRadius: "6px",
              color: GOLD_SOFT,
              background: alpha(GOLD, 0.12),
              border: `1px solid ${alpha(GOLD, 0.28)}`,
            }}
          >
            LOT {String(lotNumber).padStart(2, "0")}
          </Typography>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: alpha(theme.palette.text.primary, 0.4),
            }}
          >
            {CATEGORY_LABEL[lot.category]}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontFamily: DISPLAY,
            fontSize: { xs: 29, sm: 40 },
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            color: theme.palette.text.primary,
          }}
        >
          {lot.name}
        </Typography>
        <Typography
          sx={{
            mt: 1.25,
            fontSize: { xs: 13.5, sm: 15 },
            lineHeight: 1.5,
            maxWidth: 480,
            color: alpha(theme.palette.text.primary, 0.58),
          }}
        >
          {lot.prompt}
        </Typography>

        {/* Hero readout */}
        <Box sx={{ mt: { xs: 3, sm: 4 }, textAlign: "center" }}>
          <Typography
            sx={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: alpha(theme.palette.text.primary, 0.35),
            }}
          >
            {revealed ? "Actual price" : "Your appraisal"}
          </Typography>

          <Box
            sx={{
              mt: 0.75,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: { xs: 1, sm: 2 },
            }}
          >
            {!revealed && <NudgeButton icon={Minus} onClick={() => onNudge(-0.03)} label="Lower" />}
            <Box sx={{ minWidth: { xs: 160, sm: 230 } }}>
              <Typography
                sx={{
                  fontFamily: MONO,
                  fontSize: { xs: 38, sm: 52 },
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  color: revealed ? tierColor : GOLD_SOFT,
                  textShadow: `0 0 36px ${alpha(revealed ? tierColor : GOLD, 0.35)}`,
                  transition: "color 400ms ease",
                }}
              >
                {formatShort(revealed ? animatedActual : value)}
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontFamily: MONO,
                  fontSize: 11.5,
                  letterSpacing: "0.06em",
                  fontVariantNumeric: "tabular-nums",
                  color: alpha(theme.palette.text.primary, 0.38),
                }}
              >
                {formatExact(revealed ? animatedActual : value)}
              </Typography>
            </Box>
            {!revealed && <NudgeButton icon={Plus} onClick={() => onNudge(0.03)} label="Higher" />}
          </Box>
        </Box>

        {/* The dial */}
        <PriceDial
          min={lot.min}
          max={lot.max}
          value={value}
          onChange={onChange}
          disabled={revealed}
          actual={revealed ? lot.actual : undefined}
          gapColor={tierColor}
        />

        {/* Action / verdict */}
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div key="lock" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Button
                fullWidth
                onClick={onLock}
                sx={{
                  mt: 1,
                  py: 1.6,
                  borderRadius: "14px",
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#1a1206",
                  background: `linear-gradient(175deg, ${GOLD_SOFT}, ${GOLD} 55%, ${GOLD_DEEP})`,
                  boxShadow: `0 10px 30px -10px ${alpha(GOLD, 0.6)}`,
                  "&:hover": {
                    background: `linear-gradient(175deg, ${GOLD_SOFT}, ${GOLD} 70%, ${GOLD})`,
                    boxShadow: `0 14px 36px -10px ${alpha(GOLD, 0.75)}`,
                  },
                }}
              >
                Lock in appraisal
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <Box
                sx={{
                  mt: 1,
                  p: 2.25,
                  borderRadius: "16px",
                  background: alpha(tierColor, 0.07),
                  border: `1px solid ${alpha(tierColor, 0.25)}`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: DISPLAY,
                        fontSize: 24,
                        fontWeight: 700,
                        color: tierColor,
                        lineHeight: 1.1,
                      }}
                    >
                      {tier!.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: MONO,
                        fontSize: 12,
                        letterSpacing: "0.08em",
                        color: alpha(theme.palette.text.primary, 0.55),
                      }}
                    >
                      You said {formatShort(value)} — {describeMiss(value, lot.actual)}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: tierColor,
                    }}
                  >
                    +{score}
                  </Typography>
                </Box>

                <Box sx={{ height: 1, my: 1.75, background: alpha(tierColor, 0.18) }} />

                <Typography
                  sx={{
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: alpha(theme.palette.text.primary, 0.72),
                  }}
                >
                  {lot.fact}
                </Typography>
              </Box>

              <Button
                fullWidth
                onClick={onAdvance}
                sx={{
                  mt: 2,
                  py: 1.5,
                  borderRadius: "14px",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: GOLD_SOFT,
                  border: `1px solid ${alpha(GOLD, 0.35)}`,
                  background: alpha(GOLD, 0.06),
                  "&:hover": { background: alpha(GOLD, 0.14) },
                }}
              >
                {isFinalLot ? "See the tally" : `Next lot →`}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
}

function NudgeButton({
  icon: Icon,
  onClick,
  label,
}: {
  icon: typeof Plus;
  onClick: () => void;
  label: string;
}) {
  const theme = useTheme();
  return (
    <IconButton
      onClick={onClick}
      aria-label={label}
      sx={{
        width: 38,
        height: 38,
        color: alpha(theme.palette.text.primary, 0.6),
        border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
        "&:hover": { color: GOLD_SOFT, borderColor: alpha(GOLD, 0.4), background: alpha(GOLD, 0.08) },
      }}
    >
      <Icon size={17} />
    </IconButton>
  );
}

/* ------------------------------------------------------------------ *
 * Summary
 * ------------------------------------------------------------------ */

function Summary({
  edition,
  lots,
  guesses,
  total,
}: {
  edition: number;
  lots: Lot[];
  guesses: number[];
  total: number;
}) {
  const theme = useTheme();
  const c = useGameColors();
  const [copied, setCopied] = useState(false);
  const maxTotal = lots.length * MAX_SCORE_PER_LOT;
  const grade = gradeFor(total, lots.length);
  const animatedTotal = useCountUp(total, 1100, true);
  const celebrate = total >= maxTotal * 0.8;

  const [confettiOn, setConfettiOn] = useState(celebrate);
  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setConfettiOn(false), 5000);
    return () => clearTimeout(t);
  }, [celebrate]);

  const squares = guesses.map((g, i) => tierFor(g, lots[i]!.actual).square).join("");
  const shareText = `BIG TICKET No.${edition}\n${squares}  ${total.toLocaleString(
    "en-US",
  )}/${maxTotal.toLocaleString("en-US")}\n${grade}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the squares are on screen to read off anyway */
    }
  };

  return (
    <Box sx={{ position: "relative" }}>
      {confettiOn && <Confetti numberOfPieces={160} recycle={false} gravity={0.22} />}

      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "22px",
          background: `linear-gradient(165deg, ${alpha(theme.palette.background.paper, 0.94)}, ${alpha(
            theme.palette.background.paper,
            0.66,
          )})`,
          backdropFilter: "blur(16px)",
          border: `1px solid ${alpha(GOLD, 0.3)}`,
          boxShadow: `0 24px 70px -28px ${alpha("#000", 0.75)}, inset 0 1px 0 ${alpha(GOLD_SOFT, 0.12)}`,
          p: { xs: 2.5, sm: 4 },
        }}
      >
        <Box sx={{ position: "absolute", inset: 0, background: c.engraving, pointerEvents: "none" }} />

        <Box sx={{ position: "relative", textAlign: "center" }}>
          <Typography
            sx={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: alpha(theme.palette.text.primary, 0.35),
            }}
          >
            Lot sheet closed
          </Typography>

          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: { xs: 56, sm: 72 },
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
              color: GOLD_SOFT,
              textShadow: `0 0 50px ${alpha(GOLD, 0.35)}`,
            }}
          >
            {animatedTotal.toLocaleString("en-US")}
          </Typography>
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: "0.14em",
              color: alpha(theme.palette.text.primary, 0.4),
            }}
          >
            OF {maxTotal.toLocaleString("en-US")} POINTS
          </Typography>

          <Typography
            sx={{
              mt: 2,
              fontFamily: DISPLAY,
              fontSize: { xs: 26, sm: 32 },
              fontWeight: 700,
              color: theme.palette.text.primary,
            }}
          >
            {grade}
          </Typography>

          <Typography sx={{ mt: 1.5, fontSize: 24, letterSpacing: "0.12em" }}>{squares}</Typography>
        </Box>

        {/* Ledger */}
        <Box sx={{ position: "relative", mt: 3.5 }}>
          {lots.map((l, i) => {
            const guess = guesses[i]!;
            const tier = tierFor(guess, l.actual);
            const color = c.tier(tier.id);
            return (
              <Box
                key={l.name}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr auto", sm: "1fr 185px 62px" },
                  alignItems: "center",
                  gap: 1.5,
                  py: 1.75,
                  borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {l.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: MONO,
                      fontSize: 11.5,
                      color: alpha(theme.palette.text.primary, 0.45),
                    }}
                  >
                    {formatShort(guess)} vs {formatShort(l.actual)}
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    display: { xs: "none", sm: "block" },
                    fontFamily: MONO,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    color,
                  }}
                >
                  {tier.label.toUpperCase()} · {describeMiss(guess, l.actual)}
                </Typography>

                <Typography
                  sx={{
                    fontFamily: MONO,
                    fontSize: 16,
                    fontWeight: 700,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    color,
                  }}
                >
                  {scoreGuess(guess, l.actual)}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Button
          fullWidth
          onClick={copy}
          startIcon={copied ? <Check size={16} /> : <Copy size={16} />}
          sx={{
            mt: 3,
            py: 1.5,
            borderRadius: "14px",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#1a1206",
            background: `linear-gradient(175deg, ${GOLD_SOFT}, ${GOLD} 55%, ${GOLD_DEEP})`,
            boxShadow: `0 10px 30px -10px ${alpha(GOLD, 0.55)}`,
            "&:hover": { background: `linear-gradient(175deg, ${GOLD_SOFT}, ${GOLD} 70%, ${GOLD})` },
          }}
        >
          {copied ? "Copied" : "Copy result"}
        </Button>

        <NextSheetCountdown />
      </Box>
    </Box>
  );
}

function NextSheetCountdown() {
  const theme = useTheme();
  const [label, setLabel] = useState(() => untilMidnight());

  useEffect(() => {
    const id = setInterval(() => setLabel(untilMidnight()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Typography
      sx={{
        position: "relative",
        mt: 2,
        textAlign: "center",
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: alpha(theme.palette.text.primary, 0.38),
      }}
    >
      Next lot sheet in {label}
    </Typography>
  );
}

function untilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const ms = midnight.getTime() - now.getTime();
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

/* ------------------------------------------------------------------ *
 * Count-up
 * ------------------------------------------------------------------ */

function useCountUp(target: number, durationMs: number, active: boolean) {
  const [n, setN] = useState(active ? 0 : target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setN(target);
      return;
    }
    // rAF reports the frame's start time, which can predate this call -- take
    // the origin from the first callback instead of from performance.now().
    let origin: number | null = null;
    const tick = (now: number) => {
      if (origin === null) origin = now;
      const t = Math.min(1, Math.max(0, (now - origin) / durationMs));
      const eased = 1 - Math.pow(1 - t, 3);
      setN(target * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else setN(target);
    };
    frame.current = requestAnimationFrame(tick);
    // rAF is suspended while the tab is hidden; land on the real number anyway.
    const settle = setTimeout(() => setN(target), durationMs + 150);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      clearTimeout(settle);
    };
  }, [target, durationMs, active]);

  return Math.round(n);
}
