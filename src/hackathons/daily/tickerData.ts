/**
 * TICKER — daily "guess the company from its chart" puzzle data.
 *
 * Series are 90 consecutive daily closes, oldest first. They are deterministic,
 * hand-tuned to each company's real character (amplitude, drawdown shape,
 * single-day gap risk) rather than scraped live quotes — swapping in real closes
 * later means replacing the `series` arrays and nothing else.
 */

export type Company = {
  ticker: string;
  name: string;
};

export type Puzzle = {
  /** The company the chart belongs to. Must also appear in `options`. */
  answer: Company;
  /** Four choices, authored in display order (answer is not always first). */
  options: Company[];
  /** 90 daily closes, oldest first. */
  series: number[];
  /** Shown only after the round is answered. */
  blurb: string;
};

export type PuzzleSet = {
  puzzles: Puzzle[];
};

const AVGO: Company = { ticker: "AVGO", name: "Broadcom" };
const META: Company = { ticker: "META", name: "Meta Platforms" };
const FORD: Company = { ticker: "F", name: "Ford Motor" };

export const PUZZLE_SETS: PuzzleSet[] = [
  {
    puzzles: [
      {
        answer: AVGO,
        options: [
          { ticker: "QCOM", name: "Qualcomm" },
          AVGO,
          { ticker: "TXN", name: "Texas Instruments" },
          { ticker: "ORCL", name: "Oracle" },
        ],
        series: [
          302, 305.09, 304.62, 308.03, 309.22, 310.89, 315.32, 314.44, 313.02, 311.75,
          309.1, 311.51, 310.72, 309.13, 310.83, 310.77, 312.83, 310.73, 308.86, 307.41,
          311.55, 309.59, 307.95, 306.32, 305.01, 307.96, 306.95, 302.23, 296.11, 289.47,
          292.79, 294.22, 289.45, 291.59, 298.11, 297.86, 298.65, 297.68, 302.08, 303.56,
          305.23, 305.03, 304.32, 308.03, 314.17, 315.56, 319.56, 323.71, 328.86, 332.62,
          336, 338.67, 337.92, 344.75, 351.89, 352.57, 354.69, 355.71, 357.1, 359.4,
          360.58, 359.16, 354.64, 354.66, 353.29, 355.62, 351.55, 347.68, 345.56, 346.13,
          342.62, 343.5, 341.6, 344.23, 346.34, 342.75, 349.18, 352.33, 355.19, 353.42,
          357.65, 355.89, 361.12, 366.69, 370.07, 376.81, 380.41, 380.04, 379.8, 385.58,
        ],
        blurb:
          "The AI-infrastructure trade in one line. A brutal drawdown around day 30 wipes out a month of gains, then the curve just keeps making new highs. Custom silicon and datacenter networking make this one of the highest-beta names in the S&P 100 — big amplitude in both directions is the signature.",
      },
      {
        answer: META,
        options: [
          { ticker: "NFLX", name: "Netflix" },
          { ticker: "GOOGL", name: "Alphabet" },
          META,
          { ticker: "AMZN", name: "Amazon" },
        ],
        series: [
          715, 716.11, 723.57, 732.06, 736.11, 736.46, 744.6, 746.33, 743.04, 741.82,
          742.62, 748.32, 750.66, 760.4, 760.89, 767.63, 770.83, 773.88, 776.76, 785.01,
          780.79, 674, 667.76, 663.22, 659.57, 657.49, 651.59, 655.39, 652.04, 650.03,
          645.2, 649.14, 649.39, 652.14, 659.65, 660.66, 654.21, 663.55, 665.25, 669.78,
          669.1, 663.37, 662.04, 655.79, 666.1, 669.95, 666.71, 661.49, 667.11, 670.99,
          679, 689.99, 687.48, 687.35, 689.4, 699.51, 695.47, 700.16, 702.6, 711.28,
          721.07, 717.33, 721.35, 732.07, 729.92, 727.95, 729.28, 727.85, 731.2, 740.55,
          737.75, 744.58, 739.32, 732.48, 736.42, 731.59, 722.52, 724.06, 724.44, 721.66,
          728.18, 724.88, 725.45, 727.88, 733.36, 738.2, 740.33, 738.19, 744.61, 748.58,
        ],
        blurb:
          "That cliff on day 22 is the whole tell: one session down 13.6%, straight through the previous two months of work. This is a company that trades on a single scheduled event each quarter — the ad business beats, the capex number terrifies everyone, and then the chart spends 60 days quietly climbing back.",
      },
      {
        answer: FORD,
        options: [
          { ticker: "DAL", name: "Delta Air Lines" },
          { ticker: "KHC", name: "Kraft Heinz" },
          { ticker: "GM", name: "General Motors" },
          FORD,
        ],
        series: [
          11.8, 11.79, 11.73, 11.86, 11.85, 11.83, 11.89, 12.03, 11.9, 12.02,
          12.12, 12.11, 12.01, 12.1, 12.06, 12.09, 12.15, 12.25, 12.26, 12.01,
          11.8, 11.71, 11.52, 11.46, 11.41, 11.38, 11.46, 11.29, 11.25, 11.27,
          11.36, 11.23, 11.16, 11.01, 11.06, 10.9, 10.69, 10.52, 10.54, 10.39,
          10.46, 10.55, 10.56, 10.74, 10.93, 11.07, 10.99, 10.98, 11.15, 11.27,
          11.38, 11.53, 11.52, 11.64, 11.8, 11.95, 11.9, 12.01, 12.22, 12.41,
          12.4, 12.52, 12.51, 12.49, 12.43, 12.43, 12.35, 12.52, 12.63, 12.75,
          12.77, 12.81, 12.65, 12.6, 12.63, 12.61, 12.72, 12.74, 12.63, 12.48,
          12.36, 12.18, 12, 12.09, 12.14, 12.18, 12.16, 11.98, 11.92, 11.8,
        ],
        blurb:
          "Ninety days and dead flat — a slow slide into the day-40 low, then an orderly grind right back to where it started. Low amplitude, no breakout, no gaps: that shape belongs to a legacy automaker. Thin margins, heavy capital, and a dividend doing most of the actual work for shareholders.",
      },
    ],
  },
];

