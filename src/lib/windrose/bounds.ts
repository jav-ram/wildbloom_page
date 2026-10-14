import { HEX_RADIUS, SQRT3, colRowToHex, hexToPixel } from './hex';

export const BASE_PIXELS_PER_CELL = 64;

/** Bounding box of a cols x rows hex map in cell units (neighbor distance = 1). Hex (0,0) is centered at (0,0). */
export function hexMapBox(cols: number, rows: number) {
  return {
    x0: -HEX_RADIUS,
    y0: -0.5,
    x1: (SQRT3 / 2) * (cols - 1) + HEX_RADIUS,
    y1: rows - 0.5 + (cols > 1 ? 0.5 : 0),
  };
}

export const squareMapBox = (cols: number, rows: number) => ({ x0: -0.5, y0: -0.5, x1: cols - 0.5, y1: rows - 0.5 });

/**
 * PNG size for a hex map at `ppc` pixels per cell (ppc = distance between neighbor centers), no margin:
 *   width  = ceil(ppc * ( (sqrt(3)/2) * (cols - 1) + 2/sqrt(3) ))
 *   height = ceil(ppc * ( rows + (cols > 1 ? 0.5 : 0) ))
 * The center of the hex at (col, row) is at
 *   x = ppc * ( (sqrt(3)/2) * col + 1/sqrt(3) ),   y = ppc * ( row + 0.5 + (col odd ? 0.5 : 0) ).
 */
export function exportSize(cols: number, rows: number, ppc: number) {
  const b = hexMapBox(cols, rows);
  return { width: Math.ceil((b.x1 - b.x0) * ppc), height: Math.ceil((b.y1 - b.y0) * ppc) };
}

export const MAX_EXPORT_SIDE = 16384;
export const MAX_EXPORT_PIXELS = 128_000_000;

export function exportProblem(cols: number, rows: number, ppc: number): string | null {
  if (!(ppc >= 8 && ppc <= 512)) return 'Pixels per cell must be between 8 and 512.';
  const { width, height } = exportSize(cols, rows, ppc);
  if (width > MAX_EXPORT_SIDE || height > MAX_EXPORT_SIDE) return `Image would be ${width} x ${height}; the limit is ${MAX_EXPORT_SIDE} pixels per side.`;
  if (width * height > MAX_EXPORT_PIXELS) return 'Image would be too large for the browser to draw. Lower the pixels per cell.';
  return null;
}

/** Center of (col, row) in cell units. */
export const cellCenter = (col: number, row: number) => hexToPixel(colRowToHex(col, row), 1);

/** A round scale-bar length (1, 2 or 5 times a power of ten) that is at most `maxPx` wide. */
export function niceScaleBar(pxPerUnit: number, maxPx: number): { value: number; px: number } {
  const maxValue = maxPx / pxPerUnit;
  const pow = Math.pow(10, Math.floor(Math.log10(maxValue)));
  let value = pow;
  for (const m of [5, 2, 1]) if (m * pow <= maxValue) { value = m * pow; break; }
  return { value, px: value * pxPerUnit };
}
