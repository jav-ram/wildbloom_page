// Wildbloom Proving Ground: combat engine and UI, ported from the standalone simulator.
// ===== Proving Ground combat engine =====
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
  { id: 'goblin', name: 'Goblin', cr: '1/4', xp: 50, ac: 15, hp: 7, hit: 4, atk: ['1d6+2'], sv: { wis: -1, dex: 2, con: 0 }, init: 2 },
  { id: 'orc', name: 'Orc', cr: '1/2', xp: 100, ac: 13, hp: 15, hit: 5, atk: ['1d12+3'], sv: { wis: 0, dex: 1, con: 3 }, init: 1 },
  { id: 'bugbear', name: 'Bugbear', cr: '1', xp: 200, ac: 16, hp: 27, hit: 4, atk: ['2d8+2'], sv: { wis: 0, dex: 2, con: 1 }, init: 2 },
  { id: 'ogre', name: 'Ogre', cr: '2', xp: 450, ac: 11, hp: 59, hit: 6, atk: ['2d8+4'], sv: { wis: -2, dex: -1, con: 3 }, init: -1 },
  { id: 'owlbear', name: 'Owlbear', cr: '3', xp: 700, ac: 13, hp: 59, hit: 7, atk: ['1d10+5', '2d8+5'], sv: { wis: 1, dex: 1, con: 3 }, init: 1 },
  { id: 'ettin', name: 'Ettin', cr: '4', xp: 1100, ac: 12, hp: 85, hit: 7, atk: ['2d8+5', '2d8+5'], sv: { wis: 0, dex: -1, con: 3 }, init: -1 },
  { id: 'troll', name: 'Troll', cr: '5', xp: 1800, ac: 15, hp: 84, hit: 7, atk: ['1d6+4', '2d6+4', '2d6+4'], sv: { wis: -1, dex: 1, con: 5 }, init: 1, regen: 10 },
  { id: 'chimera', name: 'Chimera', cr: '6', xp: 2300, ac: 14, hp: 114, hit: 7, atk: ['2d6+4', '1d12+4', '2d6+4'], sv: { wis: 2, dex: 0, con: 4 }, init: 0, breath: { dice: '7d8', dc: 15, save: 'dex', n: 2, what: 'fire' } },
  { id: 'stonegiant', name: 'Stone Giant', cr: '7', xp: 2900, ac: 17, hp: 126, hit: 9, atk: ['3d8+6', '3d8+6'], sv: { wis: 4, dex: 5, con: 8 }, init: 2 },
  { id: 'frostgiant', name: 'Frost Giant', cr: '8', xp: 3900, ac: 15, hp: 138, hit: 9, atk: ['3d12+6', '3d12+6'], sv: { wis: 3, dex: -1, con: 8 }, init: -1 },
  { id: 'firegiant', name: 'Fire Giant', cr: '9', xp: 5000, ac: 18, hp: 162, hit: 11, atk: ['6d6+7', '6d6+7'], sv: { wis: 2, dex: 2, con: 10 }, init: -1 },
  { id: 'stonegolem', name: 'Stone Golem', cr: '10', xp: 5900, ac: 17, hp: 178, hit: 10, atk: ['3d8+6', '3d8+6'], sv: { wis: 0, dex: -1, con: 5 }, init: -1 },
  { id: 'youngred', name: 'Young Red Dragon', cr: '10', xp: 5900, ac: 18, hp: 178, hit: 10, atk: ['2d10+1d6+6', '2d6+6', '2d6+6'], sv: { wis: 4, dex: 4, con: 9 }, init: 0, breath: { dice: '16d6', dc: 17, save: 'dex', n: 3, what: 'fire' } },
  { id: 'stormgiant', name: 'Storm Giant', cr: '13', xp: 10000, ac: 16, hp: 230, hit: 14, atk: ['6d6+9', '6d6+9'], sv: { wis: 9, dex: 0, con: 10 }, init: 2 },
  { id: 'icedevil', name: 'Ice Devil', cr: '14', xp: 11500, ac: 18, hp: 180, hit: 10, atk: ['2d6+5+3d6', '2d4+5+3d6', '2d6+5+3d6'], sv: { wis: 7, dex: 7, con: 9 }, init: 2 },
  { id: 'adultwhite', name: 'Adult White Dragon', cr: '13', xp: 10000, ac: 18, hp: 200, hit: 11, atk: ['2d10+1d8+6', '2d6+6', '2d6+6'], sv: { wis: 6, dex: 5, con: 11 }, init: 0, breath: { dice: '12d8', dc: 19, save: 'con', n: 3, what: 'cold' } },
  { id: 'adultgreen', name: 'Adult Green Dragon', cr: '15', xp: 13000, ac: 19, hp: 207, hit: 11, atk: ['2d10+2d6+6', '2d6+6', '2d6+6'], sv: { wis: 7, dex: 6, con: 10 }, init: 1, breath: { dice: '16d6', dc: 18, save: 'con', n: 3, what: 'poison' } },
  { id: 'purpleworm', name: 'Purple Worm', cr: '15', xp: 13000, ac: 18, hp: 247, hit: 9, atk: ['3d8+9', '3d6+9+12d6'], sv: { wis: 4, dex: -2, con: 11 }, init: -2 },
  { id: 'adultred', name: 'Adult Red Dragon', cr: '17', xp: 18000, ac: 19, hp: 256, hit: 14, atk: ['2d10+2d6+8', '2d6+8', '2d6+8'], sv: { wis: 7, dex: 6, con: 13 }, init: 0, breath: { dice: '18d6', dc: 21, save: 'dex', n: 3, what: 'fire' } },
  { id: 'balor', name: 'Balor', cr: '19', xp: 22000, ac: 19, hp: 262, hit: 14, atk: ['3d8+8+3d8', '2d6+8+3d6'], sv: { wis: 9, dex: 0, con: 12 }, init: 2 },
  { id: 'pitfiend', name: 'Pit Fiend', cr: '20', xp: 25000, ac: 19, hp: 300, hit: 14, atk: ['4d6+8', '2d8+8', '2d6+8+6d6', '3d10+8'], sv: { wis: 10, dex: 8, con: 13 }, init: 2 },
  { id: 'ancientblack', name: 'Ancient Black Dragon', cr: '21', xp: 33000, ac: 22, hp: 367, hit: 15, atk: ['2d10+2d8+8', '2d6+8', '2d6+8'], sv: { wis: 9, dex: 9, con: 14 }, init: 2, breath: { dice: '15d8', dc: 22, save: 'dex', n: 4, what: 'acid' } },
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
const WHEN = ['passive', 'bonusAction', 'reaction', 'dropToZero', 'initiative', 'longRest', 'afterChoice', 'modify', 'exploration'];
const TRIGGERS = ['allyHit', 'allyMiss'];
const TARGETS = ['self', 'selfAndAura', 'aura', 'enemiesInAura', 'enemyInAura'];
// effect type → how its value is counted in the ledger
const EFFECT_KIND = {
  acBonus: 'prevent', reduceDamage: 'prevent', tempHp: 'prevent', resistNext: 'prevent', resistance: 'prevent', frighten: 'prevent', saveAdvantage: 'prevent',
  bonusDamage: 'dealt', advantageVsMark: 'dealt', addToRoll: 'dealt', counterAttack: 'dealt', advantageTokens: 'dealt', grantMastery: 'dealt', rollBonus: 'dealt',
  spendHitDie: 'heal', regen: 'heal',
  dropTo1: 'count', gatherAura: 'count', taunt: 'count', deathSaveAdvantage: 'count', freeChoice: 'count',
  saveProficiency: 'none', extraChoice: 'none', auraSize: 'none', initiativeBonus: 'none', range: 'none',
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
  if ((m = t.match(/^(\d+)\*(\w+)$/))) return +m[1] * term(pc, m[2], mode);
  if ((m = t.match(/^(\w+)\*(\d+)$/))) return +m[2] * term(pc, m[1], mode);
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
  weapon: 'Weapon attacks', sap: 'Sap mastery (enemy disadvantage)', graze: 'Graze mastery', secondwind: 'Second Wind',
  smite: 'Divine Smite', radiant: 'Radiant Strikes', defense: 'Defense style (+1 AC)', loh: 'Lay on Hands', aop: 'Aura of Protection',
  anchor: 'Anchor broken',
};
const KIND_WORD = { dealt: 'dealt', prevent: 'prevented', heal: 'healed', count: 'times' };
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
function knownOptions(def, L, fid, manual) {
  const f = (def.features || []).find(x => x.id === fid);
  if (!f || !f.choose) return [];
  const all = (def.options[f.choose.from] || []).filter(o => (o.level || 1) <= L);
  const n = Math.floor(ev({ L, def, sc: {} }, f.choose.known, 'avg'));
  if (manual && manual.length) { const v = manual.map(id => all.find(o => o.id === id)).filter(Boolean).slice(0, n); if (v.length) return v; }
  return [...all].sort((a, b) => (a.pick ?? 99) - (b.pick ?? 99)).slice(0, n);
}
function buildHB(def, L, cfg) {
  const builds = def.core.builds, bk = builds[cfg.build] ? cfg.build : Object.keys(builds)[0], b = builds[bk];
  const sc = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...b.scores };
  for (const [lv, inc] of Object.entries(b.asi || {})) if (L >= +lv) for (const [k, v] of Object.entries(inc)) sc[k] = Math.min(20, sc[k] + v);
  const feats = classFeatures(def, cfg.sub, L);
  const saves = [...def.core.saves];
  for (const f of feats) for (const e of f.effects || []) if (e.type === 'saveProficiency') saves.push(e.save);
  const pc = basePC({ name: def.name, cls: 'hb', L, sc, hd: def.core.hitDie, saves, ac: scaleAt(def.core.ac, L), role: def.role || 'front' });
  pc.def = def; pc.feats = feats; pc.sub = cfg.sub;
  const w = def.core.weapon, am = mod(sc[w.ability || 'str']);
  pc.atk = { hit: PB(L) + am, dmg: spec(w.damage + '+' + am), mastery: w.mastery || null };
  pc.nAtk = scaleAt(def.core.attacks, L) || 1;
  pc.atkAvg = pc.atk.dmg.avg;
  pc.dc = ev(pc, def.core.saveDC || '8+pb', 'avg');
  pc.known = {};
  for (const f of feats) if (f.choose) pc.known[f.id] = knownOptions(def, L, f.id, cfg.choices && cfg.choices[f.id]);
  return pc;
}
const fx = (pc, when) => pc.feats.filter(f => f.when === when);
const passives = (pc, type) => { const out = []; for (const f of pc.feats) if (f.when === 'passive') for (const e of f.effects || []) if (e.type === type) out.push([f, e]); return out; };
const mods = (pc, fid) => { const out = []; for (const f of pc.feats) if (f.when === 'modify' && f.feature === fid) for (const e of f.effects || []) out.push([f, e]); return out; };
function usesMax(pc, f) { return f.uses ? Math.floor(ev(pc, f.uses.max, 'avg', f.uses.min)) : Infinity; }
function hasUse(pc, f) { return !f.uses || (pc.uses[f.id] ?? 0) > 0; }
function spendUse(pc, f) { if (f.uses) pc.uses[f.id]--; }
function inAuraOf(hc, p) { return p === hc || p.inAura; }

