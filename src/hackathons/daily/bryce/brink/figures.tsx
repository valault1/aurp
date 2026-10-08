// Brink's painted pieces: terrain, heroes, ink-blot enemies, props, and signal markers. One grid cell is 100 units.

import { useMemo } from "react";
import { makeRng } from "../daily";
import { cellKey, outlineLoops, outlinePath, type Cell } from "../snug/pieces";
import { INK, INK_2, INK_3, INK_4, PAPER_DEEP, PAPER_LIGHT, VERMILION, arrow, blob, brush, enso, shape, type Pt } from "./ink";

export const CELL = 100;

export type HeroKind = "wanderer" | "crane" | "ox";
export type EnemyKind = "blot" | "spitter" | "brute";
export type PropKind = "pine" | "boulder" | "lantern";

const FIGURE_SCALE: Record<HeroKind | EnemyKind | PropKind, number> = {
  wanderer: 1.45,
  crane: 1.4,
  ox: 1.2,
  blot: 1.5,
  spitter: 1.5,
  brute: 1.3,
  pine: 1.3,
  boulder: 1.2,
  lantern: 1.35,
};
const HEALTH_Y: Record<HeroKind, number> = { wanderer: -128, crane: -114, ox: -80 };

export const center = (x: number, y: number): Pt => [x * CELL + CELL / 2, y * CELL + CELL / 2];

function Shadow({ w = 30 }: { w?: number }) {
  return <ellipse cx={0} cy={24} rx={w} ry={8} fill={INK_3} opacity={0.4} filter="url(#brink-wash)" />;
}

function HeroHealth({ hp, max, y }: { hp: number; max: number; y: number }) {
  const start = -((max - 1) * 12) / 2;
  return (
    <g transform={`translate(0 ${y})`}>
      {Array.from({ length: max }, (_, i) => (
        <rect
          key={i}
          x={start + i * 12 - 4}
          y={-4}
          width={8}
          height={8}
          rx={1.5}
          fill={i < hp ? VERMILION : "none"}
          stroke={VERMILION}
          strokeWidth={1.6}
          filter="url(#brink-rough)"
        />
      ))}
    </g>
  );
}

function Wanderer({ seed }: { seed: string }) {
  const p = useMemo(() => {
    const r = makeRng(`wanderer:${seed}`);
    return {
      outline:
        brush([[-14, -24], [-20, -2], [-25, 20]], 6, r, { taperStart: 0.1, taperEnd: 0.3 }) +
        brush([[14, -24], [20, -2], [24, 20]], 5, r, { taperStart: 0.1, taperEnd: 0.3 }) +
        brush([[-25, 20], [0, 24], [24, 20]], 4, r, { taperEnd: 0.4 }),
      sash: brush([[-18, -6], [0, -1], [19, -8]], 7, r, { taperStart: 0.1, taperEnd: 0.25 }),
      staff: brush([[30, -80], [27, -30], [23, 24]], 4.5, r, { taperStart: 0.03, taperEnd: 0.12 }),
      straw: [-26, -14, -3, 9, 21].map((x) => brush([[0, -55], [x * 0.55, -41], [x, -29]], 1.5, r, { taperStart: 0.2, taperEnd: 0.5 })).join(""),
      hat:
        brush([[-38, -30], [-14, -25], [14, -25], [38, -31]], 5, r, { taperStart: 0.05, taperEnd: 0.2 }) +
        brush([[-37, -31], [-16, -45], [0, -57]], 4, r, { taperStart: 0.1, taperEnd: 0.6 }) +
        brush([[0, -57], [18, -44], [37, -31]], 3.5, r, { taperStart: 0.1, taperEnd: 0.5 }),
    };
  }, [seed]);
  return (
    <g>
      <Shadow w={28} />
      <path d="M-15 -24 C-20 -6 -24 8 -25 20 C-8 24 8 24 25 20 C24 8 20 -6 15 -24 Z" fill={INK_2} opacity={0.9} filter="url(#brink-wash)" />
      <path d={p.outline} fill={INK} filter="url(#brink-rough)" />
      <path d={p.sash} fill={VERMILION} filter="url(#brink-rough)" />
      <path d={p.staff} fill={INK} />
      <path d="M-38 -30 Q-16 -46 0 -57 Q16 -46 38 -31 Q0 -19 -38 -30 Z" fill={PAPER_DEEP} />
      <path d={p.straw} fill={INK_3} opacity={0.85} />
      <path d={p.hat} fill={INK} filter="url(#brink-rough)" />
    </g>
  );
}

