// Customer logic: who is known, who is out and about, what a deal is worth, trust, tips and
// consequences. No DOM, no three.js. Where customers walk is klanten/timeline.js; what they
// say is klanten/lines.js; their data is data/customers.js.

import { CUSTOMERS } from './data/customers.js';
import { addHeat } from './police.js';
import { staysHome } from './weather.js';
import { PRODUCTS } from './data/products.js';
import { appraise, valueOf, satisfaction, reactionOf, fxOf } from './klanten/appraise.js';
import { lineFor } from './klanten/lines.js';
import { tierIndex, tierOf, budgetFactor, extraQty, tipChance } from './klanten/tiers.js';
import { unlockMet, introducerOf, missing } from './klanten/unlock.js';

export const MAX_LOYALTY = 100;
/** Price offers: multiplier of the fair value. */
export const OFFERS = { laag: 0.8, eerlijk: 1, hoog: 1.4 };
/** Trust earned by a deal at each offer (before the satisfaction factor). */
const GAIN = { laag: 12, eerlijk: 8, hoog: 4 };
/** Refusals in a row before a customer boycotts you for two days. */
export const STRIKES = 3;
/** Days without a deal before trust slowly fades. */
export const FORGET_AFTER = 7;

export const customerById = (id) => CUSTOMERS.find((c) => c.id === id);

const DEFAULTS = { loyalty: 0, unlocked: false, lastDay: 0, deals: 0, spent: 0, strikes: 0, boycott: 0, retryDay: 0, met: 0 };

/** Per-customer save data, created on demand (older saves get the new fields too). */
export function record(state, id) {
  const r = (state.customers[id] ??= {});
  for (const [k, v] of Object.entries(DEFAULTS)) r[k] ??= v;
  return r;
}

/** Whether a customer is known to the player: introduced by a friend, by rank, ..., or from the start. */
export function isUnlocked(state, c, rank) {
  if (state.customers[c.id]?.unlocked) return true;
  return unlockMet(state, c.unlock, rank);
}

/** Whether the customer is out of the house at this hour (0..28, a day runs 6..28). */
export function isPresent(c, hour) {
  const h = hour < 6 ? hour + 24 : hour;
  return c.schedule.some(([from, to]) => h >= from && h < to);
}

/** Whether the customer refuses to see the player (three refusals in a row). */
export const boycotted = (state, c) => (state.customers[c.id]?.boycott ?? 0) >= state.day;

/** Whether the customer can buy today: not served within `every` days, no boycott. */
export function wantsToday(state, c) {
  return state.day - (state.customers[c.id]?.lastDay ?? 0) >= c.every && !boycotted(state, c);
}

/** Customers you can trade with right now (unlocked, out, not staying home, not served today). */
export function available(state, rank, hour) {
  return CUSTOMERS.filter((c) => isUnlocked(state, c, rank) && isPresent(c, hour) && !staysHome(state.day, c.id) && wantsToday(state, c));
}

/** What one unit of an item is worth to this customer: fair value, liked/disliked effects, favourite product, quality. */
export function valueFor(c, key) {
  const ap = appraise(c, key);
  return ap ? valueOf(c, ap) : 0;
}

/** Highest price per unit the customer accepts: 25% above their value, loyalty adds up to 15% (so a high offer needs a loyal customer). */
export function maxPrice(c, key, loyalty = 0) {
  return Math.round(valueFor(c, key) * (1.25 + 0.15 * (loyalty / MAX_LOYALTY)));
}

/** Most they spend per visit: regulars have a bigger budget. */
export const budgetOf = (c, loyalty = 0) => Math.round(c.budget * budgetFactor(loyalty));

/** Most units per visit: regulars buy more. */
export const maxQtyOf = (c, loyalty = 0) => c.maxQty + extraQty(loyalty);

/** Price per unit of an offer. */
export const priceOf = (c, key, offer, factor = 1) => Math.round(valueFor(c, key) * OFFERS[offer] * factor);

/** The product they ask for that the player cannot make yet (rank too low), or null. */
export function wishProduct(c, rank) {
  const p = PRODUCTS[c.prefers];
  return p && p.rank > rank ? c.prefers : null;
}

/** Whether an item fits a phone request that names a product (the effect is checked by phone.js). */
export function fitsWish(request, key) {
  if (!request?.product) return true;
  return key.startsWith(`p:${request.product}:`);
}

/** Makes customers whose conditions now hold known for good; returns [{ customer, by, start }]. */
export function introduce(game) {
  const s = game.state;
  const out = [];
  for (const c of CUSTOMERS) {
    const known = s.customers[c.id]?.unlocked;
    if (known || !unlockMet(s, c.unlock, game.rank)) continue;
    const rec = record(s, c.id);
    rec.unlocked = true;
    rec.met = s.day;
    out.push({ customer: c.id, by: introducerOf(c), start: !c.unlock });
  }
  return out;
}

/** Every morning: trust of customers you have not seen for a week fades by 1 a day; strikes are forgotten. */
export function dailyUpdate(game) {
  const s = game.state;
  for (const rec of Object.values(s.customers)) {
    rec.strikes = 0;
    if ((rec.loyalty ?? 0) > 0 && s.day - (rec.lastDay ?? 0) > FORGET_AFTER) rec.loyalty = Math.max(0, rec.loyalty - 1);
  }
}

