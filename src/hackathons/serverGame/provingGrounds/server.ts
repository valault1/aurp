/**
 * PROVING GROUNDS — authoritative server. Registered as "arena" (/ws/arena).
 *
 * Five minutes farming monster camps for levels and loot, then the walls come down and
 * you fight whoever else is here with exactly what you earned. Nothing persists.
 *
 * The client sends ORDERS, not positions and not per-frame input: "walk here", "attack
 * that", "cast slot 0 at this point". Everything else is decided on this side. Because a
 * point-and-click character visibly walks, none of it needs prediction — the walk simply
 * starts a round trip late and no one can see it.
 */

import { registerGame, type GameSocket } from "../net/router";
import {
  ARENA, CAMPS, CLASSES, CLASS_LIST, DEFLECT, DUEL_SECONDS, FARM_SECONDS, ITEMS, duelPost,
  MOBS, ORDER_MIN_MS, PLAYER_RADIUS, REGEN_DELAY, REGEN_RATE, RESPAWN_SECONDS,
  RESULT_SECONDS, SPAWNS, TICK_HZ,
  blocked, clamp, damageOf, statsFor, xpToNext,
  type ClassId, type ClientMsg, type DropState, type Fx, type FxKind, type ItemId,
  type MobKind, type MobState, type Phase, type PlayerState, type ServerMsg,
  type ShotKind, type ShotState,
} from "./protocol";

/** Phase lengths, overridable so the state machine is testable in seconds, not minutes. */
const FARM_LEN = Number(process.env.ARENA_FARM_SECONDS ?? FARM_SECONDS);
const DUEL_LEN = Number(process.env.ARENA_DUEL_SECONDS ?? DUEL_SECONDS);
const RESULT_LEN = Number(process.env.ARENA_RESULT_SECONDS ?? RESULT_SECONDS);

type Player = PlayerState & {
  socket: GameSocket;
  order: { x: number; y: number } | null;
  targetId: string | null;
  atkCd: number;
  slowLeft: number;
  lastOrderAt: number;
  lastSeen: number;
  lastHurt: number;
};

type Mob = MobState & {
  campId: number;
  homeX: number; homeY: number;
  targetId: string | null;
  atkCd: number;
  dmg: number; speed: number; range: number; cd: number; aggro: number; leash: number;
  xp: number; r: number; drop: number; shot: ShotKind | null;
};

type Shot = {
  id: number; kind: ShotKind; x: number; y: number; vx: number; vy: number; facing: number;
  ttl: number; r: number; dmg: number; owner: string; hostile: boolean;
  pierce: boolean; hit: Set<string>; slowPct: number; slowSecs: number;
};

type Drop = DropState;

const players = new Map<string, Player>();
const mobs = new Map<string, Mob>();
const shots: Shot[] = [];
const drops: Drop[] = [];
const campTimer = CAMPS.map(() => 0);
let fx: Fx[] = [];

let phase: Phase = "lobby";
let clock = 0;
let tick = 0;
let nextId = 1;
let winner = "";

const emptyItems = (): Record<ItemId, number> => ({ power: 0, vigor: 0, swift: 0 });

const send = (socket: GameSocket, msg: ServerMsg) => socket.send(JSON.stringify(msg));

function broadcast(msg: ServerMsg) {
  const payload = JSON.stringify(msg);
  for (const p of players.values()) p.socket.send(payload);
}

const log = (line: string) => broadcast({ t: "log", line });

function addFx(k: FxKind, x: number, y: number, v = 0, a = 0) {
  // Bound the burst: a spread of damage numbers in one tick is fine, a flood is not.
  if (fx.length < 40) fx.push({ id: nextId++, k, x: Math.round(x), y: Math.round(y), v, a });
}

// ---- geometry ------------------------------------------------------------------------------

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

/**
 * Steer toward a point, sidestepping rocks. No pathfinding — the map is deliberately open
 * — but plain axis-separated sliding is NOT enough here. That works for WASD because the
 * player keeps changing direction themselves; a click-to-move unit holds one heading, so a
 * rock square dead ahead blocks the x step, leaves the y step at zero, and the unit parks
 * against the face forever. Trying progressively wider deflections walks it around.
 */
