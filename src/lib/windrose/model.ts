import { colRowToHex, hexKey, hexToColRow, type Hex } from './hex';
import { SCALES, type ScaleId } from './scales';
import { MAP_VERSION, type HexData, type MapFile } from './types';

/** In-memory map: hexes in a Map for fast lookup. Convert with toFile / fromFile. */
export interface MapDoc extends Omit<MapFile, 'hexes'> {
  hexes: Map<string, HexData>;
}

export const DEFAULT_VIEW = { minZoom: 4, maxZoom: 256 };

export interface NewMapOptions {
  id?: string;
  name?: string;
  scale: ScaleId;
  cols: number;
  rows: number;
  seed?: number;
}

export function createMap(o: NewMapOptions): MapDoc {
  const s = SCALES[o.scale];
  return {
    id: o.id ?? `map-${Math.random().toString(36).slice(2, 10)}`,
    name: o.name ?? 'Untitled map',
    version: MAP_VERSION,
    scale: o.scale,
    type: s.grid === 'hex' ? 'hex-lore' : 'combat',
    unit: { distance: s.distance, label: s.unitLabel },
    grid: s.grid === 'hex' ? { shape: 'hex', orientation: 'flat-top' } : { shape: 'square' },
    size: { cols: o.cols, rows: o.rows },
    seed: o.seed ?? Math.floor(Math.random() * 2 ** 31),
    theme: 'simple-lines',
    view: { ...DEFAULT_VIEW },
    hexes: new Map(),
    layers: { routes: [], landmarks: [], labels: [] },
  };
}

export const fromFile = (f: MapFile): MapDoc => ({
  ...f,
  hexes: new Map(f.hexes.map((h) => [hexKey(h.q, h.r), h])),
});

/** Hexes are written in row-major order so files diff cleanly. */
export function toFile(d: MapDoc): MapFile {
  const hexes = [...d.hexes.values()].sort((a, b) => {
    const A = hexToColRow(a);
    const B = hexToColRow(b);
    return A.row - B.row || A.col - B.col;
  });
  return { ...d, hexes };
}

export function inBounds(d: Pick<MapDoc, 'size'>, h: Hex): boolean {
  const { col, row } = hexToColRow(h);
  return col >= 0 && col < d.size.cols && row >= 0 && row < d.size.rows;
}

export function newHex(h: Hex, terrain: string): HexData {
  const d: HexData = {
    q: h.q, r: h.r, terrain, features: [], climate: null, elevation: null,
    name: null, notes: '', link: null, dm: { notes: '', secrets: [] },
  };
  if (terrain === 'chasm') d.bottomless = true;
  return d;
}

/** Change a hex's terrain, keeping its other fields. Chasm rules are applied here. */
export function withTerrain(old: HexData | undefined, h: Hex, terrain: string): HexData {
  if (!old) return newHex(h, terrain);
  const next: HexData = { ...old, terrain };
  if (terrain === 'chasm') {
    next.bottomless = old.bottomless ?? true;
    if (next.bottomless) next.elevation = null;
  } else delete next.bottomless;
  return next;
}

/** All cells of the rectangle, in row-major order. */
export function* allCells(size: { cols: number; rows: number }): Generator<Hex> {
  for (let row = 0; row < size.rows; row++) for (let col = 0; col < size.cols; col++) yield colRowToHex(col, row);
}

export function countByTerrain(d: MapDoc): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of d.hexes.values()) out[h.terrain] = (out[h.terrain] ?? 0) + 1;
  return out;
}
