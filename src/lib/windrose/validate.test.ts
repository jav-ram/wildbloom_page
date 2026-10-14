import { describe, expect, it } from 'vitest';
import { createMap, newHex, toFile } from './model';
import { validateMap, validateRules } from './validate';

const goodMap = () => {
  const m = createMap({ id: 'test', scale: 'kingdom', cols: 6, rows: 4, seed: 1 });
  m.hexes.set('0,0', newHex({ q: 0, r: 0 }, 'forest'));
  m.hexes.set('1,0', newHex({ q: 1, r: 0 }, 'chasm'));
  return JSON.parse(JSON.stringify(toFile(m)));
};

describe('validateMap', () => {
  it('accepts a map made by createMap', () => {
    const r = validateMap(goodMap());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('rejects non-objects', () => { expect(validateMap(null).ok).toBe(false); expect(validateMap([]).ok).toBe(false); });
  it('rejects a scale / unit mismatch', () => {
    const m = goodMap(); m.unit.distance = 5;
    expect(validateMap(m).errors.join()).toMatch(/unit.distance/);
  });
  it('requires flat-top hex maps', () => {
    const m = goodMap(); m.grid.orientation = 'pointy-top';
    expect(validateMap(m).errors.join()).toMatch(/flat-top/);
  });
  it('keeps combat maps on the combat scale', () => {
    const m = goodMap(); m.type = 'combat';
    expect(validateMap(m).ok).toBe(false);
  });
  it('rejects hexes outside the map and duplicates', () => {
    const m = goodMap();
    m.hexes.push({ ...m.hexes[0], q: 99 });
    m.hexes.push({ ...m.hexes[0] });
    const e = validateMap(m).errors.join('\n');
    expect(e).toMatch(/outside/); expect(e).toMatch(/duplicate/);
  });
  it('treats an unknown terrain as a warning, not an error', () => {
    const m = goodMap(); m.hexes[0].terrain = 'crystal';
    const r = validateMap(m);
    expect(r.ok).toBe(true); expect(r.warnings.join()).toMatch(/crystal/);
  });
  it('enforces the chasm rules: bottomless has no elevation, bottomless only on chasm', () => {
    const m = goodMap();
    const chasm = m.hexes.find((h: { terrain: string }) => h.terrain === 'chasm');
    chasm.elevation = -500;
    expect(validateMap(m).errors.join()).toMatch(/bottomless chasm has no elevation/);
    chasm.bottomless = false;
    expect(validateMap(m).ok).toBe(true);
    const forest = m.hexes.find((h: { terrain: string }) => h.terrain === 'forest');
    forest.bottomless = true;
    expect(validateMap(m).errors.join()).toMatch(/only applies to the chasm/);
  });
  it('rejects bad zoom limits and sizes', () => {
    const m = goodMap(); m.view = { minZoom: 10, maxZoom: 5 }; m.size = { cols: 0, rows: 3 };
    const e = validateMap(m).errors.join('\n');
    expect(e).toMatch(/view/); expect(e).toMatch(/size/);
  });
});

const rules = () => ({
  id: 'made-up', version: '0.1', scale: 'kingdom',
  terrain: {
    sea: { weight: 0, water: true, elevation: [0, 0], neighbors: ['sea', 'plains'] },
    plains: { weight: 5, water: false, elevation: [0, 500], neighbors: ['sea', 'plains', 'chasm'] },
    chasm: { weight: 0, water: false, elevation: 'lowest', neighbors: ['plains', 'chasm'], mustTouch: ['plains'] },
  },
  elevation: { unit: 'ft', maxStepBetweenNeighbors: 800 },
});

describe('validateRules', () => {
  it('accepts a consistent rules file', () => { expect(validateRules(rules()).errors).toEqual([]); });
  it('requires symmetric neighbors', () => {
    const r = rules(); r.terrain.plains.neighbors = ['plains', 'chasm'];
    expect(validateRules(r).errors.join()).toMatch(/sea may touch plains|plains may touch sea|does not list/);
  });
  it('rejects unknown neighbor names', () => {
    const r = rules(); r.terrain.plains.neighbors.push('lava');
    expect(validateRules(r).errors.join()).toMatch(/lava/);
  });
  it('never lets the chasm be water', () => {
    const r = rules(); (r.terrain.chasm as { water: boolean }).water = true;
    expect(validateRules(r).errors.join()).toMatch(/never water/);
  });
  it('checks elevation ranges and weights', () => {
    const r = rules(); r.terrain.plains.elevation = [900, 100]; r.terrain.plains.weight = -1;
    const e = validateRules(r).errors.join('\n');
    expect(e).toMatch(/elevation/); expect(e).toMatch(/weight/);
  });
  it('mustTouch entries must be neighbors', () => {
    const r = rules(); r.terrain.chasm.mustTouch = ['sea'];
    expect(validateRules(r).errors.join()).toMatch(/mustTouch/);
  });
});
