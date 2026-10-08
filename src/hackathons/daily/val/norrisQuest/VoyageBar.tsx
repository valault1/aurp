import { Box, Tooltip, Typography, alpha } from "@mui/material";
import { motion } from "framer-motion";
import { MAX_HOPS, TARGET } from "./puzzles";
import { CHART, LABEL, type Chart } from "./tokens";

/* ------------------------------------------------------------------ *
 * Engraving
 * ------------------------------------------------------------------ */

function CompassRose({ size, c }: { size: number; c: Chart }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="none" stroke={c.brass} strokeWidth="7" />
      <circle cx="100" cy="100" r="74" fill="none" stroke={c.brass} strokeWidth="3" />
      <path d="M100 18 L112 94 L100 104 L88 94 Z" fill={c.vermilion} />
      <path d="M100 182 L112 106 L100 96 L88 106 Z" fill={c.ink} opacity="0.72" />
      <path d="M18 100 L94 112 L104 100 L94 88 Z" fill={c.ink} opacity="0.45" />
      <path d="M182 100 L106 112 L96 100 L106 88 Z" fill={c.ink} opacity="0.45" />
      <circle cx="100" cy="100" r="8" fill={c.brass} />
    </svg>
  );
}

/** The vessel alternates per leg, the way Fogg's route does. */
function Vessel({ leg, c }: { leg: number; c: Chart }) {
  const stroke = { fill: "none", stroke: c.ink, strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (leg % 2 === 1) {
    return (
      <svg width="40" height="30" viewBox="0 0 48 36" aria-hidden="true" {...stroke}>
        <rect x="7" y="15" width="21" height="11" />
        <rect x="29" y="11" width="11" height="15" />
        <circle cx="13" cy="29" r="2.6" />
        <circle cx="23" cy="29" r="2.6" />
        <circle cx="35" cy="29" r="2.6" />
        <path d="M11 15 L11 9" />
        <path d="M11 7 C13 4 15 6 17 4" />
      </svg>
    );
  }
  return (
    <svg width="40" height="30" viewBox="0 0 48 36" aria-hidden="true" {...stroke}>
      <path d="M6 25 L42 25 L37 31 L11 31 Z" />
      <path d="M24 25 L24 5" />
      <path d="M24 8 L34 20 L24 20 Z" />
      <path d="M24 8 L14 20 L24 20 Z" />
    </svg>
  );
}

/** A blob of sealing wax, pressed once the destination is made. */
function WaxSeal({ size }: { size: number }) {
  return (
    <Box
      component={motion.div}
      initial={{ scale: 1.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 17 }}
      sx={{
        width: size,
        height: size,
        mx: "auto",
        display: "grid",
        placeItems: "center",
        borderRadius: "47% 53% 52% 48% / 50% 47% 53% 50%",
        transform: "rotate(-4deg)",
        background: "radial-gradient(circle at 34% 28%, #c4472f, #8a2516 74%)",
        boxShadow:
          "0 7px 16px rgba(70,24,12,0.42), inset 0 -5px 12px rgba(0,0,0,0.32), inset 0 3px 8px rgba(255,180,150,0.22)",
      }}
    >
      <Typography
        sx={{
          fontFamily: LABEL,
          fontSize: size > 70 ? "0.8rem" : "0.5rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#f6dcb4",
          lineHeight: 1,
        }}
      >
        {size > 70 ? "ARRIVED" : "✦"}
      </Typography>
    </Box>
  );
}

/* ------------------------------------------------------------------ *
 * The voyage bar
 * ------------------------------------------------------------------ */

type Props = {
  /** Route so far, including the port of departure. */
  path: string[];
  won: boolean;
  lost: boolean;
};

export function VoyageBar({ path, won, lost }: Props) {
  const c = CHART;
  const used = Math.max(0, path.length - 1);
  const drawn = `${(used / MAX_HOPS) * 100}%`;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 3 } }}>
      <Port label="Departure" name={path[0] ?? ""} color={c.ink} c={c}>
        <CompassRose size={40} c={c} />
      </Port>

      <Box sx={{ flex: 1, minWidth: 0, position: "relative", height: 58 }}>
        {/* the course not yet sailed */}
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 38,
            height: 2,
            background: `repeating-linear-gradient(90deg, ${c.rule} 0 7px, transparent 7px 14px)`,
          }}
        />
        {/* the course drawn so far */}
        <Box
          component={motion.div}
          animate={{ width: drawn }}
          transition={{ duration: 0.42, ease: [0.22, 0.7, 0.3, 1] }}
          sx={{
            position: "absolute",
            left: 0,
            top: 38,
            height: 2,
            background: `repeating-linear-gradient(90deg, ${c.vermilion} 0 7px, transparent 7px 14px)`,
          }}
        />

        {/* Waypoint n sits where the course stands after n legs — so the drawn
            line always ends exactly on the pip it just reached. */}
        {Array.from({ length: MAX_HOPS }, (_, i) => {
          const done = i < used;
          const next = i === used && !won && !lost;
          return (
            <Tooltip key={i} title={done ? path[i + 1]! : next ? `Leg ${i + 1} of ${MAX_HOPS}` : ""} placement="top" arrow>
              <Box
                component={motion.span}
                initial={false}
                animate={{ scale: done ? 1 : 0.86 }}
                transition={{ type: "spring", stiffness: 420, damping: 20 }}
                sx={{
                  position: "absolute",
                  top: 39,
                  left: `${((i + 1) / MAX_HOPS) * 100}%`,
                  marginLeft: done || next ? "-7px" : "-6px",
                  marginTop: done || next ? "-7px" : "-6px",
                  borderRadius: "50%",
                  cursor: done ? "help" : "default",
                  ...(done
                    ? {
                        width: 14,
                        height: 14,
                        background: c.vermilion,
                        boxShadow: `0 0 0 4px ${alpha(c.vermilion, 0.16)}`,
                      }
                    : next
                      ? { width: 14, height: 14, background: c.slip, border: `2.5px solid ${c.vermilion}` }
                      : { width: 12, height: 12, background: "transparent", border: `2px solid ${c.rule}` }),
                }}
              />
            </Tooltip>
          );
        })}

        {/* the vessel rides the head of the drawn course, clear of the rail */}
        <Box
          component={motion.div}
          animate={{ left: drawn }}
          transition={{ duration: 0.42, ease: [0.22, 0.7, 0.3, 1] }}
          sx={{ position: "absolute", top: 2, marginLeft: "-20px", display: { xs: "none", sm: "block" } }}
        >
          <Vessel leg={used} c={c} />
        </Box>
      </Box>

      <Port label="Destination" name={TARGET} color={c.vermilion} c={c}>
        {won ? (
          <WaxSeal size={40} />
        ) : (
          <svg width="38" height="38" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="21" stroke={c.vermilion} strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M14 14 L34 34" stroke={c.vermilion} strokeWidth="4" strokeLinecap="round" />
            <path d="M34 14 L14 34" stroke={c.vermilion} strokeWidth="4" strokeLinecap="round" />
          </svg>
        )}
      </Port>
    </Box>
  );
}

