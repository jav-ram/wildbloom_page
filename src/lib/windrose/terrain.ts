/** Built-in terrain and the lists the editor offers. Looks (fills, symbols) live in the theme. */
export interface TerrainDef {
  id: string;
  label: string;
  /** Water terrain. The chasm is never water. */
  water: boolean;
}

export const TERRAINS: TerrainDef[] = [
  { id: 'sea', label: 'Sea', water: true },
  { id: 'lake', label: 'Lake', water: true },
  { id: 'coast', label: 'Coast', water: false },
  { id: 'plains', label: 'Plains', water: false },
  { id: 'valley', label: 'Valley', water: false },
  { id: 'forest', label: 'Forest', water: false },
  { id: 'hills', label: 'Hills', water: false },
  { id: 'mountain', label: 'Mountain', water: false },
  { id: 'swamp', label: 'Swamp', water: false },
  { id: 'desert', label: 'Desert', water: false },
  { id: 'chasm', label: 'Chasm', water: false },
];

export const TERRAIN_BY_ID: Record<string, TerrainDef> = Object.fromEntries(TERRAINS.map((t) => [t.id, t]));
export const isWater = (terrain: string) => TERRAIN_BY_ID[terrain]?.water === true;

/** Features the renderer knows how to draw. Any other string is stored and shown in the inspector only. */
export const FEATURES = ['village', 'town', 'city', 'tower', 'cave', 'camp', 'temple', 'standing-stone', 'ruins'] as const;
export const CLIMATES = ['arctic', 'cold', 'temperate', 'warm', 'arid', 'tropical'] as const;
