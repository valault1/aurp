// per-track challenges. PURE LOGIC — no DOM, no canvas.
//
// Two BINARY challenges (you did it or you didn't — earnable in time trial too):
//   TARMAC ONLY — finish without ever leaving the road
//   NO CONTACT — finish without hitting anything
// ...and two MEDAL ladders:
//   TIME — finish the race under the bronze/silver/gold time (targets are per-lap pace
//     (track.medalLaps) × RACE_LAPS, so they survive the race-length knob)
//   BEAT THE PACK — win a VS race; the medal is the difficulty (easy/med/hard), so
//     hotshots go straight for gold on HARD and everything else is farmable in TT.
// Graded once at the finish; best result per track persists.

export type Medal = "gold" | "silver" | "bronze";
export const MEDAL_ICON: Record<Medal, string> = { gold: "🥇", silver: "🥈", bronze: "🥉" };
const RANK: Record<Medal, number> = { gold: 3, silver: 2, bronze: 1 };

export interface RaceStats {
  finished: boolean;
  raceTime: number; // total race time, seconds
  contacts: number; // traffic + rival + tree impacts
  offroadS: number; // seconds spent on the grass
  won: boolean; // finished P1 (VS only)
  diffId: string | null; // "easy" | "med" | "hard", null in time trial
}

export interface TrackChallenges {
  tarmac?: boolean;
  clean?: boolean;
  time?: Medal | null;
  pack?: Medal | null;
}
export type ChallengeSave = Record<string, TrackChallenges>;

const KEY = "lapracer.challenges";

export function loadChallenges(): ChallengeSave {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "{}");
    return o && typeof o === "object" ? (o as ChallengeSave) : {};
  } catch { return {}; }
}

/** race-time targets [gold, silver, bronze] for the current race length */
export const timeTargets = (paceLaps: [number, number, number], laps: number) =>
  paceLaps.map((p) => p * laps) as [number, number, number];

export function timeMedal(raceTime: number, paceLaps: [number, number, number], laps: number): Medal | null {
  const [g, s, b] = timeTargets(paceLaps, laps);
  return raceTime <= g ? "gold" : raceTime <= s ? "silver" : raceTime <= b ? "bronze" : null;
}

export interface Earned { label: string; isNew: boolean; }

/** grade a finished event, merge improvements into storage, return display lines
    (★ marks a first-time / upgraded result) */
export function awardChallenges(
  trackId: string, paceLaps: [number, number, number], laps: number, stats: RaceStats,
): Earned[] {
  const save = loadChallenges();
  const c = save[trackId] ?? (save[trackId] = {});
  const earned: Earned[] = [];

  const binary = (key: "tarmac" | "clean", ok: boolean, label: string) => {
    if (!ok) return;
    const isNew = !c[key];
    c[key] = true;
    earned.push({ label: "✓ " + label, isNew });
  };
  binary("tarmac", stats.finished && stats.offroadS <= 0, "TARMAC ONLY");
  binary("clean", stats.finished && stats.contacts === 0, "NO CONTACT");

  const ladder = (key: "time" | "pack", medal: Medal | null, label: string) => {
    if (!medal) return;
    const prev = c[key] ?? null;
    const isNew = !prev || RANK[medal] > RANK[prev];
    if (isNew) c[key] = medal;
    earned.push({ label: `${MEDAL_ICON[medal]} ${label}`, isNew });
  };
  ladder("time", stats.finished ? timeMedal(stats.raceTime, paceLaps, laps) : null, "TIME");
  ladder("pack", stats.won ? (stats.diffId === "hard" ? "gold" : stats.diffId === "med" ? "silver" : "bronze") : null, "BEAT THE PACK");

  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* ignore */ }
  return earned;
}