function Port({
  label,
  name,
  color,
  c,
  children,
}: {
  label: string;
  name: string;
  color: string;
  c: Chart;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ flexShrink: 0, textAlign: "center", width: { xs: 86, sm: 118 } }}>
      <Box sx={{ height: 40, display: "grid", placeItems: "center" }}>{children}</Box>
      <Typography
        sx={{
          fontFamily: LABEL,
          fontSize: "0.5rem",
          fontWeight: 600,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: c.brassInk,
          mt: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        noWrap
        sx={{
          fontFamily: LABEL,
          fontSize: { xs: "0.72rem", sm: "0.84rem" },
          fontWeight: 700,
          letterSpacing: "0.06em",
          color,
        }}
      >
        {name}
      </Typography>
    </Box>
  );
}

/* ------------------------------------------------------------------ *
 * Ports of call
 * ------------------------------------------------------------------ */

/** Each stamp inks unevenly: paper-coloured voids punched through the pad. */
const VOIDS = [
  "16% 72%|78% 24%|46% 90%",
  "22% 20%|66% 82%|90% 44%",
  "54% 16%|10% 54%|84% 76%",
];
const TILT = [-1.9, 1.4, -1.1, 2.1, -2.3, 0.9, -1.5];

function stampVoids(index: number, paper: string) {
  return VOIDS[index % VOIDS.length]!
    .split("|")
    .map((at, i) => `radial-gradient(circle at ${at}, ${alpha(paper, 0.8 - i * 0.1)} 0 ${2.5 - i * 0.5}px, transparent ${3.5 - i * 0.5}px)`)
    .join(",");
}

