// Ink-painting primitives for Brink: palette, brush-stroke geometry, SVG ink filters, backdrop, and scroll UI.

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { GlobalStyles } from "@mui/material";
import { makeRng, type Rng } from "../daily";

export const PAPER = "#efe6d2";
export const PAPER_LIGHT = "#f8f3e7";
export const PAPER_DEEP = "#e1d3b4";
export const INK = "#1c1a17";
export const INK_2 = "#45403a";
export const INK_3 = "#8a8276";
export const INK_4 = "#c4b9a3";
export const VERMILION = "#b8322a";
export const WOOD = "#5a3a24";

export const SERIF = "'Shippori Mincho', 'Times New Roman', serif";
export const BRUSH_FONT = "'Yuji Syuku', 'Shippori Mincho', serif";
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;800&family=Yuji+Syuku&display=swap";

export function loadInkFonts() {
  if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONT_HREF;
  document.head.appendChild(link);
}

export type Pt = [number, number];

const fmt = (n: number) => n.toFixed(1);
const toPath = (pts: Pt[]) => "M" + pts.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join("L") + "Z";

/** Catmull-Rom smoothing into a dense polyline. */
function smooth(points: Pt[], closed = false, steps = 8): Pt[] {
  const n = points.length;
  const at = (i: number) => (closed ? points[(i + n) % n]! : points[Math.max(0, Math.min(n - 1, i))]!);
  const out: Pt[] = [];
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const c = (k: 0 | 1) =>
        0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([c(0), c(1)]);
    }
  }
  if (!closed) out.push(points[n - 1]!);
  return out;
}

export interface BrushOpts {
  /** Fraction of the stroke over which the brush presses down. */
  taperStart?: number;
  /** Fraction of the stroke over which the brush lifts off. */
  taperEnd?: number;
  /** How much brush pressure wanders along the stroke. */
  jitter?: number;
}

/** A filled calligraphic stroke along `points`: pressed at the start, lifting toward the end. */
export function brush(points: Pt[], width: number, rng: Rng, o: BrushOpts = {}): string {
  const { taperStart = 0.12, taperEnd = 0.5, jitter = 0.25 } = o;
  const pts = smooth(points);
  const n = pts.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  let press = 1;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const tx = (b[0] - a[0]) / len;
    const ty = (b[1] - a[1]) / len;
    press += (1 + (rng.next() - 0.5) * jitter * 2 - press) * 0.35;
    const down = Math.max(0.35, Math.min(1, t / taperStart)) ** 0.6;
    const lift = Math.min(1, (1 - t) / taperEnd) ** 0.8;
    const half = Math.max(0.25, width * down * lift * press) / 2;
    const p = pts[i]!;
    left.push([p[0] - ty * half, p[1] + tx * half]);
    right.push([p[0] + ty * half, p[1] - tx * half]);
  }
  return toPath([...left, ...right.reverse()]);
}

/** A closed, wobbly ink blob. */
export function blob(cx: number, cy: number, r: number, rng: Rng, wobble = 0.18, squash = 0.92, count = 12): string {
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const rr = r * (1 + (rng.next() - 0.5) * wobble * 2);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash]);
  }
  return toPath(smooth(pts, true, 6));
}

/** A closed, smoothed outline through `points`, each nudged by up to `wobble` units. */
export function shape(points: Pt[], rng: Rng, wobble = 1.5): string {
  return toPath(smooth(points.map(([x, y]) => [x + (rng.next() - 0.5) * wobble * 2, y + (rng.next() - 0.5) * wobble * 2] as Pt), true, 6));
}

/** An enso: a single, almost-closed brush circle. */
export function enso(cx: number, cy: number, r: number, rng: Rng, squash = 1): string {
  const start = -Math.PI * 0.75 + rng.next() * 0.3;
  const sweep = Math.PI * 2 * (0.84 + rng.next() * 0.06);
  const pts: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = start + (sweep * i) / 12;
    const rr = r * (1 + (rng.next() - 0.5) * 0.05);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash]);
  }
  return brush(pts, r * 0.2, rng, { taperStart: 0.05, taperEnd: 0.55, jitter: 0.35 });
}

/** A brushed arrow from `from` to `to`, optionally bowed sideways by `bend`. */
export function arrow(from: Pt, to: Pt, width: number, rng: Rng, bend = 0): string {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const mid: Pt = [(from[0] + to[0]) / 2 - (dy / len) * bend, (from[1] + to[1]) / 2 + (dx / len) * bend];
  const shaft = brush([from, mid, to], width, rng, { taperStart: 0.08, taperEnd: 0.15 });
  const ang = Math.atan2(to[1] - mid[1], to[0] - mid[0]);
  const head = (side: number): string => {
    const a = ang + Math.PI + side * 0.6;
    const back: Pt = [to[0] + Math.cos(a) * width * 3.6, to[1] + Math.sin(a) * width * 3.6];
    return brush([to, back], width * 0.95, rng, { taperStart: 0.05, taperEnd: 0.7 });
  };
  return shaft + head(1) + head(-1);
}

