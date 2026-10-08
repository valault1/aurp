import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography, alpha, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import {
  decadeTicks,
  formatShort,
  formatTick,
  fractionToValue,
  snapToSigFigs,
  valueToFraction,
} from "./puzzles";
import { MONO, useGameColors } from "./tokens";

type Props = {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  /** Locked while the answer is on screen. */
  disabled?: boolean;
  /** Second needle, shown only after the reveal. */
  actual?: number;
  /** Colour of the gap band between guess and actual. */
  gapColor?: string;
};

const RAIL_HEIGHT = 10;

export function PriceDial({ min, max, value, onChange, disabled, actual, gapColor }: Props) {
  const theme = useTheme();
  const c = useGameColors();
  const railRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const guessFraction = valueToFraction(value, min, max);
  const actualFraction = actual != null ? valueToFraction(actual, min, max) : null;

  const setFromClientX = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      if (rect.width === 0) return;
      const t = (clientX - rect.left) / rect.width;
      onChange(snapToSigFigs(fractionToValue(t, min, max)));
    },
    [min, max, onChange],
  );

  // Drag is tracked on the window so the pointer can leave the rail mid-swipe.
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      e.preventDefault();
      setFromClientX(e.clientX);
    };
    const end = () => setDragging(false);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [dragging, setFromClientX]);

  const nudge = (decades: number) => {
    const span = Math.log10(max / min);
    const next = fractionToValue(guessFraction + decades / span, min, max);
    onChange(snapToSigFigs(next));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const fine = e.shiftKey ? 0.2 : 0.03;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      nudge(fine);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      nudge(-fine);
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(min);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(max);
    }
  };

  const ticks = decadeTicks(min, max);
  const track = alpha(theme.palette.text.primary, 0.08);

  return (
    <Box sx={{ pt: 5, pb: 0.5, px: { xs: 1.5, sm: 3 }, userSelect: "none" }}>
      <Box
        ref={railRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Your price guess"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatShort(value)}
        aria-disabled={disabled}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          (e.currentTarget as HTMLDivElement).focus();
          setFromClientX(e.clientX);
          setDragging(true);
        }}
        sx={{
          position: "relative",
          height: RAIL_HEIGHT,
          borderRadius: 999,
          background: track,
          boxShadow: c.railGroove,
          cursor: disabled ? "default" : dragging ? "grabbing" : "pointer",
          touchAction: "none",
          outline: "none",
          "&:focus-visible": {
            boxShadow: `${c.railGroove}, 0 0 0 3px ${alpha(c.gold, 0.35)}`,
          },
        }}
      >
        {/* Decade ticks + labels */}
        {ticks.map((t) => {
          const pct = valueToFraction(t, min, max) * 100;
          return (
            <Box
              key={t}
              sx={{
                position: "absolute",
                left: `${pct}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
              }}
            >
              <Box
                sx={{
                  width: 2,
                  height: RAIL_HEIGHT + 10,
                  borderRadius: 1,
                  background: alpha(theme.palette.text.primary, 0.22),
                  mx: "auto",
                }}
              />
              <Typography
                sx={{
                  position: "absolute",
                  top: RAIL_HEIGHT + 14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontFamily: MONO,
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: alpha(theme.palette.text.primary, 0.42),
                  whiteSpace: "nowrap",
                  opacity: actualFraction != null ? 0 : 1,
                  transition: "opacity 300ms ease",
                }}
              >
                {formatTick(t)}
              </Typography>
            </Box>
          );
        })}

        {/* Gap band between guess and actual */}
        {actualFraction != null && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${Math.min(guessFraction, actualFraction) * 100}%`,
              width: `${Math.abs(actualFraction - guessFraction) * 100}%`,
              transformOrigin: actualFraction > guessFraction ? "left" : "right",
              background: `linear-gradient(90deg, ${alpha(gapColor ?? c.gold, 0.25)}, ${alpha(
                gapColor ?? c.gold,
                0.7,
              )})`,
              borderRadius: 999,
            }}
          />
        )}

        {/* Actual-value needle */}
        {actualFraction != null && (
          <Needle
            fraction={actualFraction}
            label="Actual"
            value={formatShort(actual!)}
            color={c.truth}
            placement="above"
            emphasis
            delay={0.45}
          />
        )}

        {/* The player's needle */}
        <Needle
          fraction={guessFraction}
          label={actualFraction != null ? "You" : undefined}
          value={actualFraction != null ? formatShort(value) : undefined}
          color={c.gold}
          placement="below"
          active={dragging}
          muted={actualFraction != null}
        />
      </Box>

      {/* Reserve space for the tick labels and the "You" marker below them */}
      <Box sx={{ height: 60 }} />
    </Box>
  );
}

function Needle({
  fraction,
  label,
  value,
  color,
  active,
  muted,
  emphasis,
  placement = "above",
  delay = 0,
}: {
  fraction: number;
  label?: string;
  value?: string;
  color: string;
  active?: boolean;
  muted?: boolean;
  emphasis?: boolean;
  placement?: "above" | "below";
  delay?: number;
}) {
  const theme = useTheme();
  const c = useGameColors();
  return (
    <motion.div
      initial={emphasis ? { opacity: 0, y: -8 } : false}
      animate={emphasis ? { opacity: 1, y: 0 } : undefined}
      transition={{ delay, type: "spring", stiffness: 420, damping: 26 }}
      style={{
        position: "absolute",
        left: `${fraction * 100}%`,
        top: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: emphasis ? 3 : 4,
      }}
    >
      <Box
        sx={{
          width: active ? 5 : 4,
          height: 30,
          borderRadius: 999,
          background: `linear-gradient(180deg, ${alpha(color, 0.7)}, ${color})`,
          boxShadow: c.light ? "none" : `0 0 ${active ? 18 : 10}px ${alpha(color, active ? 0.8 : 0.5)}`,
          transition: "width 120ms ease, box-shadow 160ms ease",
          opacity: muted ? 0.85 : 1,
          mx: "auto",
          ...(emphasis && { background: color }),
        }}
      />
      {(label || value) && (
        <Box
          sx={{
            position: "absolute",
            ...(placement === "above" ? { bottom: 36 } : { top: 36 }),
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {label && (
            <Typography
              sx={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: alpha(theme.palette.text.primary, 0.45),
              }}
            >
              {label}
            </Typography>
          )}
          {value && (
            <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color }}>
              {value}
            </Typography>
          )}
        </Box>
      )}
    </motion.div>
  );
}
