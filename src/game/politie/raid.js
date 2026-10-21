// Police raids: on a morning after heat level 3 or more, the police may search the hut and your
// other places while you slept. A searched place loses a share of the product it holds:
//   - carried stock (your inventory) counts as stored in the places by their storage room;
//   - the chest of the place itself (panden/chest.js) loses the same share of what is in it.
// The share is 45% with no security, 30% with one upgrade, 15% with two and none with three
// (state.ext.panden.security[id], a number: 1 means one upgrade, `true` counts as one).
// Pure logic: the caller applies the plans with applyRaids().

import { PROPERTIES } from '../data/properties.js';
import { chestOf } from '../panden/chest.js';
import { addInbox, logEvent } from './state.js';
import { goodsCarried, productUnits, takeStacks } from './arrest.js';

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
 * The raids of this morning: [{ id, security, seized, chest, total }] for each place that was
 * searched. `seized` is taken from the carried stock, `chest` from the place's own chest (both are
 * { itemKey: n }), `total` is the sum. rand is injectable for tests. Nothing is changed here.
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
    const share = seizeShare(security);
    const stored = goodsCarried({ inventory: work }) * (PROPERTIES[id].storage / limit);
    const seized = takeStacks(work, Math.floor(stored * share));
    const stash = { ...chestOf(state, id) };
    const fromChest = takeStacks(stash, Math.floor(productUnits(stash) * share));
    plans.push({ id, security, seized, chest: fromChest, total: productUnits(seized) + productUnits(fromChest) });
  }
  return plans;
}

/** Removes the seized product (carried and from the chests), writes the inbox message and the log. Returns the messages. */
export function applyRaids(game, plans) {
  const s = game.state;
  const out = [];
  for (const p of plans) {
    for (const [k, n] of Object.entries(p.seized)) {
      s.inventory[k] = (s.inventory[k] ?? 0) - n;
      if (s.inventory[k] <= 0) delete s.inventory[k];
    }
    const stash = chestOf(s, p.id);
    for (const [k, n] of Object.entries(p.chest ?? {})) {
      stash[k] = (stash[k] ?? 0) - n;
      if (stash[k] <= 0) delete stash[k];
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
