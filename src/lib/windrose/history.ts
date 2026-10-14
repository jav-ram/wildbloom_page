import { hexKey } from './hex';
import type { MapDoc } from './model';
import type { HexData } from './types';

/** One cell changed: `before` / `after` are null when the cell was / is empty. */
export interface CellChange { q: number; r: number; before: HexData | null; after: HexData | null }

/** An undo step: everything one stroke or edit changed. */
export type Step = CellChange[];

const clone = (h: HexData | null): HexData | null => (h ? structuredClone(h) : null);

export class History {
  private undoStack: Step[] = [];
  private redoStack: Step[] = [];
  constructor(private limit = 200) {}

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  /** Record a finished step. Clears redo. Empty and no-op steps are dropped. */
  push(step: Step): void {
    const real = step.filter((c) => JSON.stringify(c.before) !== JSON.stringify(c.after));
    if (!real.length) return;
    this.undoStack.push(real);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(doc: MapDoc): Step | null {
    const step = this.undoStack.pop();
    if (!step) return null;
    for (let i = step.length - 1; i >= 0; i--) apply(doc, step[i].q, step[i].r, step[i].before);
    this.redoStack.push(step);
    return step;
  }

  redo(doc: MapDoc): Step | null {
    const step = this.redoStack.pop();
    if (!step) return null;
    for (const c of step) apply(doc, c.q, c.r, c.after);
    this.undoStack.push(step);
    return step;
  }

  clear() { this.undoStack = []; this.redoStack = []; }
}

function apply(doc: MapDoc, q: number, r: number, h: HexData | null) {
  const k = hexKey(q, r);
  if (h) doc.hexes.set(k, clone(h)!);
  else doc.hexes.delete(k);
}

/**
 * Collects the changes of one stroke. Keeps the first `before` for each cell and the latest `after`,
 * so painting over the same cell twice is still one change.
 */
export class StrokeRecorder {
  private cells = new Map<string, CellChange>();
  constructor(private doc: MapDoc) {}

  /** Set (or with null, remove) a cell and remember the change. Returns true if something changed. */
  set(q: number, r: number, after: HexData | null): boolean {
    const k = hexKey(q, r);
    const current = this.doc.hexes.get(k) ?? null;
    if (JSON.stringify(current) === JSON.stringify(after)) return false;
    const prev = this.cells.get(k);
    this.cells.set(k, { q, r, before: prev ? prev.before : clone(current), after: clone(after) });
    if (after) this.doc.hexes.set(k, after);
    else this.doc.hexes.delete(k);
    return true;
  }

  finish(): Step { const s = [...this.cells.values()]; this.cells.clear(); return s; }
}
