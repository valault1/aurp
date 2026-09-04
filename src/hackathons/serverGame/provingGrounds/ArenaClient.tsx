import { useEffect, useRef, useState } from "react";
import {
  ARENA, CLASSES, CLASS_LIST, INTERP_MAX_MS, INTERP_MIN_MS, ITEMS, MOBS, PLAYER_RADIUS,
  ROCKS, TICK_MS, clamp, lerp, lerpAngle,
  type ClassId, type ClientMsg, type DropState, type Fx, type MobState, type Phase,
  type PlayerState, type ServerMsg, type ShotState,
} from "./protocol";
import { CSS } from "./styles";

/**
 * PROVING GROUNDS — client. Point and click; the server does the walking.
 *
 * There is deliberately NO prediction here, unlike the shooter. A click-to-move character
 * visibly turns and walks, which hides a round trip on its own, so the client stays a
 * renderer: orders out, snapshots in. Remote units interpolate on a playback clock keyed to
 * the SERVER's tick number rather than to packet arrival, so jitter does not become stutter.
 */

type Snapshot = {
  st: number; phase: Phase; clock: number;
  players: PlayerState[]; mobs: MobState[]; shots: ShotState[]; drops: DropState[];
};

type LiveFx = Fx & { born: number };

const FX_LIFE = 900;