function walkToward(u: { x: number; y: number; facing: number }, tx: number, ty: number, speed: number, r: number, dt: number) {
  const dx = tx - u.x;
  const dy = ty - u.y;
  const d = Math.hypot(dx, dy);
  if (d < 1.5) return true;

  const base = Math.atan2(dy, dx);
  u.facing = base;
  const step = Math.min(speed * dt, d);

  for (const off of DEFLECT) {
    const a = base + off;
    const nx = clamp(u.x + Math.cos(a) * step, r, ARENA.w - r);
    const ny = clamp(u.y + Math.sin(a) * step, r, ARENA.h - r);
    if (blocked(nx, ny, r) || (nx === u.x && ny === u.y)) continue;
    u.x = nx;
    u.y = ny;
    return false;
  }
  return false;
}

function openSpot(x: number, y: number, r: number) {
  if (!blocked(x, y, r)) return { x, y };
  for (let ring = 12; ring <= 96; ring += 12) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const px = clamp(x + Math.cos(a) * ring, r, ARENA.w - r);
      const py = clamp(y + Math.sin(a) * ring, r, ARENA.h - r);
      if (!blocked(px, py, r)) return { x: px, y: py };
    }
  }
  return { x, y };
}

// ---- players --------------------------------------------------------------------------------

function classOf(p: Player) {
  return p.cls ? CLASSES[p.cls] : null;
}

function recomputeStats(p: Player, heal = 0) {
  const cls = classOf(p);
  if (!cls) return;
  const s = statsFor(cls, p.level, p.items);
  p.maxHp = Math.round(s.maxHp);
  p.speed = Math.round(s.speed);
  p.dmg = damageOf(cls.weapon.dmg, p.level, p.items);
  if (heal > 0) p.hp = Math.min(p.maxHp, p.hp + heal);
  p.hp = Math.min(p.hp, p.maxHp);
}

function spawnPlayer(p: Player, index: number) {
  const spot = SPAWNS[index % SPAWNS.length]!;
  const open = openSpot(spot.x, spot.y, PLAYER_RADIUS);
  p.x = open.x;
  p.y = open.y;
  p.alive = true;
  p.hp = p.maxHp;
  p.order = null;
  p.targetId = null;
  p.slowLeft = 0;
  p.respawnIn = 0;
}

function grantXp(p: Player, amount: number) {
  p.xp += amount;
  addFx("xp", p.x, p.y - 30, amount);
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = xpToNext(p.level);
    recomputeStats(p, 0);
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.25));
    addFx("level", p.x, p.y, p.level);
    log(`${p.name} reached level ${p.level}`);
  }
}

// ---- damage ----------------------------------------------------------------------------------

function hurtMob(m: Mob, amount: number, byId: string) {
  m.hp -= amount;
  addFx("dmg", m.x, m.y - m.r - 6, amount);
  if (m.hp > 0) {
    if (!m.targetId) m.targetId = byId;
    return;
  }
  addFx("die", m.x, m.y, 0);
  const killer = players.get(byId);
  if (killer) {
    grantXp(killer, m.xp);
    if (Math.random() < m.drop) {
      const item = (["power", "vigor", "swift"] as ItemId[])[Math.floor(Math.random() * 3)]!;
      drops.push({ id: nextId++, x: m.x, y: m.y, item });
    }
  }
  mobs.delete(m.id);
}

function hurtPlayer(p: Player, amount: number, byId: string) {
  if (!p.alive) return;
  p.hp -= amount;
  p.lastHurt = Date.now();
  addFx("dmg", p.x, p.y - PLAYER_RADIUS - 8, amount);
  if (p.hp > 0) return;

  p.hp = 0;
  p.alive = false;
  p.deaths++;
  p.targetId = null;
  p.order = null;
  addFx("die", p.x, p.y, 0);

  const killer = players.get(byId);
  if (killer && killer.id !== p.id) killer.kills++;

  if (phase === "duel") {
    log(`${p.name} was defeated by ${killer?.name ?? "the arena"}`);
  } else {
    p.respawnIn = RESPAWN_SECONDS;
    log(`${p.name} was killed by ${killer ? killer.name : "a monster"}`);
  }
}