function Crane({ seed }: { seed: string }) {
  const p = useMemo(() => {
    const r = makeRng(`crane:${seed}`);
    return {
      body: blob(-2, -16, 25, r, 0.1, 0.6),
      belly: brush([[-26, -14], [-8, -4], [14, -7], [22, -17]], 3.2, r, { taperEnd: 0.4 }),
      wing: brush([[-18, -24], [-2, -28], [12, -22]], 3, r, { taperEnd: 0.5 }),
      tail: [[-40, -4], [-44, -13], [-39, -22]]
        .map((end) => brush([[-18, -16], end as Pt], 7, r, { taperStart: 0.15, taperEnd: 0.6 }))
        .join(""),
      neck: brush([[16, -20], [25, -37], [18, -52], [23, -64]], 6.5, r, { taperStart: 0.15, taperEnd: 0.12 }),
      beak: brush([[29, -67], [43, -62]], 2.8, r, { taperStart: 0.1, taperEnd: 0.8 }),
      legs: brush([[-4, -4], [-6, 22]], 2.4, r, { taperEnd: 0.2 }) + brush([[7, -4], [10, 22]], 2.4, r, { taperEnd: 0.2 }),
    };
  }, [seed]);
  return (
    <g>
      <Shadow w={26} />
      <path d={p.legs} fill={INK_2} />
      <path d={p.tail} fill={INK} filter="url(#brink-rough)" />
      <path d={p.body} fill={PAPER_LIGHT} />
      <path d={p.belly + p.wing} fill={INK_2} filter="url(#brink-rough)" />
      <path d={p.neck} fill={INK} filter="url(#brink-rough)" />
      <ellipse cx={24} cy={-66} rx={6.5} ry={5.2} fill={PAPER_LIGHT} stroke={INK} strokeWidth={1.6} />
      <circle cx={23} cy={-70.5} r={3.8} fill={VERMILION} />
      <path d={p.beak} fill={INK_2} />
    </g>
  );
}

function Ox({ seed }: { seed: string }) {
  const p = useMemo(() => {
    const r = makeRng(`ox:${seed}`);
    return {
      body: blob(-6, -16, 33, r, 0.1, 0.68),
      sheen: blob(-14, -26, 14, r, 0.2, 0.6),
      legs: [[-27, -4, -28], [-11, 0, -11], [8, 0, 9], [21, -4, 23]]
        .map(([x, y, x2]) => brush([[x!, y!], [x2!, 22]], 7.5, r, { taperStart: 0.05, taperEnd: 0.2 }))
        .join(""),
      head: blob(27, -22, 14, r, 0.12, 0.92),
      horns: brush([[20, -32], [11, -43], [17, -53]], 5, r, { taperStart: 0.05, taperEnd: 0.6 }) + brush([[33, -32], [43, -41], [39, -52]], 5, r, { taperStart: 0.05, taperEnd: 0.6 }),
      halter: brush([[17, -15], [27, -10], [37, -18]], 3.8, r, { taperEnd: 0.3 }),
      tail: brush([[-37, -18], [-45, -6], [-42, 6]], 2.6, r, { taperEnd: 0.5 }),
    };
  }, [seed]);
  return (
    <g>
      <Shadow w={38} />
      <path d={p.tail + p.legs} fill={INK} filter="url(#brink-rough)" />
      <path d={p.body} fill={INK} filter="url(#brink-wash)" />
      <path d={p.sheen} fill={INK_3} opacity={0.45} filter="url(#brink-wash)" />
      <path d={p.head} fill={INK} filter="url(#brink-rough)" />
      <path d={p.horns} fill={INK_4} filter="url(#brink-rough)" />
      <circle cx={31} cy={-24} r={2.3} fill={PAPER_LIGHT} />
      <path d={p.halter} fill={VERMILION} filter="url(#brink-rough)" />
    </g>
  );
}

