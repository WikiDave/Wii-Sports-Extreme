// Statistics of the player and the achievements. One observer per game event (they change
// state.ext.missies.stats); metricsOf() gives the numbers the achievements look at. Pure logic.

import { parseItem } from '../economy.js';
import { heatLevel } from '../police.js';
import { rankOf } from '../state.js';
import { levelsBought, boostKey } from './skills.js';
import { ACHIEVEMENTS } from './achievements.js';

/** Counters of the player, all starting at zero (see ext.stats in tracker.js). */
export function newStats() {
  return {
    sold: 0, // units sold to customers (deals)
    deals: 0,
    tips: 0,
    earned: 0, // money that came in (cash went up, the bank did not move)
    frisked: 0,
    caught: 0,
    collected: 0, // items taken out of the machines
    batches: 0, // batches started in the machines
    made: {}, // product -> batches started
    maxEffects: 0,
    maxQuality: 0, // in percent, 115 = three stars
    swim: 0, // metres swum
    walk: 0, // metres walked on land
    jumps: 0,
    deepest: 0, // metres under the surface while swimming
    nightMin: 0, // game minutes outside at night
    nights: 0, // nights slept
    calm: 0, // days in a row without the meter, now
    calmBest: 0,
    maxHeat: 0, // highest meter level reached (0..4)
    boycotts: 0,
    verklikt: 0,
    breathless: 0, // times running ran out of breath
    talks: 0, // talks with Oma Mies
    unseen: 0, // sales where no guard was looking
  };
}

/** Customers you have sold to at least once. */
export const customersServed = (state) => Object.values(state.customers ?? {}).filter((r) => (r.deals ?? 0) > 0).length;

/** Every 'change': money that came in, new batches, the best effects and quality so far. */
export function observeChange(game, ext) {
  const s = game.state;
  const st = ext.stats;
  const m = (ext.money ??= { cash: s.cash, bank: s.bank });
  const dCash = s.cash - m.cash;
  const dBank = s.bank - m.bank;
  if (dCash > 0 && dBank === 0) st.earned += dCash;
  m.cash = s.cash;
  m.bank = s.bank;
  const seen = new Set(ext.jobs);
  for (const j of s.jobs) {
    if (seen.has(j.id)) continue;
    seen.add(j.id);
    st.batches++;
    st.made[j.product] = (st.made[j.product] ?? 0) + 1;
  }
  ext.jobs = [...seen].slice(-80);
  for (const key of [...Object.keys(s.inventory), ...s.jobs.map((j) => j.key)]) {
    const p = parseItem(key);
    if (!p) continue;
    st.maxEffects = Math.max(st.maxEffects, p.effects.length);
    st.maxQuality = Math.max(st.maxQuality, Math.round(p.quality * 100));
  }
}

/** A deal: units, the customer's tip, and whether a guard saw it. */
export function observeDeal(ext, d, { unseen = false } = {}) {
  const st = ext.stats;
  st.deals++;
  st.sold += d.sold ?? 0;
  if (d.tip > 0) st.tips++;
  if (!unseen) st.unseen += d.sold ?? 0;
}

/** A new day: nights, days without the meter. */
export function observeNewDay(game, ext) {
  const st = ext.stats;
  st.nights++;
  if (heatLevel(game.state) === 0) {
    st.calm++;
    st.calmBest = Math.max(st.calmBest, st.calm);
  } else st.calm = 0;
}

export const observeHeat = (ext, level) => (ext.stats.maxHeat = Math.max(ext.stats.maxHeat, level));
export const observeFrisk = (ext) => ext.stats.frisked++;
export const observeCaught = (ext) => ext.stats.caught++;
export const observeCollected = (ext, items) => (ext.stats.collected += items);
export const observeBoycott = (ext) => ext.stats.boycotts++;
export const observeVerklikt = (ext) => ext.stats.verklikt++;
export const observeJump = (ext) => ext.stats.jumps++;
export const observeBreath = (ext) => ext.stats.breathless++;
export const observeNight = (ext, minutes) => (ext.stats.nightMin += minutes);
export const observeDepth = (ext, depth) => (ext.stats.deepest = Math.max(ext.stats.deepest, depth));

/** Metres walked (on land) or swum. Steps longer than a metre are teleports, so they are skipped. */
export function observeMove(ext, metres, swimming) {
  if (!(metres > 0) || metres > 1) return;
  if (swimming) ext.stats.swim += metres;
  else ext.stats.walk += metres;
}

/** The player reached a waypoint (swimming or not). Swimming is kept when it was seen once. */
export function markVisit(ext, place, swimming) {
  ext.visits[place] = Math.max(ext.visits[place] ?? 0, swimming ? 2 : 1);
}

/** The numbers the achievements are about. */
export function metricsOf(game, ext) {
  const s = game.state;
  const st = ext.stats;
  const records = Object.values(s.customers ?? {});
  return {
    sold: st.sold,
    deals: st.deals,
    customers: customersServed(s),
    tips: st.tips,
    maxLoyalty: Math.max(0, ...records.map((r) => r.loyalty ?? 0)),
    earned: st.earned,
    bank: s.bank,
    belasting: st.earned >= 1000 && s.bank === 0 ? 1 : 0,
    rank: rankOf(s.xp),
    xp: s.xp,
    batches: st.batches,
    maxEffects: st.maxEffects,
    maxQuality: st.maxQuality,
    ijs: st.made.ijs ?? 0,
    snoep: st.made.snoep ?? 0,
    swim: st.swim,
    deepest: st.deepest,
    nightMin: st.nightMin,
    nights: st.nights,
    calm: st.calmBest,
    frisked: st.frisked,
    caught: st.caught,
    maxHeat: st.maxHeat,
    boycotts: st.boycotts,
    verklikt: st.verklikt,
    breathless: st.breathless,
    jumps: st.jumps,
    talks: st.talks,
    missionsDone: ext.done,
    skillLevels: levelsBought(s),
    stilSold: st.talks === 0 ? st.sold : 0,
    unseen: st.unseen,
  };
}

export const achievedCount = (ext) => Object.keys(ext.achieved).length;
export const unseenAchievements = (ext) => Math.max(0, achievedCount(ext) - ext.seenAch);

/** Achievements that are met now and not yet in ext.achieved (marks them). Returns the new ones. */
export function checkAchievements(game, ext) {
  const m = metricsOf(game, ext);
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (ext.achieved[a.id] !== undefined || (m[a.key] ?? 0) < a.goal) continue;
    ext.achieved[a.id] = game.state.day;
    fresh.push(a);
  }
  return fresh;
}

/** { value, goal, done } of an achievement (value capped at goal). */
export function achievementProgress(game, ext, a) {
  const v = metricsOf(game, ext)[a.key] ?? 0;
  return { value: Math.min(v, a.goal), goal: a.goal, done: ext.achieved[a.id] !== undefined };
}

/**
 * Brouwen: a batch started after the skill was bought gets better quality. Applied once per job
 * (job.bq remembers the level it was checked with). Returns the number of jobs changed.
 */
export function applyBrew(state, level, bonus) {
  let n = 0;
  for (const j of state.jobs) {
    if (j.bq !== undefined) continue;
    j.bq = level;
    if (!level) continue;
    j.key = boostKey(j.key, bonus);
    n++;
  }
  return n;
}