/** The day puzzle set #1 goes live. Also the anchor for the puzzle number. */
const EPOCH_DATE_KEY = "2026-10-08";

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateKeyToUtcDays(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86_400_000);
}

/** 1-based puzzle number, counting from the epoch. Shown as "TICKER #N". */
export function puzzleNumberForDate(date: Date): number {
  return dateKeyToUtcDays(toDateKey(date)) - dateKeyToUtcDays(EPOCH_DATE_KEY) + 1;
}

/** Cycles through the authored sets so there is always a puzzle to play. */
export function puzzleSetForDate(date: Date): PuzzleSet {
  const n = PUZZLE_SETS.length;
  const i = (((puzzleNumberForDate(date) - 1) % n) + n) % n;
  return PUZZLE_SETS[i]!;
}

export type SeriesStats = {
  /** Total move across the window, in percent. */
  changePct: number;
  /** High-to-low spread, in percent of the low. */
  rangePct: number;
  /** Largest single-day move, signed, in percent. */
  biggestDayPct: number;
  /** Annualized standard deviation of daily returns, in percent. */
  volPct: number;
  /** Deepest peak-to-trough decline, in percent (negative). */
  maxDrawdownPct: number;
};

export function seriesStats(series: number[]): SeriesStats {
  const first = series[0]!;
  const last = series[series.length - 1]!;
  const hi = Math.max(...series);
  const lo = Math.min(...series);

  const returns: number[] = [];
  for (let i = 1; i < series.length; i++) {
    returns.push(series[i]! / series[i - 1]! - 1);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;

  let biggestDay = 0;
  for (const r of returns) {
    if (Math.abs(r) > Math.abs(biggestDay)) biggestDay = r;
  }

  let peak = first;
  let maxDrawdown = 0;
  for (const v of series) {
    if (v > peak) peak = v;
    const dd = v / peak - 1;
    if (dd < maxDrawdown) maxDrawdown = dd;
  }

  return {
    changePct: (last / first - 1) * 100,
    rangePct: (hi / lo - 1) * 100,
    biggestDayPct: biggestDay * 100,
    volPct: Math.sqrt(variance) * Math.sqrt(252) * 100,
    maxDrawdownPct: maxDrawdown * 100,
  };
}
