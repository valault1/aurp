// Brink rules: daily battle generation, hero actions, shoves, enemy intents, and enemy planning. Pure and deterministic.

import { makeRng, type Rng } from "../daily";
import { cellKey } from "../snug/pieces";
import type { EnemyKind, HeroKind } from "./figures";

export type Dir = readonly [number, number];
export type Tile = readonly [number, number];
export const DIRS: Dir[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export const MAX_TURNS = 8;
const SIZE = 8;

export const STATS: Record<HeroKind | EnemyKind, { hp: number; move: number }> = {
  wanderer: { hp: 3, move: 3 },
  crane: { hp: 2, move: 4 },
  ox: { hp: 4, move: 2 },
  blot: { hp: 1, move: 3 },
  spitter: { hp: 1, move: 2 },
  brute: { hp: 3, move: 2 },
};
const SWAP_RANGE = 3;
const CHARGE_RANGE = 5;
const SPIT_RANGE = 8;

export interface Unit {
  id: string;
  side: "hero" | "enemy";
  kind: HeroKind | EnemyKind;
  x: number;
  y: number;
  hp: number;
  max: number;
  moved: boolean;
  acted: boolean;
  /** Enemy attack direction for the coming enemy phase; it travels with the enemy if shoved. */
  intent: Dir | null;
  dead: null | "fell" | "slain";
}

export interface Obstacle {
  x: number;
  y: number;
  kind: "pine" | "boulder";
}

export interface Lantern {
  x: number;
  y: number;
  hp: number;
  max: number;
}

/** A one-frame visual effect produced by the last step. */
export interface Fx {
  kind: "splat" | "fall" | "bump";
  x: number;
  y: number;
  unit?: Unit;
  key: string;
}

export interface Battle {
  dateKey: string;
  cols: number;
  rows: number;
  layout: string[];
  obstacles: Obstacle[];
  units: Unit[];
  lantern: Lantern | null;
  turn: number;
  wounds: number;
  status: "playing" | "won" | "lost";
  lostReason: null | "heroes" | "lantern" | "mist";
  fx: Fx[];
  fxSeq: number;
}

export type ActionKind = "shove" | "swap" | "charge";

export interface Action {
  kind: ActionKind;
  target: Tile;
  dir: Dir;
  /** Where the ox stops before impact. */
  stop?: Tile;
}

export const clone = (b: Battle): Battle => structuredClone(b);
export const inBounds = (b: Battle, x: number, y: number) => x >= 0 && y >= 0 && x < b.cols && y < b.rows;
export const isLand = (b: Battle, x: number, y: number) => inBounds(b, x, y) && b.layout[y]![x] !== ".";
export const alive = (b: Battle, side?: Unit["side"]) => b.units.filter((u) => !u.dead && (!side || u.side === side));
export const unitAt = (b: Battle, x: number, y: number, except?: string) =>
  b.units.find((u) => !u.dead && u.x === x && u.y === y && u.id !== except);
export const obstacleAt = (b: Battle, x: number, y: number) => b.obstacles.find((o) => o.x === x && o.y === y);
export const lanternAt = (b: Battle, x: number, y: number) =>
  b.lantern && b.lantern.hp > 0 && b.lantern.x === x && b.lantern.y === y ? b.lantern : null;
const free = (b: Battle, x: number, y: number, except?: string) =>
  isLand(b, x, y) && !unitAt(b, x, y, except) && !obstacleAt(b, x, y) && !lanternAt(b, x, y);

/** Tiles a unit can walk to this turn, with step counts; excludes its own tile. */
export function reachable(b: Battle, u: Unit, range = STATS[u.kind].move): Map<string, number> {
  const out = new Map<string, number>();
  const seen = new Set([cellKey(u.x, u.y)]);
  let frontier: Tile[] = [[u.x, u.y]];
  for (let step = 1; step <= range; step++) {
    const next: Tile[] = [];
    for (const [x, y] of frontier) {
      for (const [dx, dy] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        const k = cellKey(nx, ny);
        if (seen.has(k) || !free(b, nx, ny, u.id)) continue;
        seen.add(k);
        out.set(k, step);
        next.push([nx, ny]);
      }
    }
    frontier = next;
  }
  return out;
}

function addFx(b: Battle, kind: Fx["kind"], x: number, y: number, unit?: Unit) {
  b.fx.push({ kind, x, y, unit: unit ? { ...unit } : undefined, key: `${kind}-${b.fxSeq++}` });
}

function hurt(b: Battle, u: Unit, amount: number) {
  if (u.dead) return;
  const taken = Math.min(amount, u.hp);
  u.hp -= taken;
  if (u.side === "hero") b.wounds += taken;
  addFx(b, "splat", u.x, u.y);
  if (u.hp <= 0) u.dead = "slain";
}

function hurtLantern(b: Battle, amount: number) {
  if (!b.lantern || b.lantern.hp <= 0) return;
  b.lantern.hp = Math.max(0, b.lantern.hp - amount);
  addFx(b, "splat", b.lantern.x, b.lantern.y);
}

/** Pushes a unit one tile: off the edge it falls; into anything solid, both take 1 damage. */
function shove(b: Battle, u: Unit, [dx, dy]: Dir) {
  if (u.dead) return;
  const nx = u.x + dx;
  const ny = u.y + dy;
  if (!isLand(b, nx, ny)) {
    addFx(b, "fall", nx, ny, u);
    if (u.side === "hero") b.wounds += u.hp;
    u.hp = 0;
    u.x = nx;
    u.y = ny;
    u.dead = "fell";
    return;
  }
  const other = unitAt(b, nx, ny);
  if (other) {
    addFx(b, "bump", nx, ny);
    hurt(b, u, 1);
    hurt(b, other, 1);
    return;
  }
  if (lanternAt(b, nx, ny)) {
    addFx(b, "bump", nx, ny);
    hurt(b, u, 1);
    hurtLantern(b, 1);
    return;
  }
  if (obstacleAt(b, nx, ny)) {
    addFx(b, "bump", nx, ny);
    hurt(b, u, 1);
    return;
  }
  u.x = nx;
  u.y = ny;
}

function checkEnd(b: Battle) {
  if (b.status !== "playing") return;
  if (alive(b, "enemy").length === 0) b.status = "won";
  else if (alive(b, "hero").length === 0) {
    b.status = "lost";
    b.lostReason = "heroes";
  } else if (b.lantern && b.lantern.hp <= 0) {
    b.status = "lost";
    b.lostReason = "lantern";
  }
}

/** Every ability use available to a hero right now; abilities only target ink spirits. */
export function heroActions(b: Battle, h: Unit): Action[] {
  if (h.dead || h.acted || h.side !== "hero") return [];
  const out: Action[] = [];
  for (const dir of DIRS) {
    const [dx, dy] = dir;
    if (h.kind === "wanderer") {
      const t = unitAt(b, h.x + dx, h.y + dy);
      if (t?.side === "enemy") out.push({ kind: "shove", target: [t.x, t.y], dir });
    } else if (h.kind === "crane") {
      for (let k = 1; k <= SWAP_RANGE; k++) {
        const x = h.x + dx * k;
        const y = h.y + dy * k;
        if (!inBounds(b, x, y)) break;
        const t = unitAt(b, x, y);
        if (t) {
          if (t.side === "enemy") out.push({ kind: "swap", target: [x, y], dir });
          break;
        }
      }
    } else if (h.kind === "ox") {
      let stop: Tile = [h.x, h.y];
      for (let k = 1; k <= CHARGE_RANGE; k++) {
        const x = h.x + dx * k;
        const y = h.y + dy * k;
        const t = unitAt(b, x, y);
        if (t) {
          if (t.side === "enemy") out.push({ kind: "charge", target: [x, y], dir, stop });
          break;
        }
        if (!free(b, x, y)) break;
        stop = [x, y];
      }
    }
  }
  return out;
}

export function moveHero(b0: Battle, id: string, x: number, y: number): Battle {
  const b = clone(b0);
  b.fx = [];
  const h = b.units.find((u) => u.id === id)!;
  h.x = x;
  h.y = y;
  h.moved = true;
  return b;
}

export function applyAction(b0: Battle, id: string, a: Action): Battle {
  const b = clone(b0);
  b.fx = [];
  const h = b.units.find((u) => u.id === id)!;
  const t = unitAt(b, a.target[0], a.target[1]);
  if (t) {
    if (a.kind === "shove") shove(b, t, a.dir);
    else if (a.kind === "swap") {
      [h.x, h.y, t.x, t.y] = [t.x, t.y, h.x, h.y];
    } else {
      [h.x, h.y] = a.stop!;
      hurt(b, t, 1);
      shove(b, t, a.dir);
    }
  }
  h.moved = true;
  h.acted = true;
  checkEnd(b);
  return b;
}

/** The tile an enemy's intent will land on, plus the path for a spit; null when it would hit nothing. */
export function intentTarget(b: Battle, e: Unit): { tile: Tile; path: Tile[] } | null {
  if (!e.intent || e.dead) return null;
  const [dx, dy] = e.intent;
  if (e.kind !== "spitter") return { tile: [e.x + dx, e.y + dy], path: [] };
  const path: Tile[] = [];
  for (let k = 1; k <= SPIT_RANGE; k++) {
    const x = e.x + dx * k;
    const y = e.y + dy * k;
    if (!inBounds(b, x, y)) return path.length ? { tile: path[path.length - 1]!, path } : null;
    path.push([x, y]);
    if (unitAt(b, x, y, e.id) || obstacleAt(b, x, y) || lanternAt(b, x, y)) return { tile: [x, y], path };
  }
  return { tile: path[path.length - 1]!, path };
}

function enemyStrike(b: Battle, e: Unit) {
  const hit = intentTarget(b, e);
  e.intent = null;
  if (!hit) return;
  const [x, y] = hit.tile;
  const t = unitAt(b, x, y, e.id);
  if (t) {
    hurt(b, t, 1);
    if (e.kind === "brute") shove(b, t, [x - e.x, y - e.y]);
  } else if (lanternAt(b, x, y)) hurtLantern(b, 1);
  else if (e.kind === "spitter" && obstacleAt(b, x, y)) addFx(b, "splat", x, y);
}

/** How much an enemy wants to attack direction `d` from tile (x, y); 0 means no worthwhile target. */
function attackValue(b: Battle, e: Unit, x: number, y: number, d: Dir): number {
  const ghost: Unit = { ...e, x, y, intent: d };
  const hit = intentTarget(b, ghost);
  if (!hit) return 0;
  const [tx, ty] = hit.tile;
  const t = unitAt(b, tx, ty, e.id);
  if (t?.side === "hero") {
    let v = 1;
    if (e.kind === "brute" && !isLand(b, tx + d[0], ty + d[1])) v += 1;
    if (e.kind === "spitter" && hit.path.length >= 2) v += 0.2;
    return v;
  }
  if (lanternAt(b, tx, ty)) return 1.3;
  return 0;
}

/** Steps from each tile to the nearest tile adjacent to a hero or the lantern, walking only free tiles. */
function approachMap(b: Battle, mover: Unit): Map<string, number> {
  const dist = new Map<string, number>();
  let frontier: Tile[] = [];
  const goals: Tile[] = [...alive(b, "hero").map((h) => [h.x, h.y] as Tile), ...(b.lantern && b.lantern.hp > 0 ? [[b.lantern.x, b.lantern.y] as Tile] : [])];
  for (const [gx, gy] of goals) {
    for (const [dx, dy] of DIRS) {
      const x = gx + dx;
      const y = gy + dy;
      if (free(b, x, y, mover.id) && !dist.has(cellKey(x, y))) {
        dist.set(cellKey(x, y), 0);
        frontier.push([x, y]);
      }
    }
  }
  for (let step = 1; frontier.length; step++) {
    const next: Tile[] = [];
    for (const [x, y] of frontier) {
      for (const [dx, dy] of DIRS) {
        const k = cellKey(x + dx, y + dy);
        if (dist.has(k) || !free(b, x + dx, y + dy, mover.id)) continue;
        dist.set(k, step);
        next.push([x + dx, y + dy]);
      }
    }
    frontier = next;
  }
  return dist;
}

/** Moves an enemy and picks its intent: the best attack it can reach, else the closest approach. */
function planEnemy(b: Battle, e: Unit) {
  const spots = [{ x: e.x, y: e.y, steps: 0 }];
  for (const [k, steps] of reachable(b, e)) {
    const [x, y] = k.split(",").map(Number) as [number, number];
    spots.push({ x, y, steps });
  }
  spots.sort((a, c) => a.steps - c.steps || a.y - c.y || a.x - c.x);

  let best: { x: number; y: number; d: Dir; score: number } | null = null;
  for (const s of spots) {
    for (const d of DIRS) {
      const v = attackValue(b, e, s.x, s.y, d);
      if (v <= 0) continue;
      const score = v * 10 - s.steps * 0.5;
      if (!best || score > best.score) best = { x: s.x, y: s.y, d, score };
    }
  }
  if (best) {
    e.x = best.x;
    e.y = best.y;
    e.intent = best.d;
    return;
  }
  const map = approachMap(b, e);
  let target = spots[0]!;
  let targetDist = map.get(cellKey(target.x, target.y)) ?? Infinity;
  for (const s of spots) {
    const d = map.get(cellKey(s.x, s.y)) ?? Infinity;
    if (d < targetDist) {
      target = s;
      targetDist = d;
    }
  }
  e.x = target.x;
  e.y = target.y;
  e.intent = null;
}

function planAll(b: Battle) {
  for (const e of alive(b, "enemy").sort((a, c) => a.id.localeCompare(c.id))) planEnemy(b, e);
}

/**
 * Runs the enemy phase and returns one frame per visible step: each enemy's strike, then everyone's
 * new positions and intents. The last frame is the start of the next player turn (or the end).
 */
export function enemyPhase(b0: Battle): Battle[] {
  const frames: Battle[] = [];
  let b = clone(b0);
  for (const id of alive(b, "enemy").sort((a, c) => a.id.localeCompare(c.id)).map((e) => e.id)) {
    const e = b.units.find((u) => u.id === id)!;
    if (e.dead || !e.intent) continue;
    b = clone(b);
    b.fx = [];
    enemyStrike(b, b.units.find((u) => u.id === id)!);
    checkEnd(b);
    frames.push(b);
    if (b.status !== "playing") return frames;
  }
  b = clone(b);
  b.fx = [];
  if (b.turn >= MAX_TURNS) {
    b.status = "lost";
    b.lostReason = "mist";
    frames.push(b);
    return frames;
  }
  planAll(b);
  b.turn += 1;
  for (const h of alive(b, "hero")) {
    h.moved = false;
    h.acted = false;
  }
  frames.push(b);
  return frames;
}

function connected(b: Battle, from: Tile, targets: Tile[]): boolean {
  const passable = (x: number, y: number) => isLand(b, x, y) && !obstacleAt(b, x, y) && !lanternAt(b, x, y);
  const seen = new Set([cellKey(from[0], from[1])]);
  const stack: Tile[] = [from];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of DIRS) {
      const k = cellKey(x + dx, y + dy);
      if (!seen.has(k) && passable(x + dx, y + dy)) {
        seen.add(k);
        stack.push([x + dx, y + dy]);
      }
    }
  }
  return targets.every(([x, y]) => seen.has(cellKey(x, y)) || DIRS.some(([dx, dy]) => seen.has(cellKey(x + dx, y + dy))));
}

