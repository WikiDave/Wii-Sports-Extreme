// Properties, stock limit, staff and what staff do each day. No DOM, no three.js.

import { PROPERTIES } from './data/properties.js';
import { STAFF } from './data/staff.js';
import { PRODUCTS } from './data/products.js';
import { canMake, parseItem, unitPrice, cookingUnits } from './economy.js';
import { busy, stationLimit, startJob } from './stations.js';
import { storageOf } from './panden/upgrades.js';
import { stockCount } from './panden/chest.js';
import { bagBonus } from './missies/skills.js';

/** The gardener keeps this many lemons in stock: the lemons of two batches of limonade, no more. */
export const GARDENER_KEEP = 2 * PRODUCTS.limonade.needs.citroen;
/** Batches the cook starts in the morning, each in a free station. */
export const COOK_BATCHES = 3;
export const COOK_QUALITY = 1.05;
export const PACKER_EXTRA = 2;
/** The seller takes this many units a morning, at this share of their value (the rest is commission). */
export const SELLER_UNITS = 8;
export const SELLER_SHARE = 0.7;

/** Stock room of your places, with the storage upgrades (see panden/upgrades.js) and the skill Zware zak. */
export const stockLimit = (state) => state.properties.reduce((s, id) => s + storageOf(state, id), 0) + bagBonus(state);
export const staffLimit = (state) => state.properties.reduce((s, id) => s + PROPERTIES[id].slots, 0);
/** Everything you own: carried in the inventory, stored in the chests of your places, and cooking in the stations. */
export const stockUsed = (state) => stockCount(state) + cookingUnits(state);
export const stockFree = (state) => stockLimit(state) - stockUsed(state);

export function buyProperty(game, id) {
  const p = PROPERTIES[id];
  const s = game.state;
  if (s.properties.includes(id) || game.rank < p.rank || !game.addCash(-p.price)) return false;
  s.properties.push(id);
  game.emit('change');
  return true;
}

export function hire(game, id) {
  const s = game.state;
  if (s.staff.length >= staffLimit(s) || game.rank < STAFF[id].rank || s.staff.includes(id)) return false;
  s.staff.push(id);
  game.emit('change');
  return true;
}

export function fire(game, id) {
  const i = game.state.staff.indexOf(id);
  if (i < 0) return false;
  game.state.staff.splice(i, 1);
  game.emit('change');
  return true;
}

/** The product the cook makes: the best unlocked one that the stock can supply. */
function cookProduct(game) {
  return Object.entries(PRODUCTS)
    .filter(([id, p]) => p.rank <= game.rank && canMake(game.state.inventory, id, []))
    .sort((a, b) => b[1].base - a[1].base)[0]?.[0] ?? null;
}

/**
 * The morning round: pay wages, then every paid worker does their job. Staff you cannot pay
 * do nothing that day. Returns lines of text for the player.
 */
export function dailyWork(game) {
  const s = game.state;
  const log = [];
  for (const id of s.staff) {
    const w = STAFF[id];
    if (!game.addCash(-w.wage)) {
      log.push(`${w.name} werkt niet: je kon het loon (€${w.wage}) niet betalen.`);
      continue;
    }
    if (id === 'tuinier') {
      // Only the lemons the limonade recipe can use, so the stock stays free for the other goods.
      const n = Math.min(Math.max(0, GARDENER_KEEP - (s.inventory.citroen ?? 0)), Math.max(0, stockFree(s)));
      if (n) game.addItem('citroen', n);
      log.push(n ? `${w.name} plukte ${n} citroenen.` : `${w.name} hoefde geen citroenen te plukken.`);
    } else if (id === 'kok') {
      // The cook works the stations like you: a batch takes its time, and he waits when none is free.
      const extra = s.staff.includes('inpakker') ? PACKER_EXTRA : 0;
      let made = 0;
      let name = '';
      for (let b = 0; b < COOK_BATCHES; b++) {
        const product = cookProduct(game);
        if (!product || !startJob(game, product, [], COOK_QUALITY, extra)) break;
        made++;
        name = PRODUCTS[product].name.toLowerCase();
      }
      let text = `${w.name} had geen grondstoffen of ruimte.`;
      if (made) text = `${w.name} zette ${made} batch${made > 1 ? 'es' : ''} ${name} in de stations.`;
      else if (busy(s) >= stationLimit(s)) text = `${w.name} wacht: alle stations zijn bezig.`;
      log.push(text);
    } else if (id === 'verkoper') {
      let left = SELLER_UNITS;
      let money = 0;
      for (const [key, n] of Object.entries(s.inventory)) {
        const p = parseItem(key);
        if (!p || !left) continue;
        const k = Math.min(n, left);
        game.addItem(key, -k);
        money += Math.round(unitPrice(p.product, p.effects, p.quality) * SELLER_SHARE) * k;
        left -= k;
      }
      if (money) {
        game.addCash(money);
        game.addXp(Math.ceil(money / 12));
      }
      log.push(money ? `${w.name} verkocht voor €${money}.` : `${w.name} had niets te verkopen.`);
    }
  }
  return log;
}

/** Runs dailyWork every new day; calls onLog(lines). Returns the function that stops it. */
export function attachDaily(game, onLog) {
  return game.on('newday', () => {
    const log = dailyWork(game);
    if (log.length) onLog(log);
  });
}
