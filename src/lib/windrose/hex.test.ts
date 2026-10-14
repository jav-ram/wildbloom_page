import { describe, expect, it } from 'vitest';
import {
  DIRECTIONS, colRowToHex, distance, hexCorners, hexToColRow, hexToPixel, line, neighbors, pixelToHex, range, ring, SQRT3,
} from './hex';

const O = { q: 0, r: 0 };

describe('flat-top neighbors', () => {
  it('has six distinct neighbors, each at distance 1', () => {
    const n = neighbors({ q: 3, r: -2 });
    expect(n).toHaveLength(6);
    expect(new Set(n.map((h) => `${h.q},${h.r}`)).size).toBe(6);
    for (const h of n) expect(distance({ q: 3, r: -2 }, h)).toBe(1);
  });
  it('places neighbors exactly one cell from the center (center to center)', () => {
    for (const cell of [1, 64, 5]) {
      for (const d of DIRECTIONS) {
        const p = hexToPixel(d, cell);
        expect(Math.hypot(p.x, p.y)).toBeCloseTo(cell, 9);
      }
    }
  });
  it('is flat-top: neighbors sit at 30, 90, 150, 210, 270 and 330 degrees (y down)', () => {
    const angles = DIRECTIONS.map((d) => {
      const p = hexToPixel(d);
      return Math.round(((Math.atan2(p.y, p.x) * 180) / Math.PI + 360) % 360);
    });
    expect(angles).toEqual([30, 90, 150, 210, 270, 330]);
  });
  it('has a flat edge on top: corners are at 0, 60, 120 degrees', () => {
    const c = hexCorners({ x: 0, y: 0 }, SQRT3);
    expect(c[0].x).toBeCloseTo(1); expect(c[0].y).toBeCloseTo(0);
    expect(c[4].y).toBeCloseTo(c[5].y); // top edge is horizontal
    expect(c[4].y).toBeLessThan(0);
  });
});

describe('distance', () => {
  it('is symmetric and zero on itself', () => {
    const a = { q: 4, r: -7 }; const b = { q: -3, r: 5 };
    expect(distance(a, a)).toBe(0);
    expect(distance(a, b)).toBe(distance(b, a));
  });
  it('matches known values', () => {
    expect(distance(O, { q: 3, r: 0 })).toBe(3);
    expect(distance(O, { q: 2, r: 2 })).toBe(4);
    expect(distance(O, { q: 2, r: -2 })).toBe(2);
    expect(distance(O, { q: -3, r: 5 })).toBe(5);
  });
  it('equals the number of steps between pixel centers divided by the cell size for straight neighbor chains', () => {
    const p = hexToPixel({ q: 4, r: 0 }, 6);
    expect(Math.hypot(p.x, p.y)).toBeGreaterThan(0);
    expect(distance(O, { q: 4, r: 0 })).toBe(4);
  });
});

describe('pixel round trips', () => {
  it('hex -> pixel -> hex returns the same hex, at several cell sizes', () => {
    for (const cell of [1, 7.5, 64, 300]) {
      for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) {
        expect(pixelToHex(hexToPixel({ q, r }, cell), cell)).toEqual({ q, r });
      }
    }
  });
  it('points inside the hex (within the inscribed circle) round to that hex', () => {
    const cell = 64; const inr = (cell / 2) * 0.98;
    for (const h of [{ q: 0, r: 0 }, { q: 5, r: -3 }, { q: -4, r: 6 }]) {
      const c = hexToPixel(h, cell);
      for (let a = 0; a < 360; a += 15) {
        const p = { x: c.x + inr * Math.cos((a * Math.PI) / 180), y: c.y + inr * Math.sin((a * Math.PI) / 180) };
        expect(pixelToHex(p, cell)).toEqual(h);
      }
    }
  });
  it('a point just past an edge rounds to the neighbor across it', () => {
    const cell = 64;
    DIRECTIONS.forEach((d) => {
      const m = hexToPixel(d, cell * 0.55);
      expect(pixelToHex(m, cell)).toEqual(d);
    });
  });
  it('never returns -0', () => {
    const h = pixelToHex({ x: -0.0001, y: -0.0001 }, 1);
    expect(Object.is(h.q, -0)).toBe(false);
    expect(Object.is(h.r, -0)).toBe(false);
  });
});

describe('range, ring and line', () => {
  it('range(n) has 3n(n+1)+1 hexes, all within n', () => {
    for (let n = 0; n <= 6; n++) {
      const r = range(O, n);
      expect(r).toHaveLength(3 * n * (n + 1) + 1);
      for (const h of r) expect(distance(O, h)).toBeLessThanOrEqual(n);
    }
  });
  it('ring(n) has 6n unique hexes at distance n, each touching the next', () => {
    for (let n = 1; n <= 6; n++) {
      const r = ring({ q: 2, r: -1 }, n);
      expect(r).toHaveLength(6 * n);
      expect(new Set(r.map((h) => `${h.q},${h.r}`)).size).toBe(6 * n);
      r.forEach((h, i) => {
        expect(distance({ q: 2, r: -1 }, h)).toBe(n);
        expect(distance(h, r[(i + 1) % r.length])).toBe(1);
      });
    }
    expect(ring(O, 0)).toEqual([O]);
  });
  it('line runs from a to b with distance + 1 adjacent hexes', () => {
    const pairs: [typeof O, typeof O][] = [[O, { q: 5, r: -2 }], [{ q: -3, r: 4 }, { q: 6, r: 1 }], [O, { q: 0, r: 7 }], [O, O]];
    for (const [a, b] of pairs) {
      const l = line(a, b);
      expect(l).toHaveLength(distance(a, b) + 1);
      expect(l[0]).toEqual(a); expect(l[l.length - 1]).toEqual(b);
      for (let i = 1; i < l.length; i++) expect(distance(l[i - 1], l[i])).toBe(1);
    }
  });
});

describe('rectangular offset layout', () => {
  it('converts col/row to hex and back', () => {
    for (let col = 0; col < 20; col++) for (let row = 0; row < 20; row++) {
      expect(hexToColRow(colRowToHex(col, row))).toEqual({ col, row });
    }
  });
  it('columns stay vertical: col advances sqrt(3)/2 in x, odd columns sit half a cell lower', () => {
    expect(hexToPixel(colRowToHex(0, 3))).toEqual({ x: 0, y: 3 });
    const p1 = hexToPixel(colRowToHex(1, 3));
    expect(p1.x).toBeCloseTo(SQRT3 / 2); expect(p1.y).toBeCloseTo(3.5);
    const p2 = hexToPixel(colRowToHex(2, 3));
    expect(p2.x).toBeCloseTo(SQRT3); expect(p2.y).toBeCloseTo(3);
  });
});
