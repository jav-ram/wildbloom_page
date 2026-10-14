// Wildbloom Proving Ground: combat engine and UI, ported from the standalone simulator.
const R = Math.random;
const d = n => 1 + Math.floor(R() * n);
const mod = s => Math.floor((s - 10) / 2);
const PB = L => 2 + Math.floor((L - 1) / 4);
const step = (L, a) => { let v = a[0][1]; for (const [l, x] of a) if (L >= l) v = x; return v; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const SPEC = {};
function spec(s) {
  if (SPEC[s]) return SPEC[s];
  const o = { dice: [], mod: 0 };
  s.replace(/\s+/g, '').replace(/-/g, '+-').split('+').forEach(t => {
    if (!t) return;
    const m = t.match(/^(-?)(\d*)d(\d+)$/);
    if (m) o.dice.push([(+(m[2] || 1)) * (m[1] ? -1 : 1), +m[3]]);
    else o.mod += +t;
  });
  o.avg = o.mod + o.dice.reduce((a, [n, sd]) => a + n * (sd + 1) / 2, 0);
  return (SPEC[s] = o);
}
function roll(sp, crit, minDie) {
  let t = sp.mod;
  for (const [n, s] of sp.dice) {
    const k = Math.abs(n) * (crit ? 2 : 1);
    for (let i = 0; i < k; i++) { let r = d(s); if (minDie && r < minDie) r = minDie; t += n < 0 ? -r : r; }
  }
  return Math.max(0, t);
}
const nd = (n, s) => { let t = 0; for (let i = 0; i < n; i++) t += d(s); return t; };
function d20(adv, dis) {
  const a = d(20);
  if (!!adv === !!dis) return { nat: a, alt: a, mode: 'n' };
  const b = d(20);
  return adv ? { nat: Math.max(a, b), alt: Math.min(a, b), mode: 'adv' } : { nat: Math.min(a, b), alt: Math.max(a, b), mode: 'dis' };
}

// ----- Monsters (stat blocks based on SRD 5.1 monsters) -----
const MON = [
  { id: 'goblin', name: 'Goblin', cr: '1/4', xp: 50, ac: 15, hp: 7, hit: 4, atk: ['1d6+2'], sv: { str: -1, wis: -1, dex: 2, con: 0 }, init: 2 },
  { id: 'orc', name: 'Orc', cr: '1/2', xp: 100, ac: 13, hp: 15, hit: 5, atk: ['1d12+3'], sv: { str: 3, wis: 0, dex: 1, con: 3 }, init: 1 },
  { id: 'bugbear', name: 'Bugbear', cr: '1', xp: 200, ac: 16, hp: 27, hit: 4, atk: ['2d8+2'], sv: { str: 2, wis: 0, dex: 2, con: 1 }, init: 2 },
  { id: 'ogre', name: 'Ogre', cr: '2', xp: 450, ac: 11, hp: 59, hit: 6, atk: ['2d8+4'], sv: { str: 4, wis: -2, dex: -1, con: 3 }, init: -1 },
  { id: 'owlbear', name: 'Owlbear', cr: '3', xp: 700, ac: 13, hp: 59, hit: 7, atk: ['1d10+5', '2d8+5'], sv: { str: 5, wis: 1, dex: 1, con: 3 }, init: 1 },
  { id: 'ettin', name: 'Ettin', cr: '4', xp: 1100, ac: 12, hp: 85, hit: 7, atk: ['2d8+5', '2d8+5'], sv: { str: 5, wis: 0, dex: -1, con: 3 }, init: -1 },
  { id: 'troll', name: 'Troll', cr: '5', xp: 1800, ac: 15, hp: 84, hit: 7, atk: ['1d6+4', '2d6+4', '2d6+4'], sv: { str: 4, wis: -1, dex: 1, con: 5 }, init: 1, regen: 10 },
  { id: 'chimera', name: 'Chimera', cr: '6', xp: 2300, ac: 14, hp: 114, hit: 7, atk: ['2d6+4', '1d12+4', '2d6+4'], sv: { str: 4, wis: 2, dex: 0, con: 4 }, init: 0, breath: { dice: '7d8', dc: 15, save: 'dex', n: 2, what: 'fire' } },
  { id: 'stonegiant', name: 'Stone Giant', cr: '7', xp: 2900, ac: 17, hp: 126, hit: 9, atk: ['3d8+6', '3d8+6'], sv: { str: 6, wis: 4, dex: 5, con: 8 }, init: 2 },
  { id: 'frostgiant', name: 'Frost Giant', cr: '8', xp: 3900, ac: 15, hp: 138, hit: 9, atk: ['3d12+6', '3d12+6'], sv: { str: 6, wis: 3, dex: -1, con: 8 }, init: -1 },
  { id: 'firegiant', name: 'Fire Giant', cr: '9', xp: 5000, ac: 18, hp: 162, hit: 11, atk: ['6d6+7', '6d6+7'], sv: { str: 7, wis: 2, dex: 2, con: 10 }, init: -1 },
  { id: 'stonegolem', name: 'Stone Golem', cr: '10', xp: 5900, ac: 17, hp: 178, hit: 10, atk: ['3d8+6', '3d8+6'], sv: { str: 6, wis: 0, dex: -1, con: 5 }, init: -1 },
  { id: 'youngred', name: 'Young Red Dragon', cr: '10', xp: 5900, ac: 18, hp: 178, hit: 10, atk: ['2d10+1d6+6', '2d6+6', '2d6+6'], sv: { str: 6, wis: 4, dex: 4, con: 9 }, init: 0, breath: { dice: '16d6', dc: 17, save: 'dex', n: 3, what: 'fire' } },
  { id: 'stormgiant', name: 'Storm Giant', cr: '13', xp: 10000, ac: 16, hp: 230, hit: 14, atk: ['6d6+9', '6d6+9'], sv: { str: 10, wis: 9, dex: 0, con: 10 }, init: 2 },
  { id: 'icedevil', name: 'Ice Devil', cr: '14', xp: 11500, ac: 18, hp: 180, hit: 10, atk: ['2d6+5+3d6', '2d4+5+3d6', '2d6+5+3d6'], sv: { str: 5, wis: 7, dex: 7, con: 9 }, init: 2 },
  { id: 'adultwhite', name: 'Adult White Dragon', cr: '13', xp: 10000, ac: 18, hp: 200, hit: 11, atk: ['2d10+1d8+6', '2d6+6', '2d6+6'], sv: { str: 6, wis: 6, dex: 5, con: 11 }, init: 0, breath: { dice: '12d8', dc: 19, save: 'con', n: 3, what: 'cold' } },
  { id: 'adultgreen', name: 'Adult Green Dragon', cr: '15', xp: 13000, ac: 19, hp: 207, hit: 11, atk: ['2d10+2d6+6', '2d6+6', '2d6+6'], sv: { str: 6, wis: 7, dex: 6, con: 10 }, init: 1, breath: { dice: '16d6', dc: 18, save: 'con', n: 3, what: 'poison' } },
  { id: 'purpleworm', name: 'Purple Worm', cr: '15', xp: 13000, ac: 18, hp: 247, hit: 9, atk: ['3d8+9', '3d6+9+12d6'], sv: { str: 9, wis: 4, dex: -2, con: 11 }, init: -2 },
  { id: 'adultred', name: 'Adult Red Dragon', cr: '17', xp: 18000, ac: 19, hp: 256, hit: 14, atk: ['2d10+2d6+8', '2d6+8', '2d6+8'], sv: { str: 8, wis: 7, dex: 6, con: 13 }, init: 0, breath: { dice: '18d6', dc: 21, save: 'dex', n: 3, what: 'fire' } },
  { id: 'balor', name: 'Balor', cr: '19', xp: 22000, ac: 19, hp: 262, hit: 14, atk: ['3d8+8+3d8', '2d6+8+3d6'], sv: { str: 8, wis: 9, dex: 0, con: 12 }, init: 2 },
  { id: 'pitfiend', name: 'Pit Fiend', cr: '20', xp: 25000, ac: 19, hp: 300, hit: 14, atk: ['4d6+8', '2d8+8', '2d6+8+6d6', '3d10+8'], sv: { str: 8, wis: 10, dex: 8, con: 13 }, init: 2 },
  { id: 'ancientblack', name: 'Ancient Black Dragon', cr: '21', xp: 33000, ac: 22, hp: 367, hit: 15, atk: ['2d10+2d8+8', '2d6+8', '2d6+8'], sv: { str: 8, wis: 9, dex: 9, con: 14 }, init: 2, breath: { dice: '15d8', dc: 22, save: 'dex', n: 4, what: 'acid' } },
];
const MON_BY = Object.fromEntries(MON.map(m => [m.id, m]));
const XPB = {
  low: [50, 100, 150, 250, 500, 600, 750, 1000, 1300, 1600, 1900, 2200, 2600, 2900, 3300, 3800, 4500, 5000, 5500, 6400],
  moderate: [75, 150, 225, 375, 750, 1000, 1300, 1700, 2000, 2300, 2900, 3700, 4200, 4900, 5400, 6100, 7200, 8700, 10700, 13200],
  high: [100, 200, 400, 500, 1100, 1400, 1700, 2100, 2600, 3100, 4100, 4700, 5400, 6200, 7800, 9800, 11700, 14200, 17200, 22000],
};
function autoEncounter(L, diff) {
  const total = XPB[diff][L - 1] * 4;
  let best = null;
  const pool = MON.filter(m => !m.breath);
  for (const m of pool) { const c = Math.round(total / m.xp); if (c >= 3 && c <= 6) best = { id: m.id, count: c }; }
  if (!best) for (const m of pool) { const c = Math.round(total / m.xp); if (c >= 2 && c <= 6) best = { id: m.id, count: c }; }
  if (!best) { const m = pool[pool.length - 1]; best = { id: m.id, count: Math.max(1, Math.round(total / m.xp)) }; }
  return best;
}

// ----- Spell slot tables -----
const FULL = [[2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
const HALF = [[2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]];

// ===== Class skeleton runtime =====
const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const WHEN = ['passive', 'action', 'bonusAction', 'reaction', 'dropToZero', 'initiative', 'longRest', 'afterChoice', 'modify', 'exploration'];
const TRIGGERS = ['allyHit', 'allyMiss', 'targeted'];
const TARGETS = ['self', 'selfAndAura', 'aura', 'allies', 'allyAtRisk', 'downedAlly', 'enemiesInAura', 'enemyInAura', 'enemy', 'focusEnemy', 'enemiesArea'];
// effect type → how its value is counted in the ledger
const EFFECT_KIND = {
  acBonus: 'prevent', reduceDamage: 'prevent', tempHp: 'prevent', resistNext: 'prevent', resistance: 'prevent', frighten: 'prevent', saveAdvantage: 'prevent',
  bonusDamage: 'dealt', advantageVsMark: 'dealt', addToRoll: 'dealt', counterAttack: 'dealt', advantageTokens: 'dealt', grantMastery: 'dealt', rollBonus: 'dealt',
  spendHitDie: 'heal', regen: 'heal',
  dropTo1: 'count', gatherAura: 'count', taunt: 'count', deathSaveAdvantage: 'count', freeChoice: 'count',
  saveProficiency: 'none', extraChoice: 'none', auraSize: 'none', initiativeBonus: 'none', range: 'none',
  snare: 'prevent', daze: 'prevent', hinder: 'prevent', stun: 'prevent', veil: 'prevent', imposeDisadvantage: 'prevent', negate: 'prevent',
  expose: 'dealt', revive: 'count',
  snaredBonusDamage: 'dealt',
  damage: 'dealt', repairSuit: 'heal', suitRegen: 'heal', weaponDamage: 'dealt', splashDamage: 'dealt', suitDamageReduction: 'prevent', suitDropTo1: 'count',
  noCost: 'none', resourceMax: 'none',
  suitAc: 'none', suitHpBonus: 'none', weaponOverride: 'none', setRole: 'none', freeSystems: 'none', suitFloor: 'none',
  gainResource: 'none', saveReroll: 'none', replaceAttack: 'none', snareUpgrade: 'none', area: 'none', linger: 'none', knowOption: 'none',
};
const EFFECT_TYPES = Object.keys(EFFECT_KIND);

function scaleAt(v, L) {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return v;
  let out, best = -1;
  for (const k of Object.keys(v)) { const n = +k; if (n <= L && n > best) { best = n; out = v[k]; } }
  return out;
}
function dieVal(n, s, mode) { return mode === 'avg' ? n * (s + 1) / 2 : mode === 'max' ? n * s : nd(n, s); }
function term(pc, t, mode) {
  t = t.trim(); if (!t) return 0;
  let m;
  if (/^-?\d+(\.\d+)?$/.test(t)) return +t;
  if (t.includes('/')) { const [a, ...rest] = t.split('/'); return rest.reduce((v, x) => Math.floor(v / term(pc, x, mode)), term(pc, a, mode)); }
  if (t.includes('*')) return t.split('*').reduce((v, x) => v * term(pc, x, mode), 1);
  if (t === 'level') return pc.L;
  if (t === 'pb') return PB(pc.L);
  if (ABIL.includes(t)) return mod(pc.sc[t]);
  if ((m = t.match(/^(\d*)d(\d+)$/))) return dieVal(+(m[1] || 1), +m[2], mode);
  const sc = pc.def && pc.def.scales && pc.def.scales[t];
  if (sc !== undefined) { const v = scaleAt(sc, pc.L); if (v === undefined) throw new Error(`Scale "${t}" has no value at level ${pc.L}`); return typeof v === 'string' ? term(pc, v, mode) : +v; }
  throw new Error(`Unknown term "${t}"`);
}
function ev(pc, e, mode = 'roll', min) {
  let v;
  if (e == null) v = 0;
  else if (typeof e === 'number') v = e;
  else if (typeof e === 'object') v = ev(pc, scaleAt(e, pc.L), mode);
  else v = String(e).split('+').reduce((a, t) => a + term(pc, t, mode), 0);
  if (min != null) v = Math.max(min, v);
  return v;
}

// ----- Ledger -----
const LABEL = {
  weapon: 'Weapon attacks', sap: 'Sap mastery (enemy disadvantage)', vex: 'Vex mastery (hits gained)', graze: 'Graze mastery', secondwind: 'Second Wind',
  smite: 'Divine Smite', radiant: 'Radiant Strikes', defense: 'Defense style (+1 AC)', loh: 'Lay on Hands', aop: 'Aura of Protection',
  sneak: 'Sneak Attack', superiorPrey: "Superior Hunter's Prey", huntersDefense: "Superior Hunter's Defense",
  rage: 'Rage damage', rageRes: 'Rage resistance', frenzy: 'Frenzy', brutal: 'Brutal Strike', retaliation: 'Retaliation', relentless: 'Relentless Rage',
  mockery: 'Vicious Mockery', inspiration: 'Bardic Inspiration hits gained', cuttingWords: 'Cutting Words', hypnotic: 'Hypnotic Pattern', shatter: 'Shatter',
  healingWord: 'Healing Word', preserveLife: 'Preserve Life', spiritGuardians: 'Spirit Guardians', toll: 'Toll the Dead', moonbeam: 'Moonbeam', cantrip: 'Damage cantrip',
  flurry: 'Flurry of Blows', stunningStrike: 'Stunning Strike', openHand: 'Open Hand Technique', deflect: 'Deflect Attacks',
  huntersMark: "Hunter's Mark", colossus: 'Colossus Slayer', fireBolt: 'Fire Bolt', fireball: 'Fireball', scorchingRay: 'Scorching Ray', chromaticOrb: 'Chromatic Orb',
  eldritchBlast: 'Eldritch Blast', hex: 'Hex', darkBlessing: "Dark One's Blessing", arcanum: 'Mystic Arcanum', hurl: 'Hurl Through Hell',
  coneOfCold: 'Cone of Cold', magicMissile: 'Magic Missile', shield: 'Shield spell',
  anchor: 'Anchor broken', suit: 'Suit Hit Points (damage absorbed)', suitOffline: 'Suit knocked offline', topple: 'Topple mastery (Prone)',
};
const KIND_WORD = { dealt: 'dealt', prevent: 'prevented', heal: 'healed', count: 'times', soak: 'absorbed' };
function credit(ctx, owner, id, kind, v, n = 1) {
  if (!owner || owner !== ctx.slot || kind === 'none') return;
  const key = id + '|' + kind;
  const f = ctx.S.feat[key] || (ctx.S.feat[key] = { v: 0, n: 0 });
  f.v += v; f.n += n;
}
function log(ctx, kind, text) { if (ctx.log) ctx.log.push([ctx.fi, ctx.round, kind, text]); }

// ----- Characters -----
function basePC({ name, cls, L, sc, hd, saves, ac, role }) {
  const con = mod(sc.con);
  const maxHp = hd + con + (L - 1) * (hd / 2 + 1 + con);
  const sv = {};
  for (const k of ABIL) sv[k] = mod(sc[k]) + (saves.includes(k) ? PB(L) : 0);
  return { name, cls, L, sc, role, side: 'party', maxHp, hp: maxHp, thp: 0, ac, sv, init: mod(sc.dex), hd, hdLeft: L, conscious: true, dead: false, stable: false, ds: { s: 0, f: 0 }, f: {}, reaction: true, atk: null, nAtk: 1, atkAvg: 0 };
}
function ASI(L, base, ups) {
  const s = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...base };
  for (const [l, k, v] of ups) if (L >= l) s[k] = Math.min(20, s[k] + v);
  return s;
}
const W = { front: 2, mid: 1.2, back: 0.8 };

// ----- Homebrew class from JSON -----
function classFeatures(def, sub, L) {
  const sc = (def.subclasses || []).find(s => s.id === sub);
  const subOn = sc && L >= (def.core.subclassLevel || 3);
  return [...(def.features || []), ...(subOn ? sc.features : [])].filter(f => (f.level || 1) <= L);
}
function choiceFeatures(def) { return (def.features || []).filter(f => f.choose); }
function knownOptions(def, L, fid, manual, extra) {
  const f = (def.features || []).find(x => x.id === fid);
  if (!f || !f.choose) return [];
  const all = (def.options[f.choose.from] || []).filter(o => (o.level || 1) <= L && !o.subclass && !(extra || []).includes(o.id));
  const n = Math.floor(ev({ L, def, sc: {} }, f.choose.known, 'avg'));
  if (manual && manual.length) { const v = manual.map(id => all.find(o => o.id === id)).filter(Boolean).slice(0, n); if (v.length) return v; }
  return [...all].sort((a, b) => (a.pick ?? 99) - (b.pick ?? 99)).slice(0, n);
}
function knownFor(def, L, sub, from, manual) {
  const f = (def.features || []).find(x => x.choose && x.choose.from === from);
  if (!f) return [];
  const extra = [];
  for (const cf of classFeatures(def, sub, L)) for (const e of cf.effects || []) if (e.type === 'knowOption') extra.push(e.option);
  const list = def.options[from] || [];
  return [...extra.map(id => list.find(o => o.id === id)).filter(Boolean), ...knownOptions(def, L, f.id, manual, extra)];
}
function buildHB(def, L, cfg) {
  const builds = def.core.builds, bk = builds[cfg.build] ? cfg.build : Object.keys(builds)[0], b = builds[bk];
  const sc = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...b.scores };
  for (const [lv, inc] of Object.entries(b.asi || {})) if (L >= +lv) for (const [k, v] of Object.entries(inc)) sc[k] = Math.min(20, sc[k] + v);
  const feats = classFeatures(def, cfg.sub, L);
  const saves = [...def.core.saves];
  for (const f of feats) for (const e of f.effects || []) if (e.type === 'saveProficiency') saves.push(e.save);
  const ac = Math.floor(ev({ L, def, sc }, scaleAt(def.core.ac, L), 'avg'));
  const pc = basePC({ name: def.name, cls: 'hb', L, sc, hd: def.core.hitDie, saves, ac, role: def.role || 'front' });
  pc.def = def; pc.feats = feats; pc.sub = cfg.sub;
  let w = def.core.weapon;
  for (const f of feats) for (const e of f.effects || []) { if (e.type === 'weaponOverride') w = { ...w, ...e.weapon }; if (e.type === 'setRole') pc.role = e.role; }
  const am = mod(sc[w.ability || 'str']);
  pc.atk = { hit: PB(L) + am, dmg: spec(w.damage + '+' + am), mastery: w.mastery || null, ranged: !!w.ranged };
  if (def.core.suit) {
    const su = def.core.suit, ctxPc = { L, def, sc };
    pc.suit = true;
    pc.suitMax = Math.floor(ev(ctxPc, su.hp, 'avg'));
    for (const f of feats) for (const e of f.effects || []) {
      if (e.type === 'suitHpBonus') pc.suitMax += Math.floor(ev(ctxPc, e.amount, 'avg'));
      if (e.type === 'suitAc') pc.ac += Math.floor(ev(ctxPc, e.amount, 'avg'));
    }
    pc.acOn = pc.ac;
    pc.acOff = Math.floor(ev(ctxPc, scaleAt(su.offlineAc ?? '10+dex', L), 'avg'));
  }
  pc.nAtk = scaleAt(def.core.attacks, L) || 1;
  pc.atkAvg = pc.atk.dmg.avg;
  pc.dc = ev(pc, def.core.saveDC || '8+pb', 'avg');
  pc.known = {};
  for (const f of feats) if (f.choose) {
    const flt = f.choose.filter || {};
    pc.known[f.id] = knownFor(def, L, cfg.sub, f.choose.from, cfg.choices && cfg.choices[f.choose.from]).filter(o => Object.entries(flt).every(([k, v]) => (o[k] ?? 'action') === v));
  }
  return pc;
}
const fx = (pc, when) => pc.feats.filter(f => f.when === when);
const passives = (pc, type) => { const out = []; for (const f of pc.feats) if (f.when === 'passive') for (const e of f.effects || []) if (e.type === type) out.push([f, e]); return out; };
const mods = (pc, fid) => { const out = []; for (const f of pc.feats) if (f.when === 'modify' && f.feature === fid) for (const e of f.effects || []) out.push([f, e]); return out; };
function usesMax(pc, f) { return f.uses ? Math.floor(ev(pc, f.uses.max, 'avg', f.uses.min)) : Infinity; }
function resMax(pc, rid) { let m = Math.floor(ev(pc, pc.def.resources[rid].max, 'avg')); for (const [, e] of passives(pc, 'resourceMax')) if (e.resource === rid) m += Math.floor(ev(pc, e.amount, 'avg')); return m; }
function ready(pc, f) { return !(f.requires === 'suitOnline' && pc.suit && !pc.suitOn); }
const noCost = (pc, f) => pc.feats.some(m => m.when === 'modify' && m.feature === f.id && (m.effects || []).some(e => e.type === 'noCost'));
function hasUse(pc, f) { return ready(pc, f) && (!f.uses || (pc.uses[f.id] ?? 0) > 0) && (!f.cost || f.choose || noCost(pc, f) || (pc.res[f.cost] || 0) >= (f.costAmount || 1)); }
function spendUse(pc, f) { if (f.uses) pc.uses[f.id]--; if (f.cost && !f.choose && !noCost(pc, f)) pc.res[f.cost] -= (f.costAmount || 1); }
function setSuit(ctx, pc, on) {
  if (!pc.suit || pc.suitOn === on) return;
  pc.suitOn = on; pc.ac = on ? pc.acOn : pc.acOff;
  if (!on) { credit(ctx, pc, 'suitOffline', 'count', 0); log(ctx, 'ko', `${pc.name}'s suit goes offline`); }
}
function inAuraOf(hc, p) { return p === hc || p.inAura; }

const HB = {
  startDay(pc, ctx) {
    pc.res = {}; pc.uses = {};
    if (pc.suit) { pc.suitHp = pc.suitMax; pc.suitOn = true; pc.ac = pc.acOn; }
    for (const [rid, r] of Object.entries(pc.def.resources || {})) pc.res[rid] = resMax(pc, rid);
    for (const f of pc.feats) if (f.uses) pc.uses[f.id] = usesMax(pc, f);
    const an = pc.def.aura && pc.def.aura.anchor;
    if (an) { pc.anchorMax = ev(pc, an.hp || '0', 'avg'); pc.anchorHp = pc.anchorMax; pc.anchorBroken = false; }
    for (const f of fx(pc, 'longRest')) for (const e of f.effects || []) if (e.type === 'gainResource') pc.res[e.resource] = (pc.res[e.resource] || 0) + ev(pc, e.amount ?? 1, 'avg');
    for (const f of fx(pc, 'longRest')) for (const e of f.effects || []) if (e.type === 'advantageTokens') {
      let k = Math.floor(ev(pc, e.count, 'avg', e.min));
      const order = [...ctx.party.filter(p => p !== pc && p.atk), pc, ...ctx.party.filter(p => p !== pc && !p.atk)];
      for (const p of order) if (k-- > 0) p.f.advToken = { id: f.id };
    }
  },
  shortRest(pc) {
    if (pc.suit) { pc.suitHp = pc.suitMax; pc.suitOn = true; pc.ac = pc.acOn; }
    for (const [rid, r] of Object.entries(pc.def.resources || {})) {
      const max = resMax(pc, rid);
      if (r.shortRest === 'all') pc.res[rid] = max; else if (r.shortRest) pc.res[rid] = Math.max(pc.res[rid], Math.min(max, pc.res[rid] + Math.floor(ev(pc, r.shortRest, 'avg', r.shortRestMin))));
    }
    for (const f of pc.feats) if (f.uses && f.uses.shortRest) pc.uses[f.id] = f.uses.shortRest === 'all' ? usesMax(pc, f) : Math.min(usesMax(pc, f), pc.uses[f.id] + f.uses.shortRest);
    const an = pc.def.aura && pc.def.aura.anchor;
    if (an && (an.repair || 'shortRest') === 'shortRest') { pc.anchorBroken = false; pc.anchorHp = pc.anchorMax; }
  },
  startFight(pc, ctx) {
    pc.planted = false; pc.share = {}; pc.spent = {};
    for (const f of pc.feats) if (f.cost) { pc.share[f.id] = Math.ceil((pc.res[f.cost] || 0) / (ctx.fights - ctx.fi)); pc.spent[f.id] = 0; }
  },
  turn: hbTurn,
};

function auraSize(ctx, hc) {
  if (ctx.dur.aura && ctx.dur.aura.rounds > 0) return ctx.dur.aura.size;
  const a = hc.def.aura; if (!a) return 0;
  if (a.anchor && hc.anchorBroken) return a.anchor.brokenSize ?? 5;
  return ev(hc, a.size, 'avg');
}
function position(ctx, hc) {
  const size = auraSize(ctx, hc);
  const pA = ctx.advance ? 1 : clamp(ctx.cfg.tight * size / 15, 0, 1);
  ctx.advance = false;
  for (const p of ctx.party) {
    if (p === hc) { p.inAura = true; p.adj = false; p.near = false; continue; }
    p.inAura = size > 0 && R() < pA;
    p.adj = R() < clamp(ctx.cfg.adj * (p.role === 'front' ? 1.5 : 1), 0, 1);
    p.near = p.adj || R() < clamp(ctx.cfg.adj * (p.role === 'front' ? 1.5 : 1.1), 0, 1);
  }
  const pE = clamp(0.7 * size / 15, 0, 1);
  for (const m of ctx.monsters) m.inAura = size > 0 && R() < pE;
}
function pickTargets(ctx, hc, targets, revive) {
  const live = ctx.party.filter(p => !p.dead);
  switch (targets || 'self') {
    case 'self': return [hc];
    case 'selfAndAura': return live.filter(p => (p.conscious || (revive && p.inAura)) && inAuraOf(hc, p));
    case 'aura': return live.filter(p => p !== hc && (p.conscious || revive) && p.inAura);
    case 'enemiesInAura': return ctx.monsters.filter(m => m.hp > 0 && m.inAura);
    case 'enemyInAura': { const m = ctx.monsters.filter(x => x.hp > 0 && x.inAura).sort((a, b) => b.dpr - a.dpr)[0]; return m ? [m] : []; }
    case 'allies': return live.filter(p => p.conscious);
    case 'allyAtRisk': return live.filter(p => p.conscious).sort((a, b) => (a.hp + a.thp) / a.maxHp / W[a.role] - (b.hp + b.thp) / b.maxHp / W[b.role]).slice(0, 1);
    case 'downedAlly': return live.filter(p => !p.conscious).slice(0, 1);
    case 'enemy': return ctx.monsters.filter(x => x.hp > 0).sort((a, b) => b.dpr * b.hp - a.dpr * a.hp);
    case 'focusEnemy': return ctx.monsters.filter(x => x.hp > 0).sort((a, b) => a.hp - b.hp);
    case 'enemiesArea': return ctx.monsters.filter(x => x.hp > 0).sort(() => R() - 0.5);
  }
  return [];
}
// how many targets an effect reaches (single-target kinds default to 1, areas to 2)
function targetCount(hc, e, bonus) {
  const base = e.count != null ? ev(hc, e.count, 'avg') : (e.targets === 'enemiesArea' ? 2 : (['enemy', 'focusEnemy', 'allyAtRisk', 'self', 'downedAlly'].includes(e.targets) ? 1 : 99));
  return Math.max(1, Math.floor(base + (bonus || 0)));
}
function inRange(p, range) { return range === 'adjacent' ? p.adj : range === 'near' ? p.near : range === 'allies' ? true : p.inAura; }
function snareUpg(hc) { const u = {}; for (const [, e] of passives(hc, 'snareUpgrade')) Object.assign(u, e); return u; }
function monSave(ctx, hc, m, ab, src) {
  let ok = d(20) + (m.sv[ab] ?? 0) >= hc.dc;
  if (ok) for (const [f] of passives(hc, 'saveReroll')) if (hasUse(hc, f)) { spendUse(hc, f); ok = d(20) + (m.sv[ab] ?? 0) >= hc.dc; credit(ctx, hc, f.id, 'count', 0); break; }
  return ok;
}
function optionMods(hc, o) { const out = []; for (const f of hc.feats) if (f.when === 'modify' && f.option === o.id) for (const e of f.effects || []) out.push(e); return out; }
const pFail = (save, dc) => clamp((dc - 1 - (save ?? 0)) / 20, 0.05, 0.95);

// Expected value of one effect, used by the AI to pick options
function effectEV(ctx, hc, e) {
  const live = ctx.party.filter(p => !p.dead);
  const aff = live.filter(p => p.conscious && inAuraOf(hc, p));
  const n = aff.length;
  const mons = ctx.monsters.filter(m => m.hp > 0);
  if (!mons.length) return 0;
  const cons = live.filter(p => p.conscious).length || 1;
  const atks = mons.reduce((a, m) => a + m.atk.length, 0);
  const hitAvg = mons.reduce((a, m) => a + m.atk.reduce((b, s) => b + s.avg, 0), 0) / Math.max(1, atks);
  const perPC = atks / cons, pHit = 0.55;
  const amt = e.amount != null ? ev(hc, e.amount, 'avg') : 0;
  switch (e.type) {
    case 'bonusDamage': return (e.targets === 'self' ? 1 : aff.filter(p => p.atk).length) * 0.75 * amt;
    case 'advantageVsMark': return aff.reduce((a, p) => a + (p.atk ? 0.2 * p.atkAvg : 0), 0);
    case 'tempHp': return (e.targets === 'allies' ? Math.min(targetCount(hc, e), cons) : n) * Math.min(amt, perPC * pHit * hitAvg);
    case 'damage': {
      const k = targetCount(hc, e, e._area || 0);
      const pool = [...mons].sort((a, b) => b.hp - a.hp).slice(0, k);
      return pool.reduce((a, m) => { const pf = pFail(m.sv[e.save || 'dex'], hc.dc); return a + Math.min(m.hp, amt * (pf + (1 - pf) * (e.half === false ? 0 : 0.5))) + (e.prone ? pf * 0.1 * aff.reduce((x, p) => x + (p.atkAvg || 0), 0) : 0); }, 0) * (e.aiWeight ?? 1);
    }
    case 'repairSuit': {
      if (!hc.suit) return 0;
      const miss = hc.suitMax - hc.suitHp;
      if (!hc.suitOn) return Math.min(amt, hc.suitMax) + perPC * pHit * hitAvg * 0.6;
      return miss >= amt * 0.8 ? Math.min(amt, miss) * 0.8 : 0;
    }
    case 'resistNext': return n * Math.min(1, perPC * pHit) * hitAvg / 2;
    case 'frighten': return mons.filter(m => m.inAura).reduce((a, m) => a + pFail(m.sv[e.save || 'wis'], hc.dc) * m.dpr * 0.25, 0);
    case 'saveAdvantage': { const br = mons.find(m => m.breath && m.breathReady); return br ? n * 0.15 * br.breathAvg * 0.5 : 0.5; }
    case 'gatherAura': return live.filter(p => p.conscious && p !== hc && !p.inAura).length * 1.5;
    case 'dropTo1': { const low = aff.filter(p => p.hp + p.thp <= hitAvg * 1.3); return low.length ? 50 + low.length * hitAvg : 0; }
    case 'spendHitDie': { const down = live.filter(p => !p.conscious && p.inAura); return down.length ? 60 + down.length * 20 : 0; }
    case 'revive': return live.some(p => !p.conscious) ? 45 : 0;
    case 'snare': {
      const u = snareUpg(hc), n = targetCount(hc, e, u.targets2 ? 1 : 0);
      const cands = mons.filter(m => !m.snare).sort((a, b) => b.dpr * b.hp - a.dpr * a.hp).slice(0, n);
      const melee = live.filter(p => p.conscious && p.atk && p.role !== 'back').reduce((a, p) => a + p.atkAvg * p.nAtk, 0);
      return cands.reduce((a, m) => {
        const big = Math.max(...m.atk.map(s => s.avg)), small = Math.min(...m.atk.map(s => s.avg));
        const chk = clamp((hc.dc - 1 - Math.max(m.sv.str ?? 0, m.sv.dex ?? 0)) / 20, 0.05, 0.95);
        let v = (e.attackCheck ? m.dpr * (u.checkDisadvantage ? 1 - (1 - chk) ** 2 : chk) : (m.atk.length > 1 ? (e.attacks === 'oneFewer' ? small : m.dpr - big) : 0)) * pHit + 0.5;
        if (u.exposed) v += melee * 0.2;
        if (u.disadvantage) v += big * pHit * 0.3;
        return a + pFail(m.sv[e.save || 'str'], hc.dc) * v * ((u.saveEnds || e.saveEnds) ? (u.escapeDisadvantage ? 2.4 : 1.8) : 1) * (e.aiWeight ?? 1);
      }, 0);
    }
    case 'daze': case 'hinder': case 'stun': {
      const n = targetCount(hc, e, e._area || 0);
      const cands = [...mons].sort((a, b) => b.dpr - a.dpr).slice(0, n);
      const f = e.type === 'daze' ? 0.3 * (e._linger ? 1.8 : 1) : e.type === 'hinder' ? 0.3 : 1;
      return cands.reduce((a, m) => a + pFail(m.sv[e.save || 'wis'], hc.dc) * (e.type === 'hinder' ? m.dpr / m.atk.length : m.dpr) * pHit * f, 0) + (e.type === 'stun' && e.exposed ? 0.2 * aff.reduce((a, p) => a + p.atkAvg, 0) : 0);
    }
    case 'expose': { const best = live.filter(p => p.conscious && p.atk).map(p => p.atkAvg).sort((a, b) => b - a); const k = Math.min(ev(hc, e.attacks ?? 1, 'avg'), 3); return targetCount(hc, e) * best.slice(0, k).reduce((a, x) => a + 0.2 * x, 0) * (e.save ? 0.5 : 1); }
    case 'veil': return Math.min(targetCount(hc, e), cons) * Math.min(1, perPC * pHit) * hitAvg * 0.3;
  }
  return 0;
}
const EMERGENCY = ['dropTo1', 'spendHitDie', 'revive'];
function optionEV(ctx, hc, o) {
  const mods = optionMods(hc, o);
  const area = mods.filter(e => e.type === 'area').reduce((a, e) => a + (e.amount || 1), 0), linger = mods.some(e => e.type === 'linger');
  const effs = [...(o.effects || []).map(e => ({ ...e, _area: area, _linger: linger })), ...mods.filter(e => !['area', 'linger'].includes(e.type))];
  return effs.reduce((a, e) => a + effectEV(ctx, hc, e), 0);
}
function chooseOptions(ctx, hc, f, free, dry) {
  if (!ready(hc, f)) return null;
  free = free || !!(ctx.dur.freeSys && f.systems);
  if (!free && f.cost && (hc.res[f.cost] || 0) <= 0) return null;
  const evs = (hc.known[f.id] || []).filter(o => free || !f.cost || f.costPer !== 'option' || (hc.res[f.cost] || 0) >= (o.cost || 1)).map(o => [o, optionEV(ctx, hc, o)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  if (!evs.length) return null;
  const em = (evs[0][0].effects || []).some(e => EMERGENCY.includes(e.type));
  const sp = f.costPer === 'option' ? 'res' : 'uses';
  if (!free && !em && f.cost && hc.spent[f.id] >= hc.share[f.id]) return null;
  let count = (f.choose && f.choose.count) || 1;
  for (const [pf, e] of passives(hc, 'extraChoice')) if (e.feature === f.id && evs.length > count && hasUse(hc, pf) && (free || !f.cost || f.costPer !== 'option' || hc.res[f.cost] > count)) { if (!dry) spendUse(hc, pf); count += e.count || 1; }
  const out = evs.slice(0, count).map(x => x[0]);
  out.ev = evs.slice(0, count).reduce((a, x) => a + x[1], 0);
  return out;
}
function useChoice(ctx, hc, f, opts, free) {
  const noCost = free || !!(ctx.dur.freeSys && f.systems);
  if (!noCost && f.cost) { const k = f.costPer === 'option' ? opts.reduce((a, o) => a + (o.cost || 1), 0) : 1; hc.res[f.cost] -= k; hc.spent[f.id] += k; credit(ctx, hc, f.cost, 'count', 0, k); }
  for (const o of opts) {
    const mods = optionMods(hc, o);
    const area = mods.filter(e => e.type === 'area').reduce((a, e) => a + (e.amount || 1), 0), lg = mods.find(e => e.type === 'linger');
    applyEffects(ctx, hc, o, [...(o.effects || []).map(e => ({ ...e, _area: area, _linger: !!lg, _single: !!(lg && lg.single) })), ...mods.filter(e => !['area', 'linger'].includes(e.type))]);
  }
  for (const af of fx(hc, 'afterChoice')) if (af.feature === f.id || (Array.isArray(af.feature) && af.feature.includes(f.id))) applyEffects(ctx, hc, af, af.effects);
  const an = hc.def.aura && hc.def.aura.anchor;
  if (an && an.plant === 'withBonusAction' && !free && !hc.planted && !hc.anchorBroken) { hc.planted = true; log(ctx, 'wc', `The ${an.name || 'anchor'} is planted`); }
}
function applyEffects(ctx, hc, src, effects, dur) {
  const cha = mod(hc.sc.cha);
  let logged = false;
  for (const e of effects || []) {
    const tg = () => pickTargets(ctx, hc, e.targets, e.revive);
    let note = '';
    switch (e.type) {
      case 'tempHp': {
        const base = ev(hc, e.amount);
        const selfExtra = e.selfAmount ? ev(hc, e.selfAmount, 'avg') - ev(hc, e.amount, 'avg') : 0;
        for (const p of tg().slice(0, targetCount(hc, e))) {
          const r = (e.rollOnce === false ? ev(hc, e.amount) : base) + (p === hc ? selfExtra : 0);
          if (r > p.thp) { p.thp = r; p.thpSrc = src.id; }
        }
        note = ` (${base} temp HP)`; break;
      }
      case 'bonusDamage': for (const p of tg()) p.f.bonusDmg = { id: src.id, amount: e.amount, once: e.oncePerTurn !== false }; break;
      case 'advantageVsMark': ctx.mark = focus(ctx); ctx.markSrc = src.id; for (const p of tg()) { p.f.mark = true; p.f.markUsed = false; } if (ctx.mark) note = ` on ${ctx.mark.name}`; break;
      case 'resistNext': for (const p of tg()) p.f.resistNext = src.id; break;
      case 'dropTo1': for (const p of tg()) p.f.dropTo1 = src.id; break;
      case 'saveAdvantage': for (const p of tg()) p.f.saveAdv = src.id; break;
      case 'gatherAura': ctx.advance = true; for (const p of ctx.party) if (p.conscious) p.inAura = true; credit(ctx, hc, src.id, 'count', 0); break;
      case 'frighten': { let k = 0; for (const m of tg()) if (d(20) + (m.sv[e.save || 'wis'] ?? 0) < hc.dc) { m.fright = src.id; k++; } note = ` (${k} Frightened)`; break; }
      case 'taunt': for (const m of tg().slice(0, targetCount(hc, e))) if (d(20) + (m.sv[e.save || 'wis'] ?? 0) < hc.dc) { m.taunt = src.id; credit(ctx, hc, src.id, 'count', 0); log(ctx, 'wc', `${src.name}: ${m.name} is drawn to the ${hc.name}`); } break;
      case 'spendHitDie':
        for (const p of tg()) {
          if (p.hdLeft <= 0 && p.conscious) continue;
          let h = 0;
          if (!p.conscious && e.revive) h += heal(ctx, p, 1);
          if (p.hdLeft > 0) { p.hdLeft--; h += heal(ctx, p, d(p.hd) + mod(p.sc.con)); }
          credit(ctx, hc, src.id, 'heal', h);
        }
        break;
      case 'freeChoice': {
        const cf = hc.feats.find(x => x.id === e.feature);
        if (cf) { const o = chooseOptions(ctx, hc, cf, true); if (o) { credit(ctx, hc, src.id, 'count', 0); useChoice(ctx, hc, cf, o, true); } }
        break;
      }
      case 'snare': {
        const u = snareUpg(hc); let k = 0, n = targetCount(hc, e, u.targets2 ? 1 : 0);
        for (const m of tg().filter(x => !x.snare).slice(0, n)) {
          if (!monSave(ctx, hc, m, e.save || 'str', src)) { m.snare = { oncePerTurn: !!e.checkOncePerTurn, proneId: (passives(hc, 'snareUpgrade').find(([, x]) => x.proneOnFail) || [{}])[0].id, id: src.id, check: !!e.attackCheck, checkDis: !!u.checkDisadvantage, prone: !!u.proneOnFail, dc: hc.dc, fewer: e.attacks === 'oneFewer', saveEnds: !!(u.saveEnds || e.saveEnds), escDis: !!u.escapeDisadvantage, exposed: !!u.exposed, dis: !!u.disadvantage, save: e.save || 'str', rounds: 10 }; k++; }
        }
        note = ` (${k} Snared)`; break;
      }
      case 'daze': case 'hinder': case 'stun': {
        const n = targetCount(hc, e, e._area || 0); let k = 0;
        if (e._single) for (const m of ctx.monsters) if (m.daze && m.daze.id === src.id) m.daze = null;
        const pool = e.targets === 'enemiesArea' ? tg().slice(0, n) : tg().sort((a, b) => b.dpr - a.dpr).slice(0, n);
        for (const m of pool) if (!monSave(ctx, hc, m, e.save || 'wis', src)) {
          k++;
          if (e.type === 'daze') m.daze = { id: src.id, saveEnds: !!e._linger, save: e.save || 'wis', rounds: e._linger ? 10 : 1 };
          if (e.type === 'hinder') m.hinder = src.id;
          if (e.type === 'stun') { m.stun = src.id; if (e.exposed) m.exposed = { id: src.id, left: 99, until: 'targetEnd' }; }
        }
        note = ` (${k} affected)`; break;
      }
      case 'expose': {
        for (const m of tg().slice(0, targetCount(hc, e))) {
          if (e.save && monSave(ctx, hc, m, e.save, src)) continue;
          m.exposed = { id: src.id, left: Math.floor(ev(hc, e.attacks ?? 1, 'avg')), until: e.until || 'hcTurn' };
          note = ` on ${m.name}`;
        }
        break;
      }
      case 'veil': for (const p of tg().slice(0, targetCount(hc, e))) { if (e.once) p.f.veilOnce = src.id; else p.f.veil = src.id; } break;
      case 'revive': for (const p of tg()) { heal(ctx, p, 1); credit(ctx, hc, src.id, 'count', 0); note = `: ${p.name} gets up`; } break;
      case 'gainResource': { const cur = hc.res[e.resource] || 0; if (!e.ifEmpty || cur <= 0) { hc.res[e.resource] = cur + ev(hc, e.amount ?? 1, 'avg'); } break; }
      case 'damage': {
        const n = targetCount(hc, e, e._area || 0); let tot = 0, k = 0;
        const pool = e.targets === 'enemiesArea' ? tg().slice(0, n) : tg().slice(0, n);
        const dmg = ev(hc, e.amount);
        for (const m of pool) {
          const ok = monSave(ctx, hc, m, e.save || 'dex', src);
          const x = ok ? (e.half === false ? 0 : Math.floor(dmg / 2)) : dmg;
          const before = m.hp; damageMon(ctx, m, x); tot += Math.min(before, x); k++;
          if (!ok && e.prone && m.hp > 0) { m.prone = src.id; m.exposed = { id: src.id, left: 99, until: 'targetTurn' }; }
        }
        credit(ctx, hc, src.id, 'dealt', tot);
        note = ` (${tot} damage to ${k})`; break;
      }
      case 'repairSuit': {
        if (!hc.suit) break;
        const amt = ev(hc, e.amount);
        const g = Math.min(amt, hc.suitMax - hc.suitHp);
        hc.suitHp += g; credit(ctx, hc, src.id, 'heal', g);
        if (!hc.suitOn && hc.suitHp > 0) setSuit(ctx, hc, true);
        note = ` (suit +${g} HP)`; break;
      }
      case 'freeSystems': ctx.dur.freeSys = { rounds: dur || 10 }; break;
      case 'suitFloor': ctx.dur.suitFloor = { rounds: dur || 10 }; break;
      case 'auraSize': ctx.dur.aura = { size: ev(hc, e.amount, 'avg'), rounds: dur || 10 }; break;
      case 'rollBonus': ctx.dur.roll = { id: src.id, rolls: e.rolls || ['attack'], amount: e.amount, rounds: dur || 10 }; break;
      case 'regen': ctx.dur.regen = { id: src.id, amount: e.amount, rounds: dur || 10 }; break;
    }
    if (src.name && ['tempHp', 'bonusDamage', 'advantageVsMark', 'resistNext', 'dropTo1', 'saveAdvantage', 'gatherAura', 'frighten', 'spendHitDie', 'auraSize', 'snare', 'daze', 'hinder', 'stun', 'expose', 'veil', 'revive', 'damage', 'repairSuit'].includes(e.type) && !logged) { logged = true; log(ctx, 'wc', `${hc.name} uses ${src.name}${note}`); }
  }
}
function hbTurn(ctx, hc) {
  for (const p of ctx.party) { p.f.bonusDmg = null; p.f.mark = false; p.f.resistNext = null; p.f.dropTo1 = null; p.f.saveAdv = null; p.f.veil = null; p.f.veilOnce = null; }
  ctx.mark = null;
  for (const m of ctx.monsters) { m.taunt = null; if (m.exposed && m.exposed.until === 'hcTurn') m.exposed = null; }
  hc.reaction = true; hc.resUsed = false;
  for (const k of Object.keys(ctx.dur)) if (ctx.dur[k] && --ctx.dur[k].rounds <= 0) ctx.dur[k] = null;
  position(ctx, hc);
  if (!hc.conscious) return deathSave(ctx, hc);
  let bonus = false;
  const ba = fx(hc, 'bonusAction');
  const first = ba.find(f => f.ai === 'firstRound' && !f.choose && ctx.round === 1 && hasUse(hc, f));
  if (first) { spendUse(hc, first); applyEffects(ctx, hc, first, first.effects, first.duration); bonus = true; position(ctx, hc); }
  else {
    let best = null;
    for (const f of ba) {
      if (f.ai === 'firstRound') continue;
      if (f.choose) { const o = chooseOptions(ctx, hc, f, false, true); if (o && (!best || o.ev > best.ev)) best = { f, ev: o.ev }; }
      else if (hasUse(hc, f)) {
        const v = (f.effects || []).reduce((a, e) => a + effectEV(ctx, hc, e), 0);
        const left = f.uses ? hc.uses[f.id] : 99;
        if (v > 0 && (left > 50 || !f.uses || true) && (!best || v > best.ev)) best = { f, ev: v };
      }
    }
    if (best) {
      const f = best.f;
      if (f.choose) { const o = chooseOptions(ctx, hc, f, false); if (o) { useChoice(ctx, hc, f, o, false); bonus = true; } }
      else { spendUse(hc, f); applyEffects(ctx, hc, f, f.effects, f.duration); bonus = true; }
    }
  }
  const an = hc.def.aura && hc.def.aura.anchor;
  if (an && !bonus && !hc.planted && !hc.anchorBroken) { hc.planted = true; log(ctx, 'wc', `${hc.name} plants the ${an.name || 'anchor'}`); }
  let attacks = hc.nAtk;
  for (const f of fx(hc, 'action')) {
    if (!f.choose || !focus(ctx)) continue;
    const replace = hc.nAtk > 1 && passives(hc, 'replaceAttack').some(([, e]) => e.feature === f.id);
    const atkValue = (replace ? 1 : attacks) * hc.atkAvg * 0.6;
    const o = chooseOptions(ctx, hc, f, false, true);
    if (o && o.ev > atkValue) {
      const real = chooseOptions(ctx, hc, f, false);
      if (real) { useChoice(ctx, hc, f, real, false); attacks = replace ? attacks - 1 : 0; }
    }
    break;
  }
  for (let i = 0; i < attacks; i++) {
    const t = focus(ctx); if (!t) break;
    if (!pcAttack(ctx, hc, t) && ctx.log) log(ctx, 'wc-miss', `${hc.name} misses ${t.name}`);
  }
}
function acBonus(ctx, t) {
  const hc = ctx.hc;
  if (!hc || !hc.conscious) return [0, null];
  for (const [f, e] of passives(hc, 'acBonus')) {
    const ok = e.targets === 'self' ? t === hc : e.targets === 'aura' ? (t !== hc && t.inAura) : inAuraOf(hc, t);
    if (ok) return [ev(hc, e.amount, 'avg'), f.id];
  }
  return [0, null];
}

// ----- Baseline classes (SRD) -----
const CLS = {
  hb: HB,
  paladin: {
    name: 'Paladin',
    build(L) {
      const sc = ASI(L, { str: 16, con: 14, cha: 14, wis: 12 }, [[4, 'str', 2], [8, 'str', 2], [12, 'cha', 2], [16, 'cha', 2], [19, 'con', 2]]);
      const pc = basePC({ name: 'Paladin', cls: 'paladin', L, sc, hd: 10, saves: ['wis', 'cha'], ac: (L >= 5 ? 20 : 18) + (L >= 2 ? 1 : 0), role: 'front' });
      const s = mod(sc.str);
      Object.assign(pc, { atk: { hit: PB(L) + s, dmg: spec('1d8+' + s), mastery: 'sap' }, nAtk: L >= 5 ? 2 : 1, slotsMax: HALF[L - 1], atkAvg: 4.5 + s + (L >= 11 ? 4.5 : 0) });
      return pc;
    },
    startDay(p) { p.slots = [...p.slotsMax]; p.loh = 5 * p.L; },
    startFight(p, ctx) { p.smiteShare = Math.ceil(p.slots.reduce((a, b) => a + b, 0) / (ctx.fights - ctx.fi)); p.smiteFight = 0; },
    turn(ctx, p) {
      const pA = clamp(ctx.cfg.tight * (p.L >= 18 ? 30 : 10) / 15, 0, 1);
      for (const q of ctx.party) q.inPal = q === p || R() < pA;
      if (!p.conscious) return deathSave(ctx, p);
      let bonus = false;
      const down = ctx.party.filter(x => !x.dead && !x.conscious);
      if (down.length && p.loh > 0) { const amt = Math.min(p.loh, Math.max(5, Math.round(down[0].maxHp * 0.4))); p.loh -= amt; heal(ctx, down[0], amt, p, 'loh'); bonus = true; }
      else if (p.hp < p.maxHp * 0.3 && p.loh > 0) { const amt = Math.min(p.loh, p.maxHp - p.hp); p.loh -= amt; heal(ctx, p, amt, p, 'loh'); bonus = true; }
      for (let i = 0; i < p.nAtk; i++) {
        const t = focus(ctx); if (!t) break;
        pcAttack(ctx, p, t, {
          onHit: crit => {
            let x = 0;
            if (p.L >= 11) { const v = nd(crit ? 2 : 1, 8); credit(ctx, p, 'radiant', 'dealt', v); x += v; }
            if (!bonus) {
              const avail = p.slots.map((n, i2) => n > 0 ? i2 + 1 : 0).filter(Boolean);
              let lv = 0;
              if (avail.length) { if (crit) lv = avail[avail.length - 1]; else if (p.smiteFight < p.smiteShare) lv = avail[0]; }
              if (lv) { bonus = true; p.slots[lv - 1]--; p.smiteFight++; const v = nd((1 + lv) * (crit ? 2 : 1), 8); credit(ctx, p, 'smite', 'dealt', v); x += v; }
            }
            return x;
          },
        });
      }
    },
  },
  fighter: {
    name: 'Fighter',
    build(L) {
      const sc = ASI(L, { str: 16, con: 14, dex: 12, wis: 12, cha: 8 }, [[4, 'str', 2], [6, 'str', 2], [8, 'con', 2], [12, 'con', 2], [14, 'dex', 2], [16, 'wis', 2], [19, 'con', 2]]);
      const pc = basePC({ name: 'Fighter', cls: 'fighter', L, sc, hd: 10, saves: ['str', 'con'], ac: (L >= 5 ? 18 : 16) + 1, role: 'front' });
      const s = mod(sc.str);
      Object.assign(pc, { atk: { hit: PB(L) + s, dmg: spec('2d6+' + s), minDie: 3, mastery: 'graze' }, nAtk: L >= 20 ? 4 : L >= 11 ? 3 : L >= 5 ? 2 : 1, atkAvg: 8.7 + s });
      return pc;
    },
    startDay(p) { p.surgeMax = p.L >= 17 ? 2 : p.L >= 2 ? 1 : 0; p.surge = p.surgeMax; p.swMax = step(p.L, [[1, 2], [4, 3], [10, 4]]); p.sw = p.swMax; },
    shortRest(p) { p.surge = p.surgeMax; p.sw = Math.min(p.swMax, p.sw + 1); },
    turn(ctx, p) {
      if (!p.conscious) return deathSave(ctx, p);
      if (p.hp < p.maxHp * 0.5 && p.sw > 0) { p.sw--; heal(ctx, p, d(10) + p.L, p, 'secondwind'); }
      let reps = 1;
      if (ctx.round === 1 && p.surge > 0) { p.surge--; reps = 2; }
      const g = mod(p.sc.str);
      for (let r = 0; r < reps; r++) for (let i = 0; i < p.nAtk; i++) {
        const t = focus(ctx); if (!t) return;
        pcAttack(ctx, p, t, { onMiss: () => { damageMon(ctx, t, g, p); credit(ctx, p, 'graze', 'dealt', g); } });
      }
    },
  },
  rogue: {
    name: 'Rogue',
    build(L) {
      const sc = ASI(L, { dex: 16, con: 14, wis: 12, cha: 10, str: 8 }, [[4, 'dex', 2], [8, 'dex', 2], [10, 'con', 2], [12, 'wis', 2], [16, 'con', 2]]);
      const pc = basePC({ name: 'Rogue', cls: 'rogue', L, sc, hd: 8, saves: ['dex', 'int'], ac: (L >= 5 ? 12 : 11) + mod(sc.dex), role: 'back' });
      const x = mod(sc.dex), sn = Math.ceil(L / 2);
      Object.assign(pc, { atk: { hit: PB(L) + x, dmg: spec('1d8+' + x) }, sneak: sn, atkAvg: 4.5 + x + sn * 3.5 });
      return pc;
    },
    turn(ctx, p) {
      if (!p.conscious) return deathSave(ctx, p);
      const t = focus(ctx); if (!t) return;
      pcAttack(ctx, p, t, { adv: R() < 0.5 ? 'self' : null, onHit: crit => { const v = nd(p.sneak * (crit ? 2 : 1), 6); credit(ctx, p, 'sneak', 'dealt', v); return v; } });
    },
  },
  cleric: {
    name: 'Cleric',
    build(L) {
      const sc = ASI(L, { wis: 16, con: 14, str: 12, cha: 10 }, [[4, 'wis', 2], [8, 'wis', 2], [12, 'con', 2], [16, 'con', 2]]);
      const pc = basePC({ name: 'Cleric', cls: 'cleric', L, sc, hd: 8, saves: ['wis', 'cha'], ac: 18, role: 'mid' });
      Object.assign(pc, { dc: 8 + PB(L) + mod(sc.wis), slotsMax: FULL[L - 1] });
      return pc;
    },
    startDay(p) { p.slots = [...p.slotsMax]; },
    turn(ctx, p) {
      if (!p.conscious) return deathSave(ctx, p);
      const down = ctx.party.filter(x => !x.dead && !x.conscious);
      if (down.length) {
        const i = p.slots.findIndex(n => n > 0);
        if (i >= 0) { p.slots[i]--; const g = heal(ctx, down[0], nd(2 * (i + 1), 4) + mod(p.sc.wis)); log(ctx, 'heal', `Cleric casts Healing Word: ${down[0].name} back up with ${g} HP`); }
      }
      if (p.L >= 5 && !p.f.sg) {
        let i = -1; for (let k = 2; k < p.slots.length; k++) if (p.slots[k] > 0) { i = k; break; }
        if (i >= 0) { p.slots[i]--; p.f.sg = i + 1; log(ctx, 'sys', 'Cleric casts Spirit Guardians'); return; }
      }
      const t = focus(ctx); if (!t) return;
      const tier = step(p.L, [[1, 1], [5, 2], [11, 3], [17, 4]]);
      if (d(20) + t.sv.wis < p.dc) damageMon(ctx, t, nd(tier, 12) + (p.L >= 7 ? mod(p.sc.wis) : 0), p);
    },
  },
};


// ----- SRD 5.2.1 comparison classes (seat only; simplified play) -----
const tierOf = L => step(L, [[1, 1], [5, 2], [11, 3], [17, 4]]);
const liveMons = ctx => ctx.monsters.filter(m => m.hp > 0);
function monSaves(m, ab, dc) { return d(20) + (m.sv[ab] ?? 0) >= dc; }
function hasSlot(p, min) { for (let i = min - 1; i < p.slots.length; i++) if (p.slots[i] > 0) return i + 1; return 0; }
function takeSlot(p, min) { const lv = hasSlot(p, min); if (lv) p.slots[lv - 1]--; return lv; }
function slotBudget(p, ctx) { p.castShare = Math.ceil(p.slots.reduce((a, b) => a + b, 0) / Math.max(1, ctx.fights - ctx.fi)); p.castFight = 0; p.conc = null; }
function canCast(p, min) { return p.castFight < p.castShare && hasSlot(p, min); }
function cast(p, min) { const lv = takeSlot(p, min); if (lv) p.castFight++; return lv; }
function untilRest(ctx) { return Math.max(1, ctx.srAt > ctx.fi ? ctx.srAt - ctx.fi : ctx.fights - ctx.fi); }
function areaPick(ctx, n) { return liveMons(ctx).sort(() => R() - 0.5).slice(0, n); }
function saveSpell(ctx, p, targets, dmg, ab, key, half = true) {
  let tot = 0;
  for (const m of targets) { const ok = monSaves(m, ab, p.dc); const x = ok ? (half ? Math.floor(dmg / 2) : 0) : dmg; const b = m.hp; damageMon(ctx, m, x); tot += Math.min(b, x); }
  credit(ctx, p, key, 'dealt', tot);
  if (ctx.log) log(ctx, 'wc', `${p.name} casts ${LABEL[key] || key} (${tot} damage)`);
  return tot;
}
function spellAttack(ctx, p, t, dmgSpec, key, o = {}) {
  if (!t) return false;
  const r = d20(!!o.adv, false), crit = r.nat === 20, hit = crit || (r.nat !== 1 && r.nat + p.spellHit >= t.ac);
  let x = 0;
  if (hit) x = roll(dmgSpec, crit) + (o.bonus || 0); else if (o.halfOnMiss) x = Math.floor((roll(dmgSpec) + (o.bonus || 0)) / 2);
  if (x > 0) { const b = t.hp; damageMon(ctx, t, x); credit(ctx, p, key, 'dealt', Math.min(b, x)); }
  return hit;
}
function healingWord(ctx, p, abil, lifeBonus) {
  const down = ctx.party.filter(x => !x.dead && !x.conscious);
  if (!down.length) return false;
  const lv = takeSlot(p, 1); if (!lv) return false;
  const g = heal(ctx, down[0], nd(2 * lv, 4) + abil + (lifeBonus ? 2 + lv : 0), p, 'healingWord');
  log(ctx, 'heal', `${p.name} casts Healing Word: ${down[0].name} back up with ${g} HP`);
  return true;
}
function endConc(ctx, p) {
  if (!p.conc) return;
  if (p.conc.kind === 'hypnotic') for (const m of ctx.monsters) if (m.mez && m.mez.by === p) m.mez = null;
  p.conc = null;
}
function recoverSlots(p, budget, maxLv = 5) {
  for (let lv = Math.min(maxLv, p.slots.length); lv >= 1 && budget > 0; lv--) while (budget >= lv && p.slots[lv - 1] < p.slotsMax[lv - 1]) { p.slots[lv - 1]++; budget -= lv; }
}
const SEAT_CLS = {
  barbarian: {
    name: 'Barbarian',
    build(L) {
      const sc = ASI(L, { str: 16, dex: 14, con: 14, wis: 12 }, [[4, 'str', 2], [8, 'str', 2], [12, 'con', 2], [16, 'con', 2], [19, 'con', 2]]);
      if (L >= 20) { sc.str = Math.min(24, sc.str + 4); sc.con = Math.min(24, sc.con + 4); }
      const pc = basePC({ name: 'Barbarian', cls: 'barbarian', L, sc, hd: 12, saves: ['str', 'con'], ac: L >= 5 ? 17 : 16, role: 'front' });
      const s = mod(sc.str);
      Object.assign(pc, { atk: { hit: PB(L) + s, dmg: spec('2d6+' + s), minDie: 0, mastery: 'graze' }, nAtk: L >= 5 ? 2 : 1, atkAvg: 7 + s,
        rageMax: step(L, [[1, 2], [3, 3], [6, 4], [12, 5], [17, 6]]), rageDmg: step(L, [[1, 2], [9, 3], [16, 4]]) });
      return pc;
    },
    startDay(p) { p.rage = p.rageMax; p.relentDC = 10; },
    shortRest(p) { p.rage = Math.min(p.rageMax, p.rage + 1); p.relentDC = 10; },
    startFight(p) { p.raging = false; p.f.reckless = false; },
    turn(ctx, p) {
      p.f.reckless = false;
      if (!p.conscious) return deathSave(ctx, p);
      if (!p.raging && p.rage > 0) { p.rage--; p.raging = true; log(ctx, 'sys', 'Barbarian rages'); }
      p.f.reckless = true;
      let frenzy = p.L >= 3 && p.raging;
      const g = mod(p.sc.str);
      for (let i = 0; i < p.nAtk; i++) {
        const t = focus(ctx); if (!t) return;
        const brutal = p.L >= 9 && i === 0;
        pcAttack(ctx, p, t, {
          adv: brutal ? null : 'self',
          onMiss: () => { damageMon(ctx, t, g); credit(ctx, p, 'graze', 'dealt', g); },
          onHit: crit => {
            let x = 0;
            if (p.raging) { x += p.rageDmg; credit(ctx, p, 'rage', 'dealt', p.rageDmg); }
            if (frenzy) { frenzy = false; const v = nd(p.rageDmg * (crit ? 2 : 1), 6); x += v; credit(ctx, p, 'frenzy', 'dealt', v); }
            if (brutal) { const v = nd((p.L >= 17 ? 2 : 1) * (crit ? 2 : 1), 10); x += v; credit(ctx, p, 'brutal', 'dealt', v); }
            return x;
          },
        });
      }
    },
    onDamage(ctx, p, dmg, info) { if (p.raging && info.bps) { const h = Math.floor(dmg / 2); credit(ctx, p, 'rageRes', 'prevent', dmg - h); return h; } return dmg; },
    afterDamage(ctx, p, info) {
      if (p.L >= 10 && p.reaction && info.attacker && info.attacker.hp > 0) { p.reaction = false; pcAttack(ctx, p, info.attacker, { key: 'retaliation' }); }
    },
    onDrop(ctx, p) {
      if (p.L >= 11 && p.raging && d(20) + p.sv.con >= p.relentDC) { p.relentDC += 5; p.hp = 2 * p.L; credit(ctx, p, 'relentless', 'count', 0); ctx.S.saved++; log(ctx, 'heal', 'Relentless Rage: the Barbarian stays up'); return true; }
      return false;
    },
  },
  bard: {
    name: 'Bard',
    build(L) {
      const sc = ASI(L, { cha: 16, dex: 14, con: 14, wis: 12 }, [[4, 'cha', 2], [8, 'cha', 2], [12, 'dex', 2], [16, 'con', 2], [19, 'con', 2]]);
      const pc = basePC({ name: 'Bard', cls: 'bard', L, sc, hd: 8, saves: ['dex', 'cha'], ac: (L >= 5 ? 12 : 11) + mod(sc.dex), role: 'mid' });
      Object.assign(pc, { dc: 8 + PB(L) + mod(sc.cha), spellHit: PB(L) + mod(sc.cha), slotsMax: FULL[L - 1], inspDie: step(L, [[1, 6], [5, 8], [10, 10], [15, 12]]), inspMax: Math.max(1, mod(sc.cha)) });
      return pc;
    },
    startDay(p) { p.slots = [...p.slotsMax]; p.insp = p.inspMax; },
    shortRest(p) { if (p.L >= 5) p.insp = p.inspMax; },
    startFight(p, ctx) { slotBudget(p, ctx); },
    turn(ctx, p) {
      if (!p.conscious) return deathSave(ctx, p);
      if (!healingWord(ctx, p, mod(p.sc.cha)) && p.insp > (p.L >= 3 ? 1 : 0)) {
        const ally = ctx.party.filter(q => q !== p && q.conscious && q.atk && !q.f.insp).sort((a, b) => b.atkAvg * b.nAtk - a.atkAvg * a.nAtk)[0];
        if (ally) { p.insp--; ally.f.insp = { die: p.inspDie, by: p }; }
      }
      const mons = liveMons(ctx); if (!mons.length) return;
      if (!p.conc && mons.length >= 2 && p.L >= 5 && canCast(p, 3)) {
        cast(p, 3); p.conc = { kind: 'hypnotic' }; let k = 0;
        for (const m of areaPick(ctx, 3)) if (!monSaves(m, 'wis', p.dc)) { m.mez = { by: p, id: 'hypnotic' }; k++; }
        log(ctx, 'wc', `Bard casts Hypnotic Pattern (${k} entranced)`); return;
      }
      if (p.L >= 10 && mons.length >= 2 && canCast(p, 3)) { const lv = cast(p, 3); saveSpell(ctx, p, areaPick(ctx, 3), nd(5 + lv, 6), 'dex', 'fireball'); return; }
      if (p.L >= 3 && mons.length >= 2 && canCast(p, 2)) { const lv = cast(p, 2); saveSpell(ctx, p, areaPick(ctx, 2), nd(1 + lv, 8), 'con', 'shatter'); return; }
      const t = [...mons].sort((a, b) => b.dpr - a.dpr)[0];
      if (!monSaves(t, 'wis', p.dc)) {
        const x = nd(tierOf(p.L), 6), b = t.hp; damageMon(ctx, t, x); credit(ctx, p, 'mockery', 'dealt', Math.min(b, x));
        if (t.hp > 0) { t.hinder = 'mockery'; t.hinderBy = p; }
      }
    },
    guard(ctx, p, tgt, m, s, r) {
      if (p.L < 3 || !p.reaction || p.insp <= 0 || r.total - r.ac >= p.inspDie) return false;
      if (s.avg < 6 && tgt.hp > s.avg * 2) return false;
      p.reaction = false; p.insp--;
      if (r.total - d(p.inspDie) < r.ac) { credit(ctx, p, 'cuttingWords', 'prevent', s.avg); return true; }
      return false;
    },
  },
  lifeCleric: {
    name: 'Cleric',
    build(L) { const pc = CLS.cleric.build(L); pc.cls = 'lifeCleric'; pc.name = 'Cleric (seat)'; pc.cdMax = L >= 18 ? 4 : L >= 6 ? 3 : L >= 2 ? 2 : 0; return pc; },
    startDay(p) { p.slots = [...p.slotsMax]; p.cd = p.cdMax; },
    shortRest(p) { p.cd = Math.min(p.cdMax, p.cd + 1); },
    turn(ctx, p) {
      if (!p.conscious) return deathSave(ctx, p);
      healingWord(ctx, p, mod(p.sc.wis), true);
      const hurt = ctx.party.filter(x => !x.dead && x.conscious && x.hp < x.maxHp / 2);
      if (p.cd > 0 && hurt.length >= 2) {
        p.cd--; let pool = 5 * p.L;
        for (const q of hurt.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)) { const g = Math.min(pool, Math.floor(q.maxHp / 2) - q.hp); if (g > 0) { heal(ctx, q, g, p, 'preserveLife'); pool -= g; } }
        log(ctx, 'heal', 'Cleric uses Preserve Life'); return;
      }
      if (p.L >= 5 && !p.f.sg) {
        let i = -1; for (let k = 2; k < p.slots.length; k++) if (p.slots[k] > 0) { i = k; break; }
        if (i >= 0) { p.slots[i]--; p.f.sg = i + 1; log(ctx, 'sys', 'Cleric casts Spirit Guardians'); return; }
      }
      const t = focus(ctx); if (!t) return;
      if (!monSaves(t, 'wis', p.dc)) { const x = nd(tierOf(p.L), 12) + (p.L >= 7 ? mod(p.sc.wis) : 0), b = t.hp; damageMon(ctx, t, x); credit(ctx, p, 'toll', 'dealt', Math.min(b, x)); }
    },
  },
  druid: {
    name: 'Druid',
    build(L) {
      const sc = ASI(L, { wis: 16, con: 14, dex: 14, int: 10 }, [[4, 'wis', 2], [8, 'wis', 2], [12, 'con', 2], [16, 'con', 2], [19, 'con', 2]]);
      const pc = basePC({ name: 'Druid', cls: 'druid', L, sc, hd: 8, saves: ['int', 'wis'], ac: (L >= 5 ? 12 : 11) + mod(sc.dex) + 2, role: 'mid' });
      Object.assign(pc, { dc: 8 + PB(L) + mod(sc.wis), spellHit: PB(L) + mod(sc.wis), slotsMax: FULL[L - 1] });
      return pc;
    },
    startDay(p) { p.slots = [...p.slotsMax]; p.recovered = false; },
    shortRest(p) { if (p.L >= 6 && !p.recovered) { p.recovered = true; recoverSlots(p, Math.ceil(p.L / 2)); } },
    startFight(p, ctx) { slotBudget(p, ctx); },
    turn(ctx, p) {
      if (!p.conscious) return deathSave(ctx, p);
      healingWord(ctx, p, mod(p.sc.wis));
      const mons = liveMons(ctx); if (!mons.length) return;
      if (p.conc && p.conc.kind === 'moonbeam') { const t = areaPick(ctx, 1)[0]; if (t) saveSpell(ctx, p, [t], nd(p.conc.n, 10), 'con', 'moonbeam'); }
      if (!liveMons(ctx).length) return;
      if (p.L >= 5 && liveMons(ctx).length >= 2 && canCast(p, 3)) { const lv = cast(p, 3); saveSpell(ctx, p, areaPick(ctx, 3), nd(5 + lv, 6), 'dex', 'fireball'); return; }
      if (p.L >= 3 && !p.conc && canCast(p, 2)) { const lv = cast(p, 2); p.conc = { kind: 'moonbeam', n: lv }; const t = areaPick(ctx, 1)[0]; if (t) saveSpell(ctx, p, [t], nd(lv, 10), 'con', 'moonbeam'); return; }
      spellAttack(ctx, p, focus(ctx), spec(tierOf(p.L) + (p.L >= 3 ? 'd10' : 'd8')), 'cantrip');
    },
  },
  monk: {
    name: 'Monk',
    build(L) {
      const sc = ASI(L, { dex: 16, wis: 14, con: 14, str: 10 }, [[4, 'dex', 2], [8, 'dex', 2], [12, 'wis', 2], [16, 'wis', 2], [19, 'con', 2]]);
      if (L >= 20) { sc.dex = Math.min(25, sc.dex + 4); sc.wis = Math.min(25, sc.wis + 4); }
      const pc = basePC({ name: 'Monk', cls: 'monk', L, sc, hd: 8, saves: ['str', 'dex'].concat(L >= 14 ? ['con', 'int', 'wis', 'cha'] : []), ac: 10 + mod(sc.dex) + mod(sc.wis), role: 'front' });
      const x = mod(sc.dex), die = step(L, [[1, 6], [5, 8], [11, 10], [17, 12]]);
      Object.assign(pc, { atk: { hit: PB(L) + x, dmg: spec('1d' + die + '+' + x) }, nAtk: L >= 5 ? 2 : 1, atkAvg: (die + 1) / 2 + x, dc: 8 + PB(L) + mod(sc.wis), focusMax: L >= 2 ? L : 0, evasion: L >= 7 });
      return pc;
    },
    startDay(p) { p.focus = p.focusMax; },
    shortRest(p) { p.focus = p.focusMax; },
    startFight(p, ctx) { p.focusShare = Math.ceil(p.focus / untilRest(ctx)); p.focusUsed = 0; },
    turn(ctx, p) {
      if (!p.conscious) return deathSave(ctx, p);
      let stunTry = p.L >= 5;
      const spend = () => p.focus > 0 && p.focusUsed < p.focusShare;
      const strike = (flurry) => {
        const t = focus(ctx); if (!t) return false;
        pcAttack(ctx, p, t, {
          key: flurry ? 'flurry' : 'weapon',
          onHit: () => {
            if (stunTry && spend() && !t.stun && t.hp > 0) {
              stunTry = false; p.focus--; p.focusUsed++;
              if (!monSaves(t, 'con', p.dc)) { t.stun = 'stunningStrike'; t.stunBy = p; t.exposed = { id: 'stunningStrike', left: 99, until: 'targetEnd' }; log(ctx, 'wc', `Stunning Strike: ${t.name} is Stunned`); }
              else t.exposed = { id: 'stunningStrike', left: 1, until: 'targetTurn' };
            }
            if (flurry && p.L >= 3 && t.hp > 0 && !t.prone && !monSaves(t, 'dex', p.dc)) { t.prone = 'openHand'; if (!t.exposed) t.exposed = { id: 'openHand', left: 99, until: 'targetTurn' }; }
            return 0;
          },
        });
        return true;
      };
      for (let i = 0; i < p.nAtk; i++) if (!strike(false)) return;
      if (p.L >= 2 && spend()) { p.focus--; p.focusUsed++; for (let i = 0; i < (p.L >= 10 ? 3 : 2); i++) if (!strike(true)) return; }
      else strike(false);
    },
    onDamage(ctx, p, dmg, info) {
      if (p.L >= 3 && info.attack && p.reaction && dmg >= 6) { p.reaction = false; const r = Math.min(dmg, d(10) + mod(p.sc.dex) + p.L); credit(ctx, p, 'deflect', 'prevent', r); return dmg - r; }
      return dmg;
    },
  },
  ranger: {
    name: 'Ranger',
    build(L) {
      const sc = ASI(L, { dex: 16, wis: 14, con: 14, str: 10 }, [[4, 'dex', 2], [8, 'dex', 2], [12, 'wis', 2], [16, 'con', 2], [19, 'wis', 2]]);
      const x = mod(sc.dex);
      const pc = basePC({ name: 'Ranger', cls: 'ranger', L, sc, hd: 10, saves: ['str', 'dex'], ac: 12 + x, role: 'back' });
      Object.assign(pc, { atk: { hit: PB(L) + x + (L >= 2 ? 2 : 0), dmg: spec('1d8+' + x) }, nAtk: L >= 5 ? 2 : 1, atkAvg: 8 + x, slotsMax: HALF[L - 1],
        hmFreeMax: step(L, [[1, 2], [5, 3], [9, 4], [13, 5], [17, 6]]), hmDie: L >= 20 ? 10 : 6 });
      return pc;
    },
    startDay(p) { p.slots = [...p.slotsMax]; p.hmFree = p.hmFreeMax; },
    startFight(p) { p.conc = null; },
    onDamage(ctx, p, dmg, info) {
      if (p.L >= 15 && p.reaction && dmg >= 8) { p.reaction = false; const h = Math.floor(dmg / 2); credit(ctx, p, 'huntersDefense', 'prevent', dmg - h); return h; }
      return dmg;
    },
    turn(ctx, p) {
      if (!p.conscious) return deathSave(ctx, p);
      if (!p.conc && (p.hmFree > 0 || takeSlot(p, 1))) { if (p.hmFree > 0) p.hmFree--; p.conc = { kind: 'hm' }; }
      let slayer = p.L >= 3, prey = true;
      for (let i = 0; i < p.nAtk; i++) {
        const t = focus(ctx); if (!t) return;
        pcAttack(ctx, p, t, {
          adv: p.L >= 17 && p.conc ? 'self' : null,
          onHit: crit => {
            let x = 0;
            if (p.conc) {
              const v = nd(crit ? 2 : 1, p.hmDie); x += v; credit(ctx, p, 'huntersMark', 'dealt', v);
              if (p.L >= 11 && prey) { const o = liveMons(ctx).find(m => m !== t); if (o) { prey = false; const w = d(p.hmDie), b = o.hp; damageMon(ctx, o, w); credit(ctx, p, 'superiorPrey', 'dealt', Math.min(b, w)); } }
            }
            if (slayer && t.hp < t.max) { slayer = false; const v = nd(crit ? 2 : 1, 8); x += v; credit(ctx, p, 'colossus', 'dealt', v); }
            return x;
          },
        });
      }
    },
  },
  sorcerer: {
    name: 'Sorcerer',
    build(L) {
      const sc = ASI(L, { cha: 16, con: 14, dex: 14, wis: 10 }, [[4, 'cha', 2], [8, 'cha', 2], [12, 'con', 2], [16, 'con', 2], [19, 'dex', 2]]);
      const pc = basePC({ name: 'Sorcerer', cls: 'sorcerer', L, sc, hd: 6, saves: ['con', 'cha'], ac: Math.max(13 + mod(sc.dex), L >= 3 ? 10 + mod(sc.dex) + mod(sc.cha) : 0), role: 'back' });
      if (L >= 3) { pc.maxHp += L; pc.hp = pc.maxHp; }
      Object.assign(pc, { dcBase: 8 + PB(L) + mod(sc.cha), spellHit: PB(L) + mod(sc.cha), slotsMax: FULL[L - 1], affinity: L >= 6 ? mod(sc.cha) : 0 });
      pc.dc = pc.dcBase;
      return pc;
    },
    startDay(p) { p.slots = [...p.slotsMax]; p.innate = 2; },
    startFight(p, ctx) { slotBudget(p, ctx); p.innateOn = false; },
    turn(ctx, p) {
      if (!p.conscious) return deathSave(ctx, p);
      if (!p.innateOn && p.innate > 0 && ctx.round === 1) { p.innate--; p.innateOn = true; }
      p.dc = p.dcBase + (p.innateOn ? 1 : 0);
      const adv = p.innateOn, mons = liveMons(ctx); if (!mons.length) return;
      if (p.L >= 5 && mons.length >= 2 && canCast(p, 3)) { const lv = cast(p, 3); saveSpell(ctx, p, areaPick(ctx, 3), nd(5 + lv, 6) + p.affinity, 'dex', 'fireball'); return; }
      if (p.L >= 3 && canCast(p, 2)) { const lv = cast(p, 2); for (let i = 0; i < lv + 1; i++) spellAttack(ctx, p, focus(ctx), spec('2d6'), 'scorchingRay', { adv, bonus: i === 0 ? p.affinity : 0 }); return; }
      if (canCast(p, 1)) { const lv = cast(p, 1); spellAttack(ctx, p, focus(ctx), spec((2 + lv) + 'd8'), 'chromaticOrb', { adv }); return; }
      spellAttack(ctx, p, focus(ctx), spec(tierOf(p.L) + 'd10'), 'fireBolt', { adv, bonus: p.affinity });
    },
  },
  warlock: {
    name: 'Warlock',
    build(L) {
      const sc = ASI(L, { cha: 16, con: 14, dex: 14, wis: 10 }, [[4, 'cha', 2], [8, 'cha', 2], [12, 'con', 2], [16, 'con', 2], [19, 'dex', 2]]);
      const pc = basePC({ name: 'Warlock', cls: 'warlock', L, sc, hd: 8, saves: ['wis', 'cha'], ac: (L >= 5 ? 12 : 11) + mod(sc.dex), role: 'back' });
      const c = mod(sc.cha);
      Object.assign(pc, { dc: 8 + PB(L) + c, spellHit: PB(L) + c, pactMax: step(L, [[1, 1], [2, 2], [11, 3], [17, 4]]), pactLv: step(L, [[1, 1], [3, 2], [5, 3], [7, 4], [9, 5]]), beams: tierOf(L), ebBonus: L >= 2 ? c : 0 });
      return pc;
    },
    startDay(p) { p.pact = p.pactMax; p.arcana = [11, 13, 15, 17].filter(l => p.L >= l); p.hurl = p.L >= 14; },
    shortRest(p) { p.pact = p.pactMax; },
    startFight(p) { p.conc = null; },
    turn(ctx, p) {
      if (!p.conscious) return deathSave(ctx, p);
      const bless = () => { if (p.L >= 3) for (const m of ctx.monsters) if (m.hp <= 0 && !m.blessed) { m.blessed = true; const v = mod(p.sc.cha) + p.L; if (v > p.thp) { p.thp = v; p.thpSrc = 'darkBlessing'; p.thpOwner = p; } } };
      const mons = liveMons(ctx); if (!mons.length) return;
      if (p.arcana.length && mons.length >= 2) {
        const lv = p.arcana.pop();
        if (lv === 17) saveSpell(ctx, p, areaPick(ctx, 4), nd(40, 6), 'dex', 'arcanum');
        else if (lv === 15) saveSpell(ctx, p, areaPick(ctx, 3), nd(10, 8), 'dex', 'arcanum');
        else if (lv === 13) saveSpell(ctx, p, [mons.sort((a, b) => b.hp - a.hp)[0]], nd(7, 8) + 30, 'con', 'arcanum');
        else saveSpell(ctx, p, areaPick(ctx, 3), nd(8, 8), 'con', 'arcanum');
        bless(); return;
      }
      if (p.L >= 5 && mons.length >= 2 && p.pact > 0) { p.pact--; saveSpell(ctx, p, areaPick(ctx, 3), nd(5 + p.pactLv, 6), 'dex', 'fireball'); bless(); return; }
      if (!p.conc && p.pact > 0) { p.pact--; p.conc = { kind: 'hex' }; }
      for (let i = 0; i < p.beams; i++) {
        const t = focus(ctx); if (!t) break;
        if (spellAttack(ctx, p, t, spec('1d10'), 'eldritchBlast', { bonus: p.ebBonus }) && t.hp > 0) {
          if (p.conc) { const v = d(6), b = t.hp; damageMon(ctx, t, v); credit(ctx, p, 'hex', 'dealt', Math.min(b, v)); }
          if (p.hurl && t.hp > 0) { p.hurl = false; if (!monSaves(t, 'wis', p.dc)) { const v = nd(8, 10), b = t.hp; damageMon(ctx, t, v); credit(ctx, p, 'hurl', 'dealt', Math.min(b, v)); if (t.hp > 0) { t.stun = 'hurl'; t.stunBy = p; } } }
        }
        bless();
      }
    },
  },
  wizard: {
    name: 'Wizard',
    build(L) {
      const sc = ASI(L, { int: 16, con: 14, dex: 14, wis: 12 }, [[4, 'int', 2], [8, 'int', 2], [12, 'con', 2], [16, 'con', 2], [19, 'dex', 2]]);
      const pc = basePC({ name: 'Wizard', cls: 'wizard', L, sc, hd: 6, saves: ['int', 'wis'], ac: 13 + mod(sc.dex), role: 'back' });
      Object.assign(pc, { dc: 8 + PB(L) + mod(sc.int), spellHit: PB(L) + mod(sc.int), slotsMax: FULL[L - 1], empower: L >= 10 ? mod(sc.int) : 0, potent: L >= 3, acBase: pc.ac });
      return pc;
    },
    startDay(p) { p.slots = [...p.slotsMax]; p.recovered = false; },
    shortRest(p) { if (!p.recovered) { p.recovered = true; recoverSlots(p, Math.ceil(p.L / 2)); } },
    startFight(p, ctx) { slotBudget(p, ctx); p.ac = p.acBase; },
    turn(ctx, p) {
      p.ac = p.acBase;
      if (!p.conscious) return deathSave(ctx, p);
      const mons = liveMons(ctx); if (!mons.length) return;
      if (p.L >= 9 && mons.length >= 2 && canCast(p, 5)) { const lv = cast(p, 5); saveSpell(ctx, p, areaPick(ctx, 3), nd(3 + lv, 8) + p.empower, 'con', 'coneOfCold'); return; }
      if (p.L >= 5 && mons.length >= 2 && canCast(p, 3)) { const lv = cast(p, 3); saveSpell(ctx, p, areaPick(ctx, 3), nd(5 + lv, 6) + p.empower, 'dex', 'fireball'); return; }
      if (p.L >= 3 && canCast(p, 2)) { const lv = cast(p, 2); for (let i = 0; i < lv + 1; i++) spellAttack(ctx, p, focus(ctx), spec('2d6'), 'scorchingRay', { bonus: i === 0 ? p.empower : 0 }); return; }
      if (p.slots[0] > 2 && canCast(p, 1)) { cast(p, 1); const t = focus(ctx); const x = 3 * (d(4) + 1) + p.empower, b = t.hp; damageMon(ctx, t, x); credit(ctx, p, 'magicMissile', 'dealt', Math.min(b, x)); return; }
      spellAttack(ctx, p, focus(ctx), spec(tierOf(p.L) + 'd10'), 'fireBolt', { halfOnMiss: p.potent, bonus: p.empower });
    },
    guard(ctx, p, tgt, m, s, r) {
      if (tgt !== p || !p.reaction || r.total >= r.ac + 5 || p.slots[0] <= 0) return false;
      if (s.avg < 6 && p.hp > s.avg * 2) return false;
      p.reaction = false; p.slots[0]--; p.ac = p.acBase + 5; credit(ctx, p, 'shield', 'prevent', s.avg); return true;
    },
  },
};
Object.assign(CLS, SEAT_CLS);

// ----- Combat helpers -----
function focus(ctx) { let b = null; for (const m of ctx.monsters) if (m.hp > 0 && (!b || m.hp < b.hp)) b = m; return b; }
function damageMon(ctx, m, dmg) {
  if (m.hp <= 0 || dmg <= 0) return;
  if (m.mez) m.mez = null;
  m.hp -= dmg;
  if (m.hp <= 0) { m.hp = 0; log(ctx, 'mon', `${m.name} falls`); }
}
function heal(ctx, p, amt, owner, key) {
  if (p.dead || amt <= 0) return 0;
  if (!p.conscious) { p.hp = 0; p.conscious = true; p.stable = false; p.ds = { s: 0, f: 0 }; }
  const b = p.hp; p.hp = Math.min(p.maxHp, p.hp + amt);
  const g = p.hp - b; if (owner && key) credit(ctx, owner, key, 'heal', g);
  return g;
}
function kill(ctx, p) { p.dead = true; p.conscious = false; p.hp = 0; ctx.S.deaths++; log(ctx, 'ko', `${p.name} dies`); }
function deathSave(ctx, p) {
  if (p.dead || p.stable || p.conscious) return;
  const hc = ctx.hc;
  let src = null;
  if (hc && hc.conscious && p !== hc) for (const [f, e] of passives(hc, 'deathSaveAdvantage')) if (e.targets !== 'aura' || p.inAura) { src = f.id; break; }
  const r = d20(!!src, false);
  if (r.nat === 20) { p.hp = 1; p.conscious = true; p.ds = { s: 0, f: 0 }; if (src && r.alt < 10) credit(ctx, hc, src, 'count', 0); log(ctx, 'heal', `${p.name} rolls a 20 on a death save and gets up`); return; }
  if (r.nat === 1) p.ds.f += 2;
  else if (r.nat >= 10) { p.ds.s++; if (src && r.alt < 10) credit(ctx, hc, src, 'count', 0); }
  else p.ds.f++;
  if (p.ds.f >= 3) kill(ctx, p); else if (p.ds.s >= 3) p.stable = true;
}
function rollBonusFor(ctx, p, kind) {
  const hc = ctx.hc, rb = ctx.dur.roll;
  if (!rb || !hc || !hc.conscious || !rb.rolls.includes(kind) || !inAuraOf(hc, p)) return [0, null];
  return [ev(hc, rb.amount), rb.id];
}

function pcAttack(ctx, p, t, opt = {}) {
  const a = p.atk, hc = ctx.hc;
  const adv = [];
  if (ctx.mark === t && p.f.mark && !p.f.markUsed) { adv.push(ctx.markSrc); p.f.markUsed = true; }
  if (p.f.vex && p.f.vex.t === t) { adv.push(p.f.vex.id); p.f.vex = null; }
  if (t.exposed && t.exposed.left > 0) { adv.push(t.exposed.id); t.exposed.left--; }
  else if (t.snare && t.snare.exposed && p.role !== 'back') adv.push(t.snare.id);
  if (opt.adv) adv.push(opt.adv);
  if (p.f.advToken && !adv.length) { adv.push(p.f.advToken.id); p.f.advToken = null; }
  const [rb, rbId] = rollBonusFor(ctx, p, 'attack');
  const r = d20(adv.length > 0, false);
  let total = r.nat + a.hit + rb;
  const crit = r.nat === 20;
  let hit = crit || (r.nat !== 1 && total >= t.ac);
  let src = null;
  if (hit && !crit && rb && total - rb < t.ac) src = rbId;
  if (hit && r.mode === 'adv' && r.alt !== 20 && r.alt + a.hit + rb < t.ac && adv[0] !== 'self') src = src || adv[0];
  if (!hit && r.nat !== 1 && hc && p !== hc && hc.conscious && hc.reaction) {
    for (const f of fx(hc, 'reaction')) {
      if (f.trigger !== 'allyMiss' || !hasUse(hc, f)) continue;
      const range = (mods(hc, f.id).find(([, e]) => e.type === 'range') || [])[1]?.range || f.range || 'aura';
      if (!inRange(p, range)) continue;
      const e = (f.effects || []).find(x => x.type === 'addToRoll'); if (!e) continue;
      if (t.ac - total > ev(hc, e.amount, 'max')) continue;
      hc.reaction = false; spendUse(hc, f);
      const add = ev(hc, e.amount);
      if (total + add >= t.ac) { hit = true; src = f.id; log(ctx, 'wc', `${f.name}: ${p.name}'s miss becomes a hit (+${add})`); }
      break;
    }
  }
  let inspBy = null;
  if (!hit && r.nat !== 1 && p.f.insp && t.ac - total <= p.f.insp.die) {
    const add = d(p.f.insp.die); inspBy = p.f.insp.by; p.f.insp = null;
    if (total + add >= t.ac) hit = true; else inspBy = null;
  }
  if (!hit) { if (opt.onMiss) opt.onMiss(); return false; }
  const hpBefore = t.hp;
  const base = roll(a.dmg, crit, a.minDie);
  let extra = 0;
  if (p.f.bonusDmg && hc && (!p.f.bonusDmg.once || p.f.bonusDmgTurn !== ctx.turnId)) {
    p.f.bonusDmgTurn = ctx.turnId;
    const x = ev(hc, p.f.bonusDmg.amount) + (crit ? ev(hc, p.f.bonusDmg.amount) : 0);
    extra += x; credit(ctx, hc, p.f.bonusDmg.id, 'dealt', x);
  }
  if (opt.onHit) extra += opt.onHit(crit, t) || 0;
  if (p === hc && (!hc.suit || hc.suitOn)) for (const [f, e] of passives(hc, 'weaponDamage')) { const x = ev(hc, e.amount) + (crit && /d/.test(String(scaleAt(e.amount, hc.L))) ? ev(hc, e.amount) : 0); extra += x; credit(ctx, hc, f.id, 'dealt', x); }
  if (p === hc && t.snare) for (const [f, e] of passives(hc, 'snaredBonusDamage')) { const x = ev(hc, e.amount) + (crit ? ev(hc, e.amount) : 0); extra += x; credit(ctx, hc, f.id, 'dealt', x); }
  const tot = base + extra;
  if (inspBy) credit(ctx, inspBy, 'inspiration', 'dealt', Math.min(tot, hpBefore));
  if (src) credit(ctx, hc, src, 'dealt', Math.min(tot, hpBefore));
  credit(ctx, p, opt.key || 'weapon', 'dealt', Math.min(base, hpBefore));
  if (a.mastery === 'sap') t.sapped = p;
  if (a.mastery === 'vex') p.f.vex = { t, id: 'vex' };
  if (a.mastery === 'topple' && t.hp - tot > 0 && d(20) + (t.sv.con ?? 0) < 8 + a.hit) { t.prone = 'topple'; t.exposed = { id: 'topple', left: 99, until: 'targetTurn' }; }
  if (p === hc && (!hc.suit || hc.suitOn)) for (const [f, e] of passives(hc, 'splashDamage')) {
    if (hc.splashTurn === ctx.turnId || !hasUse(hc, f)) continue;
    const others = ctx.monsters.filter(m => m !== t && m.hp > 0);
    if (!others.length || (f.cost && (hc.res[f.cost] || 0) <= (others.length > 1 ? 0 : 1))) continue;
    hc.splashTurn = ctx.turnId; spendUse(hc, f);
    let tot2 = 0;
    for (const m of others.sort(() => R() - 0.5).slice(0, targetCount(hc, e))) {
      const ok = monSave(ctx, hc, m, e.save || 'dex', f); const x = ok ? 0 : ev(hc, e.amount);
      const b = m.hp; damageMon(ctx, m, x); tot2 += Math.min(b, x);
    }
    credit(ctx, hc, f.id, 'dealt', tot2);
  }
  if (hc && p !== hc && p.inAura && !a.mastery) for (const [f, e] of passives(hc, 'grantMastery')) if (e.mastery === 'vex') p.f.vex = { t, id: f.id };
  if (p === hc && ctx.log) log(ctx, 'wc', `${hc.name} ${crit ? 'crits' : 'hits'} ${t.name} for ${tot}`);
  damageMon(ctx, t, tot);
  return true;
}

function pcSave(ctx, p, ab, dc, stake) {
  const pal = ctx.pal, hc = ctx.hc;
  const bonus = p.sv[ab] ?? 0;
  const aop = pal && pal.conscious && pal.L >= 6 && (p === pal || p.inPal) ? Math.max(1, mod(pal.sc.cha)) : 0;
  const [rb, rbId] = rollBonusFor(ctx, p, 'save');
  const advId = p.f.saveAdv; if (advId) p.f.saveAdv = null;
  const r = d20(!!advId, false);
  const tot = r.nat + bonus + aop + rb;
  const ok = tot >= dc;
  if (ok) {
    if (aop && tot - aop < dc) credit(ctx, pal, 'aop', 'prevent', stake / 2);
    else if (advId && r.alt + bonus + aop + rb < dc) credit(ctx, hc, advId, 'prevent', stake / 2);
    else if (rb && tot - rb < dc) credit(ctx, hc, rbId, 'prevent', stake / 2);
  }
  return ok;
}

function dmgPC(ctx, p, dmg, info) {
  if (p.dead) return;
  const hc = ctx.hc;
  if (!p.conscious) { if (info.attack) { p.ds.f += info.crit ? 2 : 1; if (p.ds.f >= 3) kill(ctx, p); } return; }
  if (info.attack && hc && p !== hc && hc.conscious && hc.reaction) {
    for (const f of fx(hc, 'reaction')) {
      if (f.trigger !== 'allyHit' || !hasUse(hc, f)) continue;
      const fm = mods(hc, f.id);
      const range = (fm.find(([, e]) => e.type === 'range') || [])[1]?.range || f.range || 'aura';
      if (!inRange(p, range)) continue;
      const e = (f.effects || []).find(x => x.type === 'reduceDamage'); if (!e) continue;
      const exp = ev(hc, e.amount, 'avg', e.min);
      if (!(dmg >= exp || dmg >= p.hp + p.thp)) continue;
      hc.reaction = false; spendUse(hc, f);
      const red = Math.min(dmg, ev(hc, e.amount, 'roll', e.min));
      dmg -= red; credit(ctx, hc, f.id, 'prevent', red);
      log(ctx, 'wc', `${f.name}: ${p.name} takes ${red} less`);
      for (const [mf, me] of fm) if (me.type === 'counterAttack' && info.attacker && info.attacker.hp > 0) pcAttack(ctx, hc, info.attacker, { key: mf.id });
      break;
    }
  }
  if (info.attack && p.cls === 'rogue' && p.L >= 5 && p.reaction && dmg >= 8) { p.reaction = false; dmg = Math.floor(dmg / 2); }
  if (CLS[p.cls].onDamage && dmg > 0) dmg = CLS[p.cls].onDamage(ctx, p, dmg, info);
  if (dmg > 0) {
    let resId = null;
    if (p.f.resistNext) { resId = p.f.resistNext; p.f.resistNext = null; }
    else if (hc && p === hc && info.bps) {
      for (const [f, e] of passives(hc, 'resistance')) {
        if (e.limit === 'firstPerRound' && hc.resUsed) continue;
        if (e.requires === 'nearAnchor' && !(hc.planted && !hc.anchorBroken && R() < 0.85)) continue;
        if (e.requires === 'suitOnline' && hc.suit && !hc.suitOn) continue;
        if (e.limit === 'firstPerRound') hc.resUsed = true;
        resId = f.id; break;
      }
    }
    if (resId) { const h = Math.floor(dmg / 2); credit(ctx, hc, resId, 'prevent', dmg - h); dmg = h; }
  }
  if (p.thp > 0 && dmg > 0) { const a = Math.min(p.thp, dmg); p.thp -= a; dmg -= a; if (p.thpSrc) credit(ctx, p.thpOwner || hc, p.thpSrc, 'prevent', a); }
  if (dmg > 0 && p.suit && p.suitOn) {
    for (const [f, e] of passives(p, 'suitDamageReduction')) { const r = Math.min(dmg, ev(p, e.amount, 'avg', e.min)); dmg -= r; credit(ctx, p, f.id, 'prevent', r); }
    const a = Math.min(p.suitHp, dmg); p.suitHp -= a; dmg -= a; credit(ctx, p, 'suit', 'soak', a);
    if (p.suitHp <= 0) {
      const floor = ctx.dur.suitFloor && ctx.dur.suitFloor.rounds > 0;
      const red = passives(p, 'suitDropTo1').find(([f]) => hasUse(p, f));
      if (floor) { p.suitHp = 1; }
      else if (red) { spendUse(p, red[0]); p.suitHp = 1; credit(ctx, p, red[0].id, 'count', 0); log(ctx, 'wc', `${red[0].name}: the suit holds at 1 HP`); }
      else { p.suitHp = 0; setSuit(ctx, p, false); }
    }
  }
  if (dmg <= 0) return;
  if (p.f.sg && d(20) + p.sv.con < Math.max(10, Math.floor(dmg / 2))) { p.f.sg = 0; log(ctx, 'sys', 'Cleric loses concentration on Spirit Guardians'); }
  if (p.conc && d(20) + p.sv.con < Math.max(10, Math.floor(dmg / 2))) { log(ctx, 'sys', `${p.name} loses concentration`); endConc(ctx, p); }
  ctx.S.partyDmg += Math.min(dmg, p.hp);
  p.hp -= dmg;
  if (p.hp > 0) { CLS[p.cls].afterDamage?.(ctx, p, info); return; }
  const over = -p.hp;
  if (p.f.dropTo1) { const id = p.f.dropTo1; p.f.dropTo1 = null; p.hp = 1; credit(ctx, hc, id, 'count', 0); ctx.S.saved++; log(ctx, 'wc', `${p.name} stays up at 1 HP`); return; }
  if (hc && p === hc) {
    for (const f of fx(hc, 'dropToZero')) {
      if (!hasUse(hc, f)) continue;
      spendUse(hc, f); p.hp = 1; credit(ctx, hc, f.id, 'count', 0); ctx.S.saved++;
      log(ctx, 'wc', `${f.name}: the ${hc.name} stays up at 1 HP`);
      applyEffects(ctx, hc, f, (f.effects || []).filter(e => e.type !== 'dropTo1'));
      return;
    }
  }
  if (CLS[p.cls].onDrop?.(ctx, p)) return;
  p.hp = 0; p.thp = 0; p.conscious = false; p.ds = { s: 0, f: 0 }; p.stable = false; p.f.sg = 0; endConc(ctx, p);
  ctx.S.knock++;
  log(ctx, 'ko', `${p.name} drops to 0 HP`);
  if (over >= p.maxHp) kill(ctx, p);
}

// ----- Monsters -----
function spawn(enc) {
  const M = MON_BY[enc.id];
  return Array.from({ length: enc.count }, (_, i) => ({
    side: 'mon', name: M.name + (enc.count > 1 ? ' ' + (i + 1) : ''), hp: M.hp, max: M.hp, ac: M.ac, hit: M.hit,
    atk: M.atk.map(spec), sv: M.sv, init: M.init, regen: M.regen || 0,
    breath: M.breath || null, breathReady: !!M.breath, breathAvg: M.breath ? spec(M.breath.dice).avg : 0,
    dpr: M.atk.reduce((a, s) => a + spec(s).avg, 0), tgt: null,
  }));
}
function pickTarget(ctx, m) {
  if (m.taunt && ctx.hc && ctx.hc.conscious) return ctx.hc;
  const c = ctx.party.filter(p => p.conscious);
  if (!c.length) return null;
  if (m.tgt && m.tgt.conscious && R() < 0.7) return m.tgt;
  let tw = 0; for (const p of c) tw += W[p.role];
  let x = R() * tw;
  for (const p of c) { x -= W[p.role]; if (x <= 0) return (m.tgt = p); }
  return (m.tgt = c[0]);
}
function monAttack(ctx, m, s, tgt) {
  const dis = [], hc = ctx.hc;
  if (m.fright) dis.push([m.fright, hc]);
  if (m.daze) dis.push([m.daze.id, hc]);
  if (m.prone) dis.push([m.prone, hc]);
  if (m.snare && m.snare.dis) dis.push([m.snare.id, hc]);
  if (m.hinder) { dis.push([m.hinder, m.hinderBy || hc]); m.hinder = null; m.hinderBy = null; }
  if (tgt.f.veil) dis.push([tgt.f.veil, hc]);
  if (tgt.f.veilOnce) { dis.push([tgt.f.veilOnce, hc]); tgt.f.veilOnce = null; }
  if (m.sapped) { dis.push(['sap', m.sapped]); m.sapped = null; }
  if (hc && hc.conscious && hc.reaction) {
    for (const f of fx(hc, 'reaction')) {
      if (f.trigger !== 'targeted' || !hasUse(hc, f)) continue;
      const fm = mods(hc, f.id);
      const range = (fm.find(([, e]) => e.type === 'range') || [])[1]?.range || f.range || 'self';
      if (!(tgt === hc || (range === 'allies' && tgt.conscious))) continue;
      const big = Math.max(...m.atk.map(x => x.avg));
      if (!(s.avg >= big * 0.9 && (s.avg >= tgt.maxHp * 0.15 || tgt.hp + tgt.thp <= s.avg * 1.5))) continue;
      hc.reaction = false; spendUse(hc, f);
      if (fm.some(([, e]) => e.type === 'negate')) { const nf = fm.find(([, e]) => e.type === 'negate')[0]; credit(ctx, hc, nf.id, 'prevent', s.avg * 0.6); log(ctx, 'wc', `${nf.name}: ${m.name}'s attack on ${tgt.name} misses`); return; }
      dis.unshift([f.id, hc]); log(ctx, 'wc', `${f.name}: ${m.name} attacks ${tgt.name} with Disadvantage`);
      break;
    }
  }
  const r = d20(!!tgt.f.reckless, dis.length > 0);
  const total = r.nat + m.hit;
  const [sw, swId] = acBonus(ctx, tgt);
  const ac = tgt.ac + sw;
  const crit = r.nat === 20;
  let hit = crit || (r.nat !== 1 && total >= ac);
  if (hit && !crit) for (const q of ctx.party) { const g = CLS[q.cls].guard; if (g && q.conscious && g(ctx, q, tgt, m, s, { total, ac })) { hit = false; break; } }
  if (!hit) {
    if (r.nat !== 1) {
      if (r.mode === 'dis' && (r.alt === 20 || r.alt + m.hit >= ac)) { const [k, o] = dis[0]; credit(ctx, o, k, 'prevent', s.avg); }
      else if (sw > 0 && total >= tgt.ac) credit(ctx, ctx.hc, swId, 'prevent', s.avg);
      else if (tgt.cls === 'paladin' && tgt.L >= 2 && total >= tgt.ac - 1) credit(ctx, tgt, 'defense', 'prevent', s.avg);
    }
    return;
  }
  const dmg = roll(s, crit);
  if (ctx.log) log(ctx, tgt === ctx.hc ? 'hit-wc' : 'hit', `${m.name} ${crit ? 'crits' : 'hits'} ${tgt.name} for ${dmg}`);
  dmgPC(ctx, tgt, dmg, { attack: true, attacker: m, crit, bps: true });
}
function endMonTurn(ctx, m) {
  const hc = ctx.hc;
  if (m.snare) { if (m.snare.saveEnds && --m.snare.rounds > 0 && hc) { const r = m.snare.escDis ? Math.min(d(20), d(20)) : d(20); if (r + (m.sv[m.snare.save] ?? 0) >= hc.dc) m.snare = null; } else m.snare = null; }
  if (m.daze) { if (m.daze.saveEnds && --m.daze.rounds > 0 && hc) { if (d(20) + (m.sv[m.daze.save] ?? 0) >= hc.dc) m.daze = null; } else m.daze = null; }
  if (m.exposed && m.exposed.until === 'targetEnd') m.exposed = null;
}
function monTurn(ctx, m) {
  if (m.hp <= 0) return;
  if (m.exposed && m.exposed.until === 'targetTurn') m.exposed = null;
  m.prone = null;
  if (m.regen && m.hp < m.max) m.hp = Math.min(m.max, m.hp + m.regen);
  if (m.stun) {
    credit(ctx, m.stunBy || ctx.hc, m.stun, 'prevent', m.dpr * 0.55); log(ctx, 'mon', `${m.name} loses its turn`);
    m.stun = null; m.stunBy = null; m.fright = null; endMonTurn(ctx, m); return;
  }
  if (m.mez) {
    credit(ctx, m.mez.by, m.mez.id, 'prevent', m.dpr * 0.55); log(ctx, 'mon', `${m.name} stands entranced`);
    m.fright = null; endMonTurn(ctx, m); return;
  }
  if (m.breath && !m.breathReady && d(6) >= 5) m.breathReady = true;
  const hc = ctx.hc;
  if (m.breath && m.breathReady) {
    m.breathReady = false;
    const c = ctx.party.filter(p => p.conscious).sort(() => R() - 0.5).slice(0, m.breath.n);
    const dmg = roll(spec(m.breath.dice));
    log(ctx, 'hit', `${m.name} breathes ${m.breath.what} (${dmg}) on ${c.map(p => p.name).join(', ')}`);
    for (const p of c) {
      const ok = pcSave(ctx, p, m.breath.save, m.breath.dc, dmg);
      let x = ok ? Math.floor(dmg / 2) : dmg;
      if (((p.cls === 'rogue' && p.L >= 7) || p.evasion) && m.breath.save === 'dex') x = ok ? 0 : Math.floor(dmg / 2);
      dmgPC(ctx, p, x, { attack: false, bps: false });
    }
  } else {
    const an = hc && hc.def.aura && hc.def.aura.anchor;
    let atkList = m.atk;
    if (m.snare && m.snare.check) {
      let once = null;
      atkList = m.atk.filter(s => {
        if (m.snare.oncePerTurn && once !== null) { if (!once) credit(ctx, hc, m.snare.id, 'prevent', s.avg * 0.55); return once; }
        const r = m.snare.checkDis ? Math.min(d(20), d(20)) : d(20);
        if (r + Math.max(m.sv.str ?? 0, m.sv.dex ?? 0) >= m.snare.dc) { once = true; return true; }
        once = false;
        credit(ctx, hc, m.snare.id, 'prevent', s.avg * 0.55);
        if (m.snare.prone && !m.prone) { m.prone = m.snare.proneId; m.exposed = { id: m.snare.proneId, left: 99, until: 'targetTurn' }; }
        return false;
      });
      if (ctx.log && atkList.length < m.atk.length) log(ctx, 'mon', `${m.name} fights the net and loses ${m.atk.length - atkList.length} attack${m.atk.length - atkList.length > 1 ? 's' : ''}`);
    } else if (m.snare && m.atk.length > 1) {
      const sorted = [...m.atk].sort((a, b) => b.avg - a.avg);
      atkList = m.snare.fewer ? sorted.slice(0, -1) : sorted.slice(0, 1);
      credit(ctx, hc, m.snare.id, 'prevent', (m.dpr - atkList.reduce((a, s) => a + s.avg, 0)) * 0.55);
    }
    for (const s of atkList) {
      if (an && ctx.cfg.bannerP > 0 && hc.planted && !hc.anchorBroken && R() < ctx.cfg.bannerP) {
        const r = d20(false, false);
        if (r.nat === 20 || (r.nat !== 1 && r.nat + m.hit >= ev(hc, an.ac, 'avg'))) {
          hc.anchorHp -= roll(s, r.nat === 20);
          if (hc.anchorHp <= 0) { hc.anchorHp = 0; hc.anchorBroken = true; hc.planted = false; credit(ctx, hc, 'anchor', 'count', 0); log(ctx, 'ko', `${m.name} breaks the ${an.name || 'anchor'}; the aura shrinks`); }
        }
        continue;
      }
      const t = pickTarget(ctx, m); if (!t) break;
      monAttack(ctx, m, s, t);
    }
  }
  m.fright = null;
  endMonTurn(ctx, m);
  for (const cl of ctx.party.filter(p => (p.cls === 'cleric' || p.cls === 'lifeCleric') && p.conscious && p.f.sg)) {
    if (m.hp <= 0 || R() >= 0.6) continue;
    let x = nd(3 + (cl.f.sg - 3), 8); if (d(20) + m.sv.wis >= cl.dc) x = Math.floor(x / 2);
    const b = m.hp; damageMon(ctx, m, x); credit(ctx, cl, 'spiritGuardians', 'dealt', Math.min(b, x));
  }
}

// ----- Fight & day -----
function takeTurn(ctx, c) {
  ctx.turnId++;
  if (c.side === 'mon') return monTurn(ctx, c);
  c.reaction = true;
  for (const m of ctx.monsters) if (m.sapped === c) m.sapped = null;
  const hc = ctx.hc, rg = ctx.dur.regen;
  if (rg && hc && hc.conscious && c.conscious && c.hp >= 1 && inAuraOf(hc, c)) heal(ctx, c, Math.max(0, ev(hc, rg.amount)), hc, rg.id);
  if (c === hc && hc.suit && hc.suitOn && hc.suitHp >= 1) for (const [f, e] of passives(hc, 'suitRegen')) { const g = Math.min(Math.max(0, ev(hc, e.amount)), hc.suitMax - hc.suitHp); hc.suitHp += g; credit(ctx, hc, f.id, 'heal', g); }
  CLS[c.cls].turn(ctx, c);
}
const over = ctx => ctx.monsters.every(m => m.hp <= 0) || !ctx.party.some(p => p.conscious);
function runFight(ctx) {
  ctx.monsters = spawn(ctx.cfg.enc);
  ctx.dur = {}; ctx.mark = null; ctx.advance = false;
  for (const p of ctx.party) if (!p.dead) { p.f.bonusDmg = null; p.f.mark = false; p.f.resistNext = null; p.f.dropTo1 = null; p.f.saveAdv = null; p.f.vex = null; p.f.veil = null; p.f.veilOnce = null; CLS[p.cls].startFight?.(p, ctx); }
  const hc = ctx.hc;
  ctx.round = 0;
  if (hc) position(ctx, hc);
  if (ctx.pal) for (const q of ctx.party) q.inPal = q === ctx.pal || R() < clamp(ctx.cfg.tight * (ctx.pal.L >= 18 ? 30 : 10) / 15, 0, 1);
  log(ctx, 'fight', `Fight ${ctx.fi + 1}: ${ctx.cfg.enc.count} × ${MON_BY[ctx.cfg.enc.id].name}`);
  const all = [...ctx.party.filter(p => !p.dead), ...ctx.monsters];
  let ib = 0;
  let ibSelf = 0;
  if (hc) for (const [, e] of passives(hc, 'initiativeBonus')) { if (e.targets === 'self') ibSelf += ev(hc, e.amount, 'avg', e.min); else ib += ev(hc, e.amount, 'avg', e.min); }
  for (const c of all) c.ini = d(20) + c.init + (c.side === 'party' && ib && inAuraOf(hc, c) ? ib : 0) + (c === hc ? ibSelf : 0) + R() * 0.01;
  all.sort((a, b) => b.ini - a.ini);
  if (hc && hc.conscious) for (const f of fx(hc, 'initiative')) if (hasUse(hc, f)) { spendUse(hc, f); log(ctx, 'wc', `${f.name} as initiative is rolled`); applyEffects(ctx, hc, f, f.effects); }
  for (ctx.round = 1; ctx.round <= 20; ctx.round++) {
    for (const c of all) {
      if (c.side === 'mon' ? c.hp <= 0 : c.dead) continue;
      takeTurn(ctx, c);
      if (over(ctx)) break;
    }
    if (over(ctx)) break;
  }
  const rounds = Math.min(ctx.round, 20);
  const won = ctx.monsters.every(m => m.hp <= 0);
  log(ctx, 'fight-end', won ? `Party wins in ${rounds} rounds` : !ctx.party.some(p => p.conscious) ? 'The party is wiped out' : 'Fight drags past 20 rounds');
  return { won, rounds };
}
const SEAT = { cleric: 'lifeCleric' };
const SEAT_CLASSES = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
function buildSlot(cfg, slotCls) { return slotCls === 'hb' ? buildHB(cfg.def, cfg.L, cfg) : CLS[SEAT[slotCls] || slotCls].build(cfg.L, cfg); }
function runDay(cfg, slotCls, wantLog) {
  const party = [buildSlot(cfg, slotCls), CLS.fighter.build(cfg.L, cfg), CLS.rogue.build(cfg.L, cfg), CLS.cleric.build(cfg.L, cfg)];
  if (slotCls === 'fighter') party[0].name = 'Fighter (seat)';
  if (slotCls === 'rogue') party[0].name = 'Rogue (seat)';
  const S = { fights: 0, won: 0, rounds: 0, partyDmg: 0, knock: 0, deaths: 0, saved: 0, survived: 0, feat: {} };
  const ctx = { cfg, party, slot: party[0], hc: slotCls === 'hb' ? party[0] : null, pal: slotCls === 'paladin' ? party[0] : null, S, turnId: 0, fights: cfg.fights, fi: 0, round: 0, log: wantLog ? [] : null, dur: {}, monsters: [] };
  party.forEach(p => CLS[p.cls].startDay?.(p, ctx));
  const sr = cfg.shortRest && cfg.fights >= 2 ? Math.ceil(cfg.fights / 2) : -1;
  ctx.srAt = sr;
  let wiped = false;
  for (ctx.fi = 0; ctx.fi < cfg.fights; ctx.fi++) {
    if (ctx.fi === sr) {
      ctx.round = 0;
      for (const p of party) {
        if (p.dead) continue;
        while (p.hp < p.maxHp * 0.8 && p.hdLeft > 0) { p.hdLeft--; p.hp = Math.min(p.maxHp, p.hp + Math.max(1, d(p.hd) + mod(p.sc.con))); }
        CLS[p.cls].shortRest?.(p);
      }
      log(ctx, 'sys', 'Short rest: Hit Dice spent, short-rest resources recovered');
    }
    const res = runFight(ctx);
    S.fights++; S.rounds += res.rounds; if (res.won) S.won++;
    if (!party.some(p => p.conscious)) { wiped = true; break; }
    for (const p of party) { if (!p.dead && !p.conscious) { p.hp = 1; p.conscious = true; p.stable = false; p.ds = { s: 0, f: 0 }; } p.thp = 0; p.f.sg = 0; }
  }
  S.survived = wiped ? 0 : 1;
  return ctx;
}
function runMany(cfg, slotCls, N) {
  const T = { fights: 0, won: 0, rounds: 0, partyDmg: 0, knock: 0, deaths: 0, saved: 0, survived: 0, feat: {} };
  for (let i = 0; i < N; i++) {
    const S = runDay(cfg, slotCls, false).S;
    for (const k of ['fights', 'won', 'rounds', 'partyDmg', 'knock', 'deaths', 'saved', 'survived']) T[k] += S[k];
    for (const [k, v] of Object.entries(S.feat)) { const f = T.feat[k] || (T.feat[k] = { v: 0, n: 0 }); f.v += v.v; f.n += v.n; }
  }
  return summarize(T, N);
}
function summarize(T, N) {
  const F = T.fights || 1, Rr = T.rounds || 1;
  const k = { dealt: 0, prevent: 0, heal: 0 };
  for (const [key, v] of Object.entries(T.feat)) { const kind = key.split('|')[1]; if (k[kind] !== undefined) k[kind] += v.v; }
  return {
    N, surv: T.survived / N, win: T.won / F, rpf: T.rounds / F, dmg: T.partyDmg / F, ko: T.knock / F, deaths: T.deaths / N, saved: T.saved / F,
    val: (k.dealt + k.prevent + k.heal) / Rr, dealt: k.dealt / Rr, prevent: k.prevent / Rr, heal: k.heal / Rr, feat: T.feat, F, Rr,
  };
}

// ----- Validation -----
function validateClass(def) {
  const err = [];
  const need = (cond, msg) => { if (!cond) err.push(msg); };
  if (!def || typeof def !== 'object') return ['The file is not a JSON object.'];
  need(def.schema === 'wildbloom-class/1', 'schema must be "wildbloom-class/1".');
  need(typeof def.id === 'string' && def.id, 'id is missing.');
  need(typeof def.name === 'string' && def.name, 'name is missing.');
  const c = def.core || {};
  need(def.core, 'core is missing.');
  need([6, 8, 10, 12].includes(c.hitDie), 'core.hitDie must be 6, 8, 10 or 12.');
  need(Array.isArray(c.saves) && c.saves.every(s => ABIL.includes(s)), 'core.saves must list abilities like "con".');
  need(c.ac != null, 'core.ac is missing.');
  need(c.builds && Object.keys(c.builds).length, 'core.builds needs at least one build.');
  for (const [k, b] of Object.entries(c.builds || {})) need(b.scores && ABIL.every(a => typeof b.scores[a] === 'number'), `build "${k}" needs scores for all six abilities.`);
  need(c.weapon && /^\d*d\d+$/.test(c.weapon.damage || ''), 'core.weapon.damage must be dice like "1d8".');
  if (c.weapon) need(ABIL.includes(c.weapon.ability || 'str'), 'core.weapon.ability must be an ability.');
  if (def.compare != null) need(Array.isArray(def.compare) && def.compare.length && def.compare.every(k => SEAT_CLASSES.includes(k)), `compare must list one or more of ${SEAT_CLASSES.join(', ')}.`);
  for (const sc of def.subclasses || []) if (sc.compare != null) need(Array.isArray(sc.compare) && sc.compare.length && sc.compare.every(k => SEAT_CLASSES.includes(k)), `subclass ${sc.id}: compare must list one or more of ${SEAT_CLASSES.join(', ')}.`);
  const res = def.resources || {}, opts = def.options || {};
  const subIds = (def.subclasses || []).map(s => s.id);
  const allFeats = [...(def.features || []).map(f => [f, 'features']), ...(def.subclasses || []).flatMap(s => (s.features || []).map(f => [f, `subclass ${s.id}`]))];
  const featIds = new Set(allFeats.map(([f]) => f.id));
  const checkEffects = (list, where) => {
    for (const e of list || []) {
      need(EFFECT_TYPES.includes(e.type), `${where}: unknown effect type "${e.type}". Known: ${EFFECT_TYPES.join(', ')}.`);
      if (e.targets) need(TARGETS.includes(e.targets), `${where}: unknown targets "${e.targets}".`);
      if ((e.type === 'freeChoice' || e.type === 'extraChoice') && e.feature) need(featIds.has(e.feature), `${where}: feature "${e.feature}" not found.`);
    }
  };
  for (const [f, where] of allFeats) {
    const w = `${where} › ${f.id || '(no id)'}`;
    need(f.id && f.name, `${w}: every feature needs id and name.`);
    need(WHEN.includes(f.when), `${w}: "when" must be one of ${WHEN.join(', ')}.`);
    if (f.when === 'reaction') need(TRIGGERS.includes(f.trigger), `${w}: reactions need a trigger (${TRIGGERS.join(', ')}).`);
    if (f.cost) need(res[f.cost], `${w}: cost "${f.cost}" is not in resources.`);
    if (f.choose) { need(opts[f.choose.from], `${w}: choose.from "${f.choose.from}" is not in options.`); need(f.choose.known != null, `${w}: choose.known is missing.`); }
    const optIds = new Set(Object.values(opts).flat().map(o => o.id));
    if (f.when === 'afterChoice' || (f.when === 'modify' && !f.option)) need([].concat(f.feature).every(x => featIds.has(x)), `${w}: feature "${f.feature}" not found.`);
    if (f.when === 'modify' && f.option) need(optIds.has(f.option), `${w}: option "${f.option}" not found.`);
    if (f.choose && f.costPer) need(f.costPer === 'option', `${w}: costPer can only be "option".`);
    checkEffects(f.effects, w);
  }
  for (const [g, list] of Object.entries(opts)) for (const o of list) { need(o.id && o.name, `options.${g}: every option needs id and name.`); checkEffects(o.effects, `options.${g} › ${o.id}`); }
  if (!err.length) {
    try {
      for (let L = 1; L <= 20; L++) for (const sub of subIds.length ? subIds : [null]) {
        const pc = buildHB(def, L, { build: Object.keys(c.builds)[0], sub });
        for (const f of pc.feats) { usesMax(pc, f); for (const e of f.effects || []) { if (e.amount != null) ev(pc, e.amount, 'avg'); if (e.selfAmount) ev(pc, e.selfAmount, 'avg'); if (e.count != null) ev(pc, e.count, 'avg'); } }
        for (const [g, list] of Object.entries(opts)) for (const o of list) for (const e of o.effects || []) if (e.amount != null) ev(pc, e.amount, 'avg');
        if (def.aura) ev(pc, def.aura.size, 'avg');
      }
    } catch (x) { err.push(x.message); }
  }
  return err.filter(Boolean);
}
if (typeof module !== 'undefined') module.exports = { runMany, runDay, autoEncounter, validateClass, knownOptions, knownFor, MON_BY, SEAT_CLASSES };
const REFERENCE_MD = "# Wildbloom class skeleton (schema `wildbloom-class/1`)\n\nOne JSON file describes one class for the Proving Ground. Start from `class-template.json`, or copy `warcaller.class.json`, `trickster.class.json` or `exopilot.class.json`. Paste the file into the simulator's **Class JSON** panel and press **Load class**; the panel lists anything it can't read.\n\n## Top level\n\n| Field | Required | What it is |\n|---|---|---|\n| `schema` | yes | Always `\"wildbloom-class/1\"` |\n| `id`, `name`, `version` | yes | Short id, display name, version string |\n| `compare` | no | Which classes the Proving Ground compares it with: any of the SRD 5.2.1 classes, `\"barbarian\"`, `\"bard\"`, `\"cleric\"`, `\"druid\"`, `\"fighter\"`, `\"monk\"`, `\"paladin\"`, `\"ranger\"`, `\"rogue\"`, `\"sorcerer\"`, `\"warlock\"`, `\"wizard\"`. Default Paladin and Fighter. Pick classes with a similar job: armored front-liners for a tank, the Rogue or Ranger for a light-armored skirmisher, a full caster for a caster |\n| `role` | no | `front`, `mid` or `back`. How often monsters target it (front is targeted most). Default `front` |\n| `core` | yes | Hit die, saves, armor, builds, weapon, attacks |\n| `scales` | no | Named values that change by level |\n| `resources` | no | Pools of uses, like Battle Cries |\n| `aura` | no | An aura that moves with the character, plus an optional planted anchor |\n| `features` | yes | Class features, in level order |\n| `options` | no | Lists of pickable options, like Battle Cries or maneuvers |\n| `subclasses` | no | Each with `id`, `name`, its own `features`, and optionally its own `compare` list, which wins over the class's (Siege Frame compares with the Rogue and Fighter) |\n\n## Level tables\n\nAnything that changes by level is written as `{ \"level\": value }`. The highest key at or below the character's level wins: `{ \"1\": \"d6\", \"5\": \"d8\" }` is a d6 at levels 1–4 and a d8 from level 5.\n\n## Expressions\n\nAmounts are numbers, level tables or short expressions joined with `+`:\n\n- Ability modifiers: `str`, `dex`, `con`, `int`, `wis`, `cha`\n- `pb` (proficiency bonus) and `level`\n- Dice: `d6`, `2d8`\n- Any scale name, such as `rallyDie`\n- Products and whole-number division: `5*level`, `int*level/2`\n\nExamples: `\"rallyDie+cha\"`, `\"8+cha+pb\"`, `\"6*level\"`. Add `\"min\": 1` next to an amount for a minimum.\n\n## core\n\n| Field | Example | Notes |\n|---|---|---|\n| `hitDie` | `10` | 6, 8, 10 or 12 |\n| `saves` | `[\"con\",\"cha\"]` | Saving throw proficiencies |\n| `ac` | `{ \"1\": 18, \"5\": 20 }` or `{ \"1\": \"11+dex\" }` | Armor Class by level, before any feature bonus. Expressions work |\n| `builds` | see template | Each build has `label`, all six `scores`, and `asi` by level |\n| `weapon` | `{ \"damage\": \"1d8\", \"ability\": \"str\", \"mastery\": \"sap\" }` | Masteries the sim knows: `sap` (target's next attack has Disadvantage), `vex` (your next attack against the target has Advantage) and `topple` (Constitution save or Prone). Others are accepted but have no effect yet |\n| `suit` | `{ \"hp\": \"6*level\", \"offlineAc\": \"16\" }` | Optional. A suit with its own Hit Points that soaks damage after Temporary Hit Points; at 0 it goes offline, AC drops to `offlineAc`, and features with `\"requires\": \"suitOnline\"` stop working. It's fully restored on a Short or Long Rest |\n| `attacks` | `{ \"1\": 1, \"5\": 2 }` | Attacks per Attack action |\n| `saveDC` | `\"8+cha+pb\"` | DC for the class's saving throws |\n| `subclassLevel` | `3` | Level the subclass features start |\n\n## resources\n\n```json\n\"battleCries\": { \"label\": \"Battle Cries\", \"max\": { \"1\": 2, \"5\": 3 }, \"shortRest\": 1, \"longRest\": \"all\" }\n```\n\n`shortRest` is a number or expression regained (capped at `max`), or `\"all\"`; add `shortRestMin` for a minimum. Level tables work, such as `{ \"1\": 0, \"2\": \"int\" }`. The sim spreads a resource evenly over the fights in a day, but emergency options (`dropTo1`, `spendHitDie`) can dip into the reserve.\n\n## aura\n\n```json\n\"aura\": { \"size\": \"auraSize\",\n          \"anchor\": { \"name\": \"War Standard\", \"plant\": \"withBonusAction\", \"ac\": { \"1\": 15, \"7\": 18 },\n                      \"hp\": \"5*level\", \"brokenSize\": 5, \"repair\": \"shortRest\" } }\n```\n\n`size` is in feet. Each round, allies are inside the aura with the chance set by the Battlefield slider, scaled by size. The anchor is optional: it's planted on the first turn (free with a bonus-action feature when `plant` is `withBonusAction`), monsters can attack it, and when it breaks the aura drops to `brokenSize` until a rest.\n\n## features\n\nEvery feature has `id`, `name`, `level`, `when` and usually `effects`.\n\n| `when` | Fires | Extra fields |\n|---|---|---|\n| `passive` | Always on | — |\n| `action` | Instead of attacking | Used with `choose`. The sim picks it when the best option is worth more than the attacks it gives up. A `replaceAttack` passive lets it replace one attack instead |\n| `bonusAction` | On your turn, one per turn | `cost` (resource id), `choose` (pick from options) or `effects`; `\"ai\": \"firstRound\"` to use it on round 1; `duration` in rounds |\n| `reaction` | One per round | `trigger`: `allyHit` (an ally is hit), `allyMiss` (an ally misses) or `targeted` (an enemy attacks you); `range`: `adjacent` (5 feet), `near` (about 10 feet), `aura`, `self` or `allies` |\n| `dropToZero` | You'd drop to 0 HP | Usually `dropTo1` plus something |\n| `initiative` | When initiative is rolled | — |\n| `longRest` | At the start of the day | — |\n| `afterChoice` | Right after you use a `choose` feature | `feature`: the choose feature's id |\n| `modify` | Changes another feature or option | `feature`: a feature id, or `option`: an option id. On an option, `area` and `linger` change its effects and any other effect is added to it |\n| `exploration` | Not simulated | Kept for completeness |\n\nLimited uses: `\"uses\": { \"max\": \"cha\", \"min\": 1, \"shortRest\": \"all\", \"longRest\": \"all\" }`.\n\nAny feature can also carry `cost` (a resource spent each use, `costAmount` for more than 1) and `\"requires\": \"suitOnline\"`. Mark `choose` features that count as suit systems with `\"systems\": true` so `freeSystems` applies to them. `afterChoice` can name a list of features.\n\nPick from options: `\"choose\": { \"from\": \"cries\", \"known\": \"criesKnown\", \"count\": 1, \"label\": \"Battle Cries\" }`. `from` is a list in `options`, `known` is how many you know (a scale or number), `count` is how many you use at once, and `label` names the list on the page. Add `\"filter\": { \"use\": \"bonusAction\" }` to let a feature use only some of the options; two features can share one list.\n\nSpending: `cost` names a resource. With `\"costPer\": \"option\"`, each option used spends its own `cost` (default 1), so a Heavy gadget can cost 2.\n\n## options\n\n```json\n\"cries\": [ { \"id\": \"holdFast\", \"name\": \"Hold Fast!\", \"level\": 1, \"pick\": 2, \"effects\": [ ... ] } ]\n```\n\n`pick` sets the order the sim auto-selects known options (lowest first). The page also lets you tick your own. Options can also carry `use` (`action` or `bonusAction`, used by `filter`), `cost`, and `subclass` (only that subclass can know it, through `knowOption`).\n\n## Targets\n\n| `targets` | Who |\n|---|---|\n| `self` | Only you |\n| `selfAndAura` | You and allies in your aura |\n| `aura` | Allies in your aura, not you |\n| `enemiesInAura` | Every enemy in your aura |\n| `enemyInAura` | The most dangerous enemy in your aura |\n| `allies` | Every conscious ally, you included |\n| `allyAtRisk` | The ally most likely to drop |\n| `downedAlly` | An ally at 0 Hit Points |\n| `enemy` | The most dangerous enemy |\n| `focusEnemy` | The enemy the party is focusing (lowest Hit Points) |\n| `enemiesArea` | Enemies caught in an area; set how many with `count` (default 2) |\n\n## Effect types\n\nEffects from options and bonus actions last until the start of your next turn unless noted.\n\n| `type` | Fields | What it does | Counted as |\n|---|---|---|---|\n| `acBonus` | `targets`, `amount` | Passive bonus to AC | prevented |\n| `reduceDamage` | `amount`, `min` | Reaction: cut the damage of a hit | prevented |\n| `tempHp` | `targets`, `amount`, `selfAmount`, `rollOnce` | Temporary Hit Points; `selfAmount` is what you get instead | prevented (when absorbed) |\n| `resistNext` | `targets` | Resistance to the next damage taken | prevented |\n| `resistance` | `targets: \"self\"`, `limit: \"firstPerRound\"`, `requires: \"nearAnchor\"` | Passive Resistance to weapon damage | prevented |\n| `frighten` | `targets`, `save` | Save or Frightened (Disadvantage on attacks) until the end of its next turn | prevented |\n| `saveAdvantage` | `targets` | Advantage on the next saving throw | prevented |\n| `bonusDamage` | `targets`, `amount`, `oncePerTurn` | Extra damage on a hit | dealt |\n| `advantageVsMark` | `targets` | First attack against the marked enemy has Advantage | dealt (hits gained) |\n| `addToRoll` | `amount` | Reaction: add to an ally's missed attack roll | dealt (hits gained) |\n| `counterAttack` | — | Used with `modify`: a weapon attack against the attacker | dealt |\n| `advantageTokens` | `count`, `min` | Used with `longRest`: that many creatures get Advantage on one attack | dealt (hits gained) |\n| `grantMastery` | `targets`, `mastery: \"vex\"` | Allies without a mastery gain Vex | dealt (hits gained) |\n| `rollBonus` | `targets`, `rolls: [\"attack\",\"save\"]`, `amount` | Adds to rolls for the feature's `duration` | dealt / prevented |\n| `spendHitDie` | `targets`, `revive` | Each target spends a Hit Die to heal; `revive` gets downed allies to 1 HP first | healed |\n| `regen` | `targets`, `amount` | Heals at the start of each turn for the feature's `duration` | healed |\n| `dropTo1` | `targets` | Next time it would drop to 0 HP, it drops to 1 instead | knockdowns stopped |\n| `gatherAura` | — | Everyone moves into your aura for a round | uses |\n| `taunt` | `targets: \"enemyInAura\"`, `save` | Save or the enemy can only attack you well | uses |\n| `deathSaveAdvantage` | `targets` | Passive Advantage on death saves | death saves turned |\n| `freeChoice` | `feature` | Use a `choose` feature for free | uses |\n| `extraChoice` | `feature`, `count` | Passive: use more options at once; respects the feature's `uses` | — |\n| `saveProficiency` | `save` | Passive save proficiency | — |\n| `initiativeBonus` | `targets`, `amount`, `min` | Passive bonus to initiative | — |\n| `auraSize` | `amount` | Sets aura size for the feature's `duration` | — |\n| `range` | `range` | Used with `modify` on a reaction to change its range | — |\n| `snare` | `targets`, `save`, `attackCheck`, `checkOncePerTurn`, `attacks: \"oneFewer\"`, `saveEnds`, `aiWeight` | Save or Snared until the end of its next turn; `saveEnds` repeats the save each turn for up to 1 minute. With `attackCheck`, each attack needs a Strength or Dexterity check against your DC (`checkOncePerTurn`: one check covers the turn); otherwise `attacks: \"oneFewer\"` removes one attack. `aiWeight` below 1 makes the simulated player use it less eagerly | prevented |\n| `snaredBonusDamage` | `amount` | Passive: your weapon hits on a creature you Snared deal extra damage | dealt |\n| `daze` | `targets`, `count`, `save` | Save or Disadvantage on attack rolls until the end of its next turn | prevented |\n| `hinder` | `targets`, `count`, `save` | Save or Disadvantage on its next attack roll | prevented |\n| `stun` | `targets`, `count`, `save`, `exposed` | Save or it loses its next turn; `exposed` also gives Advantage on attacks against it | prevented |\n| `expose` | `targets`, `count`, `attacks`, `save`, `until` | The next `attacks` attack rolls against it have Advantage, from anyone | dealt (hits gained) |\n| `veil` | `targets`, `count`, `once` | Attacks against the targets have Disadvantage until your next turn (`once`: only the next attack) | prevented |\n| `imposeDisadvantage` | — | Reaction: the triggering attack has Disadvantage | prevented |\n| `negate` | — | Used with `modify` on a reaction: the attack misses instead | prevented |\n| `revive` | `targets: \"downedAlly\"` | The target regains 1 Hit Point | uses |\n| `gainResource` | `resource`, `amount`, `ifEmpty` | Adds to a resource, even above its max (with `longRest` or `initiative`) | — |\n| `saveReroll` | — | Passive with `uses`: an enemy that succeeds on a save against you rerolls | uses |\n| `replaceAttack` | `feature` | Passive: an `action` feature replaces one attack instead of the whole action | — |\n| `snareUpgrade` | `exposed`, `saveEnds`, `targets2`, `disadvantage`, `escapeDisadvantage`, `checkDisadvantage`, `proneOnFail` | Passive: improves your `snare` effects (`proneOnFail`: a failed struggle check also knocks it Prone) | — |\n| `area` | `amount` | Used with `modify` on an option: its area effects reach more enemies | — |\n| `linger` | — | Used with `modify` on an option: its `daze` lasts up to 1 minute, save each turn | — |\n| `knowOption` | `option` | Passive: you always know this option, free of your known limit | — |\n| `damage` | `targets`, `count`, `amount`, `save`, `half`, `prone`, `aiWeight` | Save for half (or none with `\"half\": false`); `prone` knocks failed targets Prone | dealt |\n| `splashDamage` | `amount`, `save`, `count` | Passive with `cost`: once per turn when you hit, other enemies save or take the damage | dealt |\n| `weaponDamage` | `amount` | Passive: extra damage on every weapon hit while the suit (if any) is online | dealt |\n| `weaponOverride` | `weapon` | Passive: replaces `core.weapon` (for example a subclass cannon using Intelligence) | — |\n| `setRole` | `role` | Passive: changes how often monsters target you (`front`, `mid`, `back`) | — |\n| `repairSuit` | `amount` | Restores suit Hit Points and brings an offline suit back | healed |\n| `suitAc` | `amount` | Passive: adds to AC while the suit is online | — |\n| `suitHpBonus` | `amount` | Passive: adds to the suit's Hit Point maximum | — |\n| `suitDamageReduction` | `amount`, `min` | Passive: damage to the suit is reduced | prevented |\n| `suitDropTo1` | — | Passive with `uses`: the suit drops to 1 Hit Point instead of 0 | times |\n| `suitRegen` | `amount` | Passive: the suit heals at the start of your turn | healed |\n| `freeSystems` | — | For the feature's `duration`, `systems` features cost nothing | — |\n| `suitFloor` | — | For the feature's `duration`, the suit can't drop below 1 Hit Point | — |\n| `noCost` | — | Used with `modify` on a feature with `cost`: it costs nothing | — |\n| `resourceMax` | `resource`, `amount` | Passive: raises a resource's maximum | — |\n\nThe ledger also shows \"Suit Hit Points (damage absorbed)\". Damage the suit soaks is listed for reference but isn't added to seat value, the same way a Paladin's bigger Hit Point pool isn't.\n\nIf a rule needs something not on this list, it has to be added to the simulator's engine first. Write the closest effect you can and note what's missing in the class doc's Open questions.\n\n## Comparison classes\n\nEach SRD class plays its SRD subclass with a simple, sensible turn: Barbarian (Berserker: Rage, Reckless Attack, Frenzy, Brutal Strike, Retaliation, Relentless Rage), Bard (Lore: Vicious Mockery, Bardic Inspiration, Cutting Words, Healing Word, Shatter, Hypnotic Pattern, Fireball from Magical Secrets), Cleric (Life: Toll the Dead, Spirit Guardians, Healing Word, Preserve Life), Druid (Land: Produce Flame or Fire Bolt, Moonbeam, Fireball, Healing Word, Natural Recovery), Fighter (Champion-style greatsword, Action Surge, Second Wind), Monk (Open Hand: Flurry of Blows, Stunning Strike, Deflect Attacks, topple), Paladin (Devotion-style: Divine Smite, Lay on Hands, Aura of Protection), Ranger (Hunter: archery, Hunter's Mark, Colossus Slayer, Superior Hunter's Prey and Defense), Rogue (Thief-style: Sneak Attack, Uncanny Dodge, Evasion), Sorcerer (Draconic: Fire Bolt, Chromatic Orb, Scorching Ray, Fireball, Innate Sorcery), Warlock (Fiend: Eldritch Blast, Hex, Fireball, Mystic Arcanum, Hurl Through Hell) and Wizard (Evoker: Fire Bolt, Magic Missile, Scorching Ray, Fireball, Cone of Cold, Shield). Casters spread their slots evenly over the day. Summons, Wild Shape, Metamagic and most utility spells aren't modeled.\n\n## What the simulator does not model\n\nPositions are abstract, monsters don't use spells or legendary actions, and features marked `exploration` have no effect in combat.\n";
// ===== UI =====
const $ = id => document.getElementById(id);
const radio = n => (document.querySelector(`input[name="${n}"]:checked`) || {}).value;
// Comparison classes: [engine id, name, text class, line class, dot class, color variable, line style, dash pattern]
const SIDE_LIST = [
  ['barbarian', 'Barbarian', 'long dash', '9 4'], ['bard', 'Bard', 'dash-dot', '7 3 1.5 3'], ['cleric', 'Cleric', 'short dash', '3 3'],
  ['druid', 'Druid', 'dash-dot-dot', '7 3 1.5 3 1.5 3'], ['fighter', 'Fighter', 'dotted', '1.5 4'], ['monk', 'Monk', 'long dash', '9 4'],
  ['paladin', 'Paladin', 'dashed', '5 4'], ['ranger', 'Ranger', 'dash-dot', '7 3 1.5 3'], ['rogue', 'Rogue', 'dash-dot', '7 3 1.5 3'],
  ['sorcerer', 'Sorcerer', 'short dash', '3 3'], ['warlock', 'Warlock', 'dotted', '1.5 4'], ['wizard', 'Wizard', 'dashed', '5 4'],
];
const ALL_SIDES = Object.fromEntries(SIDE_LIST.map(([k, n, style]) => [k, [k, n, 'k-' + k, 'l-' + k, 'd-' + k, '--c-' + k, style]]));
(() => {
  const css = SIDE_LIST.map(([k, , , dash]) => `.pg .k-${k}{color:var(--c-${k})} .pg .chart .l-${k}{stroke:var(--c-${k});fill:none;stroke-width:2.25;stroke-dasharray:${dash};stroke-linecap:round} .pg .chart .d-${k}{fill:var(--c-${k})}`).join('\n');
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  $('cmpset').innerHTML = SIDE_LIST.map(([k, n]) => `<label class="check"><input type="checkbox" id="cmp-${k}"> <i class="sw" style="background:var(--c-${k})"></i>${n}</label>`).join('');
})();
let SIDES = [ALL_SIDES.paladin, ALL_SIDES.fighter];
const listNames = names => names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + (names.length > 2 ? ',' : '') + ' and ' + names[names.length - 1];
const orNames = names => names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + (names.length > 2 ? ',' : '') + ' or ' + names[names.length - 1];
function setSidesFromBoxes() {
  const on = Object.keys(ALL_SIDES).filter(k => $('cmp-' + k).checked);
  SIDES = on.map(k => ALL_SIDES[k]);
}
const fmt = (x, k = 1) => (Math.round(x * 10 ** k) / 10 ** k).toFixed(k);
const pct = x => Math.round(x * 100) + '%';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PRESETS = Object.fromEntries(
  Object.entries(import.meta.glob('../data/class-json/*.class.json', { eager: true, import: 'default' })).map(([p, v]) => [p.split('/').pop().replace('.class.json', ''), v]),
);
const DEFAULT_PRESET = 'warcaller';
const wantedClass = new URLSearchParams(location.search).get('class');
$('preset').innerHTML = Object.entries(PRESETS).map(([k, v]) => `<option value="${esc(k)}">${esc(v.name)} v${esc(v.version || '?')}</option>`).join('');
$('preset').value = PRESETS[wantedClass] ? wantedClass : DEFAULT_PRESET;
const STORE_KEY = 'wildbloom-pg-class';

let DEF = null, manual = null;
let LABELS = {};

$('mon').innerHTML = MON.map(m => `<option value="${m.id}">${m.name} · CR ${m.cr}${m.breath ? ' · breath' : ''}</option>`).join('');
$('mon').value = 'ettin';

// ----- Loading a class -----
function labelsFor(def) {
  const L = { ...LABEL };
  for (const [rid, r] of Object.entries(def.resources || {})) L[rid] = `${r.label || rid} spent`;
  const all = [...(def.features || []), ...(def.subclasses || []).flatMap(s => s.features || []), ...Object.values(def.options || {}).flat()];
  for (const f of all) L[f.id] = f.name;
  if (def.aura && def.aura.anchor) L.anchor = `${def.aura.anchor.name || 'Anchor'} broken`;
  return L;
}
function setClass(def) {
  DEF = def; manual = null; LABELS = labelsFor(def);
  $('classLine').textContent = `Testing: ${def.name} v${def.version || '?'}`;
  $('build').innerHTML = Object.entries(def.core.builds).map(([k, b]) => `<option value="${esc(k)}">${esc(b.label || k)}</option>`).join('');
  const subs = def.subclasses || [];
  $('subSeg').innerHTML = subs.length ? subs.map((s, i) => `<label><input type="radio" name="sub" value="${esc(s.id)}" ${i ? '' : 'checked'}>${esc(s.name)}</label>`).join('') : '<label><input type="radio" name="sub" value="" checked disabled>None</label>';
  $('subSeg').querySelectorAll('input').forEach(el => { el.addEventListener('change', () => { applyCompare(); schedule(); }); });
  const cf = choiceFeatures(def)[0];
  $('optRow').hidden = !cf;
  if (cf) $('optLab').textContent = `${cf.choose.label || cf.name} known`;
  const an = def.aura && def.aura.anchor;
  $('bannerLab').textContent = an ? `Enemy attacks aimed at the ${an.name || 'anchor'}` : 'Enemy attacks aimed at an anchor (none)';
  $('banner').disabled = !an;
  applyCompare();
  sweepToken++; sweepData = null; $('sweep').innerHTML = ''; $('sweepStatus').textContent = '';
}
// The subclass's own compare list wins over the class's; with neither, Paladin and Fighter.
function fileCompare() {
  const sub = (DEF.subclasses || []).find(s => s.id === radio('sub'));
  if (sub && sub.compare && sub.compare.length) return { list: sub.compare, from: `the ${sub.name} subclass` };
  if (DEF.compare && DEF.compare.length) return { list: DEF.compare, from: 'the class file' };
  return { list: ['paladin', 'fighter'], from: null };
}
function applyCompare() {
  const fc = fileCompare(), cmp = fc.list.filter(k => ALL_SIDES[k]);
  for (const k of Object.keys(ALL_SIDES)) $('cmp-' + k).checked = cmp.includes(k);
  setSidesFromBoxes();
  $('cmpHint').textContent = fc.from ? `From ${fc.from}: ${cmp.map(k => ALL_SIDES[k][1]).join(' and ')}.` : 'The class file names no comparison, so Paladin and Fighter are used.';
}
function loadFromText(text, quiet) {
  let def;
  try { def = JSON.parse(text); } catch (x) { showErrs([`This isn't valid JSON: ${x.message}`]); return false; }
  const errs = validateClass(def);
  if (errs.length) { showErrs(errs); return false; }
  showErrs([]);
  setClass(def);
  try { localStorage.setItem(STORE_KEY, text); } catch (x) { /* storage unavailable */ }
  if (!quiet) { $('jsonStatus').textContent = `Loaded ${def.name} v${def.version || '?'}`; syncLabels(); runMain(); setTimeout(runSweep, 400); }
  return true;
}
function showErrs(list) {
  $('jsonErrs').hidden = !list.length;
  $('jsonErrs').innerHTML = list.map(e => `<li>${esc(e)}</li>`).join('');
  if (list.length) $('jsonStatus').textContent = `${list.length} problem${list.length > 1 ? 's' : ''} found · nothing changed`;
}
$('usePreset').addEventListener('click', () => { $('json').value = JSON.stringify(PRESETS[$('preset').value], null, 2); $('jsonStatus').textContent = 'Opened in the editor · press Load class to use it'; showErrs([]); });
$('loadJson').addEventListener('click', () => loadFromText($('json').value));
$('copyJson').addEventListener('click', () => {
  const ta = $('json');
  const fallback = () => { ta.focus(); ta.select(); $('jsonStatus').textContent = 'Selected · press Ctrl+C or ⌘C to copy'; };
  try { navigator.clipboard.writeText(ta.value).then(() => { $('jsonStatus').textContent = 'Copied'; }).catch(fallback); } catch (x) { fallback(); }
});
$('json').addEventListener('keydown', e => {
  const t = e.target;
  if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); const s = t.selectionStart; t.value = t.value.slice(0, s) + '  ' + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s + 2; }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); loadFromText(t.value); }
});

