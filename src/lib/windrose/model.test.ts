import { describe, expect, it } from 'vitest';
import { exportProblem, exportSize, hexMapBox, niceScaleBar } from './bounds';
import { clampZoom, fitBox, panBy, screenToWorld, worldToScreen, zoomAt } from './camera';
import { History, StrokeRecorder } from './history';
import { hexToPixel, colRowToHex, SQRT3 } from './hex';
import { createMap, fromFile, inBounds, newHex, toFile, withTerrain } from './model';
import { validateMap } from './validate';

describe('map document', () => {
  it('round trips through the file format and still validates', () => {
    const m = createMap({ scale: 'region', cols: 10, rows: 8, seed: 5 });
    m.hexes.set('3,1', { ...newHex({ q: 3, r: 1 }, 'hills'), notes: 'x', dm: { notes: 'secret', secrets: ['a'] } });
    const back = fromFile(JSON.parse(JSON.stringify(toFile(m))));
    expect(back.hexes.get('3,1')?.dm.notes).toBe('secret');
    expect(validateMap(JSON.parse(JSON.stringify(toFile(back)))).ok).toBe(true);
  });
  it('changing terrain to and from chasm applies the chasm rules', () => {
    const h = { ...newHex({ q: 0, r: 0 }, 'hills'), elevation: 800 };
    const a = withTerrain(h, { q: 0, r: 0 }, 'chasm');
    expect(a.bottomless).toBe(true); expect(a.elevation).toBeNull();
    const back = withTerrain(a, { q: 0, r: 0 }, 'forest');
    expect('bottomless' in back).toBe(false);
  });
  it('knows its bounds', () => {
    const m = createMap({ scale: 'kingdom', cols: 4, rows: 3 });
    expect(inBounds(m, colRowToHex(3, 2))).toBe(true);
    expect(inBounds(m, colRowToHex(4, 0))).toBe(false);
    expect(inBounds(m, colRowToHex(0, -1))).toBe(false);
  });
});

describe('history', () => {
  it('undoes and redoes a stroke as one step', () => {
    const m = createMap({ scale: 'kingdom', cols: 5, rows: 5 });
    const hist = new History();
    const rec = new StrokeRecorder(m);
    rec.set(0, 0, newHex({ q: 0, r: 0 }, 'forest'));
    rec.set(1, 0, newHex({ q: 1, r: 0 }, 'forest'));
    rec.set(0, 0, newHex({ q: 0, r: 0 }, 'hills')); // painting over the same cell again
    hist.push(rec.finish());
    expect(m.hexes.size).toBe(2);
    hist.undo(m);
    expect(m.hexes.size).toBe(0);
    hist.redo(m);
    expect(m.hexes.get('0,0')?.terrain).toBe('hills');
    expect(hist.canRedo).toBe(false);
  });
  it('ignores no-op steps and clears redo on a new step', () => {
    const m = createMap({ scale: 'kingdom', cols: 5, rows: 5 });
    const hist = new History();
    const rec = new StrokeRecorder(m);
    rec.set(0, 0, newHex({ q: 0, r: 0 }, 'forest')); hist.push(rec.finish());
    hist.undo(m); expect(hist.canRedo).toBe(true);
    const r2 = new StrokeRecorder(m); r2.set(2, 0, null); hist.push(r2.finish());
    expect(hist.canUndo).toBe(false);
    expect(hist.canRedo).toBe(true); // a no-op does not clear redo
  });
});

describe('camera', () => {
  const v = { width: 800, height: 600 }; const l = { minZoom: 4, maxZoom: 256 };
  it('keeps the point under the cursor fixed while zooming', () => {
    const cam = { x: 10, y: 5, zoom: 40 };
    const at = { x: 200, y: 450 };
    const before = screenToWorld(cam, v, at);
    const next = zoomAt(cam, v, l, at, 1.7);
    expect(next.zoom).toBeCloseTo(68);
    const after = screenToWorld(next, v, at);
    expect(after.x).toBeCloseTo(before.x); expect(after.y).toBeCloseTo(before.y);
  });
  it('respects the per-map zoom limits', () => {
    expect(zoomAt({ x: 0, y: 0, zoom: 200 }, v, l, { x: 0, y: 0 }, 10).zoom).toBe(256);
    expect(zoomAt({ x: 0, y: 0, zoom: 5 }, v, l, { x: 0, y: 0 }, 0.01).zoom).toBe(4);
    expect(clampZoom(1, l)).toBe(4);
  });
  it('converts world <-> screen and pans', () => {
    const cam = { x: 3, y: 4, zoom: 50 };
    const p = { x: 7.25, y: -2 };
    const back = screenToWorld(cam, v, worldToScreen(cam, v, p));
    expect(back.x).toBeCloseTo(p.x); expect(back.y).toBeCloseTo(p.y);
    expect(panBy(cam, 100, -50)).toEqual({ x: 1, y: 5, zoom: 50 });
  });
  it('fits a box inside the view', () => {
    const box = hexMapBox(60, 40);
    const cam = fitBox(box, v, { minZoom: 1, maxZoom: 256 });
    const tl = worldToScreen(cam, v, { x: box.x0, y: box.y0 });
    const br = worldToScreen(cam, v, { x: box.x1, y: box.y1 });
    expect(tl.x).toBeGreaterThanOrEqual(0); expect(tl.y).toBeGreaterThanOrEqual(0);
    expect(br.x).toBeLessThanOrEqual(v.width); expect(br.y).toBeLessThanOrEqual(v.height);
  });
});

describe('PNG export size', () => {
  it('follows the documented formula', () => {
    const cols = 60, rows = 40, ppc = 64;
    const s = exportSize(cols, rows, ppc);
    expect(s.width).toBe(Math.ceil(ppc * ((SQRT3 / 2) * (cols - 1) + 2 / SQRT3)));
    expect(s.height).toBe(Math.ceil(ppc * (rows + 0.5)));
    expect(s).toEqual({ width: 3345, height: 2592 });
  });
  it('fits every hex center inside the image', () => {
    const cols = 7, rows = 5, ppc = 64; const s = exportSize(cols, rows, ppc);
    const R = ppc / SQRT3;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const p = hexToPixel(colRowToHex(c, r), ppc);
      const x = p.x + R, y = p.y + ppc / 2;
      expect(x - R).toBeGreaterThanOrEqual(0); expect(x + R).toBeLessThanOrEqual(s.width + 1e-6);
      expect(y - ppc / 2).toBeGreaterThanOrEqual(0); expect(y + ppc / 2).toBeLessThanOrEqual(s.height + 1e-6);
    }
  });
  it('refuses images the browser cannot draw', () => {
    expect(exportProblem(60, 40, 64)).toBeNull();
    expect(exportProblem(60, 40, 4)).toMatch(/between/);
    expect(exportProblem(300, 300, 128)).toMatch(/limit/);
  });
});

describe('scale bar', () => {
  it('picks 1, 2 or 5 times a power of ten that fits', () => {
    expect(niceScaleBar(10, 120).value).toBe(10);
    expect(niceScaleBar(10, 260).value).toBe(20);
    expect(niceScaleBar(10, 600).value).toBe(50);
    expect(niceScaleBar(0.5, 100).value).toBe(200);
    const b = niceScaleBar(3, 140); expect(b.px).toBeLessThanOrEqual(140);
  });
});
