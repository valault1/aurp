import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addDays, formatLongDate, loadAttempt, puzzleNumber, saveAttempt, todayKey } from "../daily";
import { cellKey } from "../snug/pieces";
import {
  MAX_TURNS,
  STATS,
  alive,
  applyAction,
  describeResult,
  enemyPhase,
  generateBattle,
  heroActions,
  intentTarget,
  isLand,
  lanternAt,
  moveHero,
  obstacleAt,
  reachable,
  unitAt,
  type Action,
  type Battle,
  type Lantern,
  type Obstacle,
  type Tile,
  type Unit,
} from "./engine";
import { At, CELL, CellArrow, Enemy, Enso, Hero, MoveDot, Prop, SpitLine, Splat, TargetMark, Terrain, Threat, type EnemyKind, type HeroKind } from "./figures";
import { BRUSH_FONT, INK, INK_2, INK_3, InkBackdrop, InkButton, InkDefs, InkStat, PAPER_LIGHT, SERIF, Scroll, Seal, VERMILION, loadInkFonts } from "./ink";

const GAME = "brink";
/** Backdated a week so there are past fights to play from day one. */
const LAUNCH_DATE = "2026-10-01";
const STEP_MS = 650;
const PAD_X = 40;
const PAD_TOP = 110;
const PAD_BOTTOM = 120;

const NAMES: Record<HeroKind | EnemyKind, string> = {
  wanderer: "The Wanderer",
  crane: "The Crane",
  ox: "The Ox",
  blot: "Blot",
  spitter: "Spitter",
  brute: "Brute",
};

const ABILITY: Record<HeroKind, string> = {
  wanderer: "Shove: push an adjacent spirit one tile. No damage, but the edge is close.",
  crane: "Swap: trade places with the first spirit in a straight line, up to three tiles away. Flies over gaps.",
  ox: "Charge: rush in a straight line, dealing 1 damage and shoving the spirit it hits.",
};

interface Figure {
  key: string;
  x: number;
  y: number;
  unit?: Unit;
  obstacle?: Obstacle;
  lantern?: Lantern;
}

interface Attempt {
  status: Battle["status"];
  turns: number;
  wounds: number;
  summary: string;
}

export function Brink() {
  const today = useMemo(todayKey, []);
  const [dateKey, setDateKey] = useState(today);
  return <BrinkDay key={dateKey} dateKey={dateKey} today={today} onPickDate={setDateKey} />;
}

