import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";

const W = 820;
const H = 240;
const PAD = { top: 20, right: 54, bottom: 18, left: 16 };

const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const MONO = `'SF Mono', 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace`;

/** Picks a gridline interval that yields roughly 4-6 lines across the span. */
function gridStep(span: number): number {
  const candidates = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];
  for (const c of candidates) {
    if (span / c <= 6) return c;
  }
  return 200;
}

/** Eased 0 -> 1 progress, restarted whenever `resetKey` changes. */
function useReveal(duration: number, resetKey: unknown): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setProgress(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, resetKey]);
  return progress;
}

type Props = {
  series: number[];
  /** Replays the plot-in animation whenever this changes. */
  animationKey: string | number;
  /** Chrome accent, from the active MUI theme. */
  accent: string;
};

export function TickerChart({ series, animationKey, accent }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const reveal = useReveal(1500, animationKey);

  const geometry = useMemo(() => {
    const base = series[0]!;
    const pct = series.map((v) => (v / base - 1) * 100);

    const rawMin = Math.min(...pct);
    const rawMax = Math.max(...pct);
    const headroom = Math.max((rawMax - rawMin) * 0.14, 0.5);
    const lo = rawMin - headroom;
    const hi = rawMax + headroom;

    const x = (i: number) => PAD.left + (i / (series.length - 1)) * PLOT_W;
    const y = (p: number) => PAD.top + (1 - (p - lo) / (hi - lo)) * PLOT_H;

    const points = pct.map((p, i) => ({ x: x(i), y: y(p), pct: p }));
    const line = points.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(" ");
    const area = `${line} L${points[points.length - 1]!.x.toFixed(2)},${H - PAD.bottom} L${points[0]!.x.toFixed(2)},${H - PAD.bottom} Z`;

    const step = gridStep(hi - lo);
    const gridlines: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      gridlines.push(Math.round(v * 100) / 100);
    }

    return { pct, points, line, area, lo, hi, gridlines, zeroY: y(0), isUp: pct[pct.length - 1]! >= 0 };
  }, [series]);

  const { points, line, area, gridlines, zeroY, isUp } = geometry;

  const up = "#34d399";
  const down = "#fb7185";
  const curve = isUp ? up : down;

  const last = points[points.length - 1]!;
  const hovered = hoverIndex === null ? null : points[hoverIndex]!;

  const handleMove = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * W;
    const ratio = (svgX - PAD.left) / PLOT_W;
    const i = Math.round(ratio * (series.length - 1));
    setHoverIndex(Math.min(series.length - 1, Math.max(0, i)));
  };

  return (
    <Box>
      <Box
        ref={wrapRef}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setHoverIndex(null)}
        onTouchStart={(e) => handleMove(e.touches[0]!.clientX)}
        onTouchMove={(e) => handleMove(e.touches[0]!.clientX)}
        onTouchEnd={() => setHoverIndex(null)}
        sx={{ position: "relative", width: "100%", cursor: "crosshair", touchAction: "pan-y" }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id="tickerArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={curve} stopOpacity={0.32} />
              <stop offset="60%" stopColor={curve} stopOpacity={0.08} />
              <stop offset="100%" stopColor={curve} stopOpacity={0} />
            </linearGradient>
            <clipPath id="tickerReveal">
              {/* Plain numeric width: framer-motion writes SVG widths with a "px"
                  suffix, which the rect geometry attribute resolves to zero. */}
              <rect x={0} y={0} height={H} width={reveal * W} />
            </clipPath>
          </defs>

          {/* grid */}
          {gridlines.map((v) => {
            const gy = PAD.top + (1 - (v - geometry.lo) / (geometry.hi - geometry.lo)) * PLOT_H;
            const isZero = Math.abs(v) < 1e-9;
            return (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={gy}
                  y2={gy}
                  stroke={isZero ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.06)"}
                  strokeWidth={1}
                  strokeDasharray={isZero ? "4 4" : undefined}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={W - PAD.right + 10}
                  y={gy + 3.5}
                  fill={isZero ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.28)"}
                  fontSize={11}
                  fontFamily={MONO}
                  style={{ letterSpacing: "0.04em" }}
                >
                  {v > 0 ? "+" : ""}
                  {v}%
                </text>
              </g>
            );
          })}

          <g clipPath="url(#tickerReveal)">
            <path d={area} fill="url(#tickerArea)" />
            <path
              d={line}
              fill="none"
              stroke={curve}
              strokeWidth={2.25}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ filter: `drop-shadow(0 0 7px ${curve})` }}
            />
          </g>

          {/* live marker on the most recent close */}
          <motion.g
            key={`marker-${animationKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.45, duration: 0.3 }}
          >
            {/* SMIL rather than framer-motion: animating `r` through motion
                leaves it undefined on the first render. */}
            <circle cx={last.x} cy={last.y} r={4} fill={curve} opacity={0.55}>
              <animate attributeName="r" values="4;12" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx={last.x} cy={last.y} r={3.5} fill={curve} stroke="#0b0d13" strokeWidth={1.5} />
          </motion.g>

          {/* crosshair */}
          {hovered && (
            <g>
              <line
                x1={hovered.x}
                x2={hovered.x}
                y1={PAD.top - 8}
                y2={H - PAD.bottom}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={hovered.x} cy={hovered.y} r={4.5} fill="#0b0d13" stroke={curve} strokeWidth={2} />
            </g>
          )}
        </svg>

        {/* crosshair readout, HTML so it can use the real type stack */}
        {hovered && (
          <Box
            sx={{
              position: "absolute",
              left: `${(hovered.x / W) * 100}%`,
              top: 0,
              transform:
                hovered.x > W * 0.72 ? "translate(calc(-100% - 12px), 0)" : "translate(12px, 0)",
              px: 1.25,
              py: 0.75,
              borderRadius: "8px",
              background: "rgba(10,12,18,0.92)",
              border: `1px solid ${accent}55`,
              backdropFilter: "blur(8px)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: "0.62rem",
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              DAY {hoverIndex! + 1}/{series.length}
            </Typography>
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: "0.9rem",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: hovered.pct >= 0 ? up : down,
              }}
            >
              {hovered.pct >= 0 ? "+" : ""}
              {hovered.pct.toFixed(2)}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* relative time axis — no real dates, so the window can't be looked up */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 0.5,
          pr: `${(PAD.right / W) * 100}%`,
          pl: `${(PAD.left / W) * 100}%`,
        }}
      >
        {["90D AGO", "60D", "30D", "TODAY"].map((label) => (
          <Typography
            key={label}
            sx={{
              fontFamily: MONO,
              fontSize: "0.6rem",
              letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            {label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
