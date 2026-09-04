/**
 * PROVING GROUNDS — shared tuning and wire protocol.
 *
 * Unlike the shooter, this client predicts NOTHING. Point-and-click movement hides a
 * round trip on its own: you click, your character turns and walks, and nobody can tell
 * whether the walk started 60 ms late. That buys a much simpler client — orders in,
 * snapshots out — so this file carries no shared simulation code, only data.
 */

/** Must match TICK_HZ in ../net/router.ts. */
export const TICK_HZ = 20;
export const TICK_MS = 1000 / TICK_HZ;
export const INTERP_MIN_MS = 60;
export const INTERP_MAX_MS = 260;

export const ARENA = { w: 1300, h: 820 };

/** Out of combat only. Without it one camp leaves you too hurt to take the next. */
export const REGEN_DELAY = 4;
export const REGEN_RATE = 0.07;

export const FARM_SECONDS = 300;
export const DUEL_SECONDS = 120;
export const RESULT_SECONDS = 15;
export const RESPAWN_SECONDS = 5;
/** Ignore orders arriving faster than this; a click cannot outpace it. */
export const ORDER_MIN_MS = 25;

export type Rect = { x: number; y: number; w: number; h: number };

/** Kept clear of the y=410 duel lane, so a duel is not decided by a rock eating every shot. */
export const ROCKS: Rect[] = [
  { x: 200, y: 150, w: 40, h: 160 },
  { x: 1060, y: 510, w: 40, h: 160 },
  { x: 430, y: 250, w: 40, h: 120 },
  { x: 830, y: 450, w: 40, h: 120 },
  { x: 620, y: 200, w: 60, h: 40 },
  { x: 620, y: 580, w: 60, h: 40 },
];

/** Sidestep angles tried in order when the direct step into a rock is blocked. */
export const DEFLECT = [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.75, -1.75];

// ---- classes -----------------------------------------------------------------------------

export type ClassId = "warrior" | "mage" | "rogue";

export type Ability =
  | { kind: "bolt"; name: string; blurb: string; cd: number; dmg: number; speed: number; r: number; range: number; slowPct: number; slowSecs: number }
  | { kind: "cone"; name: string; blurb: string; cd: number; dmg: number; range: number; arc: number }
  | { kind: "pierce"; name: string; blurb: string; cd: number; dmg: number; speed: number; r: number; range: number };

export type ClassDef = {
  id: ClassId;
  name: string;
  color: string;
  blurb: string;
  hp: number;
  speed: number;
  weapon: { name: string; range: number; dmg: number; cd: number; shot: ShotKind | null };
  abilities: Ability[];
};

export const CLASSES: Record<ClassId, ClassDef> = {
  warrior: {
    id: "warrior", name: "Warrior", color: "#ff8a5c",
    blurb: "Walks in and stays in. Most health, no reach.",
    hp: 150, speed: 216,
    weapon: { name: "Sword", range: 58, dmg: 13, cd: 0.75, shot: null },
    abilities: [
      // Wide on purpose: melee gets swarmed, so a narrow cone would whiff on the pile.
      { kind: "cone", name: "Smash", blurb: "Heavy arc that hits everything in front of you.", cd: 6, dmg: 26, range: 140, arc: 2.4 },
    ],
  },
  mage: {
    id: "mage", name: "Mage", color: "#6fc0ff",
    blurb: "Longest reach, thinnest skin. Frost keeps things off you.",
    hp: 95, speed: 190,
    weapon: { name: "Staff", range: 300, dmg: 11, cd: 0.95, shot: "bolt" },
    abilities: [
      { kind: "bolt", name: "Frostbolt", blurb: "Heavy hit that slows what it touches.", cd: 5, dmg: 30, speed: 430, r: 9, range: 620, slowPct: 0.45, slowSecs: 2.5 },
    ],
  },
  rogue: {
    id: "rogue", name: "Rogue", color: "#9ee37d",
    blurb: "Fastest feet and fastest bow. Rewards lining things up.",
    hp: 115, speed: 226,
    weapon: { name: "Bow", range: 270, dmg: 10, cd: 0.6, shot: "arrow" },
    abilities: [
      { kind: "pierce", name: "Piercing Shot", blurb: "Runs through every enemy in a line.", cd: 5.5, dmg: 24, speed: 780, r: 7, range: 470 },
    ],
  },
};

export const CLASS_LIST: ClassId[] = ["warrior", "mage", "rogue"];

// ---- progression --------------------------------------------------------------------------

export const PLAYER_RADIUS = 15;
export const DMG_PER_LEVEL = 0.09;
export const HP_PER_LEVEL = 14;
export const LEVEL_HEAL = 0.25;

/** XP needed to leave this level. Deliberately shallow: a 5 minute farm should show progress. */
export const xpToNext = (level: number) => 55 * level;

export type ItemId = "power" | "vigor" | "swift";

export const ITEMS: Record<ItemId, { name: string; blurb: string; color: string }> = {
  power: { name: "Whetstone", blurb: "+3 damage", color: "#ffab40" },
  vigor: { name: "Heartroot", blurb: "+18 max health", color: "#52c17a" },
  swift: { name: "Windstep", blurb: "+9 move speed", color: "#35e0e6" },
};

export const ITEM_POWER = 3;
export const ITEM_VIGOR = 18;
export const ITEM_SWIFT = 9;