const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function ArenaClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "down">("connecting");
  const [phase, setPhase] = useState<Phase>("lobby");
  const [clock, setClock] = useState(0);
  const [me, setMe] = useState<PlayerState | null>(null);
  const [roster, setRoster] = useState<PlayerState[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [ping, setPing] = useState<number | null>(null);
  const [picked, setPicked] = useState<ClassId | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem("arena-name") || `hero-${Math.floor(Math.random() * 900 + 100)}`);

  const nameRef = useRef(name);
  nameRef.current = name;
  const sendRef = useRef<((m: ClientMsg) => void) | null>(null);
  const castRef = useRef<((slot: number) => void) | null>(null);

  useEffect(() => {
    localStorage.setItem("arena-name", name);
    const id = setTimeout(() => sendRef.current?.({ t: "join", name }), 400);
    return () => clearTimeout(id);
  }, [name]);

  useEffect(() => {
    // Non-null asserted so the hoisted draw functions keep the narrowing; the guard below
    // is still the real runtime check.
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = ARENA.w * dpr;
    canvas.height = ARENA.h * dpr;
    ctx.scale(dpr, dpr);

    const buffer: Snapshot[] = [];
    const liveFx: LiveFx[] = [];
    const seenFx = new Set<number>();
    const cursor = { x: ARENA.w / 2, y: ARENA.h / 2 };
    let marker: { x: number; y: number; born: number } | null = null;

    let id = "";
    let hoverId: string | null = null;
    let myTarget: string | null = null;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;

    let playback = 0;
    let newestSt = 0;
    let interp = TICK_MS * 1.5;
    let jitter = 0;
    let lastArrival = 0;

    const post = (msg: ClientMsg) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
    };
    sendRef.current = post;

    function connect() {
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${location.host}/ws/arena`);
      socket = ws;
      setStatus("connecting");

      ws.onopen = () => {
        setStatus("live");
        // A restarted server counts ticks from zero, so forget the old timeline.
        buffer.length = 0;
        playback = 0;
        newestSt = 0;
        lastArrival = 0;
        post({ t: "join", name: nameRef.current });
      };
      ws.onmessage = (ev) => {
        const msg: ServerMsg = JSON.parse(ev.data);
        if (msg.t === "state") return onSnapshot(msg);
        if (msg.t === "welcome") { id = msg.id; return; }
        if (msg.t === "pong") { setPing(Math.round(performance.now() - msg.ts)); return; }
        if (msg.t === "log") setLines((l) => [msg.line, ...l].slice(0, 8));
      };
      ws.onclose = () => {
        setStatus("down");
        if (mounted) retry = setTimeout(connect, 1000);
      };
      ws.onerror = () => ws.close();
    }
    connect();

    function onSnapshot(msg: Extract<ServerMsg, { t: "state" }>) {
      const now = performance.now();
      const st = msg.tick * TICK_MS;
      if (lastArrival > 0) jitter = jitter * 0.9 + Math.abs(now - lastArrival - TICK_MS) * 0.1;
      lastArrival = now;

      if (st <= playback - 400) return;
      let at = buffer.length;
      while (at > 0 && buffer[at - 1]!.st > st) at--;
      if (at > 0 && buffer[at - 1]!.st === st) return;
      buffer.splice(at, 0, {
        st, phase: msg.phase, clock: msg.clock,
        players: msg.players, mobs: msg.mobs, shots: msg.shots, drops: msg.drops,
      });
      while (buffer.length > 40) buffer.shift();
      newestSt = Math.max(newestSt, st);

      for (const f of msg.fx) {
        if (seenFx.has(f.id)) continue;
        seenFx.add(f.id);
        liveFx.push({ ...f, born: now });
      }
      if (seenFx.size > 600) seenFx.clear();

      const mine = msg.players.find((p) => p.id === id) ?? null;
      myTarget = null;
      setMe(mine);
      setRoster(msg.players);
      setPhase(msg.phase);
      setClock(msg.clock);
      if (mine && mine.cls) setPicked(mine.cls);
      setReady(!!mine?.ready);
    }

    // ---- input ---------------------------------------------------------------------------

    const toArena = (e: { clientX: number; clientY: number }) => {
      const r = canvas.getBoundingClientRect();
      cursor.x = ((e.clientX - r.left) / r.width) * ARENA.w;
      cursor.y = ((e.clientY - r.top) / r.height) * ARENA.h;
    };

    /** What is under the cursor: a monster always, another player only once the duel starts. */
    function pickHover(snap: Snapshot | null) {
      if (!snap) return null;
      let best: string | null = null;
      let bestD = Infinity;
      for (const m of snap.mobs) {
        const d = Math.hypot(m.x - cursor.x, m.y - cursor.y);
        if (d < MOBS[m.kind].r + 10 && d < bestD) { bestD = d; best = m.id; }
      }
      if (snap.phase === "duel") {
        for (const p of snap.players) {
          if (p.id === id || !p.alive) continue;
          const d = Math.hypot(p.x - cursor.x, p.y - cursor.y);
          if (d < PLAYER_RADIUS + 10 && d < bestD) { bestD = d; best = p.id; }
        }
      }
      return best;
    }

    const onMove = (e: PointerEvent) => toArena(e);
    const onDown = (e: PointerEvent) => {
      toArena(e);
      if (hoverId) {
        myTarget = hoverId;
        post({ t: "target", id: hoverId });
      } else {
        marker = { x: cursor.x, y: cursor.y, born: performance.now() };
        post({ t: "move", x: cursor.x, y: cursor.y });
      }
    };

    const cast = (slot: number) => post({ t: "cast", slot, x: cursor.x, y: cursor.y });
    castRef.current = cast;

    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      const slot = { KeyQ: 0, Digit1: 0, KeyW: 1, Digit2: 1, KeyE: 2, Digit3: 2 }[e.code];
      if (slot === undefined) return;
      e.preventDefault();
      cast(slot);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keydown", onKey);

    const pingTimer = setInterval(() => post({ t: "ping", ts: performance.now() }), 1000);

    // ---- interpolation --------------------------------------------------------------------

    function advanceClock(dtMs: number) {
      const want = clamp(TICK_MS * 1.5 + jitter * 2.5, INTERP_MIN_MS, INTERP_MAX_MS);
      interp += (want - interp) * 0.05;
      const target = newestSt - interp;
      if (playback === 0 || Math.abs(target - playback) > 400) { playback = target; return; }
      playback += dtMs;
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
      const blend = <T extends { id: string | number; x: number; y: number; facing?: number }>(list: T[], prev: T[]) =>
        list.map((n) => {
          const o = prev.find((q) => q.id === n.id);
          if (!o) return n;
          return {
            ...n,
            x: lerp(o.x, n.x, p),
            y: lerp(o.y, n.y, p),
            facing: n.facing !== undefined && o.facing !== undefined ? lerpAngle(o.facing, n.facing, p) : n.facing,
          };
        });

      return {
        ...newer,
        players: blend(newer.players, older.players) as PlayerState[],
        mobs: blend(newer.mobs, older.mobs) as MobState[],
        shots: blend(newer.shots, older.shots) as ShotState[],
      };
    }

    // ---- drawing ----------------------------------------------------------------------------

    function drawGround() {
      ctx.fillStyle = "#0b0a09";
      ctx.fillRect(0, 0, ARENA.w, ARENA.h);
      ctx.strokeStyle = "rgba(255,138,61,.035)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 50; x < ARENA.w; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, ARENA.h); }
      for (let y = 50; y < ARENA.h; y += 50) { ctx.moveTo(0, y); ctx.lineTo(ARENA.w, y); }
      ctx.stroke();

      for (const r of ROCKS) {
        ctx.fillStyle = "#1d1913";
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = "#3a3128";
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      }
    }

    function ring(x: number, y: number, r: number, color: string, width = 2) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.42, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    function hpBar(x: number, y: number, w: number, frac: number, color: string) {
      ctx.fillStyle = "rgba(0,0,0,.6)";
      ctx.fillRect(x - w / 2, y, w, 4);
      ctx.fillStyle = color;
      ctx.fillRect(x - w / 2, y, w * clamp(frac, 0, 1), 4);
    }

    function drawMob(m: MobState) {
      const def = MOBS[m.kind];
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.beginPath();
      ctx.ellipse(0, def.r * 0.5, def.r * 0.9, def.r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, def.r, 0, Math.PI * 2);
      ctx.fillStyle = def.color;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = def.color;
      if (m.kind === "imp") {
        ctx.beginPath();
        ctx.moveTo(-6, -def.r + 1); ctx.lineTo(-3, -def.r - 6); ctx.lineTo(-1, -def.r + 1);
        ctx.moveTo(6, -def.r + 1); ctx.lineTo(3, -def.r - 6); ctx.lineTo(1, -def.r + 1);
        ctx.fill();
      } else if (m.kind === "brute") {
        ctx.fillRect(-def.r * 0.5, -def.r * 0.5, def.r, def.r);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -7); ctx.lineTo(6, 0); ctx.lineTo(0, 7); ctx.lineTo(-6, 0);
        ctx.fill();
      }

      ctx.rotate(m.facing);
      ctx.fillStyle = "rgba(255,255,255,.5)";
      ctx.fillRect(def.r - 2, -1.5, 6, 3);
      ctx.restore();

      hpBar(m.x, m.y - def.r - 10, def.r * 2.2, m.hp / m.maxHp, "#c8433c");
    }

    function drawPlayer(p: PlayerState, isMe: boolean) {
      const cls = p.cls ? CLASSES[p.cls] : null;
      const color = cls?.color ?? "#8b8175";
      ctx.save();
      ctx.translate(p.x, p.y);

      ctx.fillStyle = "rgba(0,0,0,.4)";
      ctx.beginPath();
      ctx.ellipse(0, PLAYER_RADIUS * 0.55, PLAYER_RADIUS * 0.95, PLAYER_RADIUS * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(p.facing);
      ctx.fillStyle = color;
      ctx.fillRect(PLAYER_RADIUS - 3, -3, 14, 6);
      ctx.rotate(-p.facing);

      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = p.alive ? 0.28 : 0.08;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = p.alive ? color : "rgba(139,129,117,.5)";
      ctx.lineWidth = 3;
      ctx.stroke();

      if (p.slowed) {
        ctx.strokeStyle = "rgba(111,192,255,.85)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_RADIUS + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      if (p.alive) hpBar(p.x, p.y - PLAYER_RADIUS - 12, 40, p.hp / p.maxHp, "#d2453f");
      ctx.fillStyle = isMe ? "#ffc861" : "rgba(232,224,210,.8)";
      ctx.font = `${isMe ? 700 : 500} 12px "Helvetica Neue",system-ui,sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${p.name} · ${p.level}`, p.x, p.y - PLAYER_RADIUS - 18);
      if (!p.alive) {
        ctx.fillStyle = "rgba(210,69,63,.9)";
        ctx.fillText(p.respawnIn > 0 ? `${Math.ceil(p.respawnIn)}s` : "down", p.x, p.y + 5);
      }
    }

    function drawShot(s: ShotState) {
      const tint = s.hostile ? "#c07bff" : s.kind === "frost" ? "#6fc0ff" : s.kind === "pierce" ? "#9ee37d" : "#ffc861";
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.facing);
      ctx.shadowColor = tint;
      ctx.shadowBlur = 12;
      ctx.fillStyle = tint;
      if (s.kind === "arrow" || s.kind === "pierce") {
        const len = s.kind === "pierce" ? 26 : 14;
        ctx.fillRect(-len / 2, -2, len, 4);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, s.kind === "frost" ? 9 : 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    function drawDrop(d: DropState, t: number) {
      const meta = ITEMS[d.item];
      const bob = Math.sin(t / 320 + d.id) * 3;
      ctx.save();
      ctx.translate(d.x, d.y + bob);
      ctx.shadowColor = meta.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = meta.color;
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(7, 0); ctx.lineTo(0, 8); ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    function drawFx(f: LiveFx, age: number) {
      const life = age / FX_LIFE;
      const fade = 1 - life;
      ctx.save();
      if (f.k === "swing" || f.k === "smash") {
        const spread = f.k === "smash" ? 1.2 : 0.5;
        ctx.strokeStyle = f.k === "smash" ? `rgba(255,138,61,${fade})` : `rgba(255,255,255,${fade * 0.55})`;
        ctx.lineWidth = f.k === "smash" ? 7 : 4;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.v * (0.55 + life * 0.5), f.a - spread, f.a + spread);
        ctx.stroke();
      } else if (f.k === "die") {
        ctx.strokeStyle = `rgba(210,69,63,${fade})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 8 + life * 26, 0, Math.PI * 2);
        ctx.stroke();
      } else if (f.k === "pick") {
        ctx.strokeStyle = `rgba(255,200,97,${fade})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 6 + life * 20, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const rise = life * 30;
        ctx.textAlign = "center";
        if (f.k === "level") {
          ctx.fillStyle = `rgba(255,200,97,${fade})`;
          ctx.font = '800 20px "Helvetica Neue",system-ui,sans-serif';
          ctx.fillText(`LEVEL ${f.v}`, f.x, f.y - 34 - rise);
        } else if (f.k === "xp") {
          ctx.fillStyle = `rgba(255,200,97,${fade * 0.9})`;
          ctx.font = '700 12px "Helvetica Neue",system-ui,sans-serif';
          ctx.fillText(`+${f.v} xp`, f.x, f.y - rise);
        } else {
          ctx.fillStyle = f.k === "heal" ? `rgba(111,191,115,${fade})` : `rgba(255,228,214,${fade})`;
          ctx.font = '800 15px "Helvetica Neue",system-ui,sans-serif';
          ctx.fillText(String(f.v), f.x, f.y - rise);
        }
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

      drawGround();
      const snap = sample();
      if (!snap) return;

      hoverId = pickHover(snap);
      canvas.style.cursor = hoverId ? "pointer" : "crosshair";

      for (const d of snap.drops) drawDrop(d, now);

      if (marker && now - marker.born < 500) {
        const k = (now - marker.born) / 500;
        ring(marker.x, marker.y - 6, 6 + k * 14, `rgba(255,200,97,${1 - k})`);
      }

      const mine = snap.players.find((p) => p.id === id);
      if (mine?.alive) ring(mine.x, mine.y - PLAYER_RADIUS * 0.4, PLAYER_RADIUS + 5, "rgba(255,200,97,.55)", 2);

      const marked = myTarget ?? hoverId;
      if (marked) {
        const t = snap.mobs.find((m) => m.id === marked) ?? snap.players.find((p) => p.id === marked);
        if (t) {
          const r = "kind" in t ? MOBS[(t as MobState).kind].r : PLAYER_RADIUS;
          ring(t.x, t.y - r * 0.4, r + 6, "rgba(210,69,63,.9)", 2.5);
        }
      }

      for (let i = liveFx.length - 1; i >= 0; i--) {
        const f = liveFx[i]!;
        const age = now - f.born;
        if (age > FX_LIFE) { liveFx.splice(i, 1); continue; }
        if (f.k === "swing" || f.k === "smash" || f.k === "die" || f.k === "pick") drawFx(f, age);
      }

      for (const m of snap.mobs) drawMob(m);
      for (const p of snap.players) if (p.cls) drawPlayer(p, p.id === id);
      for (const s of snap.shots) drawShot(s);

      for (const f of liveFx) {
        const age = now - f.born;
        if (f.k !== "swing" && f.k !== "smash" && f.k !== "die" && f.k !== "pick") drawFx(f, age);
      }
    }
    frame();

    return () => {
      mounted = false;
      sendRef.current = null;
      castRef.current = null;
      cancelAnimationFrame(raf);
      clearInterval(pingTimer);
      if (retry) clearTimeout(retry);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      socket?.close();
    };
  }, []);

  const cls = picked ? CLASSES[picked] : null;
  const abilities = cls?.abilities ?? [];
  const winnerLine = lines.find((l) => l.includes("takes it"));
  const standings = [...roster].filter((p) => p.cls).sort((a, b) => b.level - a.level || b.kills - a.kills);

  return (
    <div className="pg">
      <style>{CSS}</style>
      <div className="pg-stage">
        <div className="pg-top">
          <div className="pg-brand">
            <h1>PROVING GROUNDS</h1>
            <span className="tag">farm · then settle it</span>
          </div>
          <input className="pg-name" value={name} maxLength={14} onChange={(e) => setName(e.target.value)} />
          <div className="pg-pills">
            <span className={`pg-pill ${status === "live" ? "live" : status === "down" ? "down" : ""}`}>link<b>{status}</b></span>
            <span className="pg-pill">rtt<b>{ping === null ? "--" : `${ping} ms`}</b></span>
            <span className={`pg-pill clock ${phase === "duel" ? "duel" : ""}`}>
              {phase}<b>{phase === "lobby" ? "—" : fmtClock(clock)}</b>
            </span>
          </div>
        </div>

        <div className="pg-body">
          <div className="pg-arena">
            <canvas ref={canvasRef} className="pg-canvas" />

            {status !== "live" && (
              <div className="pg-overlay"><div className="pg-overlay-inner">
                <h2>{status === "down" ? "link lost" : "connecting"}</h2>
                <p>{status === "down" ? "Retrying every second." : "Opening a websocket to this page's own host."}</p>
              </div></div>
            )}

            {status === "live" && phase === "lobby" && (
              <div className="pg-overlay"><div className="pg-overlay-inner">
                <h2>choose your fighter</h2>
                <p>Five minutes to farm the camps for levels and loot. Then everyone left standing fights, with exactly what they earned. Nothing carries over.</p>
                <div className="pg-classes">
                  {CLASS_LIST.map((cid) => {
                    const c = CLASSES[cid];
                    return (
                      <div
                        key={cid}
                        className={`pg-class ${picked === cid ? "on" : ""}`}
                        style={{ color: c.color }}
                        onClick={() => { setPicked(cid); sendRef.current?.({ t: "pick", cls: cid }); }}
                      >
                        <h3>{c.name}</h3>
                        <div className="blurb">{c.blurb}</div>
                        <dl>
                          <dt>health</dt><dd>{c.hp}</dd>
                          <dt>speed</dt><dd>{c.speed}</dd>
                          <dt>reach</dt><dd>{c.weapon.range}</dd>
                        </dl>
                        <div className="kit">
                          <b>{c.weapon.name}</b> <span>· {c.weapon.dmg} damage every {c.weapon.cd}s</span><br />
                          <b>{c.abilities[0]?.name}</b> <span>· {c.abilities[0]?.blurb}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  className={`pg-go ${ready ? "on" : ""}`}
                  disabled={!picked}
                  onClick={() => { const on = !ready; setReady(on); sendRef.current?.({ t: "ready", on }); }}
                >
                  {ready ? "waiting for the others…" : "ready"}
                </button>
              </div></div>
            )}

            {status === "live" && phase === "result" && (
              <div className="pg-overlay"><div className="pg-overlay-inner">
                <h2>{winnerLine ? winnerLine.split(" takes it")[0] : "round over"}</h2>
                <p>{winnerLine ?? "The dust settles."} Back to the lobby shortly.</p>
                <div className="pg-result">
                  {standings.map((p) => (
                    <div key={p.id}>
                      <b>{p.name}</b> {p.cls} · level {p.level} · {p.kills} kills · {p.deaths} deaths
                    </div>
                  ))}
                </div>
              </div></div>
            )}
          </div>

          <div className="pg-side">
            <div className="pg-card pg-sheet">
              <h3>character</h3>
              {!me?.cls && <div className="pg-help">Pick a class to begin.</div>}
              {me?.cls && (
                <>
                  <div className="who">
                    <b style={{ color: CLASSES[me.cls].color }}>{me.name}</b>
                    <span>{CLASSES[me.cls].name} {me.level}</span>
                  </div>
                  <div className="pg-bar hp"><div style={{ width: `${(me.hp / me.maxHp) * 100}%` }} /></div>
                  <div className="pg-meta"><span>{Math.round(me.hp)} / {me.maxHp}</span><span>{me.xp} / {me.xpNext} xp</span></div>
                  <div className="pg-bar xp"><div style={{ width: `${(me.xp / me.xpNext) * 100}%` }} /></div>
                  <div className="pg-stats" style={{ marginTop: 10 }}>
                    <span>damage</span><b>{me.dmg}</b>
                    <span>speed</span><b>{me.speed}</b>
                    {(Object.keys(ITEMS) as (keyof typeof ITEMS)[])
                      .filter((k) => me.items[k] > 0)
                      .flatMap((k) => [
                        <span key={`n-${k}`} style={{ color: ITEMS[k].color }}>{ITEMS[k].name}</span>,
                        <b key={`v-${k}`}>×{me.items[k]}</b>,
                      ])}
                  </div>
                </>
              )}
            </div>

            <div className="pg-card">
              <h3>abilities</h3>
              <div className="pg-abils">
                {["Q", "W", "E"].map((key, i) => {
                  const ab = abilities[i];
                  const cd = me?.cds[i] ?? 0;
                  return (
                    <div
                      key={key}
                      className={`pg-abil ${ab ? "" : "locked"}`}
                      style={{ borderColor: ab && cd === 0 ? cls?.color : undefined }}
                      onClick={() => ab && castRef.current?.(i)}
                    >
                      <span className="key">{key}</span>
                      <span className="glyph" style={{ color: ab ? cls?.color : undefined }}>{ab ? ab.name[0] : "—"}</span>
                      {cd > 0 && <span className="sweep"><span>{Math.ceil(cd)}</span></span>}
                    </div>
                  );
                })}
              </div>
              {abilities[0] && (
                <div className="pg-abil-name"><b>{abilities[0].name}</b> — {abilities[0].blurb}</div>
              )}
            </div>

            <div className="pg-card">
              <h3>standings</h3>
              {standings.length === 0 && <div className="pg-help">Nobody has picked yet.</div>}
              {standings.map((p) => (
                <div key={p.id} className={`pg-row ${p.id === me?.id ? "me" : ""} ${p.alive ? "" : "dead"}`}>
                  <span className="swatch" style={{ background: p.cls ? CLASSES[p.cls].color : "#555" }} />
                  <span className="who">{p.name}</span>
                  <span className="lv">lv {p.level} · {p.kills}/{p.deaths}</span>
                </div>
              ))}
            </div>

            <div className="pg-card">
              <h3>log</h3>
              <div className="pg-log">
                {lines.length === 0 && <div>nothing yet</div>}
                {lines.map((l, i) => <div key={`${l}-${i}`} style={{ opacity: 1 - i * 0.1 }}>{l}</div>)}
              </div>
            </div>

            <div className="pg-card">
              <h3>how to play</h3>
              <div className="pg-help">
                Click the ground to walk, click a monster to attack it.<br />
                <kbd>Q</kbd> casts your ability at the cursor.<br />
                Walk over loot to pick it up. Health regenerates out of combat, but only while farming.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
