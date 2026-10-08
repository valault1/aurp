/**
 * BIG TICKET — daily appraisal game.
 * Each day serves one "lot sheet": 3 enormous things, guess what they cost.
 */

export type Category = "architecture" | "aviation" | "maritime" | "space" | "infrastructure";

export type Lot = {
  /** Short display name, e.g. "The Empire State Building" */
  name: string;
  /** The precise question — removes ambiguity about which number we want. */
  prompt: string;
  category: Category;
  /** The true answer, in US dollars. */
  actual: number;
  /** Slider bounds (log scale). The answer never sits at the midpoint. */
  min: number;
  max: number;
  /** One-line payoff shown on reveal. */
  fact: string;
};

export type Puzzle = {
  /** Human-facing edition number. */
  edition: number;
  lots: Lot[];
};

export const PUZZLES: Puzzle[] = [
  {
    edition: 1,
    lots: [
      {
        name: "The Empire State Building",
        prompt: "Total construction cost, completed 1931 — in 1931 dollars",
        category: "architecture",
        actual: 40_948_900,
        min: 2_000_000,
        max: 5_000_000_000,
        fact:
          "Came in under its $50M budget and finished 12 days early. That's roughly $850M in today's money — a bargain for 102 floors.",
      },
      {
        name: "A Boeing 747-8 Intercontinental",
        prompt: "List price for one new aircraft, 2019 — before airline discounts",
        category: "aviation",
        actual: 418_400_000,
        min: 5_000_000,
        max: 5_000_000_000,
        fact:
          "Nobody actually paid list. Bulk orders routinely landed 50% off — which is part of why the 747 line finally closed in 2023.",
      },
      {
        name: "Icon of the Seas",
        prompt: "Cost to build the world's largest cruise ship, delivered 2024",
        category: "maritime",
        actual: 2_000_000_000,
        min: 20_000_000,
        max: 10_000_000_000,
        fact:
          "250,800 gross tons, 20 decks, 7,600 passengers. Costs about as much as five 747s and carries 15 times as many people.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Daily seeding
 * ------------------------------------------------------------------ */

/** Edition 1 ships on this date; day 0 of the game. */
const EPOCH = Date.UTC(2026, 9, 8); // 2026-10-08
const DAY_MS = 86_400_000;

/** Days since the epoch, using the player's local calendar date. */
export function todayIndex(now: Date = new Date()): number {
  const local = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((local - EPOCH) / DAY_MS));
}

export function puzzleForDay(dayIndex: number): Puzzle {
  return PUZZLES[dayIndex % PUZZLES.length]!;
}

/* ------------------------------------------------------------------ *
 * Log-scale slider math
 * ------------------------------------------------------------------ */

/** Slider fraction (0–1) -> dollars. */
export function fractionToValue(t: number, min: number, max: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return min * Math.pow(max / min, clamped);
}

/** Dollars -> slider fraction (0–1). */
export function valueToFraction(v: number, min: number, max: number): number {
  const clamped = Math.min(max, Math.max(min, v));
  return Math.log(clamped / min) / Math.log(max / min);
}

/** Round to 3 significant figures so the readout never looks like noise. */
export function snapToSigFigs(n: number, figs = 3): number {
  if (n <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - (figs - 1));
  return Math.round(n / mag) * mag;
}

/** Powers of ten inside [min, max], for the ruler ticks. */
export function decadeTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  const start = Math.ceil(Math.log10(min));
  const end = Math.floor(Math.log10(max));
  for (let p = start; p <= end; p++) ticks.push(Math.pow(10, p));
  return ticks;
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

export const MAX_SCORE_PER_LOT = 1000;

/** How many times off the guess was, always >= 1. */
export function offByFactor(guess: number, actual: number): number {
  if (guess <= 0) return Infinity;
  return guess > actual ? guess / actual : actual / guess;
}

/** 1000 for exact; 0 once you're ~16x out. Orders of magnitude, not raw dollars. */
const ZERO_AT_DECADES = 1.2;

export function scoreGuess(guess: number, actual: number): number {
  const factor = offByFactor(guess, actual);
  if (!Number.isFinite(factor)) return 0;
  const decades = Math.log10(factor);
  return Math.max(0, Math.round(MAX_SCORE_PER_LOT * (1 - decades / ZERO_AT_DECADES)));
}

export type Tier = {
  id: "exact" | "sharp" | "close" | "ballpark" | "cold" | "lost";
  label: string;
  /** Share-grid square. */
  square: string;
  /** 0–1 position on the accuracy ramp, for colour interpolation. */
  heat: number;
};

const TIERS: { ceiling: number; tier: Tier }[] = [
  { ceiling: 1.1, tier: { id: "exact", label: "Dead on", square: "🟩", heat: 1 } },
  { ceiling: 1.5, tier: { id: "sharp", label: "Sharp", square: "🟩", heat: 0.85 } },
  { ceiling: 2.5, tier: { id: "close", label: "Close", square: "🟨", heat: 0.6 } },
  { ceiling: 5, tier: { id: "ballpark", label: "Ballpark", square: "🟧", heat: 0.4 } },
  { ceiling: 10, tier: { id: "cold", label: "Cold", square: "🟥", heat: 0.2 } },
  { ceiling: Infinity, tier: { id: "lost", label: "Way off", square: "⬛", heat: 0 } },
];

export function tierFor(guess: number, actual: number): Tier {
  const factor = offByFactor(guess, actual);
  return TIERS.find((t) => factor < t.ceiling)!.tier;
}

/** "2.1x under" / "within 4%" — the human read on a guess. */
export function describeMiss(guess: number, actual: number): string {
  const factor = offByFactor(guess, actual);
  if (factor < 1.02) return "spot on";
  if (factor < 1.1) {
    const pct = Math.round((factor - 1) * 100);
    return `within ${Math.max(1, pct)}%`;
  }
  const dir = guess > actual ? "over" : "under";
  return `${factor >= 10 ? Math.round(factor) : factor.toFixed(1)}× ${dir}`;
}

export function gradeFor(total: number, lotCount: number): string {
  const pct = total / (lotCount * MAX_SCORE_PER_LOT);
  if (pct >= 0.95) return "Master Appraiser";
  if (pct >= 0.85) return "Senior Appraiser";
  if (pct >= 0.7) return "Appraiser";
  if (pct >= 0.5) return "Junior Appraiser";
  if (pct >= 0.3) return "Enthusiastic Amateur";
  return "Wild Speculator";
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

function trimUnit(v: number): string {
  const decimals = v >= 10 ? 1 : 2;
  return v.toFixed(decimals).replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
}

/** 418400000 -> "$418.4M" */
export function formatShort(n: number): string {
  if (n >= 1e12) return `$${trimUnit(n / 1e12)}T`;
  if (n >= 1e9) return `$${trimUnit(n / 1e9)}B`;
  if (n >= 1e6) return `$${trimUnit(n / 1e6)}M`;
  if (n >= 1e3) return `$${trimUnit(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

/** 418400000 -> "418,400,000" */
export function formatExact(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Ruler tick label — always the bare unit, e.g. "10M". */
export function formatTick(n: number): string {
  return formatShort(n).replace("$", "");
}

export const CATEGORY_LABEL: Record<Category, string> = {
  architecture: "Architecture",
  aviation: "Aviation",
  maritime: "Maritime",
  space: "Spaceflight",
  infrastructure: "Infrastructure",
};
