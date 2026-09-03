import { Room, type Client } from "colyseus";
import { Schema, MapSchema, defineTypes } from "@colyseus/schema";

// ---- Field / physics constants (client renders at the same size) ----
export const FIELD = {
  WIDTH: 800,
  HEIGHT: 600,
  BALL_RADIUS: 24,
  SPIKE_W: 44, // deadly strip on left and right edges
  BAT_LENGTH: 72,
};

const MOVE_ACCEL = 0.75; // velocity added per tick while a direction is held
const FRICTION = 0.92; // velocity retained each tick
const KNOCK = 24; // impulse applied to a bonked player (makes them fly)
const SWING_TICKS = 9; // how long a swing stays "active"
const SWING_COOLDOWN = 18; // ticks before you can swing again
const TICK_MS = 1000 / 60;

type Input = { up: boolean; down: boolean; left: boolean; right: boolean; swing: boolean };

// ---- Networked state ----
// IMPORTANT: networked fields are `declare` + assigned in the constructor, NOT
// class-field initializers. Under ESNext/useDefineForClassFields, `x = 0`
// initializers create own properties that shadow the accessors @colyseus/schema
// installs for change-tracking, so nothing serializes. (Verified: initializer
// style => decoded value lost; constructor style => value preserved.)
class Player extends Schema {
  declare x: number;
  declare y: number;
  declare facing: number; // radians; direction the bat points
  declare seat: number; // 0 or 1
  declare swinging: boolean;
  declare dead: boolean;
  declare ready: boolean; // has voted for a rematch on the gameover screen

  // server-only (plain properties, never serialized):
  vx = 0;
  vy = 0;
  swingTimer = 0;
  cooldown = 0;
  hitThisSwing = false;
  input: Input = { up: false, down: false, left: false, right: false, swing: false };

  constructor() {
    super();
    this.x = 0;
    this.y = 0;
    this.facing = 0;
    this.seat = 0;
    this.swinging = false;
    this.dead = false;
    this.ready = false;
  }
}
defineTypes(Player, {
  x: "number",
  y: "number",
  facing: "number",
  seat: "number",
  swinging: "boolean",
  dead: "boolean",
  ready: "boolean",
});

class BonkState extends Schema {
  declare status: string; // "waiting" | "playing" | "gameover"
  declare winner: string; // sessionId of the winner
  declare players: MapSchema<Player>;

  constructor() {
    super();
    this.status = "waiting";
    this.winner = "";
    this.players = new MapSchema<Player>();
  }
}
defineTypes(BonkState, {
  status: "string",
  winner: "string",
  players: { map: Player },
});

export class BonkRoom extends Room<BonkState> {
  maxClients = 2;
  private key = "";

  override onCreate(options: { key?: string }) {
    this.setState(new BonkState());
    this.key = (options?.key ?? "").trim().toLowerCase();
    this.setMetadata({ key: this.key });
    console.log(`[bonk] room CREATED  id=${this.roomId}  key="${this.key}"`);

    this.onMessage("input", (client, data: Input) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.input = {
        up: !!data.up,
        down: !!data.down,
        left: !!data.left,
        right: !!data.right,
        swing: !!data.swing,
      };
    });

    // Both players have to ask for a rematch before the next round starts, so
    // nobody gets yanked off the scoreboard before they've read it.
    this.onMessage("rematch", (client) => {
      if (this.state.status !== "gameover") return;
      const p = this.state.players.get(client.sessionId);
      if (!p || p.ready) return;
      p.ready = true;
      const all = [...this.state.players.values()];
      console.log(
        `[bonk] REMATCH      id=${this.roomId}  key="${this.key}"  session=${client.sessionId}  ready=${all.filter((q) => q.ready).length}/${all.length}`
      );
      if (all.length >= 2 && all.every((q) => q.ready)) this.startMatch();
    });

