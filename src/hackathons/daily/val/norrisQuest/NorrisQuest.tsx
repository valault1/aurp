import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Typography, alpha } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, ExternalLink, RotateCcw, TriangleAlert } from "lucide-react";
import { ArticleView } from "./ArticleView";
import { FullBleedPaper } from "./Paper";
import { LegDial, Stamps, VoyageBar } from "./VoyageBar";
import { useChartFonts } from "./useChartFonts";
import {
  GAME_NAME,
  HUB_HINTS,
  MAX_HOPS,
  TARGET,
  loadResult,
  marksFor,
  saveResult,
  seedForDay,
  shareText,
  todayIndex,
  type Result,
} from "./puzzles";
import { fetchArticle, titleKey, wikiUrl, type Article } from "./wiki";
import { CHART, DISPLAY, LABEL, READING, STAMP, type Chart, tornEdge } from "./tokens";

type Phase = "playing" | "won" | "lost";

/** Height of the sticky voyage bar, so a fresh article is not hidden behind it. */
const BAR_CLEARANCE = 132;

/**
 * Scrolls the window, and makes sure it actually happened.
 *
 * `behavior: "smooth"` is silently ignored by some embedded and in-app
 * browsers: the call returns, nothing moves, and the player never sees the
 * result they just earned. So we ask for smooth, then check a moment later —
 * if the page has not budged at all, jump instead. Anyone who asked for
 * reduced motion skips the animation entirely.
 */
function scrollWindowTo(top: number) {
  const target = Math.max(0, Math.round(top));
  const start = window.scrollY;
  if (Math.abs(start - target) < 4) return;

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: target });
    return;
  }

  window.scrollTo({ top: target, behavior: "smooth" });
  window.setTimeout(() => {
    // Any movement at all means smooth scrolling is running — leave it be.
    if (window.scrollY === start) window.scrollTo({ top: target });
  }, 250);
}

