// Crater setting content. Placeholders in [BRACKETS] are copy still to be written.

export const ERAS = [
  { id: 1, num: 'Era 1', name: 'Discovery', summary: 'The first years: few believe the discoverers, and almost nothing is mapped.', intro: '[ERA 1 INTRO: the Crater as the first discoverers saw it. What a player in this era knows, and what no one believes yet.]', lit: true },
  { id: 2, num: 'Era 2', name: 'The Guild Age', summary: 'About a century later: guilds, infrastructure, and the Collective rules the rim.', intro: '[ERA 2 INTRO: the rim a century on. Who controls the way down, what it costs, and why delvers still go.]', lit: true },
  { id: 3, num: 'Era 3', name: 'The New Craters', summary: 'Centuries later: six adventurers reached the bottom, the first Crater’s light went out, and two new craters appeared.', intro: '[ERA 3 INTRO: the world after the light went out. What changed on the rim, and what the two new craters mean to delvers.]', lit: false },
] as const;

export type Knowledge = 'charted' | 'partial' | 'rumored' | 'uncharted';

// How far each era has charted: [charted up to, partly charted up to, rumored up to]. Placeholder depths: change to match the setting.
export const CHARTED: Record<number, [number, number, number]> = { 1: [0, 1, 2], 2: [3, 5, 7], 3: [5, 8, 13] };

export const KNOWLEDGE_LABEL: Record<Knowledge, string> = {
  charted: 'Charted',
  partial: 'Partly charted',
  rumored: 'Rumored',
  uncharted: 'Uncharted',
};

export const RELICS = [
  { n: 1, layer: 1, rarity: 'Common', attune: false },
  { n: 2, layer: 1, rarity: 'Uncommon', attune: true },
  { n: 3, layer: 2, rarity: 'Uncommon', attune: false },
  { n: 4, layer: 3, rarity: 'Rare', attune: true },
  { n: 5, layer: 4, rarity: 'Rare', attune: false },
  { n: 6, layer: 6, rarity: 'Very rare', attune: true },
].map((r) => ({
  ...r,
  title: `[RELIC NAME ${r.n}]`,
  type: '[ITEM TYPE]',
  attuneText: r.attune ? 'Requires attunement' : 'No attunement',
  desc: '[RULES DESCRIPTION: what the relic does, in plain rules text.]',
  lore: '[ONE LINE OF FLAVOR]',
}));

export const RARITIES = ['All', 'Common', 'Uncommon', 'Rare', 'Very rare'];

export interface Topic { title: string; text: string }
export const tabsFor = (era: (typeof ERAS)[number]): { id: string; label: string; topics: Topic[] }[] => [
  { id: 'overview', label: 'Overview', topics: [
    { title: 'The Island', text: '[THE ISLAND: where the Crater lies, and what a traveler sees on arrival.]' },
    { title: 'The Light', text: era.lit ? '[THE LIGHT: what rises from the Crater and how it is seen across the world.]' : '[THE LIGHT: what the world saw for centuries, and what it was like when it went out.]' },
    { title: 'The Crater', text: '[THE CRATER: its size, its shape and why people go down.]' },
  ] },
  { id: 'rim', label: 'The Rim', topics: [
    { title: 'The Collective', text: `[THE COLLECTIVE IN ${era.name.toUpperCase()}: who they are and what they control.]` },
    { title: 'Entry Fees', text: '[ENTRY FEES: what it costs to go down, and who collects.]' },
    { title: 'Guild Rivalry', text: '[GUILD RIVALRY: the guilds, what they compete for, and how it shows.]' },
    { title: 'Thugs and Smuggled Descents', text: '[THUGS AND SMUGGLING: how delvers go down without paying, and the risk.]' },
  ] },
  { id: 'culture', label: 'Delver Culture', topics: [
    { title: 'No Ranks', text: '[NO RANKS: how delvers judge each other without titles.]' },
    { title: 'Proof of Depth', text: '[PROOF OF DEPTH: how a delver shows how deep they have been.]' },
    { title: 'Patrons', text: '[PATRONS: who funds descents and what they expect back.]' },
  ] },
  { id: 'religion', label: 'Religion', topics: [
    { title: 'The Cult of the Crater', text: '[THE CULT OF THE CRATER: what they believe, player-safe.]' },
    { title: 'Rites and Places', text: '[WHERE AND HOW THE CULT GATHERS.]' },
  ] },
];