/** One day's fight. Past days are practice only: nothing is loaded or saved. */
function BrinkDay({ dateKey, today, onPickDate }: { dateKey: string; today: string; onPickDate: (key: string) => void }) {
  const isArchive = dateKey < today;
  const number = puzzleNumber(dateKey, LAUNCH_DATE);
  const start = useMemo(() => generateBattle(dateKey), [dateKey]);
  const initial = useMemo(() => (isArchive ? null : loadAttempt<Attempt>(GAME, dateKey)), [dateKey, isArchive]);

  const [battle, setBattle] = useState<Battle>(start);
  const [history, setHistory] = useState<Battle[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<Tile | null>(null);
  const [busy, setBusy] = useState(false);
  const [recorded, setRecorded] = useState<Attempt | null>(initial);
  const [isReplay, setIsReplay] = useState(false);
  const [showCard, setShowCard] = useState(!!initial);
  const [copied, setCopied] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(loadInkFonts, []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const playing = battle.status === "playing" && !(initial && !isReplay);
  const sel = battle.units.find((u) => u.id === selected && !u.dead && u.side === "hero");
  const moves = useMemo(() => (sel && !sel.moved && !sel.acted && !busy ? reachable(battle, sel) : new Map<string, number>()), [battle, sel, busy]);
  const actions = useMemo(() => (sel && !busy ? heroActions(battle, sel) : []), [battle, sel, busy]);
  const actionAt = (x: number, y: number) => actions.find((a) => a.target[0] === x && a.target[1] === y);
  const hoverAction = hover ? actionAt(hover[0], hover[1]) : undefined;

  const finish = useCallback(
    (b: Battle) => {
      const attempt: Attempt = { status: b.status, turns: b.turn, wounds: b.wounds, summary: describeResult(b) };
      if (!isReplay && !isArchive && saveAttempt(GAME, dateKey, attempt)) setRecorded(attempt);
      setSelected(null);
      timers.current.push(window.setTimeout(() => setShowCard(true), 900));
    },
    [isReplay, isArchive, dateKey],
  );

  const commit = (next: Battle) => {
    setHistory((h) => [...h, battle]);
    setBattle(next);
    if (next.status !== "playing") finish(next);
  };

  const onCell = (x: number, y: number) => {
    if (!playing || busy) return;
    if (sel) {
      const a = actionAt(x, y);
      if (a) {
        commit(applyAction(battle, sel.id, a));
        return;
      }
      if (moves.has(cellKey(x, y))) {
        commit(moveHero(battle, sel.id, x, y));
        return;
      }
    }
    const u = unitAt(battle, x, y);
    setSelected(u?.side === "hero" ? u.id : null);
  };

  const undo = () => {
    if (busy || !history.length) return;
    setBattle(history[history.length - 1]!);
    setHistory((h) => h.slice(0, -1));
  };

  const endTurn = () => {
    if (!playing || busy) return;
    const frames = enemyPhase(battle);
    setBusy(true);
    setSelected(null);
    setHistory([]);
    frames.forEach((f, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setBattle(f);
          if (i === frames.length - 1) {
            setBusy(false);
            if (f.status !== "playing") finish(f);
          }
        }, (i + 1) * STEP_MS),
      );
    });
  };

  const fightAgain = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setBattle(start);
    setHistory([]);
    setSelected(null);
    setBusy(false);
    setShowCard(false);
    setCopied(false);
    setIsReplay(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shareLine = recorded ? `Brink #${number}: ${recorded.summary}` : "";
  const enemiesLeft = alive(battle, "enemy").length;
  const heroes = battle.units.filter((u) => u.side === "hero");
  const hoveredUnit = hover ? unitAt(battle, hover[0], hover[1]) : undefined;
  const sortedFigures: Figure[] = [
    ...battle.units.filter((u) => !u.dead).map((u) => ({ key: u.id, x: u.x, y: u.y, unit: u })),
    ...battle.obstacles.map((o) => ({ key: `o${o.x},${o.y}`, x: o.x, y: o.y, obstacle: o })),
    ...(battle.lantern && battle.lantern.hp > 0 ? [{ key: "lantern", x: battle.lantern.x, y: battle.lantern.y, lantern: battle.lantern }] : []),
  ].sort((a, b) => a.y - b.y || a.x - b.x);

  return (
    <div style={{ display: "grid", gap: 28, padding: "4px 0 40px", fontFamily: SERIF, color: INK }}>
      <InkBackdrop dateKey={dateKey} />
      <InkDefs />
      <Scroll>
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 20px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontFamily: BRUSH_FONT, fontSize: 64, lineHeight: 0.9, letterSpacing: "-0.04em" }}>Brink</div>
            <Seal char="崖" size={48} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: INK_2 }}>
                <DayArrow label="Previous fight" disabled={dateKey <= LAUNCH_DATE} onClick={() => onPickDate(addDays(dateKey, -1))}>
                  &lsaquo;
                </DayArrow>
                No. {number} &middot; {formatLongDate(dateKey)}
                <DayArrow label="Next fight" disabled={dateKey >= today} onClick={() => onPickDate(addDays(dateKey, 1))}>
                  &rsaquo;
                </DayArrow>
              </div>
              {isArchive && (
                <button type="button" onClick={() => onPickDate(today)} style={linkStyle}>
                  Back to today
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <InkStat label="Turn" value={`${Math.min(battle.turn, MAX_TURNS)}/${MAX_TURNS}`} />
            <InkStat label="Wounds" value={String(battle.wounds)} />
            <InkStat label="Spirits" value={String(enemiesLeft)} />
          </div>
        </header>
        <p style={{ margin: "14px 0 6px", color: INK_2, fontSize: 14.5, lineHeight: 1.6, maxWidth: 820 }}>
          Clear the plateau of ink spirits within {MAX_TURNS} turns. Select a hero, move, then use their ability. Red marks show
          exactly what each spirit will hit when you end your turn, and a shoved spirit carries its attack with it.
          {battle.lantern && " Keep the shrine lantern lit."}
          {isArchive && <strong> This is a past fight, so nothing here is scored or saved.</strong>}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start", marginTop: 8 }}>
          <div style={{ flex: "1 1 520px", position: "relative", minWidth: 0 }}>
            <svg
              viewBox={`${-PAD_X} ${-PAD_TOP} ${battle.cols * CELL + PAD_X * 2} ${battle.rows * CELL + PAD_TOP + PAD_BOTTOM}`}
              style={{ width: "100%", height: "auto", display: "block", overflow: "visible", userSelect: "none" }}
              onMouseLeave={() => setHover(null)}
            >
              <Terrain layout={battle.layout} seed={dateKey} />

              {[...moves.keys()].map((k) => {
                const [x, y] = k.split(",").map(Number) as [number, number];
                const on = hover && hover[0] === x && hover[1] === y;
                return (
                  <At key={`m${k}`} x={x} y={y}>
                    <MoveDot active={!!on} />
                  </At>
                );
              })}
              {alive(battle, "enemy").map((e) => {
                const hit = intentTarget(battle, e);
                if (!hit) return null;
                const [tx, ty] = hit.tile;
                const struck = unitAt(battle, tx, ty, e.id) || lanternAt(battle, tx, ty) || (e.kind !== "spitter" && isLand(battle, tx, ty));
                return struck ? (
                  <At key={`t${e.id}`} x={tx} y={ty}>
                    <Threat seed={e.id} />
                  </At>
                ) : null;
              })}
              {actions.map((a) => (
                <At key={`a${a.target[0]},${a.target[1]}`} x={a.target[0]} y={a.target[1]}>
                  <TargetMark seed={`${a.target[0]}${a.target[1]}`} />
                </At>
              ))}
              {sel && (
                <At x={sel.x} y={sel.y}>
                  <Enso seed={sel.id} />
                </At>
              )}

              {sortedFigures.map((f) => (
                <Mover key={f.key} x={f.x} y={f.y}>
                  {f.unit &&
                    (f.unit.side === "hero" ? (
                      <g opacity={f.unit.acted && playing ? 0.7 : 1}>
                        <Hero kind={f.unit.kind as HeroKind} hp={f.unit.hp} max={f.unit.max} seed={f.unit.id} />
                      </g>
                    ) : (
                      <Enemy kind={f.unit.kind as EnemyKind} hp={f.unit.hp} max={f.unit.max} seed={f.unit.id} />
                    ))}
                  {f.obstacle && <Prop kind={f.obstacle.kind} seed={f.key} />}
                  {f.lantern && <LanternFigure hp={f.lantern.hp} max={f.lantern.max} />}
                </Mover>
              ))}

              {battle.fx.map((fx) =>
                fx.kind === "fall" && fx.unit ? (
                  <At key={fx.key} x={fx.x} y={fx.y}>
                    <g style={{ animation: "brinkFall 900ms ease-in forwards" }}>
                      {fx.unit.side === "hero" ? <Hero kind={fx.unit.kind as HeroKind} seed={fx.unit.id} /> : <Enemy kind={fx.unit.kind as EnemyKind} seed={fx.unit.id} />}
                    </g>
                  </At>
                ) : fx.kind === "splat" ? (
                  <At key={fx.key} x={fx.x} y={fx.y}>
                    <g style={{ animation: "brinkFade 1100ms ease-out forwards" }}>
                      <Splat seed={fx.key} />
                    </g>
                  </At>
                ) : null,
              )}

              {alive(battle, "enemy").map((e) => {
                const hit = intentTarget(battle, e);
                if (!hit) return null;
                return e.kind === "spitter" ? (
                  <SpitLine key={`i${e.id}`} from={[e.x, e.y]} to={hit.tile as [number, number]} seed={e.id} />
                ) : (
                  <CellArrow key={`i${e.id}`} from={[e.x, e.y]} to={hit.tile as [number, number]} seed={e.id} />
                );
              })}
              {sel && hoverAction && <ActionPreview hero={sel} action={hoverAction} />}

              {Array.from({ length: battle.rows }, (_, y) =>
                Array.from({ length: battle.cols }, (_, x) =>
                  isLand(battle, x, y) ? (
                    <rect
                      key={`c${x},${y}`}
                      x={x * CELL}
                      y={y * CELL}
                      width={CELL}
                      height={CELL}
                      fill="transparent"
                      style={{ cursor: playing && !busy ? "pointer" : "default" }}
                      onMouseEnter={() => setHover([x, y])}
                      onClick={() => onCell(x, y)}
                    />
                  ) : null,
                ),
              )}
            </svg>

            {showCard && (recorded || battle.status !== "playing") && (
              <ResultCard
                battle={battle}
                recorded={recorded}
                number={number}
                isReplay={isReplay}
                isArchive={isArchive}
                shareLine={shareLine}
                copied={copied}
                onCopy={() => navigator.clipboard?.writeText(shareLine).then(() => setCopied(true), () => {})}
                onClose={() => setShowCard(false)}
                onAgain={fightAgain}
              />
            )}
          </div>

          <aside style={{ flex: "0 1 280px", minWidth: 240, display: "grid", gap: 14 }}>
            <div style={{ fontFamily: BRUSH_FONT, fontSize: 26 }}>Your band</div>
            {heroes.map((h) => (
              <RosterRow key={h.id} hero={h} over={!playing} selected={h.id === selected} onSelect={() => playing && !busy && !h.dead && setSelected(h.id)} />
            ))}
            <div style={{ minHeight: 96, padding: "10px 12px", background: "rgba(69,64,58,.06)", fontSize: 13.5, lineHeight: 1.55, color: INK_2 }}>
              {describeHover(battle, sel, hoverAction, hoveredUnit, hover, busy)}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <InkButton onClick={undo} disabled={!history.length || busy || !playing}>
                Undo
              </InkButton>
              <InkButton primary onClick={endTurn} disabled={!playing || busy}>
                {busy ? "Spirits move..." : "End turn"}
              </InkButton>
            </div>
            {(isReplay || isArchive) && playing && <div style={{ fontSize: 12.5, color: INK_3 }}>{isArchive ? "Past fight, not scored." : "Replay, not scored."}</div>}
            {!playing && !showCard && (recorded || battle.status !== "playing") && (
              <InkButton onClick={() => setShowCard(true)}>View result</InkButton>
            )}
          </aside>
        </div>
      </Scroll>
    </div>
  );
}

