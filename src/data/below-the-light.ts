// Below the Light page data. The text lives in below-the-light.content.json (copied from the staged, player-safe
// page content). Placeholders in [BRACKETS] are copy still to be written.
import content from './below-the-light.content.json';
import dmCreatures from './below-the-light.dm-creatures.json';
import { slugify } from '../lib/statblock';

export const PAGE = content.page;

export type EraBlock = { type: 'p'; text: string } | { type: 'ul'; items: string[] };

const ERA_META = [
  { id: 1, num: 'Era 1', name: 'Discovery', lit: true },
  { id: 2, num: 'Era 2', name: 'The Guild Age', lit: true },
  { id: 3, num: 'Era 3', name: 'The New Wells', lit: false },
] as const;

export const ERAS = ERA_META.map((m) => ({
  ...m,
  blocks: content.eras.find((e) => e.id === m.id)!.blocks as EraBlock[],
}));

// Only layer 1 is written so far. Layers 2 to 13 are placeholders until their content is staged.
export type Knowledge = 'charted' | 'pending';
export const KNOWLEDGE_LABEL: Record<Knowledge, string> = { charted: 'Charted', pending: '[TO BE WRITTEN]' };

export const LAYER_1 = content.descent.layer1;
export const DESCENT_INTRO = content.descent.intro;
/** How many creatures the layer panel previews before linking to the full list. */
export const CREATURE_PREVIEW = 3;
/** Every known creature, with the layer it lives on. Add later layers here as they are written. */
// The staged page lists 24 creatures. The two Congregation creatures (Penitent, The Bowed) come from the bestiary and are
// shown because this page is DM-facing; each is slotted in after the creature named in `after`, as in the bestiary table.
export const CREATURES = LAYER_1.creatures
  .flatMap((c) => [c, ...dmCreatures.filter((d) => d.after === c.name).map(({ after: _after, ...d }) => d)])
  .map((c) => ({ ...c, layer: 1, slug: slugify(c.name) }));

export const RELICS = content.relics.items.map((r) => ({
  title: r.name,
  type: r.type,
  rarity: r.rarity,
  nonMagical: r.nonMagical,
  attuneText: r.attunement === 'None' ? 'No attunement' : r.attunement,
  layer: r.layer,
  onlyOneKnown: r.onlyOneKnown,
  flavor: r.flavor,
  properties: r.properties,
  note: r.note,
  homage: r.homage,
}));
export const RELIC_COUNT = content.relics.count;
export const RARITIES = ['All', 'Common', 'Uncommon', 'Rare', 'Very rare'];

export const RUNNING = content.running;

export interface Topic { title: string; paras: string[] }
const s = content.setting;
export const tabsFor = (era: (typeof ERAS)[number]): { id: string; label: string; topics: Topic[] }[] => [
  { id: 'overview', label: 'Overview', topics: [
    { title: 'Overview', paras: s.overview },
    { title: 'Lightrest', paras: s.lightrest },
    { title: 'The Light', paras: era.lit ? s.light : [...s.light, '[THE LIGHT: what the world saw for centuries, and what it was like when it went out.]'] },
    { title: 'The Well', paras: s.well },
  ] },
  { id: 'rim', label: 'The Rim', topics: [
    { title: 'The Collective', paras: s.rim.collective },
    { title: 'Entry Fees', paras: s.rim.fees },
    { title: 'Guild Rivalry', paras: s.rim.rivalry },
    { title: 'Thugs and Smuggled Descents', paras: s.rim.dangers },
    { title: 'Rim Settlements', paras: s.rim.settlements },
  ] },
  { id: 'culture', label: 'Delver Culture', topics: [
    { title: 'No Ranks', paras: s.culture.ranks },
    { title: 'Patrons', paras: s.culture.patrons },
    { title: 'Proof of Depth', paras: s.culture.proof },
  ] },
  { id: 'religion', label: 'Religion', topics: [
    { title: 'Established Faiths', paras: s.religion.faiths },
    { title: 'The Cult of the Well', paras: s.religion.cult },
    { title: 'Rites and Places', paras: ['[WHERE AND HOW THE CULT GATHERS.]'] },
  ] },
];