export function Hero({ kind, hp, max, seed = kind }: { kind: HeroKind; hp?: number; max?: number; seed?: string }) {
  return (
    <g>
      <g transform={`scale(${FIGURE_SCALE[kind]})`}>
        {kind === "wanderer" && <Wanderer seed={seed} />}
        {kind === "crane" && <Crane seed={seed} />}
        {kind === "ox" && <Ox seed={seed} />}
      </g>
      {max !== undefined && <HeroHealth hp={hp ?? max} max={max} y={HEALTH_Y[kind]} />}
    </g>
  );
}

const ENEMY_RADIUS: Record<EnemyKind, number> = { blot: 22, spitter: 21, brute: 32 };

function EnemyHealth({ hp, max, y }: { hp: number; max: number; y: number }) {
  return (
    <>
      {Array.from({ length: max }, (_, i) => (
        <circle key={i} cx={(i - (max - 1) / 2) * 9} cy={y} r={2.8} fill={i < hp ? PAPER_LIGHT : "none"} stroke={PAPER_LIGHT} strokeWidth={1.2} />
      ))}
    </>
  );
}

/** A tall teardrop of grey wash with a curled brush tip, one eye, and an open mouth. */
function Spitter({ hp, max, seed }: { hp?: number; max?: number; seed: string }) {
  const p = useMemo(() => {
    const r = makeRng(`spitter:${seed}`);
    const outline: Pt[] = [[0, 6], [15, 1], [20, -14], [16, -32], [8, -46], [4, -58], [-6, -62], [-12, -56], [-6, -52], [-8, -42], [-17, -28], [-20, -12], [-15, 2]];
    return {
      wash: shape(outline, r, 2),
      core: shape(outline.map(([x, y]) => [x * 0.68, -20 + (y + 20) * 0.72] as Pt), r, 1),
      tip: brush([[2, -50], [-2, -60], [-10, -60], [-11, -54]], 4, r, { taperStart: 0.1, taperEnd: 0.6 }),
      dribble: brush([[3, -6], [4, 2], [2, 10]], 3, r, { taperStart: 0.2, taperEnd: 0.7 }),
      drops: Array.from({ length: 4 }, () => [(r.next() - 0.5) * 50, -40 + r.next() * 40, 1.4 + r.next() * 2] as const),
    };
  }, [seed]);
  return (
    <g transform={`scale(${FIGURE_SCALE.spitter})`}>
      <Shadow w={22} />
      <path d={p.wash} fill={INK_2} filter="url(#brink-wash)" />
      <path d={p.core} fill={INK_2} />
      <path d={p.tip} fill={INK} filter="url(#brink-rough)" />
      {p.drops.map(([x, y, s], i) => (
        <circle key={i} cx={x} cy={y} r={s} fill={INK_2} />
      ))}
      <ellipse cx={0} cy={-30} rx={7.5} ry={6} fill={PAPER_LIGHT} />
      <circle cx={1.5} cy={-29.5} r={3} fill={INK} />
      <ellipse cx={2} cy={-13} rx={5} ry={4.2} fill="none" stroke={PAPER_LIGHT} strokeWidth={2.4} />
      <path d={p.dribble} fill={INK} />
      {max !== undefined && <EnemyHealth hp={hp ?? max} max={max} y={-2} />}
    </g>
  );
}

export function Enemy({ kind, hp, max, seed = kind }: { kind: EnemyKind; hp?: number; max?: number; seed?: string }) {
  if (kind === "spitter") return <Spitter hp={hp} max={max} seed={seed} />;
  return <InkBlot kind={kind} hp={hp} max={max} seed={seed} />;
}

