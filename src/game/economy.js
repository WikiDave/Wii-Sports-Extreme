// Mixing, prices and item keys. Pure functions, no DOM or three.js (tested with Node).
//
// A made product is stored in the inventory under a key that holds everything about it:
// "p:<product>:<effect+effect...>:<quality %>", for example "p:limonade:fris+zoet:105".

import { EFFECTS } from './data/effects.js';
import { INGREDIENTS } from './data/ingredients.js';
import { PRODUCTS, GOODS } from './data/products.js';
import { storageOf } from './panden/upgrades.js';
import { stockCount } from './panden/chest.js';

export const MAX_EFFECTS = 6;

/** Mixes one ingredient into a list of effect ids; returns the new list. */
export function mix(effects, ingredientId) {
  const ing = INGREDIENTS[ingredientId];
  const out = effects.map((e) => ing.changes[e] ?? e).filter((e, i, a) => a.indexOf(e) === i);
  if (!out.includes(ing.effect) && out.length < MAX_EFFECTS) out.push(ing.effect);
  return out;
}

/** Effects of a product after mixing the ingredients in order. */
export function recipeEffects(productId, ingredients) {
  return ingredients.reduce(mix, [PRODUCTS[productId].effect]);
}

/** Value of one unit: base x (1 + sum of factors) x quality, in whole euros. */
export function unitPrice(productId, effects, quality = 1) {
  const sum = effects.reduce((s, e) => s + EFFECTS[e].factor, 0);
  return Math.round(PRODUCTS[productId].base * (1 + sum) * quality);
}

export function itemKey(productId, effects, quality) {
  return `p:${productId}:${effects.join('+')}:${Math.round(quality * 100)}`;
}

/** Parses an item key; null for plain goods and ingredients. */
export function parseItem(key) {
  const m = /^p:([a-z]+):([a-z+]*):(\d+)$/.exec(key);
  if (!m) return null;
  return { product: m[1], effects: m[2] ? m[2].split('+') : [], quality: +m[3] / 100 };
}

export function itemName(key) {
  const p = parseItem(key);
  if (p) return `${PRODUCTS[p.product].name} (${p.effects.map((e) => EFFECTS[e].name).join(', ')}) ${qualityLabel(p.quality)}`;
  return GOODS[key]?.name ?? INGREDIENTS[key]?.name ?? key;
}

export function qualityLabel(q) {
  return q >= 1.15 ? '★★★' : q >= 1 ? '★★' : '★';
}

/** Whether the stock has what one batch needs. */
export function canMake(inventory, productId, ingredients) {
  const need = { ...PRODUCTS[productId].needs };
  for (const i of ingredients) need[i] = (need[i] ?? 0) + 1;
  return Object.entries(need).every(([id, n]) => (inventory[id] ?? 0) >= n);
}

/** Takes one batch's goods out of a Game and adds the bottles. Returns the item key or null. */
export function limitFree(game) {
  return limit(game);
}

export function makeBatch(game, productId, ingredients, quality) {
  if (!canMake(game.state.inventory, productId, ingredients)) return null;
  const p = PRODUCTS[productId];
  if (limit(game) < p.yield) return null;
  for (const [id, n] of Object.entries(p.needs)) game.addItem(id, -n);
  for (const i of ingredients) game.addItem(i, -1);
  const key = itemKey(productId, recipeEffects(productId, ingredients), quality);
  game.addItem(key, p.yield);
  game.addXp(8);
  return key;
}

/** Free room in the stock: the storage of your places (with upgrades) less everything you own, chests included. */
function limit(game) {
  const st = game.state;
  const cap = st.properties.reduce((s, id) => s + storageOf(st, id), 0);
  return cap - stockCount(st);
}

/** Buys n of a good or ingredient. */
export function buy(game, id, n = 1) {
  if (limit(game) < n) return false;
  const price = (GOODS[id] ?? INGREDIENTS[id]).price * n;
  if (!game.addCash(-price)) return false;
  game.addItem(id, n);
  return true;
}

/** Sells n units of a product at a share of its value. Returns the money made, or 0. */
export function sell(game, key, n = 1, share = 1) {
  const p = parseItem(key);
  if (!p || !game.addItem(key, -n)) return 0;
  const money = Math.round(unitPrice(p.product, p.effects, p.quality) * share) * n;
  game.addCash(money);
  game.addXp(Math.ceil(money / 10));
  return money;
}
