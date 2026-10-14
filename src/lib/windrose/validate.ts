import { migrateMap, migrateRules } from './migrate';
import { isScaleId, SCALES } from './scales';
import { TERRAIN_BY_ID } from './terrain';
import { MAP_TYPES, MAP_VERSION, type MapFile, type RulesFile } from './types';

export interface ValidationResult<T> {
  ok: boolean;
  errors: string[];
  warnings: string[];
  value?: T;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const MAX_CELLS = 250_000;

export function validateMap(raw: unknown): ValidationResult<MapFile> {
  const { value: input, notes } = migrateMap(raw);
  const errors: string[] = [];
  const warnings: string[] = [...notes];
  const done = (): ValidationResult<MapFile> =>
    errors.length ? { ok: false, errors, warnings } : { ok: true, errors, warnings, value: input as MapFile };

  if (!isObj(input)) return { ok: false, errors: ['Map file must be a JSON object.'], warnings };
  const m = input;

  if (!isStr(m.id) || !m.id) errors.push('id: must be a non-empty string.');
  if (!isStr(m.name)) errors.push('name: must be a string.');
  if (!isStr(m.version)) errors.push('version: must be a string.');
  else if (m.version !== MAP_VERSION) warnings.push(`version: file is ${m.version}, this build reads ${MAP_VERSION}.`);

  const scaleOk = isScaleId(m.scale);
  if (!scaleOk) errors.push(`scale: must be one of ${Object.keys(SCALES).join(', ')}.`);
  if (!MAP_TYPES.includes(m.type as never)) errors.push(`type: must be one of ${MAP_TYPES.join(', ')}.`);

  if (scaleOk) {
    const s = SCALES[m.scale as keyof typeof SCALES];
    if (isObj(m.unit)) {
      if (m.unit.distance !== s.distance) errors.push(`unit.distance: ${s.id} scale is ${s.distance} ${s.unitLabel}.`);
    } else errors.push('unit: must be an object { distance, label }.');
    if (isObj(m.grid)) {
      if (m.grid.shape !== s.grid) errors.push(`grid.shape: ${s.id} scale uses a ${s.grid} grid.`);
      if (s.grid === 'hex' && m.grid.orientation !== 'flat-top') errors.push('grid.orientation: hex maps must be "flat-top".');
    } else errors.push('grid: must be an object { shape, orientation }.');
    if (m.type === 'combat' && m.scale !== 'combat') errors.push('type: combat maps always use the combat scale.');
    if (m.scale === 'combat' && m.type !== 'combat') errors.push('scale: the combat scale is only for combat maps.');
    if (m.type === 'hex-lore' && s.grid !== 'hex') errors.push('type: hex-lore maps need a hex scale.');
  }

  let cols = 0;
  let rows = 0;
  if (isObj(m.size) && isInt(m.size.cols) && isInt(m.size.rows) && m.size.cols > 0 && m.size.rows > 0) {
    cols = m.size.cols;
    rows = m.size.rows;
    if (cols * rows > MAX_CELLS) errors.push(`size: at most ${MAX_CELLS} cells.`);
  } else errors.push('size: must be { cols, rows } with positive whole numbers.');

  if (!isInt(m.seed)) errors.push('seed: must be a whole number.');
  if (!isStr(m.theme)) errors.push('theme: must be a string.');
  if (isObj(m.view)) {
    if (!isNum(m.view.minZoom) || !isNum(m.view.maxZoom) || m.view.minZoom <= 0 || m.view.minZoom >= m.view.maxZoom)
      errors.push('view: minZoom and maxZoom must be numbers with 0 < minZoom < maxZoom.');
  } else errors.push('view: must be an object { minZoom, maxZoom }.');

  if (!isObj(m.layers) || !['routes', 'landmarks', 'labels'].every((k) => Array.isArray((m.layers as Record<string, unknown>)[k])))
    errors.push('layers: must have arrays routes, landmarks and labels.');

  if (!Array.isArray(m.hexes)) errors.push('hexes: must be an array.');
  else if (cols && rows) {
    const seen = new Set<string>();
    const unknownTerrain = new Set<string>();
    m.hexes.forEach((h: unknown, i: number) => {
      const at = `hexes[${i}]`;
      if (!isObj(h)) return void errors.push(`${at}: must be an object.`);
      if (!isInt(h.q) || !isInt(h.r)) return void errors.push(`${at}: q and r must be whole numbers.`);
      const col = h.q;
      const row = h.r + (h.q - (h.q & 1)) / 2;
      if (col < 0 || col >= cols || row < 0 || row >= rows) errors.push(`${at}: (${h.q}, ${h.r}) is outside the ${cols} x ${rows} map.`);
      const key = `${h.q},${h.r}`;
      if (seen.has(key)) errors.push(`${at}: duplicate hex (${key}).`);
      seen.add(key);
      if (!isStr(h.terrain) || !h.terrain) errors.push(`${at}: terrain must be a non-empty string.`);
      else if (!KNOWN_TERRAIN.has(h.terrain)) unknownTerrain.add(h.terrain);
      if (!Array.isArray(h.features) || !h.features.every(isStr)) errors.push(`${at}: features must be an array of strings.`);
      if (h.climate != null && !isStr(h.climate)) errors.push(`${at}: climate must be a string or null.`);
      if (h.elevation != null && !isNum(h.elevation)) errors.push(`${at}: elevation must be a number or null.`);
      if (h.name != null && !isStr(h.name)) errors.push(`${at}: name must be a string or null.`);
      if (!isStr(h.notes)) errors.push(`${at}: notes must be a string.`);
      if (h.link != null && !isStr(h.link)) errors.push(`${at}: link must be a string or null.`);
      if (h.bottomless != null && typeof h.bottomless !== 'boolean') errors.push(`${at}: bottomless must be true or false.`);
      if (h.bottomless !== undefined && h.terrain !== 'chasm') errors.push(`${at}: bottomless only applies to the chasm.`);
      if (h.terrain === 'chasm' && h.bottomless !== false && h.elevation != null) errors.push(`${at}: a bottomless chasm has no elevation.`);
      if (!isObj(h.dm) || !isStr(h.dm.notes) || !Array.isArray(h.dm.secrets) || !h.dm.secrets.every(isStr))
        errors.push(`${at}: dm must be { notes: string, secrets: string[] }.`);
    });
    if (unknownTerrain.size) warnings.push(`Unknown terrain drawn as a plain gray cell: ${[...unknownTerrain].join(', ')}.`);
  }
  return done();
}

const KNOWN_TERRAIN = new Set(Object.keys(TERRAIN_BY_ID));

export function validateRules(raw: unknown): ValidationResult<RulesFile> {
  const { value: input, notes } = migrateRules(raw);
  const errors: string[] = [];
  const warnings: string[] = [...notes];
  if (!isObj(input)) return { ok: false, errors: ['Rules file must be a JSON object.'], warnings };
  const r = input;
  if (!isStr(r.id) || !r.id) errors.push('id: must be a non-empty string.');
  if (!isStr(r.version)) errors.push('version: must be a string.');
  if (!isScaleId(r.scale)) errors.push(`scale: must be one of ${Object.keys(SCALES).join(', ')}.`);
  if (!isObj(r.terrain) || !Object.keys(r.terrain).length) {
    errors.push('terrain: must be an object with at least one terrain.');
    return { ok: false, errors, warnings };
  }
  const terrain = r.terrain as Record<string, unknown>;
  const names = new Set(Object.keys(terrain));
  for (const [name, t] of Object.entries(terrain)) {
    const at = `terrain.${name}`;
    if (!isObj(t)) { errors.push(`${at}: must be an object.`); continue; }
    if (!isNum(t.weight) || t.weight < 0) errors.push(`${at}.weight: must be a number, 0 or more.`);
    if (t.water != null && typeof t.water !== 'boolean') errors.push(`${at}.water: must be true or false.`);
    if (name === 'chasm' && t.water === true) errors.push(`${at}.water: the chasm is never water.`);
    if (!Array.isArray(t.neighbors) || !t.neighbors.every(isStr)) { errors.push(`${at}.neighbors: must be an array of terrain names.`); continue; }
    for (const n of t.neighbors as string[]) {
      if (!names.has(n)) { errors.push(`${at}.neighbors: "${n}" is not a terrain in this file.`); continue; }
      const other = terrain[n];
      if (isObj(other) && Array.isArray(other.neighbors) && !other.neighbors.includes(name))
        errors.push(`${at}.neighbors: ${name} may touch ${n}, but ${n} does not list ${name}.`);
    }
    if (t.elevation !== undefined && t.elevation !== 'lowest') {
      const e = t.elevation;
      if (!Array.isArray(e) || e.length !== 2 || !e.every(isNum) || e[0] > e[1]) errors.push(`${at}.elevation: must be [min, max] or "lowest".`);
    }
    if (t.mustTouch !== undefined) {
      if (!Array.isArray(t.mustTouch) || !t.mustTouch.every(isStr)) errors.push(`${at}.mustTouch: must be an array of terrain names.`);
      else for (const n of t.mustTouch as string[]) {
        if (!names.has(n)) errors.push(`${at}.mustTouch: "${n}" is not a terrain in this file.`);
        else if (!(t.neighbors as string[]).includes(n)) errors.push(`${at}.mustTouch: "${n}" must also be in neighbors.`);
      }
    }
  }
  if (r.elevation !== undefined) {
    if (!isObj(r.elevation) || !isStr(r.elevation.unit)) errors.push('elevation: must be an object with a unit.');
    else if (r.elevation.maxStepBetweenNeighbors != null && (!isNum(r.elevation.maxStepBetweenNeighbors) || r.elevation.maxStepBetweenNeighbors <= 0))
      errors.push('elevation.maxStepBetweenNeighbors: must be a positive number.');
  }
  return errors.length ? { ok: false, errors, warnings } : { ok: true, errors, warnings, value: input as unknown as RulesFile };
}
