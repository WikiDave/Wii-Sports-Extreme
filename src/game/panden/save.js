// Save data of the property feature, in state.ext.panden (no DOM, no three.js).
// Layout: { security: {id: level}, storage: {id: level}, speed: {id: level}, comfort: {id: level},
//           decor: {id: level}, paint: {id: paint index}, chest: {id: {itemKey: n}} }

import { PROPERTIES } from '../data/properties.js';

export const SAVE_KEYS = ['security', 'storage', 'speed', 'comfort', 'decor', 'paint', 'chest'];
export const MAX_LEVEL = 3;

/** The panden save object, created on first use. */
export function pandenOf(state) {
  state.ext ??= {};
  const e = (state.ext.panden ??= {});
  for (const k of SAVE_KEYS) e[k] ??= {};
  return e;
}

/** Upgrade level of a track for a property (0..3). Reads never create save data. */
export function levelOf(state, track, id) {
  const v = Math.floor(state.ext?.panden?.[track]?.[id] ?? 0);
  return Math.min(MAX_LEVEL, Math.max(0, Number.isFinite(v) ? v : 0));
}

/** One entry per station slot, in the order of state.properties: the property that owns the station. */
export function stationOwners(state) {
  return state.properties.flatMap((id) => Array.from({ length: PROPERTIES[id]?.stations ?? 0 }, () => id));
}
