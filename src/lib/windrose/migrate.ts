/**
 * Load-time migration for files and saved maps written before the rename.
 *   - terrain "abyss" is now "chasm"
 *   - rules world "crater" is now "below-the-light"
 * Inputs are never mutated: a migrated copy is returned. Nothing is written back until the user saves,
 * so no stored data is lost. Each kind of conversion warns once per session in the console.
 */

export const TERRAIN_RENAMES: Record<string, string> = { abyss: 'chasm' };
export const WORLD_RENAMES: Record<string, string> = { crater: 'below-the-light' };

export interface Migrated<T> { value: T; notes: string[] }

const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[windrose] ${message}`);
}
/** Test helper: forget which warnings were already shown. */
export const resetMigrationWarnings = () => warned.clear();

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const rename = (name: unknown) => (typeof name === 'string' && name in TERRAIN_RENAMES ? TERRAIN_RENAMES[name] : name);

/** Map file (or the map inside a saved record). Unrecognised input is returned as is, for validation to report. */
export function migrateMap<T = unknown>(input: T): Migrated<T> {
  if (!isObj(input) || !Array.isArray(input.hexes)) return { value: input, notes: [] };
  let changed = 0;
  const hexes = input.hexes.map((h: unknown) => {
    if (!isObj(h) || typeof h.terrain !== 'string' || !(h.terrain in TERRAIN_RENAMES)) return h;
    changed++;
    return { ...h, terrain: rename(h.terrain) };
  });
  const bump = input.version === '0.1';
  if (!changed && !bump) return { value: input, notes: [] };
  const notes: string[] = [];
  if (changed) {
    notes.push(`This map used the old terrain name "abyss" for ${changed} hex${changed === 1 ? '' : 'es'}. It is now "chasm", and will be saved that way.`);
    warnOnce('map-abyss', notes[0]);
  }
  // Format 0.1 and 0.2 differ only in the terrain name, so the version is raised quietly.
  return { value: { ...input, hexes, version: bump ? '0.2' : input.version } as T, notes };
}

/** Rules file: terrain keys, neighbor and mustTouch lists, and the world id. */
export function migrateRules<T = unknown>(input: T): Migrated<T> {
  if (!isObj(input)) return { value: input, notes: [] };
  const notes: string[] = [];
  const next: Record<string, unknown> = { ...input };

  if (typeof next.world === 'string' && next.world in WORLD_RENAMES) {
    notes.push(`The rules world "${next.world}" is now "${WORLD_RENAMES[next.world]}".`);
    next.world = WORLD_RENAMES[next.world];
  }
  if (isObj(next.terrain)) {
    let touched = false;
    const terrain: Record<string, unknown> = {};
    for (const [name, def] of Object.entries(next.terrain)) {
      const newName = rename(name) as string;
      if (newName !== name) touched = true;
      let out = def;
      if (isObj(def)) {
        const o: Record<string, unknown> = { ...def };
        for (const key of ['neighbors', 'mustTouch'] as const) {
          const list = o[key];
          if (Array.isArray(list) && list.some((n) => typeof n === 'string' && n in TERRAIN_RENAMES)) {
            o[key] = list.map(rename);
            touched = true;
          }
        }
        out = o;
      }
      terrain[newName] = out;
    }
    if (touched) {
      notes.push('This rules file used the old terrain name "abyss". It is now "chasm".');
      next.terrain = terrain;
    }
  }
  if (!notes.length) return { value: input, notes };
  for (const n of notes) warnOnce(`rules:${n}`, n);
  return { value: next as T, notes };
}
