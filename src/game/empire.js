// Properties, stock limit, staff and what staff do each day. No DOM, no three.js.

import { PROPERTIES } from './data/properties.js';
import { STAFF } from './data/staff.js';
import { PRODUCTS } from './data/products.js';
import { canMake, makeBatch, parseItem, unitPrice } from './economy.js';
import { bagBonus } from './missies/skills.js';

export const GARDENER_LEMONS = 8;
export const COOK_BATCHES = 3;
export const PACKER_EXTRA = 2;
export const SELLER_UNITS = 12;

export const stockLimit = (state) => state.properties.reduce((s, id) => s + PROPERTIES[id].storage, 0) + bagBonus(state); // + skill Zware zak
export const staffLimit = (state) => state.properties.reduce((s, id) => s + PROPERTIES[id].slots, 0);
export const stockUsed = (state) => Object.values(state.inventory).reduce((a, b) => a + b, 0);
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
      const n = Math.min(GARDENER_LEMONS, Math.max(0, stockFree(s)));
      if (n) game.addItem('citroen', n);
      log.push(`${w.name} plukte ${n} citroenen.`);
    } else if (id === 'kok') {
      let made = 0;
      let name = '';
      for (let b = 0; b < COOK_BATCHES; b++) {
        const product = cookProduct(game);
        const key = product && makeBatch(game, product, [], 1.05);
        if (!key) break;
        made++;
        name = PRODUCTS[product].name.toLowerCase();
        if (s.staff.includes('inpakker') && stockFree(s) >= PACKER_EXTRA) game.addItem(key, PACKER_EXTRA);
      }
      log.push(made ? `${w.name} maakte ${made} batch${made > 1 ? 'es' : ''} ${name}.` : `${w.name} had geen grondstoffen of ruimte.`);
    } else if (id === 'verkoper') {
      let left = SELLER_UNITS;
      let money = 0;
      for (const [key, n] of Object.entries(s.inventory)) {
        const p = parseItem(key);
        if (!p || !left) continue;
        const k = Math.min(n, left);
        game.addItem(key, -k);
        money += Math.round(unitPrice(p.product, p.effects, p.quality) * 0.8) * k;
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
