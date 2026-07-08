import { useEffect, useRef } from "react";

/**
 * SHIFT SCHOOL — a manual-driving trainer.
 *
 * A little cockpit for practicing the clutch / gas / shifter dance across a few
 * very different cars. The clutch model is a torque-balance engine + friction
 * clutch, so dumping the clutch with no gas stalls, gas-plus-ease launches
 * cleanly, braking to a stop in gear stalls you, and a money-shift over-revs and
 * blows the motor. Everything car-specific (ratios, redline, torque, mass, sound)
 * lives in the CARS table, so cars are hot-swappable data.
 *
 * It's imperative by nature (canvas + rAF + a physics loop), so the whole game
 * lives in one useEffect; React just owns structure. The fast-changing HUD is
 * written straight to the DOM via refs to avoid 60fps re-renders. All styles are
 * scoped under `.mx5` so nothing leaks into the app.
 */

interface CarSound {
  wave: OscillatorType;
  base: number; // idle tone (Hz)
  pitch: number; // Hz added per rpm
  cutoff: number; // lowpass base
  cutoffPerRpm: number;
  gain: number; // overall loudness
  sub: number; // octave-down rumble level (V8 / muscle)
  subMul: number; // sub-oscillator frequency multiplier
  whistle: number; // turbo whistle level (0 = none)
  noise: number; // induction / exhaust texture
}

interface Car {
  id: string;
  name: string;
  badge: string; // short spec line
  idle: number;
  redline: number; // red-zone start & over-rev damage threshold
  revLimit: number; // electronic fuel cut
  mechMax: number; // absolute mechanical ceiling
  stall: number;
  maxTq: number;
  tqPeak: number;
  tqWidth: number; // bigger = flatter torque curve
  engineI: number; // rotating inertia — bigger = lazier revs
  clutchTq: number;
  slipRef: number;
  final: number;
  wheelR: number;
  mass: number;
  roll: number;
  aero: number;
  brakeMax: number;
  grip: number; // max tractive force (N) — the traction/wheelspin limit
  gears: number; // forward gears (5 or 6)
  ratios: Record<number, number>; // -1 (R) .. gears
  shift: { cruise: number; race: number }; // shift-light points
  target: { cruise: number; race: number }; // ideal-gear targets for the assist
  sound: CarSound;
}

const CARS: Car[] = [
  {
    id: "na", name: "MX-5 NA", badge: "1.6 I4 · 5-speed · 7,000 rpm",
    idle: 850, redline: 7000, revLimit: 7200, mechMax: 9500, stall: 500,
    maxTq: 135, tqPeak: 4800, tqWidth: 4800, engineI: 0.011, clutchTq: 150, slipRef: 400,
    final: 4.30, wheelR: 0.29, mass: 980, roll: 150, aero: 0.42, brakeMax: 8500, grip: 5000, gears: 5,
    ratios: { [-1]: -3.758, 1: 3.136, 2: 1.888, 3: 1.330, 4: 1.000, 5: 0.814 },
    shift: { cruise: 2900, race: 6300 }, target: { cruise: 2900, race: 5600 },
    sound: { wave: "sawtooth", base: 26, pitch: 0.028, cutoff: 500, cutoffPerRpm: 0.35, gain: 1.0, sub: 0.12, subMul: 0.5, whistle: 0, noise: 0.12 },
  },
  {
    id: "nd", name: "MX-5 ND", badge: "2.0 I4 · 6-speed · 7,500 rpm",
    idle: 800, redline: 7200, revLimit: 7500, mechMax: 9800, stall: 550,
    maxTq: 205, tqPeak: 4600, tqWidth: 5200, engineI: 0.014, clutchTq: 235, slipRef: 420,
    final: 2.866, wheelR: 0.305, mass: 1058, roll: 165, aero: 0.44, brakeMax: 9800, grip: 6800, gears: 6,
    ratios: { [-1]: -3.76, 1: 3.583, 2: 2.100, 3: 1.446, 4: 1.088, 5: 0.831, 6: 0.723 },
    shift: { cruise: 2600, race: 6800 }, target: { cruise: 2700, race: 6000 },
    sound: { wave: "sawtooth", base: 28, pitch: 0.027, cutoff: 560, cutoffPerRpm: 0.36, gain: 1.0, sub: 0.16, subMul: 0.5, whistle: 0, noise: 0.16 },
  },
  {
    id: "v8", name: "V8 Muscle", badge: "5.0 V8 · 6-speed · torque monster",
    idle: 720, redline: 7000, revLimit: 7200, mechMax: 8500, stall: 450,
    maxTq: 560, tqPeak: 4700, tqWidth: 5400, engineI: 0.09, clutchTq: 620, slipRef: 500,
    final: 3.55, wheelR: 0.34, mass: 1740, roll: 260, aero: 0.60, brakeMax: 13500, grip: 12500, gears: 6,
    ratios: { [-1]: -3.28, 1: 3.657, 2: 2.430, 3: 1.690, 4: 1.320, 5: 1.000, 6: 0.650 },
    shift: { cruise: 2200, race: 6600 }, target: { cruise: 2300, race: 5600 },
    sound: { wave: "sawtooth", base: 20, pitch: 0.015, cutoff: 360, cutoffPerRpm: 0.26, gain: 1.15, sub: 0.55, subMul: 0.5, whistle: 0, noise: 0.28 },
  },
  {
    id: "turbo", name: "Turbo AWD", badge: "2.0 turbo · 6-speed · all-wheel drive",
    idle: 800, redline: 6700, revLimit: 6900, mechMax: 8000, stall: 550,
    maxTq: 400, tqPeak: 3400, tqWidth: 6500, engineI: 0.05, clutchTq: 430, slipRef: 460,
    final: 3.90, wheelR: 0.31, mass: 1500, roll: 220, aero: 0.55, brakeMax: 12500, grip: 13000, gears: 6,
    ratios: { [-1]: -3.50, 1: 3.636, 2: 2.235, 3: 1.590, 4: 1.137, 5: 0.891, 6: 0.707 },
    shift: { cruise: 2500, race: 6200 }, target: { cruise: 2600, race: 5200 },
    sound: { wave: "sawtooth", base: 26, pitch: 0.023, cutoff: 520, cutoffPerRpm: 0.32, gain: 1.0, sub: 0.30, subMul: 0.5, whistle: 0.45, noise: 0.20 },
  },
];

interface GameState {
  engineOn: boolean;
  stalled: boolean;
  blown: boolean;
  rpm: number;
  speed: number; // km/h, signed
  gear: number; // -1 R, 0 N, 1..gears
  clutch: number; // 0 engaged .. 1 disengaged
  gas: number;
  throttle: number;
  brake: number;
  grindTimer: number;
  roadOffset: number;
  overrev: number;
  mode: "cruise" | "race";
  assist: boolean;
}

const FONT_LABEL = '"Helvetica Neue","Segoe UI",system-ui,-apple-system,sans-serif';

