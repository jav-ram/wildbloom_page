import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const feature = z.object({ name: z.string(), text: z.string() }).strict();
const score = z.number().int().min(1).max(30);

// Strict on purpose: a misspelled field (e.g. "bonusAction") fails the build instead of being ignored.
const statblock = z
  .object({
    size: z.string(),
    type: z.string(),
    alignment: z.string().optional(),
    ac: z.number(),
    acNote: z.string().optional(),
    initiative: z.string().optional(),
    hp: z.number(),
    hpFormula: z.string().optional(),
    speed: z.string(),
    abilities: z.object({ str: score, dex: score, con: score, int: score, wis: score, cha: score }).strict(),
    saves: z.string().optional(),
    skills: z.string().optional(),
    vulnerabilities: z.string().optional(),
    resistances: z.string().optional(),
    immunities: z.string().optional(),
    conditionImmunities: z.string().optional(),
    senses: z.string().optional(),
    languages: z.string().optional(),
    cr: z.union([z.string(), z.number()]).transform(String),
    xp: z.number().optional(),
    pb: z.number().optional(),
    traits: z.array(feature).optional(),
    actions: z.array(feature).optional(),
    bonusActions: z.array(feature).optional(),
    reactions: z.array(feature).optional(),
    /** Plain closing paragraphs, e.g. "The grub has no attacks." */
    notes: z.array(z.string()).optional(),
  })
  .strict();

// A trap is not a creature: it has a rating and a list of named parts (Trigger, Effect, Escape, ...).
const trap = z.object({ rating: z.string(), parts: z.array(feature) }).strict();

// One file per creature: src/data/creatures/<slug>.md. The body is the long description, the frontmatter the statblock.
// Files starting with "_" (like the template) are ignored.
const creatures = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/_*'], base: './src/data/creatures' }),
  schema: z.object({ statblock: statblock.optional(), trap: trap.optional() }).strict(),
});

export const collections = { creatures };