// ----- Options picker -----
function currentChoices(L) {
  const cf = choiceFeatures(DEF)[0];
  if (!cf) return {};
  return { [cf.choose.from]: knownOptions(DEF, L, cf.id, manual).map(o => o.id) };
}
function renderOpts() {
  const cf = choiceFeatures(DEF)[0];
  if (!cf) { $('cries').innerHTML = ''; return; }
  const L = +$('lvl').value;
  const known = Math.floor(ev({ L, def: DEF, sc: {} }, cf.choose.known, 'avg'));
  const cur = currentChoices(L)[cf.choose.from];
  $('cryCount').textContent = `${cur.length} of ${known}`;
  $('cries').innerHTML = (DEF.options[cf.choose.from] || []).filter(o => !o.subclass).map(o => {
    const elig = (o.level || 1) <= L, on = cur.includes(o.id), dis = !elig || (!on && cur.length >= known);
    return `<label class="${elig ? '' : 'off'}"><input type="checkbox" value="${esc(o.id)}" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}> ${esc(o.name)}${elig ? '' : ` <small>L${o.level}</small>`}</label>`;
  }).join('');
  $('cryHint').textContent = manual ? 'Your picks. Untick all to go back to automatic.' : 'Picked automatically. Tick your own to override.';
}
$('cries').addEventListener('change', () => {
  const picked = [...$('cries').querySelectorAll('input:checked')].map(i => i.value);
  manual = picked.length ? picked : null;
  renderOpts(); schedule();
});

