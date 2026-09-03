/**
 * Authoritative game server for the shooter, running inside the same Bun process that
 * serves the app (see src/index.ts). One global room.
 *
 * Clients send numbered commands ("for 33 ms I held W and aimed at 1.2 rad"), never
 * positions. The server drains each player's command queue every tick, applies them with
 * the shared `stepMove`, and reports back the last sequence it consumed. That ack is what
 * lets the client predict its own movement and then quietly correct itself.
 *
 * Pickups and powers live entirely on this side. That is deliberate: the client predicts
 * movement only, so nothing here can desync it — the worst case is that a power appears a
 * round trip after you stepped on the pad.
 */

import type { ServerWebSocket, Server } from "bun";
import {
  ARENA, BIG_DAMAGE, BIG_RADIUS, BIG_SPEED, BOUNCE_LIMIT, BOUNCE_TTL, BULLET_DAMAGE,
  BULLET_RADIUS, BULLET_SPEED, BULLET_TTL, CLIENT_TIMEOUT_MS, CMD_BUDGET_MAX_MS,
  CMD_QUEUE_MAX_MS, COLORS, FIRE_COOLDOWN, HEALTH_PACK, MAX_CMD_MS, MAX_HP, PADS,
  PAD_RADIUS, PLAYER_RADIUS, POWER_DURATION, POWERS, RESPAWN_DELAY, SPAWNS, SPREAD_ARC,
  SPREAD_SHOTS, TICK_MS, TICK_HZ, blocked, clamp, stepMove,
  type BulletState, type ClientMsg, type Cmd, type PlayerState, type Power, type ServerMsg,
} from "./protocol";

type SocketData = { id: string };
type Socket = ServerWebSocket<SocketData>;

type Player = PlayerState & {
  socket: Socket;
  queue: Cmd[];
  budgetMs: number;
  cooldown: number;
  respawnIn: number;
  lastSeen: number;
};

type Bullet = {
  id: number; owner: string;
  x: number; y: number; vx: number; vy: number;
  ttl: number; r: number; dmg: number;
  ghost: boolean; bounceLeft: number; bounced: number;
};

const players = new Map<string, Player>();
const bullets: Bullet[] = [];
/** Seconds until each pad is pickable again; 0 means it is sitting there now. */
const padCooldown = PADS.map(() => 0);
/** Who is currently standing on each pad. Pickups fire on ENTRY, never while parked. */
const padOccupants: Set<string>[] = PADS.map(() => new Set<string>());
let nextClientId = 1;
let nextBulletId = 1;
let tick = 0;

const send = (socket: Socket, msg: ServerMsg) => socket.send(JSON.stringify(msg));

function broadcast(msg: ServerMsg) {
  const payload = JSON.stringify(msg);
  for (const p of players.values()) p.socket.send(payload);
}

/** Pick the spawn point furthest from everyone alive, so you do not land on a rival. */
function pickSpawn() {
  let best = SPAWNS[0]!;
  let bestDist = -1;
  for (const s of SPAWNS) {
    let nearest = Infinity;
    for (const p of players.values()) {
      if (!p.alive) continue;
      nearest = Math.min(nearest, Math.hypot(p.x - s.x, p.y - s.y));
    }
    if (nearest > bestDist) {
      bestDist = nearest;
      best = s;
    }
  }
  return best;
}

function respawn(p: Player) {
  const spot = pickSpawn();
  p.x = spot.x;
  p.y = spot.y;
  p.hp = MAX_HP;
  p.alive = true;
  p.cooldown = 0;
  p.pw = {};
}

// ---- weapons ---------------------------------------------------------------------------

function spawnBullet(p: Player, angle: number) {
  const big = !!p.pw.big;
  const ghost = !!p.pw.ghost;
  const bounce = !!p.pw.bounce;
  const r = big ? BIG_RADIUS : BULLET_RADIUS;
  const speed = big ? BIG_SPEED : BULLET_SPEED;

  bullets.push({
    id: nextBulletId++,
    owner: p.id,
    x: p.x + Math.cos(angle) * (PLAYER_RADIUS + r + 2),
    y: p.y + Math.sin(angle) * (PLAYER_RADIUS + r + 2),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    // Ricochets get a longer fuse, or they expire before the shot pays off.
    ttl: bounce && !ghost ? BOUNCE_TTL : BULLET_TTL,
    r,
    dmg: big ? BIG_DAMAGE : BULLET_DAMAGE,
    ghost,
    // Phase beats ricochet: a bullet that ignores walls has nothing to bounce off.
    bounceLeft: bounce && !ghost ? BOUNCE_LIMIT : 0,
    bounced: 0,
  });
}

