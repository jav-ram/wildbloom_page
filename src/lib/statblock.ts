export interface Feature { name: string; text: string }

/** A monster statblock in the 2024 layout. Everything except the core lines is optional. */
export interface StatBlock {
  size: string;           // "Large"
  type: string;           // "Monstrosity"
  alignment?: string;     // "Unaligned"
  ac: number;
  acNote?: string;        // "natural armor"
  initiative?: string;    // "+2 (12)"
  hp: number;
  hpFormula?: string;     // "9d10 + 18"
  speed: string;          // "30 ft., climb 30 ft."
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  saves?: string;         // "Con +5, Wis +2"
  skills?: string;        // "Perception +4, Stealth +6"
  vulnerabilities?: string;
  resistances?: string;
  immunities?: string;    // "Poison, Psychic; Charmed, Frightened"
  conditionImmunities?: string;
  senses?: string;        // "Darkvision 60 ft., Passive Perception 14"
  languages?: string;     // "None"
  cr: string;             // "3"
  xp?: number;
  pb?: number;            // proficiency bonus, e.g. 2
  traits?: Feature[];
  actions?: Feature[];
  bonusActions?: Feature[];
  reactions?: Feature[];
  notes?: string[];       // plain closing paragraphs
}

export interface Trap { rating: string; parts: Feature[] }

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export const abilityMod = (score: number) => Math.floor((score - 10) / 2);
export const fmtMod = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

export function slugify(name: string): string {
  return name.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
