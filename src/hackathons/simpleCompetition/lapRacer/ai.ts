// rival racers. The core idea: precompute, per track segment, the fastest speed a rival
// may carry there — corner limits spread backward up the road at realistic braking rates
// (v² = u² + C·d), exactly the braking zones the player has to judge by eye. Per frame
// each rival just chases allowed[segment], hugs the racing line, and dodges slower cars.

import type { Segment } from "./tracks";
import { clamp, type Col } from "./util";

export interface Difficulty { id: string; name: string; topMul: number; limitMul: number; accelMul: number; rubber: number; }
export const DIFFS: Difficulty[] = [
  { id: "easy", name: "EASY", topMul: 0.74, limitMul: 0.85, accelMul: 0.72, rubber: 1 },
  { id: "med", name: "MED", topMul: 0.88, limitMul: 0.93, accelMul: 0.88, rubber: 0.45 },
  { id: "hard", name: "HARD", topMul: 1.0, limitMul: 1.0, accelMul: 1.0, rubber: 0 },
];

// driving personality — learn who's dangerous where by their color:
//   top: straight-line speed mult · corner: corner-speed mult ·
//   brakeLook: segments of anticipation (high = brakes EARLY, 0 = brakes at the limit) ·
//   wide: racing-line width mult (how far out-in-out they swing)
export interface RivalTraits { top: number; corner: number; brakeLook: number; wide: number; }

export interface Rival {
  name: string; color: Col; traits: RivalTraits;
  pos: number; prevPos: number; x: number; targetX: number;
  gridX: number; dist: number; // grid lane held early-race + distance covered so far
  speed: number; lap: number; pace: number; cool: number;
}

const RIVAL_DEFS: { name: string; color: Col; traits: RivalTraits }[] = [
  // the yellow missile: eats you alive on straights, soft in the twisties
  { name: "VIPER", color: [240, 200, 52], traits: { top: 1.06, corner: 0.93, brakeLook: 2, wide: 0.75 } },
  // the silver surgeon: on the brakes a touch early, then murders the apex
  // (brakeLook stays SMALL — the map is already brake-aware, so big lookahead
  // double-brakes every zone and they crawl into corners)
  { name: "GHOST", color: [222, 228, 235], traits: { top: 0.96, corner: 1.07, brakeLook: 7, wide: 1.0 } },
  // the teal drifter: huge wide lines and brakes at the very last moment
  { name: "FANG", color: [56, 205, 186], traits: { top: 1.0, corner: 1.0, brakeLook: 0, wide: 1.7 } },
];

// grid: rivals line up staggered ahead of the player, alternating LEFT/RIGHT columns —
// the CENTER stays clear so a perfect launch threads the grid instead of ramming it
export function createRivals(trackLen: number, gridAhead: number): Rival[] {
  return RIVAL_DEFS.map((d, i) => {
    const pos = (gridAhead + (i + 1) * 430) % trackLen;
    const lane = [-0.4, 0.4, -0.4][i]!;
    return {
      name: d.name, color: d.color, traits: d.traits,
      pos, prevPos: pos, x: lane, targetX: lane, gridX: lane, dist: 0,
      speed: 0, lap: 0, pace: 0.985 + i * 0.01, cool: 0,
    };
  });
}

// cornerMul is the dev-panel "ai corners" knob — scales corner limits only (straights
// stay capped by topMul), so rival corner pace is tunable without touching top speed
// base AI top speed — deliberately UNDER the player's ~285 km/h drag-limited terminal,
// so a clean player can out-drag even HARD (the salt flats must be winnable); corners
// are where the AI keeps its pace instead
export const AI_TOP = 280;

export function buildAllowedSpeeds(road: Segment[], segLen: number, diff: Difficulty, cornerMul = 1): number[] {
  const N = road.length;
  // the ×1.4 is Bryce's play-tested corner pace, baked in so cornerMul=1 IS that pace
  // (winnable on HARD with a near-clean race). hairpin (|c|=7) ≈ 192 km/h, sweeper
  // (4.5) ≈ 327→top-capped on HARD — corners are where the AI is STRONG (their
  // straights sit under the player's terminal), so the player's game is out-dragging
  // them and defending through the twisties
  const allowed = road.map((s) =>
    Math.min(AI_TOP * diff.topMul, Math.max(92, (330 - 8.6 * Math.pow(Math.abs(s.curve), 1.6)) * 1.4 * diff.limitMul * cornerMul)));
  const gain = 1.7 * segLen; // (km/h)² recoverable per segment under braking (~71 km/h/s — they brake LATE)
  for (let pass = 0; pass < 2; pass++) // two passes so zones wrap the start/finish line
    for (let i = N - 1; i >= 0; i--) {
      const next = allowed[(i + 1) % N]!;
      allowed[i] = Math.min(allowed[i]!, Math.sqrt(next * next + gain));
    }
  return allowed;
}

export interface Hazard { pos: number; x: number; speed: number; }
export interface RivalEnv {
  road: Segment[]; segLen: number; trackLen: number; posK: number;
  allowed: number[]; diff: Difficulty; paceMul: number;
  playerTotal: number; hazards: Hazard[];
}