export function ManualDriving() {
  const rootRef = useRef<HTMLDivElement>(null);
  const roadRef = useRef<HTMLCanvasElement>(null);
  const tachRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const roadCanvas = roadRef.current;
    const tachCanvas = tachRef.current;
    if (!root || !roadCanvas || !tachCanvas) return;

    let car: Car = CARS[0]!;
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const ratio = (g: number) => car.ratios[g] ?? 0;

    const S: GameState = {
      engineOn: false, stalled: false, blown: false, rpm: 0, speed: 0, gear: 0,
      clutch: 0, gas: 0, throttle: 0, brake: 0, grindTimer: 0, roadOffset: 0,
      overrev: 0, mode: "cruise", assist: false,
    };

    const input = { clutch: 0, gas: 0, brake: 0 };
    const RAMP: Record<"clutch" | "gas" | "brake", [number, number]> = {
      clutch: [7, 6], gas: [4.5, 6], brake: [7, 8],
    };
    const keys = new Set<string>();

    function speedToRPM(speedKmh: number, gear: number) {
      if (gear === 0) return 0;
      const mps = Math.abs(speedKmh) / 3.6;
      const wheelRevPerSec = mps / (2 * Math.PI * car.wheelR);
      return wheelRevPerSec * Math.abs(ratio(gear)) * car.final * 60;
    }
    function torqueAt(rpm: number) {
      const t = 1 - Math.pow((rpm - car.tqPeak) / car.tqWidth, 2) * 0.55;
      return Math.max(0.40, Math.min(1, t));
    }

    // ---------- DOM handles ----------
    const q = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector(sel) as T;
    const speedEl = q('[data-el="speed"]');
    const rpmEl = q('[data-el="rpm"]');
    const kmhEl = q('[data-el="kmh"]');
    const fillClutch = q('[data-el="fillClutch"]');
    const fillBrake = q('[data-el="fillBrake"]');
    const fillGas = q('[data-el="fillGas"]');
    const coachEl = q('[data-el="coach"]');
    const lampN = q('[data-el="lampN"]');
    const lampClutch = q('[data-el="lampClutch"]');
    const lampShift = q('[data-el="lampShift"]');
    const lampStall = q('[data-el="lampStall"]');
    const lampRev = q('[data-el="lampRev"]');
    const overlayEl = q('[data-el="overlay"]');
    const soundBtn = q('[data-el="soundBtn"]');
    const assistBtn = q('[data-el="assistBtn"]');
    const carMetaEl = q('[data-el="carMeta"]');
    const assistEl = q('[data-el="assist"]');
    const modeCruiseBtn = q('[data-el="modeCruise"]');
    const modeRaceBtn = q('[data-el="modeRace"]');
    const gN = q('[data-el="gN"]');
    const g6cell = q('[data-el="g6cell"]');
    const timerHudEl = q('[data-el="timerHud"]');
    const zero60El = q('[data-el="zero60"]');
    const runBtn = q('[data-el="runBtn"]');
    const statsCarNameEl = q('[data-el="statsCarName"]');
    const statsBestEl = q('[data-el="statsBest"]');
    const statsRecentEl = q('[data-el="statsRecent"]');
    const gEls: Record<string, HTMLElement> = {};
    root.querySelectorAll<HTMLElement>("[data-gear]").forEach((e) => { gEls[e.dataset.gear!] = e; });
    const carBtns = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-car]"));

    // ---------- 0–60 timing ----------
    let gameTime = 0;
    let runPhase: "idle" | "countdown" | "armed" | "timing" | "done" | "aborted" = "idle";
    let runT0 = 0, runElapsed = 0, countdownEnd = 0, runResult = 0, runNewBest = false, runMsgUntil = 0;
    const runs: Record<string, number[]> = {}; // completed 0–60 times per car (chronological)
    function loadRuns(id: string): number[] {
      try { const v = localStorage.getItem("shiftschool.runs." + id); const a = v ? JSON.parse(v) : []; return Array.isArray(a) ? a.filter((n) => typeof n === "number" && Number.isFinite(n)) : []; } catch { return []; }
    }
    function saveRuns(id: string, arr: number[]) {
      try { localStorage.setItem("shiftschool.runs." + id, JSON.stringify(arr)); } catch { /* storage may be unavailable */ }
    }
    function renderStats() {
      const arr = runs[car.id] ?? [];
      const best = arr.length ? Math.min(...arr) : null;
      zero60El.textContent = best != null ? best.toFixed(2) + "s" : "—";
      statsCarNameEl.textContent = car.name;
      const fastest = [...arr].sort((a, b) => a - b).slice(0, 3);
      const recent = arr.slice(-5).reverse();
      statsBestEl.innerHTML = fastest.length
        ? fastest.map((t, i) => `<li><span class="rk">${i + 1}</span><span class="tm${i === 0 ? " pb" : ""}">${t.toFixed(2)}s</span></li>`).join("")
        : `<li class="empty">No runs yet</li>`;
      statsRecentEl.innerHTML = recent.length
        ? recent.map((t) => `<li><span class="tm${best != null && t === best ? " pb" : ""}">${t.toFixed(2)}s</span></li>`).join("")
        : `<li class="empty">No runs yet</li>`;
    }
    function startRun() {
      if (Math.abs(S.speed) > 2) return; // must be at a standstill
      if (!S.engineOn) startEngine();
      setMode("race"); // a 0–60 run wants race shift points
      runPhase = "countdown";
      countdownEnd = gameTime + 3;
    }
    function updateRun() {
      const mph = Math.abs(S.speed) * 0.621371;
      if (runPhase === "countdown" && gameTime >= countdownEnd) runPhase = "armed";
      if (runPhase === "armed" && Math.abs(S.speed) > 2) { runPhase = "timing"; runT0 = gameTime; }
      if (runPhase === "timing") {
        runElapsed = gameTime - runT0;
        if (S.stalled || S.blown) { runPhase = "aborted"; runMsgUntil = gameTime + 3; }
        else if (mph >= 60) {
          runResult = runElapsed; runPhase = "done"; runMsgUntil = gameTime + 6;
          const arr = runs[car.id] ?? (runs[car.id] = []);
          const prevBest = arr.length ? Math.min(...arr) : null;
          runNewBest = prevBest == null || runResult < prevBest;
          arr.push(Number(runResult.toFixed(2)));
          if (arr.length > 50) arr.splice(0, arr.length - 50);
          saveRuns(car.id, arr);
          renderStats();
        } else if (runElapsed > 30) { runPhase = "aborted"; runMsgUntil = gameTime + 3; }
      }
      if ((runPhase === "aborted" || runPhase === "done") && gameTime > runMsgUntil) runPhase = "idle";

      let txt = "", cls = "";
      if (runPhase === "countdown") { txt = String(Math.max(1, Math.ceil(countdownEnd - gameTime))); cls = "count"; }
      else if (runPhase === "armed") { txt = "GO!"; cls = "go"; }
      else if (runPhase === "timing") { txt = runElapsed.toFixed(1) + "s"; cls = "timing"; }
      else if (runPhase === "done") { txt = `0–60 in ${runResult.toFixed(2)}s${runNewBest ? "  ★ NEW BEST" : ""}`; cls = "done" + (runNewBest ? " best" : ""); }
      else if (runPhase === "aborted") { txt = "Run aborted"; cls = "abort"; }
      timerHudEl.textContent = txt;
      timerHudEl.className = "timer-hud" + (txt ? " show " + cls : "");
    }

    // ---------- controls ----------
    function tryShift(gear: number) {
      if (gear > car.gears) return; // this car doesn't have that gear
      if (S.gear === gear) return;
      if (S.clutch < 0.6) { S.grindTimer = 1.1; return; }
      S.gear = gear;
    }
    function startEngine() {
      // a running engine in gear with the clutch out would instantly re-stall, so if the
      // clutch isn't in, pop to neutral first — makes restarts reliable instead of grinding.
      if (S.gear !== 0 && S.clutch < 0.5) S.gear = 0;
      S.engineOn = true; S.stalled = false; S.blown = false; S.overrev = 0; S.rpm = car.idle;
      overlayEl.classList.add("hidden");
      ensureAudio();
      if (audio && audio.state === "suspended") audio.resume();
    }
    function setMode(m: "cruise" | "race") {
      S.mode = m;
      modeCruiseBtn.classList.toggle("active", m === "cruise");
      modeRaceBtn.classList.toggle("active", m === "race");
    }
    function setAssist(on: boolean) {
      S.assist = on;
      assistBtn.textContent = "Assist: " + (on ? "On" : "Off");
      assistBtn.classList.toggle("on", on);
      assistEl.style.display = on ? "" : "none";
    }
    function selectCar(id: string) {
      const next = CARS.find((c) => c.id === id);
      if (!next) return;
      car = next;
      // reset dynamics for the new car (keep it running if it already was)
      S.stalled = false; S.blown = false; S.overrev = 0; S.speed = 0; S.gear = 0;
      S.clutch = 0; S.gas = 0; S.throttle = 0; S.brake = 0;
      S.rpm = S.engineOn ? car.idle : 0;
      carBtns.forEach((b) => b.classList.toggle("active", b.dataset.car === id));
      carMetaEl.textContent = `${car.name} — ${car.badge}`;
      g6cell.style.visibility = car.gears >= 6 ? "visible" : "hidden";
      runs[car.id] = loadRuns(car.id);
      runPhase = "idle";
      timerHudEl.className = "timer-hud";
      timerHudEl.textContent = "";
      renderStats();
      applyCarSound();
    }
    function cycleCar() {
      const i = CARS.findIndex((c) => c.id === car.id);
      selectCar(CARS[(i + 1) % CARS.length]!.id);
    }

    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if ([" ", "arrowup", "arrowdown"].includes(k)) e.preventDefault();
      if (keys.has(e.key)) return;
      keys.add(e.key);
      if (k === "enter") startEngine();
      else if (k === "m") toggleSound();
      else if (k === "t") setMode(S.mode === "cruise" ? "race" : "cruise");
      else if (k === "p") setAssist(!S.assist);
      else if (k === "c") cycleCar();
      else if (k === "g") startRun();
      else if (k >= "1" && k <= "6") tryShift(Number(k));
      else if (k === "0" || k === "n") tryShift(0);
      else if (k === "r") tryShift(-1);
    }
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key);
    const onBlur = () => keys.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    const onSound = () => toggleSound();
    const onAssist = () => setAssist(!S.assist);
    const onRun = () => startRun();
    const onModeCruise = () => setMode("cruise");
    const onModeRace = () => setMode("race");
    const carHandlers = carBtns.map((b) => {
      const h = () => selectCar(b.dataset.car!);
      b.addEventListener("click", h);
      return [b, h] as const;
    });
    soundBtn.addEventListener("click", onSound);
    assistBtn.addEventListener("click", onAssist);
    runBtn.addEventListener("click", onRun);
    modeCruiseBtn.addEventListener("click", onModeCruise);
    modeRaceBtn.addEventListener("click", onModeRace);

    function readInputTargets() {
      input.clutch = keys.has(" ") ? 1 : 0;
      input.gas = keys.has("ArrowUp") || keys.has("w") || keys.has("W") ? 1 : 0;
      input.brake = keys.has("ArrowDown") || keys.has("s") || keys.has("S") ? 1 : 0;
    }
    function ramp(cur: number, target: number, rates: [number, number], dt: number) {
      const rate = target > cur ? rates[0] : rates[1];
      const stepv = rate * dt;
      if (Math.abs(target - cur) <= stepv) return target;
      return cur + Math.sign(target - cur) * stepv;
    }

    // ---------- physics ----------
    function physics(dt: number) {
      readInputTargets();
      S.clutch = ramp(S.clutch, input.clutch, RAMP.clutch, dt);
      S.gas = ramp(S.gas, input.gas, RAMP.gas, dt);
      S.brake = ramp(S.brake, input.brake, RAMP.brake, dt);
      S.throttle = S.gas;
      if (S.grindTimer > 0) S.grindTimer -= dt;

      const running = S.engineOn && !S.stalled && !S.blown;
      const gt = ratio(S.gear) * car.final;
      const coupling = S.gear !== 0 ? 1 - S.clutch : 0;
      const syncRPM = speedToRPM(S.speed, S.gear);
      let clutchT = 0;

      if (running) {
        const fuelCut = S.rpm >= car.revLimit;
        let engineT = fuelCut ? 0 : S.throttle * car.maxTq * torqueAt(S.rpm);
        if (S.rpm < car.idle) engineT += (car.idle - S.rpm) * 0.7 * (1 - coupling);
        // internal friction: light at wide-open throttle, strong off-throttle (engine braking)
        engineT -= (4 + S.rpm * 0.0045) * (0.35 + (1 - S.throttle) * 1.65);

        if (coupling > 0.001 && S.gear !== 0) {
          const slip = S.rpm - syncRPM;
          clutchT = coupling * car.clutchTq * clamp(slip / car.slipRef, -1, 1);
          // traction limit: tires can only put down so much force before they spin, so a
          // clutch dump can't launch harder than grip allows (mainly bites in 1st gear).
          const gripTq = (car.grip * car.wheelR) / Math.max(0.2, Math.abs(gt));
          clutchT = clamp(clutchT, -gripTq, gripTq);
          engineT -= clutchT;
        }

        S.rpm += (engineT / car.engineI) * dt;
        // engaged clutch locks the engine to the wheels; if the wheels spin FASTER
        // (money-shift / botched downshift) they drag it past the limiter. Upward-only.
        if (coupling > 0.5 && S.gear !== 0 && syncRPM > S.rpm) {
          const lock = (coupling - 0.5) / 0.5;
          S.rpm += (syncRPM - S.rpm) * lock * clamp(dt * 25, 0, 1);
        }
        S.rpm = clamp(S.rpm, 0, car.mechMax);

        // over-rev damage: bouncing the limiter is cheap; a money-shift or sitting on it blows it
        if (S.rpm > car.redline) S.overrev += Math.pow((S.rpm - car.redline) / 500, 2) * dt * 0.8;
        else S.overrev = Math.max(0, S.overrev - dt * 0.15);
        if (S.overrev >= 1) S.blown = true;

        // stall vs bog: open throttle keeps it alive (clutch slips); closed throttle kills it
        if (S.rpm < car.stall) {
          if (S.throttle < 0.15) { S.stalled = true; S.rpm = clamp(S.rpm, 0, car.stall); }
          else S.rpm = car.stall + 40;
        }
      } else {
        S.rpm = Math.max(0, S.rpm - 2600 * dt);
        clutchT = 0;
      }

      const mps = S.speed / 3.6;
      const driveForce = running && S.gear !== 0 && coupling > 0.001 ? (clutchT * gt) / car.wheelR : 0;
      let stallDrag = 0;
      if ((S.stalled || S.blown) && S.gear !== 0 && 1 - S.clutch > 0.3) stallDrag = Math.sign(mps) * 4200;
      const resist = (Math.abs(mps) > 0.01 ? Math.sign(mps) : 0) * car.roll + car.aero * mps * Math.abs(mps);
      const brakeF = S.brake * car.brakeMax * (Math.abs(mps) > 0.05 ? Math.sign(mps) : 0);
      const net = driveForce - resist - brakeF - stallDrag;
      let newMps = mps + (net / car.mass) * dt;
      if (driveForce === 0 && Math.sign(newMps) !== Math.sign(mps) && Math.abs(mps) < 2) newMps = 0;
      S.speed = newMps * 3.6;
      if (Math.abs(S.speed) < 0.04) S.speed = 0;

      // safety net: never let a non-finite value poison the loop (clamp() preserves NaN)
      if (!Number.isFinite(S.rpm)) S.rpm = running ? car.idle : 0;
      if (!Number.isFinite(S.speed)) S.speed = 0;
      if (!Number.isFinite(S.clutch)) S.clutch = 0;
      if (!Number.isFinite(S.gas)) S.gas = 0;
      if (!Number.isFinite(S.brake)) S.brake = 0;
      if (!Number.isFinite(S.throttle)) S.throttle = 0;
      if (!Number.isFinite(S.overrev)) S.overrev = 0;

      S.roadOffset += (S.speed / 3.6) * dt * 26;
    }

    // suggested gear for the current speed (practice assist)
    function suggestGear() {
      const v = Math.abs(S.speed);
      if (v < 6) return 1;
      const target = car.target[S.mode];
      let best = 1, bestErr = Infinity;
      for (let g = 1; g <= car.gears; g++) {
        const rpm = speedToRPM(v, g);
        const lug = rpm < car.idle * 1.6 ? (car.idle * 1.6 - rpm) * 2 : 0;
        const over = rpm > car.shift.race ? (rpm - car.shift.race) * 2 : 0;
        const err = Math.abs(rpm - target) + lug + over;
        if (err < bestErr) { bestErr = err; best = g; }
      }
      return best;
    }

    // ---------- coaching ----------
    function coachingMessage(): [string, string] {
      if (S.blown) return ["Engine's blown — you over-revved it (money-shift?). Press ENTER to rebuild.", "bad"];
      if (S.grindTimer > 0) return ["Grind! Press the clutch (Space) before changing gear.", "bad"];
      if (!S.engineOn && !S.stalled) return ["Press ENTER to start the engine.", "info"];
      if (S.stalled) return ["Stalled. Press ENTER to restart (hold the clutch to stay in gear).", "bad"];

      const absSpeed = Math.abs(S.speed);
      const clutchIn = S.clutch > 0.55;
      const coupling = S.gear !== 0 ? 1 - S.clutch : 0;
      const shiftAt = car.shift[S.mode];

      if (S.rpm > car.redline && !clutchIn) return ["On the limiter — back off before you cook it!", "bad"];
      if (S.gear === 0 && absSpeed < 1.5) return ["Idling in neutral. Clutch in and press 1 for first gear.", "info"];
      if (S.gear !== 0 && absSpeed < 2.5) return ["Give it a little gas and slowly ease off the clutch to pull away.", "info"];
      if (S.gear !== 0 && S.gear < car.gears && !clutchIn && S.rpm > shiftAt) {
        return S.mode === "race"
          ? [`Wind it out — shift up near ${(car.redline / 1000).toFixed(1)}k to stay in the power.`, "warn"]
          : [`Around ${(shiftAt / 1000).toFixed(1)}k — clutch in and shift up for smooth, easy driving.`, "info"];
      }
      if (S.gear >= 2 && S.rpm < car.idle * 1.35 && S.throttle > 0.25 && coupling > 0.5) return ["Engine's lugging — ease off, shift down, or feed more gas.", "warn"];
      if (S.gear !== 0 && absSpeed > 4 && !clutchIn) return [`Rolling in gear ${S.gear === -1 ? "R" : S.gear}. Nice.`, "good"];
      if (S.gear !== 0 && clutchIn && absSpeed > 4) return ["Coasting on the clutch — pick a gear and let it out.", "info"];
      return ["", ""];
    }

    // ---------- audio (per-car engine voice) ----------
    let audio: AudioContext | null = null;
    let master: GainNode | null = null;
    let oscMain: OscillatorNode | null = null, mainFilter: BiquadFilterNode | null = null, mainGain: GainNode | null = null;
    let oscSub: OscillatorNode | null = null, subGain: GainNode | null = null;
    let whistleFilter: BiquadFilterNode | null = null, whistleGain: GainNode | null = null;
    let noiseSrc: AudioBufferSourceNode | null = null, noiseGain: GainNode | null = null;
    let soundOn = true, prevThrottle = 0, bovLevel = 0;

    function ensureAudio() {
      if (audio || !soundOn) return;
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audio = new Ctx();
        master = audio.createGain(); master.gain.value = 0.9; master.connect(audio.destination);
        oscMain = audio.createOscillator(); mainFilter = audio.createBiquadFilter(); mainFilter.type = "lowpass"; mainGain = audio.createGain(); mainGain.gain.value = 0;
        oscMain.connect(mainFilter); mainFilter.connect(mainGain); mainGain.connect(master);
        oscSub = audio.createOscillator(); oscSub.type = "sawtooth"; subGain = audio.createGain(); subGain.gain.value = 0;
        oscSub.connect(subGain); subGain.connect(master);
        // shared noise source → exhaust/induction texture + a breathy turbo whistle
        const buf = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noiseSrc = audio.createBufferSource(); noiseSrc.buffer = buf; noiseSrc.loop = true;
        const nf = audio.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 900; nf.Q.value = 0.7;
        noiseGain = audio.createGain(); noiseGain.gain.value = 0;
        noiseSrc.connect(nf); nf.connect(noiseGain); noiseGain.connect(master);
        // turbo whistle = high-Q bandpass on the noise (rushing air, not a piercing sine)
        whistleFilter = audio.createBiquadFilter(); whistleFilter.type = "bandpass"; whistleFilter.Q.value = 7; whistleFilter.frequency.value = 2200;
        whistleGain = audio.createGain(); whistleGain.gain.value = 0;
        noiseSrc.connect(whistleFilter); whistleFilter.connect(whistleGain); whistleGain.connect(master);
        oscMain.start(); oscSub.start(); noiseSrc.start();
        applyCarSound();
      } catch { audio = null; }
    }
    function applyCarSound() {
      if (oscMain) oscMain.type = car.sound.wave;
    }
    function updateAudio() {
      if (!audio || !master || !oscMain || !mainFilter || !mainGain || !oscSub || !subGain || !whistleFilter || !whistleGain || !noiseGain) return;
      const now = audio.currentTime;
      if (!Number.isFinite(now)) return;
      const s = car.sound;
      const running = S.engineOn && !S.stalled && !S.blown;
      const throttle = Number.isFinite(S.throttle) ? S.throttle : 0;
      // blow-off "tsh" when a turbo car lifts off boost
      if (s.whistle > 0 && prevThrottle > 0.5 && throttle < 0.2 && S.rpm > 3000) bovLevel = 0.14;
      bovLevel *= 0.86;
      prevThrottle = throttle;
      if (!running || !soundOn) {
        mainGain.gain.setTargetAtTime(0, now, 0.06);
        subGain.gain.setTargetAtTime(0, now, 0.06);
        whistleGain.gain.setTargetAtTime(0, now, 0.06);
        noiseGain.gain.setTargetAtTime(0, now, 0.06);
        return;
      }
      const rpm = Number.isFinite(S.rpm) ? S.rpm : 0;
      const load = 0.5 + throttle * 0.5;
      const f = s.base + rpm * s.pitch;
      oscMain.frequency.setTargetAtTime(f, now, 0.02);
      mainFilter.frequency.setTargetAtTime(s.cutoff + rpm * s.cutoffPerRpm, now, 0.04);
      mainGain.gain.setTargetAtTime(s.gain * (0.02 + load * 0.04 * (rpm / car.redline + 0.2)), now, 0.04);
      oscSub.frequency.setTargetAtTime(f * s.subMul, now, 0.02);
      subGain.gain.setTargetAtTime(s.sub * s.gain * (0.03 + load * 0.035), now, 0.04);
      const spool = clamp((rpm - 1800) / 3200, 0, 1);
      whistleFilter.frequency.setTargetAtTime(1400 + rpm * 0.2, now, 0.06);
      whistleGain.gain.setTargetAtTime(s.whistle * throttle * spool * 0.1, now, 0.06);
      noiseGain.gain.setTargetAtTime(s.noise * (0.008 + load * 0.02) + bovLevel, now, 0.03);
    }
    function toggleSound() {
      soundOn = !soundOn;
      soundBtn.textContent = "Sound: " + (soundOn ? "On" : "Off");
      if (soundOn) ensureAudio();
      if (audio && audio.state === "suspended") audio.resume();
    }

    // ---------- rendering ----------
    const tctx = tachCanvas.getContext("2d")!;
    const rctx = roadCanvas.getContext("2d")!;
    function fitCanvas(cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const r = cv.getBoundingClientRect();
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: r.width, h: r.height };
    }
    let tachSize = { w: 1, h: 1 };
    let roadSize = { w: 1, h: 1 };
    function resize() {
      tachSize = fitCanvas(tachCanvas!, tctx);
      roadSize = fitCanvas(roadCanvas!, rctx);
    }
    window.addEventListener("resize", resize);

    function drawTach() {
      const { w, h } = tachSize;
      tctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6;
      const start = Math.PI * 0.75, sweep = Math.PI * 1.5;
      const maxDial = 8, redAt = car.redline / 1000;

      tctx.beginPath(); tctx.arc(cx, cy, R, 0, Math.PI * 2);
      const g = tctx.createRadialGradient(cx, cy - R * 0.3, R * 0.1, cx, cy, R);
      g.addColorStop(0, "#141922"); g.addColorStop(1, "#070a0d");
      tctx.fillStyle = g; tctx.fill();
      tctx.lineWidth = 2; tctx.strokeStyle = "#20262e"; tctx.stroke();

      tctx.beginPath();
      tctx.arc(cx, cy, R - 10, start + sweep * (redAt / maxDial), start + sweep, false);
      tctx.lineWidth = 5; tctx.strokeStyle = "rgba(224,47,38,.85)"; tctx.stroke();

      for (let i = 0; i <= maxDial; i++) {
        const a = start + sweep * (i / maxDial);
        const isRed = i >= redAt;
        const r1 = R - 16, r2 = R - 30;
        tctx.beginPath();
        tctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        tctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        tctx.lineWidth = 3; tctx.strokeStyle = isRed ? "#ff6a58" : "#ffab40"; tctx.stroke();
        tctx.fillStyle = isRed ? "#ff6a58" : "#d9cdb4";
        tctx.font = `600 ${Math.round(R * 0.14)}px ui-monospace, Menlo, monospace`;
        tctx.textAlign = "center"; tctx.textBaseline = "middle";
        tctx.fillText(String(i), cx + Math.cos(a) * (R - 46), cy + Math.sin(a) * (R - 46));
      }
      for (let i = 0; i < maxDial; i++) {
        for (let j = 1; j < 5; j++) {
          const a = start + sweep * ((i + j / 5) / maxDial);
          tctx.beginPath();
          tctx.moveTo(cx + Math.cos(a) * (R - 16), cy + Math.sin(a) * (R - 16));
          tctx.lineTo(cx + Math.cos(a) * (R - 22), cy + Math.sin(a) * (R - 22));
          tctx.lineWidth = 1; tctx.strokeStyle = "rgba(255,171,64,.35)"; tctx.stroke();
        }
      }

      const gearLabel = S.blown ? "✕" : S.gear === 0 ? "N" : S.gear === -1 ? "R" : String(S.gear);
      tctx.fillStyle = S.blown || S.stalled ? "#ff6a58" : "#f2ede1";
      tctx.font = `700 ${Math.round(R * 0.5)}px ui-monospace, Menlo, monospace`;
      tctx.textAlign = "center"; tctx.textBaseline = "middle";
      tctx.fillText(gearLabel, cx, cy + R * 0.06);
      tctx.fillStyle = "#6b7580";
      tctx.font = `700 ${Math.round(R * 0.1)}px ${FONT_LABEL}`;
      tctx.fillText("GEAR", cx, cy - R * 0.32);

      const na = start + sweep * (clamp(S.rpm / 1000, 0, maxDial) / maxDial);
      tctx.save();
      tctx.translate(cx, cy); tctx.rotate(na);
      tctx.beginPath();
      tctx.moveTo(-R * 0.12, 0); tctx.lineTo(R - 34, -2.5); tctx.lineTo(R - 30, 0); tctx.lineTo(R - 34, 2.5);
      tctx.closePath();
      tctx.fillStyle = "#ff5a36"; tctx.shadowColor = "rgba(255,90,54,.7)"; tctx.shadowBlur = 12; tctx.fill();
      tctx.restore();
      tctx.beginPath(); tctx.arc(cx, cy, R * 0.09, 0, Math.PI * 2);
      tctx.fillStyle = "#2a3038"; tctx.fill();
      tctx.strokeStyle = "#454d57"; tctx.lineWidth = 2; tctx.stroke();
    }

    function drawRoad() {
      const { w, h } = roadSize;
      const horizon = h * 0.52;
      const sky = rctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#4f9fc9"); sky.addColorStop(0.6, "#8fc6de"); sky.addColorStop(1, "#e9dcc0");
      rctx.fillStyle = sky; rctx.fillRect(0, 0, w, horizon);
      const sun = rctx.createRadialGradient(w * 0.72, horizon * 0.78, 3, w * 0.72, horizon * 0.78, w * 0.5);
      sun.addColorStop(0, "rgba(255,244,214,.9)"); sun.addColorStop(0.25, "rgba(255,224,168,.35)"); sun.addColorStop(1, "rgba(255,224,168,0)");
      rctx.fillStyle = sun; rctx.fillRect(0, 0, w, horizon);
      const seaTop = horizon - Math.max(10, h * 0.06);
      const sea = rctx.createLinearGradient(0, seaTop, 0, horizon);
      sea.addColorStop(0, "#2f7fb0"); sea.addColorStop(1, "#356f96");
      rctx.fillStyle = sea; rctx.fillRect(0, seaTop, w, horizon - seaTop);
      const ground = rctx.createLinearGradient(0, horizon, 0, h);
      ground.addColorStop(0, "#8a9a5b"); ground.addColorStop(1, "#5f6f3c");
      rctx.fillStyle = ground; rctx.fillRect(0, horizon, w, h - horizon);

      const roadTopW = w * 0.09, roadBotW = w * 0.95, cx = w / 2;
      const laneY = (t: number) => horizon + (h - horizon) * t;
      const edgeAt = (t: number, s: number) => cx + s * (roadTopW / 2 + ((roadBotW - roadTopW) / 2) * t);
      rctx.beginPath();
      rctx.moveTo(edgeAt(0, -1), horizon); rctx.lineTo(edgeAt(0, 1), horizon);
      rctx.lineTo(edgeAt(1, 1), h); rctx.lineTo(edgeAt(1, -1), h);
      rctx.closePath(); rctx.fillStyle = "#41454b"; rctx.fill();
      const sheen = rctx.createLinearGradient(0, horizon, 0, h);
      sheen.addColorStop(0, "rgba(255,236,196,.10)"); sheen.addColorStop(1, "rgba(255,236,196,0)");
      rctx.fillStyle = sheen; rctx.fill();
      for (const s of [-1, 1]) {
        rctx.beginPath(); rctx.moveTo(edgeAt(0, s), horizon); rctx.lineTo(edgeAt(1, s), h);
        rctx.lineWidth = 2; rctx.strokeStyle = "rgba(246,244,236,.8)"; rctx.stroke();
      }
      for (let i = 0; i < 9; i++) {
        const phase = (i + (S.roadOffset % 100) / 100) / 9;
        const t = phase * phase, t2 = Math.min(1, t + 0.05);
        rctx.beginPath(); rctx.moveTo(cx, laneY(t)); rctx.lineTo(cx, laneY(t2));
        rctx.lineWidth = 2 + 11 * t; rctx.strokeStyle = "rgba(242,190,58,.92)"; rctx.stroke();
      }
      for (const s of [-1, 1]) {
        for (let i = 0; i < 8; i++) {
          const phase = (i + (S.roadOffset % 80) / 80) / 8;
          const t = phase * phase, y = laneY(t);
          const x = edgeAt(t, s) + s * (6 + 26 * t), ph = 3 + 16 * t;
          rctx.fillStyle = "rgba(232,228,214,.85)"; rctx.fillRect(x - (0.5 + t), y - ph, 1 + 2 * t, ph);
          rctx.fillStyle = "rgba(224,47,38,.9)"; rctx.fillRect(x - (0.5 + t), y - ph, 1 + 2 * t, 1 + 2.5 * t);
        }
      }
    }

    // ---------- DOM sync ----------
    function syncDOM() {
      speedEl.textContent = String(Math.round(Math.abs(S.speed) * 0.621371));
      rpmEl.textContent = String(Math.round(S.rpm));
      kmhEl.textContent = String(Math.round(Math.abs(S.speed)));
      fillClutch.style.height = (S.clutch * 100).toFixed(0) + "%";
      fillBrake.style.height = (S.brake * 100).toFixed(0) + "%";
      fillGas.style.height = (S.gas * 100).toFixed(0) + "%";

      Object.values(gEls).forEach((e) => e.classList.remove("active", "suggested"));
      gN.classList.toggle("active", S.gear === 0);
      if (S.gear !== 0) gEls[String(S.gear)]?.classList.add("active");

      lampN.className = "lamp" + (S.gear === 0 ? " on-green" : "");
      lampClutch.className = "lamp" + (S.clutch > 0.5 ? " on-amber" : "");
      const shiftUp = S.rpm > car.shift[S.mode] && S.gear !== 0 && S.gear < car.gears && S.clutch < 0.5;
      lampShift.className = "lamp" + (shiftUp ? " on-amber" : "");
      lampStall.className = "lamp" + (S.stalled || S.blown ? " on-red" : "");
      lampRev.className = "lamp" + (S.blown || S.overrev > 0.6 ? " on-red" : S.overrev > 0.05 ? " on-amber" : "");

      if (S.assist && S.engineOn && !S.blown) {
        const sg = suggestGear();
        gEls[String(sg)]?.classList.add("suggested");
        let msg: string, cls: string;
        if (S.gear === 0) { msg = `Best gear: ${sg} — you're in Neutral`; cls = "info"; }
        else if (S.gear === sg) { msg = `Best gear: ${sg} ✓ good gear`; cls = "good"; }
        else if (S.gear < sg) { msg = `Best gear: ${sg} ▲ shift up`; cls = "up"; }
        else { msg = `Best gear: ${sg} ▼ shift down`; cls = "down"; }
        assistEl.textContent = msg;
        assistEl.className = "assist-line " + cls;
      }

      const [msg, tone] = coachingMessage();
      coachEl.textContent = msg;
      coachEl.className = "coach " + tone;
    }

    // ---------- main loop ----------
    let raf = 0;
    let last: number | null = null;
    function frame(ts: number) {
      if (last === null) last = ts;
      let dt = (ts - last) / 1000;
      last = ts;
      dt = Math.min(dt, 0.05);
      const steps = 6, sdt = dt / steps;
      for (let i = 0; i < steps; i++) physics(sdt);
      gameTime += dt;
      updateRun();
      updateAudio();
      drawRoad();
      drawTach();
      syncDOM();
      raf = requestAnimationFrame(frame);
    }

    selectCar("na");
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", resize);
      soundBtn.removeEventListener("click", onSound);
      assistBtn.removeEventListener("click", onAssist);
      runBtn.removeEventListener("click", onRun);
      modeCruiseBtn.removeEventListener("click", onModeCruise);
      modeRaceBtn.removeEventListener("click", onModeRace);
      carHandlers.forEach(([b, h]) => b.removeEventListener("click", h));
      if (audio) audio.close();
    };
  }, []);

  return (
    <div className="mx5" ref={rootRef}>
      <style>{CSS}</style>

      <div className="stage">
        <div className="topbar">
          <div className="brand">
            <h1>Shift<span className="amberdot">·</span>School</h1>
            <span className="tag">Manual driving trainer</span>
          </div>
          <div className="topbar-controls">
            <div className="car-select" role="group" aria-label="Car">
              <button className="car-btn active" data-car="na" type="button">MX-5 NA</button>
              <button className="car-btn" data-car="nd" type="button">MX-5 ND</button>
              <button className="car-btn" data-car="v8" type="button">V8 Muscle</button>
              <button className="car-btn" data-car="turbo" type="button">Turbo AWD</button>
            </div>
            <div className="mode-toggle" role="group" aria-label="Driving mode">
              <button className="mode-btn active" data-el="modeCruise" type="button">Cruise</button>
              <button className="mode-btn" data-el="modeRace" type="button">Race</button>
            </div>
            <button className="pill-btn" data-el="runBtn" type="button">0–60</button>
            <button className="pill-btn" data-el="assistBtn" type="button">Assist: Off</button>
            <button className="sound-btn" data-el="soundBtn" type="button">Sound: On</button>
          </div>
        </div>

        <div className="car-meta" data-el="carMeta">MX-5 NA — 1.6 I4 · 5-speed · 7,000 rpm</div>

        <div className="road-wrap">
          <canvas className="road" ref={roadRef} />
          <div className="timer-hud" data-el="timerHud" />
          <div className="coach info" data-el="coach">Press ENTER to start the engine.</div>
          <div className="overlay" data-el="overlay">
            <svg className="miata-badge" viewBox="0 0 264 104" role="img" aria-label="Roadster">
              <rect x="34" y="30" width="13" height="16" rx="2.5" fill="#c8102e" />
              <rect x="36" y="31" width="9" height="5" rx="1.5" fill="#ffe9b0" />
              <path d="M 16 66 C 18 52, 30 47, 46 46 L 74 45 C 82 45, 86 44, 92 40 L 108 27 C 113 23, 122 23, 128 28 L 156 44 L 218 46 C 238 47, 246 53, 246 66 L 246 72 L 16 72 Z" fill="#c8102e" />
              <path d="M 96 40 L 110 29 C 114 26, 121 26, 125 30 L 138 42 Z" fill="#bfe3ef" opacity="0.7" />
              <circle cx="70" cy="72" r="18" fill="#101317" /><circle cx="70" cy="72" r="8.5" fill="#3a4149" /><circle cx="70" cy="72" r="3" fill="#c8102e" />
              <circle cx="200" cy="72" r="18" fill="#101317" /><circle cx="200" cy="72" r="8.5" fill="#3a4149" /><circle cx="200" cy="72" r="3" fill="#c8102e" />
            </svg>
            <h3>Top Down, Revs Up</h3>
            <p>A little cockpit for learning the dance of clutch, gas and shifter. Pick a car up top, feed a touch of gas, ease off the clutch, and keep it off the limiter.</p>
            <div className="prompt pulse">▸ Press ENTER to start the engine</div>
          </div>
        </div>

        <div className="cluster">
          <div className="card tach-card">
            <h2>Tachometer · RPM ×1000</h2>
            <div className="tach-wrap"><canvas className="tach" ref={tachRef} /></div>
          </div>

          <div className="card readouts">
            <h2>Instruments</h2>
            <div className="speed">
              <span className="num" data-el="speed">0</span>
              <span className="unit">mph</span>
            </div>
            <div className="subline">
              <span>RPM <b data-el="rpm">0</b></span>
              <span><b data-el="kmh">0</b> km/h</span>
            </div>
            <div className="subline">
              <span>Best 0–60</span>
              <span><b data-el="zero60">—</b></span>
            </div>
            <div className="lights">
              <span className="lamp" data-el="lampN">N</span>
              <span className="lamp" data-el="lampClutch">Clutch</span>
              <span className="lamp" data-el="lampShift">Shift ↑</span>
              <span className="lamp" data-el="lampStall">Stall</span>
              <span className="lamp" data-el="lampRev">Over-Rev</span>
            </div>
          </div>

          <div className="card control-card">
            <h2>Controls</h2>
            <div className="pedals">
              <div className="pedal">
                <div className="meter clutch"><div className="fill" data-el="fillClutch" /></div>
                <span className="plabel">Clutch</span><span className="pkey">Space</span>
              </div>
              <div className="pedal">
                <div className="meter brake"><div className="fill" data-el="fillBrake" /></div>
                <span className="plabel">Brake</span><span className="pkey">↓ / S</span>
              </div>
              <div className="pedal">
                <div className="meter gas"><div className="fill" data-el="fillGas" /></div>
                <span className="plabel">Gas</span><span className="pkey">↑ / W</span>
              </div>
            </div>

            <div className="shifter">
              <div className="neutral-bar" data-el="gN">N — Neutral</div>
              <div className="hpat">
                <div className="gpos" data-gear="1">1</div>
                <div className="gpos" data-gear="3">3</div>
                <div className="gpos" data-gear="5">5</div>
                <div className="gpos" data-gear="2">2</div>
                <div className="gpos" data-gear="4">4</div>
                <div className="gpos" data-gear="6" data-el="g6cell">6</div>
              </div>
              <div className="reverse-bar" data-gear="-1">R — Reverse</div>
              <div className="assist-line" data-el="assist" style={{ display: "none" }} />
            </div>
          </div>
        </div>

        <div className="card stats-card">
          <h2>0–60 Times · <span data-el="statsCarName">MX-5 NA</span></h2>
          <div className="stats-grid">
            <div className="stats-col">
              <div className="stats-head">Fastest 3</div>
              <ol className="stats-list" data-el="statsBest"><li className="empty">No runs yet</li></ol>
            </div>
            <div className="stats-col">
              <div className="stats-head">Recent 5</div>
              <ol className="stats-list" data-el="statsRecent"><li className="empty">No runs yet</li></ol>
            </div>
          </div>
        </div>

        <div className="legend">
          <div className="row"><kbd>Space</kbd> Clutch (hold to disengage)</div>
          <div className="row"><kbd>↑</kbd>/<kbd>W</kbd> Gas · <kbd>↓</kbd>/<kbd>S</kbd> Brake</div>
          <div className="row"><kbd>1</kbd>–<kbd>6</kbd> Gears · <kbd>0</kbd> Neutral · <kbd>R</kbd> Reverse</div>
          <div className="row"><kbd>Enter</kbd> Start / rebuild · <kbd>T</kbd> Cruise ⇄ Race · <kbd>P</kbd> Assist · <kbd>C</kbd> Next car · <kbd>M</kbd> Mute</div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.mx5{
  --ground:#0b0d10; --ground-2:#0f1319; --panel:#14181d; --dial:#080a0c;
  --line:#252b33; --amber:#ffab40; --amber-dim:#c07f2e; --miata-red:#c8102e;
  --needle:#ff5a36; --redline:#e02f26; --good:#52c17a;
  --text:#e2ddd1; --muted:#828d99; --muted-2:#5b6470;
  --font-num: ui-monospace,"SF Mono","JetBrains Mono","Cascadia Code",Menlo,Consolas,monospace;
  --font-label:"Helvetica Neue","Segoe UI",system-ui,-apple-system,sans-serif;
  min-height: calc(100vh - 64px);
  display:flex; justify-content:center;
  padding:clamp(12px,2.5vw,28px);
  font-family:var(--font-label); color:var(--text);
  background:radial-gradient(120% 80% at 50% -10%, #12171e 0%, var(--ground) 55%, #06070a 100%);
  -webkit-font-smoothing:antialiased;
}
.mx5 *{ box-sizing:border-box; }
.mx5 .stage{ width:100%; max-width:1080px; display:flex; flex-direction:column; gap:14px; }

.mx5 .topbar{ display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
.mx5 .brand{ display:flex; align-items:baseline; gap:12px; }
.mx5 .brand h1{ margin:0; font-weight:800; font-size:clamp(17px,2.4vw,24px); letter-spacing:0.12em; text-transform:uppercase; color:var(--text); }
.mx5 .brand .amberdot{ color:var(--miata-red); }
.mx5 .brand .tag{ font-size:11px; letter-spacing:0.24em; text-transform:uppercase; color:var(--muted-2); }
.mx5 .topbar-controls{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

.mx5 .car-select{ display:inline-flex; border:1px solid var(--line); border-radius:999px; overflow:hidden; background:var(--panel); }
.mx5 .car-btn{ font-family:var(--font-label); font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); background:transparent; border:0; padding:8px 13px; cursor:pointer; transition:color .15s, background .15s; white-space:nowrap; }
.mx5 .car-btn:hover{ color:var(--text); }
.mx5 .car-btn.active{ color:#101216; background:var(--miata-red); color:#fff; }
.mx5 .car-btn:focus-visible{ outline:2px solid var(--amber); outline-offset:-2px; }

.mx5 .mode-toggle{ display:inline-flex; border:1px solid var(--line); border-radius:999px; overflow:hidden; background:var(--panel); }
.mx5 .mode-btn{ font-family:var(--font-label); font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:var(--muted); background:transparent; border:0; padding:8px 14px; cursor:pointer; transition:color .15s, background .15s; }
.mx5 .mode-btn:hover{ color:var(--text); }
.mx5 .mode-btn.active{ color:#101216; background:var(--amber); }
.mx5 .mode-btn.active[data-el="modeRace"]{ background:var(--miata-red); color:#fff; }
.mx5 .mode-btn:focus-visible{ outline:2px solid var(--amber); outline-offset:-2px; }

.mx5 .pill-btn, .mx5 .sound-btn{ font-family:var(--font-label); font-size:11px; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); background:var(--panel); border:1px solid var(--line); border-radius:999px; padding:8px 14px; cursor:pointer; transition:border-color .15s,color .15s; }
.mx5 .pill-btn:hover, .mx5 .sound-btn:hover{ color:var(--miata-red); border-color:var(--miata-red); }
.mx5 .pill-btn.on{ color:#08130c; background:var(--good); border-color:var(--good); }
.mx5 .pill-btn:focus-visible, .mx5 .sound-btn:focus-visible{ outline:2px solid var(--amber); outline-offset:2px; }

.mx5 .car-meta{ font-family:var(--font-num); font-size:12px; letter-spacing:0.04em; color:var(--muted); border-left:2px solid var(--miata-red); padding-left:10px; }

.mx5 .road-wrap{ position:relative; border:1px solid var(--line); border-radius:14px; overflow:hidden; background:#05070b; box-shadow:inset 0 0 60px rgba(0,0,0,.6); }
.mx5 canvas.road{ display:block; width:100%; height:clamp(170px,30vh,280px); }
.mx5 .coach{ position:absolute; left:0; right:0; bottom:0; padding:14px 18px; font-size:clamp(13px,1.7vw,16px); font-weight:600; background:linear-gradient(0deg, rgba(5,6,9,.92), rgba(5,6,9,0)); color:var(--text); display:flex; align-items:center; gap:10px; min-height:26px; }
.mx5 .coach::before{ content:""; width:8px; height:8px; border-radius:50%; background:var(--muted); color:var(--muted); box-shadow:0 0 8px currentColor; flex:0 0 auto; }
.mx5 .coach.info::before{ background:var(--amber); color:var(--amber); }
.mx5 .coach.good::before{ background:var(--good); color:var(--good); }
.mx5 .coach.warn::before{ background:#f2b134; color:#f2b134; }
.mx5 .coach.bad{ color:#ff8a76; }
.mx5 .coach.bad::before{ background:var(--redline); color:var(--redline); }

.mx5 .timer-hud{ position:absolute; top:12px; left:0; right:0; text-align:center; font-family:var(--font-num); font-weight:700; color:#fff; pointer-events:none; opacity:0; transition:opacity .18s; text-shadow:0 2px 12px rgba(0,0,0,.65); z-index:4; font-variant-numeric:tabular-nums; }
.mx5 .timer-hud.show{ opacity:1; }
.mx5 .timer-hud.count{ font-size:clamp(46px,10vw,86px); color:var(--amber); }
.mx5 .timer-hud.go{ font-size:clamp(38px,9vw,74px); color:var(--good); letter-spacing:0.04em; }
.mx5 .timer-hud.timing{ font-size:clamp(30px,6vw,50px); color:#fff; }
.mx5 .timer-hud.done{ font-size:clamp(17px,3.2vw,25px); font-weight:800; letter-spacing:0.03em; color:var(--amber); }
.mx5 .timer-hud.done.best{ color:var(--good); }
.mx5 .timer-hud.abort{ font-size:clamp(15px,2.8vw,21px); color:#ff8a76; }

.mx5 .cluster{ display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,1fr) minmax(0,1fr); gap:16px; }
.mx5 .card{ background:linear-gradient(180deg,var(--panel),var(--ground-2)); border:1px solid var(--line); border-radius:14px; padding:16px; box-shadow:0 1px 0 rgba(255,255,255,.03) inset, 0 10px 30px rgba(0,0,0,.35); display:flex; flex-direction:column; gap:12px; min-width:0; }
.mx5 .card h2{ margin:0; font-size:10.5px; font-weight:700; letter-spacing:0.26em; text-transform:uppercase; color:var(--muted-2); }
.mx5 .tach-card{ align-items:center; }
.mx5 .tach-wrap{ position:relative; width:100%; max-width:320px; aspect-ratio:1/1; }
.mx5 canvas.tach{ width:100%; height:100%; display:block; }

.mx5 .readouts{ gap:14px; }
.mx5 .speed{ display:flex; align-items:baseline; gap:8px; font-family:var(--font-num); line-height:.9; }
.mx5 .speed .num{ font-size:clamp(46px,9vw,68px); font-weight:600; letter-spacing:-0.02em; font-variant-numeric:tabular-nums; color:var(--text); text-shadow:0 0 18px rgba(255,171,64,.10); }
.mx5 .speed .unit{ font-size:13px; letter-spacing:0.22em; color:var(--muted); text-transform:uppercase; font-family:var(--font-label); font-weight:700; }
.mx5 .subline{ font-family:var(--font-num); font-size:13px; color:var(--muted); font-variant-numeric:tabular-nums; display:flex; justify-content:space-between; border-top:1px solid var(--line); padding-top:10px; }
.mx5 .subline b{ color:var(--text); font-weight:600; }
.mx5 .lights{ display:flex; flex-wrap:wrap; gap:8px; margin-top:2px; }
.mx5 .lamp{ font-family:var(--font-label); font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; padding:6px 9px; border-radius:7px; border:1px solid var(--line); color:var(--muted-2); background:rgba(0,0,0,.25); transition:all .12s; }
.mx5 .lamp.on-amber{ color:#101216; background:var(--amber); border-color:var(--amber); box-shadow:0 0 14px rgba(255,171,64,.5); }
.mx5 .lamp.on-red{ color:#fff; background:var(--redline); border-color:var(--redline); box-shadow:0 0 14px rgba(224,47,38,.55); }
.mx5 .lamp.on-green{ color:#08130c; background:var(--good); border-color:var(--good); box-shadow:0 0 14px rgba(82,193,122,.5); }

.mx5 .control-card{ gap:16px; }
.mx5 .pedals{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.mx5 .pedal{ display:flex; flex-direction:column; align-items:center; gap:8px; }
.mx5 .meter{ position:relative; width:100%; height:110px; background:var(--dial); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
.mx5 .meter .fill{ position:absolute; left:0; right:0; bottom:0; height:0%; transition:height .04s linear; }
.mx5 .meter.clutch .fill{ background:linear-gradient(0deg,var(--amber-dim),var(--amber)); }
.mx5 .meter.brake .fill{ background:linear-gradient(0deg,#8f231c,var(--redline)); }
.mx5 .meter.gas .fill{ background:linear-gradient(0deg,#2f8551,var(--good)); }
.mx5 .pedal .plabel{ font-size:10px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); }
.mx5 .pedal .pkey{ font-family:var(--font-num); font-size:10px; color:var(--muted-2); border:1px solid var(--line); border-radius:5px; padding:2px 6px; }

.mx5 .shifter{ display:flex; flex-direction:column; gap:9px; }
.mx5 .hpat{ display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(2,1fr); gap:8px; }
.mx5 .gpos{ font-family:var(--font-num); font-size:16px; font-weight:600; text-align:center; padding:10px 0; border:1px solid var(--line); border-radius:8px; color:var(--muted); background:rgba(0,0,0,.22); transition:all .12s; }
.mx5 .gpos.active{ color:#101216; background:var(--amber); border-color:var(--amber); box-shadow:0 0 14px rgba(255,171,64,.45); }
.mx5 .gpos.suggested{ box-shadow:inset 0 0 0 2px var(--good); border-color:var(--good); color:var(--good); }
.mx5 .gpos.active.suggested{ color:#101216; }
.mx5 .neutral-bar, .mx5 .reverse-bar{ text-align:center; font-family:var(--font-num); font-size:12px; letter-spacing:0.1em; color:var(--muted-2); padding:6px; border:1px dashed var(--line); border-radius:7px; transition:all .12s; }
.mx5 .neutral-bar.active{ color:var(--good); border-color:var(--good); }
.mx5 .reverse-bar.active{ color:#101216; background:var(--amber); border-style:solid; border-color:var(--amber); }
.mx5 .assist-line{ font-family:var(--font-num); font-size:12px; font-weight:600; text-align:center; padding:8px; border-radius:7px; background:rgba(82,193,122,.08); color:var(--good); }
.mx5 .assist-line.up{ color:var(--amber); background:rgba(255,171,64,.10); }
.mx5 .assist-line.down{ color:#f2b134; background:rgba(242,177,52,.10); }
.mx5 .assist-line.info{ color:var(--muted); background:rgba(130,141,153,.10); }

.mx5 .stats-card{ gap:12px; }
.mx5 .stats-card h2 span{ color:var(--miata-red); }
.mx5 .stats-grid{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.mx5 .stats-head{ font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--muted-2); margin-bottom:8px; }
.mx5 .stats-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; }
.mx5 .stats-list li{ display:flex; align-items:center; gap:10px; font-family:var(--font-num); font-size:14px; font-variant-numeric:tabular-nums; color:var(--text); background:rgba(0,0,0,.22); border:1px solid var(--line); border-radius:7px; padding:7px 11px; }
.mx5 .stats-list li.empty{ color:var(--muted-2); justify-content:center; font-family:var(--font-label); font-size:12px; }
.mx5 .stats-list .rk{ color:var(--muted-2); font-size:11px; min-width:14px; }
.mx5 .stats-list .tm{ font-weight:600; }
.mx5 .stats-list .tm.pb{ color:var(--good); }

.mx5 .legend{ display:flex; flex-wrap:wrap; gap:8px 18px; padding:14px 16px; background:var(--panel); border:1px solid var(--line); border-radius:12px; font-size:12px; color:var(--muted); }
.mx5 .legend .row{ display:flex; align-items:center; gap:8px; }
.mx5 .legend kbd{ font-family:var(--font-num); font-size:11px; color:var(--text); background:var(--ground-2); border:1px solid var(--line); border-bottom-width:2px; border-radius:5px; padding:2px 7px; min-width:20px; text-align:center; display:inline-block; }

.mx5 .overlay{ position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; background:radial-gradient(80% 80% at 50% 40%, rgba(8,10,14,.72), rgba(4,5,8,.94)); backdrop-filter:blur(2px); text-align:center; padding:24px; z-index:5; }
.mx5 .overlay h3{ margin:0; font-size:clamp(20px,3vw,28px); font-weight:800; letter-spacing:0.06em; text-transform:uppercase; }
.mx5 .overlay p{ margin:0; max-width:46ch; color:var(--muted); font-size:14px; line-height:1.5; }
.mx5 .overlay .prompt{ font-family:var(--font-num); color:var(--amber); font-size:14px; letter-spacing:0.08em; margin-top:4px; }
.mx5 .miata-badge{ width:clamp(150px,32vw,220px); height:auto; margin-bottom:2px; filter:drop-shadow(0 6px 14px rgba(200,16,46,.35)); }
.mx5 .overlay.hidden{ display:none; }
.mx5 .pulse{ animation:mx5-pulse 1.4s ease-in-out infinite; }
@keyframes mx5-pulse{ 0%,100%{opacity:.55} 50%{opacity:1} }
@media (prefers-reduced-motion: reduce){ .mx5 .pulse{ animation:none; } }

@media (max-width:720px){ .mx5 .cluster{ grid-template-columns:1fr 1fr; } .mx5 .tach-card{ grid-column:1 / -1; } }
@media (max-width:460px){ .mx5 .cluster{ grid-template-columns:1fr; } }
`;

// This component runs an imperative canvas + requestAnimationFrame loop that can't
// be hot-swapped cleanly: `bun --hot` re-runs the module but not the `useEffect([])`,
// so the old loop keeps running stale code. Force a full reload on any edit so dev
// iteration always starts clean. (No-op in production, where import.meta.hot is undefined.)
if (import.meta.hot) {
  import.meta.hot.accept(() => window.location.reload());
}

export default ManualDriving;