/** Player attacks land on monsters always, and on other players only once the duel starts. */
function playerCanHit(other: Player, ownerId: string) {
  return phase === "duel" && other.id !== ownerId && other.alive;
}

// ---- shots -------------------------------------------------------------------------------------

function addShot(o: Omit<Shot, "id" | "hit" | "facing">) {
  shots.push({ ...o, id: nextId++, facing: Math.atan2(o.vy, o.vx), hit: new Set<string>() });
}

function stepShots(dt: number) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]!;
    s.ttl -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    let done =
      s.ttl <= 0 || s.x < 0 || s.x > ARENA.w || s.y < 0 || s.y > ARENA.h ||
      blocked(s.x, s.y, s.r);

    if (!done) {
      if (s.hostile) {
        for (const p of players.values()) {
          if (!p.alive || s.hit.has(p.id)) continue;
          if (dist(p.x, p.y, s.x, s.y) > PLAYER_RADIUS + s.r) continue;
          s.hit.add(p.id);
          hurtPlayer(p, s.dmg, s.owner);
          if (!s.pierce) { done = true; break; }
        }
      } else {
        for (const m of mobs.values()) {
          if (s.hit.has(m.id)) continue;
          if (dist(m.x, m.y, s.x, s.y) > m.r + s.r) continue;
          s.hit.add(m.id);
          if (s.slowSecs > 0) m.speed = MOBS[m.kind].speed * (1 - s.slowPct);
          hurtMob(m, s.dmg, s.owner);
          if (!s.pierce) { done = true; break; }
        }
        if (!done) {
          for (const p of players.values()) {
            if (!playerCanHit(p, s.owner) || s.hit.has(p.id)) continue;
            if (dist(p.x, p.y, s.x, s.y) > PLAYER_RADIUS + s.r) continue;
            s.hit.add(p.id);
            if (s.slowSecs > 0) p.slowLeft = Math.max(p.slowLeft, s.slowSecs);
            hurtPlayer(p, s.dmg, s.owner);
            if (!s.pierce) { done = true; break; }
          }
        }
      }
    }

    if (done) shots.splice(i, 1);
  }
}

// ---- abilities -----------------------------------------------------------------------------------

function castAbility(p: Player, slot: number, tx: number, ty: number) {
  const cls = classOf(p);
  if (!cls || !p.alive) return;
  const ability = cls.abilities[slot];
  if (!ability) return;
  if ((p.cds[slot] ?? 0) > 0) return;

  const angle = Math.atan2(ty - p.y, tx - p.x);
  p.facing = angle;
  p.cds[slot] = ability.cd;
  const dmg = damageOf(ability.dmg, p.level, p.items);

  if (ability.kind === "bolt") {
    addShot({
      kind: "frost", x: p.x + Math.cos(angle) * 22, y: p.y + Math.sin(angle) * 22,
      vx: Math.cos(angle) * ability.speed, vy: Math.sin(angle) * ability.speed,
      ttl: ability.range / ability.speed, r: ability.r, dmg, owner: p.id, hostile: false,
      pierce: false, slowPct: ability.slowPct, slowSecs: ability.slowSecs,
    });
  } else if (ability.kind === "pierce") {
    addShot({
      kind: "pierce", x: p.x + Math.cos(angle) * 22, y: p.y + Math.sin(angle) * 22,
      vx: Math.cos(angle) * ability.speed, vy: Math.sin(angle) * ability.speed,
      ttl: ability.range / ability.speed, r: ability.r, dmg, owner: p.id, hostile: false,
      pierce: true, slowPct: 0, slowSecs: 0,
    });
  } else {
    addFx("smash", p.x, p.y, ability.range, angle);
    const half = ability.arc / 2;
    for (const m of [...mobs.values()]) {
      if (dist(m.x, m.y, p.x, p.y) > ability.range + m.r) continue;
      let d = Math.atan2(m.y - p.y, m.x - p.x) - angle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) <= half) hurtMob(m, dmg, p.id);
    }
    for (const other of [...players.values()]) {
      if (!playerCanHit(other, p.id)) continue;
      if (dist(other.x, other.y, p.x, p.y) > ability.range + PLAYER_RADIUS) continue;
      let d = Math.atan2(other.y - p.y, other.x - p.x) - angle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) <= half) hurtPlayer(other, dmg, p.id);
    }
  }
}