export const statsFor = (cls: ClassDef, level: number, items: Record<ItemId, number>) => ({
  maxHp: cls.hp + HP_PER_LEVEL * (level - 1) + ITEM_VIGOR * (items.vigor ?? 0),
  speed: cls.speed + ITEM_SWIFT * (items.swift ?? 0),
  bonus: 1 + DMG_PER_LEVEL * (level - 1),
  flat: ITEM_POWER * (items.power ?? 0),
});

export const damageOf = (base: number, level: number, items: Record<ItemId, number>) =>
  Math.round(base * (1 + DMG_PER_LEVEL * (level - 1)) + ITEM_POWER * (items.power ?? 0));

// ---- monsters -----------------------------------------------------------------------------

export type MobKind = "imp" | "brute" | "shade";

export const MOBS: Record<MobKind, {
  name: string; hp: number; dmg: number; speed: number; range: number; cd: number;
  aggro: number; leash: number; xp: number; r: number; color: string; drop: number; shot: ShotKind | null;
}> = {
  imp:   { name: "Imp",   hp: 34, dmg: 5,  speed: 150, range: 30,  cd: 1.2, aggro: 175, leash: 400, xp: 12, r: 12, color: "#c8607a", drop: 0.25, shot: null },
  brute: { name: "Brute", hp: 92, dmg: 12, speed: 104, range: 36,  cd: 1.7, aggro: 165, leash: 360, xp: 30, r: 19, color: "#a4794a", drop: 0.60, shot: null },
  shade: { name: "Shade", hp: 46, dmg: 7,  speed: 122, range: 235, cd: 1.9, aggro: 200, leash: 420, xp: 24, r: 14, color: "#8f7bff", drop: 0.40, shot: "hex" },
};

/**
 * Camps sit in the middle third; spawns hug the left and right edges. Keep at least
 * CAMP_SAFE_RADIUS between them — a spawn inside a camp's aggro means you are chewed up
 * before you can pick a fight, which is exactly what the first layout did.
 */
export const CAMPS: { x: number; y: number; spawn: MobKind[]; respawn: number }[] = [
  { x: 340, y: 180, spawn: ["imp", "imp"], respawn: 18 },
  { x: 960, y: 180, spawn: ["brute", "imp"], respawn: 24 },
  { x: 340, y: 640, spawn: ["shade", "shade"], respawn: 22 },
  { x: 960, y: 640, spawn: ["imp", "imp", "imp"], respawn: 18 },
  { x: 650, y: 410, spawn: ["brute", "shade"], respawn: 26 },
];

/** Comfortably past the widest aggro radius in MOBS. */
export const CAMP_SAFE_RADIUS = 320;
/** Camps must also clear each other, or one pull drags in the neighbours. */
export const CAMP_GAP = 340;

export const SPAWNS = [
  { x: 65, y: 410 },
  { x: 1235, y: 410 },
  { x: 650, y: 70 },
  { x: 650, y: 750 },
];

/**
 * Duel positions are generated per fighter rather than taken from a fixed list. A fixed
 * list of two gets reused modulo the roster, which stacks the third fighter on top of the
 * first — and a projectile aimed at one then hits whoever is standing in front of them.
 */
export const DUEL_RADIUS = 350;

export function duelPost(index: number, count: number) {
  const a = (index / Math.max(1, count)) * Math.PI * 2;
  return {
    x: ARENA.w / 2 + Math.cos(a) * DUEL_RADIUS,
    y: ARENA.h / 2 + Math.sin(a) * DUEL_RADIUS,
  };
}

// ---- wire ----------------------------------------------------------------------------------

export type Phase = "lobby" | "farm" | "duel" | "result";
export type ShotKind = "bolt" | "arrow" | "frost" | "pierce" | "hex";
export type FxKind = "dmg" | "heal" | "xp" | "level" | "swing" | "smash" | "pick" | "die";

export type PlayerState = {
  id: string; name: string; cls: ClassId | null; ready: boolean;
  x: number; y: number; facing: number;
  hp: number; maxHp: number; level: number; xp: number; xpNext: number;
  alive: boolean; respawnIn: number; slowed: boolean;
  cds: number[]; items: Record<ItemId, number>;
  dmg: number; speed: number; kills: number; deaths: number;
};

export type MobState = { id: string; kind: MobKind; x: number; y: number; hp: number; maxHp: number; facing: number };
export type ShotState = { id: number; kind: ShotKind; x: number; y: number; facing: number; hostile: boolean };
export type DropState = { id: number; x: number; y: number; item: ItemId };
export type Fx = { id: number; x: number; y: number; k: FxKind; v: number; a: number };

export type ClientMsg =
  | { t: "join"; name: string }
  | { t: "pick"; cls: ClassId }
  | { t: "ready"; on: boolean }
  | { t: "move"; x: number; y: number }
  | { t: "target"; id: string | null }
  | { t: "cast"; slot: number; x: number; y: number }
  | { t: "ping"; ts: number };

export type ServerMsg =
  | { t: "welcome"; id: string; tickHz: number }
  | {
      t: "state"; tick: number; phase: Phase; clock: number;
      players: PlayerState[]; mobs: MobState[]; shots: ShotState[]; drops: DropState[]; fx: Fx[];
    }
  | { t: "log"; line: string }
  | { t: "pong"; ts: number };

// ---- geometry -------------------------------------------------------------------------------

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export function lerpAngle(a: number, b: number, p: number) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * p;
}

export function circleHitsRect(cx: number, cy: number, r: number, w: Rect) {
  const nx = clamp(cx, w.x, w.x + w.w);
  const ny = clamp(cy, w.y, w.y + w.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function blocked(x: number, y: number, r: number) {
  for (const w of ROCKS) if (circleHitsRect(x, y, r, w)) return true;
  return false;
}
