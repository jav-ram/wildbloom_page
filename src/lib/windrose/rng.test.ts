import { describe, expect, it } from 'vitest';
import { cellRng, createRng, hashInts, randInt } from './rng';

const take = (r: () => number, n: number) => Array.from({ length: n }, r);

describe('seeded rng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(take(createRng(42), 20)).toEqual(take(createRng(42), 20));
    expect(take(createRng('lightrest'), 20)).toEqual(take(createRng('lightrest'), 20));
  });
  it('gives different sequences for different seeds', () => {
    expect(take(createRng(1), 5)).not.toEqual(take(createRng(2), 5));
  });
  it('stays in [0, 1) and is roughly uniform', () => {
    const v = take(createRng(7), 10000);
    expect(v.every((x) => x >= 0 && x < 1)).toBe(true);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    expect(mean).toBeGreaterThan(0.48); expect(mean).toBeLessThan(0.52);
  });
  it('randInt is inclusive of both ends', () => {
    const r = createRng(3);
    const seen = new Set(take(() => randInt(r, 1, 3), 200).map((f) => f));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });
  it('per-cell rng does not depend on call order', () => {
    const a1 = cellRng(9, 1, 2)(); const b1 = cellRng(9, 5, 6)();
    const b2 = cellRng(9, 5, 6)(); const a2 = cellRng(9, 1, 2)();
    expect(a1).toBe(a2); expect(b1).toBe(b2);
    expect(hashInts(1, 2)).not.toBe(hashInts(2, 1));
  });
});
