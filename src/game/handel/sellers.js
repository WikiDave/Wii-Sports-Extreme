// Street sellers ("verkopers"): hiring, stock, routes, the cash pouch, tips and firing.
// The selling itself over time is in sim.js. Pure logic, no DOM or three.js.
//
// Every function that changes something returns { ok: true, ... } or { ok: false, reason } with a
// Dutch reason that the UI can show.

import { parseItem } from '../economy.js';
import { stockFree } from '../empire.js';
import { RANKS } from '../state.js';
import { BANK_FEE, CANDIDATES, ROUTES, STOCK_MAX, candidateById, hireFee, pouchCap } from './data.js';
import { handelState } from './store.js';
import { now } from './time.js';

const fail = (reason) => ({ ok: false, reason });

// ------------------------------------------------------------------ skills in numbers
/** Share of the customer's willingness to pay that the seller gets out of them. */
export const priceCapture = (c) => 0.72 + 0.05 * c.prijs;
/** Multiplier on the chance (and the heat) of being noticed: 1.25 (careless) to 0.25 (a shadow). */
export const noticeMult = (c) => 1.5 - 0.25 * c.disc;
/** Multiplier on the number of customers served. */
export const tempoMult = (c) => 0.7 + 0.15 * c.tempo;
/** Chance that a sale is partly pocketed by the seller: only low loyalty skims. */
export const skimChance = (loyalty) => Math.max(0, (55 - loyalty) / 55) * 0.35;

export const stockCount = (s) => Object.values(s.stock).reduce((a, b) => a + b, 0);
export const sellerById = (game, id) => handelState(game).sellers.find((s) => s.id === id) ?? null;
export const pouchTotal = (game) => handelState(game).sellers.reduce((n, s) => n + s.pouch, 0);

/** How many sellers you may have: one per rank (to three) plus one per extra property. */
export const sellerLimit = (game) => (game.rank < 1 ? 0 : Math.min(game.rank, 3) + Math.max(0, game.state.properties.length - 1));

/** Whether a route is open at the player's rank. */
export const routeOpen = (game, zone) => zone === null || (ROUTES[zone] && game.rank >= ROUTES[zone].rank);

/** The people who are looking for work today (a rotating selection of at most six). */
export function recruits(game) {
  const h = handelState(game);
  const day = game.state.day;
  const pool = CANDIDATES.filter((c) => c.rank <= game.rank && !h.sellers.some((s) => s.id === c.id) && (h.blocked[c.id] ?? 0) <= day);
  if (pool.length <= 6) return pool;
  const start = day % pool.length;
  return Array.from({ length: 6 }, (_, i) => pool[(start + i) % pool.length]);
}

/** Why this person cannot be hired right now, or null when it works. */
export function hireBlocker(game, id) {
  const c = candidateById(id);
  const h = handelState(game);
  if (!c) return 'Die ken ik niet.';
  if (game.rank < c.rank) return `Komt pas bij rang ${RANKS[c.rank]}.`;
  if (h.sellers.some((s) => s.id === id)) return 'Werkt al voor je.';
  if ((h.blocked[id] ?? 0) > game.state.day) return 'Is even ondergedoken.';
  if (h.sellers.length >= sellerLimit(game)) return game.rank < 1 ? `Vanaf rang ${RANKS[1]}.` : 'Je hebt geen plek meer voor een handelaar. Een hogere rang of een extra pand geeft plek.';
  if (game.state.cash < hireFee(c)) return `Je hebt €${hireFee(c)} nodig.`;
  return null;
}

export function hireSeller(game, id) {
  const reason = hireBlocker(game, id);
  if (reason) return fail(reason);
  const c = candidateById(id);
  const h = handelState(game);
  game.addCash(-hireFee(c));
  const seller = {
    id, hired: game.state.day, zone: null, stock: {}, pouch: 0, loyalty: c.loyalty,
    sold: 0, earned: 0, skimmed: 0, skimSince: 0, flags: {}, today: { day: game.state.day, sold: 0, money: 0 }, lastMeet: 0,
  };
  h.sellers.push(seller);
  game.emit('change');
  return { ok: true, seller };
}

export function setZone(game, id, zone) {
  const s = sellerById(game, id);
  if (!s) return fail('Onbekende handelaar.');
  if (zone !== null && !ROUTES[zone]) return fail('Onbekende route.');
  if (!routeOpen(game, zone)) return fail(`Die route is open vanaf rang ${RANKS[ROUTES[zone].rank]}.`);
  s.zone = zone;
  s.flags.empty = false;
  game.emit('change');
  return { ok: true };
}

