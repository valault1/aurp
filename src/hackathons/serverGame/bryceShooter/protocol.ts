/**
 * Wire protocol + tuning shared by the shooter's server and client.
 *
 * Everything here is imported by BOTH sides. That matters more than it looks: client-side
 * prediction only works if the client runs byte-for-byte the same movement maths the
 * server will run, so `stepMove` lives here and neither side owns a private copy.
 */

export const ARENA = { w: 1000, h: 640 };

export const TICK_HZ = 20;
export const TICK_MS = 1000 / TICK_HZ;

export const INPUT_HZ = 30;
/** Per-command dt clamp. A client cannot claim a huge dt to teleport. */
export const MAX_CMD_MS = 50;
/** Token bucket, refilled TICK_MS per tick: caps how much sim time a client can buy. */
export const CMD_BUDGET_MAX_MS = 150;
/** Backlog past this is acked but not simulated, so a flood cannot become input lag. */
export const CMD_QUEUE_MAX_MS = 200;
/** Unacked commands resent with each packet, so one lost datagram is not a lost input. */
export const CMD_RESEND = 3;

export const PLAYER_RADIUS = 15;
export const PLAYER_SPEED = 235;
export const MAX_HP = 100;
export const RESPAWN_DELAY = 2;

export const BULLET_RADIUS = 4;
export const BULLET_SPEED = 620;
export const BULLET_TTL = 1.5;
export const BULLET_DAMAGE = 22;
/** Constant across every power on purpose: the client predicts its own muzzle flash off it. */
export const FIRE_COOLDOWN = 0.2;

export const POWER_DURATION = 15;
export const HEALTH_PACK = 40;
export const PAD_RADIUS = 15;

export const SPREAD_SHOTS = 3;
export const SPREAD_ARC = 0.22;
export const BIG_RADIUS = 10;
export const BIG_DAMAGE = 38;
export const BIG_SPEED = 520;
export const BOUNCE_LIMIT = 3;
export const BOUNCE_TTL = 2.4;

export const CLIENT_TIMEOUT_MS = 15_000;

export const POWERS = ["spread", "big", "bounce", "ghost"] as const;
export type Power = (typeof POWERS)[number];
export type PadKind = Power | "health";

export type Rect = { x: number; y: number; w: number; h: number };

export const WALLS: Rect[] = [
  { x: 470, y: 210, w: 60, h: 220 },
  { x: 170, y: 130, w: 150, h: 26 },
  { x: 680, y: 484, w: 150, h: 26 },
  { x: 170, y: 484, w: 150, h: 26 },
  { x: 680, y: 130, w: 150, h: 26 },
  { x: 96, y: 280, w: 26, h: 130 },
  { x: 878, y: 230, w: 26, h: 130 },
  { x: 380, y: 60, w: 26, h: 90 },
  { x: 594, y: 490, w: 26, h: 90 },
];

export const SPAWNS = [
  { x: 70, y: 70 },
  { x: 930, y: 570 },
  { x: 930, y: 70 },
  { x: 70, y: 570 },
  { x: 500, y: 60 },
  { x: 500, y: 580 },
];

export const COLORS = ["#35e0e6", "#ff36a1", "#ffab40", "#52c17a", "#8f7bff", "#ff5d4d"];

/**
 * Pickup pads. Fixed kind per position so the map stays learnable: the ricochet pad is
 * always mid-left. All five sit in open floor, clear of every wall in WALLS.
 */
export const PADS: { x: number; y: number; kind: PadKind; respawn: number }[] = [
  { x: 90, y: 190, kind: "health", respawn: 8 },
  { x: 910, y: 450, kind: "health", respawn: 8 },
  { x: 500, y: 100, kind: "spread", respawn: 20 },
  { x: 500, y: 540, kind: "big", respawn: 20 },
  { x: 215, y: 320, kind: "bounce", respawn: 20 },
  { x: 785, y: 320, kind: "ghost", respawn: 20 },
];

export const PAD_META: Record<PadKind, { label: string; color: string }> = {
  health: { label: "repair", color: "#52c17a" },
  spread: { label: "spread", color: "#ff36a1" },
  big: { label: "heavy", color: "#ffab40" },
  bounce: { label: "ricochet", color: "#35e0e6" },
  ghost: { label: "phase", color: "#8f7bff" },
};

/** One frame of intent. `dtMs` is an integer so it survives JSON identically on both sides. */
export type Cmd = {
  seq: number;
  dtMs: number;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  aim: number;
  fire: boolean;
};

export type PlayerState = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  aim: number;
  hp: number;
  score: number;
  deaths: number;
  alive: boolean;
  /** Last command sequence the server has consumed for this player. Drives reconciliation. */
  seq: number;
  /** Seconds left on each active power. Absent keys mean no power; usually empty. */
  pw: Partial<Record<Power, number>>;
};

export type BulletState = {
  id: number; x: number; y: number; owner: string;
  /** Radius and flags travel with the bullet so the client can draw what it actually is. */
  r: number; ghost: boolean; bounce: boolean;
};

export type ClientMsg =
  | { t: "join"; name: string }
  | { t: "cmd"; cs: Cmd[] }
  | { t: "ping"; ts: number };

export type ServerMsg =
  | { t: "welcome"; id: string; tickHz: number }
  | { t: "state"; tick: number; players: PlayerState[]; bullets: BulletState[]; pads: number[] }
  | { t: "pickup"; who: string; kind: PadKind }
  | { t: "kill"; killer: string; victim: string }
  | { t: "pong"; ts: number };

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** Shortest-path angle lerp, so aim does not spin the long way around at the +/-PI seam. */
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
  for (const w of WALLS) if (circleHitsRect(x, y, r, w)) return true;
  return false;
}

/**
 * The one true movement step, run on the server and re-run by the client when predicting.
 * Axis-separated so you slide along walls instead of sticking to them. Uses Math.sqrt
 * rather than Math.hypot because hypot is not required to be correctly rounded, and
 * prediction only cancels out if both sides produce bit-identical results.
 */
export function stepMove(p: { x: number; y: number }, c: Cmd) {
  const dx = (c.right ? 1 : 0) - (c.left ? 1 : 0);
  const dy = (c.down ? 1 : 0) - (c.up ? 1 : 0);
  if (!dx && !dy) return;

  const step = (PLAYER_SPEED * (c.dtMs / 1000)) / Math.sqrt(dx * dx + dy * dy);

  const nx = clamp(p.x + dx * step, PLAYER_RADIUS, ARENA.w - PLAYER_RADIUS);
  if (!blocked(nx, p.y, PLAYER_RADIUS)) p.x = nx;

  const ny = clamp(p.y + dy * step, PLAYER_RADIUS, ARENA.h - PLAYER_RADIUS);
  if (!blocked(p.x, ny, PLAYER_RADIUS)) p.y = ny;
}
