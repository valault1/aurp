import { useEffect, useRef } from "react";

/**
 * APEX — a fastest-lap arcade racer (Bryce's "simple competition" entry).
 *
 * Pole Position / OutRun-style pseudo-3D: a curved circuit projected toward a sunset
 * horizon, sprite car at the bottom, radial tach. Driving is "arcade + real shifting":
 * gears, RPM, torque curve, redline fuel-cut — but NO clutch or stalling. RPM is derived
 * from speed x gear; grab a gear and go. Tuned faster-than-real for an arcade feel.
 *
 * One imperative canvas + rAF loop in a single useEffect; React owns structure. The fast
 * HUD is written straight to the DOM via data-el refs. All styles scoped under `.lap`.
 *
 * WIN CONDITION: fastest single flying lap. Best lap + per-segment splits persist to
 * localStorage; a live delta shows green (ahead of best) / red (behind).
 *
 * Two tuning surfaces for Thursday iteration:
 *   - TUNING (below): feel — speed, steering, camera, off-road, corner push.
 *   - buildTrack(): the level design — the sequence of straights and curves (a closed
 *     circuit). Keep the turns net one direction so the minimap reads as a loop.
 */

// ------------------------------------------------------------------ tuning
const TUNING = {
  SEG_LEN: 200, // world units per road segment
  ROAD_WIDTH: 2000, // half-width of the road (|playerX|>1 = off road)
  RUMBLE_GROUP: 4, // segments per color stripe
  CAMERA_HEIGHT: 1000,
  CAMERA_DEPTH: 0.84, // ~100deg field of view
  DRAW_DISTANCE: 240,
  FOG_DENSITY: 4,
  POS_K: 84, // km/h -> world units/sec (bigger = faster sense of speed)
  STEER: 3.8, // lateral responsiveness
  STEER_SLIDE: 7, // how fast steering eases in (lower = looser / slidey-er)
  CENTRIFUGAL: 0.45, // how HARD a corner throws you outward — do nothing and you fly off
  OFFROAD_MAX_KMH: 45, // top speed on the grass — fly off and you crawl (dangerous!)
  OFFROAD_DECEL: 9000, // heavy drag that rips speed away the instant you leave the road
  TRAFFIC: 5, // number of slow cars on the circuit to dodge
};

// ------------------------------------------------------------------ car (single, arcade-fast)
interface Car {
  id: string; name: string;
  idle: number; redline: number; revLimit: number; mechMax: number;
  maxTq: number; tqPeak: number; tqWidth: number;
  final: number; wheelR: number; mass: number; roll: number; aero: number;
  brakeMax: number; grip: number; gears: number; ratios: Record<number, number>;
  shift: number;
}

const CAR: Car = {
  id: "apex", name: "MX-5 APEX",
  idle: 900, redline: 7600, revLimit: 8000, mechMax: 10200,
  maxTq: 300, tqPeak: 4400, tqWidth: 6400,
  final: 3.5, wheelR: 0.30, mass: 1040, roll: 145, aero: 0.34, brakeMax: 13500, grip: 12500, gears: 6,
  ratios: { 1: 3.1, 2: 2.15, 3: 1.62, 4: 1.28, 5: 1.0, 6: 0.80 }, shift: 7100, // taller gearing → ~200 mph
};
const SOUND = { base: 30, pitch: 0.03, cutoff: 560, cutoffPerRpm: 0.36, sub: 0.2, whistle: 0.22, noise: 0.18 };

