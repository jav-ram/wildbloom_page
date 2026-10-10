/** Shapes of the structured class data (see src/data/warcaller.json). */
export interface Para { t: string; l?: string }
export interface Feat { h: string; p: Para[] }
export interface ClassData {
  tagline: string;
  flavor: string[];
  creating: string[];
  quick: string;
  traits: [string, string][];
  becoming: { label: string; items: string[] }[];
  featuresIntro: string;
  tableHead: string[];
  table: string[][];
  feats: Feat[];
  criesIntro: string;
  cryTable: string[][];
  cries: { n: string; v?: string; t: string }[];
  subs: { id: string; name: string; tagline: string; intro: string; feats: Feat[] }[];
  lore: { h: string; note: string; p: Para[] };
  legal: string[];
  playtest: { text: string; version: string };
  changelog: { v: string; items: string[] }[];
}

/** "Level 3: Field Drills" -> { level: "Level 3", name: "Field Drills" } */
export function splitHeading(h: string) {
  const i = h.indexOf(':');
  return i < 0 ? { level: '', name: h } : { level: h.slice(0, i).trim(), name: h.slice(i + 1).trim() };
}