export function NorrisQuest() {
  useChartFonts();
  const c = CHART;
  const dayIndex = useMemo(() => todayIndex(), []);
  const seed = useMemo(() => seedForDay(dayIndex), [dayIndex]);

  /** The day's officially recorded voyage, if there already is one. */
  const [recorded, setRecorded] = useState<Result | null>(() => loadResult(dayIndex));
  /** A replay after the day is recorded does not overwrite the score. */
  const [unscored, setUnscored] = useState(false);

  const [path, setPath] = useState<string[]>([seed.start]);
  const [article, setArticle] = useState<Article | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const over = phase !== "playing";
  const showingRecord = recorded !== null && !unscored && phase === "playing";

  // A day already in the books replays its own route in the bar rather than
  // sitting at a pristine six-legs-remaining.
  const barPath = showingRecord ? recorded!.path : path;
  const barWon = showingRecord ? recorded!.outcome === "won" : phase === "won";
  const barLost = showingRecord ? recorded!.outcome === "lost" : phase === "lost";
  const legsLeft = MAX_HOPS - (barPath.length - 1);

  const abort = useRef<AbortController | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  /** Mirrors `path` so `go` can read the route without re-creating itself. */
  const pathRef = useRef<string[]>([seed.start]);

  /** Set after each navigation; the effect below does the actual scrolling. */
  const [scrollIntent, setScrollIntent] = useState<{ to: "board" | "top"; seq: number } | null>(null);
  const seq = useRef(0);
  const scrollTo = (to: "board" | "top") => setScrollIntent({ to, seq: (seq.current += 1) });

  // Scrolling runs from an effect rather than `requestAnimationFrame`: rAF
  // callbacks never fire while the page is not compositing — a background tab,
  // or an embedded browser that is hidden — which silently swallowed the jump
  // back to the top on a win. An effect runs after commit regardless.
  useEffect(() => {
    if (!scrollIntent) return;
    if (scrollIntent.to === "top") {
      scrollWindowTo(0);
      return;
    }
    const el = boardRef.current;
    if (el) scrollWindowTo(el.getBoundingClientRect().top + window.scrollY - BAR_CLEARANCE);
  }, [scrollIntent]);

  /** Loads an article; `hop` means it cost the player a leg. */
  const go = useCallback(
    async (title: string, hop: boolean) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      setLoading(true);
      setError(null);
      try {
        const next = await fetchArticle(title, controller.signal);
        if (controller.signal.aborted) return;

        setArticle(next);

        if (!hop) {
          pathRef.current = [next.title];
          setPath([next.title]);
          setPhase("playing");
          return;
        }

        const route = [...pathRef.current, next.title];
        const used = route.length - 1;
        const reached = titleKey(next.title) === titleKey(TARGET);
        const outcome: Phase = reached ? "won" : used >= MAX_HOPS ? "lost" : "playing";

        pathRef.current = route;
        setPath(route);
        setPhase(outcome);

        // First finished voyage of the day is the one that counts.
        if (outcome !== "playing" && !unscored && !recorded) {
          const result: Result = { outcome: outcome === "won" ? "won" : "lost", clicks: used, path: route };
          saveResult(dayIndex, result);
          setRecorded(result);
        }

        scrollTo(outcome === "playing" ? "board" : "top");
      } catch (e) {
        if (controller.signal.aborted) return;
        // A failed fetch must not cost a leg — the player never got to read it.
        setError(e instanceof Error ? e.message : "Could not reach Wikipedia");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [dayIndex, recorded, unscored],
  );

  useEffect(() => {
    void go(seed.start, false);
    return () => abort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed.start]);

  const replay = () => {
    setUnscored(true);
    pathRef.current = [seed.start];
    setPath([seed.start]);
    setPhase("playing");
    void go(seed.start, false);
    scrollTo("top");
  };

  const verdict: Result | null = showingRecord
    ? recorded
    : over
      ? { outcome: phase === "won" ? "won" : "lost", clicks: path.length - 1, path }
      : null;

  return (
    // Negative margins cancel the Daily wrapper's padding so the chart runs to
    // the full width of the container — a sheet laid on the desk, not a column.
    <Box
      sx={{
        position: "relative",
        mx: { xs: -2, md: -4 },
        mt: { xs: -2, md: -4 },
        // Short days still want chart under them all the way down.
        minHeight: "100vh",
      }}
    >
      <FullBleedPaper />

      <Box sx={{ position: "relative", zIndex: 1, maxWidth: 980, mx: "auto", px: { xs: 2.5, md: 5 }, py: { xs: 4, md: 6 } }}>
        <Masthead edition={seed.edition} start={seed.start} c={c} />

        {/* The voyage bar stays in view while the logbook scrolls under it. */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            mt: 3.5,
            px: { xs: 2, sm: 3 },
            py: 2,
            background: alpha(c.slip, 0.95),
            backdropFilter: "blur(14px)",
            border: `1px solid ${c.rule}`,
            boxShadow: `0 1px 0 ${"rgba(255,255,255,0.5)"} inset, 0 12px 28px ${"rgba(42,28,8,0.18)"}`,
          }}
        >
          <Box sx={{ position: "absolute", inset: "4px", border: `1px solid ${alpha(c.rule, 0.45)}`, pointerEvents: "none" }} />

          <Box sx={{ position: "relative" }}>
            <VoyageBar path={barPath} won={barWon} lost={barLost} />

            <Box
              sx={{
                mt: 2,
                pt: 1.75,
                borderTop: `1px solid ${alpha(c.rule, 0.7)}`,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Typography
                sx={{
                  flexShrink: 0,
                  fontFamily: LABEL,
                  fontSize: "0.5rem",
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: c.brassInk,
                  mt: 0.6,
                  display: { xs: "none", sm: "block" },
                }}
              >
                Ports of call
              </Typography>

              <Box sx={{ display: { xs: "none", md: "flex" }, flex: 1, minWidth: 0 }}>
                <Stamps path={barPath} won={barWon} lost={barLost} />
              </Box>
              <Box sx={{ display: { xs: "flex", md: "none" }, flex: 1, minWidth: 0 }}>
                <Stamps path={barPath} won={barWon} lost={barLost} maxItems={1} />
              </Box>

              <LegDial left={legsLeft} won={barWon} over={over || showingRecord} />
            </Box>
          </Box>
        </Box>

        <AnimatePresence>
          {verdict && (
            <Verdict
              key="verdict"
              result={verdict}
              edition={seed.edition}
              start={seed.start}
              c={c}
              unscored={unscored}
              replayed={showingRecord}
              onReplay={replay}
            />
          )}
        </AnimatePresence>

        {/* The logbook page */}
        <Box
          ref={boardRef}
          sx={{
            position: "relative",
            mt: 3,
            background: alpha(c.slip, 0.78),
            border: `1px solid ${c.rule}`,
            boxShadow: `0 14px 32px ${"rgba(42,28,8,0.16)"}, inset 0 0 50px ${"rgba(122,82,20,0.12)"}`,
            opacity: showingRecord ? 0.45 : 1,
            transition: "opacity .3s ease",
          }}
        >
          {/* hand-torn top and bottom edges */}
          <Box sx={{ position: "absolute", left: 0, right: 0, top: -3, height: 7, backgroundImage: tornEdge(false), backgroundRepeat: "repeat-x", pointerEvents: "none" }} />
          <Box sx={{ position: "absolute", left: 0, right: 0, bottom: -3, height: 7, backgroundImage: tornEdge(true), backgroundRepeat: "repeat-x", pointerEvents: "none" }} />
          {/* the ruled ledger margin */}
          <Box sx={{ position: "absolute", left: { xs: 22, md: 44 }, top: 0, bottom: 0, width: "1px", background: alpha(c.vermilion, 0.35), pointerEvents: "none" }} />
          <Box sx={{ position: "absolute", left: { xs: 25, md: 47 }, top: 0, bottom: 0, width: "1px", background: alpha(c.vermilion, 0.18), pointerEvents: "none" }} />

          {error ? (
            <CableDown message={error} c={c} onRetry={() => void go(path[path.length - 1]!, false)} />
          ) : (
            <>
              <LogHeader title={article?.displayTitle ?? seed.start} loading={loading} c={c} />
              <Box sx={{ pl: { xs: 5, md: 9 }, pr: { xs: 2.5, md: 5 }, pb: 6, pt: 2 }}>
                {loading && !article ? (
                  <Plotting c={c} />
                ) : (
                  article && (
                    <Box
                      component={motion.div}
                      key={article.title}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: loading ? 0.35 : 1, y: 0 }}
                      transition={{ duration: 0.28 }}
                    >
                      <ArticleView
                        html={article.html}
                        locked={loading || over || showingRecord}
                        onNavigate={(title) => void go(title, true)}
                      />
                    </Box>
                  )
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

function Masthead({ edition, start, c }: { edition: number; start: string; c: Chart }) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography
        sx={{
          fontFamily: LABEL,
          fontSize: "0.6rem",
          fontWeight: 600,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: c.brassInk,
        }}
      >
        Edition No. {edition}
      </Typography>

      <Typography
        sx={{
          mt: 1,
          fontFamily: DISPLAY,
          fontWeight: 900,
          fontSize: { xs: "2.6rem", sm: "4rem" },
          lineHeight: 0.98,
          letterSpacing: "-0.015em",
          color: c.ink,
        }}
      >
        {GAME_NAME}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2, mb: 1.75, maxWidth: 520, mx: "auto" }}>
        <Box sx={{ height: 2, width: 64, background: c.vermilion }} />
        <Box sx={{ height: "1px", flex: 1, background: c.rule }} />
        <Box sx={{ height: 2, width: 16, background: c.brass }} />
      </Box>

      <Typography
        sx={{
          fontFamily: READING,
          fontStyle: "italic",
          fontSize: { xs: "0.88rem", sm: "1rem" },
          color: c.inkSoft,
        }}
      >
        {start} &nbsp;⟶&nbsp; {TARGET} &middot; six links, no more
      </Typography>
    </Box>
  );
}

function LogHeader({ title, loading, c }: { title: string; loading: boolean; c: Chart }) {
  return (
    <Box sx={{ pl: { xs: 5, md: 9 }, pr: { xs: 2.5, md: 5 }, pt: 4, pb: 2, borderBottom: `1px solid ${alpha(c.rule, 0.8)}` }}>
      <Typography
        sx={{
          fontFamily: LABEL,
          fontSize: "0.5rem",
          fontWeight: 600,
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: c.brassInk,
        }}
      >
        {loading ? "Plotting the course" : "Making port at"}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}>
        <Typography
          sx={{
            fontFamily: LABEL,
            fontWeight: 700,
            fontSize: { xs: "1.4rem", sm: "1.8rem" },
            letterSpacing: "0.03em",
            color: c.ink,
          }}
        >
          {title}
        </Typography>
        <Box
          component="a"
          href={wikiUrl(title)}
          target="_blank"
          rel="noreferrer noopener"
          title="Open on Wikipedia — costs no leg"
          sx={{ display: "inline-flex", color: alpha(c.brass, 0.7), "&:hover": { color: c.vermilion }, transition: "color .2s ease" }}
        >
          <ExternalLink size={14} />
        </Box>
      </Box>
    </Box>
  );
}

/** Loading shimmer in the shape of a page. */
function Plotting({ c }: { c: Chart }) {
  const bars = [92, 100, 86, 97, 64, 0, 100, 90, 95, 70];
  return (
    <Box sx={{ py: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
      {bars.map((w, i) =>
        w === 0 ? (
          <Box key={i} sx={{ height: 14 }} />
        ) : (
          <Box
            key={i}
            component={motion.div}
            animate={{ opacity: [0.22, 0.5, 0.22] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.08 }}
            sx={{ height: 12, width: `${w}%`, borderRadius: "2px", background: alpha(c.ink, 0.14) }}
          />
        ),
      )}
    </Box>
  );
}

function CableDown({ message, onRetry, c }: { message: string; onRetry: () => void; c: Chart }) {
  return (
    <Box sx={{ p: { xs: 5, sm: 8 }, textAlign: "center" }}>
      <TriangleAlert size={26} color={c.vermilion} />
      <Typography sx={{ mt: 2, fontFamily: LABEL, fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: c.ink }}>
        The cable is down
      </Typography>
      <Typography sx={{ mt: 1, fontFamily: READING, fontStyle: "italic", fontSize: "0.9rem", color: c.inkSoft }}>
        {message} — that one cost you no leg.
      </Typography>
      <ChartButton onClick={onRetry} c={c} icon={<RotateCcw size={14} />} sx={{ mt: 3.5 }}>
        Try the wire again
      </ChartButton>
    </Box>
  );
}

function ChartButton({
  children,
  onClick,
  c,
  icon,
  filled,
  sx,
}: {
  children: React.ReactNode;
  onClick: () => void;
  c: Chart;
  icon?: React.ReactNode;
  filled?: boolean;
  sx?: object;
}) {
  return (
    <Button
      onClick={onClick}
      startIcon={icon}
      sx={{
        px: 3,
        py: 1.35,
        borderRadius: "2px",
        fontFamily: LABEL,
        fontSize: "0.66rem",
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        ...(filled
          ? {
              color: c.slip,
              background: c.vermilion,
              border: `1px solid ${alpha(c.vermilion, 0.9)}`,
              "&:hover": { background: c.vermilion, filter: "brightness(1.08)" },
            }
          : {
              color: c.ink,
              border: `1px solid ${c.rule}`,
              "&:hover": { background: alpha(c.rule, 0.22) },
            }),
        ...sx,
      }}
    >
      {children}
    </Button>
  );
}

/* ------------------------------------------------------------------ *
 * Arrival, or abandonment
 * ------------------------------------------------------------------ */

function Verdict({
  result,
  edition,
  start,
  c,
  unscored,
  replayed,
  onReplay,
}: {
  result: Result;
  edition: number;
  start: string;
  c: Chart;
  unscored: boolean;
  replayed: boolean;
  onReplay: () => void;
}) {
  const [copied, setCopied] = useState(false);
  // Clipboard writes are refused outright in some browsers and settings. The
  // old silent catch meant the button simply did nothing, with no way to get
  // the log out — so a refusal now reveals the text to copy by hand.
  const [manual, setManual] = useState(false);
  const won = result.outcome === "won";
  const text = shareText({ edition, start }, result);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setManual(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setManual(true);
    }
  };

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: -12, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      sx={{ overflow: "hidden" }}
    >
      <Box
        sx={{
          position: "relative",
          mt: 3,
          px: { xs: 3, sm: 5 },
          py: 4,
          textAlign: "center",
          background: alpha(c.slip, 0.9),
          border: `1px solid ${won ? c.brass : c.rule}`,
          boxShadow: `0 14px 34px ${"rgba(42,28,8,0.16)"}`,
        }}
      >
        <Box sx={{ position: "absolute", inset: "4px", border: `1px solid ${alpha(won ? c.brass : c.rule, 0.45)}`, pointerEvents: "none" }} />

        <Box sx={{ position: "relative" }}>
          {won ? <ArrivalSeal edition={edition} /> : <AbandonedStamp c={c} />}

          <Typography sx={{ mt: 3, fontFamily: READING, fontStyle: "italic", fontSize: { xs: "1.05rem", sm: "1.2rem" }, color: c.ink }}>
            {won ? "The wager is won." : "Six legs spent; the port never made."}
          </Typography>

          <Typography sx={{ mt: 1.25, fontFamily: DISPLAY, fontWeight: 900, fontSize: "3.4rem", lineHeight: 1, color: won ? c.vermilion : c.inkSoft }}>
            {won ? result.clicks : "—"}
            <Box component="span" sx={{ fontSize: "1.35rem", fontWeight: 700, color: c.brassInk }}>
              &thinsp;/&thinsp;{MAX_HOPS}
            </Box>
          </Typography>

          <Typography sx={{ mt: 1, fontFamily: READING, fontSize: "0.88rem", color: c.inkSoft }}>
            {won
              ? `${result.clicks} ${result.clicks === 1 ? "leg" : "legs"} from ${start} to ${TARGET}.`
              : `${TARGET} still out of reach from ${start}.`}
          </Typography>

          <Typography sx={{ mt: 2.5, fontSize: "1.35rem", letterSpacing: "0.1em", lineHeight: 1 }}>
            {marksFor(result).join("")}
          </Typography>

          {(unscored || replayed) && (
            <Typography
              sx={{
                mt: 1.5,
                fontFamily: LABEL,
                fontSize: "0.55rem",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: alpha(c.inkSoft, 0.8),
              }}
            >
              {replayed ? "Today's voyage is already logged" : "Replay — not logged"}
            </Typography>
          )}

          <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
            <Stamps path={result.path} won={won} lost={!won} center />
          </Box>

          {!won && (
            <Box sx={{ mt: 3.5 }}>
              <Typography sx={{ fontFamily: LABEL, fontSize: "0.5rem", fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", color: c.brassInk }}>
                Harbours one leg from him
              </Typography>
              <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: "center" }}>
                {HUB_HINTS.map((hub) => (
                  <Box
                    key={hub}
                    sx={{
                      fontFamily: LABEL,
                      fontSize: "0.62rem",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      px: 1.25,
                      py: 0.6,
                      color: c.brassInk,
                      border: `1px solid ${alpha(c.brass, 0.5)}`,
                    }}
                  >
                    {hub}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Box sx={{ mt: 4, display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap" }}>
            <ChartButton onClick={copy} c={c} filled icon={copied ? <Check size={14} /> : <Copy size={14} />}>
              {copied ? "Copied" : "Copy the log"}
            </ChartButton>
            <ChartButton onClick={onReplay} c={c} icon={<RotateCcw size={14} />}>
              Sail it again
            </ChartButton>
          </Box>

          {manual && (
            <Box sx={{ mt: 2.5 }}>
              <Typography
                sx={{
                  fontFamily: LABEL,
                  fontSize: "0.5rem",
                  fontWeight: 600,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: c.brassInk,
                  mb: 1,
                }}
              >
                Your browser blocked the clipboard — copy it by hand
              </Typography>
              <Box
                component="textarea"
                readOnly
                value={text}
                rows={4}
                onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => e.currentTarget.select()}
                sx={{
                  width: "100%",
                  resize: "none",
                  fontFamily: READING,
                  fontSize: "0.85rem",
                  lineHeight: 1.6,
                  textAlign: "center",
                  color: c.ink,
                  background: alpha(c.ground, 0.6),
                  border: `1px solid ${c.rule}`,
                  borderRadius: "2px",
                  padding: "10px",
                }}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function ArrivalSeal({ edition }: { edition: number }) {
  return (
    <Box
      component={motion.div}
      initial={{ scale: 1.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 16 }}
      sx={{
        width: 108,
        height: 108,
        mx: "auto",
        display: "grid",
        placeItems: "center",
        transform: "rotate(-4deg)",
        borderRadius: "47% 53% 52% 48% / 50% 47% 53% 50%",
        background: "radial-gradient(circle at 34% 28%, #c4472f, #8a2516 74%)",
        boxShadow:
          "0 8px 18px rgba(70,24,12,0.45), inset 0 -5px 12px rgba(0,0,0,0.32), inset 0 3px 8px rgba(255,180,150,0.22)",
      }}
    >
      <Box>
        <Typography sx={{ fontFamily: LABEL, fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.14em", color: "#f6dcb4", lineHeight: 1 }}>
          ARRIVED
        </Typography>
        <Box sx={{ width: 36, height: "1px", background: "rgba(246,220,180,0.55)", mx: "auto", my: 0.7 }} />
        <Typography sx={{ fontFamily: LABEL, fontSize: "0.55rem", letterSpacing: "0.18em", color: "rgba(246,220,180,0.82)", lineHeight: 1 }}>
          No. {edition}
        </Typography>
      </Box>
    </Box>
  );
}

function AbandonedStamp({ c }: { c: Chart }) {
  const ink = alpha(c.vermilion, 0.78);
  const paper = c.slip;
  return (
    <Box
      component={motion.div}
      initial={{ scale: 1.5, opacity: 0, rotate: 0 }}
      animate={{ scale: 1, opacity: 1, rotate: -7 }}
      transition={{ duration: 0.2, ease: [0.3, 0.9, 0.4, 1] }}
      sx={{
        position: "relative",
        display: "inline-block",
        mt: 1,
        p: "3px",
        borderRadius: "5px",
        border: `3px solid ${ink}`,
        backgroundImage: [
          `radial-gradient(circle at 8% 22%, ${alpha(paper, 0.9)} 0 5px, transparent 7px)`,
          `radial-gradient(circle at 94% 68%, ${alpha(paper, 0.85)} 0 4px, transparent 6px)`,
          `radial-gradient(circle at 38% 98%, ${alpha(paper, 0.8)} 0 4px, transparent 6px)`,
          `radial-gradient(circle at 70% 2%, ${alpha(paper, 0.8)} 0 3px, transparent 5px)`,
        ].join(","),
      }}
    >
      <Box sx={{ border: `1.5px solid ${alpha(c.vermilion, 0.56)}`, borderRadius: "3px", px: 3.25, py: 1.5 }}>
        <Typography sx={{ fontFamily: STAMP, fontSize: { xs: "1.5rem", sm: "1.85rem" }, lineHeight: 1.05, color: ink, textShadow: `0 0 2px ${alpha(c.vermilion, 0.35)}` }}>
          Voyage
          <br />
          Abandoned
        </Typography>
      </Box>
      <Box
        sx={{
          position: "absolute",
          inset: "-4px",
          pointerEvents: "none",
          backgroundImage: [
            `radial-gradient(circle at 26% 10%, ${alpha(paper, 0.75)} 0 3px, transparent 5px)`,
            `radial-gradient(circle at 62% 94%, ${alpha(paper, 0.7)} 0 3px, transparent 5px)`,
            `radial-gradient(circle at 2% 62%, ${alpha(paper, 0.8)} 0 4px, transparent 6px)`,
          ].join(","),
        }}
      />
    </Box>
  );
}