function readCfg() {
  const L = +$('lvl').value;
  const mode = radio('encMode');
  const enc = mode === 'auto' ? autoEncounter(L, $('diff').value) : { id: $('mon').value, count: clamp(+$('monCount').value || 1, 1, 12) };
  return {
    def: DEF, L, sub: radio('sub') || null, build: $('build').value, choices: currentChoices(L), enc, diff: $('diff').value, mode,
    fights: +radio('fights'), shortRest: $('sr').checked, tight: +$('tight').value / 100, adj: +$('adj').value / 100, bannerP: $('banner').disabled ? 0 : +$('banner').value / 100,
    runs: +$('runs').value,
  };
}
function syncLabels() {
  const L = +$('lvl').value;
  $('lvlOut').textContent = L;
  $('tightOut').textContent = $('tight').value + '%';
  $('adjOut').textContent = $('adj').value + '%';
  $('bannerOut').textContent = $('banner').value + '%';
  const sl = DEF.core.subclassLevel || 3;
  $('subNote').textContent = L < sl ? `from level ${sl}` : '';
  const mode = radio('encMode');
  $('diffRow').hidden = mode !== 'auto'; $('pickRow').hidden = mode === 'auto';
  const c = readCfg(), M = MON_BY[c.enc.id];
  $('encLine').textContent = `${c.enc.count} × ${M.name} (CR ${M.cr}) · AC ${M.ac} · ${M.hp} HP · +${M.hit} to hit · ${M.atk.length} attack${M.atk.length > 1 ? 's' : ''}${M.breath ? ` · breath ${M.breath.dice}` : ''}${M.regen ? ` · regenerates ${M.regen}` : ''}`;
  renderOpts();
}

