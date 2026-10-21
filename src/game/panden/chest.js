// Storage chests: goods kept at a property. Goods in a chest still count for your stock limit (the
// stock is inventory plus chests), but they are not carried: staff, sellers and the caught-losses
// only take what is in your inventory. The chest room of a property is its storage (see upgrades.js).

import { storageOf } from './upgrades.js';
import { pandenOf } from './save.js';

/** The chest of a property: { itemKey: n }. Reads never create save data. */
export function chestOf(state, id) {
  return state.ext?.panden?.chest?.[id] ?? {};
}

export const chestUsed = (state, id) => Object.values(chestOf(state, id)).reduce((a, b) => a + b, 0);
export const chestFree = (state, id) => storageOf(state, id) - chestUsed(state, id);

/** Units in all chests of the owned properties. */
export const chestTotal = (state) => state.properties.reduce((n, id) => n + chestUsed(state, id), 0);

/** Units you own: carried (inventory) plus stored (chests). This is what the stock limit counts. */
export const stockCount = (state) =>
  Object.values(state.inventory).reduce((a, b) => a + b, 0) + chestTotal(state);

/** Moves n of an item from the inventory into the chest of a property. Returns whether it worked. */
export function deposit(game, id, key, n) {
  const s = game.state;
  const have = s.inventory[key] ?? 0;
  if (!s.properties.includes(id) || !(n > 0) || have < n || chestFree(s, id) < n) return false;
  game.addItem(key, -n);
  const chest = (pandenOf(s).chest[id] ??= {});
  chest[key] = (chest[key] ?? 0) + n;
  game.emit('change');
  return true;
}

/** Moves n of an item from the chest of a property into the inventory. Returns whether it worked. */
export function withdraw(game, id, key, n) {
  const s = game.state;
  const chest = pandenOf(s).chest[id] ?? {};
  const have = chest[key] ?? 0;
  if (!(n > 0) || have < n) return false;
  if (have === n) delete chest[key];
  else chest[key] = have - n;
  game.addItem(key, n);
  game.emit('change');
  return true;
}