const HB = {
  startDay(pc, ctx) {
    pc.res = {}; pc.uses = {};
    for (const [rid, r] of Object.entries(pc.def.resources || {})) pc.res[rid] = Math.floor(ev(pc, r.max, 'avg'));
    for (const f of pc.feats) if (f.uses) pc.uses[f.id] = usesMax(pc, f);
    const an = pc.def.aura && pc.def.aura.anchor;
    if (an) { pc.anchorMax = ev(pc, an.hp || '0', 'avg'); pc.anchorHp = pc.anchorMax; pc.anchorBroken = false; }
    for (const f of fx(pc, 'longRest')) for (const e of f.effects || []) if (e.type === 'advantageTokens') {
      let k = Math.floor(ev(pc, e.count, 'avg', e.min));
      const order = [...ctx.party.filter(p => p !== pc && p.atk), pc, ...ctx.party.filter(p => p !== pc && !p.atk)];
      for (const p of order) if (k-- > 0) p.f.advToken = { id: f.id };
    }
  },
  shortRest(pc) {
    for (const [rid, r] of Object.entries(pc.def.resources || {})) {
      const max = Math.floor(ev(pc, r.max, 'avg'));
      if (r.shortRest === 'all') pc.res[rid] = max; else if (r.shortRest) pc.res[rid] = Math.min(max, pc.res[rid] + r.shortRest);
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
    if (p === hc) { p.inAura = true; p.adj = false; continue; }
    p.inAura = size > 0 && R() < pA;
    p.adj = R() < clamp(ctx.cfg.adj * (p.role === 'front' ? 1.5 : 1), 0, 1);
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
  }
  return [];
}
const pFail = (save, dc) => clamp((dc - 1 - save) / 20, 0.05, 0.95);

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
    case 'bonusDamage': return aff.filter(p => p.atk).length * 0.75 * amt;
    case 'advantageVsMark': return aff.reduce((a, p) => a + (p.atk ? 0.2 * p.atkAvg : 0), 0);
    case 'tempHp': return n * Math.min(amt, perPC * pHit * hitAvg);
    case 'resistNext': return n * Math.min(1, perPC * pHit) * hitAvg / 2;
    case 'frighten': return mons.filter(m => m.inAura).reduce((a, m) => a + pFail(m.sv[e.save || 'wis'], hc.dc) * m.dpr * 0.25, 0);
    case 'saveAdvantage': { const br = mons.find(m => m.breath && m.breathReady); return br ? n * 0.15 * br.breathAvg * 0.5 : 0.5; }
    case 'gatherAura': return live.filter(p => p.conscious && p !== hc && !p.inAura).length * 1.5;
    case 'dropTo1': { const low = aff.filter(p => p.hp + p.thp <= hitAvg * 1.3); return low.length ? 50 + low.length * hitAvg : 0; }
    case 'spendHitDie': { const down = live.filter(p => !p.conscious && p.inAura); return down.length ? 60 + down.length * 20 : 0; }
  }
  return 0;
}
const EMERGENCY = ['dropTo1', 'spendHitDie'];
function chooseOptions(ctx, hc, f, free) {
  if (!free && f.cost && (hc.res[f.cost] || 0) <= 0) return null;
  const evs = (hc.known[f.id] || []).map(o => [o, (o.effects || []).reduce((a, e) => a + effectEV(ctx, hc, e), 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  if (!evs.length) return null;
  const em = (evs[0][0].effects || []).some(e => EMERGENCY.includes(e.type));
  if (!free && !em && f.cost && hc.spent[f.id] >= hc.share[f.id]) return null;
  let count = (f.choose && f.choose.count) || 1;
  for (const [pf, e] of passives(hc, 'extraChoice')) if (e.feature === f.id && evs.length > count && hasUse(hc, pf)) { spendUse(hc, pf); count += e.count || 1; }
  return evs.slice(0, count).map(x => x[0]);
}
function useChoice(ctx, hc, f, opts, free) {
  if (!free && f.cost) { hc.res[f.cost]--; hc.spent[f.id]++; credit(ctx, hc, f.cost, 'count', 0); }
  for (const o of opts) applyEffects(ctx, hc, o, o.effects);
  for (const af of fx(hc, 'afterChoice')) if (af.feature === f.id) applyEffects(ctx, hc, af, af.effects);
  const an = hc.def.aura && hc.def.aura.anchor;
  if (an && an.plant === 'withBonusAction' && !free && !hc.planted && !hc.anchorBroken) { hc.planted = true; log(ctx, 'wc', `The ${an.name || 'anchor'} is planted`); }
}
function applyEffects(ctx, hc, src, effects, dur) {
  const cha = mod(hc.sc.cha);
  for (const e of effects || []) {
    const tg = () => pickTargets(ctx, hc, e.targets, e.revive);
    let note = '';
    switch (e.type) {
      case 'tempHp': {
        const base = ev(hc, e.amount);
        const selfExtra = e.selfAmount ? ev(hc, e.selfAmount, 'avg') - ev(hc, e.amount, 'avg') : 0;
        for (const p of tg()) {
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
      case 'taunt': for (const m of tg()) if (d(20) + (m.sv[e.save || 'wis'] ?? 0) < hc.dc) { m.taunt = src.id; credit(ctx, hc, src.id, 'count', 0); log(ctx, 'wc', `${src.name}: ${m.name} is drawn to the ${hc.name}`); } break;
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
      case 'auraSize': ctx.dur.aura = { size: ev(hc, e.amount, 'avg'), rounds: dur || 10 }; break;
      case 'rollBonus': ctx.dur.roll = { id: src.id, rolls: e.rolls || ['attack'], amount: e.amount, rounds: dur || 10 }; break;
      case 'regen': ctx.dur.regen = { id: src.id, amount: e.amount, rounds: dur || 10 }; break;
    }
    if (src.name && ['tempHp', 'bonusDamage', 'advantageVsMark', 'resistNext', 'dropTo1', 'saveAdvantage', 'gatherAura', 'frighten', 'spendHitDie', 'auraSize'].includes(e.type)) log(ctx, 'wc', `${hc.name} uses ${src.name}${note}`);
  }
}
function hbTurn(ctx, hc) {
  for (const p of ctx.party) { p.f.bonusDmg = null; p.f.mark = false; p.f.resistNext = null; p.f.dropTo1 = null; p.f.saveAdv = null; }
  ctx.mark = null;
  for (const m of ctx.monsters) m.taunt = null;
  hc.reaction = true; hc.resUsed = false;
  for (const k of Object.keys(ctx.dur)) if (ctx.dur[k] && --ctx.dur[k].rounds <= 0) ctx.dur[k] = null;
  position(ctx, hc);
  if (!hc.conscious) return deathSave(ctx, hc);
  let bonus = false;
  const ba = fx(hc, 'bonusAction').sort((a, b) => (b.ai === 'firstRound') - (a.ai === 'firstRound'));
  for (const f of ba) {
    if (bonus) break;
    if (f.choose) { const o = chooseOptions(ctx, hc, f, false); if (o) { useChoice(ctx, hc, f, o, false); bonus = true; } }
    else if (hasUse(hc, f) && (f.ai !== 'firstRound' || ctx.round === 1)) {
      spendUse(hc, f); applyEffects(ctx, hc, f, f.effects, f.duration); bonus = true; position(ctx, hc);
    }
  }
  const an = hc.def.aura && hc.def.aura.anchor;
  if (an && !bonus && !hc.planted && !hc.anchorBroken) { hc.planted = true; log(ctx, 'wc', `${hc.name} plants the ${an.name || 'anchor'}`); }
  for (let i = 0; i < hc.nAtk; i++) {
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
      pcAttack(ctx, p, t, { adv: R() < 0.5 ? 'self' : null, onHit: crit => nd(p.sneak * (crit ? 2 : 1), 6) });
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

// ----- Combat helpers -----
function focus(ctx) { let b = null; for (const m of ctx.monsters) if (m.hp > 0 && (!b || m.hp < b.hp)) b = m; return b; }
function damageMon(ctx, m, dmg) {
  if (m.hp <= 0 || dmg <= 0) return;
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
      if (range === 'adjacent' ? !p.adj : !p.inAura) continue;
      const e = (f.effects || []).find(x => x.type === 'addToRoll'); if (!e) continue;
      if (t.ac - total > ev(hc, e.amount, 'max')) continue;
      hc.reaction = false; spendUse(hc, f);
      const add = ev(hc, e.amount);
      if (total + add >= t.ac) { hit = true; src = f.id; log(ctx, 'wc', `${f.name}: ${p.name}'s miss becomes a hit (+${add})`); }
      break;
    }
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
  const tot = base + extra;
  if (src) credit(ctx, hc, src, 'dealt', Math.min(tot, hpBefore));
  credit(ctx, p, opt.key || 'weapon', 'dealt', Math.min(base, hpBefore));
  if (a.mastery === 'sap') t.sapped = p;
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
      if (range === 'adjacent' ? !p.adj : !p.inAura) continue;
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
  if (dmg > 0) {
    let resId = null;
    if (p.f.resistNext) { resId = p.f.resistNext; p.f.resistNext = null; }
    else if (hc && p === hc && info.bps) {
      for (const [f, e] of passives(hc, 'resistance')) {
        if (e.limit === 'firstPerRound' && hc.resUsed) continue;
        if (e.requires === 'nearAnchor' && !(hc.planted && !hc.anchorBroken && R() < 0.85)) continue;
        if (e.limit === 'firstPerRound') hc.resUsed = true;
        resId = f.id; break;
      }
    }
    if (resId) { const h = Math.floor(dmg / 2); credit(ctx, hc, resId, 'prevent', dmg - h); dmg = h; }
  }
  if (p.thp > 0 && dmg > 0) { const a = Math.min(p.thp, dmg); p.thp -= a; dmg -= a; if (p.thpSrc) credit(ctx, hc, p.thpSrc, 'prevent', a); }
  if (dmg <= 0) return;
  if (p.f.sg && d(20) + p.sv.con < Math.max(10, Math.floor(dmg / 2))) { p.f.sg = 0; log(ctx, 'sys', 'Cleric loses concentration on Spirit Guardians'); }
  ctx.S.partyDmg += Math.min(dmg, p.hp);
  p.hp -= dmg;
  if (p.hp > 0) return;
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
  p.hp = 0; p.thp = 0; p.conscious = false; p.ds = { s: 0, f: 0 }; p.stable = false; p.f.sg = 0;
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
  const dis = [];
  if (m.fright) dis.push([m.fright, ctx.hc]);
  if (m.sapped) { dis.push(['sap', m.sapped]); m.sapped = null; }
  const r = d20(false, dis.length > 0);
  const total = r.nat + m.hit;
  const [sw, swId] = acBonus(ctx, tgt);
  const ac = tgt.ac + sw;
  const crit = r.nat === 20;
  const hit = crit || (r.nat !== 1 && total >= ac);
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
function monTurn(ctx, m) {
  if (m.hp <= 0) return;
  if (m.regen && m.hp < m.max) m.hp = Math.min(m.max, m.hp + m.regen);
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
      if (p.cls === 'rogue' && p.L >= 7 && m.breath.save === 'dex') x = ok ? 0 : Math.floor(dmg / 2);
      dmgPC(ctx, p, x, { attack: false, bps: false });
    }
  } else {
    const an = hc && hc.def.aura && hc.def.aura.anchor;
    for (const s of m.atk) {
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
  const cl = ctx.party.find(p => p.cls === 'cleric' && p.conscious && p.f.sg);
  if (cl && m.hp > 0 && R() < 0.6) {
    let x = nd(3 + (cl.f.sg - 3), 8); if (d(20) + m.sv.wis >= cl.dc) x = Math.floor(x / 2);
    damageMon(ctx, m, x);
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
  CLS[c.cls].turn(ctx, c);
}
const over = ctx => ctx.monsters.every(m => m.hp <= 0) || !ctx.party.some(p => p.conscious);
function runFight(ctx) {
  ctx.monsters = spawn(ctx.cfg.enc);
  ctx.dur = {}; ctx.mark = null; ctx.advance = false;
  for (const p of ctx.party) if (!p.dead) { p.f.bonusDmg = null; p.f.mark = false; p.f.resistNext = null; p.f.dropTo1 = null; p.f.saveAdv = null; p.f.vex = null; CLS[p.cls].startFight?.(p, ctx); }
  const hc = ctx.hc;
  ctx.round = 0;
  if (hc) position(ctx, hc);
  if (ctx.pal) for (const q of ctx.party) q.inPal = q === ctx.pal || R() < clamp(ctx.cfg.tight * (ctx.pal.L >= 18 ? 30 : 10) / 15, 0, 1);
  log(ctx, 'fight', `Fight ${ctx.fi + 1}: ${ctx.cfg.enc.count} × ${MON_BY[ctx.cfg.enc.id].name}`);
  const all = [...ctx.party.filter(p => !p.dead), ...ctx.monsters];
  let ib = 0;
  if (hc) for (const [, e] of passives(hc, 'initiativeBonus')) ib += ev(hc, e.amount, 'avg', e.min);
  for (const c of all) c.ini = d(20) + c.init + (c.side === 'party' && ib && inAuraOf(hc, c) ? ib : 0) + R() * 0.01;
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
function buildSlot(cfg, slotCls) { return slotCls === 'hb' ? buildHB(cfg.def, cfg.L, cfg) : CLS[slotCls].build(cfg.L, cfg); }
function runDay(cfg, slotCls, wantLog) {
  const party = [buildSlot(cfg, slotCls), CLS.fighter.build(cfg.L, cfg), CLS.rogue.build(cfg.L, cfg), CLS.cleric.build(cfg.L, cfg)];
  if (slotCls === 'fighter') party[0].name = 'Fighter (seat)';
  const S = { fights: 0, won: 0, rounds: 0, partyDmg: 0, knock: 0, deaths: 0, saved: 0, survived: 0, feat: {} };
  const ctx = { cfg, party, slot: party[0], hc: slotCls === 'hb' ? party[0] : null, pal: slotCls === 'paladin' ? party[0] : null, S, turnId: 0, fights: cfg.fights, fi: 0, round: 0, log: wantLog ? [] : null, dur: {}, monsters: [] };
  party.forEach(p => CLS[p.cls].startDay?.(p, ctx));
  const sr = cfg.shortRest && cfg.fights >= 2 ? Math.ceil(cfg.fights / 2) : -1;
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
    if ((f.when === 'modify' || f.when === 'afterChoice')) need(featIds.has(f.feature), `${w}: feature "${f.feature}" not found.`);
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
if (typeof module !== 'undefined') module.exports = { runMany, runDay, autoEncounter, validateClass, knownOptions, MON_BY };
const REFERENCE_MD = "# Wildbloom class skeleton (schema `wildbloom-class/1`)\n\nOne JSON file describes one class for the Proving Ground. Start from `class-template.json`, or copy `warcaller.class.json`. Paste the file into the simulator's **Class JSON** panel and press **Load class**; the panel lists anything it can't read.\n\n## Top level\n\n| Field | Required | What it is |\n|---|---|---|\n| `schema` | yes | Always `\"wildbloom-class/1\"` |\n| `id`, `name`, `version` | yes | Short id, display name, version string |\n| `role` | no | `front`, `mid` or `back`. How often monsters target it (front is targeted most). Default `front` |\n| `core` | yes | Hit die, saves, armor, builds, weapon, attacks |\n| `scales` | no | Named values that change by level |\n| `resources` | no | Pools of uses, like Battle Cries |\n| `aura` | no | An aura that moves with the character, plus an optional planted anchor |\n| `features` | yes | Class features, in level order |\n| `options` | no | Lists of pickable options, like Battle Cries or maneuvers |\n| `subclasses` | no | Each with `id`, `name` and its own `features` |\n\n## Level tables\n\nAnything that changes by level is written as `{ \"level\": value }`. The highest key at or below the character's level wins: `{ \"1\": \"d6\", \"5\": \"d8\" }` is a d6 at levels 1–4 and a d8 from level 5.\n\n## Expressions\n\nAmounts are numbers, level tables or short expressions joined with `+`:\n\n- Ability modifiers: `str`, `dex`, `con`, `int`, `wis`, `cha`\n- `pb` (proficiency bonus) and `level`\n- Dice: `d6`, `2d8`\n- Any scale name, such as `rallyDie`\n- A multiplier on one term: `5*level`\n\nExamples: `\"rallyDie+cha\"`, `\"8+cha+pb\"`, `\"5*level\"`. Add `\"min\": 1` next to an amount for a minimum.\n\n## core\n\n| Field | Example | Notes |\n|---|---|---|\n| `hitDie` | `10` | 6, 8, 10 or 12 |\n| `saves` | `[\"con\",\"cha\"]` | Saving throw proficiencies |\n| `ac` | `{ \"1\": 18, \"5\": 20 }` | Armor Class by level, before any feature bonus |\n| `builds` | see template | Each build has `label`, all six `scores`, and `asi` by level |\n| `weapon` | `{ \"damage\": \"1d8\", \"ability\": \"str\", \"mastery\": \"sap\" }` | Mastery the sim knows: `sap` (target's next attack has Disadvantage). Others are accepted but have no effect yet |\n| `attacks` | `{ \"1\": 1, \"5\": 2 }` | Attacks per Attack action |\n| `saveDC` | `\"8+cha+pb\"` | DC for the class's saving throws |\n| `subclassLevel` | `3` | Level the subclass features start |\n\n## resources\n\n```json\n\"battleCries\": { \"label\": \"Battle Cries\", \"max\": { \"1\": 2, \"5\": 3 }, \"shortRest\": 1, \"longRest\": \"all\" }\n```\n\n`shortRest` is a number regained or `\"all\"`. The sim spreads a resource evenly over the fights in a day, but emergency options (`dropTo1`, `spendHitDie`) can dip into the reserve.\n\n## aura\n\n```json\n\"aura\": { \"size\": \"auraSize\",\n          \"anchor\": { \"name\": \"War Standard\", \"plant\": \"withBonusAction\", \"ac\": { \"1\": 15, \"7\": 18 },\n                      \"hp\": \"5*level\", \"brokenSize\": 5, \"repair\": \"shortRest\" } }\n```\n\n`size` is in feet. Each round, allies are inside the aura with the chance set by the Battlefield slider, scaled by size. The anchor is optional: it's planted on the first turn (free with a bonus-action feature when `plant` is `withBonusAction`), monsters can attack it, and when it breaks the aura drops to `brokenSize` until a rest.\n\n## features\n\nEvery feature has `id`, `name`, `level`, `when` and usually `effects`.\n\n| `when` | Fires | Extra fields |\n|---|---|---|\n| `passive` | Always on | — |\n| `bonusAction` | On your turn, one per turn | `cost` (resource id), `choose` (pick from options) or `effects`; `\"ai\": \"firstRound\"` to use it on round 1; `duration` in rounds |\n| `reaction` | One per round | `trigger`: `allyHit` (an ally is hit) or `allyMiss` (an ally misses); `range`: `adjacent` or `aura` |\n| `dropToZero` | You'd drop to 0 HP | Usually `dropTo1` plus something |\n| `initiative` | When initiative is rolled | — |\n| `longRest` | At the start of the day | — |\n| `afterChoice` | Right after you use a `choose` feature | `feature`: the choose feature's id |\n| `modify` | Changes another feature | `feature`: the id it changes |\n| `exploration` | Not simulated | Kept for completeness |\n\nLimited uses: `\"uses\": { \"max\": \"cha\", \"min\": 1, \"shortRest\": \"all\", \"longRest\": \"all\" }`.\n\nPick from options: `\"choose\": { \"from\": \"cries\", \"known\": \"criesKnown\", \"count\": 1 }`. `from` is a list in `options`, `known` is how many you know (a scale or number), `count` is how many you use at once.\n\n## options\n\n```json\n\"cries\": [ { \"id\": \"holdFast\", \"name\": \"Hold Fast!\", \"level\": 1, \"pick\": 2, \"effects\": [ ... ] } ]\n```\n\n`pick` sets the order the sim auto-selects known options (lowest first). The page also lets you tick your own.\n\n## Targets\n\n| `targets` | Who |\n|---|---|\n| `self` | Only you |\n| `selfAndAura` | You and allies in your aura |\n| `aura` | Allies in your aura, not you |\n| `enemiesInAura` | Every enemy in your aura |\n| `enemyInAura` | The most dangerous enemy in your aura |\n\n## Effect types\n\nEffects from options and bonus actions last until the start of your next turn unless noted.\n\n| `type` | Fields | What it does | Counted as |\n|---|---|---|---|\n| `acBonus` | `targets`, `amount` | Passive bonus to AC | prevented |\n| `reduceDamage` | `amount`, `min` | Reaction: cut the damage of a hit | prevented |\n| `tempHp` | `targets`, `amount`, `selfAmount`, `rollOnce` | Temporary Hit Points; `selfAmount` is what you get instead | prevented (when absorbed) |\n| `resistNext` | `targets` | Resistance to the next damage taken | prevented |\n| `resistance` | `targets: \"self\"`, `limit: \"firstPerRound\"`, `requires: \"nearAnchor\"` | Passive Resistance to weapon damage | prevented |\n| `frighten` | `targets`, `save` | Save or Frightened (Disadvantage on attacks) until the end of its next turn | prevented |\n| `saveAdvantage` | `targets` | Advantage on the next saving throw | prevented |\n| `bonusDamage` | `targets`, `amount`, `oncePerTurn` | Extra damage on a hit | dealt |\n| `advantageVsMark` | `targets` | First attack against the marked enemy has Advantage | dealt (hits gained) |\n| `addToRoll` | `amount` | Reaction: add to an ally's missed attack roll | dealt (hits gained) |\n| `counterAttack` | — | Used with `modify`: a weapon attack against the attacker | dealt |\n| `advantageTokens` | `count`, `min` | Used with `longRest`: that many creatures get Advantage on one attack | dealt (hits gained) |\n| `grantMastery` | `targets`, `mastery: \"vex\"` | Allies without a mastery gain Vex | dealt (hits gained) |\n| `rollBonus` | `targets`, `rolls: [\"attack\",\"save\"]`, `amount` | Adds to rolls for the feature's `duration` | dealt / prevented |\n| `spendHitDie` | `targets`, `revive` | Each target spends a Hit Die to heal; `revive` gets downed allies to 1 HP first | healed |\n| `regen` | `targets`, `amount` | Heals at the start of each turn for the feature's `duration` | healed |\n| `dropTo1` | `targets` | Next time it would drop to 0 HP, it drops to 1 instead | knockdowns stopped |\n| `gatherAura` | — | Everyone moves into your aura for a round | uses |\n| `taunt` | `targets: \"enemyInAura\"`, `save` | Save or the enemy can only attack you well | uses |\n| `deathSaveAdvantage` | `targets` | Passive Advantage on death saves | death saves turned |\n| `freeChoice` | `feature` | Use a `choose` feature for free | uses |\n| `extraChoice` | `feature`, `count` | Passive: use more options at once; respects the feature's `uses` | — |\n| `saveProficiency` | `save` | Passive save proficiency | — |\n| `initiativeBonus` | `targets`, `amount`, `min` | Passive bonus to initiative | — |\n| `auraSize` | `amount` | Sets aura size for the feature's `duration` | — |\n| `range` | `range` | Used with `modify` on a reaction to change its range | — |\n\nIf a rule needs something not on this list, it has to be added to the simulator's engine first. Write the closest effect you can and note what's missing in the class doc's Open questions.\n\n## What the simulator does not model\n\nPositions are abstract, monsters don't use spells or legendary actions, and features marked `exploration` have no effect in combat.\n";
// ===== UI =====
const $ = id => document.getElementById(id);
const radio = n => (document.querySelector(`input[name="${n}"]:checked`) || {}).value;
const SIDES = [['paladin', 'Paladin', 'k-cmp', 'l-cmp', 'd-cmp'], ['fighter', 'Fighter', 'k-ftr', 'l-ftr', 'd-ftr']];
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
  $('subSeg').querySelectorAll('input').forEach(el => { el.addEventListener('change', schedule); });
  const cf = choiceFeatures(def)[0];
  $('optRow').hidden = !cf;
  if (cf) $('optLab').textContent = `${cf.name} known`;
  const an = def.aura && def.aura.anchor;
  $('bannerLab').textContent = an ? `Enemy attacks aimed at the ${an.name || 'anchor'}` : 'Enemy attacks aimed at an anchor (none)';
  $('banner').disabled = !an;
  sweepToken++; sweepData = null; $('sweep').innerHTML = ''; $('sweepStatus').textContent = '';
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
  return { [cf.id]: knownOptions(DEF, L, cf.id, manual).map(o => o.id) };
}
function renderOpts() {
  const cf = choiceFeatures(DEF)[0];
  if (!cf) { $('cries').innerHTML = ''; return; }
  const L = +$('lvl').value;
  const known = Math.floor(ev({ L, def: DEF, sc: {} }, cf.choose.known, 'avg'));
  const cur = currentChoices(L)[cf.id];
  $('cryCount').textContent = `${cur.length} of ${known}`;
  $('cries').innerHTML = (DEF.options[cf.choose.from] || []).map(o => {
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
  const [jp, jf] = js;
  let say;
  if (jp.tone === 'good' && jf.tone === 'good') say = `At level ${cfg.L} the ${name} holds up about as well as the Paladin and the Fighter.`;
  else if (jp.tone === 'warn' && jf.tone === 'warn') say = `At level ${cfg.L} the party does clearly better with the ${name} than with either the Paladin or the Fighter.`;
  else if (jp.tone === 'bad' && jf.tone === 'bad') say = `At level ${cfg.L} the party does worse with the ${name} than with either the Paladin or the Fighter.`;
  else {
    const part = (j, n) => j.tone === 'good' ? `about even with the ${n}` : j.tone === 'warn' ? `ahead of the ${n}` : `behind the ${n}`;
    say = `At level ${cfg.L} the ${name} is ${part(jp, 'Paladin')} and ${part(jf, 'Fighter')}.`;
  }
  const line = (b, j, n) => `<b>vs ${n}:</b> days survived ${pct(a.surv)} vs ${pct(b.surv)} (${j.ds >= 0 ? '+' : ''}${fmt(j.ds, 0)} pts), knockdowns per fight ${fmt(a.ko, 2)} vs ${fmt(b.ko, 2)}, seat value ×${fmt(j.ratio, 2)}.`;
  const allSafe = a.surv > 0.95 && cs.every(b => b.surv > 0.95), allDead = a.surv < 0.2 && cs.every(b => b.surv < 0.2);
  $('verdict').innerHTML = `
    <span class="who">Level ${cfg.L} ${esc(name)} v${esc(DEF.version || '?')} · ${esc(sub)} · ${cfg.enc.count} × ${M.name} · ${cfg.fights} fight${cfg.fights > 1 ? 's' : ''} a day</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${js.map((j, k) => `<span class="pgchip ${j.tone}">${j.label} · ${SIDES[k][1]}</span>`).join('')}</div>
    <p class="say">${esc(say)}</p>
    <p>${line(cs[0], jp, 'Paladin')}<br>${line(cs[1], jf, 'Fighter')}</p>
    ${allSafe ? '<p class="hint">All three parties almost always survive, so knockdowns and seat value carry the comparison. Try a harder encounter or more fights per day.</p>' : ''}${allDead ? '<p class="hint">All three parties usually lose this day, so the encounter may be too deadly to compare classes.</p>' : ''}`;
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
  const out = { cfg: base, L: [], a: [], c: [[], []] };
  let L = 1;
  const stepFn = () => {
    if (token !== sweepToken) { sweepBusy = false; $('sweepBtn').disabled = false; return; }
    const cfg = { ...base, L, choices: undefined, enc: autoEncounter(L, base.diff) };
    out.L.push(L); out.a.push(runMany(cfg, 'hb', N)); SIDES.forEach(([cls], k) => out.c[k].push(runMany(cfg, cls, N)));
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
  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${title} by level for the ${esc(DEF.name)}, Paladin and Fighter parties">`;
  svg += ticks.map(v => `<line class="grid" x1="${l}" x2="${w - r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${l - 6}" y="${Y(v) + 4}" text-anchor="end">${fmtY(v)}</text>`).join('');
  svg += [1, 5, 10, 15, 20].map(L => `<text x="${X(L)}" y="${h - 10}" text-anchor="middle">${L}</text>`).join('');
  svg += `<line class="now" x1="${X(cur)}" x2="${X(cur)}" y1="${t}" y2="${h - bt}"/>`;
  svg += SIDES.map((sd, k) => `<path class="${sd[3]}" d="${path(S.c[k])}"/>`).join('') + `<path class="l-wc" d="${path(S.a)}"/>`;
  const li = S.a.length - 1;
  svg += SIDES.map((sd, k) => `<circle class="${sd[4]}" cx="${X(S.L[li])}" cy="${Y(S.c[k][li][key])}" r="3.5"/>`).join('') + `<circle class="d-wc" cx="${X(S.L[li])}" cy="${Y(S.a[li][key])}" r="3.5"/>`;
  svg += '</svg>';
  return `<div class="chart"><h3>${title}</h3><div class="legend" style="margin:4px 0 6px"><span><i style="background:var(--wc)"></i>${esc(DEF.name)}</span><span><i style="background:var(--cmp)"></i>Paladin (dashed)</span><span><i style="background:var(--ftr)"></i>Fighter (dotted)</span><span>${unitNote}</span></div>${svg}</div>`;
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
if (!PRESETS[wantedClass]) { try { startText = localStorage.getItem(STORE_KEY); } catch (x) { /* storage unavailable */ } }
const okText = t => { try { return validateClass(JSON.parse(t)).length === 0; } catch (x) { return false; } };
if (!startText || !okText(startText)) startText = JSON.stringify(PRESETS[PRESETS[wantedClass] ? wantedClass : DEFAULT_PRESET], null, 2);
$('json').value = startText;
loadFromText(startText, true);
$('jsonStatus').textContent = `Loaded ${DEF.name} v${DEF.version || '?'}`;
syncLabels();
runMain();
setTimeout(runSweep, 600);
