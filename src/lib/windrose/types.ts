import type { ScaleId } from './scales';

export const MAP_VERSION = '0.2';
export type MapType = 'lore' | 'hex-lore' | 'combat';
export const MAP_TYPES: MapType[] = ['lore', 'hex-lore', 'combat'];

export interface HexData {
  q: number;
  r: number;
  terrain: string;
  features: string[];
  climate: string | null;
  /** Feet above sea level. Omitted for a bottomless chasm (always the lowest point). */
  elevation: number | null;
  name: string | null;
  notes: string;
  /** Path of the finer map of this hex (zoom between scales, not built yet). */
  link: string | null;
  /** Only meaningful on a chasm. Default true. */
  bottomless?: boolean;
  /** Everything here is left out of player-safe exports. */
  dm: { notes: string; secrets: string[] };
}

export interface MapFile {
  id: string;
  name: string;
  version: string;
  scale: ScaleId;
  type: MapType;
  unit: { distance: number; label: string };
  grid: { shape: 'hex' | 'square'; orientation?: 'flat-top' };
  /** Rectangular extent in odd-q columns and rows (hex maps) or columns and rows (square maps). */
  size: { cols: number; rows: number };
  seed: number;
  theme: string;
  /** Per-map zoom limits, in pixels per cell. */
  view: { minZoom: number; maxZoom: number };
  /** Only cells that have been painted are listed. */
  hexes: HexData[];
  layers: { routes: unknown[]; landmarks: unknown[]; labels: unknown[] };
}

// ---- rules file ----
export type ElevationRange = [number, number] | 'lowest';
export interface RuleTerrain {
  weight: number;
  water?: boolean;
  neighbors: string[];
  elevation?: ElevationRange;
  mustTouch?: string[];
}
export interface RulesFile {
  id: string;
  version: string;
  scale: ScaleId;
  status?: string;
  world?: string;
  description?: string;
  notes?: string[];
  terrain: Record<string, RuleTerrain>;
  elevation?: { unit: string; seaLevel?: number; maxStepBetweenNeighbors?: number };
}