/** Gives a seller n units of a product from your stock (up to what he can carry). */
export function giveStock(game, id, key, n = 1) {
  const s = sellerById(game, id);
  if (!s) return fail('Onbekende handelaar.');
  if (!parseItem(key)) return fail('Dat is geen product.');
  const room = STOCK_MAX - stockCount(s);
  const k = Math.min(Math.floor(n), game.state.inventory[key] ?? 0, room);
  if (k <= 0) return fail(room <= 0 ? 'Er kan niet meer in de tas.' : 'Je hebt dit niet meer.');
  game.addItem(key, -k);
  s.stock[key] = (s.stock[key] ?? 0) + k;
  s.flags.empty = false;
  game.emit('change');
  return { ok: true, n: k };
}

/** Takes units back into your stock (as far as it has room). */
export function takeStock(game, id, key, n = 1) {
  const s = sellerById(game, id);
  if (!s) return fail('Onbekende handelaar.');
  const have = s.stock[key] ?? 0;
  const k = Math.min(Math.floor(n), have, Math.max(0, stockFree(game.state)));
  if (k <= 0) return fail(have ? 'Je voorraad is vol.' : 'Dat zit niet in de tas.');
  s.stock[key] = have - k;
  if (!s.stock[key]) delete s.stock[key];
  game.addItem(key, k);
  return { ok: true, n: k };
}

/** Empties the whole bag back into your stock as far as it fits. Returns the units moved. */
export function takeAll(game, id) {
  const s = sellerById(game, id);
  let moved = 0;
  for (const key of Object.keys(s?.stock ?? {})) moved += takeStock(game, id, key, s.stock[key]).n ?? 0;
  return moved;
}

/**
 * Collects the pouch. 'hand' = in person (cash, free, a chat that cheers him up),
 * 'phone' = he has it brought to you by courier for a fee. Both are cash in your pocket, and that
 * money is DIRTY (the ledger counts it as dirty income): it must go through a business before the
 * bank will take it. Nothing of a pouch goes to the bank directly.
 */
export function collect(game, id, mode = 'hand') {
  const s = sellerById(game, id);
  if (!s) return fail('Onbekende handelaar.');
  if (s.pouch <= 0) return fail('De zak is leeg.');
  const amount = s.pouch;
  const fee = mode === 'phone' ? Math.round(amount * BANK_FEE) : 0;
  const net = amount - fee;
  game.state.cash += net;
  const skimmed = s.skimSince;
  s.pouch = 0;
  s.skimSince = 0;
  s.flags.full = false;
  s.lastCollect = now(game.state);
  game.addXp(Math.ceil(net / 12));
  game.emit('change');
  return { ok: true, amount, fee, net, skimmed, mode };
}

/** Collects every pouch of every seller (by phone: brought over for the fee, still dirty cash). */
export function collectAll(game, mode = 'phone') {
  const total = { amount: 0, fee: 0, net: 0, skimmed: 0 };
  for (const s of [...handelState(game).sellers]) {
    const r = collect(game, s.id, mode);
    if (r.ok) for (const k of Object.keys(total)) total[k] += r[k];
  }
  return total;
}

/** A tip makes a seller more loyal (a little less when he already is). */
export function tip(game, id, amount) {
  const s = sellerById(game, id);
  if (!s) return fail('Onbekende handelaar.');
  if (!game.addCash(-amount)) return fail('Niet genoeg geld.');
  s.loyalty = Math.min(100, s.loyalty + (amount / 4) * (s.loyalty > 80 ? 0.5 : 1));
  game.emit('change');
  return { ok: true, loyalty: s.loyalty };
}

/** Talking to a seller in person: once a day it cheers him up a little. */
export function meet(game, id) {
  const s = sellerById(game, id);
  if (!s || s.lastMeet === game.state.day) return false;
  s.lastMeet = game.state.day;
  s.loyalty = Math.min(100, s.loyalty + 2);
  return true;
}

/** Fires a seller: his stock goes back to you as far as it fits, his pouch is paid out. */
export function fireSeller(game, id) {
  const h = handelState(game);
  const s = sellerById(game, id);
  if (!s) return fail('Onbekende handelaar.');
  const back = takeAll(game, id);
  const left = stockCount(s);
  const pouch = s.pouch;
  if (pouch > 0) game.state.cash += pouch;
  h.sellers.splice(h.sellers.indexOf(s), 1);
  h.blocked[id] = game.state.day + 2;
  game.emit('change');
  return { ok: true, back, left, pouch };
}

// ------------------------------------------------------------------ summaries for the UI
/** Things a seller needs from you: out of stock, pouch (nearly) full, no route. */
export function needs(game, s) {
  const out = [];
  if (!s.zone) out.push('route');
  else if (stockCount(s) === 0) out.push('leeg');
  if (s.pouch >= pouchCap(game.rank) * 0.7) out.push('vol');
  return out;
}

export const attentionCount = (game) => handelState(game).sellers.filter((s) => needs(game, s).some((n) => n !== 'route')).length;
