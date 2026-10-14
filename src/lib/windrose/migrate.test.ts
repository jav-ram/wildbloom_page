import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMap, newHex, toFile, withTerrain } from './model';
import { MAP_VERSION } from './types';
import { migrateMap, migrateRules, resetMigrationWarnings } from './migrate';
import { validateMap, validateRules } from './validate';

function oldMap() {
  const f = JSON.parse(JSON.stringify(toFile(createMap({ name: 'Old', scale: 'kingdom', cols: 6, rows: 6 }))));
  f.version = '0.1';
  f.hexes = [
    { ...newHex({ q: 0, r: 0 }, 'plains'), name: 'Home' },
    { ...newHex({ q: 1, r: 0 }, 'chasm'), terrain: 'abyss', bottomless: true, notes: 'deep', dm: { notes: 'secret', secrets: ['a'] } },
    { ...newHex({ q: 2, r: 0 }, 'chasm'), terrain: 'abyss', bottomless: false, elevation: -200 },
  ];
  return f;
}

describe('migrateMap', () => {
  beforeEach(() => { resetMigrationWarnings(); vi.restoreAllMocks(); });

  it('converts abyss to chasm and keeps every other field', () => {
    const input = oldMap();
    const { value, notes } = migrateMap(input);
    const [plains, a, b] = (value as typeof input).hexes;
    expect(plains.terrain).toBe('plains');
    expect(a).toMatchObject({ terrain: 'chasm', bottomless: true, notes: 'deep', dm: { notes: 'secret', secrets: ['a'] } });
    expect(b).toMatchObject({ terrain: 'chasm', bottomless: false, elevation: -200 });
    expect(notes[0]).toMatch(/2 hexes/);
  });

  it('does not mutate its input', () => {
    const input = oldMap();
    const before = JSON.stringify(input);
    migrateMap(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('raises a 0.1 version quietly, and leaves a current map untouched', () => {
    const plain = oldMap(); plain.hexes = [plain.hexes[0]];
    const m = migrateMap(plain);
    expect(m.value.version).toBe('0.2');
    expect(m.notes).toEqual([]);
    const current = toFile(createMap({ name: 'New', scale: 'kingdom', cols: 4, rows: 4 }));
    expect(migrateMap(current).value).toBe(current);
  });

  it('warns once in the console', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    migrateMap(oldMap()); migrateMap(oldMap());
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('passes unrecognised input through for validation to report', () => {
    expect(migrateMap(null).value).toBeNull();
    expect(migrateMap({ hexes: 'no' }).value).toEqual({ hexes: 'no' });
  });

  it('an old file validates and loads as a chasm map without warnings about the version', () => {
    const v = validateMap(oldMap());
    expect(v.ok).toBe(true);
    expect(v.value!.version).toBe(MAP_VERSION);
    expect(v.value!.hexes.filter((h) => h.terrain === 'chasm')).toHaveLength(2);
    expect(v.warnings.join()).not.toMatch(/this build reads/);
    expect(v.warnings.join()).toMatch(/abyss/);
  });

  it('withTerrain still treats chasm as the bottomless terrain after migration', () => {
    const h = migrateMap(oldMap()).value.hexes[1];
    expect(withTerrain(h, { q: 1, r: 0 }, 'plains').bottomless).toBeUndefined();
  });
});

describe('migrateRules', () => {
  beforeEach(() => { resetMigrationWarnings(); vi.restoreAllMocks(); });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rules = (): any => ({
    id: 'made-up', version: '0.1', scale: 'kingdom', world: 'crater',
    terrain: {
      plains: { weight: 5, water: false, elevation: [0, 500], neighbors: ['plains', 'abyss'] },
      abyss: { weight: 0, water: false, elevation: 'lowest', neighbors: ['plains', 'abyss'], mustTouch: ['plains'] },
    },
  });

  it('renames the terrain key, the neighbor lists and the world id', () => {
    const { value, notes } = migrateRules(rules());
    expect(value.world).toBe('below-the-light');
    expect(Object.keys(value.terrain)).toEqual(['plains', 'chasm']);
    expect(value.terrain.plains.neighbors).toEqual(['plains', 'chasm']);
    expect(value.terrain.chasm.neighbors).toEqual(['plains', 'chasm']);
    expect(notes).toHaveLength(2);
  });

  it('does not mutate its input and leaves current files alone', () => {
    const input = rules(); const before = JSON.stringify(input);
    migrateRules(input);
    expect(JSON.stringify(input)).toBe(before);
    const fresh = { ...rules(), world: 'below-the-light' };
    fresh.terrain = { plains: { weight: 1, water: false, neighbors: ['plains'] } } as never;
    expect(migrateRules(fresh).value).toBe(fresh);
  });

  it('an old rules file validates after migration', () => {
    const v = validateRules(rules());
    expect(v.errors).toEqual([]);
    expect(v.ok).toBe(true);
    expect(v.value!.terrain.chasm.mustTouch).toEqual(['plains']);
  });
});
