import { type Camera, type Size, visibleBox, worldToScreen } from './camera';
import { exportSize, hexMapBox } from './bounds';
import { DIRECTIONS, HEX_RADIUS, SQRT3, colRowToHex, hexKey, hexToPixel, type Hex } from './hex';
import type { MapDoc } from './model';
import { cellRng, randRange, type Rng } from './rng';
import { isWater } from './terrain';
import type { Theme } from './theme';
import type { HexData } from './types';

export interface RenderOptions {
  doc: MapDoc;
  theme: Theme;
  camera: Camera;
  /** Size of the drawing area in CSS pixels (the context must already be scaled for the pixel ratio). */
  view: Size;
  /** Draw a thin outline around every cell of the map. */
  grid: boolean;
  labels: boolean;
}

export type Lod = 'fills' | 'outlines' | 'detail';
export const lodFor = (zoom: number, theme: Theme): Lod =>
  zoom < theme.lod.fillsOnly ? 'fills' : zoom < theme.lod.outlines ? 'outlines' : 'detail';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Line widths scale with zoom (64 px per cell is the design size) but stay within the theme's limits. */
const lineWidth = (base: number, zoom: number, t: Theme) => clamp((base * zoom) / 64, t.lines.minPx, t.lines.maxPx);

/** Path of one hex centered at (cx, cy) with corner radius R. */
export function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const x = cx + R * Math.cos(a);
    const y = cy + R * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

type CellClass = 'water' | 'chasm' | 'land';
const classOf = (h: HexData): CellClass => (h.terrain === 'chasm' ? 'chasm' : isWater(h.terrain) ? 'water' : 'land');

