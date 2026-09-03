import { useEffect, useRef, useState } from "react";
import {
  ARENA, CMD_RESEND, FIRE_COOLDOWN, MAX_CMD_MS, MAX_HP, PADS, PAD_META, PAD_RADIUS,
  PLAYER_RADIUS, POWERS, POWER_DURATION, TICK_MS, WALLS, clamp, lerp, lerpAngle, stepMove,
  type BulletState, type ClientMsg, type Cmd, type PadKind, type PlayerState, type Power,
  type ServerMsg,
} from "./protocol";
import { CSS } from "./styles";

/**
 * NETLAB — a top-down deathmatch used to find out what an authoritative server actually
 * feels like over a tailnet.
 *
 * Three things fight latency here, and they are separate problems:
 *
 * 1. YOUR OWN character is predicted. Every command is applied locally the instant you
 *    press the key and kept in `pending`. When the server acks a sequence number we snap
 *    to its authoritative position and replay whatever is still unacked. A mismatch is
 *    absorbed into `error`, which decays over ~80 ms, so a correction is a slight drift
 *    rather than a visible snap.
 *
 * 2. EVERYONE ELSE is interpolated, on a playback clock that runs on the SERVER's
 *    timeline rather than on packet arrival times. Arrival jitter therefore stops
 *    translating into positional jitter. The delay behind the newest snapshot adapts to
 *    measured jitter instead of sitting at a hardcoded 100 ms.
 *
 * 3. Neither of those can be judged on loopback, where the round trip is 0.1 ms. The
 *    network simulator adds latency, jitter and packet loss on top of the real link so
 *    you can feel a 150 ms connection without leaving your desk.
 *
 * What is still missing on purpose: lag compensation. The server hit-tests bullets against
 * where players are NOW, not where you saw them when you fired, so at high latency you
 * must lead your shots.
 *
 * Pickups and powers are read-only here. The client predicts movement and nothing else, so
 * a pad you just stepped on lights up a round trip later — visible at 300 ms, and worth
 * far less than the desync that predicting it would cost.
 */

type Snapshot = { st: number; players: PlayerState[]; bullets: BulletState[]; pads: number[] };

type Keys = { up: boolean; down: boolean; left: boolean; right: boolean; fire: boolean };

type Stats = { rtt: number | null; jitter: number; interp: number; predErr: number; pending: number; rate: number };

type NetSim = { latency: number; jitter: number; loss: number };

const MOVE_KEYS: Record<string, keyof Keys> = {
  KeyW: "up", ArrowUp: "up",
  KeyS: "down", ArrowDown: "down",
  KeyA: "left", ArrowLeft: "left",
  KeyD: "right", ArrowRight: "right",
};

const SIM_PRESETS: { label: string; sim: NetSim }[] = [
  { label: "real link", sim: { latency: 0, jitter: 0, loss: 0 } },
  { label: "60 ms", sim: { latency: 60, jitter: 10, loss: 0 } },
  { label: "150 ms + jitter", sim: { latency: 150, jitter: 40, loss: 0 } },
  { label: "150 ms + 5% loss", sim: { latency: 150, jitter: 40, loss: 0.05 } },
  { label: "300 ms, awful", sim: { latency: 300, jitter: 80, loss: 0.1 } },
];