export function updateRivals(rivals: Rival[], dt: number, env: RivalEnv) {
  const { road, segLen, trackLen, posK, allowed, diff, hazards } = env;
  const N = road.length;
  const wrap = (d: number) => { let g = ((d % trackLen) + trackLen) % trackLen; if (g > trackLen / 2) g -= trackLen; return g; };
  const topSpeed = AI_TOP;
  for (const r of rivals) {
    if (r.cool > 0) r.cool -= dt;
    const seg = Math.floor(r.pos / segLen) % N;
    const tr = r.traits;
    // early brakers anticipate the map (min with a segment ahead); late brakers ride it
    let lim = Math.min(allowed[seg]!, allowed[(seg + tr.brakeLook) % N]!);
    // trait applies by regime: near top speed = straight-line trait, else corner trait.
    // Even the missile is capped a hair over the player's ~285 terminal — a perfect
    // launch + shifts + NOS must always be able to win the drag race.
    lim *= lim >= topSpeed * diff.topMul * 0.92 ? tr.top : tr.corner;
    lim = Math.min(lim, 288 * diff.topMul);
    let vT = lim * r.pace * env.paceMul;
    // rubber band keeps the pack in the fight on lower difficulties (off on HARD)
    if (diff.rubber > 0) {
      const gapToPlayer = env.playerTotal - (r.lap * trackLen + r.pos);
      if (gapToPlayer > 4000) vT *= 1 + 0.14 * diff.rubber;
      else if (gapToPlayer < -4000) vT *= 1 - 0.11 * diff.rubber;
    }
    // racing line, out-in-out: the LOCAL curvature pulls toward the apex right now,
    // while curvature SMOOTHED over a window (reaching behind and well ahead) pushes
    // wide — the phase difference between the two sweeps entry-wide → apex → exit-wide
    // for free, so rivals visibly drive corners instead of railing the inside
    const segIdx = Math.floor(r.pos / segLen);
    const kLocal = road[segIdx % N]!.curve;
    let kSmooth = 0, wsum = 0;
    for (let d = -24; d <= 48; d += 4) {
      const w = 1 - Math.abs(d - 12) / 40;
      if (w <= 0) continue;
      kSmooth += road[(((segIdx + d) % N) + N) % N]!.curve * w;
      wsum += w;
    }
    kSmooth /= wsum;
    // `wide` trait scales how far the out-in-out sweep swings
    let tx = clamp(kLocal * 0.17 - kSmooth * 0.11 * tr.wide, -0.45, 0.45);
    // a touch of wobble so the pack doesn't run single-file
    tx += Math.sin(r.pos * 0.0005 + r.pace * 90) * 0.05;
    // nearest slower car ahead that overlaps my line
    let blocker: Hazard | null = null, blockerDist = Infinity;
    for (const h of hazards) {
      const d = wrap(h.pos - r.pos);
      if (d < 90 || d > 2400) continue; // (d<90 also skips self)
      if (Math.abs(h.x - r.x) > 0.44 && Math.abs(h.x - tx) > 0.44) continue;
      if (h.speed >= r.speed - 2) continue;
      if (d < blockerDist) { blockerDist = d; blocker = h; }
    }
    if (blocker) {
      // swing to whichever side of the blocker is free; if boxed in, match their pace
      const side = blocker.x >= 0 ? -1 : 1;
      const dodge = clamp(blocker.x + side * 0.78, -0.5, 0.5);
      const bl = blocker;
      // the -600 lower bound: never dodge into a lane someone (esp. the player) is
      // closing in from behind — a rival swerving across your nose reads as a cheap shot
      const dodgeBlocked = hazards.some((h) => {
        if (h === bl) return false;
        const d = wrap(h.pos - r.pos);
        return d > -600 && d < 1800 && Math.abs(h.x - dodge) < 0.4 && h.speed < r.speed + 12;
      });
      if (!dodgeBlocked) tx = dodge;
      else if (blockerDist < 1100) vT = Math.min(vT, bl.speed * 0.98);
    }
    // off the line, hold the grid lane and only blend onto the racing line over the
    // first ~8000 units — no instant funnel to the center right where the player's
    // perfect launch is threading the grid
    const settle = Math.min(1, r.dist / 8000);
    tx = r.gridX + (tx - r.gridX) * settle;
    const accel = Math.max(5, 42 - r.speed * 0.095) * diff.accelMul;
    if (vT > r.speed) r.speed = Math.min(vT, r.speed + accel * dt);
    else r.speed = Math.max(vT, r.speed - 70 * dt); // matches the braking map's decel
    r.targetX = tx;
    r.x += (r.targetX - r.x) * Math.min(1, dt * 1.6);
    r.prevPos = r.pos;
    const move = r.speed * posK * dt;
    r.pos += move;
    r.dist += move;
    if (r.pos >= trackLen) { r.pos -= trackLen; r.lap += 1; }
  }
}
