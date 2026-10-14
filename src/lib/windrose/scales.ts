export type ScaleId = 'continent' | 'kingdom' | 'region' | 'province' | 'combat';
export type GridShape = 'hex' | 'square';

export interface Scale {
  id: ScaleId;
  label: string;
  /** Distance from a cell's center to its neighbor's center. */
  distance: number;
  unit: 'miles' | 'feet';
  /** Label written into the map file's `unit.label`. */
  unitLabel: string;
  grid: GridShape;
}

export const SCALES: Record<ScaleId, Scale> = {
  continent: { id: 'continent', label: 'Continent', distance: 60, unit: 'miles', unitLabel: 'miles per hex', grid: 'hex' },
  kingdom: { id: 'kingdom', label: 'Kingdom', distance: 6, unit: 'miles', unitLabel: 'miles per hex', grid: 'hex' },
  region: { id: 'region', label: 'Region', distance: 3, unit: 'miles', unitLabel: 'miles per hex', grid: 'hex' },
  province: { id: 'province', label: 'Province', distance: 1, unit: 'miles', unitLabel: 'miles per hex', grid: 'hex' },
  combat: { id: 'combat', label: 'Combat', distance: 5, unit: 'feet', unitLabel: 'feet per square', grid: 'square' },
};

export const SCALE_IDS = Object.keys(SCALES) as ScaleId[];
export const HEX_SCALE_IDS = SCALE_IDS.filter((s) => SCALES[s].grid === 'hex');
export const isScaleId = (v: unknown): v is ScaleId => typeof v === 'string' && v in SCALES;

/** Real-world distance of `cells` steps at a scale (center to center). */
export const distanceFor = (scale: ScaleId, cells: number) => cells * SCALES[scale].distance;
