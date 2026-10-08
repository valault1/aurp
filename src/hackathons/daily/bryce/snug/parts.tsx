// Visual building blocks shared by the Snug game and its art sheet.

import { useEffect, useMemo, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { GlobalStyles } from "@mui/material";
import { formatDuration } from "../daily";
import { makeRng } from "../daily";
import { SHAPES, bounds, outlinePath, rotateCW, type Cell } from "./pieces";
import { StitchBorder, Stitching, insetCellLoops, stitchLoops } from "./stitches";
import { BINDING, LINEN, THREAD, YARNS, quiltBackground } from "./quilt";

/** SVG units per grid cell. */
export const U = 10;
export const INK = "#4a2c22";
export const FONT = "'Fredoka', system-ui, sans-serif";
export const SCRIPT = "'Caveat', cursive";
export const FONT_HREF = "https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Fredoka:wght@400;500;600&display=swap";

export type Spot = { x: number; y: number };

export interface PieceState {
  id: string;
  cells: Cell[];
  color: number;
  at: Spot | null;
  /** On the quilt but not fitting after a turn: it hovers and covers nothing. */
  loose?: boolean;
}

export interface Attempt {
  gaps: number;
  timeMs: number;
  pieces: PieceState[];
}

/** Thread color for hole marks and pieces that do not fit. */
export const RED_THREAD = "#c0392b";
export const GOLD_THREAD = "#f6c445";

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function loadFonts() {
  if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONT_HREF;
  document.head.appendChild(link);
}

export const panelStyle: CSSProperties = {
  position: "relative",
  maxWidth: 1080,
  margin: "0 auto",
  padding: "24px clamp(12px, 3vw, 32px) 28px",
  borderRadius: 22,
  background: `repeating-linear-gradient(0deg, rgba(160,130,90,.07) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(160,130,90,.07) 0 1px, transparent 1px 3px), ${LINEN}`,
  boxShadow: "0 18px 50px rgba(30,15,8,.55), 0 2px 0 rgba(255,255,255,.4) inset",
};

/** Thread color for stitching on linen. */
export const RUST_THREAD = "#a35a42";

/** The sewn edge inside a linen panel; place it as the panel's first child. */
export function PanelStitches({ seed }: { seed: string }) {
  return <StitchBorder inset={11} radius={14} color={RUST_THREAD} width={2.4} stitch={8} gap={5} seed={seed} />;
}

export function KnitDefs() {
  return (
    <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
      <defs>
        {YARNS.map((y, i) => (
          <pattern key={y.name} id={`snug-knit-${i}`} width={5} height={4.4} patternUnits="userSpaceOnUse">
            <rect width={5} height={4.4} fill={y.dark} />
            <ellipse cx={1.35} cy={2.2} rx={1.12} ry={2.15} transform="rotate(-30 1.35 2.2)" fill={y.base} />
            <ellipse cx={3.65} cy={2.2} rx={1.12} ry={2.15} transform="rotate(30 3.65 2.2)" fill={y.base} />
            <ellipse cx={1.05} cy={1.6} rx={0.36} ry={0.85} transform="rotate(-30 1.05 1.6)" fill={y.light} opacity={0.8} />
            <ellipse cx={3.95} cy={1.6} rx={0.36} ry={0.85} transform="rotate(30 3.95 1.6)" fill={y.light} opacity={0.8} />
          </pattern>
        ))}
        <pattern id="snug-linen" width={2} height={2} patternUnits="userSpaceOnUse">
          <rect width={2} height={2} fill={LINEN} />
          <path d="M0 .5H2M.5 0V2" stroke="#d6c4a2" strokeWidth={0.25} />
        </pattern>
      </defs>
    </svg>
  );
}

export function PatchSvg({
  piece,
  cell,
  interactive,
  loose = false,
  onDown,
}: {
  piece: PieceState;
  cell: number;
  interactive: boolean;
  loose?: boolean;
  onDown: (e: ReactPointerEvent, cellIndex: number) => void;
}) {
  const { w, h } = bounds(piece.cells);
  const path = outlinePath(piece.cells, U);
  const yarn = YARNS[piece.color]!;
  const stitches = useMemo(
    () => stitchLoops(insetCellLoops(piece.cells, U, 2), makeRng(`patch:${piece.id}`), { stitch: 2.1, gap: 1.3, wobble: 0.22, hole: 0.3 }),
    [piece.cells, piece.id],
  );
  const clip = `snug-clip-${piece.id}`;
  return (
    <svg width={w * cell} height={h * cell} viewBox={`0 0 ${w * U} ${h * U}`} style={{
        display: "block",
        overflow: "visible",
        // Chrome ignores touch-action on inner SVG shapes, so the outer svg stops touch drags from scrolling the page.
        touchAction: interactive ? "none" : undefined,
        animation: loose ? "snugHover 1.8s ease-in-out infinite" : undefined,
      }}
    >
      <defs>
        <clipPath id={clip}>
          <path d={path} />
        </clipPath>
      </defs>
      <path d={path} fill={`url(#snug-knit-${piece.color})`} />
      <g clipPath={`url(#${clip})`}>
        {loose && <path d={path} fill={RED_THREAD} opacity={0.3} />}
        <path d={path} fill="none" stroke={yarn.dark} strokeWidth={2.2} />
      </g>
      <path d={path} fill="none" stroke={yarn.dark} strokeWidth={0.8} strokeLinejoin="round" />
      <Stitching paths={stitches} width={0.88} color={loose ? RED_THREAD : THREAD} />
      {piece.cells.map(([x, y], i) => (
        <rect
          key={i}
          x={x * U}
          y={y * U}
          width={U}
          height={U}
          fill="transparent"
          style={{ pointerEvents: interactive ? "all" : "none", cursor: "grab", touchAction: "none" }}
          onPointerDown={(e) => onDown(e, i)}
          onContextMenu={(e) => e.preventDefault()}
        />
      ))}
    </svg>
  );
}

export function Stat({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        minWidth: compact ? 64 : 84,
        padding: compact ? "5px 10px" : "6px 14px",
        borderRadius: 12,
        background: "rgba(123,59,46,.08)",
        textAlign: "center",
      }}
    >
      <StitchBorder inset={4.5} radius={8} color={RUST_THREAD} width={1.7} stitch={5} gap={3.5} seed={`stat:${label}`} />
      <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.65 }}>{label}</div>
      <div style={{ fontSize: compact ? 18 : 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

export function Btn({
  children,
  onClick,
  primary,
  disabled,
  small,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        position: "relative",
        fontFamily: FONT,
        fontSize: small ? 14 : 15,
        fontWeight: 500,
        padding: small ? "8px 13px" : "9px 18px",
        borderRadius: 999,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        color: primary ? THREAD : INK,
        background: primary ? BINDING : "rgba(123,59,46,.1)",
        boxShadow: primary ? "0 3px 0 #4f2219" : "none",
      }}
    >
      <StitchBorder
        inset={5}
        radius={14}
        color={primary ? THREAD : RUST_THREAD}
        width={1.6}
        stitch={5}
        gap={3.5}
        seed={`btn:${typeof children === "string" ? children : "button"}`}
      />
      {children}
    </button>
  );
}