/** What is still needed to get to know a customer, as one Dutch sentence ('' when nothing). */
export function unlockHint(state, c, rank) {
  const lines = missing(state, c.unlock, rank);
  return lines.length ? lines.join(' en ') : '';
}

/**
 * Tries a deal of up to `qty` units at offer ('laag' | 'eerlijk' | 'hoog'); factor scales
 * the prices (a rival at the spot, weather, a request bonus). Returns
 * { ok, sold, money, message, line, reaction, tip, tierUp, retry, tipOff, boycott, delta }.
 * On success the customer's trust grows (more for a low offer and a pleased customer), tips
 * come from regulars; on a refusal trust drops, patient customers give a second chance, and
 * indiscreet ones may tell the guards. `rand` is injectable for tests.
 */
export function deal(game, c, key, qty, offer, factor = 1, request = null, rand = Math.random) {
  const state = game.state;
  const rec = record(state, c.id);
  const ap = appraise(c, key);
  const sayAs = (event, extra = {}) => lineFor(c.voice, event, { fx: ap ? fxOf(ap, event) : 'dit', ...extra }, rand);
  if (boycotted(state, c)) return { ok: false, sold: 0, money: 0, message: `${c.name} wil je even niet zien.`, line: sayAs('boycott'), reaction: 'boycott' };
  if (!ap) return { ok: false, sold: 0, money: 0, message: `${c.name} kan of wil dit niet kopen.`, line: '', reaction: 'plain' };
  const price = priceOf(c, key, offer, factor);
  const have = state.inventory[key] ?? 0;
  const tierBefore = tierIndex(rec.loyalty);
  const n = Math.min(qty, have, maxQtyOf(c, rec.loyalty), Math.floor(budgetOf(c, rec.loyalty) / Math.max(1, price)));
  const limit = maxPrice(c, key, rec.loyalty) * factor;
  if (price > limit) return refuse(game, c, rec, price / limit - 1, sayAs, rand);
  if (n < 1) return { ok: false, sold: 0, money: 0, message: `${c.name} kan of wil dit niet kopen.`, line: sayAs('plain'), reaction: 'plain' };
  game.addItem(key, -n);
  const money = price * n;
  game.addCash(money);
  const tip = rand() < tipChance(rec.loyalty) ? Math.max(1, Math.round(money * 0.1)) : 0;
  if (tip) game.addCash(tip);
  game.addXp(Math.ceil(money / 4));
  const gain = Math.round(GAIN[offer] * satisfaction(ap));
  rec.loyalty = Math.min(MAX_LOYALTY, rec.loyalty + gain);
  rec.deals++;
  rec.spent += money;
  rec.strikes = 0;
  rec.lastDay = state.day;
  rec.unlocked = true;
  const tierNow = tierIndex(rec.loyalty);
  const tierUp = tierNow > tierBefore ? tierOf(rec.loyalty) : null;
  // A guard who is your friend looks the other way.
  if (c.type === 'bewaker' && tierNow >= 3) addHeat(game, -0.3, true);
  const reaction = reactionOf(ap, offer);
  const result = {
    ok: true,
    sold: n,
    money,
    tip,
    delta: gain,
    reaction,
    tierUp,
    message: `${c.name} koopt ${n}× voor €${money}.`,
    line: sayAs(reaction),
    tierLine: tierUp ? sayAs('tier', { tier: tierUp.name }) : '',
    tipLine: tip ? sayAs('tip') : '',
  };
  game.emit('change');
  game.emit('deal', { customer: c.id, key, sold: n, money, offer, tip, reaction });
  if (tierUp) game.emit('klanten:tier', { customer: c.id, tier: tierUp });
  return result;
}

/** A refused price: trust drops, the customer may stay for one more try, may tell the guards, may boycott. */
function refuse(game, c, rec, over, sayAs, rand) {
  const state = game.state;
  const hit = Math.max(1, Math.round((5 + Math.min(10, over * 20)) * (1.5 - c.patience)));
  rec.loyalty = Math.max(0, rec.loyalty - hit);
  rec.strikes++;
  const boycott = rec.strikes >= STRIKES;
  // Patient customers give one second chance per day; the rest walk off.
  const retry = !boycott && c.patience >= 0.6 && rec.retryDay !== state.day;
  if (retry) rec.retryDay = state.day;
  else rec.lastDay = state.day;
  if (boycott) {
    rec.boycott = state.day + 2;
    rec.loyalty = Math.max(0, rec.loyalty - 10);
  }
  const tipOff = rand() < (1 - c.discretion) * (0.2 + Math.min(0.4, over * 1.5));
  if (tipOff) {
    addHeat(game, 0.6);
    game.emit('klanten:verklikt', { customer: c.id });
  }
  const reaction = boycott ? 'boycott' : retry ? 'retry' : 'refuse';
  game.emit('change');
  game.emit('klanten:refused', { customer: c.id, retry, boycott, tipOff });
  return {
    ok: false,
    sold: 0,
    money: 0,
    delta: -hit,
    retry,
    boycott,
    tipOff,
    reaction,
    message: `${c.name} vindt dit veel te duur.`,
    line: sayAs(reaction),
  };
}
