// Suppliers ("leveranciers"): prices that change by day and weather, availability, bulk
// discounts, relationship levels, orders with delivery times, rush delivery and the crate at the
// hut. Pure logic, no DOM or three.js.

import { GOODS } from '../data/products.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { stockFree } from '../empire.js';
import { RANKS } from '../state.js';
import { EVENTS, dayInfo, hash01 } from '../weather.js';
import {
  BULK, DELIVERY_FEE, FREE_DELIVERY_FROM, INSPECTION_DELAY, LEVELS, MOOD, RUSH_SHARE, RUSH_TIME, SUPPLIERS, SUPPLIER_IDS, TIERS, WEATHER_DELAY, maxOrder,
} from './data.js';
import { HISTORY_MAX, handelState, nextId } from './store.js';
import { now, whenText, workTime } from './time.js';
import { addFresh } from './freshness.js';

const fail = (reason) => ({ ok: false, reason });
const strNum = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

export const goodName = (id) => (GOODS[id] ?? INGREDIENTS[id])?.name ?? id;
/** What the market stall in Havenstad charges for one. */
export const marketPrice = (id) => (GOODS[id] ?? INGREDIENTS[id]).price;

// ------------------------------------------------------------------ relationship
export const relPoints = (h, id) => h.rel[id] ?? 0;
export function levelOfPoints(points) {
  let lvl = 0;
  LEVELS.forEach((l, i) => points >= l.need && (lvl = i));
  return lvl;
}
export const relLevel = (game, id) => levelOfPoints(relPoints(handelState(game), id));
/** 0..1 progress to the next level. */
export function levelProgress(game, id) {
  const p = relPoints(handelState(game), id);
  const lvl = levelOfPoints(p);
  const next = LEVELS[lvl + 1];
  return next ? (p - LEVELS[lvl].need) / (next.need - LEVELS[lvl].need) : 1;
}

/** Tiers a supplier offers at a relationship level. */
export function tiersFor(sup, level) {
  return sup.tiers.filter((t) => (t === 'top' ? level >= sup.topLevel : t === 'vers' ? level >= 1 || sup.flat : true));
}

// ------------------------------------------------------------------ prices and availability
/** Smooth day-to-day price swing 0.82..1.18 (two-day steps blended, so it drifts instead of jumping). */
export function swing(day, supplierId, good) {
  const key = strNum(supplierId + good);
  const a = hash01(Math.floor(day / 2), key, 11);
  const b = hash01(Math.floor(day / 2) + 1, key, 11);
  const f = (day % 2) / 2;
  return 0.82 + 0.36 * (a * (1 - f) + b * f);
}

/** Weather and event moods of one good on a day. */
export function mood(good, day) {
  const info = dayInfo(day);
  const m = MOOD[good] ?? {};
  return (m[info.weather] ?? 1) * (m[info.event] ?? 1);
}

/** Whether a supplier delivers a good on a day, and why not. */
export function availability(day, supplierId, good) {
  const sup = SUPPLIERS[supplierId];
  if (!sup?.goods[good]) return { ok: false, reason: 'Verkoopt hij niet.' };
  const w = dayInfo(day).weather;
  if (sup.blocked.includes(w)) return { ok: false, reason: w === 'storm' ? 'Door de storm komt er niemand.' : 'Bij regen blijft de boot in de haven.' };
  if (hash01(day, strNum(supplierId + good), 5) < sup.out) return { ok: false, reason: 'Vandaag uitverkocht.' };
  return { ok: true };
}

/** Price of one unit on a day, as a fraction of euros (not rounded). */
export function unitPriceOn(day, supplierId, good, tier = 'standaard', level = 0) {
  const sup = SUPPLIERS[supplierId];
  return marketPrice(good) * sup.factor * sup.goods[good] * TIERS[tier].mult * swing(day, supplierId, good) * mood(good, day) * (1 - LEVELS[level].discount);
}

/** 'koopje' (cheap), 'duur' (expensive) or '' compared to the supplier's normal price. */
export function priceMood(day, supplierId, good) {
  const f = swing(day, supplierId, good) * mood(good, day);
  return f <= 0.92 ? 'koopje' : f >= 1.12 ? 'duur' : '';
}

