export type ClassStatus = 'Released' | 'Playtest' | 'Coming soon';

export interface ClassEntry {
  slug: string;
  title: string;
  tagline: string;
  ability: string;
  hitDie: string;
  roles: string[];
  status: ClassStatus;
  /** True when src/data/class-json/<slug>.class.json exists, enabling the Simulator link. */
  simulator?: boolean;
}

// Add a class here (and a page under src/pages/classes/) to list it on the index.
export const classes: ClassEntry[] = [
  {
    slug: 'warcaller',
    title: 'Warcaller',
    tagline: 'Battle cries and a raised banner that push allies to fight harder.',
    ability: 'Constitution and Charisma',
    hitDie: 'D10',
    roles: ['Support'],
    status: 'Playtest',
    simulator: true,
  },
  {
    slug: 'trickster',
    title: 'Trickster',
    tagline: 'Nets, smoke and feints that take the fight away from your enemies.',
    ability: 'Dexterity and Intelligence',
    hitDie: 'D8',
    roles: ['Control'],
    status: 'Playtest',
    simulator: true,
  },
];
