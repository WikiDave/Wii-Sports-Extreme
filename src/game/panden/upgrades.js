// Upgrades per property: security, storage, speed, comfort and decoration. Levels 0..3, the
// price of the next level is UPGRADES[track].costs[level] x the property's tier. Pure logic.
//
// Other features read the effects through these helpers:
//   raidFactor(state, id)   politie: multiply the raid chance of property id (1 = no security).
//   storageOf(state, id)    the stock room of a property (used by economy.js and empire.js).
//   speedFor(state, slot)   stations.js: time factor of the station in slot n (1 = normal).

import { PROPERTIES, UPGRADES, PAINTS } from '../data/properties.js';
import { levelOf, pandenOf, stationOwners, MAX_LEVEL } from './save.js';

export const UPGRADE_KEYS = Object.keys(UPGRADES);

/** Time factor per production level: a batch takes this share of its normal time. */
export const SPEED_FACTOR = [1, 0.85, 0.7, 0.55];
/** Raid chance factor per security level. */
export const RAID_FACTOR = [1, 0.8, 0.6, 0.4];
/** Storage factor per storage level (+25% each). */
export const storageFactor = (level) => 1 + 0.25 * level;

/** Stock room of a property, with the storage upgrade. */
export function storageOf(state, id) {
  const base = PROPERTIES[id]?.storage ?? 0;
  return Math.round(base * storageFactor(levelOf(state, 'storage', id)));
}

export const speedFactor = (state, id) => SPEED_FACTOR[levelOf(state, 'speed', id)];

/** Time factor of the station in slot `slot` (the order of state.properties). */
export function speedFor(state, slot) {
  const id = stationOwners(state)[slot];
  return id ? speedFactor(state, id) : 1;
}

export const raidFactor = (state, id) => RAID_FACTOR[levelOf(state, 'security', id)];

/** Sleeping in a bed with comfort: the heat drops this much extra, and you wake up rested (xp). */
export function comfortBonus(state, id) {
  const lvl = levelOf(state, 'comfort', id);
  return { heat: lvl, xp: lvl * 5 };
}

/** Price of the next level of a track, or null when it is at the top. */
export function upgradeCost(state, id, track) {
  const lvl = levelOf(state, track, id);
  if (lvl >= MAX_LEVEL || !PROPERTIES[id]) return null;
  return UPGRADES[track].costs[lvl] * PROPERTIES[id].tier;
}

/** Buys the next level of a track for an owned property. Returns whether it worked. */
export function buyUpgrade(game, id, track) {
  const s = game.state;
  if (!s.properties.includes(id) || !UPGRADE_KEYS.includes(track)) return false;
  const cost = upgradeCost(s, id, track);
  if (cost == null || !game.addCash(-cost)) return false;
  pandenOf(s)[track][id] = levelOf(s, track, id) + 1;
  game.emit('change');
  return true;
}

/** The paint index of a property (0 = the original white). */
export function paintOf(state, id) {
  const v = Math.floor(state.ext?.panden?.paint?.[id] ?? 0);
  return v >= 0 && v < PAINTS.length ? v : 0;
}

/** Chooses the wall colour (needs decor level 1). Returns whether it worked. */
export function setPaint(game, id, index) {
  const s = game.state;
  if (!s.properties.includes(id) || levelOf(s, 'decor', id) < 1 || !PAINTS[index]) return false;
  pandenOf(s).paint[id] = index;
  game.emit('change');
  return true;
}