export function ResultCard(props: {
  number: number;
  result: { gaps: number; timeMs: number };
  recorded: Attempt | null;
  isReplay: boolean;
  shareLine: string;
  copied: boolean;
  describe: (r: { gaps: number; timeMs: number }) => string;
  onCopy: () => void;
  onReveal: () => void;
  onPlayAgain: () => void;
  onClose: () => void;
  /** Card center in the play area, in px; defaults to the middle. */
  center?: { x: number; y: number };
  /** Shows the card as a compact sheet pinned to the bottom of the screen (phones). */
  sheet?: boolean;
  note?: string;
}) {
  const { result, recorded, isReplay, center, sheet = false } = props;
  const perfect = result.gaps === 0;
  return (
    <div
      style={{
        position: sheet ? "fixed" : "absolute",
        left: center ? center.x : "50%",
        top: sheet ? "auto" : center ? center.y : "50%",
        bottom: sheet ? 10 : "auto",
        transform: sheet ? "translate(-50%,0)" : "translate(-50%,-50%)",
        animation: `${sheet ? "snugPopTop" : "snugPop"} 260ms ease-out`,
        zIndex: 80,
        width: sheet ? "min(420px, calc(100vw - 20px))" : "min(420px, calc(100% - 16px))",
        padding: sheet ? "18px 16px 14px" : "26px 24px 22px",
        borderRadius: 20,
        background: LINEN,
        boxShadow: "0 24px 60px rgba(30,15,8,.5)",
        textAlign: "center",
      }}
    >
      <StitchBorder inset={10} radius={13} color={RUST_THREAD} width={2.2} stitch={7} gap={4.5} seed="result-card" />
      <div style={{ fontFamily: SCRIPT, fontSize: sheet ? 36 : 46, lineHeight: 1, color: perfect ? "#2e8f83" : BINDING, fontWeight: 700 }}>
        {perfect ? "Perfectly snug!" : `${plural(result.gaps, "hole")} left`}
      </div>
      <div style={{ fontSize: 15, marginTop: 8 }}>
        Snug No. {props.number} &middot; {formatDuration(result.timeMs)}
      </div>
      {props.note && <div style={{ fontSize: 13, marginTop: 10, opacity: 0.8 }}>{props.note}</div>}
      {isReplay && recorded && (
        <div style={{ fontSize: 13, marginTop: 10, opacity: 0.8 }}>
          This replay was not scored. Today&apos;s recorded result: {props.describe(recorded)}.
        </div>
      )}
      {props.shareLine && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16, padding: "8px 8px 8px 14px", borderRadius: 12, background: "rgba(123,59,46,.08)" }}>
          <span style={{ flex: 1, fontSize: 14, textAlign: "left" }}>{props.shareLine}</span>
          <Btn onClick={props.onCopy}>{props.copied ? "Copied" : "Copy"}</Btn>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 18 }}>
        {!perfect && (
          <Btn small={sheet} onClick={props.onReveal}>
            Show a perfect fill
          </Btn>
        )}
        <Btn small={sheet} onClick={props.onClose}>
          Look at my quilt
        </Btn>
        <Btn small={sheet} primary onClick={props.onPlayAgain}>
          Play again (unscored)
        </Btn>
      </div>
      <div style={{ fontSize: 12, marginTop: 14, opacity: 0.6 }}>A new quilt arrives at midnight.</div>
    </div>
  );
}

