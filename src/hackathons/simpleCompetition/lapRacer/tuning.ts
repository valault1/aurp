// feel knobs + the one car. TUNING is live-mutated by the in-game dev panel (`).

export const TUNING = {
  SEG_LEN: 200, // world units per road segment
  ROAD_WIDTH: 2400, // half-width of the road (|playerX|>1 = off road) — 3 comfy lanes
  RUMBLE_GROUP: 4, // segments per color stripe
  CAMERA_HEIGHT: 1000,
  CAMERA_DEPTH: 0.84, // ~100deg field of view
  DRAW_DISTANCE: 240,
  FOG_DENSITY: 4,
  POS_K: 84, // km/h -> world units/sec (bigger = faster sense of speed)
  STEER: 3.8, // lateral responsiveness
  STEER_SLIDE: 7, // how fast steering eases in (lower = looser / slidey-er)
  CENTRIFUGAL: 2.2, // how hard a corner pumps outward drift MOMENTUM (scales with speed²)
  GRIP_RECOVER: 1.7, // how fast the tires bleed that drift off once the road straightens
  OFFROAD_MAX_KMH: 45, // top speed on the grass — fly off and you crawl (dangerous!)
  OFFROAD_DECEL: 9000, // heavy drag that rips speed away the instant you leave the road
  TRAFFIC: 5, // default number of slow cars on the circuit (tracks can override)
  RACE_LAPS: 4, // race distance — finish overlay after this many laps
  AI_PACE: 1, // global multiplier on rival target speeds (fine-tune the fight)
  AI_CORNER: 1, // multiplier on rival CORNER limits only (straight speed untouched)
};
// pristine copy for the dev panel's "reset" (TUNING itself is mutated by live tuning)
export const TUNING_DEFAULTS = { ...TUNING };

// the dev-panel knobs (` to toggle in-game). Live-mutates TUNING; persists to localStorage.
export const KNOBS: { k: keyof typeof TUNING; label: string; min: number; max: number; step: number }[] = [
  { k: "RACE_LAPS", label: "race laps", min: 1, max: 12, step: 1 },
  { k: "AI_PACE", label: "ai pace", min: 0.6, max: 1.2, step: 0.02 },
  { k: "AI_CORNER", label: "ai corners", min: 0.6, max: 1.4, step: 0.02 },
  { k: "POS_K", label: "speed feel", min: 40, max: 140, step: 2 },
  { k: "STEER", label: "steer", min: 1, max: 8, step: 0.1 },
  { k: "STEER_SLIDE", label: "steer ease", min: 2, max: 14, step: 0.5 },
  { k: "CENTRIFUGAL", label: "corner force", min: 0, max: 5, step: 0.05 },
  { k: "GRIP_RECOVER", label: "grip", min: 0.3, max: 6, step: 0.05 },
  { k: "OFFROAD_MAX_KMH", label: "grass max", min: 10, max: 140, step: 5 },
  { k: "OFFROAD_DECEL", label: "grass drag", min: 1000, max: 20000, step: 500 },
];

// ------------------------------------------------------------------ car (single, arcade-fast)
export interface Car {
  id: string; name: string;
  idle: number; redline: number; revLimit: number; mechMax: number;
  maxTq: number; tqPeak: number; tqWidth: number;
  final: number; wheelR: number; mass: number; roll: number; aero: number;
  brakeMax: number; grip: number; gears: number; ratios: Record<number, number>;
  shift: number;
}

export const CAR: Car = {
  id: "apex", name: "MX-5 APEX",
  idle: 900, redline: 7600, revLimit: 8000, mechMax: 10200,
  maxTq: 300, tqPeak: 4400, tqWidth: 6400,
  final: 3.5, wheelR: 0.30, mass: 1040, roll: 145, aero: 0.34, brakeMax: 13500, grip: 12500, gears: 6,
  ratios: { 1: 3.1, 2: 2.15, 3: 1.62, 4: 1.28, 5: 1.0, 6: 0.80 }, shift: 7100, // taller gearing → ~200 mph
};

export const SOUND = { base: 30, pitch: 0.03, cutoff: 560, cutoffPerRpm: 0.36, sub: 0.2, whistle: 0.22, noise: 0.18 };