function describeHover(b: Battle, sel: Unit | undefined, action: Action | undefined, unit: Unit | undefined, hover: Tile | null, busy: boolean): ReactNode {
  if (busy) return "The ink spirits act...";
  if (sel && action) {
    const target = unitAt(b, action.target[0], action.target[1])!;
    const after = applyAction(b, sel.id, action).units.find((u) => u.id === target.id)!;
    const name = NAMES[target.kind];
    const verb = action.kind === "shove" ? "Shove" : action.kind === "swap" ? "Swap with" : "Charge";
    let outcome = "";
    if (action.kind === "swap") outcome = "You trade places; its attack now comes from your old spot.";
    else if (after.dead === "fell") outcome = `${name} is pushed over the edge into the mist.`;
    else if (after.dead === "slain") outcome = `${name} is destroyed.`;
    else if (after.hp < target.hp && after.x === target.x && after.y === target.y) outcome = `${name} slams into something and takes ${target.hp - after.hp} damage.`;
    else if (after.hp < target.hp) outcome = `${name} takes ${target.hp - after.hp} damage and is pushed back.`;
    else outcome = `${name} is pushed one tile.`;
    return (
      <>
        <strong>
          {verb} the {name}.
        </strong>{" "}
        {outcome}
      </>
    );
  }
  if (unit?.side === "enemy") {
    const hit = intentTarget(b, unit);
    const t = hit && (unitAt(b, hit.tile[0], hit.tile[1], unit.id) || (lanternAt(b, hit.tile[0], hit.tile[1]) ? "lantern" : null));
    const aim = !hit ? "Gathering itself; no attack this turn." : t === "lantern" ? "Will strike the shrine lantern." : t ? `Will strike ${t.side === "hero" ? NAMES[t.kind] : `the ${NAMES[t.kind]}`}.` : "Will strike an empty tile.";
    return (
      <>
        <strong>{NAMES[unit.kind]}</strong> &middot; {unit.hp}/{unit.max} health. {aim}
      </>
    );
  }
  if (sel) {
    const status = sel.acted ? "Done for this turn." : sel.moved ? "Moved; ability still ready." : `Moves up to ${STATS[sel.kind].move} tiles.`;
    return (
      <>
        <strong>{NAMES[sel.kind]}</strong> &middot; {status}
        <br />
        {ABILITY[sel.kind as HeroKind]}
      </>
    );
  }
  if (hover && obstacleAt(b, hover[0], hover[1])) return "Solid ground cover. Blocks movement; a spirit shoved into it takes 1 damage.";
  if (hover && lanternAt(b, hover[0], hover[1])) return "The shrine lantern. If it breaks, the day is lost.";
  return "Select a hero to see where it can move and whom it can reach.";
}