function fire(p: Player) {
  if (p.pw.spread) {
    const edge = (SPREAD_ARC * (SPREAD_SHOTS - 1)) / 2;
    for (let i = 0; i < SPREAD_SHOTS; i++) spawnBullet(p, p.aim - edge + SPREAD_ARC * i);
  } else {
    spawnBullet(p, p.aim);
  }
  p.cooldown = FIRE_COOLDOWN;
}

// ---- commands --------------------------------------------------------------------------

/**
 * Spend this tick's budget on whatever commands have arrived. Leftovers stay queued for
 * next tick, which is what absorbs a burst after a jitter spike.
 *
 * A client that sends sim time faster than real time can never outrun the budget, but if
 * we only throttled it the backlog would grow forever and it would end up playing minutes
 * in the past. So a backlog past CMD_QUEUE_MAX_MS is acked and dropped before the budget
 * is spent: the flood is discarded, the RECENT input is what gets simulated, and the
 * client can still drain its pending list. Honest clients never reach the threshold.
 */
function drainCommands(p: Player) {
  p.budgetMs = Math.min(p.budgetMs + TICK_MS, CMD_BUDGET_MAX_MS);

  let queued = 0;
  for (const c of p.queue) queued += c.dtMs;
  while (queued > CMD_QUEUE_MAX_MS + p.budgetMs && p.queue.length > 0) {
    const stale = p.queue.shift()!;
    queued -= stale.dtMs;
    p.seq = stale.seq;
    p.aim = stale.aim;
  }

  while (p.queue.length > 0) {
    const c = p.queue[0]!;
    if (c.dtMs > p.budgetMs) break;
    p.queue.shift();
    p.budgetMs -= c.dtMs;
    p.seq = c.seq;
    p.aim = c.aim;

    // A dead player's commands are still acked, or the client would never drain its
    // pending list and would keep re-predicting a corpse.
    if (!p.alive) continue;

    stepMove(p, c);
    p.cooldown = Math.max(0, p.cooldown - c.dtMs / 1000);
    if (c.fire && p.cooldown === 0) fire(p);
  }
}

// ---- pickups ---------------------------------------------------------------------------

/**
 * Pads trigger on ENTRY, not on overlap. Without that rule, parking on a pad hands you
 * the pickup again the instant its timer expires — permanent spread for whoever squats
 * on it. Now you have to leave the radius and come back.
 */
function stepPickups(dt: number) {
  for (let i = 0; i < PADS.length; i++) {
    const pad = PADS[i]!;
    const standing = padOccupants[i]!;
    if (padCooldown[i]! > 0) padCooldown[i] = Math.max(0, padCooldown[i]! - dt);

    for (const p of players.values()) {
      const inside = p.alive && Math.hypot(p.x - pad.x, p.y - pad.y) <= PLAYER_RADIUS + PAD_RADIUS;
      if (!inside) {
        standing.delete(p.id);
        continue;
      }
      if (standing.has(p.id)) continue;
      standing.add(p.id);
      if (padCooldown[i]! > 0) continue;

      if (pad.kind === "health") {
        // Walking over a full-health pad leaves it for someone who needs it.
        if (p.hp >= MAX_HP) continue;
        p.hp = Math.min(MAX_HP, p.hp + HEALTH_PACK);
      } else {
        // Re-grabbing refreshes the full duration rather than stacking it.
        p.pw[pad.kind] = POWER_DURATION;
      }
      padCooldown[i] = pad.respawn;
      broadcast({ t: "pickup", who: p.name, kind: pad.kind });
    }
  }
}

function stepPowers(p: Player, dt: number) {
  for (const power of POWERS) {
    const left = p.pw[power];
    if (left === undefined) continue;
    const next = left - dt;
    if (next <= 0) delete p.pw[power];
    else p.pw[power] = next;
  }
}