function InkBlot({ kind, hp, max, seed }: { kind: "blot" | "brute"; hp?: number; max?: number; seed: string }) {
  const R = ENEMY_RADIUS[kind];
  const cy = -16;
  const p = useMemo(() => {
    const r = makeRng(`enemy:${kind}:${seed}`);
    const splats = Array.from({ length: 5 }, () => {
      const a = Math.PI * (0.15 + r.next() * 0.7) + (r.next() < 0.5 ? Math.PI : 0);
      const d = R * (1.15 + r.next() * 0.35);
      return { x: Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.7, s: 1.5 + r.next() * 2.8 };
    });
    return {
      wash: blob(0, cy, R, r, 0.24, 0.95, 14),
      core: blob(0, cy, R * 0.72, r, 0.15, 0.95),
      drips: [-0.4, 0.25].map((f) => brush([[R * f, cy + R * 0.7], [R * f + 1, cy + R * 0.7 + 10 + r.next() * 8]], 4.5, r, { taperStart: 0.3, taperEnd: 0.6 })).join(""),
      splats,
      horns: brush([[-12, cy - R * 0.75], [-20, cy - R * 1.15], [-13, cy - R * 1.35]], 7, r, { taperStart: 0.05, taperEnd: 0.8 }) + brush([[12, cy - R * 0.75], [20, cy - R * 1.15], [14, cy - R * 1.35]], 7, r, { taperStart: 0.05, taperEnd: 0.8 }),
    };
  }, [kind, seed, R]);
  const eye = kind === "brute" ? VERMILION : PAPER_LIGHT;
  const ey = cy - R * 0.2;
  const eyes = [-9, 9];
  return (
    <g transform={`scale(${FIGURE_SCALE[kind]})`}>
      <Shadow w={R + 4} />
      <path d={p.wash} fill={INK} filter="url(#brink-wash)" />
      <path d={p.core} fill={INK} />
      <path d={p.drips} fill={INK} />
      {p.splats.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill={INK} />
      ))}
      {kind === "brute" && <path d={p.horns} fill={INK} filter="url(#brink-rough)" />}
      {eyes.map((x, i) => {
        const dir = x === 0 ? 0 : Math.sign(x);
        return (
          <path
            key={i}
            d={`M${x - 5} ${ey - 1 + dir * 2}Q${x} ${ey - 5} ${x + 5} ${ey - 1 - dir * 2}Q${x} ${ey + 2.5} ${x - 5} ${ey - 1 + dir * 2}Z`}
            fill={eye}
          />
        );
      })}
      {max !== undefined && <EnemyHealth hp={hp ?? max} max={max} y={cy + R * 0.45} />}
    </g>
  );
}

function Pine({ seed }: { seed: string }) {
  const p = useMemo(() => {
    const r = makeRng(`pine:${seed}`);
    const clusters: Pt[] = [[-38, -38], [34, -60], [0, -86], [-20, -62], [24, -34]];
    return {
      trunk: brush([[-8, 26], [2, -8], [-6, -46], [2, -76]], 12, r, { taperStart: 0.05, taperEnd: 0.35 }),
      branches: brush([[-4, -30], [-24, -36], [-40, -32]], 4.5, r) + brush([[0, -54], [20, -61], [34, -57]], 4.5, r),
      needles: clusters
        .map(([cx, cy]) =>
          Array.from({ length: 11 }, (_, i) => {
            const a = Math.PI * (1.05 + (i / 10) * 0.9) + (r.next() - 0.5) * 0.15;
            const l = 12 + r.next() * 7;
            return brush([[cx, cy + 4], [cx + Math.cos(a) * l, cy + 4 + Math.sin(a) * l]], 2.6, r, { taperStart: 0.1, taperEnd: 0.7 });
          }).join(""),
        )
        .join(""),
      clusters,
    };
  }, [seed]);
  return (
    <g>
      <Shadow w={30} />
      {p.clusters.map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={20} ry={9} fill={INK_3} opacity={0.35} filter="url(#brink-wash)" />
      ))}
      <path d={p.trunk} fill={INK_2} filter="url(#brink-dry-v)" />
      <path d={p.branches} fill={INK} filter="url(#brink-rough)" />
      <path d={p.needles} fill={INK} />
    </g>
  );
}

