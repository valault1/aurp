/**
 * SIX DEGREES — daily link-chase.
 *
 * Everyone starts on the same article each day. The target never changes:
 * Chuck Norris. Score is the number of links clicked to get there, and you get
 * six. Lower is better; six is a photo finish; seven does not exist.
 */

export const TARGET = "Chuck Norris";
export const MAX_HOPS = 6;

export type Seed = {
  /** Human-facing edition number, shown in the share text. */
  edition: number;
  /** Wikipedia article title the day begins on. */
  start: string;
  /** Emoji used for the start node and the share card. */
  glyph: string;
};

/**
 * Day 1 is Apple, per spec. The rest are chosen the same way: broad pages with
 * dense outgoing links, so there is always more than one route through.
 */
export const SEEDS: Seed[] = [
  { edition: 1, start: "Apple", glyph: "🍎" },
  { edition: 2, start: "Pizza", glyph: "🍕" },
  { edition: 3, start: "Mount Everest", glyph: "🏔️" },
  { edition: 4, start: "Tetris", glyph: "🕹️" },
  { edition: 5, start: "Jellyfish", glyph: "🪼" },
  { edition: 6, start: "Coffee", glyph: "☕" },
  { edition: 7, start: "Origami", glyph: "🦢" },
  { edition: 8, start: "Antarctica", glyph: "🧊" },
  { edition: 9, start: "Honey bee", glyph: "🐝" },
  { edition: 10, start: "Lighthouse", glyph: "🗼" },
  { edition: 11, start: "Chess", glyph: "♟️" },
  { edition: 12, start: "Volcano", glyph: "🌋" },
  { edition: 13, start: "Bicycle", glyph: "🚲" },
  { edition: 14, start: "Saxophone", glyph: "🎷" },
];

/** Edition 1 lands on launch day; earlier clocks clamp to it. */
const EPOCH = Date.UTC(2026, 9, 8);
const DAY_MS = 86_400_000;

export function todayIndex(now: Date = new Date()): number {
  const local = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((local - EPOCH) / DAY_MS));
}

export function seedForDay(dayIndex: number): Seed {
  return SEEDS[dayIndex % SEEDS.length]!;
}

/* ------------------------------------------------------------------ *
 * Recorded result (one per day)
 * ------------------------------------------------------------------ */

export type Outcome = "won" | "lost";

export type Result = {
  outcome: Outcome;
  /** Links clicked. For a loss this is always MAX_HOPS. */
  clicks: number;
  /** Full route, including the starting article. */
  path: string[];
};

const STORAGE_PREFIX = "sixdegrees.v1.day";

export function loadResult(dayIndex: number): Result | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${dayIndex}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Result;
    if (parsed?.outcome !== "won" && parsed?.outcome !== "lost") return null;
    if (typeof parsed.clicks !== "number" || !Array.isArray(parsed.path)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveResult(dayIndex: number, result: Result) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${dayIndex}`, JSON.stringify(result));
  } catch {
    /* private browsing — the game still plays, it just won't persist */
  }
}

/* ------------------------------------------------------------------ *
 * Share card
 * ------------------------------------------------------------------ */

/**
 * The route itself is deliberately left out: on a daily puzzle the path is the
 * spoiler. Start and target are public knowledge, so those stay in.
 */
export function shareText(seed: Seed, result: Result): string {
  const won = result.outcome === "won";
  const marks = Array.from({ length: MAX_HOPS }, (_, i) => {
    if (i < result.clicks) return won ? "🟩" : "🟥";
    return "⬜";
  }).join("");

  const score = won ? `${result.clicks}/${MAX_HOPS}` : `X/${MAX_HOPS}`;
  return [
    `SIX DEGREES #${seed.edition} — ${score}`,
    `${seed.glyph} ${seed.start} → 🥋 ${TARGET}`,
    marks,
  ].join("\n");
}

/**
 * Shown after a loss. Verified against Wikipedia's backlinks for Chuck Norris,
 * so every one of these really is a single click from the target rather than
 * flavour text.
 */
export const HUB_HINTS = [
  "Martial arts",
  "Karate",
  "Taekwondo",
  "Kickboxing",
  "Bruce Lee",
  "Action film",
];
