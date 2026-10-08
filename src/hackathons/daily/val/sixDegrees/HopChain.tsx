import { Box, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import { MAX_HOPS } from "./puzzles";
import { MONO, SIGNAL, accentsFor } from "./tokens";

type Props = {
  /** Visited route, including the starting article. */
  path: string[];
  glyph: string;
  won: boolean;
  lost: boolean;
};

/**
 * The hop rail: start cap, six pips, target cap. One pip lights per link
 * clicked, so the player can read "how much rope is left" at a glance — the
 * rail itself turns red on the final hop.
 */
export function HopChain({ path, glyph, won, lost }: Props) {
  const theme = useTheme();
  const { signal, win, danger } = accentsFor(theme);
  const used = Math.max(0, path.length - 1);
  const left = MAX_HOPS - used;
  const critical = !won && left <= 1;
  const accent = won ? win : critical || lost ? danger : signal;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 } }}>
      <Cap glyph={glyph} label={path[0] ?? ""} color={signal} filled />

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          height: 20,
        }}
      >
        {/* The rail the pips sit on. */}
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            height: 2,
            transform: "translateY(-1px)",
            background: alpha(theme.palette.text.primary, 0.12),
            borderRadius: 1,
          }}
        />
        <Box
          component={motion.div}
          animate={{ width: `${(used / MAX_HOPS) * 100}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          sx={{
            position: "absolute",
            left: 0,
            top: "50%",
            height: 2,
            transform: "translateY(-1px)",
            borderRadius: 1,
            background: `linear-gradient(90deg, ${alpha(accent, 0.4)}, ${accent})`,
            boxShadow: `0 0 12px ${alpha(accent, 0.6)}`,
          }}
        />

        {Array.from({ length: MAX_HOPS }, (_, i) => {
          const filled = i < used;
          const isNext = i === used && !won && !lost;
          return (
            <Tooltip
              key={i}
              title={filled ? path[i + 1]! : isNext ? `Hop ${i + 1} of ${MAX_HOPS}` : ""}
              placement="top"
              arrow
            >
              <Box
                component={motion.div}
                initial={false}
                animate={
                  isNext
                    ? { scale: [1, 1.28, 1], opacity: [0.55, 1, 0.55] }
                    : { scale: filled ? 1 : 0.8, opacity: 1 }
                }
                transition={
                  isNext
                    ? { duration: 1.9, repeat: Infinity, ease: "easeInOut" }
                    : { type: "spring", stiffness: 420, damping: 20 }
                }
                sx={{
                  position: "relative",
                  zIndex: 1,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  cursor: filled ? "help" : "default",
                  background: filled ? accent : theme.palette.background.default,
                  border: `2px solid ${filled ? accent : alpha(theme.palette.text.primary, 0.22)}`,
                  boxShadow: filled ? `0 0 10px ${alpha(accent, 0.75)}` : "none",
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      <Cap glyph="🥋" label="Chuck Norris" color={won ? win : danger} filled={won} />
    </Box>
  );
}

function Cap({
  glyph,
  label,
  color,
  filled,
}: {
  glyph: string;
  label: string;
  color: string;
  filled: boolean;
}) {
  return (
    <Tooltip title={label} placement="top" arrow>
      <Box
        sx={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          fontSize: "1.05rem",
          lineHeight: 1,
          cursor: "help",
          background: alpha(color, filled ? 0.18 : 0.06),
          border: `2px ${filled ? "solid" : "dashed"} ${alpha(color, filled ? 0.9 : 0.4)}`,
          boxShadow: filled ? `0 0 16px ${alpha(color, 0.45)}` : "none",
          transition: "all .3s ease",
        }}
      >
        {glyph}
      </Box>
    </Tooltip>
  );
}

/**
 * The route so far, as a breadcrumb. Players want to see where they have been
 * (and it is half the fun of sharing), so it is always visible rather than
 * hidden behind the pip tooltips.
 */
export function Trail({ path, won }: { path: string[]; won: boolean }) {
  const theme = useTheme();
  const { signal, signalSoft, win } = accentsFor(theme);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
      {path.map((title, i) => {
        const isLast = i === path.length - 1;
        const isTarget = isLast && won;
        const color = isTarget ? win : isLast ? signalSoft : alpha(theme.palette.text.primary, 0.45);
        return (
          <Box key={`${title}-${i}`} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            {i > 0 && (
              <Typography component="span" sx={{ fontFamily: MONO, fontSize: "0.7rem", color: alpha(theme.palette.text.primary, 0.25) }}>
                ›
              </Typography>
            )}
            <Box
              component={motion.span}
              initial={isLast ? { opacity: 0, y: -4 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              sx={{
                fontFamily: MONO,
                fontSize: "0.7rem",
                letterSpacing: "0.04em",
                color,
                px: 1,
                py: 0.35,
                borderRadius: "6px",
                background: isLast ? alpha(isTarget ? win : signal, 0.12) : "transparent",
                border: `1px solid ${isLast ? alpha(isTarget ? win : signal, 0.35) : "transparent"}`,
                fontWeight: isLast ? 700 : 400,
                maxWidth: 220,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