function Boulder({ seed }: { seed: string }) {
  const p = useMemo(() => {
    const r = makeRng(`boulder:${seed}`);
    const rim: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = -0.3 + (i / 8) * 2.9;
      rim.push([Math.cos(a) * 33, -6 + Math.sin(a) * 25]);
    }
    return {
      body: blob(0, -6, 32, r, 0.2, 0.78),
      rim: brush(rim, 6, r, { taperStart: 0.1, taperEnd: 0.4 }),
      texture: [[-14, -22, -4, -10], [4, -26, 14, -14], [-20, -4, -10, 6], [10, -4, 22, 2]]
        .map(([a, b, c, d]) => brush([[a!, b!], [c!, d!]], 2.6, r, { taperEnd: 0.6 }))
        .join(""),
    };
  }, [seed]);
  return (
    <g>
      <Shadow w={34} />
      <path d={p.body} fill={INK_3} opacity={0.75} filter="url(#brink-wash)" />
      <path d={p.texture} fill={INK_2} />
      <path d={p.rim} fill={INK} filter="url(#brink-rough)" />
    </g>
  );
}

function Lantern() {
  return (
    <g>
      <Shadow w={24} />
      <circle cx={0} cy={-30} r={20} fill={VERMILION} opacity={0.4} filter="url(#brink-glow)" />
      <rect x={-19} y={10} width={38} height={12} rx={2} fill={INK_3} stroke={INK} strokeWidth={1.8} filter="url(#brink-rough)" />
      <rect x={-6} y={-12} width={12} height={23} fill={INK_4} stroke={INK} strokeWidth={1.8} filter="url(#brink-rough)" />
      <rect x={-13} y={-36} width={26} height={25} rx={1} fill={PAPER_DEEP} stroke={INK} strokeWidth={2} filter="url(#brink-rough)" />
      <rect x={-6} y={-30} width={12} height={12} fill={VERMILION} opacity={0.9} />
      <path d="M-29 -36 Q-14 -41 -6 -53 L6 -53 Q14 -41 29 -36 Q0 -32 -29 -36 Z" fill={INK_2} stroke={INK} strokeWidth={1.5} filter="url(#brink-rough)" />
      <circle cx={0} cy={-57} r={4} fill={INK_2} />
    </g>
  );
}

export function Prop({ kind, seed = kind }: { kind: PropKind; seed?: string }) {
  return (
    <g transform={`scale(${FIGURE_SCALE[kind]})`}>
      {kind === "pine" ? <Pine seed={seed} /> : kind === "boulder" ? <Boulder seed={seed} /> : <Lantern />}
    </g>
  );
}

/** Cracks on a tile that will crumble; drawn in cell-local coordinates. */
export function Cracks({ seed = "cracks" }: { seed?: string }) {
  const d = useMemo(() => {
    const r = makeRng(`cracks:${seed}`);
    return (
      brush([[-34, -22], [-12, -8], [4, -14], [30, 4]], 2.8, r, { taperStart: 0.2, taperEnd: 0.4 }) +
      brush([[-12, -8], [-16, 12], [-4, 32]], 2.2, r, { taperStart: 0.1, taperEnd: 0.6 }) +
      brush([[4, -14], [12, -32]], 1.8, r, { taperStart: 0.1, taperEnd: 0.7 })
    );
  }, [seed]);
  return <path d={d} fill={INK_2} filter="url(#brink-rough)" />;
}

/** Ground ring under the selected hero. */
export function Enso({ seed = "enso" }: { seed?: string }) {
  const d = useMemo(() => enso(0, 24, 38, makeRng(`enso:${seed}`), 0.5), [seed]);
  return <path d={d} fill={INK} opacity={0.9} filter="url(#brink-rough)" />;
}