/** Ridge line by midpoint displacement, spanning 0..width. */
function ridge(rng: Rng, width: number, baseY: number, amp: number, depth = 7): Pt[] {
  let pts: Pt[] = [
    [0, baseY - rng.next() * amp * 0.5],
    [width, baseY - rng.next() * amp * 0.5],
  ];
  let spread = amp;
  for (let d = 0; d < depth; d++) {
    const next: Pt[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      next.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - (rng.next() - 0.35) * spread]);
    }
    next.push(pts[pts.length - 1]!);
    pts = next;
    spread *= 0.52;
  }
  return pts;
}

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** Misty mountain ranges in ink wash, a red sun, and a few birds; changes with the date. */
export function inkLandscape(dateKey: string): string {
  const rng = makeRng(`brink-sky:${dateKey}`);
  const W = 1600;
  const H = 1000;
  const layers = [
    { base: 470, amp: 260, op: 0.16, blur: 5 },
    { base: 560, amp: 220, op: 0.26, blur: 3.5 },
    { base: 680, amp: 170, op: 0.4, blur: 2.2 },
    { base: 820, amp: 120, op: 0.62, blur: 1.4 },
  ];
  let defs =
    `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="5"/>` +
    `<feColorMatrix values="0 0 0 0 .33  0 0 0 0 .26  0 0 0 0 .16  0 0 0 .5 -.18"/></filter>` +
    `<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}"/><stop offset=".55" stop-color="${INK}" stop-opacity=".25"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></linearGradient>`;
  let body = `<rect width="${W}" height="${H}" fill="${PAPER}"/>`;
  const sunX = 900 + rng.next() * 500;
  body += `<circle cx="${fmt(sunX)}" cy="${fmt(210 + rng.next() * 60)}" r="74" fill="${VERMILION}" opacity=".55" filter="url(#w0)"/>`;
  defs += `<filter id="w0"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="8"/></filter>`;
  layers.forEach((l, i) => {
    const pts = ridge(rng, W, l.base, l.amp);
    const d = "M0 " + H + "L" + pts.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join("L") + `L${W} ${H}Z`;
    defs +=
      `<filter id="m${i}" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".012 .04" numOctaves="3" seed="${i + 2}"/>` +
      `<feDisplacementMap in="SourceGraphic" scale="${18 - i * 3}"/><feGaussianBlur stdDeviation="${l.blur}"/></filter>`;
    body += `<path d="${d}" fill="url(#fade)" opacity="${l.op}" filter="url(#m${i})"/>`;
    body += `<rect y="${l.base + 40}" width="${W}" height="140" fill="${PAPER}" opacity=".5" filter="url(#m${i})"/>`;
  });
  for (let i = 0; i < 5; i++) {
    const bx = 300 + rng.next() * 700;
    const by = 160 + rng.next() * 160;
    const s = 6 + rng.next() * 5;
    body += `<path d="${brush([[bx - s, by - s * 0.4], [bx, by], [bx + s, by - s * 0.5]], 2.2, rng, { taperStart: 0.2, taperEnd: 0.4 })}" fill="${INK}" opacity=".7"/>`;
  }
  body += `<rect width="${W}" height="${H}" filter="url(#g)"/>`;
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice"><defs>${defs}</defs>${body}</svg>`);
}

/** Fine paper fibers, tiled over panels. */
export const PAPER_GRAIN = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260"><filter id="p"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="8"/>` +
    `<feColorMatrix values="0 0 0 0 .35  0 0 0 0 .27  0 0 0 0 .16  0 0 0 .6 -.22"/></filter><rect width="260" height="260" filter="url(#p)"/></svg>`,
);

