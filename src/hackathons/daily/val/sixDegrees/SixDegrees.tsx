import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Typography, alpha, useTheme } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import Confetti from "react-confetti";
import { Check, Copy, ExternalLink, RotateCcw, Signal, TriangleAlert } from "lucide-react";
import { ArticleView } from "./ArticleView";
import { HopChain, Trail } from "./HopChain";
import {
  HUB_HINTS,
  MAX_HOPS,
  TARGET,
  loadResult,
  saveResult,
  seedForDay,
  shareText,
  todayIndex,
  type Result,
} from "./puzzles";
import { fetchArticle, titleKey, wikiUrl, type Article } from "./wiki";
import { DOSSIER_GRID, MONO, SIGNAL, accentsFor } from "./tokens";

type Phase = "playing" | "won" | "lost";

/** Sticky-HUD height, so a freshly loaded article is not hidden behind it. */
const HUD_CLEARANCE = 120;

export function SixDegrees() {
  const theme = useTheme();
  const { signal } = accentsFor(theme);
  const dayIndex = useMemo(() => todayIndex(), []);
  const seed = useMemo(() => seedForDay(dayIndex), [dayIndex]);

  /** The day's officially recorded run, if there already is one. */
  const [recorded, setRecorded] = useState<Result | null>(() => loadResult(dayIndex));
  /** A replay after the day is already recorded does not overwrite the score. */
  const [unscored, setUnscored] = useState(false);

  const [path, setPath] = useState<string[]>([seed.start]);
  const [article, setArticle] = useState<Article | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clicks = path.length - 1;
  const hopsLeft = MAX_HOPS - clicks;
  const over = phase !== "playing";
  // Only surface the saved result until the player opts into a replay.
  const showingRecord = recorded !== null && !unscored && phase === "playing";

  // When we are showing a day that is already in the books, the HUD should
  // replay that run's route rather than sitting at a pristine six-hops-left.
  const hudPath = showingRecord ? recorded!.path : path;
  const hudWon = showingRecord ? recorded!.outcome === "won" : phase === "won";
  const hudLost = showingRecord ? recorded!.outcome === "lost" : phase === "lost";

  const abort = useRef<AbortController | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  /** Mirrors `path` so `go` can read the route without re-creating itself. */
  const pathRef = useRef<string[]>([seed.start]);

  /**
   * A new article arrives below wherever the player happened to be reading, so
   * the view has to be pulled back to the top of the board — far enough down
   * that the sticky HUD does not cover the article title.
   */
  const scrollTo = (where: "board" | "top") => {
    requestAnimationFrame(() => {
      if (where === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const el = boardRef.current;
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - HUD_CLEARANCE;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    });
  };

  /** Loads an article; `hop` means it cost the player a link click. */
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

        // First finished run of the day is the one that counts.
        if (outcome !== "playing" && !unscored && !recorded) {
          const result: Result = { outcome: outcome === "won" ? "won" : "lost", clicks: used, path: route };
          saveResult(dayIndex, result);
          setRecorded(result);
        }

        // A finished run puts the verdict on screen; an unfinished one puts the
        // new article's opening paragraph there.
        scrollTo(outcome === "playing" ? "board" : "top");
      } catch (e) {
        if (controller.signal.aborted) return;
        // A failed fetch must not cost a hop — the player never got to read it.
        setError(e instanceof Error ? e.message : "Could not reach Wikipedia");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [dayIndex, recorded, unscored],
  );

  // Open on the day's starting article.
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

  const shown = showingRecord ? recorded : phase === "won" || phase === "lost" ? { outcome: phase === "won" ? "won" : "lost", clicks, path } as Result : null;

  return (
    <Box sx={{ position: "relative", maxWidth: 940, mx: "auto" }}>
      {phase === "won" && <Confetti numberOfPieces={180} recycle={false} gravity={0.2} />}

      <Masthead edition={seed.edition} start={seed.start} glyph={seed.glyph} />

      {/* HUD stays in view while the article scrolls under it. */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          mt: 2,
          px: { xs: 2, sm: 3 },
          py: 2,
          borderRadius: "18px",
          background: alpha(theme.palette.background.paper, 0.86),
          backdropFilter: "blur(16px)",
          border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
          boxShadow: `0 10px 36px ${alpha("#000", 0.22)}`,
        }}
      >
        <HopChain path={hudPath} glyph={seed.glyph} won={hudWon} lost={hudLost} />

        <Box
          sx={{
            mt: 1.75,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Trail path={hudPath} won={hudWon} />
          <HopCounter hopsLeft={MAX_HOPS - (hudPath.length - 1)} over={over || showingRecord} won={hudWon} />
        </Box>
      </Box>

      <AnimatePresence>
        {shown && (
          <ResultPanel
            key="result"
            result={shown}
            glyph={seed.glyph}
            edition={seed.edition}
            start={seed.start}
            unscored={unscored}
            replayed={showingRecord}
            onReplay={replay}
          />
        )}
      </AnimatePresence>

      {/* Board */}
      <Box
        ref={boardRef}
        sx={{
          mt: 2.5,
          borderRadius: "20px",
          overflow: "hidden",
          border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
          background: theme.palette.background.paper,
          backgroundImage: DOSSIER_GRID,
          backgroundSize: "28px 28px",
          opacity: showingRecord ? 0.5 : 1,
          transition: "opacity .3s ease",
        }}
      >
        {error ? (
          <ErrorState message={error} onRetry={() => void go(path[path.length - 1]!, false)} />
        ) : (
          <>
            <ArticleHeader title={article?.displayTitle ?? seed.start} loading={loading} />
            <Box sx={{ px: { xs: 2.5, sm: 4, md: 5 }, pb: 5, pt: 1 }}>
              {loading && !article ? (
                <Tracing />
              ) : (
                article && (
                  <Box
                    component={motion.div}
                    key={article.title}
                    initial={{ opacity: 0, y: 10 }}
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
  );
}

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

function Masthead({ edition, start, glyph }: { edition: number; start: string; glyph: string }) {
  const theme = useTheme();
  const { signal } = accentsFor(theme);
  return (
    <Box sx={{ textAlign: "center", pt: 1 }}>
      <Typography
        sx={{
          fontFamily: MONO,
          fontSize: "0.625rem",
          letterSpacing: "0.34em",
          textTransform: "uppercase",
          color: alpha(theme.palette.text.primary, 0.4),
        }}
      >
        Edition #{edition}
      </Typography>
      <Typography
        sx={{
          mt: 0.75,
          fontFamily: MONO,
          fontWeight: 800,
          fontSize: { xs: "1.75rem", sm: "2.4rem" },
          letterSpacing: { xs: "0.14em", sm: "0.22em" },
          textTransform: "uppercase",
          color: signal,
          textShadow: `0 0 26px ${alpha(SIGNAL, 0.35)}`,
        }}
      >
        Six Degrees
      </Typography>
      <Typography
        sx={{
          mt: 1,
          fontFamily: MONO,
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
          color: alpha(theme.palette.text.primary, 0.55),
        }}
      >
        {glyph} {start} &nbsp;→&nbsp; 🥋 {TARGET} &nbsp;·&nbsp; {MAX_HOPS} links, no more
      </Typography>
    </Box>
  );
}

function HopCounter({ hopsLeft, over, won }: { hopsLeft: number; over: boolean; won: boolean }) {
  const theme = useTheme();
  const { win, danger } = accentsFor(theme);
  const critical = !won && hopsLeft <= 1;
  const color = won ? win : over || critical ? danger : alpha(theme.palette.text.primary, 0.55);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
      <Signal size={13} color={color} />
      <Typography
        sx={{
          fontFamily: MONO,
          fontSize: "0.6875rem",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color,
          whiteSpace: "nowrap",
        }}
      >
        {over ? (won ? "Target reached" : "Out of hops") : `${hopsLeft} left`}
      </Typography>
    </Box>
  );
}

function ArticleHeader({ title, loading }: { title: string; loading: boolean }) {
  const theme = useTheme();
  const { signal } = accentsFor(theme);
  return (
    <Box
      sx={{
        px: { xs: 2.5, sm: 4, md: 5 },
        pt: 3.5,
        pb: 2,
        borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
      }}
    >
      <Typography
        sx={{
          fontFamily: MONO,
          fontSize: "0.5625rem",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: alpha(theme.palette.text.primary, 0.35),
        }}
      >
        {loading ? "Tracing…" : "Now reading"}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap" }}>
        <Typography
          sx={{
            mt: 0.5,
            fontFamily: MONO,
            fontWeight: 800,
            fontSize: { xs: "1.3rem", sm: "1.6rem" },
            letterSpacing: "0.02em",
            color: theme.palette.text.primary,
          }}
        >
          {title}
        </Typography>
        <Box
          component="a"
          href={wikiUrl(title)}
          target="_blank"
          rel="noreferrer noopener"
          title="Open on Wikipedia (does not count as a hop)"
          sx={{
            display: "inline-flex",
            color: alpha(theme.palette.text.primary, 0.3),
            "&:hover": { color: signal },
            transition: "color .2s ease",
          }}
        >
          <ExternalLink size={14} />
        </Box>
      </Box>
    </Box>
  );
}

/** Loading shimmer in the shape of an article. */
function Tracing() {
  const theme = useTheme();
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
            animate={{ opacity: [0.25, 0.6, 0.25] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.08 }}
            sx={{
              height: 13,
              width: `${w}%`,
              borderRadius: "4px",
              background: alpha(theme.palette.text.primary, 0.12),
            }}
          />
        ),
      )}
    </Box>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useTheme();
  const { signal, danger } = accentsFor(theme);
  return (
    <Box sx={{ p: { xs: 4, sm: 6 }, textAlign: "center" }}>
      <TriangleAlert size={28} color={danger} />
      <Typography sx={{ mt: 2, fontFamily: MONO, fontSize: "0.8rem", color: theme.palette.text.primary }}>
        Signal lost
      </Typography>
      <Typography
        sx={{ mt: 0.75, fontFamily: MONO, fontSize: "0.7rem", color: alpha(theme.palette.text.primary, 0.5) }}
      >
        {message} — that click didn't cost you a hop.
      </Typography>
      <Button
        onClick={onRetry}
        startIcon={<RotateCcw size={14} />}
        sx={{
          mt: 3,
          px: 3,
          py: 1.1,
          borderRadius: "12px",
          fontFamily: MONO,
          fontSize: "0.7rem",
          fontWeight: 800,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: signal,
          border: `1px solid ${alpha(signal, 0.4)}`,
        }}
      >
        Retry
      </Button>
    </Box>
  );
}

/* ------------------------------------------------------------------ *
 * Result
 * ------------------------------------------------------------------ */

function ResultPanel({
  result,
  glyph,
  edition,
  start,
  unscored,
  replayed,
  onReplay,
}: {
  result: Result;
  glyph: string;
  edition: number;
  start: string;
  unscored: boolean;
  replayed: boolean;
  onReplay: () => void;
}) {
  const theme = useTheme();
  const { signal, signalSoft, win, danger } = accentsFor(theme);
  const [copied, setCopied] = useState(false);
  const won = result.outcome === "won";
  const accent = won ? win : danger;
  const text = shareText({ edition, start, glyph }, result);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the squares are on screen to read off anyway */
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
          mt: 2.5,
          px: { xs: 3, sm: 4 },
          py: 3.5,
          borderRadius: "20px",
          textAlign: "center",
          background: `linear-gradient(160deg, ${alpha(accent, 0.14)}, ${alpha(
            theme.palette.background.paper,
            0.96,
          )})`,
          border: `1px solid ${alpha(accent, 0.4)}`,
          boxShadow: `0 0 50px ${alpha(accent, 0.18)}`,
        }}
      >
        <Typography sx={{ fontSize: "2rem", lineHeight: 1 }}>{won ? "🥋" : "🫠"}</Typography>

        <Typography
          sx={{
            mt: 1.5,
            fontFamily: MONO,
            fontWeight: 800,
            fontSize: { xs: "1.1rem", sm: "1.3rem" },
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {won ? "Roundhouse" : "Out of hops"}
        </Typography>

        <Typography
          sx={{
            mt: 1,
            fontFamily: MONO,
            fontSize: "0.75rem",
            letterSpacing: "0.06em",
            color: alpha(theme.palette.text.primary, 0.6),
          }}
        >
          {won
            ? `${result.clicks} link${result.clicks === 1 ? "" : "s"} from ${start} to ${TARGET}.`
            : `Six links spent, ${TARGET} still out of reach.`}
        </Typography>

        {/* Score squares — the shareable bit. */}
        <Typography sx={{ mt: 2.5, fontSize: "1.4rem", letterSpacing: "0.1em", lineHeight: 1 }}>
          {Array.from({ length: MAX_HOPS }, (_, i) =>
            i < result.clicks ? (won ? "🟩" : "🟥") : "⬜",
          ).join("")}
        </Typography>
        <Typography
          sx={{
            mt: 1.25,
            fontFamily: MONO,
            fontWeight: 800,
            fontSize: "1.5rem",
            letterSpacing: "0.1em",
            color: theme.palette.text.primary,
          }}
        >
          {won ? result.clicks : "X"}
          <Box component="span" sx={{ opacity: 0.35, fontSize: "1rem" }}>/{MAX_HOPS}</Box>
        </Typography>

        {(unscored || replayed) && (
          <Typography
            sx={{
              mt: 1.25,
              fontFamily: MONO,
              fontSize: "0.625rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: alpha(theme.palette.text.primary, 0.4),
            }}
          >
            {replayed ? "Today's run is already recorded" : "Replay — not recorded"}
          </Typography>
        )}

        {/* The route, revealed only once the run is over. */}
        <Box sx={{ mt: 2.5, display: "flex", justifyContent: "center" }}>
          <Trail path={result.path} won={won} />
        </Box>

        {!won && (
          <Box sx={{ mt: 3 }}>
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: "0.5625rem",
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: alpha(theme.palette.text.primary, 0.35),
              }}
            >
              Pages that link straight to him
            </Typography>
            <Box sx={{ mt: 1.25, display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: "center" }}>
              {HUB_HINTS.map((hub) => (
                <Box
                  key={hub}
                  sx={{
                    fontFamily: MONO,
                    fontSize: "0.65rem",
                    px: 1.25,
                    py: 0.5,
                    borderRadius: "999px",
                    color: signalSoft,
                    background: alpha(signal, 0.1),
                    border: `1px solid ${alpha(signal, 0.28)}`,
                  }}
                >
                  {hub}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ mt: 3.5, display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap" }}>
          <Button
            onClick={copy}
            startIcon={copied ? <Check size={15} /> : <Copy size={15} />}
            sx={{
              px: 3,
              py: 1.2,
              borderRadius: "12px",
              fontFamily: MONO,
              fontSize: "0.6875rem",
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: theme.palette.background.default,
              background: accent,
              "&:hover": { background: accent, filter: "brightness(1.1)" },
            }}
          >
            {copied ? "Copied" : "Copy result"}
          </Button>
          <Button
            onClick={onReplay}
            startIcon={<RotateCcw size={15} />}
            sx={{
              px: 3,
              py: 1.2,
              borderRadius: "12px",
              fontFamily: MONO,
              fontSize: "0.6875rem",
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: alpha(theme.palette.text.primary, 0.7),
              border: `1px solid ${alpha(theme.palette.text.primary, 0.18)}`,
            }}
          >
            Play again
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