const FONT_LABEL = '"Helvetica Neue","Segoe UI",system-ui,-apple-system,sans-serif';
const fmtTime = (s: number) => {
  if (!Number.isFinite(s)) return "--:--.---";
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(3).padStart(6, "0")}`;
};

// ------------------------------------------------------------------ track (a closed circuit)
interface Segment { index: number; curve: number; }
function buildTrack(): Segment[] {
  const road: Segment[] = [];
  // A single-vanishing-point renderer can't bend more than ~7/seg without the road folding,
  // so clamp here. Make turns TIGHTER by holding a curve LONGER, not by cranking this up.
  const push = (curve: number) => road.push({ index: road.length, curve: Math.max(-7, Math.min(7, curve)) });
  const easeIn = (a: number, b: number, p: number) => a + (b - a) * p * p;
  const easeOut = (a: number, b: number, p: number) => a + (b - a) * (1 - (1 - p) * (1 - p));
  const addRoad = (enter: number, hold: number, leave: number, curve: number) => {
    for (let i = 0; i < enter; i++) push(easeIn(0, curve, i / enter));
    for (let i = 0; i < hold; i++) push(curve);
    for (let i = 0; i < leave; i++) push(easeOut(curve, 0, i / leave));
  };
  // --- the lap (edit me!). Net turning is right so it closes into a loop.
  // A hairpin = a HIGH curve held over FEW segments (small radius → tight ~180° U on
  // the map, and centrifugal so strong you must brake to ~2nd). A sweeper = a lower
  // curve held LONG. Straights are curve 0 to build top speed between the stops. ---
  addRoad(46, 74, 24, 0);      // main straight — bury it in 5th/6th
  addRoad(6, 26, 12, 18);      // T1 — TIGHT HAIRPIN right (~150°, brake HARD to 2nd)
  addRoad(24, 22, 24, 0);      // short chute out
  addRoad(12, 10, 12, -7);     // esse: flick left...
  addRoad(12, 10, 12, 7);      // ...snap back right (fast rhythm)
  addRoad(54, 90, 24, 0);      // back straight — longest, top speed
  addRoad(6, 28, 12, 19);      // T2 — HAIRPIN right (~165°, the big overtaking stop)
  addRoad(20, 12, 20, 3);      // gentle right kink onto the infield
  addRoad(14, 12, 14, -5);     // quick left
  addRoad(22, 26, 26, 4.5);    // final flowing right onto the start/finish line
  return road;
}

// ------------------------------------------------------------------ state
interface GameState {
  phase: "start" | "countdown" | "racing";
  rpm: number; speed: number; gear: number;
  gas: number; brake: number; throttle: number;
  position: number; playerX: number; steerVel: number;
  lap: number; lapTime: number; lastLap: number; bestLap: number;
  fuelCut: boolean;
}

export function BryceLapRacer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const roadRef = useRef<HTMLCanvasElement>(null);
  const tachRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const roadCanvas = roadRef.current;
    const tachCanvas = tachRef.current;
    const mapCanvas = mapRef.current;
    if (!root || !roadCanvas || !tachCanvas || !mapCanvas) return;

    const T = TUNING;
    const car = CAR;
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const road = buildTrack();
    const N = road.length;
    const trackLen = N * T.SEG_LEN;
    const ratio = (g: number) => car.ratios[g] ?? 0;

    // roadside trees (deterministic clusters) — scenery so off-road feels alive.
    // Only beside straighter segments: on a sharp curve a roadside tree projects over the
    // road at the vanishing point (can't be occluded there), so we just skip those.
    const treesBySeg = new Map<number, number[]>();
    for (let i = 0; i < N; i++) {
      const h = (i * 2654435761) >>> 0; // cheap stable hash → same trees every run
      if (h % 14 < 2 && Math.abs(road[i]!.curve) < 2) {
        const side = h & 8 ? 1 : -1;
        const off = side * (2.6 + ((h >> 4) % 100) / 100 * 2.6); // 2.6..5.2 — well clear of the road
        const list = treesBySeg.get(i) ?? [];
        list.push(off);
        treesBySeg.set(i, list);
      }
    }

    // a little slow traffic to dodge / bump
    interface Traffic { pos: number; x: number; speed: number; color: [number, number, number]; cool: number; }
    const TRAFFIC_COLORS: [number, number, number][] = [[63, 127, 214], [224, 165, 58], [122, 82, 201], [74, 169, 108], [217, 79, 106]];
    let traffic: Traffic[] = [];
    let treeCool = 0;
    function initTraffic() {
      traffic = [];
      for (let i = 0; i < T.TRAFFIC; i++) {
        traffic.push({
          pos: (trackLen * (i + 0.5)) / T.TRAFFIC,
          x: (i % 2 === 0 ? -1 : 1) * 0.42,
          speed: 68 + (i % 3) * 12,
          color: TRAFFIC_COLORS[i % TRAFFIC_COLORS.length]!,
          cool: 0,
        });
      }
    }
    initTraffic();
    function updateTraffic(dt: number) {
      for (const t of traffic) {
        t.pos = (t.pos + t.speed * T.POS_K * dt) % trackLen;
        if (t.cool > 0) t.cool -= dt;
        let gap = t.pos - S.position;
        gap = ((gap % trackLen) + trackLen) % trackLen;
        if (gap > trackLen / 2) gap -= trackLen;
        if (Math.abs(gap) < 320 && Math.abs(t.x - S.playerX) < 0.72 && t.cool <= 0) {
          S.speed *= 0.42; // bump = you lose your drive
          const dir = Math.sign(S.playerX - t.x) || 1;
          S.steerVel += dir * 2.8; // and get knocked sideways
          t.cool = 0.8;
          flashBanner("💥 CONTACT", "info");
        }
      }
      // trees only bite once you're off the road and drift out to the treeline
      if (treeCool > 0) treeCool -= dt;
      if (Math.abs(S.playerX) > 1 && treeCool <= 0) {
        const pseg = Math.floor(S.position / T.SEG_LEN) % N;
        for (let d = -1; d <= 2; d++) {
          const trees = treesBySeg.get(((pseg + d) % N + N) % N);
          if (!trees) continue;
          for (const ox of trees) {
            if (Math.abs(ox - S.playerX) < 0.4) {
              S.speed *= 0.2; // a tree is a wall — it nearly stops you
              S.steerVel += (Math.sign(S.playerX - ox) || 1) * 1.6;
              treeCool = 0.6;
              flashBanner("🌲 TREE!", "info");
            }
          }
        }
      }
    }

    const S: GameState = {
      phase: "start", rpm: car.idle, speed: 0, gear: 1,
      gas: 0, brake: 0, throttle: 0, position: 0, playerX: 0, steerVel: 0,
      lap: 0, lapTime: 0, lastLap: 0, bestLap: 0, fuelCut: false,
    };
    let bestSplits: number[] | null = null;
    let curSplits: number[] = [];
    let lastSeg = 0;

    function speedToRPM(speedKmh: number, gear: number) {
      const mps = Math.abs(speedKmh) / 3.6;
      const wheelRevPerSec = mps / (2 * Math.PI * car.wheelR);
      return wheelRevPerSec * Math.abs(ratio(gear)) * car.final * 60;
    }
    function torqueAt(rpm: number) {
      const t = 1 - Math.pow((rpm - car.tqPeak) / car.tqWidth, 2) * 0.55;
      return Math.max(0.4, Math.min(1, t));
    }

    // ---------- persistence ----------
    const bestKey = "lapracer.best." + car.id;
    function loadBest() {
      try {
        const v = localStorage.getItem(bestKey);
        if (!v) return null;
        const o = JSON.parse(v);
        if (o && typeof o.time === "number" && Array.isArray(o.splits)) return o as { time: number; splits: number[] };
      } catch { /* storage may be unavailable */ }
      return null;
    }
    function saveBest(time: number, splits: number[]) {
      try { localStorage.setItem(bestKey, JSON.stringify({ time, splits })); } catch { /* ignore */ }
    }

    // ---------- DOM handles ----------
    const q = <E extends HTMLElement = HTMLElement>(sel: string) => root.querySelector(sel) as E;
    const speedEl = q('[data-el="speed"]');
    const rpmEl = q('[data-el="rpm"]');
    const gearEl = q('[data-el="gear"]');
    const lapTimeEl = q('[data-el="lapTime"]');
    const bestEl = q('[data-el="best"]');
    const lastEl = q('[data-el="last"]');
    const lapNumEl = q('[data-el="lapNum"]');
    const deltaEl = q('[data-el="delta"]');
    const fillGas = q('[data-el="fillGas"]');
    const fillBrake = q('[data-el="fillBrake"]');
    const bannerEl = q('[data-el="banner"]');
    const soundBtn = q('[data-el="soundBtn"]');
    const startEl = q('[data-el="start"]');
    const startBtn = q('[data-el="startBtn"]');

    const b0 = loadBest();
    bestSplits = b0 ? b0.splits : null;
    S.bestLap = b0 ? b0.time : 0;
    bestEl.textContent = S.bestLap ? fmtTime(S.bestLap) : "--:--.---";

    // ---------- controls ----------
    const keys = new Set<string>();
    function startRace() {
      S.phase = "countdown";
      S.speed = 0; S.gear = 1; S.rpm = car.idle; S.position = 0; S.playerX = 0; S.steerVel = 0;
      S.gas = 0; S.brake = 0; S.throttle = 0; S.lapTime = 0; S.fuelCut = false;
      curSplits = []; lastSeg = 0; countdownStart = gameTime; initTraffic();
      startEl.classList.add("hidden");
      if (soundOn) { ensureAudio(); if (audio && audio.state === "suspended") audio.resume(); }
    }
    function shift(dir: number) { S.gear = clamp(S.gear + dir, 1, car.gears); }
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (keys.has(k)) return;
      keys.add(k);
      if (k === "enter" || k === "r" || (k === " " && S.phase === "start")) startRace();
      else if (k === "m") toggleSound();
      else if (k === "e" || k === "x" || k === ".") shift(1);
      else if (k === "q" || k === "z" || k === ",") shift(-1);
      else if (k >= "1" && k <= "6") S.gear = clamp(Number(k), 1, car.gears);
    }
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const onBlur = () => keys.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    const onSound = () => toggleSound();
    const onStart = () => startRace();
    soundBtn.addEventListener("click", onSound);
    startBtn.addEventListener("click", onStart);

    // ---------- physics ----------
    function physics(dt: number) {
      const gasT = keys.has("arrowup") || keys.has("w") ? 1 : 0;
      const brakeT = keys.has("arrowdown") || keys.has("s") ? 1 : 0;
      S.gas += (gasT - S.gas) * Math.min(1, dt * 8);
      S.brake += (brakeT - S.brake) * Math.min(1, dt * 10);
      S.throttle = S.gas;

      if (S.phase !== "racing") { S.rpm = car.idle + S.gas * 2500; S.speed = 0; return; }

      const mps = S.speed / 3.6;
      const gt = ratio(S.gear) * car.final;

      let rpm = clamp(speedToRPM(S.speed, S.gear), 0, car.mechMax);
      S.fuelCut = rpm >= car.revLimit;
      const engineT = S.fuelCut ? 0 : S.throttle * car.maxTq * torqueAt(rpm);
      let driveForce = clamp((engineT * gt) / car.wheelR, -car.grip, car.grip);
      const engBrake = (1 - S.throttle) * (18 + rpm * 0.02) * Math.abs(gt) / car.wheelR;

      const offRoad = Math.abs(S.playerX) > 1;
      const resist = (Math.abs(mps) > 0.01 ? Math.sign(mps) : 0) * car.roll + car.aero * mps * Math.abs(mps);
      const brakeF = S.brake * car.brakeMax * (mps > 0.05 ? 1 : 0);
      const offDrag = offRoad && S.speed > T.OFFROAD_MAX_KMH ? T.OFFROAD_DECEL : 0;

      const net = driveForce - resist - brakeF - engBrake - offDrag;
      let newMps = mps + (net / car.mass) * dt;
      if (newMps < 0) newMps = 0;
      S.speed = newMps * 3.6;
      S.rpm = clamp(speedToRPM(S.speed, S.gear), car.idle * 0.4, car.mechMax);

      // steering + centrifugal. The car does NOT auto-follow the road: a corner throws
      // you toward the outside, and if you don't brake + steer, you fly straight off.
      const speedPct = clamp(S.speed / 290, 0, 1);
      const seg = road[Math.floor(S.position / T.SEG_LEN) % N]!;
      const steerIn = (keys.has("arrowleft") || keys.has("a") ? -1 : 0) + (keys.has("arrowright") || keys.has("d") ? 1 : 0);
      // slidey steering: input eases into a lateral velocity (loose, not on-rails)
      const steerTarget = steerIn * T.STEER * (0.45 + 0.55 * speedPct);
      S.steerVel += (steerTarget - S.steerVel) * Math.min(1, dt * T.STEER_SLIDE);
      S.playerX += S.steerVel * dt;
      // centrifugal pushes you outward hard, scaled by speed — slow down or slide wide
      S.playerX -= seg.curve * speedPct * T.CENTRIFUGAL * dt;
      S.playerX = clamp(S.playerX, -3.4, 3.4);

      const before = S.position;
      S.position += S.speed * T.POS_K * dt;
      S.lapTime += dt;
      if (S.position >= trackLen) { S.position -= trackLen; completeLap(); }
      recordSplits(before, S.position);

      if (!Number.isFinite(S.speed)) S.speed = 0;
      if (!Number.isFinite(S.rpm)) S.rpm = car.idle;
    }

    function recordSplits(_before: number, after: number) {
      const seg = Math.floor(after / T.SEG_LEN) % N;
      if (seg !== lastSeg) { curSplits[seg] = S.lapTime; lastSeg = seg; }
    }
    function completeLap() {
      S.lap += 1;
      S.lastLap = S.lapTime;
      lapNumEl.textContent = String(S.lap);
      lastEl.textContent = fmtTime(S.lastLap);
      if (!S.bestLap || S.lastLap < S.bestLap) {
        S.bestLap = S.lastLap;
        bestSplits = curSplits.slice();
        saveBest(S.bestLap, bestSplits);
        bestEl.textContent = fmtTime(S.bestLap);
        flashBanner("★ NEW BEST LAP  " + fmtTime(S.bestLap), "best");
      } else {
        flashBanner("LAP " + S.lap + "  " + fmtTime(S.lastLap), "info");
      }
      S.lapTime = 0; curSplits = []; lastSeg = 0;
    }

    let bannerUntil = 0;
    function flashBanner(text: string, cls: string) {
      bannerEl.textContent = text;
      bannerEl.className = "banner show " + cls;
      bannerUntil = gameTime + 2.5;
    }

    // ---------- rendering: road ----------
    const rctx = roadCanvas.getContext("2d")!;
    const tctx = tachCanvas.getContext("2d")!;
    const mctx = mapCanvas.getContext("2d")!;
    let roadSize = { w: 1, h: 1 };
    let tachSize = { w: 1, h: 1 };
    let mapSize = { w: 1, h: 1 };
    function fit(cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const r = cv.getBoundingClientRect();
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: r.width, h: r.height };
    }
    function resize() {
      roadSize = fit(roadCanvas!, rctx);
      tachSize = fit(tachCanvas!, tctx);
      mapSize = fit(mapCanvas!, mctx);
      buildMapPath();
    }
    window.addEventListener("resize", resize);

    const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
    function fog(color: [number, number, number], amount: number): string {
      const f: [number, number, number] = [233, 220, 192];
      return `rgb(${Math.round(lerp(color[0], f[0], amount))},${Math.round(lerp(color[1], f[1], amount))},${Math.round(lerp(color[2], f[2], amount))})`;
    }

    function drawRoad() {
      const { w: W, h: H } = roadSize;
      const halfW = W / 2;
      const horizon = H * 0.42;

      // off-road judder — the whole view rattles while you're plowing through grass
      const offRoad = Math.abs(S.playerX) > 1 && S.speed > 4;
      rctx.save();
      if (offRoad) rctx.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7);

      const sky = rctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#4f9fc9"); sky.addColorStop(0.6, "#8fc6de"); sky.addColorStop(1, "#e9dcc0");
      rctx.fillStyle = sky; rctx.fillRect(0, 0, W, horizon);
      const sun = rctx.createRadialGradient(W * 0.68, horizon * 0.82, 3, W * 0.68, horizon * 0.82, W * 0.5);
      sun.addColorStop(0, "rgba(255,244,214,.95)"); sun.addColorStop(0.25, "rgba(255,224,168,.4)"); sun.addColorStop(1, "rgba(255,224,168,0)");
      rctx.fillStyle = sun; rctx.fillRect(0, 0, W, horizon);
      const ground = rctx.createLinearGradient(0, horizon, 0, H);
      ground.addColorStop(0, "#7f9150"); ground.addColorStop(1, "#5a6b39");
      rctx.fillStyle = ground; rctx.fillRect(0, horizon, W, H - horizon);

      const project = (worldX: number, camZ: number, cameraX: number) => {
        const scale = T.CAMERA_DEPTH / camZ;
        return {
          x: halfW + scale * (worldX - cameraX) * halfW,
          y: horizon + scale * T.CAMERA_HEIGHT * (H - horizon),
          w: scale * T.ROAD_WIDTH * halfW,
        };
      };

      const base = Math.floor(S.position / T.SEG_LEN);
      const basePercent = (S.position - base * T.SEG_LEN) / T.SEG_LEN;
      const cameraX = S.playerX * T.ROAD_WIDTH;
      let x = 0;
      let dx = -(road[base % N]!.curve * basePercent);
      let maxy = H;

      // which segment each traffic car is sitting on this frame
      const trafficBySeg = new Map<number, Traffic>();
      for (const t of traffic) trafficBySeg.set(Math.floor(t.pos / T.SEG_LEN) % N, t);

      // pass 1 (near→far): project + accumulate curvature, keep only the visible rows
      type P = ReturnType<typeof project>;
      const rows: { seg: Segment; p1: P; p2: P; f: number }[] = [];
      for (let n = 0; n < T.DRAW_DISTANCE; n++) {
        const seg = road[(base + n) % N]!;
        const camZ1 = (base + n) * T.SEG_LEN - S.position;
        const camZ2 = (base + n + 1) * T.SEG_LEN - S.position;
        const p1 = project(x, camZ1, cameraX);
        const p2 = project(x + dx, camZ2, cameraX);
        x += dx; dx += seg.curve;
        if (camZ1 <= T.CAMERA_DEPTH || p2.y >= maxy || p2.y >= p1.y) continue;
        const f = 1 - Math.exp(-T.FOG_DENSITY * Math.pow(n / T.DRAW_DISTANCE, 1.6));
        rows.push({ seg, p1, p2, f });
        maxy = p2.y;
      }

      // pass 2 (far→near): paint each segment's road THEN its billboards, so nearer road
      // correctly covers trees/cars sitting beside a distant corner (fixes trees-in-road)
      for (let i = rows.length - 1; i >= 0; i--) {
        const { seg, p1, p2, f } = rows[i]!;
        const dark = Math.floor(seg.index / T.RUMBLE_GROUP) % 2 === 0;
        rctx.fillStyle = fog(dark ? [106, 125, 63] : [116, 137, 71], f);
        rctx.fillRect(0, p2.y, W, p1.y - p2.y);
        quad(rctx, p1.x, p1.y, p1.w * 1.12, p2.x, p2.y, p2.w * 1.12, fog(dark ? [200, 16, 46] : [235, 235, 235], f));
        quad(rctx, p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, fog(dark ? [60, 64, 70] : [66, 70, 76], f));
        if (seg.index < 3) checker(rctx, p1.x, p1.y, p1.w, p2.x, p2.y, p2.w);
        else if (dark) quad(rctx, p1.x, p1.y, p1.w * 0.03, p2.x, p2.y, p2.w * 0.03, fog([242, 190, 58], f));
        // stop drawing trees once they're deep in the haze — far trees bunch at the
        // vanishing point and can smear across the distant road; fog hides the cutoff
        const trees = f < 0.5 ? treesBySeg.get(seg.index) : undefined;
        if (trees) for (const ox of trees) drawTree(p1.x + ox * p1.w, p1.y, p1.w, f);
        const tc = trafficBySeg.get(seg.index);
        if (tc) drawTrafficCar(p1.x + tc.x * p1.w, p1.y, p1.w, f, tc.color);
      }
      drawCar(W, H);
      rctx.restore();
    }

    function drawTree(sx: number, sy: number, w: number, f: number) {
      const th = Math.min(w * 1.3, 260); // canopy height (capped so close trees aren't huge)
      const tw = th * 0.5;
      rctx.fillStyle = fog([60, 42, 26], f);
      rctx.fillRect(sx - th * 0.04, sy - th * 0.34, th * 0.08, th * 0.34);
      rctx.fillStyle = fog([46, 92, 50], f);
      for (let i = 0; i < 3; i++) {
        const ty = sy - th * (0.28 + i * 0.28);
        const twi = tw * (1 - i * 0.24);
        rctx.beginPath();
        rctx.moveTo(sx, ty - th * 0.34);
        rctx.lineTo(sx - twi * 0.5, ty);
        rctx.lineTo(sx + twi * 0.5, ty);
        rctx.closePath(); rctx.fill();
      }
    }
    function drawTrafficCar(sx: number, sy: number, w: number, f: number, color: [number, number, number]) {
      const cw = Math.min(w * 0.66, 220), ch = cw * 0.62;
      rctx.fillStyle = "rgba(0,0,0,.26)";
      rctx.beginPath(); rctx.ellipse(sx, sy, cw * 0.52, ch * 0.14, 0, 0, Math.PI * 2); rctx.fill();
      rctx.fillStyle = fog(color, f);
      rrect(rctx, sx - cw / 2, sy - ch, cw, ch * 0.86, ch * 0.22);
      rctx.fillStyle = fog([18, 20, 24], f);
      rrect(rctx, sx - cw * 0.34, sy - ch * 0.98, cw * 0.68, ch * 0.44, ch * 0.16); // greenhouse
      rctx.fillStyle = fog([255, 77, 90], f);
      rrect(rctx, sx - cw * 0.44, sy - ch * 0.28, cw * 0.16, ch * 0.16, 3);
      rrect(rctx, sx + cw * 0.28, sy - ch * 0.28, cw * 0.16, ch * 0.16, 3);
    }

    function quad(ctx: CanvasRenderingContext2D, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, color: string) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1 - w1, y1); ctx.lineTo(x1 + w1, y1); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x2 - w2, y2);
      ctx.closePath(); ctx.fill();
    }
    function checker(ctx: CanvasRenderingContext2D, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number) {
      const cells = 8;
      for (let i = 0; i < cells; i++) {
        const a = i / cells, b = (i + 1) / cells;
        ctx.fillStyle = i % 2 === 0 ? "#f4f4f4" : "#15181d";
        ctx.beginPath();
        ctx.moveTo((x1 - w1) + 2 * w1 * a, y1); ctx.lineTo((x1 - w1) + 2 * w1 * b, y1);
        ctx.lineTo((x2 - w2) + 2 * w2 * b, y2); ctx.lineTo((x2 - w2) + 2 * w2 * a, y2);
        ctx.closePath(); ctx.fill();
      }
    }

    // rear-3/4 view of a little red roadster
    function drawCar(W: number, H: number) {
      const cw = Math.min(W * 0.24, 300);
      const scale = cw / 300;
      // the car slides toward the screen edge as you drift wide — reads as YOU sliding,
      // not the world moving. Clamped so it never leaves the frame.
      const cx = W / 2 + clamp(S.playerX, -1.6, 1.6) * (W * 0.13);
      const cy = H - cw * 0.30;
      const bob = Math.sin(S.position * 0.02) * (S.speed > 5 ? 1.2 : 0);
      // bank into the corner based on how hard you're actually turning (lateral velocity)
      const bank = clamp(S.steerVel * 0.06, -0.18, 0.18);

      rctx.save();
      rctx.translate(cx, cy + bob);
      rctx.scale(scale, scale);
      rctx.rotate(bank);

      // ground shadow
      rctx.fillStyle = "rgba(0,0,0,.30)";
      rctx.beginPath(); rctx.ellipse(0, 66, 150, 20, 0, 0, Math.PI * 2); rctx.fill();
      // rear tyres
      rctx.fillStyle = "#0e1013";
      rrect(rctx, -150, 30, 40, 34, 8); rrect(rctx, 110, 30, 40, 34, 8);
      // diffuser
      rctx.fillStyle = "#17191d"; rrect(rctx, -122, 40, 244, 24, 8);
      // body (vertical gradient for depth)
      const g = rctx.createLinearGradient(0, -34, 0, 46);
      g.addColorStop(0, "#e6203f"); g.addColorStop(0.55, "#c8102e"); g.addColorStop(1, "#8f0c22");
      rctx.fillStyle = g; rrect(rctx, -132, -30, 264, 78, 22);
      // trunk highlight
      rctx.fillStyle = "rgba(255,255,255,.10)"; rrect(rctx, -120, -26, 240, 16, 10);
      // soft-top / rollhoops
      rctx.fillStyle = "#111418"; rrect(rctx, -74, -46, 148, 30, 12);
      rctx.fillStyle = "#05070a"; rrect(rctx, -60, -40, 120, 18, 8); // rear glass
      // tail lights
      rctx.fillStyle = "#4a0410"; rrect(rctx, -120, 22, 46, 16, 5); rrect(rctx, 74, 22, 46, 16, 5);
      rctx.fillStyle = "#ff4d5a"; rrect(rctx, -114, 25, 34, 9, 4); rrect(rctx, 80, 25, 34, 9, 4);
      rctx.fillStyle = "rgba(255,190,120,.9)"; rrect(rctx, -112, 26, 8, 6, 3); rrect(rctx, 104, 26, 8, 6, 3);
      // plate
      rctx.fillStyle = "#e9e3d2"; rrect(rctx, -26, 24, 52, 15, 3);
      rctx.fillStyle = "#3a4149"; rctx.font = "700 11px ui-monospace, Menlo, monospace"; rctx.textAlign = "center"; rctx.textBaseline = "middle";
      rctx.fillText("APEX", 0, 32);
      // exhaust tips
      rctx.fillStyle = "#2a2f36"; rctx.beginPath(); rctx.arc(-40, 58, 5, 0, Math.PI * 2); rctx.arc(40, 58, 5, 0, Math.PI * 2); rctx.fill();
      rctx.restore();
    }
    function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath(); ctx.fill();
    }

    // ---------- rendering: tach ----------
    function drawTach() {
      const { w, h } = tachSize;
      tctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 4;
      const start = Math.PI * 0.75, sweep = Math.PI * 1.5;
      const maxDial = 8, redAt = car.redline / 1000;

      tctx.beginPath(); tctx.arc(cx, cy, R, 0, Math.PI * 2);
      const g = tctx.createRadialGradient(cx, cy - R * 0.3, R * 0.1, cx, cy, R);
      g.addColorStop(0, "#141922"); g.addColorStop(1, "#070a0d");
      tctx.fillStyle = g; tctx.fill();
      tctx.lineWidth = 2; tctx.strokeStyle = "#20262e"; tctx.stroke();

      tctx.beginPath();
      tctx.arc(cx, cy, R - 8, start + sweep * (redAt / maxDial), start + sweep, false);
      tctx.lineWidth = 4; tctx.strokeStyle = "rgba(224,47,38,.85)"; tctx.stroke();

      for (let i = 0; i <= maxDial; i++) {
        const a = start + sweep * (i / maxDial);
        const isRed = i >= redAt;
        tctx.beginPath();
        tctx.moveTo(cx + Math.cos(a) * (R - 12), cy + Math.sin(a) * (R - 12));
        tctx.lineTo(cx + Math.cos(a) * (R - 24), cy + Math.sin(a) * (R - 24));
        tctx.lineWidth = 2.5; tctx.strokeStyle = isRed ? "#ff6a58" : "#ffab40"; tctx.stroke();
        tctx.fillStyle = isRed ? "#ff6a58" : "#d9cdb4";
        tctx.font = `600 ${Math.round(R * 0.16)}px ui-monospace, Menlo, monospace`;
        tctx.textAlign = "center"; tctx.textBaseline = "middle";
        tctx.fillText(String(i), cx + Math.cos(a) * (R - 36), cy + Math.sin(a) * (R - 36));
      }

      if (S.rpm > car.shift && S.gear < car.gears) {
        tctx.beginPath(); tctx.arc(cx, cy, R - 2, 0, Math.PI * 2);
        tctx.lineWidth = 3; tctx.strokeStyle = S.fuelCut ? "#e02f26" : "#ffab40"; tctx.stroke();
      }

      const na = start + sweep * (clamp(S.rpm / 1000, 0, maxDial) / maxDial);
      tctx.save();
      tctx.translate(cx, cy); tctx.rotate(na);
      tctx.beginPath();
      tctx.moveTo(-R * 0.12, 0); tctx.lineTo(R - 26, -2.5); tctx.lineTo(R - 22, 0); tctx.lineTo(R - 26, 2.5);
      tctx.closePath();
      tctx.fillStyle = "#ff5a36"; tctx.shadowColor = "rgba(255,90,54,.7)"; tctx.shadowBlur = 10; tctx.fill();
      tctx.restore();
      tctx.beginPath(); tctx.arc(cx, cy, R * 0.09, 0, Math.PI * 2);
      tctx.fillStyle = "#2a3038"; tctx.fill();
    }

    // ---------- rendering: minimap (closed circuit) ----------
    let mapPath: { x: number; y: number }[] = [];
    function buildMapPath() {
      // dynamic heading scale so total curvature closes the loop (net = 360deg)
      let sumCurve = 0;
      for (const s of road) sumCurve += s.curve;
      const K = Math.abs(sumCurve) > 1e-6 ? (Math.PI * 2) / sumCurve : 0.001;
      const pts: { x: number; y: number }[] = [];
      let heading = 0, px = 0, py = 0;
      let minX = 0, maxX = 0, minY = 0, maxY = 0;
      for (let i = 0; i < N; i++) {
        heading += road[i]!.curve * K;
        px += Math.sin(heading); py -= Math.cos(heading);
        pts.push({ x: px, y: py });
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
      const { w, h } = mapSize;
      const pad = 12;
      const s = Math.min((w - pad * 2) / Math.max(1, maxX - minX), (h - pad * 2) / Math.max(1, maxY - minY));
      const ox = (w - (maxX - minX) * s) / 2 - minX * s;
      const oy = (h - (maxY - minY) * s) / 2 - minY * s;
      mapPath = pts.map((p) => ({ x: ox + p.x * s, y: oy + p.y * s }));
    }
    function drawMap() {
      const { w, h } = mapSize;
      mctx.clearRect(0, 0, w, h);
      if (mapPath.length < 2) return;
      mctx.beginPath();
      mctx.moveTo(mapPath[0]!.x, mapPath[0]!.y);
      for (const p of mapPath) mctx.lineTo(p.x, p.y);
      mctx.closePath();
      mctx.lineJoin = "round"; mctx.lineWidth = 5; mctx.strokeStyle = "rgba(0,0,0,.35)"; mctx.stroke();
      mctx.lineWidth = 3; mctx.strokeStyle = "rgba(226,221,209,.65)"; mctx.stroke();
      mctx.fillStyle = "#f4f4f4"; mctx.beginPath(); mctx.arc(mapPath[0]!.x, mapPath[0]!.y, 2.5, 0, Math.PI * 2); mctx.fill();
      const p = mapPath[Math.floor(S.position / T.SEG_LEN) % N]!;
      mctx.fillStyle = "#c8102e"; mctx.shadowColor = "rgba(200,16,46,.9)"; mctx.shadowBlur = 8;
      mctx.beginPath(); mctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); mctx.fill(); mctx.shadowBlur = 0;
    }

    // ---------- audio ----------
    let audio: AudioContext | null = null, master: GainNode | null = null;
    let oscMain: OscillatorNode | null = null, mainFilter: BiquadFilterNode | null = null, mainGain: GainNode | null = null;
    let oscSub: OscillatorNode | null = null, subGain: GainNode | null = null;
    let noiseGain: GainNode | null = null, whistleFilter: BiquadFilterNode | null = null, whistleGain: GainNode | null = null;
    let soundOn = true;
    function ensureAudio() {
      if (audio || !soundOn) return;
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audio = new Ctx();
        master = audio.createGain(); master.gain.value = 0.85; master.connect(audio.destination);
        oscMain = audio.createOscillator(); oscMain.type = "sawtooth"; mainFilter = audio.createBiquadFilter(); mainFilter.type = "lowpass"; mainGain = audio.createGain(); mainGain.gain.value = 0;
        oscMain.connect(mainFilter); mainFilter.connect(mainGain); mainGain.connect(master);
        oscSub = audio.createOscillator(); oscSub.type = "sawtooth"; subGain = audio.createGain(); subGain.gain.value = 0;
        oscSub.connect(subGain); subGain.connect(master);
        const buf = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noiseSrc = audio.createBufferSource(); noiseSrc.buffer = buf; noiseSrc.loop = true;
        const nf = audio.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 900; nf.Q.value = 0.7;
        noiseGain = audio.createGain(); noiseGain.gain.value = 0;
        noiseSrc.connect(nf); nf.connect(noiseGain); noiseGain.connect(master);
        whistleFilter = audio.createBiquadFilter(); whistleFilter.type = "bandpass"; whistleFilter.Q.value = 7; whistleFilter.frequency.value = 2200;
        whistleGain = audio.createGain(); whistleGain.gain.value = 0;
        noiseSrc.connect(whistleFilter); whistleFilter.connect(whistleGain); whistleGain.connect(master);
        oscMain.start(); oscSub.start(); noiseSrc.start();
      } catch { audio = null; }
    }
    function updateAudio() {
      if (!audio || !mainGain || !oscMain || !mainFilter || !oscSub || !subGain || !whistleGain || !whistleFilter || !noiseGain) return;
      const now = audio.currentTime;
      if (!Number.isFinite(now)) return;
      if (!soundOn) { [mainGain, subGain, whistleGain, noiseGain].forEach((n) => n.gain.setTargetAtTime(0, now, 0.06)); return; }
      const rpm = Number.isFinite(S.rpm) ? S.rpm : car.idle;
      const load = 0.5 + S.throttle * 0.5;
      const f = SOUND.base + rpm * SOUND.pitch;
      oscMain.frequency.setTargetAtTime(f, now, 0.02);
      mainFilter.frequency.setTargetAtTime(SOUND.cutoff + rpm * SOUND.cutoffPerRpm, now, 0.04);
      mainGain.gain.setTargetAtTime(0.02 + load * 0.05 * (rpm / car.redline + 0.2), now, 0.04);
      oscSub.frequency.setTargetAtTime(f * 0.5, now, 0.02);
      subGain.gain.setTargetAtTime(SOUND.sub * (0.03 + load * 0.035), now, 0.04);
      const spool = clamp((rpm - 1800) / 3200, 0, 1);
      whistleFilter.frequency.setTargetAtTime(1400 + rpm * 0.2, now, 0.06);
      whistleGain.gain.setTargetAtTime(SOUND.whistle * S.throttle * spool * 0.1, now, 0.06);
      noiseGain.gain.setTargetAtTime(SOUND.noise * (0.008 + load * 0.02), now, 0.03);
    }
    function toggleSound() {
      soundOn = !soundOn;
      soundBtn.textContent = "Sound: " + (soundOn ? "On" : "Off");
      soundBtn.classList.toggle("on", soundOn);
      if (soundOn) ensureAudio();
      if (audio && audio.state === "suspended") audio.resume();
    }

    // ---------- HUD ----------
    function syncDOM() {
      speedEl.textContent = String(Math.round(S.speed * 0.621371));
      rpmEl.textContent = String(Math.round(S.rpm));
      gearEl.textContent = String(S.gear);
      lapTimeEl.textContent = fmtTime(S.lapTime);
      fillGas.style.height = (S.gas * 100).toFixed(0) + "%";
      fillBrake.style.height = (S.brake * 100).toFixed(0) + "%";

      if (bestSplits && S.phase === "racing") {
        const seg = Math.floor(S.position / T.SEG_LEN) % N;
        const ref = bestSplits[seg];
        if (typeof ref === "number") {
          const d = S.lapTime - ref;
          deltaEl.textContent = (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(2);
          deltaEl.className = "delta show " + (d <= 0 ? "ahead" : "behind");
        }
      } else {
        deltaEl.className = "delta";
      }
      if (bannerEl.classList.contains("show") && gameTime > bannerUntil) bannerEl.className = "banner";
    }

    // ---------- main loop ----------
    let gameTime = 0;
    let countdownStart = 0;
    let raf = 0;
    let last: number | null = null;
    function frame(ts: number) {
      if (last === null) last = ts;
      let dt = (ts - last) / 1000; last = ts;
      dt = Math.min(dt, 0.05);
      gameTime += dt;

      if (S.phase === "countdown") {
        const remain = 3 - (gameTime - countdownStart);
        if (remain <= 0) { S.phase = "racing"; S.lapTime = 0; lastSeg = 0; curSplits = []; flashBanner("GO!", "go"); }
        else flashBanner(String(Math.ceil(remain)), "count");
        physics(dt);
      } else if (S.phase === "racing") {
        const steps = 5, sdt = dt / steps;
        for (let i = 0; i < steps; i++) physics(sdt);
        updateTraffic(dt);
      } else {
        physics(dt); // start screen — idle
      }

      updateAudio();
      drawRoad();
      drawTach();
      drawMap();
      syncDOM();
      raf = requestAnimationFrame(frame);
    }

    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", resize);
      soundBtn.removeEventListener("click", onSound);
      startBtn.removeEventListener("click", onStart);
      if (audio) audio.close();
    };
  }, []);

  return (
    <div className="lap" ref={rootRef}>
      <style>{CSS}</style>

      <div className="lap-stage">
        <div className="lap-top">
          <div className="lap-brand">
            <h1>APEX<span className="dot">·</span></h1>
            <span className="tag">fastest lap wins</span>
          </div>
          <button className="sound-btn on" data-el="soundBtn" type="button">Sound: On</button>
        </div>

        <div className="road-wrap">
          <canvas className="road" ref={roadRef} />

          <div className="hud-timing">
            <div className="lap-line big"><span className="k">LAP</span><span className="v" data-el="lapTime">0:00.000</span></div>
            <div className="lap-line"><span className="k">BEST</span><span className="v best" data-el="best">--:--.---</span></div>
            <div className="lap-line"><span className="k">LAST</span><span className="v" data-el="last">--:--.---</span></div>
          </div>

          <div className="delta" data-el="delta">+0.00</div>

          <div className="hud-map"><canvas ref={mapRef} /><span className="lapcount">Lap <b data-el="lapNum">0</b></span></div>

          <div className="hud-dash">
            <div className="tach-box"><canvas className="tach" ref={tachRef} /></div>
            <div className="readout">
              <div className="gear" data-el="gear">1</div>
              <div className="rpm"><span data-el="rpm">900</span><i>rpm</i></div>
              <div className="mph"><span data-el="speed">0</span><i>mph</i></div>
            </div>
            <div className="pedals">
              <div className="pedal"><div className="fill gas" data-el="fillGas" /><span>GAS</span></div>
              <div className="pedal"><div className="fill brake" data-el="fillBrake" /><span>BRK</span></div>
            </div>
          </div>

          <div className="banner" data-el="banner" />

          {/* retro California start screen */}
          <div className="start-screen" data-el="start">
            <div className="start-grid" />
            <div className="start-sun" />
            <div className="start-inner">
              <div className="start-kicker">TIME ATTACK</div>
              <h2 className="start-title">APEX</h2>
              <div className="start-sub">one hot lap · beat the clock</div>
              <button className="start-btn" data-el="startBtn" type="button">▸ PRESS ENTER TO START</button>
            </div>
          </div>
        </div>

        <div className="lap-controls">
          <span><b>←/→</b> steer</span>
          <span><b>↑</b> gas</span>
          <span><b>↓</b> brake</span>
          <span><b>. / E</b> up-shift</span>
          <span><b>, / Q</b> down-shift</span>
          <span><b>1–6</b> gear</span>
          <span><b>Enter</b> restart</span>
          <span><b>M</b> mute</span>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.lap { --red:#c8102e; --amber:#ffab40; --amber-dim:#c07f2e; --good:#52c17a;
  --bg0:#0b0d10; --bg1:#0f1319; --text:#e2ddd1; --muted:#828d99;
  width:100%; color:var(--text); font-family:${FONT_LABEL}; }
.lap * { box-sizing:border-box; }
.lap-stage { width:100%; background:linear-gradient(180deg,var(--bg1),var(--bg0)); border:1px solid #20262e;
  border-radius:16px; padding:14px; box-shadow:0 20px 60px rgba(0,0,0,.4); }
.lap-top { display:flex; align-items:center; gap:14px; }
.lap-brand { display:flex; align-items:baseline; gap:8px; margin-right:auto; }
.lap-brand h1 { margin:0; font-size:26px; font-weight:900; letter-spacing:2px; color:var(--text); }
.lap-brand .dot { color:var(--red); }
.lap-brand .tag { font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); }
.sound-btn { border:1px solid #20262e; background:#0c0f13; color:var(--muted); font:600 12px ${FONT_LABEL};
  padding:6px 12px; border-radius:8px; cursor:pointer; }
.sound-btn.on { color:var(--amber); border-color:var(--amber-dim); }

.road-wrap { position:relative; width:100%; aspect-ratio:16/9; border-radius:12px; overflow:hidden;
  border:1px solid #20262e; background:#0a0c0f; margin-top:12px; }
.road { position:absolute; inset:0; width:100%; height:100%; display:block; }

.hud-timing { position:absolute; top:12px; left:12px; display:flex; flex-direction:column; gap:3px;
  background:rgba(8,10,13,.55); backdrop-filter:blur(6px); padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.06); }
.lap-line { display:flex; align-items:baseline; gap:8px; font-variant-numeric:tabular-nums; }
.lap-line .k { font-size:10px; letter-spacing:2px; color:var(--muted); width:34px; }
.lap-line .v { font:700 16px ui-monospace,Menlo,monospace; color:var(--text); }
.lap-line.big .v { font-size:28px; }
.lap-line .v.best { color:var(--amber); }

.delta { position:absolute; top:12px; left:50%; transform:translateX(-50%); opacity:0;
  font:800 22px ui-monospace,Menlo,monospace; padding:4px 14px; border-radius:8px; transition:opacity .2s; }
.delta.show { opacity:1; }
.delta.ahead { background:rgba(82,193,122,.92); color:#04150b; }
.delta.behind { background:rgba(224,47,38,.92); color:#fff; }

.hud-map { position:absolute; top:12px; right:12px; width:150px; height:126px;
  background:rgba(8,10,13,.55); backdrop-filter:blur(6px); border-radius:10px; border:1px solid rgba(255,255,255,.06); padding:5px; }
.hud-map canvas { width:100%; height:100px; display:block; }
.hud-map .lapcount { display:block; text-align:center; font-size:11px; letter-spacing:1px; color:var(--muted); }
.hud-map .lapcount b { color:var(--text); }

.hud-dash { position:absolute; bottom:12px; left:12px; display:flex; align-items:flex-end; gap:14px; }
.tach-box { width:118px; height:118px; }
.tach { width:100%; height:100%; display:block; }
.readout { display:flex; flex-direction:column; align-items:center; justify-content:flex-end;
  background:rgba(8,10,13,.55); backdrop-filter:blur(6px); border-radius:10px; border:1px solid rgba(255,255,255,.06); padding:6px 14px; }
.readout .gear { font:800 40px ui-monospace,Menlo,monospace; color:var(--text); line-height:1; }
.readout .rpm, .readout .mph { font:700 14px ui-monospace,Menlo,monospace; color:var(--text); }
.readout .rpm i, .readout .mph i { color:var(--muted); font-style:normal; font-size:10px; margin-left:3px; letter-spacing:1px; }
.pedals { display:flex; gap:6px; align-items:flex-end; }
.pedal { position:relative; width:22px; height:70px; background:rgba(8,10,13,.6); border-radius:6px; border:1px solid rgba(255,255,255,.08); overflow:hidden; }
.pedal .fill { position:absolute; bottom:0; left:0; right:0; height:0%; }
.pedal .fill.gas { background:linear-gradient(180deg,var(--good),#2c8a52); }
.pedal .fill.brake { background:linear-gradient(180deg,var(--red),#7d0a1c); }
.pedal span { position:absolute; bottom:2px; left:0; right:0; text-align:center; font-size:8px; letter-spacing:1px; color:#fff; mix-blend-mode:difference; }

.banner { position:absolute; top:42%; left:50%; transform:translate(-50%,-50%) scale(.8); opacity:0;
  font:900 42px ${FONT_LABEL}; letter-spacing:2px; text-align:center; pointer-events:none;
  text-shadow:0 4px 24px rgba(0,0,0,.6); transition:opacity .18s, transform .18s; z-index:4; }
.banner.show { opacity:1; transform:translate(-50%,-50%) scale(1); }
.banner.count { color:#fff; font-size:72px; }
.banner.go { color:var(--good); font-size:72px; }
.banner.best { color:var(--amber); }
.banner.info { color:var(--text); }

/* ---- retro California start screen ---- */
.start-screen { position:absolute; inset:0; z-index:6; overflow:hidden; display:flex; align-items:center; justify-content:center;
  background:linear-gradient(180deg,#241056 0%,#5b1c86 32%,#c33189 55%,#ff6b52 74%,#ffb03a 100%); }
.start-screen.hidden { display:none; }
.start-sun { position:absolute; top:20%; left:50%; transform:translateX(-50%); width:min(340px,54%); aspect-ratio:1; border-radius:50%;
  background:linear-gradient(180deg,#fff2a6 0%,#ffd24a 42%,#ff5a6e 100%);
  -webkit-mask:linear-gradient(#000 55%, transparent 55%), repeating-linear-gradient(#000 0 8px, transparent 8px 15px);
  -webkit-mask-composite:source-over; mask:linear-gradient(#000 55%, transparent 55%), repeating-linear-gradient(#000 0 8px, transparent 8px 15px);
  filter:drop-shadow(0 0 60px rgba(255,120,80,.6)); }
.start-grid { position:absolute; left:-60%; right:-60%; bottom:0; height:42%;
  background-image:linear-gradient(rgba(255,54,161,.55) 2px, transparent 2px), linear-gradient(90deg, rgba(255,54,161,.45) 2px, transparent 2px);
  background-size:100% 34px, 58px 100%;
  transform:perspective(300px) rotateX(64deg); transform-origin:bottom center;
  -webkit-mask:linear-gradient(transparent, #000 55%); mask:linear-gradient(transparent, #000 55%);
  animation:gridpull 1.1s linear infinite; }
@keyframes gridpull { to { background-position:0 34px, 0 0; } }
.start-inner { position:relative; z-index:2; text-align:center; padding-bottom:6%; }
.start-kicker { font:800 13px ${FONT_LABEL}; letter-spacing:8px; color:#ffe6a0; text-shadow:0 0 12px rgba(255,140,80,.8); }
.start-title { margin:4px 0 2px; font:900 clamp(64px,15vw,150px)/0.9 "Arial Black","Arial Black",${FONT_LABEL}; letter-spacing:6px;
  background:linear-gradient(180deg,#ffffff 8%,#ffe07a 38%,#ff69a8 62%,#8f7bff 92%);
  -webkit-background-clip:text; background-clip:text; color:transparent;
  -webkit-text-stroke:2px rgba(255,255,255,.16);
  filter:drop-shadow(0 3px 0 #7a1b6b) drop-shadow(0 0 22px rgba(255,90,160,.55)); }
.start-sub { font:600 14px ${FONT_LABEL}; letter-spacing:3px; text-transform:uppercase; color:#fff; opacity:.9; text-shadow:0 2px 10px rgba(0,0,0,.4); }
.start-btn { margin-top:22px; border:2px solid rgba(255,255,255,.7); background:rgba(255,255,255,.08); color:#fff;
  font:800 15px ${FONT_LABEL}; letter-spacing:3px; padding:12px 26px; border-radius:40px; cursor:pointer; backdrop-filter:blur(4px);
  box-shadow:0 0 24px rgba(255,90,160,.5); transition:transform .15s, background .15s; animation:pulseBtn 1.6s ease-in-out infinite; }
.start-btn:hover { background:rgba(255,255,255,.2); transform:translateY(-2px); }
@keyframes pulseBtn { 0%,100%{ box-shadow:0 0 20px rgba(255,90,160,.4); } 50%{ box-shadow:0 0 34px rgba(255,90,160,.75); } }

.lap-controls { display:flex; flex-wrap:wrap; gap:6px 16px; margin-top:12px; padding:0 2px; font-size:12px; color:var(--muted); }
.lap-controls b { color:var(--text); font-family:ui-monospace,Menlo,monospace; }
`;