let timer = null;
function schedule() { syncLabels(); clearTimeout(timer); timer = setTimeout(runMain, 350); markSweepStale(); }
document.querySelectorAll('aside input, aside select').forEach(el => { if (el.closest('#cries') || el.closest('#subSeg')) return; el.addEventListener('input', schedule); el.addEventListener('change', schedule); });
$('go').addEventListener('click', () => { clearTimeout(timer); runMain(); });
for (const k of Object.keys(ALL_SIDES)) $('cmp-' + k).addEventListener('change', e => {
  if (!Object.keys(ALL_SIDES).some(x => $('cmp-' + x).checked)) { e.target.checked = true; return; }
  setSidesFromBoxes(); $('cmpHint').textContent = 'Changed here; the file still says ' + fileCompare().list.map(x => ALL_SIDES[x] ? ALL_SIDES[x][1] : x).join(' and ') + '.';
});
$('sweepBtn').addEventListener('click', runSweep);
$('reroll').addEventListener('click', () => renderLog(readCfg()));

function runMain() {
  const cfg = readCfg();
  $('status').textContent = 'Simulating…'; $('go').disabled = true;
  requestAnimationFrame(() => setTimeout(() => {
    const t = performance.now();
    try {
      const a = runMany(cfg, 'hb', cfg.runs);
      const cs = SIDES.map(([cls]) => runMany(cfg, cls, cfg.runs));
      drawSweep(); renderVerdict(cfg, a, cs); renderMetrics(cfg, a, cs); renderBars(cfg, a, cs); renderFeats(cfg, a, cs); renderLog(cfg);
      $('status').textContent = `${(cfg.runs * 3).toLocaleString()} days in ${Math.round(performance.now() - t)} ms`;
    } catch (x) { $('status').textContent = `The simulation stopped: ${x.message}`; }
    $('go').disabled = false;
  }, 10));
}

