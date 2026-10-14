/** Seeded random numbers: the same seed always gives the same sequence. */

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Mix integers into one unsigned 32-bit hash (order matters). */
export function hashInts(...n: number[]): number {
  let h = 0x9e3779b9;
  for (const v of n) {
    h ^= v | 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

export type Rng = () => number;

/** mulberry32: returns floats in [0, 1). */
export function createRng(seed: number | string): Rng {
  let a = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A generator tied to one cell, so a cell's drawing doesn't depend on draw order. */
export function cellRng(seed: number, a: number, b: number, salt = 0): Rng {
  return createRng(hashInts(seed, a, b, salt));
}

export const randRange = (rng: Rng, min: number, max: number) => min + (max - min) * rng();
export const randInt = (rng: Rng, min: number, max: number) => Math.floor(randRange(rng, min, max + 1));
