import { describe, expect, it } from 'vitest';
import { distanceFor, HEX_SCALE_IDS, SCALES, SCALE_IDS } from './scales';

describe('scales', () => {
  it('has the five scales and their cell sizes', () => {
    expect(SCALE_IDS).toEqual(['continent', 'kingdom', 'region', 'province', 'combat']);
    expect(SCALE_IDS.slice(0, 4).map((id) => SCALES[id].distance)).toEqual([60, 6, 3, 1]);
    expect(SCALES.combat.distance).toBe(5);
    expect(SCALES.combat.unit).toBe('feet');
    expect(SCALES.combat.grid).toBe('square');
  });
  it('uses hexes for every scale except combat', () => {
    expect(HEX_SCALE_IDS).toEqual(['continent', 'kingdom', 'region', 'province']);
  });
  it('multiplies steps by the cell size', () => {
    expect(distanceFor('kingdom', 7)).toBe(42);
    expect(distanceFor('combat', 6)).toBe(30);
  });
});