function judge(a, b) {
  const ds = (a.surv - b.surv) * 100;
  const ratio = b.val > 0 ? a.val / b.val : 1;
  const kod = b.ko > 0 ? (a.ko - b.ko) / b.ko : 0;
  let tone = 'good', label = 'In line';
  const bothSafe = a.surv > 0.95 && b.surv > 0.95;
  if (ds < -6 || (bothSafe && kod > 0.25 && ratio < 0.9)) { tone = 'bad'; label = 'Falls behind'; }
  else if (ds > 6 || (bothSafe && kod < -0.25 && ratio > 1.1)) { tone = 'warn'; label = 'Pulls ahead'; }
  return { ds, ratio, kod, tone, label };
}
function renderVerdict(cfg, a, cs) {
  const name = DEF.name, subObj = (DEF.subclasses || []).find(s => s.id === cfg.sub);
  const sub = subObj && cfg.L >= (DEF.core.subclassLevel || 3) ? subObj.name : 'no subclass yet', M = MON_BY[cfg.enc.id];
  const js = cs.map(b => judge(a, b));
  const names = SIDES.map(sd => 'the ' + sd[1]);
  const every = t => js.every(j => j.tone === t);
  let say;
  if (every('good')) say = `At level ${cfg.L} the ${name} holds up about as well as ${listNames(names)}.`;
  else if (every('warn')) say = `At level ${cfg.L} the party does clearly better with the ${name} than with ${js.length === 2 ? 'either ' : js.length > 2 ? 'any of ' : ''}${orNames(names)}.`;
  else if (every('bad')) say = `At level ${cfg.L} the party does worse with the ${name} than with ${js.length === 2 ? 'either ' : js.length > 2 ? 'any of ' : ''}${orNames(names)}.`;
  else {
    const part = (j, n) => j.tone === 'good' ? `about even with ${n}` : j.tone === 'warn' ? `ahead of ${n}` : `behind ${n}`;
    say = `At level ${cfg.L} the ${name} is ${listNames(js.map((j, k) => part(j, names[k])))}.`;
  }
  const line = (b, j, n) => `<b>vs ${n}:</b> days survived ${pct(a.surv)} vs ${pct(b.surv)} (${j.ds >= 0 ? '+' : ''}${fmt(j.ds, 0)} pts), knockdowns per fight ${fmt(a.ko, 2)} vs ${fmt(b.ko, 2)}, seat value ×${fmt(j.ratio, 2)}.`;
  const allSafe = a.surv > 0.95 && cs.every(b => b.surv > 0.95), allDead = a.surv < 0.2 && cs.every(b => b.surv < 0.2);
  $('verdict').innerHTML = `
    <span class="who">Level ${cfg.L} ${esc(name)} v${esc(DEF.version || '?')} · ${esc(sub)} · ${cfg.enc.count} × ${M.name} · ${cfg.fights} fight${cfg.fights > 1 ? 's' : ''} a day</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${js.map((j, k) => `<span class="pgchip ${j.tone}">${j.label} · ${SIDES[k][1]}</span>`).join('')}</div>
    <p class="say">${esc(say)}</p>
    <p>${cs.map((b, k) => line(b, js[k], SIDES[k][1])).join('<br>')}</p>
    ${allSafe ? '<p class="hint">All the parties almost always survive, so knockdowns and seat value carry the comparison. Try a harder encounter or more fights per day.</p>' : ''}${allDead ? '<p class="hint">All the parties usually lose this day, so the encounter may be too deadly to compare classes.</p>' : ''}`;
}
function renderMetrics(cfg, a, cs) {
  const rows = [
    ['Days survived (no wipe)', 'surv', pct, 1], ['Fights won', 'win', pct, 1], ['Rounds per fight', 'rpf', x => fmt(x), -1],
    ['Party HP lost per fight', 'dmg', x => fmt(x, 0), -1], ['Knockdowns per fight', 'ko', x => fmt(x, 2), -1],
    ['Knockdowns stopped per fight', 'saved', x => fmt(x, 2), 1], ['Characters killed per day', 'deaths', x => fmt(x, 2), -1], ['Seat value per round', 'val', x => fmt(x), 1],
  ];
  const diff = (x, y, f, good) => {
    const dlt = x - y, rel = Math.abs(y) > 1e-9 ? Math.abs(dlt / y) : Math.abs(dlt);
    const cls = rel < 0.03 ? '' : (dlt * good > 0 ? 'up' : 'down');
    const ds = f === pct ? `${dlt >= 0 ? '+' : '−'}${Math.abs(Math.round(dlt * 100))} pts` : `${dlt >= 0 ? '+' : '−'}${f(Math.abs(dlt))}`;
    return `<td class="n ${cls}">${ds}</td>`;
  };
  $('metrics').innerHTML = `<thead><tr><th>Measure</th><th class="n k-wc">${esc(DEF.name)}</th>${SIDES.map(s => `<th class="n ${s[2]}">${s[1]}</th>`).join('')}${SIDES.map(s => `<th class="n">vs ${s[1]}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(([l, k, f, good]) => `<tr><td>${l}</td><td class="n">${f(a[k])}</td>${cs.map(b => `<td class="n">${f(b[k])}</td>`).join('')}${cs.map(b => diff(a[k], b[k], f, good)).join('')}</tr>`).join('') + '</tbody>';
}
function renderBars(cfg, a, cs) {
  const max = Math.max(a.val, ...cs.map(b => b.val), 1);
  const bar = (name, s, cls) => `<div class="bar"><span class="${cls}"><b>${esc(name)}</b></span><div class="track" role="img" aria-label="${esc(name)}: ${fmt(s.dealt)} dealt, ${fmt(s.prevent)} prevented, ${fmt(s.heal)} healed per round">
    <span style="flex-basis:${s.dealt / max * 100}%;background:var(--dealt)"></span><span style="flex-basis:${s.prevent / max * 100}%;background:var(--prevent)"></span><span style="flex-basis:${s.heal / max * 100}%;background:var(--heal)"></span></div><span class="tot">${fmt(s.val)}</span></div>`;
  $('bars').innerHTML = bar(DEF.name, a, 'k-wc') + cs.map((b, k) => bar(SIDES[k][1], b, SIDES[k][2])).join('');
}
function featTable(title, s, cls) {
  const rows = Object.entries(s.feat).map(([key, v]) => { const [id, kind] = key.split('|'); return { id, kind, v: v.v / s.F, n: v.n / s.F }; }).filter(r => r.kind !== 'none');
  const val = rows.filter(r => r.kind !== 'count').sort((x, y) => y.v - x.v);
  const cnt = rows.filter(r => r.kind === 'count').sort((x, y) => y.n - x.n);
  const lab = id => esc(LABELS[id] || id);
  return `<div><h3 class="${cls}">${esc(title)}</h3><div class="tablewrap"><table><thead><tr><th>Feature</th><th class="n">Per fight</th></tr></thead><tbody>` +
    val.map(r => `<tr><td>${lab(r.id)} <span class="kind">${KIND_WORD[r.kind]}</span></td><td class="n">${fmt(r.v)}</td></tr>`).join('') +
    cnt.map(r => `<tr><td>${lab(r.id)} <span class="kind">times</span></td><td class="n">${fmt(r.n, 2)}</td></tr>`).join('') +
    (rows.length ? '' : '<tr><td colspan="2">Nothing recorded</td></tr>') + '</tbody></table></div></div>';
}
function renderFeats(cfg, a, cs) { $('feats').innerHTML = featTable(DEF.name, a, 'k-wc') + cs.map((b, k) => featTable(SIDES[k][1], b, SIDES[k][2])).join(''); }