function ActionPreview({ hero, action }: { hero: Unit; action: Action }) {
  const [tx, ty] = action.target;
  const pushTo: [number, number] = [tx + action.dir[0], ty + action.dir[1]];
  if (action.kind === "swap") {
    return (
      <>
        <CellArrow from={[hero.x, hero.y]} to={[tx, ty]} color={INK} seed="swap1" bend={22} />
        <CellArrow from={[tx, ty]} to={[hero.x, hero.y]} color={INK} seed="swap2" bend={22} />
      </>
    );
  }
  return (
    <>
      {action.kind === "charge" && action.stop && (action.stop[0] !== hero.x || action.stop[1] !== hero.y) && (
        <CellArrow from={[hero.x, hero.y]} to={action.stop as [number, number]} color={INK_2} seed="charge" />
      )}
      <CellArrow from={[tx, ty]} to={pushTo} color={INK} seed="push" bend={-8} />
    </>
  );
}

/** Animates a figure between tiles; draw order can change without interrupting the glide. */
function Mover({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  const [pos, setPos] = useState({ x, y });
  const cur = useRef(pos);
  useEffect(() => {
    const from = { ...cur.current };
    if (from.x === x && from.y === y) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 380);
      const e = 1 - (1 - k) ** 3;
      const p = { x: from.x + (x - from.x) * e, y: from.y + (y - from.y) * e };
      cur.current = p;
      setPos(p);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [x, y]);
  return <g transform={`translate(${pos.x * CELL + CELL / 2} ${pos.y * CELL + CELL / 2})`}>{children}</g>;
}

function LanternFigure({ hp, max }: { hp: number; max: number }) {
  return (
    <g>
      <Prop kind="lantern" />
      <g transform="translate(0 -96)">
        {Array.from({ length: max }, (_, i) => (
          <rect key={i} x={(i - (max - 1) / 2) * 12 - 4} y={-4} width={8} height={8} rx={4} fill={i < hp ? VERMILION : "none"} stroke={VERMILION} strokeWidth={1.6} />
        ))}
      </g>
    </g>
  );
}

function RosterRow({ hero, over, selected, onSelect }: { hero: Unit; over: boolean; selected: boolean; onSelect: () => void }) {
  const state = hero.dead ? (hero.dead === "fell" ? "Fell into the mist" : "Fallen") : over ? "Standing" : hero.acted ? "Done" : hero.moved ? "Moved" : "Ready";
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "6px 10px 6px 6px",
        border: 0,
        background: selected ? "rgba(28,26,23,.08)" : "transparent",
        outline: selected ? `1.5px solid ${INK}` : "none",
        cursor: hero.dead ? "default" : "pointer",
        opacity: hero.dead ? 0.45 : 1,
        textAlign: "left",
        fontFamily: SERIF,
        color: INK,
      }}
    >
      <svg viewBox="-60 -130 120 160" width={42} height={56} style={{ overflow: "visible", flexShrink: 0 }}>
        <Hero kind={hero.kind as HeroKind} seed={hero.id} />
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{NAMES[hero.kind]}</div>
        <div style={{ display: "flex", gap: 3, margin: "3px 0" }}>
          {Array.from({ length: hero.max }, (_, i) => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: 2, background: i < hero.hp ? VERMILION : "transparent", border: `1.5px solid ${VERMILION}` }} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: INK_3 }}>{state}</div>
      </div>
    </button>
  );
}

