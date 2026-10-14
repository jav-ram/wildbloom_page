import { describe, expect, it } from 'vitest';
import { pixelToSquare, squareDistance, squareDistanceManhattan, squareLine, squareNeighbors, squareRange, squareToPixel } from './square';

describe('square grid', () => {
  it('has 4 or 8 neighbors one cell away', () => {
    expect(squareNeighbors({ x: 0, y: 0 })).toHaveLength(4);
    const n8 = squareNeighbors({ x: 0, y: 0 }, true);
    expect(n8).toHaveLength(8);
    for (const n of n8) expect(squareDistance({ x: 0, y: 0 }, n)).toBe(1);
  });
  it('measures distance with and without diagonals', () => {
    expect(squareDistance({ x: 0, y: 0 }, { x: 3, y: 2 })).toBe(3);
    expect(squareDistanceManhattan({ x: 0, y: 0 }, { x: 3, y: 2 })).toBe(5);
  });
  it('round trips cell -> pixel -> cell', () => {
    for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++)
      expect(pixelToSquare(squareToPixel({ x, y }, 64), 64)).toEqual({ x, y });
  });
  it('places neighbors one cell apart (center to center)', () => {
    const p = squareToPixel({ x: 1, y: 0 }, 5);
    expect(p).toEqual({ x: 5, y: 0 });
  });
  it('range and line', () => {
    expect(squareRange({ x: 0, y: 0 }, 2)).toHaveLength(25);
    const l = squareLine({ x: 0, y: 0 }, { x: 5, y: 2 });
    expect(l[0]).toEqual({ x: 0, y: 0 });
    expect(l[l.length - 1]).toEqual({ x: 5, y: 2 });
    expect(l).toHaveLength(6);
  });
});