function renderLog(cfg) {
  const ctx = runDay(cfg, 'hb', true);
  let html = '';
  for (const [, r, kind, text] of ctx.log) {
    if (kind === 'fight') { html += `<p class="f">${esc(text)}</p>`; continue; }
    if (kind === 'fight-end') { html += `<div><span class="r"></span><span class="end">${esc(text)}</span></div>`; continue; }
    html += `<div><span class="r">${r ? 'R' + r : ''}</span><span class="${kind}">${esc(text)}</span></div>`;
  }
  $('log').innerHTML = html;
}

// ----- Level sweep -----
let sweepData = null, sweepBusy = false, sweepToken = 0;
function markSweepStale() { if (sweepData && !sweepBusy) $('sweepStatus').textContent = 'Settings changed · run the sweep again to update'; }
function runSweep() {
  if (sweepBusy) return;
  sweepBusy = true; $('sweepBtn').disabled = true;
  const base = readCfg(), token = ++sweepToken;
  const N = 220;
  const out = { cfg: base, sides: [...SIDES], L: [], a: [], c: SIDES.map(() => []) };
  let L = 1;
  const stepFn = () => {
    if (token !== sweepToken) { sweepBusy = false; $('sweepBtn').disabled = false; return; }
    const cfg = { ...base, L, choices: undefined, enc: autoEncounter(L, base.diff) };
    out.L.push(L); out.a.push(runMany(cfg, 'hb', N)); out.sides.forEach(([cls], k) => out.c[k].push(runMany(cfg, cls, N)));
    sweepData = out; drawSweep();
    $('sweepStatus').textContent = L < 20 ? `Running level ${L + 1} of 20…` : `${N} days per class per level · ${base.diff} budget`;
    if (++L <= 20) setTimeout(stepFn, 0); else { sweepBusy = false; $('sweepBtn').disabled = false; }
  };
  setTimeout(stepFn, 0);
}
function lineChart(title, key, fmtY, yMax, unitNote) {
  const S = sweepData, w = 600, h = 230, l = 44, r = 14, t = 14, bt = 30;
  const X = L => l + (L - 1) * (w - l - r) / 19;
  const maxV = yMax ?? Math.max(1, ...S.a.map(s => s[key]), ...S.c.flat().map(s => s[key])) * 1.08;
  const Y = v => t + (1 - v / maxV) * (h - t - bt);
  const ticks = [0, .25, .5, .75, 1].map(f => f * maxV);
  const path = arr => arr.map((s, i) => `${i ? 'L' : 'M'}${X(S.L[i]).toFixed(1)},${Y(s[key]).toFixed(1)}`).join('');
  const cur = +$('lvl').value;
  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${title} by level for the ${esc(DEF.name)}, ${S.sides.map(sd => sd[1]).join(', ')} parties">`;
  svg += ticks.map(v => `<line class="grid" x1="${l}" x2="${w - r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${l - 6}" y="${Y(v) + 4}" text-anchor="end">${fmtY(v)}</text>`).join('');
  svg += [1, 5, 10, 15, 20].map(L => `<text x="${X(L)}" y="${h - 10}" text-anchor="middle">${L}</text>`).join('');
  svg += `<line class="now" x1="${X(cur)}" x2="${X(cur)}" y1="${t}" y2="${h - bt}"/>`;
  svg += S.sides.map((sd, k) => `<path class="${sd[3]}" d="${path(S.c[k])}"/>`).join('') + `<path class="l-wc" d="${path(S.a)}"/>`;
  const li = S.a.length - 1;
 svg += S.sides.map((sd, k) => `<circle class="${sd[4]}" cx="${X(S.L[li])}" cy="${Y(S.c[k][li][key])}" r="3.5"/>`).join('') + `<circle class="d-wc" cx="${X(S.L[li])}" cy="${Y(S.a[li][key])}" r="3.5"/>`;
  svg += '</svg>';
  return `<div class="chart"><h3>${title}</h3><div class="legend" style="margin:4px 0 6px"><span><i style="background:var(--wc)"></i>${esc(DEF.name)}</span>${S.sides.map(sd => `<span><i style="background:var(${sd[5]})"></i>${sd[1]} (${sd[6]})</span>`).join('')}<span>${unitNote}</span></div>${svg}</div>`;
}
function drawSweep() {
  if (!sweepData) return;
  $('sweep').innerHTML = lineChart('Days survived', 'surv', v => Math.round(v * 100) + '%', 1, 'x: level') +
    lineChart('Knockdowns per fight', 'ko', v => fmt(v, 1), null, 'lower is better') +
    lineChart('Seat value per round', 'val', v => fmt(v, 0), null, 'dealt + prevented + healed');
}