function spreadPick(rng: Rng, pool: Tile[], count: number, minGap: number, taken: Tile[] = []): Tile[] | null {
  const out: Tile[] = [];
  for (const t of rng.shuffle(pool)) {
    if ([...out, ...taken].every(([x, y]) => Math.abs(x - t[0]) + Math.abs(y - t[1]) >= minGap)) out.push(t);
    if (out.length === count) return out;
  }
  return null;
}

/** Builds the day's plateau, heroes, ink spirits, obstacles, and sometimes a lantern. */
export function generateBattle(dateKey: string): Battle {
  const rng = makeRng(`brink:${dateKey}`);
  for (let attempt = 0; attempt < 400; attempt++) {
    const grid = Array.from({ length: SIZE }, () => Array<string>(SIZE).fill("#"));
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const edgeX = x === 0 || x === SIZE - 1;
        const edgeY = y === 0 || y === SIZE - 1;
        if ((edgeX && edgeY && rng.next() < 0.7) || ((edgeX || edgeY) && rng.next() < 0.3)) grid[y]![x] = ".";
      }
    }
    for (let h = 1 + rng.int(2); h > 0; h--) {
      const x = 2 + rng.int(4);
      const y = 2 + rng.int(4);
      grid[y]![x] = ".";
      if (rng.next() < 0.5) grid[y + (rng.next() < 0.5 ? 1 : 0)]![x + 1] = ".";
    }
    const layout = grid.map((r) => r.join(""));
    const b: Battle = {
      dateKey,
      cols: SIZE,
      rows: SIZE,
      layout,
      obstacles: [],
      units: [],
      lantern: null,
      turn: 1,
      wounds: 0,
      status: "playing",
      lostReason: null,
      fx: [],
      fxSeq: 0,
    };
    const land: Tile[] = [];
    layout.forEach((row, y) => [...row].forEach((ch, x) => ch === "#" && land.push([x, y])));
    if (land.length < 42) continue;
    const safe = (x: number, y: number) => DIRS.every(([dx, dy]) => isLand(b, x + dx, y + dy));

    const heroTiles = spreadPick(rng, land.filter(([x, y]) => y >= 5 && safe(x, y)), 3, 2);
    const enemyTiles = spreadPick(rng, land.filter(([, y]) => y <= 2), 4, 2);
    if (!heroTiles || !enemyTiles) continue;
    const taken = [...heroTiles, ...enemyTiles];

    if (rng.next() < 0.5) {
      const spot = spreadPick(rng, land.filter(([x, y]) => y >= 4 && y <= 6 && x >= 2 && x <= 5 && safe(x, y)), 1, 2, taken);
      if (spot) {
        b.lantern = { x: spot[0]![0], y: spot[0]![1], hp: 2, max: 2 };
        taken.push(spot[0]!);
      }
    }
    const obstacleTiles = spreadPick(rng, land.filter(([, y]) => y >= 2 && y <= 5), 2 + rng.int(3), 2, taken);
    if (!obstacleTiles) continue;
    b.obstacles = obstacleTiles.map(([x, y]) => ({ x, y, kind: rng.next() < 0.55 ? "pine" : "boulder" }));

    const heroKinds: HeroKind[] = rng.shuffle(["wanderer", "crane", "ox"]);
    const enemyKinds: EnemyKind[] = rng.shuffle(["blot", "spitter", rng.next() < 0.6 ? "brute" : "blot", rng.next() < 0.5 ? "spitter" : "blot"]);
    const make = (side: Unit["side"], kind: HeroKind | EnemyKind, [x, y]: Tile, i: number): Unit => ({
      id: `${side === "hero" ? "h" : "e"}${i}-${kind}`,
      side,
      kind,
      x,
      y,
      hp: STATS[kind].hp,
      max: STATS[kind].hp,
      moved: false,
      acted: false,
      intent: null,
      dead: null,
    });
    b.units = [...heroTiles.map((t, i) => make("hero", heroKinds[i]!, t, i)), ...enemyTiles.map((t, i) => make("enemy", enemyKinds[i]!, t, i))];
    if (!connected(b, heroTiles[0]!, [...heroTiles, ...enemyTiles, ...(b.lantern ? [[b.lantern.x, b.lantern.y] as Tile] : [])])) continue;

    planAll(b);
    return b;
  }
  throw new Error(`Brink: no battle generated for ${dateKey}`);
}

/** Orders results: a clear beats a loss, then fewer turns, then fewer wounds. */
export function describeResult(b: Battle): string {
  if (b.status === "won") return `cleared in ${b.turn} ${b.turn === 1 ? "turn" : "turns"}, ${b.wounds} ${b.wounds === 1 ? "wound" : "wounds"}`;
  if (b.lostReason === "lantern") return `lantern broken on turn ${b.turn}`;
  if (b.lostReason === "mist") {
    const left = alive(b, "enemy").length;
    return `${left} ${left === 1 ? "spirit" : "spirits"} left when the mist rolled in`;
  }
  return `all heroes fell on turn ${b.turn}`;
}