/** Shared SVG filters; render once per page. */
export function InkDefs() {
  return (
    <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
      <defs>
        <filter id="brink-rough" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves={2} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {(["h", "v"] as const).map((dir) => (
          <filter key={dir} id={`brink-dry-${dir}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency={dir === "h" ? "0.015 0.5" : "0.5 0.015"} numOctaves={2} seed={9} result="streak" />
            <feColorMatrix in="streak" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.85" result="mask" />
            <feComposite in="SourceGraphic" in2="mask" operator="in" result="dry" />
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={2} result="n" />
            <feDisplacementMap in="dry" in2="n" scale={4} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        ))}
        <filter id="brink-wash" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves={3} seed={7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={12} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={1.6} result="b" />
          <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves={3} seed={13} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.12" result="ga" />
          <feComposite in="b" in2="ga" operator="in" />
        </filter>
        <linearGradient id="brink-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={INK_2} stopOpacity={0.85} />
          <stop offset="0.6" stopColor={INK_3} stopOpacity={0.3} />
          <stop offset="1" stopColor={INK_3} stopOpacity={0} />
        </linearGradient>
        <filter id="brink-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
      </defs>
    </svg>
  );
}

/** Paints the ink landscape behind the whole page while mounted. */
export function InkBackdrop({ dateKey }: { dateKey: string }) {
  const sky = useMemo(() => inkLandscape(dateKey), [dateKey]);
  return (
    <GlobalStyles
      styles={{
        body: { background: `${sky} center bottom / cover no-repeat fixed, ${PAPER} !important` },
        "#root > div": { backgroundColor: "transparent !important" },
        "@keyframes brinkDrift": { from: { transform: "translateX(-14px)" }, to: { transform: "translateX(14px)" } },
        "@keyframes brinkBob": { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-3px)" } },
        "@keyframes brinkPulse": { "0%, 100%": { opacity: 0.85 }, "50%": { opacity: 0.4 } },
        "@keyframes brinkFall": {
          "0%": { transform: "translateY(0) scale(1)", opacity: 1 },
          "100%": { transform: "translateY(70px) scale(0.75)", opacity: 0 },
        },
        "@keyframes brinkFade": { "0%": { opacity: 0.95, transform: "scale(0.6)" }, "30%": { opacity: 0.95, transform: "scale(1)" }, "100%": { opacity: 0 } },
      }}
    />
  );
}

function Rod({ edge }: { edge: "top" | "bottom" }) {
  return (
    <div
      style={{
        position: "absolute",
        [edge]: 0,
        left: -18,
        right: -18,
        height: 16,
        borderRadius: 8,
        background: `linear-gradient(180deg, #8a6243 0%, ${WOOD} 45%, #2e1c10 100%)`,
        boxShadow: "0 4px 8px rgba(20,12,6,.4)",
        zIndex: 2,
      }}
    >
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          style={{
            position: "absolute",
            [side]: -6,
            top: -3,
            width: 14,
            height: 22,
            borderRadius: 5,
            background: "linear-gradient(180deg, #3b2615 0%, #1e120a 100%)",
          }}
        />
      ))}
    </div>
  );
}

/** A hanging scroll: paper body between two wooden rods. */
export function Scroll({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", padding: "8px 0", maxWidth: 1080, margin: "0 auto", width: "100%", ...style }}>
      <Rod edge="top" />
      <div
        style={{
          background: `${PAPER_GRAIN}, linear-gradient(90deg, rgba(120,95,60,.12), rgba(0,0,0,0) 6%, rgba(0,0,0,0) 94%, rgba(120,95,60,.12)), ${PAPER}`,
          padding: "30px clamp(14px, 3vw, 40px) 30px",
          boxShadow: "0 22px 50px rgba(25,18,10,.35)",
          color: INK,
          fontFamily: SERIF,
        }}
      >
        {children}
      </div>
      <Rod edge="bottom" />
    </div>
  );
}

/** A red seal stamp with one character. */
export function Seal({ char, size = 56 }: { char: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", flexShrink: 0 }}>
      <g filter="url(#brink-rough)">
        <rect x={6} y={6} width={88} height={88} rx={8} fill={VERMILION} />
        <rect x={15} y={15} width={70} height={70} rx={4} fill="none" stroke={PAPER_LIGHT} strokeWidth={3} opacity={0.85} />
      </g>
      <text x={50} y={53} textAnchor="middle" dominantBaseline="middle" fontFamily={BRUSH_FONT} fontSize={58} fill={PAPER_LIGHT}>
        {char}
      </text>
    </svg>
  );
}

/** A button drawn as a brush swash (primary) or a brushed underline (secondary). */
export function InkButton({ children, onClick, primary, disabled }: { children: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  const label = typeof children === "string" ? children : "button";
  const d = useMemo(() => {
    const rng = makeRng(`btn:${label}:${primary ? 1 : 0}`);
    return primary
      ? brush([[6, 25], [60, 21], [120, 26], [176, 22]], 38, rng, { taperStart: 0.04, taperEnd: 0.12, jitter: 0.3 })
      : brush([[10, 38], [90, 35], [172, 39]], 4.5, rng, { taperStart: 0.05, taperEnd: 0.4 });
  }, [label, primary]);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        position: "relative",
        border: 0,
        background: "none",
        padding: "10px 28px",
        fontFamily: SERIF,
        fontWeight: 600,
        fontSize: 16,
        letterSpacing: 0.5,
        color: primary ? PAPER_LIGHT : INK,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <svg viewBox="0 0 180 46" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
        <path d={d} fill={INK} filter="url(#brink-rough)" />
      </svg>
      <span style={{ position: "relative" }}>{children}</span>
    </button>
  );
}

/** A small labeled counter in brush-and-serif type. */
export function InkStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 78 }}>
      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: INK_3 }}>{label}</div>
      <div style={{ fontFamily: BRUSH_FONT, fontSize: 30, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}
