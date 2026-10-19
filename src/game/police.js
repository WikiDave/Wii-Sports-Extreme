// The Reglement-meter (heat) and what the island guards do about it. Pure logic: the world
// (world/guards.js) tells it what the guards see.
//
// heat is a number 0..5 (level = floor, max level 4). It rises with deals near guards, with
// walking around at night carrying product, with tips from unhappy customers; it sinks slowly.

import { parseItem } from './economy.js';

export const MAX_LEVEL = 4;
/** Guards on patrol per level. */
export const GUARDS = [1, 2, 3, 5, 7];
export const LEVEL_NAMES = ['Rustig', 'Opgemerkt', 'Verdacht', 'Gezocht', 'Achtervolging'];

export const heatLevel = (state) => Math.min(MAX_LEVEL, Math.floor(state.heat));

/** Changes the heat; quiet skips the 'change' event unless the level changes (per-frame use). */
export function addHeat(game, amount, quiet = false) {
  const s = game.state;
  const before = heatLevel(s);
  s.heat = Math.max(0, Math.min(MAX_LEVEL + 0.99, s.heat + amount));
  const changed = heatLevel(s) !== before;
  if (changed) game.emit('heat', heatLevel(s));
  if (changed || !quiet) game.emit('change');
}

/** Units of product the player carries (plain goods are legal). */
export const carried = (state) => Object.entries(state.inventory).reduce((n, [k, v]) => n + (parseItem(k) ? v : 0), 0);

/** After a deal: more heat when a guard could see it. */
export function onDeal(game, seen) {
  addHeat(game, seen ? 0.9 : 0.25);
}

/** A refused deal: a customer with little loyalty may tip off the guards. */
export function onRefused(game, loyalty, rand = Math.random) {
  if (loyalty < 10 && rand() < 0.35) {
    addHeat(game, 0.6);
    return true;
  }
  return false;
}

/** Per game minute: carrying product at night raises heat, otherwise it sinks. */
export function tickHeat(game, minutes, night) {
  const rate = night && carried(game.state) ? 0.004 : -0.003;
  if (game.state.heat > 0 || rate > 0) addHeat(game, rate * minutes, true);
}

/** A guard frisks you: a fine, and from level 2 your product is taken. Returns a message. */
export function frisk(game) {
  const s = game.state;
  const level = heatLevel(s);
  const fine = Math.min(s.cash, 40 * (level + 1));
  game.addCash(-fine);
  let taken = 0;
  if (level >= 2) {
    for (const [k, n] of Object.entries(s.inventory)) {
      if (parseItem(k)) {
        game.addItem(k, -n);
        taken += n;
      }
    }
  }
  addHeat(game, 0.4);
  return `Gefouilleerd! Boete €${fine}${taken ? `, ${taken} stuks in beslag genomen` : ''}.`;
}

/** Caught after a chase: all product and 30% of your cash are gone; the heat drops to level 2. */
export function caught(game) {
  const s = game.state;
  const lost = Math.round(s.cash * 0.3);
  game.addCash(-lost);
  for (const [k, n] of Object.entries(s.inventory)) if (parseItem(k)) game.addItem(k, -n);
  s.heat = 2;
  game.emit('heat', 2);
  game.emit('change');
  return `Gepakt! Je bent al je waar en €${lost} kwijt.`;
}

/** Escaped a chase: back to level 3. */
export function escaped(game) {
  game.state.heat = Math.min(game.state.heat, 3.5);
  game.emit('heat', heatLevel(game.state));
  game.emit('change');
}

/** Changing clothes in the hut: once a day, costs €20, one level less. */
export function disguise(game) {
  const s = game.state;
  if (s.disguisedDay === s.day || s.heat < 1 || !game.addCash(-20)) return false;
  s.disguisedDay = s.day;
  addHeat(game, -1);
  return true;
}

/** Whether point (px, pz) is inside a view cone at (x, z) facing `heading` (rad, 0 = +z). */
export function inCone(x, z, heading, px, pz, range, fov = 0.9) {
  const dx = px - x;
  const dz = pz - z;
  const d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d < 1.5) return true;
  let a = Math.atan2(dx, dz) - heading;
  a = Math.atan2(Math.sin(a), Math.cos(a));
  return Math.abs(a) < fov / 2;
}

/** View range of a guard at a heat level (metres). */
export const viewRange = (level, factor = 1) => (11 + 3 * level) * factor;