/** Brushed corner brackets on a tile the selected hero can use its ability on. */
export function TargetMark({ seed = "target" }: { seed?: string }) {
  const d = useMemo(() => {
    const r = makeRng(`target:${seed}`);
    return [
      [[-42, -20], [-42, -42], [-20, -42]],
      [[20, -42], [42, -42], [42, -20]],
      [[42, 20], [42, 42], [20, 42]],
      [[-20, 42], [-42, 42], [-42, 20]],
    ]
      .map((pts) => brush(pts as Pt[], 4.5, r, { taperStart: 0.15, taperEnd: 0.35 }))
      .join("");
  }, [seed]);
  return <path d={d} fill={INK} opacity={0.85} filter="url(#brink-rough)" style={{ animation: "brinkPulse 1.6s ease-in-out infinite" }} />;
}

/** A reachable tile: a soft wash over the tile with a dark ink dab; stronger when hovered. */
export function MoveDot({ active = false }: { active?: boolean }) {
  return (
    <g>
      <rect x={-40} y={-40} width={80} height={80} rx={12} fill={INK_2} opacity={active ? 0.26 : 0.14} filter="url(#brink-wash)" />
      <circle cx={0} cy={4} r={active ? 12 : 9.5} fill={INK} opacity={active ? 0.9 : 0.75} filter="url(#brink-rough)" />
    </g>
  );
}

/** Red hatching on a tile an enemy will strike next turn. */
export function Threat({ seed = "threat" }: { seed?: string }) {
  const d = useMemo(() => {
    const r = makeRng(`threat:${seed}`);
    return [-36, -12, 12, 36].map((o) => brush([[o - 16, 40], [o + 16, -40]], 6, r, { taperStart: 0.1, taperEnd: 0.4 })).join("");
  }, [seed]);
  return (
    <g>
      <rect x={-46} y={-46} width={92} height={92} fill={VERMILION} opacity={0.08} />
      <path d={d} fill={VERMILION} opacity={0.6} filter="url(#brink-dry-h)" />
    </g>
  );
}

export function Splat({ seed = "splat" }: { seed?: string }) {
  const p = useMemo(() => {
    const r = makeRng(`splat:${seed}`);
    const pts: Pt[] = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const rr = i % 2 ? 9 + r.next() * 4 : 18 + r.next() * 10;
      pts.push([Math.cos(a) * rr, -18 + Math.sin(a) * rr]);
    }
    const dots = Array.from({ length: 6 }, () => {
      const a = r.next() * Math.PI * 2;
      const d = 30 + r.next() * 12;
      return [Math.cos(a) * d, -18 + Math.sin(a) * d, 1.5 + r.next() * 2.5] as const;
    });
    return { d: "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z", dots };
  }, [seed]);
  return (
    <g>
      <path d={p.d} fill={VERMILION} opacity={0.85} filter="url(#brink-rough)" />
      {p.dots.map(([x, y, s], i) => (
        <circle key={i} cx={x} cy={y} r={s} fill={VERMILION} opacity={0.85} />
      ))}
    </g>
  );
}

/** An arrow between two cells; red for enemy intent, black for a hero's shove. */
export function CellArrow({ from, to, color = VERMILION, seed = "arrow", bend = 0 }: { from: Cell; to: Cell; color?: string; seed?: string; bend?: number }) {
  const d = useMemo(() => {
    const a = center(from[0], from[1]);
    const b = center(to[0], to[1]);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const start: Pt = [a[0] + (dx / len) * 30, a[1] + (dy / len) * 30 - 18];
    const end: Pt = [b[0] - (dx / len) * 22, b[1] - (dy / len) * 22 - 18];
    return arrow(start, end, 6, makeRng(`arrow:${seed}`), bend);
  }, [from, to, seed, bend]);
  return <path d={d} fill={color} opacity={0.92} filter="url(#brink-rough)" />;
}

