import type { Camera } from './camera';
import type { MapFile } from './types';

/** A saved map in the browser (IndexedDB). The camera is kept here, not in the map file. */
export interface SavedMap { id: string; name: string; scale: string; updatedAt: number; map: MapFile; camera: Camera | null }

const DB = 'windrose';
const STORE = 'maps';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(req.result); };
    t.onerror = t.onabort = () => { db.close(); reject(t.error); };
  });
}

export const saveMap = (m: SavedMap) => tx('readwrite', (s) => s.put(m));
export const loadMap = (id: string) => tx<SavedMap | undefined>('readonly', (s) => s.get(id));
export const deleteMap = (id: string) => tx('readwrite', (s) => s.delete(id));
export async function listMaps(): Promise<SavedMap[]> {
  const all = await tx<SavedMap[]>('readonly', (s) => s.getAll());
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}