export function bulkPct(units) {
  for (const [from, pct] of BULK) if (units >= from) return pct;
  return 0;
}

/** Units you may still order: free room in the stock minus what is already on its way or waiting. */
export function orderRoom(game) {
  const h = handelState(game);
  return Math.max(0, stockFree(game.state) - pendingUnits(h) - crateUnits(h));
}
export const pendingUnits = (h) => h.orders.filter((o) => o.status === 'onderweg').reduce((n, o) => n + o.units, 0);
export const crateUnits = (h) => h.crate.reduce((n, e) => n + e.n, 0);

// ------------------------------------------------------------------ delivery time
/** Absolute time at which an order placed at `placed` arrives. */
export function arrivalTime(placed, sup, day, { top = false, rush = false } = {}) {
  const info = dayInfo(day);
  let mins = sup.base + WEATHER_DELAY[info.weather] + (EVENTS[info.event].heat ? INSPECTION_DELAY : 0) + (top ? TIERS.top.extra : 0);
  if (rush && !sup.flat) mins = Math.max(30, Math.round(mins * RUSH_TIME));
  return sup.flat ? placed + mins : workTime(placed + mins);
}

// ------------------------------------------------------------------ quote and order
/**
 * Prices a basket [{ good, n, tier }] with a supplier. Returns
 * { ok, errors, lines: [{ good, tier, n, unit, total }], units, bulk, subtotal, fee, rushFee, total, arrive }.
 * Nothing is bought; placeOrder does that.
 */
export function quote(game, supplierId, basket, rush = false) {
  const sup = SUPPLIERS[supplierId];
  const st = game.state;
  const h = handelState(game);
  const level = relLevel(game, supplierId);
  const errors = [];
  const lines = [];
  let units = 0;
  if (!sup) return { ok: false, errors: ['Onbekende leverancier.'], lines, units: 0 };
  if (game.rank < sup.rank) errors.push(`Werkt pas voor je vanaf rang ${RANKS[sup.rank]}.`);
  const tiers = tiersFor(sup, level);
  for (const item of basket) {
    const n = Math.floor(item.n);
    if (!(n > 0)) continue;
    const tier = item.tier ?? 'standaard';
    const av = availability(st.day, supplierId, item.good);
    if (!av.ok) errors.push(`${goodName(item.good)}: ${av.reason}`);
    else if (!tiers.includes(tier)) errors.push(`${goodName(item.good)}: ${TIERS[tier].name} kan hij nog niet leveren.`);
    else lines.push({ good: item.good, tier, n, exact: unitPriceOn(st.day, supplierId, item.good, tier, level) });
    units += n;
  }
  if (!units) errors.push('Kies eerst wat je wilt bestellen.');
  else if (units < sup.minUnits) errors.push(`Minimaal ${sup.minUnits} stuks per bestelling.`);
  if (units > maxOrder(level)) errors.push(`Maximaal ${maxOrder(level)} stuks per bestelling.`);
  else if (units > orderRoom(game)) errors.push(`Je hebt plek voor ${orderRoom(game)} stuks (denk aan bestellingen onderweg en de kist).`);
  const bulk = bulkPct(units);
  for (const l of lines) {
    l.total = Math.round(l.exact * l.n * (1 - bulk));
    l.unit = l.total / l.n;
  }
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const fee = sup.flat || subtotal >= FREE_DELIVERY_FROM || !subtotal ? 0 : DELIVERY_FEE;
  const rushFee = rush && !sup.flat && subtotal ? Math.max(8, Math.round(subtotal * RUSH_SHARE[level >= 2 ? 1 : 0])) : 0;
  const total = subtotal + fee + rushFee;
  const arrive = arrivalTime(now(st), sup, st.day, { top: lines.some((l) => l.tier === 'top'), rush });
  return { ok: errors.length === 0, errors, lines, units, bulk, subtotal, fee, rushFee, total, arrive, rush: !!rush && !sup.flat, affordable: st.cash >= total, supplier: supplierId };
}

