<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    CLIMATES, FEATURES, MAX_CELLS, SCALES, SCALE_IDS, TERRAINS, History, StrokeRecorder, clampZoom, colRowToHex,
    createMap, distance, exportProblem, exportSize, fitBox, fromFile, getTheme, hexKey, hexMapBox, hexToColRow, hexToPixel,
    inBounds, line, listMaps, loadMap, deleteMap, niceScaleBar, newHex, panBy, pixelToHex, range, renderMap, renderToCanvas,
    saveMap, screenToWorld, toFile, validateMap, withTerrain, worldToScreen, zoomAt, hexCorners, SQRT3,
    type Camera, type Hex, type HexData, type MapDoc, type SavedMap, type ScaleId,
  } from '../../lib/windrose';

  type Tool = 'paint' | 'erase' | 'inspect' | 'measure' | 'pan';
  const DEFAULT_PPC = 64;
  const LAST_KEY = 'windrose:last';

  let doc: MapDoc = createMap({ scale: 'kingdom', cols: 60, rows: 40 });
  let rev = $state(0); // bumped on every change so the UI re-reads `doc`
  const history = new History();
  let canUndo = $state(false);
  let canRedo = $state(false);

  let tool = $state<Tool>('paint');
  let terrain = $state('forest');
  let brush = $state(1);
  let showGrid = $state(true);
  let showLabels = $state(true);
  let sel = $state<Hex | null>(null);
  let hover = $state<Hex | null>(null);
  let measureA = $state<Hex | null>(null);
  let measureB = $state<Hex | null>(null);
  let cam = $state<Camera>({ x: 0, y: 0, zoom: 32 });
  let size = $state({ width: 800, height: 600 });
  let status = $state('');
  let loaded = $state(false);

  let canvas: HTMLCanvasElement;
  let stage: HTMLDivElement;
  let theme = $derived(getTheme((rev, doc.theme)));
  const mapName = $derived((rev, doc.name));
  const scale = $derived(SCALES[(rev, doc.scale)]);
  const selData = $derived.by(() => (rev, sel ? doc.hexes.get(hexKey(sel.q, sel.r)) : undefined));

  // ---------- drawing ----------
  let raf = 0;
  function draw() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(size.width * dpr));
      const h = Math.max(1, Math.round(size.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#e9dfc6';
      ctx.fillRect(0, 0, size.width, size.height);
      renderMap(ctx, { doc, theme, camera: cam, view: size, grid: showGrid, labels: showLabels });
      overlay(ctx);
    });
  }

  function outline(ctx: CanvasRenderingContext2D, h: Hex, color: string, width: number) {
    const s = worldToScreen(cam, size, hexToPixel(h));
    const pts = hexCorners(s, cam.zoom);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }

  function overlay(ctx: CanvasRenderingContext2D) {
    // map edge
    const b = hexMapBox(doc.size.cols, doc.size.rows);
    const a = worldToScreen(cam, size, { x: b.x0, y: b.y0 });
    const c = worldToScreen(cam, size, { x: b.x1, y: b.y1 });
    ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(42,28,22,0.45)'; ctx.lineWidth = 1;
    ctx.strokeRect(a.x, a.y, c.x - a.x, c.y - a.y); ctx.setLineDash([]);
    if (cam.zoom >= 10) {
      // brush / hover
      if (hover && inBounds(doc, hover)) {
        const hs = tool === 'paint' || tool === 'erase' ? range(hover, brush - 1) : [hover];
        for (const h of hs) if (inBounds(doc, h)) outline(ctx, h, tool === 'erase' ? '#a33' : '#6b2a4d', 2);
      }
    }
    if (sel) outline(ctx, sel, '#e0b655', 3);
    if (measureA) {
      const end = measureB ?? (tool === 'measure' ? hover : null);
      outline(ctx, measureA, '#3a1a8a', 2.5);
      if (end && inBounds(doc, end)) {
        const pa = worldToScreen(cam, size, hexToPixel(measureA));
        const pb = worldToScreen(cam, size, hexToPixel(end));
        ctx.setLineDash([8, 5]); ctx.strokeStyle = '#3a1a8a'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.setLineDash([]);
        for (const h of line(measureA, end)) outline(ctx, h, 'rgba(58,26,138,0.55)', 1.5);
        const n = distance(measureA, end);
        const text = `${fmt(n * scale.distance)} ${scale.unit === 'miles' ? 'mi' : 'ft'} · ${n} ${scale.grid === 'hex' ? 'hex' : 'sq'}`;
        ctx.font = '700 14px "Alegreya Sans", sans-serif';
        const mx = (pa.x + pb.x) / 2; const my = (pa.y + pb.y) / 2 - 12;
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(251,246,233,0.95)'; ctx.fillRect(mx - tw / 2 - 6, my - 12, tw + 12, 24);
        ctx.strokeStyle = '#3a1a8a'; ctx.lineWidth = 1; ctx.strokeRect(mx - tw / 2 - 6, my - 12, tw + 12, 24);
        ctx.fillStyle = '#2a1c16'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, mx, my);
      }
    }
  }

  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  $effect(() => { cam; size; showGrid; showLabels; tool; brush; sel; hover; measureA; measureB; rev; theme; draw(); });

  // ---------- scale bar ----------
  const bar = $derived.by(() => {
    const pxPerUnit = cam.zoom / scale.distance;
    return niceScaleBar(pxPerUnit, 160);
  });

  // ---------- camera ----------
  const limits = $derived((rev, doc.view));
  function fit() { cam = fitBox(hexMapBox(doc.size.cols, doc.size.rows), size, { minZoom: 0.5, maxZoom: doc.view.maxZoom }); queueSave(); }
  function zoomBy(f: number) { cam = zoomAt(cam, size, doc.view, { x: size.width / 2, y: size.height / 2 }, f); queueSave(); }

  // ---------- editing ----------
  function bump() { rev++; canUndo = history.canUndo; canRedo = history.canRedo; queueSave(); }

  function cellAt(clientX: number, clientY: number): Hex {
    const r = canvas.getBoundingClientRect();
    return pixelToHex(screenToWorld(cam, size, { x: clientX - r.left, y: clientY - r.top }));
  }

  let stroke: StrokeRecorder | null = null;
  let lastCell: Hex | null = null;

  function applyBrush(center: Hex) {
    if (!stroke) return;
    for (const h of range(center, brush - 1)) {
      if (!inBounds(doc, h)) continue;
      if (tool === 'erase') stroke.set(h.q, h.r, null);
      else stroke.set(h.q, h.r, withTerrain(doc.hexes.get(hexKey(h.q, h.r)), h, terrain));
    }
  }
  function paintTo(h: Hex) {
    if (lastCell) for (const s of line(lastCell, h)) applyBrush(s); else applyBrush(h);
    lastCell = h;
    rev++;
  }
  function endStroke() {
    if (!stroke) return;
    history.push(stroke.finish());
    stroke = null; lastCell = null;
    bump();
  }

  function undo() { if (history.undo(doc)) bump(); }
  function redo() { if (history.redo(doc)) bump(); }

  /** Apply one inspector edit to the selected hex as a single undo step. */
  function edit(fn: (h: HexData) => HexData | null) {
    if (!sel) return;
    const key = hexKey(sel.q, sel.r);
    const cur = doc.hexes.get(key);
    const base = cur ? structuredClone(cur) : newHex(sel, terrain);
    const next = fn(base);
    const rec = new StrokeRecorder(doc);
    rec.set(sel.q, sel.r, next);
    history.push(rec.finish());
    bump();
  }
  const setTerrainOnSel = (t: string) => edit((h) => withTerrain(h, sel!, t));

  // ---------- pointer input ----------
  const pointers = new Map<number, { x: number; y: number }>();
  let panning = false;
  let pinch: { dist: number; cx: number; cy: number } | null = null;
  let spaceDown = false;

  function pinchState() {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }
  function onDown(e: PointerEvent) {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { endStroke(); panning = false; pinch = pinchState(); return; }
    if (e.button === 1 || e.button === 2 || spaceDown || tool === 'pan') { panning = true; return; }
    if (e.button !== 0) return;
    const h = cellAt(e.clientX, e.clientY);
    if (tool === 'paint' || tool === 'erase') { stroke = new StrokeRecorder(doc); paintTo(h); }
    else if (tool === 'inspect') sel = inBounds(doc, h) ? h : null;
    else if (tool === 'measure') {
      if (!inBounds(doc, h)) return;
      if (!measureA || measureB) { measureA = h; measureB = null; } else measureB = h;
    }
  }
  function onMove(e: PointerEvent) {
    const prev = pointers.get(e.pointerId);
    if (prev) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = canvas.getBoundingClientRect();
    if (pinch && pointers.size >= 2) {
      const now = pinchState();
      const at = { x: now.cx - r.left, y: now.cy - r.top };
      cam = panBy(cam, now.cx - pinch.cx, now.cy - pinch.cy);
      cam = zoomAt(cam, size, doc.view, at, now.dist / pinch.dist);
      pinch = now; queueSave();
      return;
    }
    if (panning && prev) { cam = panBy(cam, e.clientX - prev.x, e.clientY - prev.y); queueSave(); return; }
    const h = cellAt(e.clientX, e.clientY);
    if (!hover || h.q !== hover.q || h.r !== hover.r) hover = h;
    if (stroke && (e.buttons & 1)) paintTo(h);
  }
  function onUp(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) { panning = false; endStroke(); }
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    const factor = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015));
    cam = zoomAt(cam, size, doc.view, { x: e.clientX - r.left, y: e.clientY - r.top }, factor);
    queueSave();
  }
  function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (document.querySelector('dialog[open]')) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod) return;
    if (e.code === 'Space') { spaceDown = e.type === 'keydown'; e.preventDefault(); return; }
    if (e.type !== 'keydown') return;
    const k = e.key.toLowerCase();
    if (k === 'b') tool = 'paint'; else if (k === 'e') tool = 'erase'; else if (k === 'i') tool = 'inspect';
    else if (k === 'm') tool = 'measure'; else if (k === 'h') tool = 'pan';
    else if (k === '+' || k === '=') zoomBy(1.25); else if (k === '-' || k === '_') zoomBy(0.8);
    else if (k === '0') fit();
    else if (k === 'escape') { measureA = measureB = null; sel = null; }
  }

  // ---------- save / load ----------
  let saveTimer = 0;
  function queueSave() {
    if (!loaded) return;
    clearTimeout(saveTimer);
    status = 'Unsaved changes…';
    saveTimer = window.setTimeout(saveNow, 600);
  }
  async function saveNow() {
    clearTimeout(saveTimer);
    try {
      const saved: SavedMap = { id: doc.id, name: doc.name, scale: doc.scale, updatedAt: Date.now(), map: toFile(doc), camera: $state.snapshot(cam) };
      await saveMap(saved);
      try { localStorage.setItem(LAST_KEY, doc.id); } catch { /* storage may be blocked */ }
      status = `Saved in this browser · ${new Date().toLocaleTimeString()}`;
    } catch (err) {
      status = `Could not save in the browser (${(err as Error).message}). Use Export JSON to keep your map.`;
    }
  }

  function useDoc(d: MapDoc, camera: Camera | null) {
    doc = d; history.clear(); canUndo = canRedo = false;
    sel = hover = measureA = measureB = null;
    rev++;
    if (camera) cam = { ...camera, zoom: clampZoom(camera.zoom, d.view) }; else fit();
    draw();
  }

  // ---------- dialogs ----------
  let newDlg: HTMLDialogElement, openDlg: HTMLDialogElement, pngDlg: HTMLDialogElement, setDlg: HTMLDialogElement;
  let fileInput: HTMLInputElement;
  let message = $state<{ kind: 'error' | 'info'; lines: string[] } | null>(null);

  let nf = $state({ name: 'Untitled map', scale: 'kingdom' as ScaleId, cols: 60, rows: 40 });
  const hexScales = SCALE_IDS.filter((s) => SCALES[s].grid === 'hex');
  const nfProblem = $derived(
    !(Number.isInteger(nf.cols) && Number.isInteger(nf.rows) && nf.cols >= 1 && nf.rows >= 1) ? 'Columns and rows must be whole numbers, 1 or more.'
    : nf.cols * nf.rows > MAX_CELLS ? `At most ${MAX_CELLS.toLocaleString()} cells.` : '');
  function createNew() {
    if (nfProblem) return;
    useDoc(createMap({ name: nf.name.trim() || 'Untitled map', scale: nf.scale, cols: nf.cols, rows: nf.rows }), null);
    newDlg.close(); saveNow();
  }

  let saved = $state<SavedMap[]>([]);
  async function showOpen() { try { saved = await listMaps(); } catch { saved = []; } openDlg.showModal(); }
  async function openSaved(id: string) {
    const s = await loadMap(id);
    if (!s) return;
    const v = validateMap(s.map);
    if (!v.ok) { message = { kind: 'error', lines: ['That saved map is not valid:', ...v.errors.slice(0, 6)] }; return; }
    await saveNow();
    useDoc(fromFile(v.value!), s.camera);
    openDlg.close();
  }
  async function removeSaved(s: SavedMap) {
    if (!confirm(`Delete "${s.name}" from this browser? Export it first if you want to keep a copy.`)) return;
    await deleteMap(s.id);
    saved = await listMaps();
  }

  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'map';
  function download(blob: Blob, name: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportJson() {
    download(new Blob([JSON.stringify(toFile(doc), null, 2)], { type: 'application/json' }), `${slug(doc.name)}.map.json`);
  }
  async function importJson(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    let data: unknown;
    try { data = JSON.parse(await file.text()); } catch (err) { message = { kind: 'error', lines: [`${file.name} is not valid JSON.`, (err as Error).message] }; return; }
    const v = validateMap(data);
    if (!v.ok) { message = { kind: 'error', lines: [`${file.name} is not a valid Windrose map:`, ...v.errors.slice(0, 8), ...(v.errors.length > 8 ? [`…and ${v.errors.length - 8} more.`] : [])] }; return; }
    const d = fromFile(v.value!);
    if (d.id === doc.id || (await loadMap(d.id).catch(() => undefined))) {
      d.id = `${d.id}-${Math.random().toString(36).slice(2, 6)}`;
      v.warnings.push('A saved map with this id already existed, so the import was given a new id.');
    }
    await saveNow();
    useDoc(d, null);
    saveNow();
    message = { kind: 'info', lines: [`Imported ${d.name} (${d.size.cols} × ${d.size.rows}, ${d.hexes.size} painted hexes).`, ...v.warnings] };
  }

  // PNG export
  let ppc = $state(DEFAULT_PPC);
  let pngGrid = $state(true);
  let pngLabels = $state(true);
  const pngSize = $derived((rev, exportSize(doc.size.cols, doc.size.rows, Number(ppc) || 0)));
  const pngProblem = $derived((rev, exportProblem(doc.size.cols, doc.size.rows, Number(ppc))));
  async function exportPng() {
    if (pngProblem) return;
    try { await Promise.all(['600 20px "Cormorant SC"', '18px "Crimson Pro"'].map((f) => document.fonts.load(f))); } catch { /* fall back to system fonts */ }
    const c = document.createElement('canvas');
    renderToCanvas(c, doc, theme, Number(ppc), pngGrid, pngLabels);
    c.toBlob((blob) => {
      if (!blob) { message = { kind: 'error', lines: ['The browser could not create the image. Try fewer pixels per cell.'] }; return; }
      download(blob, `${slug(doc.name)}-${ppc}ppc.png`);
      pngDlg.close();
    }, 'image/png');
  }

  let sf = $state({ name: '', minZoom: 4, maxZoom: 256 });
  function showSettings() { sf = { name: doc.name, minZoom: doc.view.minZoom, maxZoom: doc.view.maxZoom }; setDlg.showModal(); }
  const sfProblem = $derived(!(sf.minZoom > 0 && sf.maxZoom > sf.minZoom) ? 'Minimum zoom must be above 0 and below the maximum.' : '');
  function applySettings() {
    if (sfProblem) return;
    doc.name = sf.name.trim() || doc.name;
    doc.view = { minZoom: Number(sf.minZoom), maxZoom: Number(sf.maxZoom) };
    cam = { ...cam, zoom: clampZoom(cam.zoom, doc.view) };
    rev++; queueSave(); setDlg.close();
  }

  // ---------- inspector helpers ----------
  const elevationText = $derived.by(() => (selData && selData.terrain === 'chasm' && selData.bottomless !== false ? 'Bottomless' : ''));
  const hoverText = $derived.by(() => {
    rev;
    if (!hover || !inBounds(doc, hover)) return '';
    const { col, row } = hexToColRow(hover);
    const d = doc.hexes.get(hexKey(hover.q, hover.r));
    return `Col ${col + 1}, row ${row + 1} · ${d ? d.terrain : 'empty'}`;
  });
  const swatch = (id: string) => (theme.terrain[id]?.fill ?? theme.paper);
  const counts = $derived.by(() => { rev; const n = doc.hexes.size; return `${doc.size.cols} × ${doc.size.rows} hexes · ${n} painted`; });

  onMount(() => {
    const ro = new ResizeObserver(([e]) => {
      size = { width: Math.max(100, Math.floor(e.contentRect.width)), height: Math.max(100, Math.floor(e.contentRect.height)) };
    });
    ro.observe(stage);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    (async () => {
      await tick();
      try {
        let id: string | null = null;
        try { id = localStorage.getItem(LAST_KEY); } catch { /* ignore */ }
        let s = id ? await loadMap(id) : undefined;
        if (!s) s = (await listMaps())[0];
        const sv = s ? validateMap(s.map) : undefined;
        if (s && sv?.ok) useDoc(fromFile(sv.value!), s.camera);
        else useDoc(createMap({ name: 'Untitled map', scale: 'kingdom', cols: 60, rows: 40 }), null);
      } catch {
        status = 'Browser storage is not available. Use Export JSON to keep your map.';
        useDoc(createMap({ name: 'Untitled map', scale: 'kingdom', cols: 60, rows: 40 }), null);
      }
      loaded = true;
    })();
    return () => {
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      cancelAnimationFrame(raf);
    };
  });
</script>

<div class="wr">
  <header class="bar">
    <div class="title">
      <strong class="name">{mapName}</strong>
      <span class="meta">{scale.label} · {scale.distance} {scale.unitLabel} · {counts}</span>
    </div>
    <div class="group">
      <button onclick={() => { nf = { ...nf }; newDlg.showModal(); }}>New</button>
      <button onclick={showOpen}>Open</button>
      <button onclick={() => fileInput.click()}>Import JSON</button>
      <button onclick={exportJson}>Export JSON</button>
      <button class="primary" onclick={() => pngDlg.showModal()}>Export PNG</button>
      <button onclick={showSettings} aria-label="Map settings">Settings</button>
    </div>
    <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={importJson} />
  </header>

  <aside class="tools" aria-label="Tools">
    <div class="sect">
      <div class="label">Tool</div>
      <div class="toolrow">
        {#each [['paint', 'Paint', 'B'], ['erase', 'Erase', 'E'], ['inspect', 'Inspect', 'I'], ['measure', 'Measure', 'M'], ['pan', 'Pan', 'H']] as [id, label, key]}
          <button class:on={tool === id} aria-pressed={tool === id} onclick={() => (tool = id as Tool)} title="{label} ({key})">{label}</button>
        {/each}
      </div>
      <div class="row">
        <button onclick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
        <button onclick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">Redo</button>
      </div>
    </div>
    <div class="sect">
      <div class="label">Brush size</div>
      <div class="row">
        {#each [1, 2, 3, 4] as n}
          <button class:on={brush === n} aria-pressed={brush === n} onclick={() => (brush = n)}>{n}</button>
        {/each}
      </div>
    </div>
    <div class="sect">
      <div class="label">Terrain</div>
      <div class="palette">
        {#each TERRAINS as t}
          <button class="terr" class:on={terrain === t.id && (tool === 'paint')} onclick={() => { terrain = t.id; if (tool !== 'paint') tool = 'paint'; }} title={t.id === 'chasm' ? 'Chasm: a bottomless drop, not water' : t.label}>
            <span class="sw" style:background={t.id === 'chasm' ? 'radial-gradient(#07030a, #3a1530)' : swatch(t.id)}></span>{t.label}
          </button>
        {/each}
      </div>
    </div>
    <div class="sect">
      <label class="check"><input type="checkbox" bind:checked={showGrid} /> Grid lines</label>
      <label class="check"><input type="checkbox" bind:checked={showLabels} /> Names</label>
    </div>
    <p class="hint">Wheel zooms at the cursor. Drag with the middle button, or hold Space, or use Pan to move. Pinch on touch screens.</p>
  </aside>

  <div class="stage" bind:this={stage}>
    <canvas
      bind:this={canvas}
      style:width="{size.width}px" style:height="{size.height}px"
      class:grab={tool === 'pan'}
      onpointerdown={onDown} onpointermove={onMove} onpointerup={onUp} onpointercancel={onUp}
      onpointerleave={() => (hover = null)} oncontextmenu={(e) => e.preventDefault()}
      aria-label="Map canvas"
    ></canvas>
    <div class="zoom">
      <button onclick={() => zoomBy(1.25)} aria-label="Zoom in">+</button>
      <button onclick={() => zoomBy(0.8)} aria-label="Zoom out">−</button>
      <button onclick={fit} aria-label="Fit map" title="Fit map (0)">Fit</button>
    </div>
    <div class="scalebar" aria-label="Scale bar">
      <div class="barline" style:width="{bar.px}px"></div>
      <span>{fmt(bar.value)} {scale.unit === 'miles' ? 'mi' : 'ft'}</span>
    </div>
    <div class="status">{hoverText}{#if measureA && (measureB || hover) && tool === 'measure'}{@const e = measureB ?? hover}{#if e && inBounds(doc, e)} · measuring {fmt(distance(measureA, e) * scale.distance)} {scale.unit}{/if}{/if}</div>
  </div>

  <aside class="inspector" aria-label="Hex inspector">
    <div class="label">Inspector</div>
    {#if !sel}
      <p class="hint">Choose the Inspect tool and click a hex to see and edit it.</p>
    {:else}
      {@const { col, row } = hexToColRow(sel)}
      <p class="coords">Col {col + 1}, row {row + 1} <span class="meta">(q {sel.q}, r {sel.r})</span></p>
      {#key `${sel.q},${sel.r},${rev}`}
        <label class="field"><span>Terrain</span>
          <select onchange={(e) => setTerrainOnSel(e.currentTarget.value)} value={selData?.terrain ?? ''}>
            {#if !selData}<option value="" disabled>Empty</option>{/if}
            {#each TERRAINS as t}<option value={t.id}>{t.label}</option>{/each}
            {#if selData && !TERRAINS.some((t) => t.id === selData.terrain)}<option value={selData.terrain}>{selData.terrain}</option>{/if}
          </select>
        </label>
        {#if selData}
          {#if selData.terrain === 'chasm'}
            <label class="check"><input type="checkbox" checked={selData.bottomless !== false}
              onchange={(e) => edit((h) => ({ ...h, bottomless: e.currentTarget.checked, elevation: e.currentTarget.checked ? null : (h.elevation ?? -1000) }))} /> Bottomless</label>
            <p class="hint">A chasm is a huge hole, not water. It is the lowest point on the map.</p>
          {/if}
          <label class="field"><span>Elevation (ft)</span>
            {#if elevationText}<input type="text" value={elevationText} disabled />
            {:else}<input type="number" step="10" value={selData.elevation ?? ''} placeholder="not set"
              onchange={(e) => edit((h) => ({ ...h, elevation: e.currentTarget.value === '' ? null : Number(e.currentTarget.value) }))} />{/if}
          </label>
          <label class="field"><span>Climate</span>
            <select value={selData.climate ?? ''} onchange={(e) => edit((h) => ({ ...h, climate: e.currentTarget.value || null }))}>
              <option value="">Not set</option>
              {#each CLIMATES as c}<option value={c}>{c}</option>{/each}
            </select>
          </label>
          <fieldset class="field"><legend>Features</legend>
            <div class="feat">
              {#each FEATURES as f}
                <label class="check"><input type="checkbox" checked={selData.features.includes(f)}
                  onchange={(e) => edit((h) => ({ ...h, features: e.currentTarget.checked ? [...h.features, f] : h.features.filter((x) => x !== f) }))} /> {f}</label>
              {/each}
            </div>
          </fieldset>
          <label class="field"><span>Name</span>
            <input type="text" value={selData.name ?? ''} onchange={(e) => edit((h) => ({ ...h, name: e.currentTarget.value.trim() || null }))} /></label>
          <label class="field"><span>Notes</span>
            <textarea rows="3" value={selData.notes} onchange={(e) => edit((h) => ({ ...h, notes: e.currentTarget.value }))}></textarea></label>
          <label class="field dm"><span>DM notes <em>(never in player-safe exports)</em></span>
            <textarea rows="3" value={selData.dm.notes} onchange={(e) => edit((h) => ({ ...h, dm: { ...h.dm, notes: e.currentTarget.value } }))}></textarea></label>
          <label class="field dm"><span>DM secrets <em>(one per line)</em></span>
            <textarea rows="3" value={selData.dm.secrets.join('\n')}
              onchange={(e) => edit((h) => ({ ...h, dm: { ...h.dm, secrets: e.currentTarget.value.split('\n').map((s) => s.trim()).filter(Boolean) } }))}></textarea></label>
          <button onclick={() => edit(() => null)}>Clear this hex</button>
        {:else}
          <p class="hint">This hex is empty. Pick a terrain above to create it.</p>
        {/if}
      {/key}
    {/if}
    {#if measureA}
      <div class="sect">
        <div class="label">Distance</div>
        {#if measureB}
          {@const n = distance(measureA, measureB)}
          {@const straight = Math.hypot(hexToPixel(measureA).x - hexToPixel(measureB).x, hexToPixel(measureA).y - hexToPixel(measureB).y)}
          <p>{n} hexes · <strong>{fmt(n * scale.distance)} {scale.unit}</strong> along the hexes</p>
          <p class="meta">Straight line: {fmt(Math.round(straight * scale.distance * 10) / 10)} {scale.unit}</p>
        {:else}<p class="hint">Click a second hex.</p>{/if}
        <button onclick={() => { measureA = measureB = null; }}>Clear</button>
      </div>
    {/if}
    <p class="status">{status}</p>
  </aside>
</div>

<dialog bind:this={newDlg}>
  <form method="dialog" onsubmit={(e) => { e.preventDefault(); createNew(); }}>
    <h2 class="sub-heading">New map</h2>
    <label class="field"><span>Name</span><input type="text" bind:value={nf.name} /></label>
    <label class="field"><span>Scale</span>
      <select bind:value={nf.scale}>
        {#each hexScales as s}<option value={s}>{SCALES[s].label} · {SCALES[s].distance} {SCALES[s].unitLabel}</option>{/each}
      </select>
    </label>
    <div class="two">
      <label class="field"><span>Columns</span><input type="number" min="1" bind:value={nf.cols} /></label>
      <label class="field"><span>Rows</span><input type="number" min="1" bind:value={nf.rows} /></label>
    </div>
    <p class="meta">Hex lore map, flat-top hexes. The combat map editor is not built yet.</p>
    {#if nfProblem}<p class="err">{nfProblem}</p>{/if}
    <div class="actions"><button type="button" onclick={() => newDlg.close()}>Cancel</button><button class="primary" disabled={!!nfProblem}>Create</button></div>
  </form>
</dialog>

<dialog bind:this={openDlg}>
  <h2 class="sub-heading">Maps in this browser</h2>
  {#if saved.length === 0}<p class="hint">Nothing saved yet.</p>{/if}
  <ul class="maps">
    {#each saved as s}
      <li>
        <div><strong>{s.name}</strong><div class="meta">{s.scale} · {s.map.size.cols} × {s.map.size.rows} · {new Date(s.updatedAt).toLocaleString()}</div></div>
        <div class="row"><button onclick={() => openSaved(s.id)} disabled={s.id === doc.id}>{s.id === doc.id ? 'Open now' : 'Open'}</button><button onclick={() => removeSaved(s)}>Delete</button></div>
      </li>
    {/each}
  </ul>
  <div class="actions"><button onclick={() => openDlg.close()}>Close</button></div>
</dialog>

<dialog bind:this={pngDlg}>
  <h2 class="sub-heading">Export PNG</h2>
  <label class="field"><span>Pixels per cell</span><input type="number" min="8" max="512" step="1" bind:value={ppc} /></label>
  <p class="meta">One cell is the distance from a hex center to its neighbor's center, so one cell = {scale.distance} {scale.unit}. Set this as the grid size in your tabletop software.</p>
  <p><strong>{pngSize.width} × {pngSize.height} px</strong> for {doc.size.cols} × {doc.size.rows} hexes</p>
  <p class="meta">width = ceil(ppc × (√3⁄2 × (cols − 1) + 2⁄√3)), height = ceil(ppc × (rows + ½)). No margin.</p>
  <label class="check"><input type="checkbox" bind:checked={pngGrid} /> Grid lines</label>
  <label class="check"><input type="checkbox" bind:checked={pngLabels} /> Names</label>
  {#if pngProblem}<p class="err">{pngProblem}</p>{/if}
  <div class="actions"><button onclick={() => pngDlg.close()}>Cancel</button><button class="primary" disabled={!!pngProblem} onclick={exportPng}>Download PNG</button></div>
</dialog>

<dialog bind:this={setDlg}>
  <form method="dialog" onsubmit={(e) => { e.preventDefault(); applySettings(); }}>
    <h2 class="sub-heading">Map settings</h2>
    <label class="field"><span>Name</span><input type="text" bind:value={sf.name} /></label>
    <div class="two">
      <label class="field"><span>Min zoom (px per cell)</span><input type="number" step="any" bind:value={sf.minZoom} /></label>
      <label class="field"><span>Max zoom (px per cell)</span><input type="number" step="any" bind:value={sf.maxZoom} /></label>
    </div>
    <p class="meta">Zoom limits are saved with the map.</p>
    {#if sfProblem}<p class="err">{sfProblem}</p>{/if}
    <div class="actions"><button type="button" onclick={() => setDlg.close()}>Cancel</button><button class="primary" disabled={!!sfProblem}>Apply</button></div>
  </form>
</dialog>

<dialog open={!!message} onclose={() => (message = null)} class="msg" class:bad={message?.kind === 'error'}>
  {#if message}
    <h2 class="sub-heading">{message.kind === 'error' ? 'Could not do that' : 'Done'}</h2>
    {#each message.lines as l}<p>{l}</p>{/each}
    <div class="actions"><button class="primary" onclick={() => (message = null)}>OK</button></div>
  {/if}
</dialog>

<style>
  .wr {
    display: grid; grid-template-columns: 230px minmax(0, 1fr) 290px; grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas: 'bar bar bar' 'tools stage insp';
    height: calc(100dvh - 120px); min-height: 560px; gap: 0; background: var(--surface);
    color: var(--ink); font-family: var(--font-ui); border-top: 1px solid var(--gold-soft);
  }
  .bar { grid-area: bar; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-1) var(--space-2);
    padding: var(--space-1) var(--space-2); background: var(--surface-raised); border-bottom: 1px solid var(--gold-soft); }
  .title { display: flex; flex-direction: column; min-width: 0; }
  .name { font-family: var(--font-display); font-size: 22px; line-height: 26px; letter-spacing: .02em; }
  .meta { font-size: 13px; color: var(--ink-muted); }
  .group, .row, .toolrow { display: flex; flex-wrap: wrap; gap: 6px; }
  .tools, .inspector { padding: var(--space-2); overflow-y: auto; background: var(--surface-raised); }
  .tools { grid-area: tools; border-right: 1px solid var(--gold-soft); }
  .inspector { grid-area: insp; border-left: 1px solid var(--gold-soft); }
  .stage { grid-area: stage; position: relative; overflow: hidden; background: #e9dfc6; touch-action: none; }
  canvas { display: block; touch-action: none; cursor: crosshair; }
  canvas.grab { cursor: grab; }
  .sect { margin-bottom: var(--space-2); display: grid; gap: 6px; }
  .label { font-family: var(--font-uisc); font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-muted); }
  button { font-family: var(--font-uisc); font-size: 14px; font-weight: 700; letter-spacing: .04em; padding: 6px 10px; cursor: pointer;
    color: var(--ink); background: var(--surface); border: 1px solid var(--ink-muted); border-radius: var(--radius-md); }
  button:hover:not(:disabled) { border-color: var(--accent); }
  button:disabled { opacity: .45; cursor: default; }
  button.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  button.primary { background: var(--action); color: var(--on-action); border-color: var(--action); }
  button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid var(--focus); outline-offset: 1px; }
  .palette { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .terr { display: flex; align-items: center; gap: 6px; text-align: left; padding: 4px 6px; font-size: 13px; }
  .terr.on { outline: 2px solid var(--accent); outline-offset: 0; }
  .sw { width: 16px; height: 16px; border: 1px solid var(--ink); border-radius: 2px; flex: none; }
  .check { display: flex; align-items: center; gap: 6px; font-size: 14px; }
  .hint { font-size: 13px; color: var(--ink-muted); margin: 0 0 var(--space-1); line-height: 1.35; }
  .coords { font-family: var(--font-display); font-size: 20px; margin: 4px 0 var(--space-1); }
  .field { display: grid; gap: 3px; margin-bottom: var(--space-1); border: 0; padding: 0; min-width: 0; }
  .field > span, .field > legend { font-size: 13px; font-weight: 700; color: var(--ink-muted); padding: 0; }
  .field em { font-weight: 400; font-style: italic; }
  .dm { padding: 6px; background: var(--rose-wash); border-radius: var(--radius-md); }
  input[type='text'], input[type='number'], select, textarea { font: inherit; font-size: 14px; padding: 5px 6px; color: var(--ink); background: var(--surface);
    border: 1px solid var(--ink-muted); border-radius: var(--radius-md); width: 100%; box-sizing: border-box; }
  .feat { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; }
  .zoom { position: absolute; right: 12px; top: 12px; display: grid; gap: 4px; }
  .zoom button { background: var(--surface-raised); }
  .scalebar { position: absolute; left: 12px; bottom: 12px; font-size: 13px; background: rgba(251,246,233,.9); padding: 4px 8px; border-radius: var(--radius-md); color: #2a1c16; }
  .barline { height: 6px; border: 2px solid #2a1c16; border-top: 0; box-sizing: border-box; margin-bottom: 2px; }
  .stage .status { position: absolute; right: 12px; bottom: 12px; font-size: 13px; background: rgba(251,246,233,.9); padding: 4px 8px; border-radius: var(--radius-md); color: #2a1c16; }
  .stage .status:empty { display: none; }
  .inspector .status { font-size: 12px; color: var(--ink-muted); margin-top: var(--space-2); }
  dialog { background: var(--surface-raised); color: var(--ink); border: 2px solid var(--accent); border-radius: var(--radius-lg); padding: var(--space-3); width: min(480px, 92vw); font-family: var(--font-ui); }
  dialog::backdrop { background: rgba(14, 22, 18, .55); }
  dialog.msg.bad { border-color: #a33; }
  .actions { display: flex; justify-content: flex-end; gap: var(--space-1); margin-top: var(--space-2); }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-1); }
  .err { color: #a33; font-weight: 700; font-size: 14px; }
  .maps { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; max-height: 50vh; overflow: auto; }
  .maps li { display: flex; justify-content: space-between; align-items: center; gap: var(--space-1); padding: 8px; border: 1px solid var(--gold-soft); border-radius: var(--radius-md); }
  @media (max-width: 900px) {
    .wr { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto 70vh auto; grid-template-areas: 'bar' 'tools' 'stage' 'insp'; height: auto; }
    .tools, .inspector { border: 0; border-bottom: 1px solid var(--gold-soft); }
  }
</style>