// ----- Reference (rendered from the skeleton reference markdown) -----
function md(src) {
  const inl = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const lines = src.split('\n'); let html = '', i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (ln.startsWith('```')) { let j = i + 1; const code = []; while (j < lines.length && !lines[j].startsWith('```')) code.push(lines[j++]); html += `<pre>${esc(code.join('\n'))}</pre>`; i = j + 1; continue; }
    if (/^#{1,3} /.test(ln)) { if (!ln.startsWith('# ')) html += `<h3>${inl(ln.replace(/^#+ /, ''))}</h3>`; i++; continue; }
    if (ln.startsWith('|')) {
      const rows = []; while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = r => r.slice(1, -1).split(' | ').map(c => c.trim());
      html += `<div class="tablewrap"><table><thead><tr>${cells(rows[0]).map(c => `<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>` + rows.slice(2).map(r => `<tr>${cells(r).map(c => `<td>${inl(c)}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>';
      continue;
    }
    if (ln.startsWith('- ')) { const items = []; while (i < lines.length && lines[i].startsWith('- ')) items.push(lines[i++].slice(2)); html += `<ul>${items.map(x => `<li>${inl(x)}</li>`).join('')}</ul>`; continue; }
    if (ln.trim()) html += `<p>${inl(ln)}</p>`;
    i++;
  }
  return html;
}
$('ref').innerHTML = md(REFERENCE_MD);

// ----- Start -----
let startText = null;
if (!PRESETS[wantedClass]) try { startText = localStorage.getItem(STORE_KEY); } catch (x) { /* storage unavailable */ }
const okText = t => { try { return validateClass(JSON.parse(t)).length === 0; } catch (x) { return false; } };
if (!startText || !okText(startText)) startText = JSON.stringify(PRESETS[PRESETS[wantedClass] ? wantedClass : DEFAULT_PRESET], null, 2);
$('json').value = startText;
loadFromText(startText, true);
$('jsonStatus').textContent = `Loaded ${DEF.name} v${DEF.version || '?'}`;
syncLabels();
runMain();
setTimeout(runSweep, 600);