/** Paints the date's patchwork quilt behind the whole page while mounted. */
export function QuiltBackdrop({ dateKey }: { dateKey: string }) {
  const quilt = useMemo(() => quiltBackground(dateKey), [dateKey]);
  return (
    <GlobalStyles
      styles={{
        body: {
          background: `radial-gradient(ellipse at 50% 40%, rgba(45,25,15,0) 35%, rgba(45,25,15,.55) 100%) fixed, ${quilt} repeat fixed #8a6a55 !important`,
        },
        "#root > div": { backgroundColor: "transparent !important" },
        "@keyframes snugShimmer": { "0%, 100%": { opacity: 1, filter: "brightness(1)" }, "50%": { opacity: 0.85, filter: "brightness(1.35)" } },
        ".snug-gold": { animation: "snugShimmer 1.3s ease-in-out infinite" },
        "@keyframes snugHover": { "0%, 100%": { transform: "translateY(-4px)" }, "50%": { transform: "translateY(-8px)" } },
        "@keyframes snugPopIn": { "0%": { transform: "scale(.92)", opacity: 0 }, "100%": { transform: "scale(1)", opacity: 1 } },
        "@keyframes snugFadeIn": { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        "@keyframes snugPopTop": {
          "0%": { transform: "translate(-50%,4%) scale(.92)", opacity: 0 },
          "100%": { transform: "translate(-50%,0) scale(1)", opacity: 1 },
        },
        "@keyframes snugPop": {
          "0%": { transform: "translate(-50%,-46%) scale(.92)", opacity: 0 },
          "100%": { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
        },
      }}
    />
  );
}

/** The linen quilt top with its stitched binding, an optional drop preview, and hole marks. */
export function BoardSvg({
  board,
  cols,
  rows,
  cell,
  pad,
  style,
  ghost = null,
  holes = [],
  perfect = false,
}: {
  board: Cell[];
  cols: number;
  rows: number;
  cell: number;
  pad: number;
  style?: CSSProperties;
  ghost?: { cells: Cell[]; color: number } | null;
  holes?: Cell[];
  perfect?: boolean;
}) {
  const path = useMemo(() => outlinePath(board, U), [board]);
  // Loose basting stitches marking each cell of the quilt top.
  const basting = useMemo(() => {
    const rng = makeRng(`basting:${cols}x${rows}:${board.length}`);
    return board
      .map(([x, y]) => stitchLoops(insetCellLoops([[x, y]], U, 0.7), rng, { stitch: 1.1, gap: 0.75, wobble: 0.1, hole: 0 }).thread)
      .join("");
  }, [board, cols, rows]);
  const binding = useMemo(
    () => stitchLoops(insetCellLoops(board, U, -1.75), makeRng(`binding:${cols}x${rows}:${board.length}`), { stitch: 2.4, gap: 1.4, wobble: 0.22, hole: 0.32 }),
    [board, cols, rows],
  );
  const padU = pad * U;
  return (
    <svg
      style={{ overflow: "visible", ...style }}
      width={(cols + 2 * pad) * cell}
      height={(rows + 2 * pad) * cell}
      viewBox={`${-padU} ${-padU} ${cols * U + 2 * padU} ${rows * U + 2 * padU}`}
    >
      <path d={path} fill="none" stroke={BINDING} strokeWidth={7} strokeLinejoin="round" style={{ filter: "drop-shadow(0 1.5px 1.5px rgba(0,0,0,.35))" }} />

      <path d={path} fill="none" stroke={BINDING} strokeWidth={2.2} strokeLinejoin="round" />
      <path d={path} fill="url(#snug-linen)" />
      <Stitching paths={binding} width={1} color={perfect ? GOLD_THREAD : THREAD} className={perfect ? "snug-gold" : undefined} />
      <path d={basting} fill="none" stroke="#bf9e76" strokeWidth={0.42} strokeLinecap="round" opacity={0.85} />
      {ghost && (
        <path
          d={outlinePath(ghost.cells, U)}
          fill={YARNS[ghost.color]!.base}
          fillOpacity={0.28}
          stroke={YARNS[ghost.color]!.dark}
          strokeWidth={0.8}
          strokeDasharray="2 1.4"
        />
      )}
      {holes.map(([x, y]) => (
        <path
          key={`hole-${x},${y}`}
          d={`M${x * U + 3} ${y * U + 3}L${x * U + 7} ${y * U + 7}M${x * U + 7} ${y * U + 3}L${x * U + 3} ${y * U + 7}`}
          stroke={RED_THREAD}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function MiniPatch({ shape, color, cell = 14, turned = 0 }: { shape: string; color: number; cell?: number; turned?: number }) {
  let cells = SHAPES[shape]!;
  for (let i = 0; i < turned; i++) cells = rotateCW(cells);
  return <PatchSvg piece={{ id: `howto-${shape}-${turned}`, cells, color, at: null }} cell={cell} interactive={false} onDown={() => {}} />;
}

function Arrow({ curve = false }: { curve?: boolean }) {
  return (
    <svg width={30} height={24} viewBox="0 0 30 24" style={{ flexShrink: 0 }}>
      <path d={curve ? "M6 18 A9 9 0 1 1 22 16" : "M3 12 H23"} fill="none" stroke={RUST_THREAD} strokeWidth={2.4} strokeLinecap="round" strokeDasharray="4 3" />
      <path d={curve ? "M17 13 L22.5 16.5 L24 10" : "M18 6 L25 12 L18 18"} fill="none" stroke={RUST_THREAD} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ flex: "1 1 120px", display: "grid", justifyItems: "center", gap: 8, padding: "12px 8px 10px", borderRadius: 14, background: "rgba(123,59,46,.07)" }}>
      <div style={{ height: 52, display: "flex", alignItems: "center", gap: 4 }}>{children}</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
    </div>
  );
}

const SQUARE: Cell[] = [[0, 0], [1, 0], [0, 1], [1, 1]];

/** The rules, shown as a stitched card over a dimmed page. */
export function HowToPlay({ onClose, touch, spares }: { onClose: () => void; touch: boolean; spares: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const section = (heading: string, body: ReactNode) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 15 }}>{heading}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.85 }}>{body}</div>
    </div>
  );
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1300, display: "grid", placeItems: "center", padding: 12, background: "rgba(40,22,14,.5)", animation: "snugFadeIn 200ms ease-out" }}
    >
      <div
        role="dialog"
        aria-label="How to play"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          display: "flex",
          width: "min(480px, 100%)",
          maxHeight: "calc(100dvh - 24px)",
          padding: 15,
          borderRadius: 20,
          background: LINEN,
          boxShadow: "0 24px 60px rgba(30,15,8,.5)",
          animation: "snugPopIn 260ms ease-out",
          fontFamily: FONT,
          color: INK,
        }}
      >
        <StitchBorder inset={10} radius={13} color={RUST_THREAD} width={2.2} stitch={7} gap={4.5} seed="how-to-play" />
        {/* Text scrolls inside the stitched edge so the seam stays put. */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px 6px" }}>
        <div style={{ fontFamily: SCRIPT, fontSize: 44, lineHeight: 1, color: BINDING, fontWeight: 700, textAlign: "center" }}>How to play</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          <Step title="Drag a patch in">
            <MiniPatch shape="T4" color={5} />
            <Arrow />
            <BoardSvg board={[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]} cols={3} rows={2} cell={14} pad={0.45} />
          </Step>
          <Step title={touch ? "Tap to turn" : "Tap, Space, or R to turn"}>
            <MiniPatch shape="L4" color={1} />
            <Arrow curve />
            <MiniPatch shape="L4" color={1} turned={1} />
          </Step>
          <Step title="Leave no holes">
            <div style={{ position: "relative" }}>
              <BoardSvg board={SQUARE} cols={2} rows={2} cell={18} pad={0.45} perfect />
              <div style={{ position: "absolute", left: 0.45 * 18, top: 0.45 * 18 }}>
                <PatchSvg piece={{ id: "howto-fill", cells: SQUARE, color: 3, at: null }} cell={18} interactive={false} onDown={() => {}} />
              </div>
            </div>
          </Step>
        </div>
        {section("Fill the quilt", "Every square of today's quilt can be filled exactly with patches from the basket.")}
        {section("Watch for spares", `${spares} patches in the basket are spares that do not belong anywhere. Part of the puzzle is working out which.`)}
        {section(
          "Move and turn",
          <>
            Drag a patch onto the quilt and it snaps into place. {touch ? "Tap a patch to turn it." : "Tap it, or press Space or R (even mid-drag), to turn it."} Patches turn but never
            flip. Turn a placed patch where it no longer fits and it hovers in red thread until you turn or move it again.
          </>,
        )}
        {section("Scoring", "Fewer holes is better, and time breaks ties. The clock starts with your first patch. A perfect fill finishes on its own; otherwise press Tie it off.")}
        {section("One quilt a day", "Your first finish each day is your recorded result. Replays and past quilts are just for fun. A new quilt arrives at midnight.")}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          <Btn primary onClick={onClose}>
            Start stitching
          </Btn>
        </div>
        </div>
      </div>
    </div>
  );
}