// ---- bullets ---------------------------------------------------------------------------

/** Returns false when the bullet is spent. Axis-separated so ricochets pick the right normal. */
function moveBullet(b: Bullet, dt: number) {
  const nx = b.x + b.vx * dt;
  const ny = b.y + b.vy * dt;

  if (b.ghost) {
    b.x = nx;
    b.y = ny;
  } else if (b.bounceLeft > 0) {
    let hit = false;
    if (blocked(nx, b.y, b.r)) { b.vx = -b.vx; hit = true; } else b.x = nx;
    if (blocked(b.x, ny, b.r)) { b.vy = -b.vy; hit = true; } else b.y = ny;

    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); hit = true; }
    else if (b.x > ARENA.w - b.r) { b.x = ARENA.w - b.r; b.vx = -Math.abs(b.vx); hit = true; }
    if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); hit = true; }
    else if (b.y > ARENA.h - b.r) { b.y = ARENA.h - b.r; b.vy = -Math.abs(b.vy); hit = true; }

    if (hit) {
      b.bounced++;
      b.bounceLeft--;
    }
    return true;
  } else {
    b.x = nx;
    b.y = ny;
    if (blocked(b.x, b.y, b.r)) return false;
  }

  return b.x >= 0 && b.x <= ARENA.w && b.y >= 0 && b.y <= ARENA.h;
}

function stepBullets(dt: number) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]!;
    b.ttl -= dt;

    let dead = b.ttl <= 0 || !moveBullet(b, dt);
    // A spent ricochet dies on the wall it can no longer bounce off.
    if (!dead && !b.ghost && b.bounceLeft === 0 && b.bounced > 0 && blocked(b.x, b.y, b.r)) dead = true;

    if (!dead) {
      for (const victim of players.values()) {
        if (!victim.alive) continue;
        // Your own ricochet can come back and kill you, but only after it has bounced.
        if (victim.id === b.owner && b.bounced === 0) continue;
        if (Math.hypot(victim.x - b.x, victim.y - b.y) > PLAYER_RADIUS + b.r) continue;

        dead = true;
        victim.hp -= b.dmg;
        if (victim.hp <= 0) {
          victim.hp = 0;
          victim.alive = false;
          victim.deaths++;
          victim.respawnIn = RESPAWN_DELAY;
          const killer = players.get(b.owner);
          if (killer && killer.id !== victim.id) killer.score++;
          broadcast({
            t: "kill",
            killer: killer && killer.id !== victim.id ? killer.name : "a ricochet",
            victim: victim.name,
          });
        }
        break;
      }
    }

    if (dead) bullets.splice(i, 1);
  }
}

// ---- tick ------------------------------------------------------------------------------

function step() {
  const dt = TICK_MS / 1000;
  const now = Date.now();
  tick++;

  for (const p of players.values()) {
    if (now - p.lastSeen > CLIENT_TIMEOUT_MS) {
      p.socket.close();
      continue;
    }
    if (!p.alive) {
      p.respawnIn -= dt;
      if (p.respawnIn <= 0) respawn(p);
    } else {
      stepPowers(p, dt);
    }
    drainCommands(p);
  }

  stepPickups(dt);
  stepBullets(dt);

  const snapshotPlayers: PlayerState[] = [];
  for (const p of players.values()) {
    const pw: Partial<Record<Power, number>> = {};
    for (const power of POWERS) {
      const left = p.pw[power];
      if (left !== undefined) pw[power] = Math.round(left * 10) / 10;
    }
    // Positions go out at full precision on purpose: rounding here would show up as a
    // permanent prediction error on the client and defeat the point of the readout.
    snapshotPlayers.push({
      id: p.id, name: p.name, color: p.color, alive: p.alive,
      x: p.x, y: p.y, aim: Math.round(p.aim * 1000) / 1000,
      hp: p.hp, score: p.score, deaths: p.deaths, seq: p.seq, pw,
    });
  }
  const snapshotBullets: BulletState[] = bullets.map((b) => ({
    id: b.id, owner: b.owner,
    x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10,
    r: b.r, ghost: b.ghost, bounce: b.bounceLeft > 0,
  }));
  const pads: number[] = [];
  for (let i = 0; i < PADS.length; i++) if (padCooldown[i] === 0) pads.push(i);

  broadcast({ t: "state", tick, players: snapshotPlayers, bullets: snapshotBullets, pads });
}

