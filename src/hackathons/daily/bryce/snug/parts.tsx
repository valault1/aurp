// Visual building blocks shared by the Snug game and its art sheet.

import { useMemo, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { GlobalStyles } from "@mui/material";
import { formatDuration } from "../daily";
import { bounds, cellKey, outlinePath, type Cell } from "./pieces";
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
  outline: `2px dashed rgba(123,59,46,.45)`,
  outlineOffset: -10,
};

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
  const clip = `snug-clip-${piece.id}`;
  return (
    <svg width={w * cell} height={h * cell} viewBox={`0 0 ${w * U} ${h * U}`} style={{ display: "block", overflow: "visible", animation: loose ? "snugHover 1.8s ease-in-out infinite" : undefined }}>
      <defs>
        <clipPath id={clip}>
          <path d={path} />
        </clipPath>
      </defs>
      <path d={path} fill={`url(#snug-knit-${piece.color})`} />
      <g clipPath={`url(#${clip})`}>
        {loose && <path d={path} fill={RED_THREAD} opacity={0.3} />}
        <path d={path} fill="none" stroke={loose ? RED_THREAD : THREAD} strokeOpacity={0.95} strokeWidth={4.4} strokeDasharray="1.7 1.3" />
        <path d={path} fill="none" stroke={yarn.dark} strokeWidth={2.2} />
      </g>
      <path d={path} fill="none" stroke={yarn.dark} strokeWidth={0.8} strokeLinejoin="round" />
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

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        minWidth: 84,
        padding: "6px 14px",
        borderRadius: 12,
        background: "rgba(123,59,46,.08)",
        outline: "1.5px dashed rgba(123,59,46,.4)",
        outlineOffset: -4,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.65 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

export function Btn({ children, onClick, primary, disabled }: { children: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: FONT,
        fontSize: 15,
        fontWeight: 500,
        padding: "9px 18px",
        borderRadius: 999,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        color: primary ? THREAD : INK,
        background: primary ? BINDING : "rgba(123,59,46,.1)",
        outline: `1.5px dashed ${primary ? "rgba(255,246,230,.7)" : "rgba(123,59,46,.45)"}`,
        outlineOffset: -5,
        boxShadow: primary ? "0 3px 0 #4f2219" : "none",
      }}
    >
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
  note?: string;
}) {
  const { result, recorded, isReplay, center } = props;
  const perfect = result.gaps === 0;
  return (
    <div
      style={{
        position: "absolute",
        left: center ? center.x : "50%",
        top: center ? center.y : "50%",
        transform: "translate(-50%,-50%)",
        animation: "snugPop 260ms ease-out",
        zIndex: 80,
        width: "min(420px, calc(100% - 16px))",
        padding: "26px 24px 22px",
        borderRadius: 20,
        background: LINEN,
        boxShadow: "0 24px 60px rgba(30,15,8,.5)",
        outline: `2px dashed rgba(123,59,46,.5)`,
        outlineOffset: -9,
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: SCRIPT, fontSize: 46, lineHeight: 1, color: perfect ? "#2e8f83" : BINDING, fontWeight: 700 }}>
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
        {!perfect && <Btn onClick={props.onReveal}>Show a perfect fill</Btn>}
        <Btn onClick={props.onClose}>Look at my quilt</Btn>
        <Btn primary onClick={props.onPlayAgain}>Play again (unscored)</Btn>
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
        "@keyframes snugRun": { to: { strokeDashoffset: -29 } },
        ".snug-run": { stroke: "#f6c445", animation: "snugRun 1.1s linear infinite" },
        "@keyframes snugHover": { "0%, 100%": { transform: "translateY(-4px)" }, "50%": { transform: "translateY(-8px)" } },
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
  const padU = pad * U;
  return (
    <svg
      style={{ overflow: "visible", ...style }}
      width={(cols + 2 * pad) * cell}
      height={(rows + 2 * pad) * cell}
      viewBox={`${-padU} ${-padU} ${cols * U + 2 * padU} ${rows * U + 2 * padU}`}
    >
      <path d={path} fill="none" stroke={BINDING} strokeWidth={7} strokeLinejoin="round" style={{ filter: "drop-shadow(0 1.5px 1.5px rgba(0,0,0,.35))" }} />
      <path d={path} fill="none" stroke={THREAD} strokeWidth={4} strokeDasharray="1.6 1.3" className={perfect ? "snug-run" : undefined} />
      <path d={path} fill="none" stroke={BINDING} strokeWidth={2.2} strokeLinejoin="round" />
      <path d={path} fill="url(#snug-linen)" />
      {board.map(([x, y]) => (
        <rect key={cellKey(x, y)} x={x * U + 0.6} y={y * U + 0.6} width={U - 1.2} height={U - 1.2} rx={1} fill="none" stroke="#b89a74" strokeWidth={0.35} strokeDasharray="0.9 0.7" />
      ))}
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