function autoAttack(p: Player, targetX: number, targetY: number, onHit: () => void) {
  const cls = classOf(p)!;
  p.facing = Math.atan2(targetY - p.y, targetX - p.x);
  p.atkCd = cls.weapon.cd;

  if (cls.weapon.shot === null) {
    addFx("swing", p.x, p.y, cls.weapon.range, p.facing);
    onHit();
    return;
  }
  const speed = cls.weapon.shot === "arrow" ? 700 : 520;
  addShot({
    kind: cls.weapon.shot, x: p.x + Math.cos(p.facing) * 20, y: p.y + Math.sin(p.facing) * 20,
    vx: Math.cos(p.facing) * speed, vy: Math.sin(p.facing) * speed,
    ttl: (cls.weapon.range + 40) / speed, r: 6, dmg: p.dmg, owner: p.id, hostile: false,
    pierce: false, slowPct: 0, slowSecs: 0,
  });
}

// ---- per-unit ticks -----------------------------------------------------------------------------

function stepPlayer(p: Player, dt: number) {
  const cls = classOf(p);
  if (!cls) return;

  for (let i = 0; i < p.cds.length; i++) p.cds[i] = Math.max(0, (p.cds[i] ?? 0) - dt);
  p.atkCd = Math.max(0, p.atkCd - dt);
  p.slowLeft = Math.max(0, p.slowLeft - dt);

  if (!p.alive) {
    if (phase !== "farm") return;
    p.respawnIn -= dt;
    if (p.respawnIn <= 0) {
      const index = [...players.keys()].indexOf(p.id);
      spawnPlayer(p, index < 0 ? 0 : index);
      log(`${p.name} is back on their feet`);
    }
    return;
  }

  // Out-of-combat regen, farm phase only. In a duel it would just reward disengaging.
  if (phase === "farm" && p.hp < p.maxHp && Date.now() - p.lastHurt > REGEN_DELAY * 1000) {
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * REGEN_RATE * dt);
  }

  const speed = p.slowLeft > 0 ? p.speed * 0.55 : p.speed;

  // A target order beats a move order: walk into range, then keep swinging.
  const mob = p.targetId ? mobs.get(p.targetId) : undefined;
  const foe = p.targetId ? players.get(p.targetId) : undefined;
  const target = mob ?? (foe && playerCanHit(foe, p.id) ? foe : undefined);

  if (p.targetId && !target) p.targetId = null;

  if (target) {
    const tr = mob ? mob.r : PLAYER_RADIUS;
    const reach = cls.weapon.range + tr;
    if (dist(p.x, p.y, target.x, target.y) <= reach) {
      p.facing = Math.atan2(target.y - p.y, target.x - p.x);
      if (p.atkCd === 0) {
        autoAttack(p, target.x, target.y, () => {
          if (mob) hurtMob(mob, p.dmg, p.id);
          else if (foe) hurtPlayer(foe, p.dmg, p.id);
        });
      }
    } else {
      walkToward(p, target.x, target.y, speed, PLAYER_RADIUS, dt);
    }
  } else if (p.order) {
    if (walkToward(p, p.order.x, p.order.y, speed, PLAYER_RADIUS, dt)) p.order = null;
  }

  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]!;
    if (dist(p.x, p.y, d.x, d.y) > PLAYER_RADIUS + 14) continue;
    p.items[d.item]++;
    recomputeStats(p, d.item === "vigor" ? 18 : 0);
    addFx("pick", d.x, d.y, 0);
    log(`${p.name} picked up ${ITEMS[d.item].name}`);
    drops.splice(i, 1);
  }
}

