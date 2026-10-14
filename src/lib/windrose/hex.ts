/**
 * Flat-top hexes in axial coordinates (q, r).
 *
 * Pixel space has y pointing down. All pixel math uses `cell` = the distance from a hex center to its
 * neighbor's center (the "cell size"), so one step between neighbors is always exactly `cell` long.
 * The corner radius is therefore cell / sqrt(3).
 */
export interface Hex { q: number; r: number }
export interface Point { x: number; y: number }

export const SQRT3 = Math.sqrt(3);
/** Corner radius for cell = 1. */
export const HEX_RADIUS = 1 / SQRT3;

/** Neighbor offsets, in the order of edge normals at 30°, 90°, 150°, 210°, 270°, 330° (y down). */
export const DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
];

export const hexKey = (q: number, r: number) => `${q},${r}`;
export const hexEq = (a: Hex, b: Hex) => a.q === b.q && a.r === b.r;
export const hexAdd = (a: Hex, b: Hex): Hex => ({ q: a.q + b.q, r: a.r + b.r });

export function neighbor(h: Hex, dir: number): Hex {
  const d = DIRECTIONS[((dir % 6) + 6) % 6];
  return { q: h.q + d.q, r: h.r + d.r };
}
export const neighbors = (h: Hex): Hex[] => DIRECTIONS.map((d) => ({ q: h.q + d.q, r: h.r + d.r }));

export function distance(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function hexToPixel(h: Hex, cell = 1): Point {
  return { x: cell * (SQRT3 / 2) * h.q, y: cell * (h.r + h.q / 2) };
}

/** Round fractional axial coordinates to the nearest hex (via cube coordinates). */
export function hexRound(q: number, r: number): Hex {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq + 0, r: rr + 0 }; // + 0 turns -0 into 0
}

export function pixelToHex(p: Point, cell = 1): Hex {
  const q = p.x / (cell * (SQRT3 / 2));
  const r = p.y / cell - q / 2;
  return hexRound(q, r);
}

/** All hexes within `n` steps of `center` (including it). */
export function range(center: Hex, n: number): Hex[] {
  const out: Hex[] = [];
  for (let dq = -n; dq <= n; dq++) {
    for (let dr = Math.max(-n, -dq - n); dr <= Math.min(n, -dq + n); dr++) {
      out.push({ q: center.q + dq, r: center.r + dr });
    }
  }
  return out;
}

/** The hexes exactly `n` steps from `center`. Ring 0 is the center alone. */
export function ring(center: Hex, n: number): Hex[] {
  if (n === 0) return [{ ...center }];
  const out: Hex[] = [];
  let h: Hex = { q: center.q + DIRECTIONS[4].q * n, r: center.r + DIRECTIONS[4].r * n };
  // Start at the corner in direction 4 (up) and walk the six sides.
  for (let side = 0; side < 6; side++) {
    const dir = side;
    for (let i = 0; i < n; i++) {
      out.push(h);
      h = neighbor(h, dir);
    }
  }
  return out;
}

/** Hexes on the straight line from a to b, inclusive. Length is distance(a, b) + 1. */
export function line(a: Hex, b: Hex): Hex[] {
  const n = distance(a, b);
  if (n === 0) return [{ ...a }];
  // Tiny nudge so exact edge ties always resolve the same way.
  const eq = 1e-6;
  const out: Hex[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push(hexRound(a.q + eq + (b.q - a.q) * t, a.r + eq * 2 + (b.r - a.r) * t));
  }
  return out;
}

/** Corner points of a hex centered at `center`, starting at 0° and going clockwise (y down). */
export function hexCorners(center: Point, cell = 1): Point[] {
  const R = cell * HEX_RADIUS;
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return { x: center.x + R * Math.cos(a), y: center.y + R * Math.sin(a) };
  });
}

/**
 * Rectangular maps use odd-q offset columns: column = q, and odd columns sit half a cell lower.
 * `col` runs 0..cols-1 and `row` 0..rows-1.
 */
export function colRowToHex(col: number, row: number): Hex {
  return { q: col, r: row - (col - (col & 1)) / 2 };
}
export function hexToColRow(h: Hex): { col: number; row: number } {
  return { col: h.q, row: h.r + (h.q - (h.q & 1)) / 2 };
}