/** Dashed red brush line for a ranged ink spit, with a splash at the target. */
export function SpitLine({ from, to, seed = "spit" }: { from: Cell; to: Cell; seed?: string }) {
  const d = useMemo(() => {
    const r = makeRng(`spit:${seed}`);
    const a = center(from[0], from[1]);
    const b = center(to[0], to[1]);
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 26));
    let out = "";
    for (let i = 1; i < n; i++) {
      const t0 = i / n;
      const t1 = t0 + 0.5 / n;
      const p0: Pt = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0 - 22];
      const p1: Pt = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1 - 22];
      out += brush([p0, p1], 6, r, { taperStart: 0.2, taperEnd: 0.5 });
    }
    return out;
  }, [from, to, seed]);
  return <path d={d} fill={VERMILION} opacity={0.85} filter="url(#brink-rough)" />;
}

/** The plateau: one bleeding wash of stone, a calligraphic rim, and cliff faces dropping into mist. */
export function Terrain({ layout, seed = "terrain" }: { layout: string[]; seed?: string }) {
  const art = useMemo(() => {
    const r = makeRng(`terrain:${seed}`);
    const C = CELL;
    const land: Cell[] = [];
    layout.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && land.push([x, y])));
    const isLand = new Set(land.map(([x, y]) => cellKey(x, y)));

    const blotches = land
      .flatMap(([x, y]) => (r.next() < 0.6 ? [blob(x * C + 20 + r.next() * 60, y * C + 20 + r.next() * 60, 16 + r.next() * 24, r, 0.3, 0.65)] : []))
      .join("");
    const texture = land
      .map(([x, y]) =>
        Array.from({ length: 2 + r.int(3) }, () => {
          const sx = x * C + 10 + r.next() * 70;
          const sy = y * C + 12 + r.next() * 72;
          return brush([[sx, sy], [sx + 9 + r.next() * 12, sy + 2 + r.next() * 6]], 1.6 + r.next() * 1.6, r, { taperEnd: 0.6 });
        }).join(""),
      )
      .join("");
    const grass = land
      .flatMap(([x, y]) => {
        if (r.next() > 0.3) return [];
        const gx = x * C + 20 + r.next() * 60;
        const gy = y * C + 30 + r.next() * 50;
        return [brush([[gx, gy], [gx - 4, gy - 13]], 2, r, { taperEnd: 0.8 }) + brush([[gx + 3, gy], [gx + 8, gy - 11]], 2, r, { taperEnd: 0.8 })];
      })
      .join("");
    const grid = land
      .flatMap(([x, y]) => {
        const out: string[] = [];
        const j = () => (r.next() - 0.5) * 2;
        if (isLand.has(cellKey(x + 1, y))) out.push(brush([[(x + 1) * C + j(), y * C + 8], [(x + 1) * C + j(), y * C + C - 8]], 1.5, r, { taperStart: 0.25, taperEnd: 0.3 }));
        if (isLand.has(cellKey(x, y + 1))) out.push(brush([[x * C + 8, (y + 1) * C + j()], [x * C + C - 8, (y + 1) * C + j()]], 1.5, r, { taperStart: 0.25, taperEnd: 0.3 }));
        return out;
      })
      .join("");

    // Edges run clockwise, so a leftward edge is a south edge: the lip of a cliff.
    const rim = outlineLoops(land)
      .map((corners) =>
        corners
          .map((p, i) => {
            const q = corners[(i + 1) % corners.length]!;
            const dx = Math.sign(q[0] - p[0]);
            const dy = Math.sign(q[1] - p[1]);
            const lip = dx < 0;
            const over = 5 + r.next() * 7;
            const a: Pt = [p[0] * C - dx * over * 0.5, p[1] * C - dy * over * 0.5];
            const b: Pt = [q[0] * C + dx * over, q[1] * C + dy * over];
            const mid: Pt = [(a[0] + b[0]) / 2 + (r.next() - 0.5) * 4 * Math.abs(dy), (a[1] + b[1]) / 2 + (r.next() - 0.5) * 4 * Math.abs(dx)];
            return brush([a, mid, b], lip ? 8 + r.next() * 3 : 4 + r.next() * 2.5, r, { taperStart: 0.06, taperEnd: 0.28, jitter: 0.4 });
          })
          .join(""),
      )
      .join("");

    const faces = land
      .filter(([x, y]) => !isLand.has(cellKey(x, y + 1)))
      .map(([x, y]) => {
        const top = (y + 1) * C;
        return {
          x,
          y,
          band: brush([[x * C - 2, top + 6], [x * C + 50, top + 9], [x * C + C + 2, top + 6]], 13, r, { taperStart: 0.04, taperEnd: 0.08 }),
          // Axe-cut texture: broad, angled side-brush strokes in staggered rows.
          cuts: [0, 1, 2]
            .flatMap((row) =>
              Array.from({ length: 4 - row }, (_, i) => {
                const sx = x * C + 6 + i * (26 + row * 6) + row * 12 + r.next() * 8;
                const sy = top + 10 + row * 24 + r.next() * 8;
                const len = 16 + r.next() * 20 - row * 3;
                const lean = (i % 2 ? 1 : -1) * (5 + r.next() * 9);
                return brush([[sx, sy], [sx + lean * 0.5, sy + len * 0.55], [sx + lean, sy + len]], 7 + r.next() * 7 - row * 1.5, r, {
                  taperStart: 0.25,
                  taperEnd: 0.45,
                  jitter: 0.5,
                });
              }),
            )
            .join(""),
          cracks: Array.from({ length: 2 + r.int(2) }, () => {
            const sx = x * C + 12 + r.next() * 76;
            const len = 40 + r.next() * 40;
            return brush([[sx, top + 6], [sx + (r.next() - 0.5) * 6, top + len * 0.5], [sx + (r.next() - 0.5) * 10, top + len]], 2 + r.next() * 1.5, r, { taperStart: 0.05, taperEnd: 0.7 });
          }).join(""),
          ledge: brush([[x * C + 10 + r.next() * 20, top + 40 + r.next() * 10], [x * C + 55 + r.next() * 30, top + 42 + r.next() * 8]], 3.2, r, { taperStart: 0.2, taperEnd: 0.5 }),
        };
      });
    const mist = faces.flatMap(({ x, y }) =>
      [0, 1].map((k) => {
        const my = (y + 1) * C + 64 + k * 20 + r.next() * 8;
        return brush([[x * C - 30 + k * 16, my], [x * C + 50, my - 3], [x * C + 130 - k * 10, my + 2]], 28 - k * 8, r, { taperStart: 0.3, taperEnd: 0.4 });
      }),
    );
    return { faces, mist, blotches, texture, grass, grid, rim, landPath: outlinePath(land, C) };
  }, [layout, seed]);

  return (
    <g>
      {art.faces.map((f) => (
        <g key={`f${f.x},${f.y}`}>
          <rect x={f.x * CELL} y={(f.y + 1) * CELL} width={CELL} height={100} fill="url(#brink-face)" filter="url(#brink-wash)" />
          <path d={f.band} fill={INK_2} filter="url(#brink-wash)" />
          <path d={f.cuts} fill={INK_2} opacity={0.9} filter="url(#brink-dry-v)" />
          <path d={f.cracks + f.ledge} fill={INK} filter="url(#brink-rough)" />
        </g>
      ))}
      <g style={{ animation: "brinkDrift 7s ease-in-out infinite alternate" }}>
        {art.mist.map((d, i) => (
          <path key={i} d={d} fill={PAPER_LIGHT} opacity={0.85} filter="url(#brink-wash)" />
        ))}
      </g>
      <path d={art.landPath} fill={INK_4} opacity={0.32} filter="url(#brink-wash)" />
      <path d={art.blotches} fill={INK_4} opacity={0.4} filter="url(#brink-wash)" />
      <path d={art.texture} fill={INK_3} opacity={0.6} />
      <path d={art.grass} fill={INK_2} opacity={0.8} />
      <path d={art.grid} fill={INK_3} opacity={0.5} />
      <path d={art.rim} fill={INK} filter="url(#brink-rough)" />
    </g>
  );
}

/** Places a cell-local drawing at grid cell (x, y). */
export function At({ x, y, children, style }: { x: number; y: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <g transform={`translate(${x * CELL + CELL / 2} ${y * CELL + CELL / 2})`} style={style}>
      {children}
    </g>
  );
}