export function ShooterClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "down">("connecting");
  const [stats, setStats] = useState<Stats>({ rtt: null, jitter: 0, interp: TICK_MS * 1.5, predErr: 0, pending: 0, rate: 0 });
  const [rows, setRows] = useState<PlayerState[]>([]);
  const [feed, setFeed] = useState<string[]>([]);
  const [dead, setDead] = useState(false);
  const [powers, setPowers] = useState<Partial<Record<Power, number>>>({});
  const [myId, setMyId] = useState("");
  const [simIndex, setSimIndex] = useState(0);
  const [name, setName] = useState(() => localStorage.getItem("shooter-name") || `pilot-${Math.floor(Math.random() * 900 + 100)}`);

  // Refs so the game loop can read live values without the effect re-running.
  const nameRef = useRef(name);
  nameRef.current = name;
  const simRef = useRef<NetSim>(SIM_PRESETS[0]!.sim);
  simRef.current = SIM_PRESETS[simIndex]?.sim ?? SIM_PRESETS[0]!.sim;
  const rejoinRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    localStorage.setItem("shooter-name", name);
    const id = setTimeout(() => rejoinRef.current?.(), 400);
    return () => clearTimeout(id);
  }, [name]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = ARENA.w * dpr;
    canvas.height = ARENA.h * dpr;
    ctx.scale(dpr, dpr);

    // ---- state ---------------------------------------------------------------------

    const buffer: Snapshot[] = [];
    const keys: Keys = { up: false, down: false, left: false, right: false, fire: false };
    const mouse = { x: ARENA.w / 2, y: ARENA.h / 2 };
    const pending: Cmd[] = [];
    const predicted = { x: ARENA.w / 2, y: ARENA.h / 2 };
    const error = { x: 0, y: 0 };

    let id = "";
    let seq = 0;
    let aim = 0;
    let predCooldown = 0;
    let muzzle = 0;
    let started = false;

    let playback = 0;
    let newestSt = 0;
    let interp = TICK_MS * 1.5;
    let jitter = 0;
    let lastArrival = 0;
    let snapsThisSecond = 0;
    let rateWindow = performance.now();
    let rate = 0;
    let rtt: number | null = null;
    let predErr = 0;

    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;
    let rosterKey = "";
    let lastPowerKey = "";

    // ---- transport, with an optional impairment layer --------------------------------

    /** Half the configured latency each way, so `latency` reads as a round trip. */
    const hop = () => {
      const s = simRef.current;
      return s.latency / 2 + (Math.random() - 0.5) * s.jitter;
    };

    function post(msg: ClientMsg) {
      const ws = socket;
      if (ws?.readyState !== WebSocket.OPEN) return;
      const s = simRef.current;
      if (s.loss > 0 && Math.random() < s.loss) return;
      const payload = JSON.stringify(msg);
      const delay = hop();
      if (delay <= 0) ws.send(payload);
      else setTimeout(() => { if (ws.readyState === WebSocket.OPEN) ws.send(payload); }, delay);
    }

    function onServerMsg(msg: ServerMsg) {
      if (msg.t === "state") return onSnapshot(msg);
      if (msg.t === "welcome") { id = msg.id; setMyId(msg.id); return; }
      if (msg.t === "pong") { rtt = performance.now() - msg.ts; return; }
      if (msg.t === "kill") { setFeed((f) => [`${msg.killer} dropped ${msg.victim}`, ...f].slice(0, 5)); return; }
      if (msg.t === "pickup") setFeed((f) => [`${msg.who} took ${PAD_META[msg.kind].label}`, ...f].slice(0, 5));
    }

    function connect() {
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${location.host}/ws/shooter`);
      socket = ws;
      setStatus("connecting");

      ws.onopen = () => {
        setStatus("live");
        // A restarted server counts ticks from zero again, so the playback clock has to
        // forget the old timeline or every new snapshot looks like ancient history.
        pending.length = 0;
        buffer.length = 0;
        started = false;
        playback = 0;
        newestSt = 0;
        lastArrival = 0;
        post({ t: "join", name: nameRef.current });
      };
      ws.onmessage = (ev) => {
        const msg: ServerMsg = JSON.parse(ev.data);
        const s = simRef.current;
        if (s.loss > 0 && msg.t === "state" && Math.random() < s.loss) return;
        const delay = hop();
        if (delay <= 0) onServerMsg(msg);
        else setTimeout(() => { if (mounted) onServerMsg(msg); }, delay);
      };
      ws.onclose = () => {
        setStatus("down");
        if (mounted) retry = setTimeout(connect, 1000);
      };
      ws.onerror = () => ws.close();
    }

    rejoinRef.current = () => post({ t: "join", name: nameRef.current });
    connect();

    // ---- reconciliation ---------------------------------------------------------------

    function onSnapshot(msg: Extract<ServerMsg, { t: "state" }>) {
      const now = performance.now();
      const st = msg.tick * TICK_MS;

      if (lastArrival > 0) jitter = jitter * 0.9 + Math.abs(now - lastArrival - TICK_MS) * 0.1;
      lastArrival = now;
      snapsThisSecond++;

      // The impairment layer can deliver out of order, so insert by server time and
      // discard anything older than what we are already playing back.
      if (st <= playback - 400) return;
      let at = buffer.length;
      while (at > 0 && buffer[at - 1]!.st > st) at--;
      if (at > 0 && buffer[at - 1]!.st === st) return;
      buffer.splice(at, 0, { st, players: msg.players, bullets: msg.bullets, pads: msg.pads });
      while (buffer.length > 40) buffer.shift();
      newestSt = Math.max(newestSt, st);

      const mine = msg.players.find((p) => p.id === id);
      if (mine) {
        if (!started) {
          predicted.x = mine.x;
          predicted.y = mine.y;
          error.x = error.y = 0;
          started = true;
        }

        while (pending.length > 0 && pending[0]!.seq <= mine.seq) pending.shift();

        const wasX = predicted.x + error.x;
        const wasY = predicted.y + error.y;
        predicted.x = mine.x;
        predicted.y = mine.y;
        for (const c of pending) if (mine.alive) stepMove(predicted, c);

        const ex = wasX - predicted.x;
        const ey = wasY - predicted.y;
        predErr = Math.hypot(ex, ey);
        // A respawn or a big desync is a genuine teleport; smoothing it would look worse
        // than the cut, and would leave you shooting from a position you do not occupy.
        if (predErr > 80 || !mine.alive) {
          error.x = error.y = 0;
        } else {
          error.x = clamp(ex, -60, 60);
          error.y = clamp(ey, -60, 60);
        }
      }

      const key = msg.players
        .map((p) => `${p.id}:${p.name}:${p.score}:${p.deaths}:${Object.keys(p.pw).join(",")}`)
        .join("|");
      if (key !== rosterKey) {
        rosterKey = key;
        setRows(msg.players);
      }
      setDead(msg.players.some((p) => p.id === id && !p.alive));

      // Re-render the countdown once a second rather than on all 20 snapshots.
      const mineNow = mine?.pw ?? {};
      const powerKey = POWERS.map((k) => `${k}${Math.ceil(mineNow[k] ?? 0)}`).join("");
      if (powerKey !== lastPowerKey) {
        lastPowerKey = powerKey;
        setPowers(mineNow);
      }
    }

    // ---- input -------------------------------------------------------------------------

    let lastCmdAt = performance.now();

    function sendCommand() {
      if (socket?.readyState !== WebSocket.OPEN || !started) return;
      const now = performance.now();
      const dtMs = clamp(Math.round(now - lastCmdAt), 1, MAX_CMD_MS);
      if (now - lastCmdAt < 1) return;
      lastCmdAt = now;

      const cmd: Cmd = { seq: ++seq, dtMs, ...keys, aim };
      const alive = !buffer.length || buffer[buffer.length - 1]!.players.find((p) => p.id === id)?.alive !== false;
      if (alive) {
        stepMove(predicted, cmd);
        predCooldown = Math.max(0, predCooldown - dtMs / 1000);
        if (cmd.fire && predCooldown === 0) {
          predCooldown = FIRE_COOLDOWN;
          muzzle = 1;
        }
      }
      pending.push(cmd);
      // Resend the last few unacked commands: one dropped packet then costs nothing.
      post({ t: "cmd", cs: pending.slice(-CMD_RESEND) });
    }

    const cmdTimer = setInterval(sendCommand, 1000 / 30);
    const pingTimer = setInterval(() => post({ t: "ping", ts: performance.now() }), 1000);

    const typing = () => document.activeElement?.tagName === "INPUT";
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (typing()) return;
      const k = MOVE_KEYS[e.code];
      if (k) { keys[k] = down; e.preventDefault(); }
      else if (e.code === "Space") { keys.fire = down; e.preventDefault(); }
    };
    const onKeyDown = onKey(true);
    const onKeyUp = onKey(false);

    const toArena = (e: { clientX: number; clientY: number }) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * ARENA.w;
      mouse.y = ((e.clientY - r.top) / r.height) * ARENA.h;
    };
    const onMove = (e: PointerEvent) => toArena(e);
    const onDown = (e: PointerEvent) => { toArena(e); keys.fire = true; };
    const onUp = () => { keys.fire = false; };
    const onBlur = () => { keys.up = keys.down = keys.left = keys.right = keys.fire = false; };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);

    // ---- playback clock + interpolation -------------------------------------------------

    function advanceClock(dtMs: number) {
      // Sit far enough behind the newest snapshot to always have two to blend, plus a
      // margin for however jittery this link actually is.
      const want = clamp(TICK_MS * 1.5 + jitter * 2.5, 45, 250);
      interp += (want - interp) * 0.05;

      const target = newestSt - interp;
      if (playback === 0 || Math.abs(target - playback) > 400) {
        playback = target;
        return;
      }
      playback += dtMs;
      // Nudge rather than jump: at most a 30% speed change, which is imperceptible.
      playback += clamp((target - playback) * 0.08, -dtMs * 0.3, dtMs * 0.3);
    }

    function sample(): Snapshot | null {
      if (buffer.length === 0) return null;
      const newest = buffer[buffer.length - 1]!;
      if (buffer.length === 1 || playback >= newest.st) return newest;

      let older = buffer[0]!;
      let newer = newest;
      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i]!.st <= playback && buffer[i + 1]!.st >= playback) {
          older = buffer[i]!;
          newer = buffer[i + 1]!;
          break;
        }
      }
      const span = newer.st - older.st;
      const p = span > 0 ? clamp((playback - older.st) / span, 0, 1) : 1;

      const players = newer.players.map((n) => {
        const o = older.players.find((q) => q.id === n.id);
        if (!o) return n;
        return { ...n, x: lerp(o.x, n.x, p), y: lerp(o.y, n.y, p), aim: lerpAngle(o.aim, n.aim, p) };
      });
      const bullets = newer.bullets.map((n) => {
        const o = older.bullets.find((q) => q.id === n.id);
        if (!o) return n;
        return { ...n, x: lerp(o.x, n.x, p), y: lerp(o.y, n.y, p) };
      });
      return { st: playback, players, bullets, pads: newer.pads };
    }

    // ---- draw -----------------------------------------------------------------------------

    function drawArena() {
      ctx.fillStyle = "#0a0c10";
      ctx.fillRect(0, 0, ARENA.w, ARENA.h);

      ctx.strokeStyle = "rgba(53,224,230,.055)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 40; x < ARENA.w; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, ARENA.h); }
      for (let y = 40; y < ARENA.h; y += 40) { ctx.moveTo(0, y); ctx.lineTo(ARENA.w, y); }
      ctx.stroke();

      for (const w of WALLS) {
        ctx.fillStyle = "#151b23";
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "#2b3946";
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
      }
    }

    /** Each pad kind gets its own silhouette so you can read the map without a legend. */
    function drawPadGlyph(kind: PadKind, color: string) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";

      if (kind === "health") {
        ctx.beginPath();
        ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
        ctx.moveTo(0, -6); ctx.lineTo(0, 6);
        ctx.stroke();
      } else if (kind === "spread") {
        for (const a of [-0.5, 0, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 2, Math.sin(a) * 2);
          ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
          ctx.stroke();
        }
      } else if (kind === "big") {
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === "bounce") {
        ctx.beginPath();
        ctx.moveTo(-7, 3); ctx.lineTo(-1, -4); ctx.lineTo(3, 2); ctx.lineTo(7, -3);
        ctx.stroke();
      } else {
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    function drawPad(index: number, t: number) {
      const pad = PADS[index];
      if (!pad) return;
      const meta = PAD_META[pad.kind];
      const pulse = 0.5 + 0.5 * Math.sin(t / 420 + index);

      ctx.save();
      ctx.translate(pad.x, pad.y);

      ctx.globalAlpha = 0.1 + pulse * 0.12;
      ctx.fillStyle = meta.color;
      ctx.beginPath();
      ctx.arc(0, 0, PAD_RADIUS + 5 + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, PAD_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      drawPadGlyph(pad.kind, meta.color);
      ctx.restore();
    }

    /** Small ticking pips under a player showing which powers are burning down. */
    function drawPowerPips(pw: Partial<Record<Power, number>>, x: number, y: number) {
      const active = POWERS.filter((k) => (pw[k] ?? 0) > 0);
      if (active.length === 0) return;
      const step = 9;
      let cx = x - ((active.length - 1) * step) / 2;
      for (const k of active) {
        const left = pw[k]!;
        ctx.globalAlpha = left < 3 ? 0.35 + 0.65 * Math.abs(Math.sin(left * 6)) : 1;
        ctx.fillStyle = PAD_META[k].color;
        ctx.beginPath();
        ctx.arc(cx, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        cx += step;
      }
    }

    function drawPlayer(p: PlayerState, x: number, y: number, ang: number, isMe: boolean) {
      ctx.save();
      ctx.translate(x, y);

      if (isMe) {
        ctx.strokeStyle = "rgba(255,171,64,.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_RADIUS + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.rotate(ang);
      if (isMe && muzzle > 0.01) {
        ctx.fillStyle = `rgba(255,214,140,${muzzle * 0.9})`;
        ctx.beginPath();
        ctx.arc(PLAYER_RADIUS + 16, 0, 3 + muzzle * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = p.color;
      ctx.fillRect(PLAYER_RADIUS - 3, -3.5, 15, 7);
      ctx.rotate(-ang);

      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.22;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const barW = 34;
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.fillRect(-barW / 2, -PLAYER_RADIUS - 12, barW, 4);
      ctx.fillStyle = p.hp > 45 ? "#52c17a" : "#ff5d4d";
      ctx.fillRect(-barW / 2, -PLAYER_RADIUS - 12, (barW * p.hp) / MAX_HP, 4);

      ctx.fillStyle = isMe ? "#ffab40" : "rgba(226,221,209,.72)";
      ctx.font = `${isMe ? 700 : 500} 11px "Helvetica Neue",system-ui,sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(p.name, 0, -PLAYER_RADIUS - 18);
      ctx.restore();

      drawPowerPips(p.pw, x, y + PLAYER_RADIUS + 10);
    }

    function drawBullet(b: BulletState, color: string) {
      ctx.save();
      // Phase rounds read as hollow so you can tell at a glance what is coming through a wall.
      ctx.globalAlpha = b.ghost ? 0.5 : 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = b.r > 6 ? 18 : 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      if (b.ghost) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (b.bounce) {
        ctx.strokeStyle = "rgba(255,255,255,.75)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    let raf = 0;
    let lastFrame = performance.now();

    function frame() {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dtMs = Math.min(now - lastFrame, 100);
      lastFrame = now;

      advanceClock(dtMs);
      // Half-life of roughly 80 ms: a correction reads as a lean, not a teleport.
      const decay = Math.pow(0.5, dtMs / 80);
      error.x *= decay;
      error.y *= decay;
      muzzle = Math.max(0, muzzle - dtMs / 90);

      if (now - rateWindow >= 1000) {
        rate = snapsThisSecond;
        snapsThisSecond = 0;
        rateWindow = now;
        setStats({ rtt: rtt === null ? null : Math.round(rtt), jitter: Math.round(jitter), interp: Math.round(interp), predErr: Math.round(predErr * 100) / 100, pending: pending.length, rate });
      }

      drawArena();
      const snap = sample();
      if (!snap) return;

      const myX = predicted.x + error.x;
      const myY = predicted.y + error.y;
      aim = Math.atan2(mouse.y - myY, mouse.x - myX);

      for (const i of snap.pads) drawPad(i, now);

      const colorOf = new Map(snap.players.map((p) => [p.id, p.color] as const));
      for (const b of snap.bullets) drawBullet(b, colorOf.get(b.owner) ?? "#ffab40");

      for (const p of snap.players) {
        if (!p.alive) continue;
        // Others come from the interpolated past; you come from the predicted present.
        if (p.id === id) drawPlayer(p, myX, myY, aim, true);
        else drawPlayer(p, p.x, p.y, p.aim, false);
      }
    }
    frame();

    return () => {
      mounted = false;
      rejoinRef.current = null;
      cancelAnimationFrame(raf);
      clearInterval(cmdTimer);
      clearInterval(pingTimer);
      if (retry) clearTimeout(retry);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      socket?.close();
    };
  }, []);

  const sorted = [...rows].sort((a, b) => b.score - a.score || a.deaths - b.deaths);

  return (
    <div className="shoot">
      <style>{CSS}</style>
      <div className="shoot-stage">
        <div className="shoot-top">
          <div className="shoot-brand">
            <h1>NETLAB</h1>
            <span className="tag">predicted client · authoritative server</span>
          </div>
          <input
            className="shoot-name"
            value={name}
            maxLength={14}
            onChange={(e) => setName(e.target.value)}
          />
          <select className="shoot-name" value={simIndex} onChange={(e) => setSimIndex(Number(e.target.value))} title="Fake network conditions on top of the real link">
            {SIM_PRESETS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
          </select>
          <div className="shoot-pills">
            <span className={`shoot-pill ${status === "live" ? "live" : status === "down" ? "down" : ""}`}>link<b>{status}</b></span>
            <span className="shoot-pill">rtt<b>{stats.rtt === null ? "--" : `${stats.rtt} ms`}</b></span>
            <span className="shoot-pill">online<b>{rows.length}</b></span>
          </div>
        </div>

        <div className="shoot-body">
          <div className="shoot-canvas-wrap">
            <canvas ref={canvasRef} className="shoot-canvas" />
            {status !== "live" && (
              <div className="shoot-overlay">
                <h2>{status === "down" ? "link lost" : "connecting"}</h2>
                <p>
                  {status === "down"
                    ? "Retrying every second. If the host restarted the server, this reconnects on its own."
                    : "Opening a websocket to this page's own host, so the tailnet address just works."}
                </p>
              </div>
            )}
            {status === "live" && dead && (
              <div className="shoot-overlay">
                <h2>respawning</h2>
                <p>The server owns your life total, so there is nothing to click.</p>
              </div>
            )}
          </div>

          <div className="shoot-side">
            <div className="shoot-card">
              <h3>scoreboard</h3>
              {sorted.length === 0 && <div className="shoot-row kd">waiting for the server…</div>}
              {sorted.map((r) => (
                <div key={r.id} className={`shoot-row ${r.id === myId ? "me" : ""}`}>
                  <span className="swatch" style={{ background: r.color }} />
                  <span className="who">{r.name}</span>
                  <span className="pips">
                    {POWERS.filter((k) => (r.pw[k] ?? 0) > 0).map((k) => (
                      <i key={k} style={{ background: PAD_META[k].color }} />
                    ))}
                  </span>
                  <span className="kd">{r.score} / {r.deaths}</span>
                </div>
              ))}
            </div>

            <div className="shoot-card">
              <h3>your powers</h3>
              {POWERS.every((k) => !powers[k]) && <div className="shoot-none">none — go stand on a pad</div>}
              {POWERS.filter((k) => (powers[k] ?? 0) > 0).map((k) => (
                <div key={k} className="shoot-power">
                  <span style={{ color: PAD_META[k].color }}>{PAD_META[k].label}</span>
                  <b>{Math.ceil(powers[k] ?? 0)}s</b>
                  <div className="bar">
                    <div style={{ width: `${((powers[k] ?? 0) / POWER_DURATION) * 100}%`, background: PAD_META[k].color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="shoot-card">
              <h3>pads</h3>
              <div className="shoot-legend">
                {(Object.keys(PAD_META) as PadKind[]).map((k) => (
                  <span key={k}><i style={{ background: PAD_META[k].color }} />{PAD_META[k].label}</span>
                ))}
              </div>
            </div>

            <div className="shoot-card">
              <h3>netcode</h3>
              <div className="shoot-stat"><span>snapshots</span><b>{stats.rate} Hz</b></div>
              <div className="shoot-stat"><span>arrival jitter</span><b>{stats.jitter} ms</b></div>
              <div className="shoot-stat"><span>interp delay</span><b>{stats.interp} ms</b></div>
              <div className="shoot-stat"><span>predict error</span><b className={stats.predErr > 2 ? "warn" : ""}>{stats.predErr} px</b></div>
              <div className="shoot-stat"><span>unacked cmds</span><b>{stats.pending}</b></div>
            </div>

            <div className="shoot-card">
              <h3>kill feed</h3>
              <div className="shoot-feed">
                {feed.length === 0 && <div>nothing yet</div>}
                {feed.map((line, i) => (
                  <div key={`${line}-${i}`} style={{ opacity: 1 - i * 0.15 }}>{line}</div>
                ))}
              </div>
            </div>

            <div className="shoot-card">
              <h3>controls</h3>
              <div className="shoot-keys">
                <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span>
                <span>mouse aims · <kbd>click</kbd> or <kbd>space</kbd> to fire</span>
                <span>Bullets are not lag-compensated, so lead your shots.</span>
                <span>Ricochets can kill you after they bounce.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
