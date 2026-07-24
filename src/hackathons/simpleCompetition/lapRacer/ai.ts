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

export interface Rival {
  name: string; color: Col;
  pos: number; prevPos: number; x: number; targetX: number;
  speed: number; lap: number; pace: number; cool: number;
}

const RIVAL_DEFS: { name: string; color: Col }[] = [
  { name: "VIPER", color: [240, 200, 52] },
  { name: "GHOST", color: [222, 228, 235] },
  { name: "FANG", color: [56, 205, 186] },
];

// grid: rivals line up staggered ahead of the player (you start P4 — go get them)
export function createRivals(trackLen: number, gridAhead: number): Rival[] {
  return RIVAL_DEFS.map((d, i) => {
    const pos = (gridAhead + (i + 1) * 430) % trackLen;
    const lane = [-0.35, 0.35, 0][i]!;
    return {
      name: d.name, color: d.color,
      pos, prevPos: pos, x: lane, targetX: lane,
      speed: 0, lap: 0, pace: 0.97 + i * 0.025, cool: 0,
    };
  });
}

// cornerMul is the dev-panel "ai corners" knob — scales corner limits only (straights
// stay capped by topMul), so rival corner pace is tunable without touching top speed
export function buildAllowedSpeeds(road: Segment[], segLen: number, diff: Difficulty, cornerMul = 1): number[] {
  const N = road.length;
  // hairpin (|c|=7) ≈ 105 km/h, sweeper (4.5) ≈ 219, kink (3) ≈ 272 on HARD — close to a
  // skilled player's pace, so corners are no longer free overtakes
  const allowed = road.map((s) =>
    Math.min(310 * diff.topMul, Math.max(80, (330 - 10 * Math.pow(Math.abs(s.curve), 1.6)) * diff.limitMul * cornerMul)));
  const gain = 1.55 * segLen; // (km/h)² recoverable per segment under braking (~65 km/h/s)
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
  for (const r of rivals) {
    if (r.cool > 0) r.cool -= dt;
    const seg = Math.floor(r.pos / segLen) % N;
    let vT = allowed[seg]! * r.pace * env.paceMul;
    // rubber band keeps the pack in the fight on lower difficulties (off on HARD)
    if (diff.rubber > 0) {
      const gapToPlayer = env.playerTotal - (r.lap * trackLen + r.pos);
      if (gapToPlayer > 4000) vT *= 1 + 0.14 * diff.rubber;
      else if (gapToPlayer < -4000) vT *= 1 - 0.11 * diff.rubber;
    }
    // racing line: hug the inside of whatever's coming
    const aheadCurve = road[Math.floor((r.pos + 2600) / segLen) % N]!.curve;
    let tx = clamp(aheadCurve * 0.1, -0.42, 0.42);
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
    const accel = Math.max(5, 42 - r.speed * 0.095) * diff.accelMul;
    if (vT > r.speed) r.speed = Math.min(vT, r.speed + accel * dt);
    else r.speed = Math.max(vT, r.speed - 64 * dt); // matches the braking map's decel
    r.targetX = tx;
    r.x += (r.targetX - r.x) * Math.min(1, dt * 1.6);
    r.prevPos = r.pos;
    r.pos += r.speed * posK * dt;
    if (r.pos >= trackLen) { r.pos -= trackLen; r.lap += 1; }
  }
}
