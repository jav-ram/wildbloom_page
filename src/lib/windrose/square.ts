/** Square grid math for combat maps. A cell (x, y) has its center at (x, y) * cell; y points down. */
export interface Sq { x: number; y: number }
export interface SqPoint { x: number; y: number }

export const NEIGHBORS_4: readonly Sq[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
export const NEIGHBORS_8: readonly Sq[] = [
  ...NEIGHBORS_4, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 },
];

export const sqKey = (x: number, y: number) => `${x},${y}`;
export const squareNeighbors = (s: Sq, diagonals = false): Sq[] =>
  (diagonals ? NEIGHBORS_8 : NEIGHBORS_4).map((d) => ({ x: s.x + d.x, y: s.y + d.y }));

/** Steps counting diagonals as one (the common 5e grid rule). */
export const squareDistance = (a: Sq, b: Sq) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
/** Steps along edges only. */
export const squareDistanceManhattan = (a: Sq, b: Sq) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const squareToPixel = (s: Sq, cell = 1): SqPoint => ({ x: s.x * cell, y: s.y * cell });
export const pixelToSquare = (p: SqPoint, cell = 1): Sq => ({ x: Math.round(p.x / cell) + 0, y: Math.round(p.y / cell) + 0 });

export function squareRange(center: Sq, n: number): Sq[] {
  const out: Sq[] = [];
  for (let y = -n; y <= n; y++) for (let x = -n; x <= n; x++) out.push({ x: center.x + x, y: center.y + y });
  return out;
}

/** Cells on a straight line from a to b, inclusive (Bresenham). */
export function squareLine(a: Sq, b: Sq): Sq[] {
  const out: Sq[] = [];
  let { x, y } = a;
  const dx = Math.abs(b.x - a.x);
  const dy = -Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push({ x, y });
    if (x === b.x && y === b.y) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return out;
}
