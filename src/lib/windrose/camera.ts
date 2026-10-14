/** Camera: `x`, `y` is the map point (in cell units) at the center of the view; `zoom` is pixels per cell. */
export interface Camera { x: number; y: number; zoom: number }
export interface Size { width: number; height: number }
export interface Limits { minZoom: number; maxZoom: number }
export interface Pt { x: number; y: number }

export const clampZoom = (z: number, l: Limits) => Math.min(l.maxZoom, Math.max(l.minZoom, z));

export const worldToScreen = (cam: Camera, v: Size, p: Pt): Pt => ({
  x: (p.x - cam.x) * cam.zoom + v.width / 2,
  y: (p.y - cam.y) * cam.zoom + v.height / 2,
});
export const screenToWorld = (cam: Camera, v: Size, p: Pt): Pt => ({
  x: (p.x - v.width / 2) / cam.zoom + cam.x,
  y: (p.y - v.height / 2) / cam.zoom + cam.y,
});

/** Zoom by `factor`, keeping the map point under the screen point `at` where it is. */
export function zoomAt(cam: Camera, v: Size, l: Limits, at: Pt, factor: number): Camera {
  const zoom = clampZoom(cam.zoom * factor, l);
  const before = screenToWorld(cam, v, at);
  const next = { ...cam, zoom };
  const after = screenToWorld(next, v, at);
  return { x: cam.x + (before.x - after.x), y: cam.y + (before.y - after.y), zoom };
}

export function panBy(cam: Camera, dxPx: number, dyPx: number): Camera {
  return { ...cam, x: cam.x - dxPx / cam.zoom, y: cam.y - dyPx / cam.zoom };
}

/** Camera that shows the whole rectangle `box` with `padPx` of space around it. */
export function fitBox(box: { x0: number; y0: number; x1: number; y1: number }, v: Size, l: Limits, padPx = 24): Camera {
  const w = Math.max(1e-9, box.x1 - box.x0);
  const h = Math.max(1e-9, box.y1 - box.y0);
  const zoom = clampZoom(Math.min((v.width - 2 * padPx) / w, (v.height - 2 * padPx) / h), l);
  return { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2, zoom };
}

/** The map-space rectangle currently on screen. */
export function visibleBox(cam: Camera, v: Size) {
  const a = screenToWorld(cam, v, { x: 0, y: 0 });
  const b = screenToWorld(cam, v, { x: v.width, y: v.height });
  return { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
}
