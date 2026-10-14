// Grid helpers for Brink, kept from Snug's pieces.ts when Snug moved to Bryce's site. Coordinates are [x, y] with y pointing down.

export type Cell = readonly [number, number];

export const cellKey = (x: number, y: number) => `${x},${y}`;

/** Boundary loops of a set of cells, as corner points in cell units. */
export function outlineLoops(cells: readonly Cell[]): [number, number][][] {
  const has = new Set(cells.map(([x, y]) => cellKey(x, y)));
  const edges = new Map<string, [number, number][]>();
  const add = (ax: number, ay: number, bx: number, by: number) => {
    const k = cellKey(ax, ay);
    if (!edges.has(k)) edges.set(k, []);
    edges.get(k)!.push([bx, by]);
  };
  for (const [x, y] of cells) {
    if (!has.has(cellKey(x, y - 1))) add(x, y, x + 1, y);
    if (!has.has(cellKey(x + 1, y))) add(x + 1, y, x + 1, y + 1);
    if (!has.has(cellKey(x, y + 1))) add(x + 1, y + 1, x, y + 1);
    if (!has.has(cellKey(x - 1, y))) add(x, y + 1, x, y);
  }

  const loops: [number, number][][] = [];
  for (const [start, outs] of edges) {
    while (outs.length) {
      const [sx, sy] = start.split(",").map(Number) as [number, number];
      const pts: [number, number][] = [[sx, sy]];
      let next = outs.pop()!;
      while (!(next[0] === sx && next[1] === sy)) {
        pts.push(next);
        const more = edges.get(cellKey(next[0], next[1]));
        if (!more?.length) break;
        next = more.pop()!;
      }
      loops.push(
        pts.filter((p, i) => {
          const a = pts[(i - 1 + pts.length) % pts.length]!;
          const b = pts[(i + 1) % pts.length]!;
          return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
        }),
      );
    }
  }
  return loops;
}

/** SVG path tracing the outer boundary of a set of cells, as closed loops in `unit`-sized cells. */
export function outlinePath(cells: readonly Cell[], unit: number): string {
  return outlineLoops(cells)
    .map((corners) => "M" + corners.map(([x, y]) => `${x * unit} ${y * unit}`).join("L") + "Z")
    .join("");
}
