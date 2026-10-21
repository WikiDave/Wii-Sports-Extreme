// Police raids: on a morning after heat level 3 or more, the police may search the hut and your
// other places while you slept. Whatever product is stored in a place can be seized, unless the
// place has security upgrades (state.ext.panden.security[id], a number: 1 means one upgrade).
// Pure logic: the caller applies the plans with applyRaids().

import { PROPERTIES } from '../data/properties.js';
import { parseItem } from '../economy.js';
import { addInbox, logEvent } from './state.js';
import { goodsCarried } from './arrest.js';

/** Chance per morning of a raid on each place, by heat level (0..4). */
export const RAID_CHANCE = [0, 0, 0, 0.3, 0.5];

export const raidChance = (level) => RAID_CHANCE[level] ?? 0;

/** Upgrades of a place (0 when there are none; `true` counts as one). */
export function securityOf(state, id) {
  const v = state.ext?.panden?.security?.[id];
  return v === true ? 1 : Math.max(0, Math.floor(Number(v) || 0));
}

/** Share of the stored product that a raid takes: 45% with no security, none from three upgrades. */
export const seizeShare = (security) => Math.max(0, Math.round((0.45 - 0.15 * security) * 100) / 100);

/**
 * The raids of this morning: [{ id, security, seized: { itemKey: n }, total }] for each place that
 * was searched. rand is injectable for tests; the product stored in a place is its share of the
 * stock limit. Nothing is changed here.
 */
export function planRaids(state, level, rand = Math.random) {
  const chance = raidChance(level);
  if (!chance) return [];
  const limit = state.properties.reduce((n, id) => n + PROPERTIES[id].storage, 0) || 1;
  const work = { ...state.inventory };
  const plans = [];
  for (const id of state.properties) {
    if (rand() >= chance) continue;
    const security = securityOf(state, id);
    const stored = goodsCarried({ inventory: work }) * (PROPERTIES[id].storage / limit);
    let want = Math.floor(stored * seizeShare(security));
    const seized = {};
    let total = 0;
    const stacks = Object.entries(work)
      .filter(([k]) => parseItem(k))
      .sort((a, b) => b[1] - a[1]);
    for (const [k, have] of stacks) {
      if (want <= 0) break;
      const t = Math.min(have, want);
      seized[k] = t;
      total += t;
      want -= t;
      work[k] = have - t;
      if (work[k] === 0) delete work[k];
    }
    plans.push({ id, security, seized, total });
  }
  return plans;
}

/** Removes the seized product, writes the inbox message and the log. Returns the messages. */
export function applyRaids(game, plans) {
  const s = game.state;
  const out = [];
  for (const p of plans) {
    for (const [k, n] of Object.entries(p.seized)) {
      s.inventory[k] = (s.inventory[k] ?? 0) - n;
      if (s.inventory[k] <= 0) delete s.inventory[k];
    }
    const place = PROPERTIES[p.id].name;
    let text;
    if (p.total > 0) text = `Politie-inval bij ${place}: ${p.total} stuks in beslag genomen.`;
    else if (p.security > 0) text = `De sloten en camera's van ${place} hielden de agenten buiten. Niets in beslag genomen.`;
    else text = `De politie heeft ${place} doorzocht, maar er lag niets dat ze konden vinden.`;
    const title = p.total > 0 ? 'Politie-inval' : 'Politiebezoek';
    addInbox(s, { title, text });
    logEvent(s, 'inval', text);
    s.ext.politie.raids += 1;
    out.push({ title, text, total: p.total, id: p.id });
  }
  if (plans.length) game.emit('change');
  return out;
}
