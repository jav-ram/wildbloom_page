---
# Copy this file to <slug>.md, where <slug> is the creature's name in lowercase with hyphens
# (Flying Eel -> flying-eel.md, Sleeper's Shroud -> sleepers-shroud.md).
# Delete any line you don't need. Everything under "statblock" is optional; leave the whole block out
# to keep the statblock placeholder. Public page: write player-safe content only.
statblock:
  size: Large
  type: Monstrosity
  alignment: Unaligned
  ac: 13
  acNote: natural armor            # optional
  initiative: "+2 (12)"            # optional, keep the quotes
  hp: 45
  hpFormula: 6d10 + 12             # optional
  speed: 10 ft., fly 40 ft.
  abilities: { str: 14, dex: 15, con: 14, int: 2, wis: 10, cha: 5 }
  saves: Con +4                    # optional lines
  skills: Perception +2
  vulnerabilities: Cold
  resistances: Bludgeoning
  immunities: Poison, Psychic; Charmed, Frightened   # damage and condition together, or:
  conditionImmunities: Blinded                       # condition immunities on their own
  senses: Darkvision 60 ft., Passive Perception 12
  languages: None
  cr: 2                            # use quotes for fractions: "1/4"
  xp: 450
  pb: 2
  traits:                          # traits, actions, bonusActions, reactions: each a list of name + text
    - name: Trait Name
      text: What it does. *italic* and **bold** work.
  actions:
    - name: Bite
      text: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 7 (1d8 + 3) Piercing damage."
# A trap instead of a creature? Use this block in place of "statblock":
# trap:
#   rating: Trap (dangerous for levels 5-10)
#   parts:
#     - name: Trigger
#       text: What sets it off.
#   notes (closing paragraphs for a statblock) go under statblock as:  notes: ["The grub has no attacks."]
---

The long description goes here, as normal Markdown. Write several paragraphs: what it looks like, how it behaves,
where delvers meet it, and what they say about it.

A second paragraph. **Bold**, *italic* and lists work:

- like this
- and this