function stepMob(m: Mob, dt: number) {
  m.atkCd = Math.max(0, m.atkCd - dt);
  // Frost wears off by simply restoring the base speed once nothing is refreshing it.
  m.speed += (MOBS[m.kind].speed - m.speed) * Math.min(1, dt * 0.7);

  let target = m.targetId ? players.get(m.targetId) : undefined;
  if (target && (!target.alive || dist(m.homeX, m.homeY, m.x, m.y) > m.leash)) target = undefined;

  if (!target) {
    m.targetId = null;
    let best: Player | undefined;
    let bestD = m.aggro;
    for (const p of players.values()) {
      if (!p.alive) continue;
      const d = dist(m.x, m.y, p.x, p.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best && dist(m.homeX, m.homeY, best.x, best.y) < m.leash) {
      m.targetId = best.id;
      target = best;
    }
  }

  if (!target) {
    if (dist(m.x, m.y, m.homeX, m.homeY) > 6) walkToward(m, m.homeX, m.homeY, m.speed, m.r, dt);
    else if (m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.12 * dt);
    return;
  }

  const reach = m.range + PLAYER_RADIUS;
  if (dist(m.x, m.y, target.x, target.y) > reach) {
    walkToward(m, target.x, target.y, m.speed, m.r, dt);
    return;
  }

  m.facing = Math.atan2(target.y - m.y, target.x - m.x);
  if (m.atkCd > 0) return;
  m.atkCd = m.cd;

  if (m.shot === null) {
    addFx("swing", m.x, m.y, m.range, m.facing);
    hurtPlayer(target, m.dmg, m.id);
  } else {
    addShot({
      kind: m.shot, x: m.x + Math.cos(m.facing) * 16, y: m.y + Math.sin(m.facing) * 16,
      vx: Math.cos(m.facing) * 420, vy: Math.sin(m.facing) * 420,
      ttl: (m.range + 40) / 420, r: 7, dmg: m.dmg, owner: m.id, hostile: true,
      pierce: false, slowPct: 0, slowSecs: 0,
    });
  }
}

// ---- camps ---------------------------------------------------------------------------------------

function spawnCamp(index: number) {
  const camp = CAMPS[index]!;
  camp.spawn.forEach((kind: MobKind, i: number) => {
    const def = MOBS[kind];
    const a = (i / camp.spawn.length) * Math.PI * 2;
    const spot = openSpot(camp.x + Math.cos(a) * 34, camp.y + Math.sin(a) * 34, def.r);
    const id = `m${nextId++}`;
    mobs.set(id, {
      id, kind, x: spot.x, y: spot.y, hp: def.hp, maxHp: def.hp, facing: 0,
      campId: index, homeX: spot.x, homeY: spot.y, targetId: null, atkCd: 0,
      dmg: def.dmg, speed: def.speed, range: def.range, cd: def.cd, aggro: def.aggro,
      leash: def.leash, xp: def.xp, r: def.r, drop: def.drop, shot: def.shot,
    });
  });
}

function stepCamps(dt: number) {
  for (let i = 0; i < CAMPS.length; i++) {
    const alive = [...mobs.values()].some((m) => m.campId === i);
    if (alive) continue;
    campTimer[i] = (campTimer[i] ?? 0) - dt;
    if (campTimer[i]! <= 0) {
      spawnCamp(i);
      campTimer[i] = CAMPS[i]!.respawn;
    }
  }
}

// ---- phases ----------------------------------------------------------------------------------------

function resetWorld() {
  mobs.clear();
  shots.length = 0;
  drops.length = 0;
  for (let i = 0; i < campTimer.length; i++) campTimer[i] = 0;
}

function startFarm() {
  resetWorld();
  phase = "farm";
  clock = FARM_LEN;
  winner = "";
  let i = 0;
  for (const p of players.values()) {
    p.level = 1;
    p.xp = 0;
    p.xpNext = xpToNext(1);
    p.items = emptyItems();
    p.kills = 0;
    p.deaths = 0;
    p.cds = classOf(p)?.abilities.map(() => 0) ?? [];
    recomputeStats(p);
    p.hp = p.maxHp;
    spawnPlayer(p, i++);
  }
  for (let c = 0; c < CAMPS.length; c++) spawnCamp(c);
  log(`The grounds are open. ${FARM_LEN >= 60 ? `${Math.round(FARM_LEN / 60)} minutes` : `${Math.round(FARM_LEN)} seconds`} until the duel.`);
}

function startDuel() {
  mobs.clear();
  shots.length = 0;
  drops.length = 0;
  phase = "duel";
  clock = DUEL_LEN;

  const fighters = [...players.values()].filter((p) => p.cls);
  fighters.forEach((p, i) => {
    const post = duelPost(i, fighters.length);
    const open = openSpot(post.x, post.y, PLAYER_RADIUS);
    p.x = open.x;
    p.y = open.y;
    p.alive = true;
    p.hp = p.maxHp;
    p.order = null;
    p.targetId = null;
    p.slowLeft = 0;
    p.cds = p.cds.map(() => 0);
  });
  log(fighters.length >= 2 ? "Duel! Everything you earned is what you have." : "No opponent — a walkover.");
}

function endRound(reason: string) {
  phase = "result";
  clock = RESULT_LEN;
  shots.length = 0;
  const standing = [...players.values()].filter((p) => p.cls && p.alive);
  if (standing.length === 1) winner = standing[0]!.name;
  else if (standing.length > 1) {
    const best = standing.sort((a, b) => b.level - a.level || b.hp / b.maxHp - a.hp / a.maxHp)[0]!;
    winner = best.name;
  } else winner = "nobody";
  log(`${winner} takes it — ${reason}`);
}

function backToLobby() {
  resetWorld();
  phase = "lobby";
  clock = 0;
  winner = "";
  for (const p of players.values()) {
    p.cls = null;
    p.ready = false;
    p.level = 1;
    p.xp = 0;
    p.xpNext = xpToNext(1);
    p.items = emptyItems();
    p.cds = [];
    p.alive = true;
    p.hp = 1;
    p.maxHp = 1;
  }
}

function stepPhase(dt: number) {
  if (phase === "lobby") {
    const roster = [...players.values()];
    const picked = roster.filter((p) => p.cls);
    if (picked.length > 0 && picked.length === roster.length && roster.every((p) => p.ready)) startFarm();
    return;
  }

  clock -= dt;

  if (phase === "farm") {
    if (clock <= 0) startDuel();
    return;
  }
  if (phase === "duel") {
    const fighters = [...players.values()].filter((p) => p.cls);
    const standing = fighters.filter((p) => p.alive);
    if (fighters.length >= 2 && standing.length <= 1) endRound("last one standing");
    else if (clock <= 0) endRound("time");
    return;
  }
  if (phase === "result" && clock <= 0) backToLobby();
}

// ---- tick -------------------------------------------------------------------------------------------

function step(dt: number) {
  tick++;
  const now = Date.now();

  for (const p of players.values()) {
    if (now - p.lastSeen > 20_000) p.socket.close();
  }

  stepPhase(dt);

  if (phase === "farm" || phase === "duel") {
    for (const p of players.values()) stepPlayer(p, dt);
    if (phase === "farm") {
      stepCamps(dt);
      for (const m of [...mobs.values()]) stepMob(m, dt);
    }
    stepShots(dt);
  }

  const snapPlayers: PlayerState[] = [...players.values()].map((p) => ({
    id: p.id, name: p.name, cls: p.cls, ready: p.ready,
    x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10,
    facing: Math.round(p.facing * 100) / 100,
    hp: Math.round(p.hp), maxHp: p.maxHp, level: p.level, xp: Math.round(p.xp), xpNext: p.xpNext,
    alive: p.alive, respawnIn: Math.round(p.respawnIn * 10) / 10, slowed: p.slowLeft > 0,
    cds: p.cds.map((c) => Math.round(c * 10) / 10), items: { ...p.items },
    dmg: p.dmg, speed: p.speed, kills: p.kills, deaths: p.deaths,
  }));

  const snapMobs: MobState[] = [...mobs.values()].map((m) => ({
    id: m.id, kind: m.kind,
    x: Math.round(m.x * 10) / 10, y: Math.round(m.y * 10) / 10,
    hp: Math.round(m.hp), maxHp: m.maxHp, facing: Math.round(m.facing * 100) / 100,
  }));

  const snapShots: ShotState[] = shots.map((s) => ({
    id: s.id, kind: s.kind,
    x: Math.round(s.x * 10) / 10, y: Math.round(s.y * 10) / 10,
    facing: Math.round(s.facing * 100) / 100, hostile: s.hostile,
  }));

  broadcast({
    t: "state", tick, phase, clock: Math.max(0, Math.round(clock * 10) / 10),
    players: snapPlayers, mobs: snapMobs, shots: snapShots, drops: [...drops], fx,
  });
  fx = [];
}

// ---- socket plumbing -----------------------------------------------------------------------------------

export const winnerName = () => winner;

const arena = {
  name: "arena",
  tick: step,

  open(socket: GameSocket) {
    const id = socket.data.id;
    players.set(id, {
      id, name: id, cls: null, ready: false,
      x: SPAWNS[0]!.x, y: SPAWNS[0]!.y, facing: 0,
      hp: 1, maxHp: 1, level: 1, xp: 0, xpNext: xpToNext(1),
      alive: true, respawnIn: 0, slowed: false,
      cds: [], items: emptyItems(), dmg: 0, speed: 0, kills: 0, deaths: 0,
      socket, order: null, targetId: null, atkCd: 0, slowLeft: 0,
      lastOrderAt: 0, lastSeen: Date.now(), lastHurt: 0,
    });
    send(socket, { t: "welcome", id, tickHz: TICK_HZ });
    console.log(`[arena] ${id} joined (${players.size} online)`);
  },

  message(socket: GameSocket, raw: string | Buffer) {
    const p = players.get(socket.data.id);
    if (!p) return;
    p.lastSeen = Date.now();

    let msg: ClientMsg;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : raw.toString());
    } catch {
      return;
    }

    if (msg.t === "ping") return send(socket, { t: "pong", ts: msg.ts });

    if (msg.t === "join") {
      p.name = String(msg.name ?? "").slice(0, 14) || p.id;
      return;
    }

    if (msg.t === "pick") {
      if (phase !== "lobby" && p.cls) return;
      if (!CLASS_LIST.includes(msg.cls as ClassId)) return;
      p.cls = msg.cls as ClassId;
      p.cds = CLASSES[p.cls].abilities.map(() => 0);
      recomputeStats(p);
      p.hp = p.maxHp;
      // Joining mid-round drops you straight in rather than making you wait it out.
      if (phase === "farm") spawnPlayer(p, players.size - 1);
      return;
    }

    if (msg.t === "ready") {
      p.ready = !!msg.on && !!p.cls;
      return;
    }

    if (phase !== "farm" && phase !== "duel") return;

    // Casts skip the move throttle deliberately. They are already gated by ability
    // cooldowns, which is a far stronger limit, and sharing the throttle means a Q pressed
    // in the same breath as a click gets silently swallowed — which is exactly how this
    // game is played.
    if (msg.t === "cast") {
      if (!Number.isFinite(msg.x) || !Number.isFinite(msg.y)) return;
      castAbility(p, Number(msg.slot) | 0, msg.x, msg.y);
      return;
    }

    const now = Date.now();
    if (now - p.lastOrderAt < ORDER_MIN_MS) return;
    p.lastOrderAt = now;

    if (msg.t === "move") {
      if (!Number.isFinite(msg.x) || !Number.isFinite(msg.y)) return;
      p.targetId = null;
      p.order = {
        x: clamp(msg.x, PLAYER_RADIUS, ARENA.w - PLAYER_RADIUS),
        y: clamp(msg.y, PLAYER_RADIUS, ARENA.h - PLAYER_RADIUS),
      };
    } else if (msg.t === "target") {
      const wanted = msg.id === null ? null : String(msg.id);
      if (wanted && !mobs.has(wanted) && !players.has(wanted)) return;
      if (wanted === p.id) return;
      p.targetId = wanted;
      p.order = null;
    }
  },

  close(socket: GameSocket) {
    players.delete(socket.data.id);
    for (const m of mobs.values()) if (m.targetId === socket.data.id) m.targetId = null;
    console.log(`[arena] ${socket.data.id} left (${players.size} online)`);
    if (players.size === 0 && phase !== "lobby") backToLobby();
  },
};

registerGame(arena);
