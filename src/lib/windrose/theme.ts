import simpleLines from './themes/simple-lines.theme.json';

export interface TerrainStyle { fill: string | null; symbol: string | null }
export interface Theme {
  id: string;
  name: string;
  paper: string;
  ink: string;
  inkSoft: string;
  plum: string;
  water: string;
  waterLine: string;
  lines: { thin: number; thick: number; minPx: number; maxPx: number };
  /** Zoom (pixels per cell) below which detail is dropped. */
  lod: { fillsOnly: number; outlines: number };
  fonts: { display: string; body: string };
  terrain: Record<string, TerrainStyle>;
  unknownTerrain: TerrainStyle;
}

export const THEMES: Record<string, Theme> = { 'simple-lines': simpleLines as Theme };
export const DEFAULT_THEME = THEMES['simple-lines'];
export const getTheme = (id: string): Theme => THEMES[id] ?? DEFAULT_THEME;
