// the circuits: layout (a sequence of straights and curves forming a closed loop)
// plus a color theme per track.

import type { Col } from "./util";

export interface Segment { index: number; curve: number; }
export interface Theme { sky: [string, string, string]; ground: [string, string]; grass: [Col, Col]; fog: Col; tree: Col; }
export interface Track { id: string; name: string; tagline: string; traffic: number; theme: Theme; build: () => Segment[]; }

// A single-vanishing-point renderer can't bend more than ~7/seg without the road folding,
// so curve is clamped. Make turns TIGHTER by holding a curve LONGER, not by cranking it up.
// A hairpin = a HIGH curve held over FEW segments (tight U on the map, so much drift you
// must brake to ~2nd). A sweeper = a lower curve held LONG. Net turning must be one full
// right-hand rotation so the map traces a closed loop.
function makeRoad(lay: (addRoad: (enter: number, hold: number, leave: number, curve: number) => void) => void): Segment[] {
  const road: Segment[] = [];
  const push = (curve: number) => road.push({ index: road.length, curve: Math.max(-7, Math.min(7, curve)) });
  const easeIn = (a: number, b: number, p: number) => a + (b - a) * p * p;
  const easeOut = (a: number, b: number, p: number) => a + (b - a) * (1 - (1 - p) * (1 - p));
  lay((enter, hold, leave, curve) => {
    for (let i = 0; i < enter; i++) push(easeIn(0, curve, i / enter));
    for (let i = 0; i < hold; i++) push(curve);
    for (let i = 0; i < leave; i++) push(easeOut(curve, 0, i / leave));
  });
  return road;
}

export const TRACKS: Track[] = [
  {
    id: "laguna", name: "LAGUNA", tagline: "sunset classic", traffic: 9,
    theme: {
      sky: ["#4f9fc9", "#8fc6de", "#e9dcc0"], ground: ["#7f9150", "#5a6b39"],
      grass: [[106, 125, 63], [116, 137, 71]], fog: [233, 220, 192], tree: [46, 92, 50],
    },
    build: () => makeRoad((addRoad) => {
      addRoad(140, 220, 70, 0);  // main straight — bury it in 5th/6th
      addRoad(18, 80, 36, 18);   // T1 — TIGHT HAIRPIN right (brake HARD to 2nd)
      addRoad(70, 66, 70, 0);    // short chute out
      addRoad(36, 30, 36, -7);   // esse: flick left...
      addRoad(36, 30, 36, 7);    // ...snap back right (fast rhythm)
      addRoad(160, 270, 70, 0);  // back straight — longest, top speed
      addRoad(18, 84, 36, 19);   // T2 — HAIRPIN right, the big stop
      addRoad(60, 36, 60, 3);    // gentle right kink onto the infield
      addRoad(42, 36, 42, -5);   // quick left
      addRoad(66, 78, 78, 4.5);  // final flowing right onto the start/finish line
    }),
  },
  {
    id: "sidewinder", name: "SIDEWINDER", tagline: "desert hairpins", traffic: 7,
    theme: {
      sky: ["#d97a35", "#edac5c", "#f7e2ae"], ground: ["#c2a15f", "#8f7440"],
      grass: [[186, 152, 92], [174, 140, 82]], fog: [246, 224, 178], tree: [116, 124, 58],
    },
    build: () => makeRoad((addRoad) => {
      addRoad(96, 132, 60, 0);   // start straight
      addRoad(18, 90, 30, 20);   // T1 — hairpin right
      addRoad(42, 42, 42, 0);
      addRoad(24, 72, 30, -16);  // T2 — hairpin LEFT (the trap)
      addRoad(36, 36, 36, 0);
      addRoad(18, 90, 30, 20);   // T3 — hairpin right
      addRoad(66, 90, 54, 0);    // breather straight
      addRoad(30, 36, 30, 6);    // fast kink
      addRoad(24, 78, 30, 18);   // T4 — right
      addRoad(36, 48, 36, -6);   // left flick
      addRoad(30, 84, 48, 16);   // final right loops home
    }),
  },
  {
    id: "eldorado", name: "EL DORADO", tagline: "flat-out dusk", traffic: 10,
    theme: {
      sky: ["#33427c", "#8a63ab", "#eda0ac"], ground: ["#5d7250", "#3f5138"],
      grass: [[88, 108, 74], [97, 118, 81]], fog: [228, 196, 200], tree: [40, 78, 56],
    },
    build: () => makeRoad((addRoad) => {
      addRoad(210, 385, 105, 0); // monster front straight
      addRoad(72, 120, 72, 4);   // fast right sweeper — flat if you dare
      addRoad(90, 150, 72, 0);
      addRoad(48, 60, 48, -3.5); // fast left
      addRoad(140, 280, 105, 0); // back straight
      addRoad(24, 78, 36, 14);   // the ONE big stop — hairpin right
      addRoad(72, 90, 60, 0);
      addRoad(60, 108, 66, 5);   // long right back onto the front straight
    }),
  },
];

// trace a road into a closed loop of points fitted to a w×h box (dynamic heading scale so
// total curvature closes at exactly 360°) — used by the HUD minimap and track previews
export function tracePath(rd: Segment[], w: number, h: number, pad: number) {
  let sumCurve = 0;
  for (const s of rd) sumCurve += s.curve;
  const K = Math.abs(sumCurve) > 1e-6 ? (Math.PI * 2) / sumCurve : 0.001;
  const pts: { x: number; y: number }[] = [];
  let heading = 0, px = 0, py = 0;
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (const s of rd) {
    heading += s.curve * K;
    px += Math.sin(heading); py -= Math.cos(heading);
    pts.push({ x: px, y: py });
  }
  // the heading scale guarantees 360° of TURNING but not that the endpoint lands back on
  // the start — spread the leftover gap across the loop so the player dot never teleports
  // when crossing the finish line
  for (let i = 0; i < pts.length; i++) {
    const t = (i + 1) / pts.length;
    pts[i]!.x -= px * t; pts[i]!.y -= py * t;
    minX = Math.min(minX, pts[i]!.x); maxX = Math.max(maxX, pts[i]!.x);
    minY = Math.min(minY, pts[i]!.y); maxY = Math.max(maxY, pts[i]!.y);
  }
  const sc = Math.min((w - pad * 2) / Math.max(1, maxX - minX), (h - pad * 2) / Math.max(1, maxY - minY));
  const ox = (w - (maxX - minX) * sc) / 2 - minX * sc;
  const oy = (h - (maxY - minY) * sc) / 2 - minY * sc;
  return pts.map((p) => ({ x: ox + p.x * sc, y: oy + p.y * sc }));
}