/**
 * Fixed timestep on an accumulator, polled at twice the tick rate.
 *
 * Do not simplify this to `setInterval(step, TICK_MS)`. Timers drift under load — a busy
 * process fires a 50 ms interval every 55 ms — and since the command budget refills
 * TICK_MS per tick, the server would then hand out sim time slower than clients generate
 * it. Their queues creep up until the backlog trim starts discarding honest commands,
 * which the player sees as a rubber-band every few seconds. Driving ticks from the wall
 * clock instead keeps input supply and demand matched.
 */
let acc = 0;
let lastTick = Date.now();
function loop() {
  const now = Date.now();
  // Cap the catch-up so a long stall replays a few ticks, never a spiral.
  acc = Math.min(acc + (now - lastTick), TICK_MS * 5);
  lastTick = now;
  while (acc >= TICK_MS) {
    acc -= TICK_MS;
    step();
  }
}

// `bun --hot` re-evaluates this module on save; without the guard the old interval keeps
// running and the sim ticks at a multiple of 20 Hz.
const hot = globalThis as unknown as { __shooterLoop?: ReturnType<typeof setInterval> };
if (hot.__shooterLoop) clearInterval(hot.__shooterLoop);
lastTick = Date.now();
hot.__shooterLoop = setInterval(loop, Math.floor(TICK_MS / 2));

export function shooterUpgrade(req: Request, server: Server): Response | undefined {
  const ok = server.upgrade(req, { data: { id: `p${nextClientId++}` } satisfies SocketData });
  return ok ? undefined : new Response("Expected a WebSocket upgrade", { status: 426 });
}

export const shooterWebSocket = {
  open(socket: Socket) {
    const spot = pickSpawn();
    players.set(socket.data.id, {
      id: socket.data.id,
      name: socket.data.id,
      color: COLORS[(nextClientId - 2) % COLORS.length]!,
      x: spot.x, y: spot.y, aim: 0,
      hp: MAX_HP, score: 0, deaths: 0, alive: true, seq: 0, pw: {},
      socket, queue: [], budgetMs: CMD_BUDGET_MAX_MS,
      cooldown: 0, respawnIn: 0, lastSeen: Date.now(),
    });
    send(socket, { t: "welcome", id: socket.data.id, tickHz: TICK_HZ });
    console.log(`[shooter] ${socket.data.id} joined (${players.size} online)`);
  },

  message(socket: Socket, raw: string | Buffer) {
    const p = players.get(socket.data.id);
    if (!p) return;
    p.lastSeen = Date.now();

    let msg: ClientMsg;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : raw.toString());
    } catch {
      return;
    }

    if (msg.t === "cmd") {
      if (!Array.isArray(msg.cs)) return;
      // Packets carry the last few unacked commands, so duplicates are the normal case.
      const highest = p.queue.length > 0 ? p.queue[p.queue.length - 1]!.seq : p.seq;
      for (const c of msg.cs) {
        if (!c || typeof c.seq !== "number" || c.seq <= highest) continue;
        if (p.queue.length > 120) break;
        p.queue.push({
          seq: c.seq,
          dtMs: clamp(Math.round(c.dtMs) || 0, 1, MAX_CMD_MS),
          up: !!c.up, down: !!c.down, left: !!c.left, right: !!c.right, fire: !!c.fire,
          aim: Number.isFinite(c.aim) ? c.aim : p.aim,
        });
      }
    } else if (msg.t === "join") {
      p.name = String(msg.name ?? "").slice(0, 14) || p.id;
    } else if (msg.t === "ping") {
      send(socket, { t: "pong", ts: msg.ts });
    }
  },

  close(socket: Socket) {
    players.delete(socket.data.id);
    for (const standing of padOccupants) standing.delete(socket.data.id);
    console.log(`[shooter] ${socket.data.id} left (${players.size} online)`);
  },
};