export function placeOrder(game, supplierId, basket, rush = false) {
  const q = quote(game, supplierId, basket, rush);
  if (!q.ok) return fail(q.errors[0]);
  if (!game.addCash(-q.total)) return fail('Niet genoeg geld.');
  const h = handelState(game);
  const order = {
    id: nextId(h, 'o'), supplier: supplierId, units: q.units, subtotal: q.subtotal, fee: q.fee, rushFee: q.rushFee, total: q.total, bulk: q.bulk,
    lines: q.lines.map(({ good, tier, n, total }) => ({ good, tier, n, total })),
    rush: q.rush, placedAt: now(game.state), arriveAt: q.arrive, status: 'onderweg',
  };
  h.orders.push(order);
  game.emit('change');
  return { ok: true, order };
}

/** Cancels an order that is still on its way; 85% of the money comes back. */
export function cancelOrder(game, id) {
  const h = handelState(game);
  const o = h.orders.find((x) => x.id === id);
  if (!o || o.status !== 'onderweg') return fail('Die kun je niet meer annuleren.');
  o.status = 'geannuleerd';
  o.refund = Math.round(o.total * 0.85);
  game.state.cash += o.refund;
  game.emit('change');
  return { ok: true, refund: o.refund };
}

/** Moves orders whose time has come into the crate at the hut. Returns the delivered orders. */
export function deliverDue(game) {
  const h = handelState(game);
  const t = now(game.state);
  const done = [];
  for (const o of h.orders) {
    if (o.status !== 'onderweg' || o.arriveAt > t) continue;
    o.status = 'bezorgd';
    o.deliveredAt = o.arriveAt;
    for (const l of o.lines) h.crate.push({ good: l.good, n: l.n, tier: l.tier, supplier: o.supplier, order: o.id });
    h.rel[o.supplier] = relPoints(h, o.supplier) + Math.max(1, Math.floor(o.total / 5));
    done.push(o);
  }
  if (done.length) {
    const finished = h.orders.filter((o) => o.status !== 'onderweg');
    h.orders = [...h.orders.filter((o) => o.status === 'onderweg'), ...finished.slice(-HISTORY_MAX)];
    game.emit('change');
  }
  return done;
}

/** Takes the crate's content into the stock as far as there is room. Returns { moved, left, items }. */
export function collectCrate(game) {
  const h = handelState(game);
  let room = Math.max(0, stockFree(game.state));
  let moved = 0;
  const items = {};
  for (const e of h.crate) {
    const k = Math.min(e.n, room);
    if (k <= 0) continue;
    game.addItem(e.good, k);
    addFresh(h, e.good, e.tier, k);
    e.n -= k;
    room -= k;
    moved += k;
    items[e.good] = (items[e.good] ?? 0) + k;
  }
  h.crate = h.crate.filter((e) => e.n > 0);
  game.emit('change');
  return { moved, left: crateUnits(h), items };
}

// ------------------------------------------------------------------ overview helpers
/** Suppliers that know you at this rank, in order. */
export const knownSuppliers = (game) => SUPPLIER_IDS.filter((id) => game.rank >= SUPPLIERS[id].rank);

/** Cheapest standard price today for a good, over all suppliers that deliver it: { supplier, unit } or null. */
export function bestOffer(game, good) {
  let best = null;
  for (const id of knownSuppliers(game)) {
    if (!availability(game.state.day, id, good).ok) continue;
    const level = relLevel(game, id);
    const tier = tiersFor(SUPPLIERS[id], level).includes('standaard') ? 'standaard' : tiersFor(SUPPLIERS[id], level)[0];
    const unit = unitPriceOn(game.state.day, id, good, tier, level);
    if (!best || unit < best.unit) best = { supplier: id, unit, tier };
  }
  return best;
}

/** Tomorrow's price (a perk of relationship level 3): null before that. */
export function forecast(game, supplierId, good) {
  const level = relLevel(game, supplierId);
  if (level < 3) return null;
  const day = game.state.day + 1;
  if (!availability(day, supplierId, good).ok) return { ok: false, unit: null };
  return { ok: true, unit: unitPriceOn(day, supplierId, good, 'standaard', level) };
}

/** Text of the arrival time of an order. */
export const arrivalText = (game, o) => whenText(o.arriveAt, game.state.day);