    this.setSimulationInterval(() => this.update(), TICK_MS);
  }

  /** Puts a player on their seat's mark, facing the middle. */
  private placeAtSpawn(p: Player) {
    p.y = FIELD.HEIGHT / 2;
    if (p.seat === 0) {
      p.x = FIELD.WIDTH * 0.32;
      p.facing = 0; // faces right, toward opponent
    } else {
      p.x = FIELD.WIDTH * 0.68;
      p.facing = Math.PI; // faces left, toward opponent
    }
  }

  /**
   * Resets both players and flips the room to "playing". Runs for the opening
   * round and for every rematch, so a round always starts from a clean slate:
   * alive, still, unarmed, and back on their marks.
   */
  private startMatch() {
    for (const p of this.state.players.values()) {
      this.placeAtSpawn(p);
      p.dead = false;
      p.swinging = false;
      p.ready = false;
      p.vx = 0;
      p.vy = 0;
      p.swingTimer = 0;
      p.cooldown = 0;
      p.hitThisSwing = false;
      p.input = { up: false, down: false, left: false, right: false, swing: false };
    }
    this.state.winner = "";
    this.state.status = "playing";
    this.lock(); // no more joiners for this keyphrase room
    console.log(`[bonk] STARTED      id=${this.roomId}  key="${this.key}"`);
  }

  override onJoin(client: Client) {
    // Take whichever seat is free rather than counting players: after someone
    // leaves and a new player takes their place, size alone can hand out a
    // duplicate seat and stack both balls on the same side.
    const taken = new Set([...this.state.players.values()].map((q) => q.seat));
    const seat = taken.has(0) ? 1 : 0;
    const p = new Player();
    p.seat = seat;
    this.placeAtSpawn(p);
    this.state.players.set(client.sessionId, p);
    console.log(
      `[bonk] JOIN         id=${this.roomId}  key="${this.key}"  seat=${seat}  session=${client.sessionId}  players=${this.state.players.size}`
    );

    if (this.state.players.size >= 2) this.startMatch();
  }

  override onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    console.log(
      `[bonk] LEAVE        id=${this.roomId}  key="${this.key}"  session=${client.sessionId}  players=${this.state.players.size}`
    );
    if (this.state.status === "playing") {
      const remaining = [...this.state.players.keys()][0];
      if (remaining) {
        this.state.winner = remaining;
        this.state.status = "gameover";
      }
    }

    // A rematch needs two players. Drop any stale vote and reopen the room so
    // someone can take the empty seat with the same keyphrase.
    if (this.state.players.size < 2) {
      for (const p of this.state.players.values()) p.ready = false;
      this.unlock();
    }
  }

  override onDispose() {
    console.log(`[bonk] room DISPOSED id=${this.roomId}  key="${this.key}"`);
  }

  private update() {
    if (this.state.status !== "playing") return;

    const players = [...this.state.players.entries()];

    // 1) Movement + swing timers
    for (const [, p] of players) {
      if (p.dead) continue;

      let ix = 0;
      let iy = 0;
      if (p.input.left) ix -= 1;
      if (p.input.right) ix += 1;
      if (p.input.up) iy -= 1;
      if (p.input.down) iy += 1;

      if (ix !== 0 || iy !== 0) {
        const len = Math.hypot(ix, iy) || 1;
        p.vx += (ix / len) * MOVE_ACCEL;
        p.vy += (iy / len) * MOVE_ACCEL;
        p.facing = Math.atan2(iy, ix); // bat points where you last moved
      }

      p.vx *= FRICTION;
      p.vy *= FRICTION;
      p.x += p.vx;
      p.y += p.vy;

      // top / bottom are solid walls
      if (p.y < FIELD.BALL_RADIUS) {
        p.y = FIELD.BALL_RADIUS;
        p.vy = Math.abs(p.vy) * 0.5;
      }
      if (p.y > FIELD.HEIGHT - FIELD.BALL_RADIUS) {
        p.y = FIELD.HEIGHT - FIELD.BALL_RADIUS;
        p.vy = -Math.abs(p.vy) * 0.5;
      }

      // swing lifecycle
      if (p.cooldown > 0) p.cooldown -= 1;
      if (p.swingTimer > 0) {
        p.swingTimer -= 1;
        p.swinging = true;
        if (p.swingTimer === 0) p.hitThisSwing = false;
      } else {
        p.swinging = false;
        if (p.input.swing && p.cooldown === 0) {
          p.swingTimer = SWING_TICKS;
          p.cooldown = SWING_COOLDOWN;
          p.hitThisSwing = false;
          p.swinging = true;
        }
      }
    }

    // 2) Bat hits (a swinging player can bonk the other)
    for (const [, attacker] of players) {
      if (attacker.dead || !attacker.swinging || attacker.hitThisSwing) continue;
      for (const [, target] of players) {
        if (target === attacker || target.dead) continue;
        const dx = target.x - attacker.x;
        const dy = target.y - attacker.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const reach = FIELD.BAT_LENGTH + FIELD.BALL_RADIUS;
        const fx = Math.cos(attacker.facing);
        const fy = Math.sin(attacker.facing);
        const facingDot = (dx / dist) * fx + (dy / dist) * fy;
        if (dist <= reach && facingDot > 0.25) {
          target.vx += fx * KNOCK;
          target.vy += fy * KNOCK;
          attacker.hitThisSwing = true;
          break;
        }
      }
    }

    // 3) Spikes on the left and right edges = death
    for (const [sessionId, p] of players) {
      if (p.dead) continue;
      if (p.x <= FIELD.SPIKE_W + FIELD.BALL_RADIUS || p.x >= FIELD.WIDTH - FIELD.SPIKE_W - FIELD.BALL_RADIUS) {
        p.dead = true;
        const other = players.find(([id]) => id !== sessionId);
        this.state.winner = other ? other[0] : "";
        this.state.status = "gameover";
      }
    }
  }
}
