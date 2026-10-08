import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { addDays, formatDuration, formatLongDate, loadAttempt, puzzleNumber, saveAttempt, todayKey } from "../daily";
import { DECOY_COUNT, MAX_BOARD, generatePuzzle } from "./generator";
import { bounds, cellKey, rotateCW, shapeKey, type Cell } from "./pieces";
import { BINDING, YARNS } from "./quilt";
import { BoardSvg, Btn, FONT, INK, KnitDefs, PatchSvg, QuiltBackdrop, ResultCard, SCRIPT, Stat, loadFonts, panelStyle, plural, type Attempt, type PieceState, type Spot } from "./parts";

const GAME = "snug";
/** Backdated a week so there are past quilts to play from day one. */
const LAUNCH_DATE = "2026-10-01";
const TRAY_SCALE = 0.6;
const SLOT_CELLS = 5 * TRAY_SCALE;
/** Room around the board for its binding, in cells. */
const BOARD_PAD = 0.45;

interface Drag {
  id: string;
  /** Index of the held cell, which stays under the pointer through rotations. */
  grab: number;
  fx: number;
  fy: number;
  sx: number;
  sy: number;
  px: number;
  py: number;
  moved: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const shift = (cells: readonly Cell[], s: Spot) => cells.map(([x, y]) => [x + s.x, y + s.y] as Cell);

export function Snug() {
  const today = useMemo(todayKey, []);
  const [dateKey, setDateKey] = useState(today);
  return <SnugDay key={dateKey} dateKey={dateKey} today={today} onPickDate={setDateKey} />;
}

/** One day's quilt. Past days are practice only: nothing is loaded or saved. */
function SnugDay({ dateKey, today, onPickDate }: { dateKey: string; today: string; onPickDate: (key: string) => void }) {
  const isArchive = dateKey < today;
  const puzzle = useMemo(() => generatePuzzle(dateKey, YARNS.length), [dateKey]);
  const number = puzzleNumber(dateKey, LAUNCH_DATE);
  const boardSet = useMemo(() => new Set(puzzle.board.map(([x, y]) => cellKey(x, y))), [puzzle]);
  const initial = useMemo(() => (isArchive ? null : loadAttempt<Attempt>(GAME, dateKey)), [dateKey, isArchive]);
  const freshPieces = useCallback(
    (): PieceState[] => puzzle.pieces.map((p) => ({ id: p.id, cells: p.cells, color: p.color, at: null })),
    [puzzle],
  );

  const [recorded, setRecorded] = useState<Attempt | null>(initial);
  const [pieces, setPieces] = useState<PieceState[]>(() => initial?.pieces ?? freshPieces());
  const [phase, setPhase] = useState<"playing" | "done">(initial ? "done" : "playing");
  const [result, setResult] = useState<{ gaps: number; timeMs: number } | null>(initial);
  const [isReplay, setIsReplay] = useState(false);
  const [showCard, setShowCard] = useState(!!initial);
  const [revealing, setRevealing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [width, setWidth] = useState(0);
  const dragRef = useRef<Drag | null>(null);
  const lastGrab = useRef(0);
  const startRef = useRef<number | null>(null);
  const playRef = useRef<HTMLDivElement>(null);

  useEffect(loadFonts, []);

  useEffect(() => {
    const el = playRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    const side = width >= 820;
    const trayCols = side ? 3 : 4;
    const boardCells = MAX_BOARD + 2 * BOARD_PAD;
    const cell = side
      ? clamp(Math.floor((width - 40) / (boardCells + trayCols * SLOT_CELLS + 1)), 30, 54)
      : clamp(Math.floor((width - 16) / Math.max(boardCells, trayCols * SLOT_CELLS)), 22, 50);
    const area = boardCells * cell;
    const slot = SLOT_CELLS * cell;
    const trayW = trayCols * slot;
    const trayH = Math.ceil(puzzle.pieces.length / trayCols) * slot;
    const gap = cell;
    const totalW = side ? area + gap + trayW : Math.max(area, trayW);
    const left = Math.max(0, (width - totalW) / 2);
    const areaX = side ? left : left + (totalW - area) / 2;
    return {
      side,
      cell,
      slot,
      trayCols,
      board: {
        x: areaX + (BOARD_PAD + (MAX_BOARD - puzzle.cols) / 2) * cell,
        y: (BOARD_PAD + (MAX_BOARD - puzzle.rows) / 2) * cell,
      },
      tray: side
        ? { x: left + area + gap, y: Math.max(0, (area - trayH) / 2), w: trayW, h: trayH }
        : { x: left + (totalW - trayW) / 2, y: area + gap / 2, w: trayW, h: trayH },
      height: side ? Math.max(area, trayH) : area + gap / 2 + trayH,
    };
  }, [width, puzzle]);

  const latest = useRef({ pieces, layout });
  latest.current = { pieces, layout };

  const fits = useCallback(
    (cells: readonly Cell[], at: Spot, id: string, all: PieceState[]) => {
      const taken = new Set<string>();
      for (const p of all) if (p.id !== id && p.at && !p.loose) for (const [x, y] of shift(p.cells, p.at)) taken.add(cellKey(x, y));
      return shift(cells, at).every(([x, y]) => boardSet.has(cellKey(x, y)) && !taken.has(cellKey(x, y)));
    },
    [boardSet],
  );

  const snapFor = useCallback(
    (d: Drag, all: PieceState[]): Spot | null => {
      const p = all.find((q) => q.id === d.id);
      if (!p) return null;
      const { cell, board } = latest.current.layout;
      const [cx, cy] = p.cells[d.grab]!;
      const spot = {
        x: Math.round((d.px - (cx + d.fx) * cell - board.x) / cell),
        y: Math.round((d.py - (cy + d.fy) * cell - board.y) / cell),
      };
      return fits(p.cells, spot, p.id, all) ? spot : null;
    },
    [fits],
  );

  /** Turns a piece; a placed piece pivots on `anchor` and hovers loose if it no longer fits. */
  const transformPiece = useCallback(
    (id: string, fn: (cells: readonly Cell[]) => Cell[], anchor: number) => {
      setPieces((all) =>
        all.map((p) => {
          if (p.id !== id) return p;
          const cells = fn(p.cells);
          if (!p.at || dragRef.current?.moved) return { ...p, cells };
          // A shape that looks the same after turning stays put instead of pivoting off its spot.
          const at =
            shapeKey(cells) === shapeKey(p.cells)
              ? p.at
              : { x: p.at.x + p.cells[anchor]![0] - cells[anchor]![0], y: p.at.y + p.cells[anchor]![1] - cells[anchor]![1] };
          return { ...p, cells, at, loose: !fits(cells, at, id, all) };
        }),
      );
      if (dragRef.current?.id === id) {
        dragRef.current = { ...dragRef.current, fx: 0.5, fy: 0.5 };
        setDrag(dragRef.current);
      }
    },
    [fits],
  );

  const piecePos = (p: PieceState, index: number) => {
    const { cell, board, tray, slot, trayCols } = layout;
    if (drag?.moved && drag.id === p.id) {
      const [cx, cy] = p.cells[drag.grab]!;
      return { x: drag.px - (cx + drag.fx) * cell, y: drag.py - (cy + drag.fy) * cell, s: 1 };
    }
    if (p.at) return { x: board.x + p.at.x * cell, y: board.y + p.at.y * cell, s: 1 };
    const { w, h } = bounds(p.cells);
    return {
      x: tray.x + (index % trayCols) * slot + (slot - w * cell * TRAY_SCALE) / 2,
      y: tray.y + Math.floor(index / trayCols) * slot + (slot - h * cell * TRAY_SCALE) / 2,
      s: TRAY_SCALE,
    };
  };

  const pointerIn = (e: { clientX: number; clientY: number }) => {
    const r = playRef.current!.getBoundingClientRect();
    return { px: e.clientX - r.left, py: e.clientY - r.top };
  };

  const onPieceDown = (e: ReactPointerEvent, p: PieceState, index: number, grab: number) => {
    if (phase !== "playing" || e.button !== 0) return;
    e.preventDefault();
    const { px, py } = pointerIn(e);
    const pos = piecePos(p, index);
    const size = layout.cell * pos.s;
    const d: Drag = {
      id: p.id,
      grab,
      fx: clamp((px - pos.x) / size - p.cells[grab]![0], 0, 1),
      fy: clamp((py - pos.y) / size - p.cells[grab]![1], 0, 1),
      sx: px,
      sy: py,
      px,
      py,
      moved: false,
    };
    dragRef.current = d;
    lastGrab.current = grab;
    setDrag(d);
    setSelected(p.id);
    setConfirming(false);
  };

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const { px, py } = pointerIn(e);
      const next = { ...d, px, py, moved: d.moved || Math.hypot(px - d.sx, py - d.sy) > 5 };
      dragRef.current = next;
      setDrag(next);
    };
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d) return;
      if (!d.moved) {
        transformPiece(d.id, rotateCW, d.grab);
        return;
      }
      setPieces((all) => {
        const spot = snapFor(d, all);
        if (spot && startRef.current === null) startRef.current = Date.now();
        return all.map((p) => (p.id === d.id ? { ...p, at: spot, loose: false } : p));
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, snapFor, transformPiece]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "playing" || e.metaKey || e.ctrlKey || e.altKey) return;
      const id = dragRef.current?.id ?? selected;
      if (!id) return;
      const anchor = dragRef.current?.grab ?? lastGrab.current;
      if (e.key !== " " && e.key.toLowerCase() !== "r") return;
      // Stops Space from scrolling the page or clicking a focused button.
      e.preventDefault();
      if (!e.repeat) transformPiece(id, rotateCW, anchor);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, selected, transformPiece]);

  const liftedId = drag?.moved ? drag.id : null;
  const covered = pieces.reduce((n, p) => n + (p.at && !p.loose && p.id !== liftedId ? p.cells.length : 0), 0);
  const gaps = puzzle.board.length - covered;

  const finish = useCallback(() => {
    const timeMs = startRef.current ? Date.now() - startRef.current : 0;
    const settledPieces = pieces.map((p) => (p.loose ? { ...p, at: null, loose: false } : p));
    setPieces(settledPieces);
    setResult({ gaps, timeMs });
    setPhase("done");
    setConfirming(false);
    setSelected(null);
    if (!isReplay && !isArchive) {
      const attempt: Attempt = { gaps, timeMs, pieces: settledPieces };
      if (saveAttempt(GAME, dateKey, attempt)) setRecorded(attempt);
    }
    window.setTimeout(() => setShowCard(true), gaps === 0 ? 1500 : 250);
  }, [gaps, isReplay, isArchive, pieces, dateKey]);

  useEffect(() => {
    if (phase === "playing" && !dragging && gaps === 0) finish();
  }, [phase, dragging, gaps, finish]);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [phase]);

  const playAgain = () => {
    setPieces(freshPieces());
    setPhase("playing");
    setIsReplay(true);
    setResult(null);
    setShowCard(false);
    setRevealing(false);
    setCopied(false);
    setSelected(null);
    startRef.current = null;
  };

  const reveal = () => {
    setPieces((all) =>
      all.map((p) => {
        const s = puzzle.solution[p.id];
        return s ? { ...p, cells: s.cells, at: { x: s.x, y: s.y }, loose: false } : { ...p, at: null, loose: false };
      }),
    );
    setRevealing(true);
    setShowCard(false);
  };

  const elapsed = phase === "playing" ? (startRef.current ? now - startRef.current : 0) : (result?.timeMs ?? 0);
  const describe = (r: { gaps: number; timeMs: number }) =>
    `${r.gaps === 0 ? "perfectly snug" : plural(r.gaps, "hole")} in ${formatDuration(r.timeMs)}`;
  const shareLine = recorded ? `Snug #${number}: ${describe(recorded)}` : "";
  const ghost = drag?.moved ? snapFor(drag, pieces) : null;
  const ghostPiece = ghost ? pieces.find((p) => p.id === drag!.id) : undefined;
  const perfect = phase === "done" && gaps === 0 && !revealing;
  const { cell, board, tray } = layout;
  const filled = new Set<string>();
  for (const p of pieces) if (p.at && !p.loose && p.id !== liftedId) for (const [x, y] of shift(p.cells, p.at)) filled.add(cellKey(x, y));

  const copyShare = () => {
    navigator.clipboard?.writeText(shareLine).then(() => setCopied(true), () => setCopied(false));
  };

  return (
    <div style={{ fontFamily: FONT, color: INK, width: "100%", userSelect: "none" }}>
      <QuiltBackdrop dateKey={dateKey} />
      <KnitDefs />

      <div style={panelStyle}>
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontFamily: SCRIPT, fontSize: 64, lineHeight: 0.9, color: BINDING, fontWeight: 700 }}>Snug</div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 14, marginTop: 4 }}>
              <DayArrow label="Previous quilt" disabled={dateKey <= LAUNCH_DATE} onClick={() => onPickDate(addDays(dateKey, -1))}>
                &lsaquo;
              </DayArrow>
              <span style={{ opacity: 0.75 }}>
                No. {number} &middot; {formatLongDate(dateKey)}
              </span>
              <DayArrow label="Next quilt" disabled={dateKey >= today} onClick={() => onPickDate(addDays(dateKey, 1))}>
                &rsaquo;
              </DayArrow>
              {isArchive && <Btn onClick={() => onPickDate(today)}>Back to today</Btn>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Stat label="Holes" value={String(gaps)} />
            <Stat label="Time" value={formatDuration(elapsed)} />
          </div>
        </header>
        <p style={{ fontSize: 14, margin: "12px 0 16px", opacity: 0.85, lineHeight: 1.5 }}>
          Fill every square of the quilt. Drag patches in from the basket. Tap a patch to turn it, or press Space or R, even while you are holding one.{" "}
          {DECOY_COUNT} patches in the basket are spares you will not need.
          {isArchive && <strong> This is a past quilt, so play as much as you like; nothing here is scored or saved.</strong>}
        </p>

        <div ref={playRef} style={{ position: "relative", width: "100%", height: width ? layout.height : 420 }}>
          {width > 0 && (
            <>
              <div
                style={{
                  position: "absolute",
                  left: tray.x - 8,
                  top: tray.y - 8,
                  width: tray.w + 16,
                  height: tray.h + 16,
                  borderRadius: 18,
                  background: "repeating-linear-gradient(45deg, #d8b98d 0 6px, #cfae80 6px 12px), #d8b98d",
                  boxShadow: "inset 0 2px 10px rgba(80,45,20,.35)",
                  outline: `2px dashed rgba(123,59,46,.35)`,
                  outlineOffset: -7,
                }}
              />

              <BoardSvg
                board={puzzle.board}
                cols={puzzle.cols}
                rows={puzzle.rows}
                cell={cell}
                pad={BOARD_PAD}
                style={{ position: "absolute", left: board.x - BOARD_PAD * cell, top: board.y - BOARD_PAD * cell }}
                ghost={ghost && ghostPiece ? { cells: shift(ghostPiece.cells, ghost), color: ghostPiece.color } : null}
                holes={phase === "done" && !revealing ? puzzle.board.filter(([x, y]) => !filled.has(cellKey(x, y))) : []}
                perfect={perfect}
              />

              {pieces.map((p, index) => {
                const pos = piecePos(p, index);
                const { w, h } = bounds(p.cells);
                const lifted = drag?.moved && drag.id === p.id;
                return (
                  <div
                    key={p.id}
                    data-piece={p.id}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: w * cell,
                      height: h * cell,
                      transformOrigin: "0 0",
                      transform: `translate(${pos.x}px, ${pos.y}px) scale(${pos.s})`,
                      transition: lifted ? "none" : "transform 220ms cubic-bezier(.2,.9,.3,1.15)",
                      zIndex: lifted ? 50 : p.loose ? 30 : p.at ? 10 : 5,
                      pointerEvents: "none",
                      filter: [
                        selected === p.id && phase === "playing" && !lifted ? "drop-shadow(0 0 2px #fff)" : "",
                        lifted || p.loose ? "drop-shadow(0 12px 10px rgba(40,20,10,.4))" : "drop-shadow(0 2px 2px rgba(40,20,10,.35))",
                      ].join(" "),
                    }}
                  >
                    <PatchSvg
                      piece={p}
                      cell={cell}
                      interactive={phase === "playing"}
                      loose={p.loose && !lifted}
                      onDown={(e, i) => onPieceDown(e, p, index, i)}
                    />
                  </div>
                );
              })}

              {showCard && result && (
                <ResultCard
                  number={number}
                  result={result}
                  recorded={recorded}
                  isReplay={isReplay}
                  note={isArchive ? "Past quilts are practice, so this was not scored." : undefined}
                  shareLine={shareLine}
                  copied={copied}
                  describe={describe}
                  onCopy={copyShare}
                  onReveal={reveal}
                  onPlayAgain={playAgain}
                  onClose={() => setShowCard(false)}
                  center={layout.side ? { x: tray.x + tray.w / 2, y: tray.y + tray.h / 2 } : undefined}
                />
              )}
            </>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20, alignItems: "center" }}>
          {phase === "playing" ? (
            <>
              <Btn disabled={!selected} onClick={() => selected && transformPiece(selected, rotateCW, lastGrab.current)}>Turn</Btn>
              <Btn onClick={() => setPieces((all) => all.map((p) => ({ ...p, at: null, loose: false })))}>Empty the quilt</Btn>
              <span style={{ flex: 1 }} />
              {(isReplay || isArchive) && (
                <span style={{ fontSize: 13, opacity: 0.7 }}>{isArchive ? "Past quilt, not scored" : "Replay, not scored"}</span>
              )}
              {confirming ? (
                <>
                  <span style={{ fontSize: 14 }}>Tie it off with {plural(gaps, "hole")}?</span>
                  <Btn onClick={() => setConfirming(false)}>Keep going</Btn>
                  <Btn primary onClick={finish}>Tie it off</Btn>
                </>
              ) : (
                <Btn primary disabled={covered === 0} onClick={() => setConfirming(true)}>Tie it off</Btn>
              )}
            </>
          ) : (
            <>
              {revealing && <span style={{ fontSize: 14 }}>Showing one perfect fill.</span>}
              <span style={{ flex: 1 }} />
              {!showCard && <Btn onClick={() => setShowCard(true)}>View result</Btn>}
              <Btn primary onClick={playAgain}>Play again (unscored)</Btn>
            </>
          )}
        </div>
      </div>
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
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        border: "none",
        fontFamily: FONT,
        fontSize: 20,
        lineHeight: 1,
        color: INK,
        background: "rgba(123,59,46,.1)",
        outline: "1.5px dashed rgba(123,59,46,.4)",
        outlineOffset: -4,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
      }}
    >
      {children}
    </button>
  );
}