export function renderMap(ctx: CanvasRenderingContext2D, o: RenderOptions): void {
  const { doc, theme, camera, view } = o;
  const z = camera.zoom;
  const lod = lodFor(z, theme);
  const R = z * HEX_RADIUS;
  ctx.save();
  ctx.fillStyle = theme.paper;
  ctx.fillRect(0, 0, view.width, view.height);

  // Only the cells that can touch the view.
  const box = visibleBox(camera, view);
  const colW = SQRT3 / 2;
  const c0 = Math.max(0, Math.floor((box.x0 - HEX_RADIUS) / colW));
  const c1 = Math.min(doc.size.cols - 1, Math.ceil((box.x1 + HEX_RADIUS) / colW));
  const r0 = Math.max(0, Math.floor(box.y0 - 1));
  const r1 = Math.min(doc.size.rows - 1, Math.ceil(box.y1 + 1));

  const cells: { h: Hex; data: HexData | undefined; x: number; y: number }[] = [];
  for (let col = c0; col <= c1; col++) {
    for (let row = r0; row <= r1; row++) {
      const h = colRowToHex(col, row);
      const s = worldToScreen(camera, view, hexToPixel(h));
      if (s.x < -R * 2 || s.y < -R * 2 || s.x > view.width + R * 2 || s.y > view.height + R * 2) continue;
      cells.push({ h, data: doc.hexes.get(hexKey(h.q, h.r)), x: s.x, y: s.y });
    }
  }

  // 1. Fills
  for (const c of cells) {
    if (!c.data) continue;
    const style = theme.terrain[c.data.terrain] ?? theme.unknownTerrain;
    if (!style.fill) continue;
    hexPath(ctx, c.x, c.y, R);
    if (c.data.terrain === 'chasm' && lod !== 'fills') {
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R);
      g.addColorStop(0, '#07030a');
      g.addColorStop(1, '#3a1530');
      ctx.fillStyle = g;
    } else ctx.fillStyle = style.fill;
    ctx.fill();
    if (lod === 'fills') { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke(); } // hides seams
  }

  // 2. Grid lines
  if (o.grid && lod !== 'fills') {
    ctx.strokeStyle = theme.inkSoft;
    ctx.lineWidth = lineWidth(theme.lines.thin * 0.6, z, theme);
    ctx.beginPath();
    for (const c of cells) {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const x = c.x + R * Math.cos(a);
        const y = c.y + R * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    ctx.stroke();
  }

  // 3. Thick edges: coasts (water against land or chasm) and cliffs (chasm against anything else)
  if (lod !== 'fills') {
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = lineWidth(theme.lines.thick, z, theme);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const c of cells) {
      if (!c.data) continue;
      const mine = classOf(c.data);
      for (let d = 0; d < 3; d++) {
        const n = doc.hexes.get(hexKey(c.h.q + DIRECTIONS[d].q, c.h.r + DIRECTIONS[d].r));
        if (!n || classOf(n) === mine) continue;
        const a0 = (Math.PI / 3) * d;
        const a1 = (Math.PI / 3) * (d + 1);
        ctx.moveTo(c.x + R * Math.cos(a0), c.y + R * Math.sin(a0));
        ctx.lineTo(c.x + R * Math.cos(a1), c.y + R * Math.sin(a1));
      }
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // 4. Symbols, features and labels
  if (lod === 'detail') {
    ctx.strokeStyle = theme.ink;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const c of cells) {
      if (!c.data) continue;
      const style = theme.terrain[c.data.terrain] ?? theme.unknownTerrain;
      ctx.lineWidth = lineWidth(theme.lines.thin, z, theme);
      const rng = cellRng(doc.seed, c.h.q, c.h.r);
      if (style.symbol) SYMBOLS[style.symbol]?.(ctx, c.x, c.y, z, rng, theme);
      if (c.data.terrain === 'chasm') cliffTicks(ctx, doc, c.h, c.x, c.y, R, z, theme);
      for (const f of c.data.features) FEATURE_ICONS[f]?.(ctx, c.x, c.y, z, theme);
      if (o.labels && c.data.name) label(ctx, c.data.name, c.x, c.y + z * 0.32, z, theme);
    }
  }
  ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, z: number, t: Theme) {
  const size = clamp(z * 0.2, 9, 40);
  ctx.font = `600 ${size}px ${t.fonts.display}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = size / 4;
  ctx.strokeStyle = t.paper;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = t.ink;
  ctx.fillText(text, x, y);
  ctx.strokeStyle = t.ink;
}

type Draw = (ctx: CanvasRenderingContext2D, x: number, y: number, u: number, rng: Rng, t: Theme) => void;
const jitter = (rng: Rng, spread: number) => randRange(rng, -spread, spread);

const SYMBOLS: Record<string, Draw> = {
  trees(ctx, x, y, u, rng, t) {
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const px = x + jitter(rng, 0.3 * u);
      const py = y + jitter(rng, 0.22 * u);
      const r = u * randRange(rng, 0.06, 0.085);
      ctx.beginPath(); ctx.moveTo(px, py + r * 2.2); ctx.lineTo(px, py + r * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = t.paper; ctx.fill(); ctx.stroke();
    }
  },
  humps(ctx, x, y, u, rng) {
    const n = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const px = x + jitter(rng, 0.25 * u);
      const py = y + jitter(rng, 0.2 * u) + 0.06 * u;
      const r = u * randRange(rng, 0.09, 0.14);
      ctx.beginPath(); ctx.arc(px, py, r, Math.PI, 0); ctx.stroke();
    }
  },
  peaks(ctx, x, y, u, rng) {
    const n = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const px = x + (n === 1 ? jitter(rng, 0.08 * u) : (i - 0.5) * 0.36 * u);
      const py = y + jitter(rng, 0.06 * u) + 0.1 * u;
      const w = u * randRange(rng, 0.13, 0.18);
      const h = w * randRange(rng, 1.4, 1.8);
      ctx.beginPath(); ctx.moveTo(px - w, py); ctx.lineTo(px, py - h); ctx.lineTo(px + w, py); ctx.stroke();
      ctx.beginPath(); // short shaded stroke on the right side
      ctx.moveTo(px + w * 0.12, py - h * 0.78); ctx.lineTo(px + w * 0.55, py - h * 0.1);
      ctx.moveTo(px + w * 0.28, py - h * 0.55); ctx.lineTo(px + w * 0.7, py - h * 0.2);
      ctx.stroke();
    }
  },
  marsh(ctx, x, y, u, rng) {
    const n = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const px = x + jitter(rng, 0.2 * u);
      const py = y + (i - (n - 1) / 2) * 0.22 * u + jitter(rng, 0.03 * u);
      const w = u * 0.14;
      ctx.beginPath(); ctx.moveTo(px - w, py); ctx.lineTo(px + w, py);
      for (const dx of [-0.55, 0, 0.55]) { ctx.moveTo(px + dx * w, py); ctx.lineTo(px + dx * w, py - 0.07 * u); }
      ctx.stroke();
    }
  },
  dunes(ctx, x, y, u, rng) {
    const n = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const px = x + jitter(rng, 0.1 * u);
      const py = y + (i - (n - 1) / 2) * 0.2 * u + jitter(rng, 0.04 * u);
      ctx.beginPath(); ctx.moveTo(px - 0.28 * u, py + 0.04 * u);
      ctx.quadraticCurveTo(px - 0.05 * u, py - 0.14 * u, px + 0.28 * u, py + 0.04 * u); ctx.stroke();
    }
    ctx.fillStyle = ctx.strokeStyle;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.arc(x + jitter(rng, 0.32 * u), y + jitter(rng, 0.28 * u), Math.max(0.6, u * 0.008), 0, Math.PI * 2); ctx.fill();
    }
  },
  waves(ctx, x, y, u, rng, t) {
    ctx.strokeStyle = t.waterLine;
    for (let i = 0; i < 2; i++) {
      const px = x + jitter(rng, 0.12 * u);
      const py = y + (i - 0.5) * 0.3 * u + jitter(rng, 0.04 * u);
      ctx.beginPath(); ctx.moveTo(px - 0.24 * u, py);
      ctx.quadraticCurveTo(px - 0.12 * u, py - 0.07 * u, px, py);
      ctx.quadraticCurveTo(px + 0.12 * u, py + 0.07 * u, px + 0.24 * u, py); ctx.stroke();
    }
    ctx.strokeStyle = t.ink;
  },
  ripples(ctx, x, y, u, rng, t) {
    ctx.strokeStyle = t.waterLine;
    for (let i = 0; i < 3; i++) {
      const px = x + jitter(rng, 0.25 * u); const py = y + jitter(rng, 0.25 * u);
      ctx.beginPath(); ctx.moveTo(px - 0.07 * u, py); ctx.lineTo(px + 0.07 * u, py); ctx.stroke();
    }
    ctx.strokeStyle = t.ink;
  },
  grass(ctx, x, y, u, rng) {
    for (let i = 0; i < 3; i++) {
      const px = x + jitter(rng, 0.32 * u); const py = y + jitter(rng, 0.28 * u);
      ctx.beginPath(); ctx.moveTo(px - 0.03 * u, py - 0.05 * u); ctx.lineTo(px, py); ctx.lineTo(px + 0.03 * u, py - 0.05 * u); ctx.stroke();
    }
  },
  dots(ctx, x, y, u, rng) {
    ctx.fillStyle = ctx.strokeStyle;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.arc(x + jitter(rng, 0.34 * u), y + jitter(rng, 0.3 * u), Math.max(0.6, u * 0.009), 0, Math.PI * 2); ctx.fill();
    }
  },
  chasm(ctx, x, y, u, _rng, t) {
    ctx.strokeStyle = 'rgba(242, 233, 210, 0.22)';
    for (const f of [0.38, 0.27, 0.16]) { ctx.beginPath(); ctx.arc(x, y, u * f, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = t.ink;
  },
};

/** Short ticks along the edges where the chasm meets something else, pointing into the chasm. */
function cliffTicks(ctx: CanvasRenderingContext2D, doc: MapDoc, h: Hex, x: number, y: number, R: number, u: number, t: Theme) {
  ctx.strokeStyle = 'rgba(242, 233, 210, 0.7)';
  ctx.beginPath();
  for (let d = 0; d < 6; d++) {
    const n = doc.hexes.get(hexKey(h.q + DIRECTIONS[d].q, h.r + DIRECTIONS[d].r));
    if (n?.terrain === 'chasm' || !n) continue;
    const a0 = (Math.PI / 3) * d;
    const a1 = (Math.PI / 3) * (d + 1);
    const ax = x + R * Math.cos(a0); const ay = y + R * Math.sin(a0);
    const bx = x + R * Math.cos(a1); const by = y + R * Math.sin(a1);
    for (const f of [0.2, 0.4, 0.6, 0.8]) {
      const ex = ax + (bx - ax) * f; const ey = ay + (by - ay) * f;
      ctx.moveTo(ex, ey); ctx.lineTo(ex + (x - ex) * 0.16, ey + (y - ey) * 0.16);
    }
  }
  ctx.stroke();
  ctx.strokeStyle = t.ink;
  void u;
}

type Icon = (ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: Theme) => void;
const FEATURE_ICONS: Record<string, Icon> = {
  village(ctx, x, y, u, t) { ctx.fillStyle = t.plum; ctx.beginPath(); ctx.arc(x, y, u * 0.06, 0, Math.PI * 2); ctx.fill(); },
  town(ctx, x, y, u, t) { ctx.fillStyle = t.plum; const s = u * 0.12; ctx.fillRect(x - s / 2, y - s / 2, s, s); },
  city(ctx, x, y, u, t) {
    const s = u * 0.12; ctx.fillStyle = t.plum; ctx.fillRect(x - s / 2, y - s / 2, s, s);
    ctx.strokeStyle = t.plum; ctx.beginPath(); ctx.arc(x, y, u * 0.12, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = t.ink;
  },
  tower(ctx, x, y, u, t) {
    const w = u * 0.05; const h = u * 0.2;
    ctx.fillStyle = t.paper; ctx.beginPath(); ctx.rect(x - w, y - h / 2, w * 2, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - w, y - h / 2 - u * 0.03); ctx.lineTo(x - w, y - h / 2); ctx.moveTo(x, y - h / 2 - u * 0.03); ctx.lineTo(x, y - h / 2);
    ctx.moveTo(x + w, y - h / 2 - u * 0.03); ctx.lineTo(x + w, y - h / 2); ctx.stroke();
  },
  cave(ctx, x, y, u, t) {
    const r = u * 0.09; ctx.fillStyle = t.ink; ctx.beginPath(); ctx.arc(x, y + r / 2, r, Math.PI, 0); ctx.closePath(); ctx.fill();
  },
  camp(ctx, x, y, u, t) {
    const w = u * 0.09; ctx.fillStyle = t.paper;
    ctx.beginPath(); ctx.moveTo(x - w, y + w * 0.8); ctx.lineTo(x, y - w); ctx.lineTo(x + w, y + w * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
  },
  temple(ctx, x, y, u, t) {
    const w = u * 0.1; ctx.fillStyle = t.paper;
    ctx.beginPath(); ctx.moveTo(x - w, y - w * 0.3); ctx.lineTo(x, y - w); ctx.lineTo(x + w, y - w * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); for (const dx of [-0.7, 0, 0.7]) { ctx.moveTo(x + dx * w, y - w * 0.2); ctx.lineTo(x + dx * w, y + w * 0.8); } ctx.stroke();
  },
  'standing-stone'(ctx, x, y, u, t) {
    const w = u * 0.035; const h = u * 0.14; ctx.fillStyle = t.paper;
    ctx.beginPath(); ctx.roundRect(x - w, y - h / 2, w * 2, h, w); ctx.fill(); ctx.stroke();
  },
  ruins(ctx, x, y, u) {
    const s = u * 0.12; const k = s * 0.45; ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.moveTo(x + sx * s, y + sy * (s - k)); ctx.lineTo(x + sx * s, y + sy * s); ctx.lineTo(x + sx * (s - k), y + sy * s);
    }
    ctx.stroke();
  },
};

/** Draw the whole map to a canvas at `ppc` pixels per cell (neighbor center to neighbor center). */
export function renderToCanvas(canvas: HTMLCanvasElement | OffscreenCanvas, doc: MapDoc, theme: Theme, ppc: number, grid: boolean, labels = true) {
  const { width, height } = exportSize(doc.size.cols, doc.size.rows, ppc);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const b = hexMapBox(doc.size.cols, doc.size.rows);
  // Map x0,y0 lands on pixel (0,0), so hex (col,row) is centered exactly where the documented formula says.
  const camera: Camera = { x: b.x0 + width / (2 * ppc), y: b.y0 + height / (2 * ppc), zoom: ppc };
  renderMap(ctx, { doc, theme, camera, view: { width, height }, grid, labels });
  return { width, height };
}