export function Stamps({
  path,
  won,
  lost,
  center,
  maxItems,
}: {
  path: string[];
  won: boolean;
  lost?: boolean;
  /** Centred under a verdict; left-aligned in the bar. */
  center?: boolean;
  /** Show only the last N, behind an ellipsis. Keeps the phone bar short. */
  maxItems?: number;
}) {
  const c = CHART;

  // The port of departure is not a port of call — it is where you started.
  const calls = path.slice(1);
  const truncated = maxItems != null && calls.length > maxItems;
  const shown = truncated ? calls.slice(-maxItems) : calls;
  const offset = calls.length - shown.length;

  if (calls.length === 0) {
    return (
      <Typography
        sx={{
          flex: 1,
          fontFamily: LABEL,
          fontSize: "0.6rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: alpha(c.inkSoft, 0.7),
          textAlign: center ? "center" : "left",
        }}
      >
        Not yet under way
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: center ? "center" : "flex-start",
        // Tilted stamps need more room than their boxes suggest, or the
        // corners of adjacent ones overlap.
        gap: 1.25,
        rowGap: 1,
      }}
    >
      {truncated && (
        <Typography component="span" sx={{ fontFamily: LABEL, fontSize: "0.7rem", color: alpha(c.inkSoft, 0.6) }}>
          …
        </Typography>
      )}
      {shown.map((title, i) => {
        const index = offset + i;
        const isLast = index === calls.length - 1;
        const made = isLast && won;
        const color = made ? c.vermilion : lost && isLast ? c.vermilion : c.vermilion;
        return (
          <Box
            key={`${title}-${index}`}
            component={motion.span}
            initial={isLast ? { scale: 1.5, opacity: 0, rotate: 0 } : false}
            animate={{ scale: 1, opacity: isLast ? 1 : 0.7, rotate: TILT[index % TILT.length]! }}
            transition={{ duration: 0.18, ease: [0.3, 0.9, 0.4, 1] }}
            title={title}
            sx={{
              display: "inline-block",
              maxWidth: 210,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              px: 1.25,
              py: 0.6,
              borderRadius: "3px",
              border: `1.5px solid ${alpha(color, made ? 1 : 0.82)}`,
              boxShadow: `inset 0 0 0 2.5px ${alpha(color, 0.15)}`,
              backgroundImage: stampVoids(index, c.slip),
              fontFamily: LABEL,
              fontSize: "0.66rem",
              fontWeight: made ? 700 : 600,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color,
              textShadow: `0 0 1px ${alpha(color, 0.45)}`,
            }}
          >
            {title}
          </Box>
        );
      })}
    </Box>
  );
}

/* ------------------------------------------------------------------ *
 * The dial
 * ------------------------------------------------------------------ */

const LEGS = ["No legs remain", "One leg remains", "Two legs remain", "Three legs remain", "Four legs remain", "Five legs remain", "Six legs remain"];

export function LegDial({ left, won, over }: { left: number; won: boolean; over: boolean }) {
  const c = CHART;
  const critical = !won && left <= 1;
  const color = won ? c.brassInk : over || critical ? c.vermilion : c.ink;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
      <svg width="22" height="22" viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.6" aria-hidden="true">
        <circle cx="16" cy="18" r="11" />
        <circle cx="16" cy="18" r="8.5" strokeWidth="0.8" />
        <path d="M16 13 L16 18 L19.5 20" strokeLinecap="round" />
        <path d="M13 4 L19 4 M16 4 L16 7" strokeLinecap="round" />
      </svg>
      <Typography
        sx={{
          fontFamily: LABEL,
          fontSize: "0.66rem",
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color,
          whiteSpace: "nowrap",
        }}
      >
        {won ? "Arrived" : over ? "Voyage abandoned" : LEGS[left] ?? `${left} legs remain`}
      </Typography>
    </Box>
  );
}
