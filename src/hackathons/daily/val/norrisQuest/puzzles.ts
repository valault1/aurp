/**
 * SIX DEGREES — daily link-chase.
 *
 * Everyone starts on the same article each day. The target never changes:
 * Chuck Norris. Score is the number of links clicked to get there, and you get
 * six. Lower is better; six is a photo finish; seven does not exist.
 */

export const TARGET = "Chuck Norris";
export const MAX_HOPS = 6;

/** The game's name, on the masthead and on every shared log. */
export const GAME_NAME = "NorrisQuest";
export const GAME_URL = "https://dev.valault.com/norrisquest";

export type Seed = {
  /** Human-facing edition number, shown in the share text. */
  edition: number;
  /** Wikipedia article title the voyage departs from. */
  start: string;
};

/**
 * Day 1 is Apple, per spec. The rest are chosen the same way: broad pages with
 * dense outgoing links, so there is always more than one route through.
 */
export const SEEDS: Seed[] = [
  { edition: 1, start: "Apple" },
  { edition: 2, start: "Pizza" },
  { edition: 3, start: "Mount Everest" },
  { edition: 4, start: "Tetris" },
  { edition: 5, start: "Jellyfish" },
  { edition: 6, start: "Coffee" },
  { edition: 7, start: "Origami" },
  { edition: 8, start: "Antarctica" },
  { edition: 9, start: "Honey bee" },
  { edition: 10, start: "Lighthouse" },
  { edition: 11, start: "Chess" },
  { edition: 12, start: "Volcano" },
  { edition: 13, start: "Bicycle" },
  { edition: 14, start: "Saxophone" },
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

const STORAGE_PREFIX = "norrisquest.v1.day";
/** The key used before the game was renamed; still read so a logged day survives. */
const LEGACY_PREFIX = "sixdegrees.v1.day";

export function loadResult(dayIndex: number): Result | null {
  try {
    const raw =
      localStorage.getItem(`${STORAGE_PREFIX}${dayIndex}`) ??
      localStorage.getItem(`${LEGACY_PREFIX}${dayIndex}`);
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

/** One square per hop: spent links filled, unspent ones blank. */
export function marksFor(result: Result): string[] {
  const won = result.outcome === "won";
  return Array.from({ length: MAX_HOPS }, (_, i) =>
    i < result.clicks ? (won ? "🟩" : "🟥") : "⬜",
  );
}

/**
 * Period wording, but the squares stay coloured emoji. A daily game lives or
 * dies on a grid that reads at a glance in a group chat, and that is the one
 * place where being on-theme would cost more than it is worth.
 *
 * The route is deliberately left out: on a daily puzzle the path is the
 * spoiler. Departure and destination are public knowledge, so those stay.
 */
export function shareText(seed: Seed, result: Result): string {
  const won = result.outcome === "won";
  const score = won ? `${result.clicks}/${MAX_HOPS}` : `X/${MAX_HOPS}`;
  return [
    `${GAME_NAME} No. ${seed.edition} — ${score}`,
    `${seed.start} ⟶ ${TARGET}`,
    marksFor(result).join(""),
    GAME_URL,
  ].join("\n");
}

/**
 * Shown after a loss. Verified against Wikipedia's backlinks for Chuck Norris,
 * so every one of these really is a single leg from the destination rather
 * than flavour text.
 */
export const HUB_HINTS = [
  "Martial arts",
  "Karate",
  "Taekwondo",
  "Kickboxing",
  "Bruce Lee",
  "Action film",
];