function ResultCard(props: {
  battle: Battle;
  recorded: Attempt | null;
  number: number;
  isReplay: boolean;
  isArchive: boolean;
  shareLine: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
  onAgain: () => void;
}) {
  const live = props.battle.status !== "playing";
  const status = live ? props.battle.status : props.recorded!.status;
  const summary = live ? describeResult(props.battle) : props.recorded!.summary;
  const reason = live ? props.battle.lostReason : null;
  const title = status === "won" ? "Cleared" : reason === "lantern" ? "The lantern is dark" : reason === "mist" ? "Lost to the mist" : status === "lost" ? "Fallen" : "Cleared";
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "42%",
        transform: "translate(-50%, -50%)",
        width: "min(400px, calc(100% - 16px))",
        padding: "34px 26px 24px",
        textAlign: "center",
        background: PAPER_LIGHT,
        boxShadow: "0 18px 50px rgba(25,18,10,.35)",
        zIndex: 5,
      }}
    >
      <div style={{ position: "absolute", top: -26, right: -14, transform: "rotate(8deg)" }}>
        <Seal char={status === "won" ? "勝" : "霧"} size={80} />
      </div>
      <div style={{ fontFamily: BRUSH_FONT, fontSize: 40, lineHeight: 1.05 }}>{title}</div>
      <div style={{ marginTop: 10, color: INK_2 }}>
        Brink No. {props.number} &middot; {summary}
      </div>
      {(props.isReplay || props.isArchive) && (
        <div style={{ marginTop: 8, fontSize: 13, color: INK_3 }}>
          {props.isArchive ? "Past fights are practice, so this was not scored." : `This replay was not scored. Today's record: ${props.recorded?.summary ?? "none"}.`}
        </div>
      )}
      {props.shareLine && (
        <div style={{ marginTop: 16, padding: "8px 8px 8px 14px", background: "rgba(69,64,58,.07)", display: "flex", alignItems: "center", gap: 8, fontSize: 14, textAlign: "left" }}>
          <span style={{ flex: 1 }}>{props.shareLine}</span>
          <InkButton onClick={props.onCopy}>{props.copied ? "Copied" : "Copy"}</InkButton>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
        <InkButton onClick={props.onClose}>Look at the board</InkButton>
        <InkButton primary onClick={props.onAgain}>
          Fight again
        </InkButton>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: INK_3 }}>A new plateau rises at midnight.</div>
    </div>
  );
}

function DayArrow({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      style={{ border: 0, background: "none", fontSize: 22, lineHeight: 1, padding: "0 4px", color: INK, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.25 : 0.8, fontFamily: SERIF }}
    >
      {children}
    </button>
  );
}

const linkStyle = { border: 0, background: "none", padding: 0, marginTop: 4, fontFamily: SERIF, fontSize: 13, color: VERMILION, cursor: "pointer", textDecoration: "underline" } as const;
