// Customer logic: who is where, who is unlocked, what a deal is worth. No DOM, no three.js.

import { CUSTOMERS } from './data/customers.js';
import { parseItem, unitPrice } from './economy.js';
import { staysHome } from './weather.js';

export const MAX_LOYALTY = 100;
/** Price offers: multiplier of the fair value. */
export const OFFERS = { laag: 0.8, eerlijk: 1, hoog: 1.4 };

export const customerById = (id) => CUSTOMERS.find((c) => c.id === id);

/** Per-customer save data, created on demand. */
export function record(state, id) {
  return (state.customers[id] ??= { loyalty: 0, unlocked: false, lastDay: 0, deals: 0 });
}

/** Whether a customer is known to the player: introduced by a friend or by rank, or from the start. */
export function isUnlocked(state, c, rank) {
  const r = state.customers[c.id];
  if (r?.unlocked) return true;
  if (!c.unlock) return true;
  if (c.unlock.rank != null && rank >= c.unlock.rank) return true;
  if (c.unlock.loyalty) {
    const [other, need] = c.unlock.loyalty;
    return (state.customers[other]?.loyalty ?? 0) >= need;
  }
  return false;
}

/** Whether the customer is at their spot at this hour (0..28, a day runs 6..28). */
export function isPresent(c, hour) {
  const h = hour < 6 ? hour + 24 : hour;
  return c.schedule.some(([from, to]) => h >= from && h < to);
}

/** Customers you can trade with right now (unlocked, present, not served today). */
export function available(state, rank, hour) {
  return CUSTOMERS.filter((c) => isUnlocked(state, c, rank) && isPresent(c, hour) && !staysHome(state.day, c.id) && (state.customers[c.id]?.lastDay ?? 0) < state.day);
}

/** What one unit of an item is worth to this customer: fair value plus 15% per liked effect. */
export function valueFor(c, key) {
  const p = parseItem(key);
  if (!p) return 0;
  const liked = p.effects.filter((e) => c.likes.includes(e)).length;
  return Math.round(unitPrice(p.product, p.effects, p.quality) * (1 + 0.15 * liked));
}

/** Highest price per unit the customer accepts: 25% above their value, loyalty adds up to 15% (so a high offer needs a loyal customer). */
export function maxPrice(c, key, loyalty = 0) {
  return Math.round(valueFor(c, key) * (1.25 + 0.15 * (loyalty / MAX_LOYALTY)));
}

/**
 * Tries a deal of up to `qty` units at offer ('laag' | 'eerlijk' | 'hoog'); factor scales
 * the prices (a rival at the spot). Returns
 * { ok, sold, money, message }. On success the customer's loyalty grows (more for a
 * low offer), on a refusal it drops.
 */
export function deal(game, c, key, qty, offer, factor = 1) {
  const state = game.state;
  const rec = record(state, c.id);
  const price = Math.round(valueFor(c, key) * OFFERS[offer] * factor);
  const have = state.inventory[key] ?? 0;
  const n = Math.min(qty, have, Math.floor(c.budget / Math.max(1, price)));
  if (price > maxPrice(c, key, rec.loyalty) * factor) {
    rec.loyalty = Math.max(0, rec.loyalty - 5);
    rec.lastDay = state.day;
    game.emit('change');
    return { ok: false, sold: 0, money: 0, message: `${c.name} vindt dit veel te duur.` };
  }
  if (n < 1) return { ok: false, sold: 0, money: 0, message: `${c.name} kan of wil dit niet kopen.` };
  game.addItem(key, -n);
  const money = price * n;
  game.addCash(money);
  game.addXp(Math.ceil(money / 4));
  rec.loyalty = Math.min(MAX_LOYALTY, rec.loyalty + (offer === 'laag' ? 12 : offer === 'eerlijk' ? 8 : 4));
  rec.deals++;
  rec.lastDay = state.day;
  rec.unlocked = true;
  game.emit('change');
  return { ok: true, sold: n, money, message: `${c.name} koopt ${n}× voor €${money}.` };
}
