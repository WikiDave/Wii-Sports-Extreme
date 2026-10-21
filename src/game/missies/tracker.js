// Missions: progress, rewards and what Oma Mies says. Pure logic (no DOM, no three.js), tested with
// Node (tests/missies.test.mjs). All save data lives in state.ext.missies (see emptyExt). The
// statistics and achievements are in stats.js (re-exported here).
//
// Counters (sold, earned, batches, swim, ...) are cumulative in ext.stats. A mission that counts
// something (kind in COUNTER) remembers the counter when it started (ext.base), so "verkoop 10" means
// ten sales from that moment on. Other kinds read the state directly (rank, properties, inventory).
// A mission is 'ready' once its goal is met: you hand it in with Oma Mies (dialogue()), which pays
// the reward and starts the next mission.

import { PRODUCTS, GOODS } from '../data/products.js';
import { PROPERTIES } from '../data/properties.js';
import { STAFF } from '../data/staff.js';
import { RANKS, rankOf } from '../state.js';
import { LEVEL_NAMES } from '../police.js';
import { stationLimit } from '../stations.js';
import { MISSIONS, openMission, FILLER, PLACE_NAMES, UNLOCK_NAMES } from './data.js';
import { newStats, customersServed } from './stats.js';

export * from './stats.js';

export const VERSION = 1;
/** Goal kinds that count from the moment the mission started. */
const COUNTER = new Set(['praat', 'verkoop', 'verdien', 'gemaakt', 'zwem', 'fouilleer', 'oogst']);
const fmt = (n) => Math.round(n).toLocaleString('nl-NL');

/** Fresh save data for the missions feature (`state` gives the starting money and batches). */
export function emptyExt(state = null) {
  return {
    v: VERSION,
    chain: 0, // index of the current mission (MISSIONS, then open missions)
    ready: false, // the current goal is met: hand it in at Oma Mies
    base: 0, // counter value when the current mission started
    introAt: -1, // mission index whose intro Oma has said
    done: 0, // missions handed in
    points: 0, // skill points from missions
    titles: [],
    unlocks: [], // what missions opened, e.g. 'vaardigheden' (the phone app)
    log: [], // { id, title, day } of the last handed-in missions
    stats: newStats(),
    money: state ? { cash: state.cash, bank: state.bank } : null,
    jobs: state ? state.jobs.map((j) => j.id) : [], // batch ids already counted
    visits: {}, // waypoint -> 1 (reached) or 2 (reached while swimming)
    achieved: {}, // achievement id -> day
    seenAch: 0, // achievements the player has looked at (for the badge)
    skills: {},
    tutorial: { step: 0, done: false, hidden: -1 },
  };
}

/** Whether a save is older than the missions feature (then Oma has met you already). */
const isOldSave = (s) => s.day > 1 || s.xp > 0 || s.cash !== 250 || Object.keys(s.inventory ?? {}).length > 0;

/**
 * The missions save data of a game, created on first use. Old saves are caught up: Oma knows you,
 * and every mission whose goal is already met is handed in (rewards paid, nothing said).
 */
export function ensureExt(game) {
  const s = game.state;
  s.ext ??= {};
  if (!s.ext.missies) {
    const ext = emptyExt(s);
    s.ext.missies = ext;
    if (isOldSave(s)) {
      ext.stats.talks = 1;
      ext.tutorial.done = true;
      for (let i = 0; i < 60; i++) {
        evaluate(game, ext);
        if (!ext.ready) break;
        handIn(game, ext, { catchUp: true });
      }
    }
  }
  const ext = s.ext.missies;
  // Keep the shape when a newer version of this file adds fields.
  ext.stats = { ...newStats(), ...ext.stats, made: { ...(ext.stats?.made ?? {}) } };
  ext.visits ??= {};
  ext.achieved ??= {};
  ext.skills ??= {};
  ext.titles ??= [];
  ext.unlocks ??= [];
  ext.log ??= [];
  ext.tutorial ??= { step: 0, done: false, hidden: -1 };
  return ext;
}

/** The mission now: MISSIONS in order, then endless open missions. */
export function current(ext) {
  return ext.chain < MISSIONS.length ? MISSIONS[ext.chain] : openMission(ext.chain - MISSIONS.length + 1);
}

/** Raw value of a goal: a counter (not yet minus the base) or the state. */
function rawValue(game, ext, g) {
  const s = game.state;
  const st = ext.stats;
  switch (g.kind) {
    case 'praat': return st.talks;
    case 'verkoop': return st.sold;
    case 'verdien': return st.earned;
    case 'gemaakt': return g.product ? st.made[g.product] ?? 0 : st.batches;
    case 'zwem': return st.swim;
    case 'fouilleer': return st.frisked;
    case 'oogst': return st.collected;
    case 'klanten': return customersServed(s);
    case 'voorraad': return s.inventory[g.item] ?? 0;
    case 'effecten': return st.maxEffects;
    case 'kwaliteit': return st.maxQuality;
    case 'rang': return rankOf(s.xp);
    case 'bezit': return s.properties.includes(g.id) ? 1 : 0;
    case 'personeel': return s.staff.includes(g.id) ? 1 : 0;
    case 'bericht': return s.messages.filter((m) => m.status === 'done').length;
    case 'heat': return st.maxHeat;
    case 'bank': return s.bank;
    case 'bereik': return (ext.visits[g.place] ?? 0) >= (g.swim ? 2 : 1) ? 1 : 0;
    case 'stations': return stationLimit(s);
    default: return 0;
  }
}

/** The counter a goal starts from (0 for goals that read the state). */
function counterOf(game, ext, g) {
  return COUNTER.has(g.kind) ? rawValue(game, ext, g) : 0;
}

