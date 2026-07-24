import { useEffect, useRef } from "react";
import { clamp, lerp, fmtTime, type Col } from "./util";
import { TUNING, TUNING_DEFAULTS, KNOBS, CAR } from "./tuning";
import { TRACKS, tracePath, type Segment } from "./tracks";
import { drawPlayerCar, drawTrafficCar, drawTree, quad, checker } from "./sprites";
import { createEngineAudio } from "./audio";
import { DIFFS, createRivals, buildAllowedSpeeds, updateRivals, type Rival, type Hazard } from "./ai";
import { CSS } from "./styles";

/**
 * APEX — a fastest-lap arcade racer (Bryce's "simple competition" entry).
 *
 * Pole Position / OutRun-style pseudo-3D: a curved circuit projected toward the horizon,
 * sprite car at the bottom, radial tach. Driving is "arcade + real shifting": gears, RPM,
 * torque curve, redline fuel-cut — but NO clutch or stalling. Race N laps against three
 * AI rivals (EASY/MED/HARD) plus slow traffic; fastest single lap is the record that
 * persists.
 *
 * One imperative canvas + rAF loop in a single useEffect; React owns structure. The fast
 * HUD is written straight to the DOM via data-el refs. Sibling modules:
 *   tuning.ts (feel knobs + car), tracks.ts (circuits + themes), sprites.ts (drawing),
 *   ai.ts (rivals), audio.ts (engine synth), styles.ts (CSS).
 */
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
    const ratio = (g: number) => car.ratios[g] ?? 0;
    // The player SPRITE sits this far ahead of the camera — where the projection's near
    // plane meets the bottom of the screen. ALL collision happens on that plane, so
    // things hit exactly where they appear to be, not at the invisible camera position.
    const PLAYER_Z = T.CAMERA_DEPTH * T.CAMERA_HEIGHT * 1.15;

    // current track + difficulty (selectable on the start screen); loadTrack() fills in
    let trackIdx = 0;
    let track = TRACKS[0]!;
    let theme = track.theme;
    let road: Segment[] = [];
    let N = 0;
    let trackLen = 0;
    // mode 0 = TIME TRIAL (no rivals, endless laps); 1..3 = race vs AI at DIFFS[mode-1]
    const MODES = [{ id: "tt", name: "TIME TRIAL" }, ...DIFFS];
    let modeIdx = 2; // MED default
    const raceDiff = () => (modeIdx > 0 ? DIFFS[modeIdx - 1]! : null);
    let allowedSpeeds: number[] = []; // AI braking map for current track + difficulty

    // roadside trees (deterministic clusters) — scenery so off-road feels alive.
    // Only beside straighter segments: on a sharp curve a roadside tree projects over the
    // road at the vanishing point (can't be occluded there), so we just skip those.
    const treesBySeg = new Map<number, number[]>();
    function buildTrees() {
      treesBySeg.clear();
      for (let i = 0; i < N; i++) {
        const h = (i * 2654435761) >>> 0; // cheap stable hash → same trees every run
        if (h % 14 < 2 && Math.abs(road[i]!.curve) < 2) {
          const side = h & 8 ? 1 : -1;
          const off = side * (2.8 + ((h >> 4) % 100) / 100 * 2.4); // 2.8..5.2 — well clear of the road
          treesBySeg.set(i, [off]);
        }
      }
    }

    // slow traffic to dodge / bump — now on a 3-lane road
    const LANES = [-0.55, 0, 0.55];
    interface Traffic {
      pos: number; x: number; targetX: number; switchIn: number;
      speed: number; color: Col; variant: number; cool: number;
    }
    const TRAFFIC_COLORS: Col[] = [[63, 127, 214], [224, 165, 58], [122, 82, 201], [74, 169, 108], [217, 79, 106]];
    let traffic: Traffic[] = [];
    let rivals: Rival[] = [];
    let treeCool = 0;
    let impactFlash = 0; // red vignette + judder on contact (instead of a text popup)
    function initTraffic() {
      traffic = [];
      const count = track.traffic || T.TRAFFIC;
      for (let i = 0; i < count; i++) {
        const lane = LANES[i % 3]! + ((i * 37) % 7) / 100 - 0.03;
        traffic.push({
          pos: (trackLen * (i + 0.5)) / count,
          x: lane, targetX: lane, switchIn: 2 + (i * 1.7) % 6,
          speed: 64 + (i % 4) * 13,
          color: TRAFFIC_COLORS[i % TRAFFIC_COLORS.length]!,
          variant: i % 3,
          cool: 0,
        });
      }
    }
    function initRivals() {
      rivals = raceDiff() ? createRivals(trackLen, PLAYER_Z) : [];
    }

    // signed distance from a world position to the player-sprite plane
    function gapToPlane(p: number) {
      const plane = S.position + PLAYER_Z;
      let g = (((p - plane) % trackLen) + trackLen) % trackLen;
      if (g > trackLen / 2) g -= trackLen;
      return g;
    }
    // hit when inside the car-length window — or when the closing speed stepped clean
    // over the window in one frame (no tunneling through cars at 200 mph).
    // Window is asymmetric: a bit more reach ahead (your car's nose extends up-screen
    // past the sprite) than behind (a car behind the plane is sliding off the bottom
    // edge beside you). Lateral 0.22 is calibrated to DRAWN separation, not road units:
    // steering slides the world under the camera while the player sprite barely moves,
    // so sprites visually touch at ~0.21 offset — a wider box hits through visible air.
    function sweptPlaneHit(pos: number, prevPos: number, x: number, dt: number) {
      const gap = gapToPlane(pos);
      const prevGap = gapToPlane(prevPos) + S.speed * T.POS_K * dt;
      const crossed = (prevGap > 0) !== (gap > 0) && Math.abs(prevGap - gap) < trackLen / 4;
      return (crossed || (gap < 150 && gap > -70)) && Math.abs(x - S.playerX) < 0.22;
    }

    function updateTraffic(dt: number) {
      for (const t of traffic) {
        const prevPos = t.pos;
        t.pos = (t.pos + t.speed * T.POS_K * dt) % trackLen;
        if (t.cool > 0) t.cool -= dt;
        const gap = gapToPlane(t.pos);
        // lane switching: every few seconds pick a new lane and drift over to it —
        // but never swerve while close to the player's plane (no cheap sideswipes)
        t.switchIn -= dt;
        if (t.switchIn <= 0) {
          if (Math.abs(gap) > 900) t.targetX = LANES[Math.floor(Math.random() * 3)]! + (Math.random() - 0.5) * 0.08;
          t.switchIn = 3 + Math.random() * 5;
        }
        t.x += (t.targetX - t.x) * Math.min(1, dt * 1.1);
        if (S.phase !== "racing") continue;
        if (t.cool <= 0 && sweptPlaneHit(t.pos, prevPos, t.x, dt)) {
          S.speed *= 0.42; // bump = you lose your drive
          const dir = Math.sign(S.playerX - t.x) || 1;
          S.driftVel += dir * 1.8; // and get knocked into a slide
          t.cool = 0.8;
          impactFlash = 1;
        }
      }
      // trees only bite once you're off the road — measured on the same sprite plane
      if (treeCool > 0) treeCool -= dt;
      if (S.phase === "racing" && Math.abs(S.playerX) > 1 && treeCool <= 0) {
        // d 0..1 spans ±1 segment around the plane (a tree sits at its segment's start);
        // lateral 0.16 ≈ the DRAWN tree (thin trunk + canopy) actually brushing the car —
        // any wider and you get TREE'd by visibly empty grass
        const pseg = Math.floor((S.position + PLAYER_Z) / T.SEG_LEN) % N;
        for (let d = 0; d <= 1; d++) {
          const trees = treesBySeg.get(((pseg + d) % N + N) % N);
          if (!trees) continue;
          for (const ox of trees) {
            if (Math.abs(ox - S.playerX) < 0.16) {
              S.speed *= 0.2; // a tree is a wall — it nearly stops you
              S.driftVel += (Math.sign(S.playerX - ox) || 1) * 1.6;
              treeCool = 0.6;
              impactFlash = 1;
            }
          }
        }
      }
    }

    function playerTotal() { return S.lap * trackLen + S.position + PLAYER_Z; }
    function playerPlace() {
      const total = playerTotal();
      let p = 1;
      for (const r of rivals) if (r.lap * trackLen + r.pos > total) p++;
      return p;
    }
    function runRivals(dt: number) {
      const diff = raceDiff();
      if (!diff || !rivals.length) return;
      const hazards: Hazard[] = [
        ...traffic.map((t) => ({ pos: t.pos, x: t.x, speed: t.speed })),
        ...rivals.map((r) => ({ pos: r.pos, x: r.x, speed: r.speed })),
        { pos: S.position + PLAYER_Z, x: S.playerX, speed: S.speed },
      ];
      updateRivals(rivals, dt, {
        road, segLen: T.SEG_LEN, trackLen, posK: T.POS_K,
        allowed: allowedSpeeds, diff, paceMul: T.AI_PACE,
        playerTotal: playerTotal(), hazards,
      });
      // rival ↔ player contact: door-to-door, both cars pay for it
      for (const r of rivals) {
        if (r.cool <= 0 && sweptPlaneHit(r.pos, r.prevPos, r.x, dt)) {
          S.speed *= 0.55;
          const dir = Math.sign(S.playerX - r.x) || 1;
          S.driftVel += dir * 1.6;
          r.speed *= 0.72;
          r.x = clamp(r.x - dir * 0.22, -0.5, 0.5);
          r.cool = 0.8;
          impactFlash = 1;
        }
      }
    }

    const S = {
      phase: "start" as "start" | "countdown" | "racing" | "finished",
      rpm: car.idle, speed: 0, gear: 1,
      gas: 0, brake: 0, throttle: 0, position: 0, playerX: 0, steerVel: 0, driftVel: 0,
      lap: 0, lapTime: 0, lastLap: 0, bestLap: 0, raceTime: 0, raceBest: 0, fuelCut: false,
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
    const bestKeyFor = (trackId: string) => `lapracer.best.${car.id}.${trackId}`;
    function loadBest() {
      try {
        let v = localStorage.getItem(bestKeyFor(track.id));
        if (!v && track.id === "laguna") v = localStorage.getItem("lapracer.best." + car.id); // pre-track-select saves
        if (!v) return null;
        const o = JSON.parse(v);
        if (o && typeof o.time === "number" && Array.isArray(o.splits)) return o as { time: number; splits: number[] };
      } catch { /* storage may be unavailable */ }
      return null;
    }
    function saveBest(time: number, splits: number[]) {
      try { localStorage.setItem(bestKeyFor(track.id), JSON.stringify({ time, splits })); } catch { /* ignore */ }
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
    const posEl = q('[data-el="pos"]');
    const deltaEl = q('[data-el="delta"]');
    const fillGas = q('[data-el="fillGas"]');
    const fillBrake = q('[data-el="fillBrake"]');
    const bannerEl = q('[data-el="banner"]');
    const soundBtn = q('[data-el="soundBtn"]');
    const startEl = q('[data-el="start"]');
    const startBtn = q('[data-el="startBtn"]');
    const resultsEl = q('[data-el="results"]');
    const resPosEl = q('[data-el="resPos"]');
    const resTotalEl = q('[data-el="resTotal"]');
    const resBestEl = q('[data-el="resBest"]');
    const resNoteEl = q('[data-el="resNote"]');
    const devEl = q('[data-el="dev"]');
    const devBtn = q('[data-el="devBtn"]');
    const devRowsEl = q('[data-el="devRows"]');
    const devResetBtn = q('[data-el="devReset"]');
    const diffsEl = q('[data-el="diffs"]');

    // ---------- track picker (start screen) ----------
    const tracksEl = q('[data-el="tracks"]');
    const cards = TRACKS.map((tk, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "track-card";
      const cv = document.createElement("canvas");
      const nm = document.createElement("span");
      nm.className = "tname"; nm.textContent = tk.name;
      const tg = document.createElement("span");
      tg.className = "ttag"; tg.textContent = tk.tagline;
      card.append(cv, nm, tg);
      card.addEventListener("click", () => { if (S.phase === "start") loadTrack(i); });
      tracksEl.appendChild(card);
      // draw the loop preview once
      const pw = 92, ph = 56, dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = pw * dpr; cv.height = ph * dpr;
      cv.style.width = pw + "px"; cv.style.height = ph + "px";
      const pctx = cv.getContext("2d")!;
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pts = tracePath(tk.build(), pw, ph, 6);
      pctx.beginPath();
      pctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (const p of pts) pctx.lineTo(p.x, p.y);
      pctx.closePath();
      pctx.lineJoin = "round"; pctx.lineWidth = 2.5; pctx.strokeStyle = "rgba(255,255,255,.92)"; pctx.stroke();
      pctx.fillStyle = "#ffe07a";
      pctx.beginPath(); pctx.arc(pts[0]!.x, pts[0]!.y, 2.2, 0, Math.PI * 2); pctx.fill();
      return card;
    });
    function loadTrack(i: number) {
      trackIdx = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
      track = TRACKS[trackIdx]!;
      theme = track.theme;
      road = track.build();
      N = road.length;
      trackLen = N * T.SEG_LEN;
      buildTrees();
      initTraffic();
      initRivals();
      applyDiff();
      buildMapPath();
      S.position = 0; S.lapTime = 0; S.lap = 0; S.lastLap = 0;
      const b = loadBest();
      bestSplits = b ? b.splits : null;
      curSplits = []; lastSeg = 0;
      S.bestLap = b ? b.time : 0;
      bestEl.textContent = S.bestLap ? fmtTime(S.bestLap) : "--:--.---";
      lastEl.textContent = "--:--.---";
      cards.forEach((c, ci) => c.classList.toggle("active", ci === trackIdx));
    }

    // ---------- mode picker (start screen): time trial or race difficulty ----------
    const modeKey = "lapracer.diff";
    try {
      const saved = localStorage.getItem(modeKey);
      const idx = MODES.findIndex((d) => d.id === saved);
      if (idx >= 0) modeIdx = idx;
    } catch { /* ignore */ }
    const modeBtns = MODES.map((d, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "diff-btn";
      btn.textContent = d.name;
      btn.addEventListener("click", () => { if (S.phase === "start") setMode(i); });
      diffsEl.appendChild(btn);
      return btn;
    });
    function applyDiff() {
      const diff = raceDiff();
      allowedSpeeds = road.length && diff ? buildAllowedSpeeds(road, T.SEG_LEN, diff, T.AI_CORNER) : [];
      modeBtns.forEach((b, bi) => b.classList.toggle("active", bi === modeIdx));
    }
    function setMode(i: number) {
      modeIdx = ((i % MODES.length) + MODES.length) % MODES.length;
      try { localStorage.setItem(modeKey, MODES[modeIdx]!.id); } catch { /* ignore */ }
      initRivals();
      applyDiff();
    }

    // ---------- dev tuning panel (` to toggle) ----------
    const tuningKey = "lapracer.tuning";
    try { // apply saved overrides
      const o = JSON.parse(localStorage.getItem(tuningKey) || "{}") as Record<string, number>;
      for (const kn of KNOBS) if (typeof o[kn.k] === "number") (T as Record<string, number>)[kn.k] = o[kn.k]!;
    } catch { /* ignore */ }
    const saveTuning = () => {
      try {
        const o: Record<string, number> = {};
        for (const kn of KNOBS) o[kn.k] = T[kn.k];
        localStorage.setItem(tuningKey, JSON.stringify(o));
      } catch { /* ignore */ }
    };
    const knobRefreshers: (() => void)[] = [];
    for (const kn of KNOBS) {
      const row = document.createElement("label");
      row.className = "dev-row";
      const lab = document.createElement("span");
      lab.textContent = kn.label;
      const inp = document.createElement("input");
      inp.type = "range";
      inp.min = String(kn.min); inp.max = String(kn.max); inp.step = String(kn.step);
      const val = document.createElement("span");
      val.className = "val";
      const refresh = () => { inp.value = String(T[kn.k]); val.textContent = String(T[kn.k]); };
      refresh();
      knobRefreshers.push(refresh);
      inp.addEventListener("input", () => {
        (T as Record<string, number>)[kn.k] = Number(inp.value);
        val.textContent = inp.value;
        saveTuning();
        if (kn.k === "AI_CORNER") applyDiff(); // braking map bakes this in — rebuild live
      });
      inp.addEventListener("change", () => inp.blur()); // give arrows back to steering
      row.append(lab, inp, val);
      devRowsEl.appendChild(row);
    }
    // sliders swallow their own keystrokes so tuning never fights the wheel
    const devKeys = (e: KeyboardEvent) => e.stopPropagation();
    devEl.addEventListener("keydown", devKeys);
    const onDevToggle = () => devEl.classList.toggle("open");
    const onDevReset = () => {
      Object.assign(T, TUNING_DEFAULTS);
      try { localStorage.removeItem(tuningKey); } catch { /* ignore */ }
      knobRefreshers.forEach((fn) => fn());
    };
    devBtn.addEventListener("click", onDevToggle);
    devResetBtn.addEventListener("click", onDevReset);

    // ---------- controls ----------
    const keys = new Set<string>();
    function startRace() {
      S.phase = "countdown";
      S.speed = 0; S.gear = 1; S.rpm = car.idle; S.position = 0; S.playerX = 0; S.steerVel = 0; S.driftVel = 0;
      S.gas = 0; S.brake = 0; S.throttle = 0; S.lapTime = 0; S.fuelCut = false;
      S.lap = 0; S.raceTime = 0; S.raceBest = 0;
      curSplits = []; lastSeg = 0; countdownStart = gameTime;
      initTraffic(); initRivals(); applyDiff();
      startEl.classList.add("hidden");
      resultsEl.classList.add("hidden");
      if (engine.on) { engine.ensure(); engine.resume(); }
    }
    function shift(dir: number) { S.gear = clamp(S.gear + dir, 1, car.gears); }
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (keys.has(k)) return;
      keys.add(k);
      if (S.phase === "start") { // menu navigation
        if (k === "arrowleft" || k === "a") { keys.delete(k); loadTrack(trackIdx - 1); return; }
        if (k === "arrowright" || k === "d") { keys.delete(k); loadTrack(trackIdx + 1); return; }
        if (k === "arrowup" || k === "arrowdown") { keys.delete(k); setMode(modeIdx + (k === "arrowdown" ? 1 : -1)); return; }
      }
      if (k === "enter" || k === "r" || (k === " " && S.phase === "start")) startRace();
      else if (k === "escape") { // back to the circuit-select screen
        S.phase = "start"; S.speed = 0;
        startEl.classList.remove("hidden");
        resultsEl.classList.add("hidden");
        bannerEl.className = "banner";
      }
      else if (k === "`") devEl.classList.toggle("open");
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

      const rpm = clamp(speedToRPM(S.speed, S.gear), 0, car.mechMax);
      S.fuelCut = rpm >= car.revLimit;
      const engineT = S.fuelCut ? 0 : S.throttle * car.maxTq * torqueAt(rpm);
      const driveForce = clamp((engineT * gt) / car.wheelR, -car.grip, car.grip);
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

      // steering + cornering. The car does NOT auto-follow the road: a corner pumps
      // outward drift MOMENTUM (v²/r — quadratic in speed), so the car tries to keep
      // going straight while the road bends away underneath it. Grip bleeds the drift
      // off once the road straightens, so exits carry a slide you must counter-steer.
      const speedPct = clamp(S.speed / 290, 0, 1);
      const seg = road[Math.floor(S.position / T.SEG_LEN) % N]!;
      const steerIn = (keys.has("arrowleft") || keys.has("a") ? -1 : 0) + (keys.has("arrowright") || keys.has("d") ? 1 : 0);
      // slidey steering: input eases into a lateral velocity (loose, not on-rails)
      const steerTarget = steerIn * T.STEER * (0.45 + 0.55 * speedPct);
      S.steerVel += (steerTarget - S.steerVel) * Math.min(1, dt * T.STEER_SLIDE);
      S.driftVel -= seg.curve * speedPct * speedPct * T.CENTRIFUGAL * dt;
      S.driftVel -= S.driftVel * Math.min(1, dt * T.GRIP_RECOVER);
      S.playerX += (S.steerVel + S.driftVel) * dt;
      S.playerX = clamp(S.playerX, -3.4, 3.4);

      const before = S.position;
      S.position += S.speed * T.POS_K * dt;
      S.lapTime += dt;
      S.raceTime += dt;
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
      S.raceBest = S.raceBest ? Math.min(S.raceBest, S.lastLap) : S.lastLap;
      lastEl.textContent = fmtTime(S.lastLap);
      let newBest = false;
      if (!S.bestLap || S.lastLap < S.bestLap) {
        S.bestLap = S.lastLap;
        bestSplits = curSplits.slice();
        saveBest(S.bestLap, bestSplits);
        bestEl.textContent = fmtTime(S.bestLap);
        newBest = true;
        flashBanner("★ NEW BEST LAP  " + fmtTime(S.bestLap), "best");
      } else {
        flashBanner("LAP " + S.lap + "  " + fmtTime(S.lastLap), "info");
      }
      S.lapTime = 0; curSplits = []; lastSeg = 0;
      // time trial never ends — lap forever chasing the record; races finish after N laps
      if (raceDiff() && S.lap >= T.RACE_LAPS) finishRace(newBest);
    }
    function finishRace(newBest: boolean) {
      S.phase = "finished";
      const place = playerPlace();
      resPosEl.textContent = `P${place} / ${rivals.length + 1}`;
      resTotalEl.textContent = fmtTime(S.raceTime);
      resBestEl.textContent = fmtTime(S.raceBest);
      const notes: string[] = [];
      if (place === 1) notes.push("★ YOU WIN ★");
      if (newBest) notes.push("★ NEW TRACK RECORD ★");
      resNoteEl.textContent = notes.join("  ·  ");
      resultsEl.classList.remove("hidden");
      bannerEl.className = "banner"; // don't flash a lap banner over the card
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

    function fog(color: Col, amount: number): string {
      const f = theme.fog;
      return `rgb(${Math.round(lerp(color[0], f[0], amount))},${Math.round(lerp(color[1], f[1], amount))},${Math.round(lerp(color[2], f[2], amount))})`;
    }

    function drawRoad() {
      const { w: W, h: H } = roadSize;
      const halfW = W / 2;
      const horizon = H * 0.42;

      // judder — the view rattles while plowing through grass, harder on an impact
      const shake = (Math.abs(S.playerX) > 1 && S.speed > 4 ? 7 : 0) + impactFlash * 13;
      rctx.save();
      if (shake > 0) rctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

      const sky = rctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, theme.sky[0]); sky.addColorStop(0.6, theme.sky[1]); sky.addColorStop(1, theme.sky[2]);
      rctx.fillStyle = sky; rctx.fillRect(0, 0, W, horizon);
      const sun = rctx.createRadialGradient(W * 0.68, horizon * 0.82, 3, W * 0.68, horizon * 0.82, W * 0.5);
      sun.addColorStop(0, "rgba(255,244,214,.95)"); sun.addColorStop(0.25, "rgba(255,224,168,.4)"); sun.addColorStop(1, "rgba(255,224,168,0)");
      rctx.fillStyle = sun; rctx.fillRect(0, 0, W, horizon);
      const ground = rctx.createLinearGradient(0, horizon, 0, H);
      ground.addColorStop(0, theme.ground[0]); ground.addColorStop(1, theme.ground[1]);
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

      // pass 1 (near→far): project + accumulate curvature, keep only the visible rows
      type P = ReturnType<typeof project>;
      type Row = { seg: Segment; p1: P; p2: P; f: number };
      const rows: Row[] = [];
      const rowBySeg = new Map<number, Row>();
      for (let n = 0; n < T.DRAW_DISTANCE; n++) {
        const seg = road[(base + n) % N]!;
        const camZ1 = (base + n) * T.SEG_LEN - S.position;
        const camZ2 = (base + n + 1) * T.SEG_LEN - S.position;
        const p1 = project(x, camZ1, cameraX);
        const p2 = project(x + dx, camZ2, cameraX);
        x += dx; dx += seg.curve;
        if (camZ1 <= T.CAMERA_DEPTH || p2.y >= maxy || p2.y >= p1.y) continue;
        const f = 1 - Math.exp(-T.FOG_DENSITY * Math.pow(n / T.DRAW_DISTANCE, 1.6));
        const row = { seg, p1, p2, f };
        rows.push(row);
        rowBySeg.set(seg.index, row);
        maxy = p2.y;
      }

      // pass 2 (far→near): paint each segment's road THEN its trees, so nearer road
      // correctly covers billboards sitting beside a distant corner
      for (let i = rows.length - 1; i >= 0; i--) {
        const { seg, p1, p2, f } = rows[i]!;
        const dark = Math.floor(seg.index / T.RUMBLE_GROUP) % 2 === 0;
        rctx.fillStyle = fog(dark ? theme.grass[0] : theme.grass[1], f);
        rctx.fillRect(0, p2.y, W, p1.y - p2.y);
        quad(rctx, p1.x, p1.y, p1.w * 1.12, p2.x, p2.y, p2.w * 1.12, fog(dark ? [200, 16, 46] : [235, 235, 235], f));
        quad(rctx, p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, fog(dark ? [60, 64, 70] : [66, 70, 76], f));
        if (seg.index < 3) checker(rctx, p1.x, p1.y, p1.w, p2.x, p2.y, p2.w);
        else if (dark) quad(rctx, p1.x, p1.y, p1.w * 0.03, p2.x, p2.y, p2.w * 0.03, fog([242, 190, 58], f));
        // stop drawing trees once they're deep in the haze — far trees bunch at the
        // vanishing point and can smear across the distant road; fog hides the cutoff
        const trees = f < 0.5 ? treesBySeg.get(seg.index) : undefined;
        if (trees) for (const ox of trees) {
          // hard guarantee: a tree is never drawn within the road, whatever the stored value
          const oxs = (ox < 0 ? -1 : 1) * Math.max(2.4, Math.abs(ox));
          drawTree(rctx, fog, p1.x + oxs * p1.w, p1.y, p1.w, f, theme.tree);
        }
      }
      // traffic + rival sprites: placed by each car's TRUE position (interpolated inside
      // its segment) so the sprite is exactly where the hitbox is; drawn far→near. A car
      // whose row was culled is inside the near plane — by then it has already slid off
      // the bottom edge of the screen, which is also where the collision plane sits.
      const sprites: { x: number; y: number; w: number; f: number; c: Col; v: number }[] = [];
      const pushSprite = (pos: number, laneX: number, c: Col, v: number) => {
        const row = rowBySeg.get(Math.floor(pos / T.SEG_LEN) % N);
        if (!row) return;
        const fr = (pos % T.SEG_LEN) / T.SEG_LEN;
        const w = lerp(row.p1.w, row.p2.w, fr);
        sprites.push({
          x: lerp(row.p1.x, row.p2.x, fr) + laneX * w,
          y: lerp(row.p1.y, row.p2.y, fr),
          w, f: row.f, c, v,
        });
      };
      for (const t of traffic) pushSprite(t.pos, t.x, t.color, t.variant);
      for (const r of rivals) pushSprite(r.pos, r.x, r.color, 3);
      sprites.sort((a, b) => a.y - b.y);
      for (const sp of sprites) drawTrafficCar(rctx, fog, sp.x, sp.y, sp.w, sp.f, sp.c, sp.v);
      drawPlayerCar(rctx, W, H, S);
      // impact feedback: a red vignette that blooms in from the edges and fades — no popup
      if (impactFlash > 0) {
        const vg = rctx.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H);
        vg.addColorStop(0, "rgba(200,16,46,0)");
        vg.addColorStop(1, `rgba(200,16,46,${(impactFlash * 0.55).toFixed(3)})`);
        rctx.fillStyle = vg;
        rctx.fillRect(0, 0, W, H);
      }
      rctx.restore();
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

    // ---------- rendering: minimap (closed circuit + all racers) ----------
    let mapPath: { x: number; y: number }[] = [];
    function buildMapPath() {
      mapPath = road.length ? tracePath(road, mapSize.w, mapSize.h, 12) : [];
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
      for (const r of rivals) {
        const rp = mapPath[Math.floor(r.pos / T.SEG_LEN) % N]!;
        mctx.fillStyle = `rgb(${r.color[0]},${r.color[1]},${r.color[2]})`;
        mctx.beginPath(); mctx.arc(rp.x, rp.y, 3, 0, Math.PI * 2); mctx.fill();
      }
      const p = mapPath[Math.floor(S.position / T.SEG_LEN) % N]!;
      mctx.fillStyle = "#c8102e"; mctx.shadowColor = "rgba(200,16,46,.9)"; mctx.shadowBlur = 8;
      mctx.beginPath(); mctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); mctx.fill(); mctx.shadowBlur = 0;
    }

    // ---------- audio ----------
    const engine = createEngineAudio(car);
    function toggleSound() {
      const on = engine.toggle();
      soundBtn.textContent = "Sound: " + (on ? "On" : "Off");
      soundBtn.classList.toggle("on", on);
    }

    // ---------- HUD ----------
    function syncDOM() {
      speedEl.textContent = String(Math.round(S.speed * 0.621371));
      rpmEl.textContent = String(Math.round(S.rpm));
      gearEl.textContent = String(S.gear);
      const inRace = S.phase === "racing" || S.phase === "countdown";
      if (raceDiff()) {
        const curLap = inRace ? Math.min(S.lap + 1, T.RACE_LAPS) : S.lap;
        lapNumEl.textContent = curLap + "/" + T.RACE_LAPS;
        posEl.textContent = inRace || S.phase === "finished" ? "P" + playerPlace() : "–";
      } else {
        lapNumEl.textContent = String(inRace ? S.lap + 1 : S.lap);
        posEl.textContent = "TT";
      }
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

      if (impactFlash > 0) impactFlash = Math.max(0, impactFlash - dt * 2.2);
      if (S.phase === "countdown") {
        const remain = 3 - (gameTime - countdownStart);
        if (remain <= 0) { S.phase = "racing"; S.lapTime = 0; lastSeg = 0; curSplits = []; flashBanner("GO!", "go"); }
        else flashBanner(String(Math.ceil(remain)), "count");
        physics(dt);
      } else if (S.phase === "racing") {
        const steps = 5, sdt = dt / steps;
        for (let i = 0; i < steps; i++) physics(sdt);
        updateTraffic(dt);
        runRivals(dt);
      } else {
        physics(dt); // start screen / results — idle
        if (S.phase === "finished") updateTraffic(dt); // traffic keeps cruising behind the card
      }

      engine.update(S.rpm, S.throttle);
      drawRoad();
      drawTach();
      drawMap();
      syncDOM();
      raf = requestAnimationFrame(frame);
    }

    loadTrack(0);
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
      devBtn.removeEventListener("click", onDevToggle);
      devResetBtn.removeEventListener("click", onDevReset);
      devEl.removeEventListener("keydown", devKeys);
      // strict-mode double-mount would duplicate the imperatively-built rows/cards
      tracksEl.replaceChildren();
      devRowsEl.replaceChildren();
      diffsEl.replaceChildren();
      engine.dispose();
    };
  }, []);

  return (
    <div className="lap" ref={rootRef}>
      <style>{CSS}</style>

      <div className="lap-stage">
        <div className="lap-top">
          <div className="lap-brand">
            <h1>APEX<span className="dot">·</span></h1>
            <span className="tag">beat the pack · beat the clock</span>
          </div>
          <button className="sound-btn" data-el="devBtn" type="button">Tune</button>
          <button className="sound-btn on" data-el="soundBtn" type="button">Sound: On</button>
        </div>

        <div className="road-wrap">
          <canvas className="road" ref={roadRef} />
          <div className="crt" />

          <div className="hud-timing">
            <div className="lap-line big"><span className="k">LAP</span><span className="v" data-el="lapTime">0:00.000</span></div>
            <div className="lap-line"><span className="k">BEST</span><span className="v best" data-el="best">--:--.---</span></div>
            <div className="lap-line"><span className="k">LAST</span><span className="v" data-el="last">--:--.---</span></div>
          </div>

          <div className="delta" data-el="delta">+0.00</div>

          <div className="hud-map">
            <canvas ref={mapRef} />
            <span className="lapcount">Lap <b data-el="lapNum">0/4</b> · <b className="pos" data-el="pos">–</b></span>
          </div>

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

          {/* dev tuning panel (`) */}
          <div className="dev" data-el="dev">
            <h3>TUNING</h3>
            <div className="dev-rows" data-el="devRows" />
            <button className="dev-reset" data-el="devReset" type="button">reset defaults</button>
          </div>

          {/* race results */}
          <div className="results hidden" data-el="results">
            <div className="results-card">
              <div className="results-title">FINISH</div>
              <div className="rrow"><span>POSITION</span><b data-el="resPos">–</b></div>
              <div className="rrow"><span>RACE TIME</span><b data-el="resTotal">--:--.---</b></div>
              <div className="rrow"><span>BEST LAP</span><b data-el="resBest">--:--.---</b></div>
              <div className="results-note" data-el="resNote" />
              <div className="results-hint">ENTER race again · ESC circuits</div>
            </div>
          </div>

          {/* retro California start screen */}
          <div className="start-screen" data-el="start">
            <div className="start-grid" />
            <div className="start-sun" />
            <div className="start-inner">
              <div className="start-kicker">CHAMPIONSHIP</div>
              <h2 className="start-title">APEX</h2>
              <div className="start-sub">outrun the pack · set the record</div>
              <div className="track-picker" data-el="tracks" />
              <div className="diff-picker" data-el="diffs" />
              <div className="track-hint">◂ ▸ circuit · ▲ ▾ rivals</div>
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
          <span><b>Esc</b> circuits</span>
          <span><b>{"`"}</b> tune</span>
          <span><b>M</b> mute</span>
        </div>
      </div>
    </div>
  );
}
