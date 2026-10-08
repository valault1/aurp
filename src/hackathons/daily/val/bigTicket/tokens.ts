import { alpha, useTheme } from "@mui/material";
import type { Tier } from "./puzzles";

/** Gold foil — the constant across all five app themes, tuned per mode. */
export const GOLD = "#e8b55c";
export const GOLD_SOFT = "#f6ddab";
export const GOLD_DEEP = "#a9762c";
/** The truth marker — neutral, so it never blends with the gold needle. */
export const IVORY = "#fff6e6";

const TIER_COLOR_DARK: Record<Tier["id"], string> = {
  exact: "#34d399",
  sharp: "#6ee7a8",
  close: "#fbbf24",
  ballpark: "#fb923c",
  cold: "#f87171",
  lost: "#94a3b8",
};

const TIER_COLOR_LIGHT: Record<Tier["id"], string> = {
  exact: "#047857",
  sharp: "#059669",
  close: "#a16207",
  ballpark: "#c2410c",
  cold: "#b91c1c",
  lost: "#475569",
};

export const MONO = `"SF Mono", "JetBrains Mono", ui-monospace, "Menlo", monospace`;
export const DISPLAY = `"Playfair Display", "Iowan Old Style", "Palatino", Georgia, serif`;

export type GameColors = ReturnType<typeof useGameColors>;

/**
 * The app ships one light theme ("ice") and four dark ones. Pale gold reads as
 * premium on the dark four and vanishes on white, so every ink the game uses
 * is resolved here rather than hard-coded at the call site.
 */
export function useGameColors() {
  const theme = useTheme();
  const light = theme.palette.mode === "light";
  const ink = theme.palette.text.primary;

  return {
    light,
    /** Structural gold: borders, needles, pips. */
    gold: light ? "#b4821f" : GOLD,
    /** Gold used as text on the card surface. */
    goldText: light ? "#8a5f14" : GOLD_SOFT,
    /** The answer marker. */
    truth: light ? "#111827" : IVORY,
    tier: (id: Tier["id"]) => (light ? TIER_COLOR_LIGHT : TIER_COLOR_DARK)[id],
    /** Masthead foil gradient. */
    foil: light
      ? `linear-gradient(175deg, #c99b3d 0%, #a06f16 52%, #6f4a09 100%)`
      : `linear-gradient(175deg, ${GOLD_SOFT} 0%, ${GOLD} 48%, ${GOLD_DEEP} 100%)`,
    /** Engraved banknote hatching, layered under the cards. */
    engraving: `repeating-linear-gradient(
      -45deg,
      ${light ? "rgba(120,86,20,0.045)" : "rgba(232,181,92,0.055)"} 0px,
      ${light ? "rgba(120,86,20,0.045)" : "rgba(232,181,92,0.055)"} 1px,
      transparent 1px,
      transparent 7px
    )`,
    cardShadow: light
      ? `0 20px 50px -26px ${alpha("#4a3a1a", 0.35)}, inset 0 1px 0 ${alpha("#fff", 0.9)}`
      : `0 24px 70px -28px ${alpha("#000", 0.75)}, inset 0 1px 0 ${alpha(GOLD_SOFT, 0.1)}`,
    railGroove: `inset 0 1px 3px ${alpha("#000", light ? 0.16 : 0.45)}`,
    /** Glow is a dark-theme affordance; on white it just smears. */
    glow: (color: string, radius: number) =>
      light ? "none" : `0 0 ${radius}px ${alpha(color, 0.35)}`,
    hairline: alpha(ink, light ? 0.1 : 0.08),
    ink,
  };
}