/** { value, goal, done } of the mission (value is capped at goal). */
export function progressOf(game, ext, m = current(ext)) {
  const g = m.goal;
  const goal = g.n ?? 1;
  const raw = rawValue(game, ext, g);
  const value = COUNTER.has(g.kind) ? Math.max(0, raw - ext.base) : raw;
  return { value: Math.min(value, goal), goal, done: value >= goal };
}

/** Marks the current mission ready when its goal is met. Returns true when it just became ready. */
export function evaluate(game, ext) {
  if (ext.ready) return false;
  if (!progressOf(game, ext).done) return false;
  ext.ready = true;
  return true;
}

/**
 * Hands in the ready mission: pays the reward, unlocks titles, skill points and apps, and starts the
 * next mission. Returns { mission, reward, next } or null when nothing was ready.
 */
export function handIn(game, ext, { catchUp = false } = {}) {
  const m = current(ext);
  if (!ext.ready || !m) return null;
  const r = m.reward ?? {};
  ext.chain++;
  ext.ready = false;
  ext.done++;
  if (r.points) ext.points += r.points;
  if (r.title && !ext.titles.includes(r.title)) ext.titles.push(r.title);
  if (r.unlock && !ext.unlocks.includes(r.unlock)) ext.unlocks.push(r.unlock);
  ext.log.push({ id: m.id, title: m.title, day: game.state.day });
  if (ext.log.length > 40) ext.log.shift();
  ext.base = catchUp ? 0 : counterOf(game, ext, current(ext).goal);
  if (r.cash) game.addCash(r.cash);
  if (r.xp) game.addXp(r.xp);
  return { mission: m, reward: r, next: current(ext) };
}

/** Plain words for a goal, e.g. "Verkoop 10 stuks". */
export function describeGoal(g) {
  const n = g.n ?? 1;
  switch (g.kind) {
    case 'praat': return 'Praat met Oma Mies';
    case 'verkoop': return n === 1 ? 'Verkoop 1 stuk' : `Verkoop ${fmt(n)} stuks`;
    case 'verdien': return `Verdien in totaal €${fmt(n)}`;
    case 'gemaakt': return g.product ? `Maak ${n}× ${PRODUCTS[g.product].name.toLowerCase()}` : `Start ${n} batch${n === 1 ? '' : 'es'}`;
    case 'zwem': return `Zwem ${fmt(n)} meter`;
    case 'fouilleer': return `Word ${n}× gefouilleerd`;
    case 'oogst': return `Haal ${fmt(n)} stuks uit de machines`;
    case 'klanten': return `Verkoop aan ${n} verschillende klanten`;
    case 'voorraad': return `Heb ${n} stuks ${(GOODS[g.item]?.name ?? g.item).toLowerCase()} in je voorraad`;
    case 'effecten': return `Maak een product met ${n} effecten`;
    case 'kwaliteit': return `Maak een product van ${n >= 115 ? '★★★' : '★★'} kwaliteit`;
    case 'rang': return `Bereik rang ${n}: ${RANKS[n]}`;
    case 'bezit': return `Koop ${PROPERTIES[g.id].name} (€${fmt(PROPERTIES[g.id].price)})`;
    case 'personeel': return `Huur een ${STAFF[g.id].name.toLowerCase()} in`;
    case 'bericht': return `Lever ${n} bestelling van een klant af`;
    case 'heat': return `Bereik niveau ${n}: ${LEVEL_NAMES[n]}`;
    case 'bank': return `Zet €${fmt(n)} op de bank`;
    case 'bereik': return `Ga naar ${PLACE_NAMES[g.place]}${g.swim ? ' en zwem erheen' : ''}`;
    case 'stations': return `Heb ${n} machines`;
    default: return '';
  }
}

/** Words for the reward: "Je krijgt €50, 10 ervaring en de titel ...". */
export function rewardText(r) {
  const parts = [];
  if (r.cash) parts.push(`€${fmt(r.cash)}`);
  if (r.xp) parts.push(`${r.xp} ervaring`);
  if (r.points) parts.push(`${r.points} vaardigheidspunt${r.points > 1 ? 'en' : ''}`);
  if (r.title) parts.push(`de titel "${r.title}"`);
  if (r.unlock) parts.push(UNLOCK_NAMES[r.unlock] ?? r.unlock);
  if (!parts.length) return '';
  const last = parts.pop();
  return `Je krijgt ${parts.length ? `${parts.join(', ')} en ${last}` : last}.`;
}

/** What Oma says when you talk to her. Hands in a ready mission. Returns { lines, handed } (handed: the hand-in or null). */
export function dialogue(game, ext) {
  ext.stats.talks++;
  evaluate(game, ext);
  const m = current(ext);
  if (ext.ready) {
    const lines = [];
    if (ext.introAt < ext.chain) lines.push(...m.intro);
    lines.push(...m.done);
    const reward = rewardText(m.reward ?? {});
    if (reward) lines.push(reward);
    const handed = handIn(game, ext);
    if (handed?.next) {
      ext.introAt = ext.chain;
      lines.push(...handed.next.intro);
    }
    return { lines, handed };
  }
  if (ext.introAt < ext.chain) {
    ext.introAt = ext.chain;
    return { lines: [...m.intro], handed: null };
  }
  const { value, goal } = progressOf(game, ext, m);
  const nudges = m.nudge ?? [m.hint];
  const text = nudges[ext.stats.talks % nudges.length].replace('{rest}', fmt(goal - value));
  const lines = [text];
  if (ext.stats.talks % 3 === 0) lines.push(FILLER[ext.stats.talks % FILLER.length]);
  return { lines, handed: null };
}
