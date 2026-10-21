// The phone: text messages from customers (requests with a bonus), and the bank. Pure logic.
//
// Each morning, customers you know may text a request: a few units with an effect they like,
// sometimes of their favourite product, and where to find them that day. Customers who stay home
// because of the weather say so (knock on their door). Accept the request on the phone and hand
// over the goods in person for a bonus on the price. The bank keeps money safe from guards and
// from being caught.

import { CUSTOMERS } from './data/customers.js';
import { PRODUCTS } from './data/products.js';
import { isUnlocked, record, wantsToday } from './customers.js';
import { parseItem } from './economy.js';
import { hash01 } from './weather.js';
import { lineFor } from './klanten/lines.js';
import { ASKS, LATER, OPENERS, SOMETHING, STAY_HOME, UNITS, clockText, meetAt } from './klanten/texts.js';
import { buildWorld } from './klanten/places.js';
import { meetingSpot, staysIn } from './klanten/timeline.js';
import { introducerOf } from './klanten/unlock.js';

export const REQUEST_BONUS = 1.3;
export const MAX_MESSAGES = 30;
/** Most new messages in a morning (the most trusting customers write first). */
export const MAX_PER_DAY = 6;

const idHash = (s) => [...s].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) | 0, 7);
let defaultWorld = null;

/**
 * One message from customer c for `day`, deterministic. opts: rank (a favourite product you cannot
 * make yet is not asked for), friend (name: they were just introduced by this friend), stayHome
 * (the weather keeps them in), after (minute of the day: a message sent later in the day names a place
 * and time still to come), world (places).
 */
export function makeMessage(c, day, { rank = 99, friend = null, stayHome = false, after = 0, world = (defaultWorld ??= buildWorld()) } = {}) {
  const k = idHash(c.id);
  const effect = c.likes[Math.floor(hash01(day, k, 7) * c.likes.length)];
  const qty = 1 + Math.floor(hash01(day, k, 13) * Math.min(3, c.maxQty));
  const wantsFavourite = hash01(day, k, 5) < 0.55 && rank >= PRODUCTS[c.prefers].rank;
  const product = wantsFavourite ? c.prefers : null;
  const [one, many] = UNITS[product ?? 'limonade'];
  const opener = friend ? lineFor(c.voice, 'intro', { friend }, () => hash01(day, k, 3)) : (OPENERS[c.voice] ?? OPENERS.joviaal)[Math.floor(hash01(day, k, 3) * 3)];
  const ask = ASKS[Math.floor(hash01(day, k, 1) * ASKS.length)];
  const what = product ? `${qty} ${qty === 1 ? one : many} ${PRODUCTS[product].name.toLowerCase()}` : `${qty} ${qty === 1 ? 'drankje' : 'drankjes'}`;
  const asked = ask({ what, fx: SOMETHING[effect] });
  let text = `${opener} ${/[.!?:]$/.test(opener) ? asked[0].toUpperCase() + asked.slice(1) : asked}`;
  const spot = stayHome ? null : meetingSpot(world, c, day, after);
  if (spot) text += ` ${meetAt(world.places[spot.place].at, clockText(spot.min))}`;
  else if (stayHome) text += ` ${STAY_HOME[Math.floor(hash01(day, k, 17) * STAY_HOME.length)]}`;
  else text += ` ${LATER}`;
  const m = {
    id: `${c.id}-${day}`,
    customer: c.id,
    day,
    text,
    effect,
    qty,
    status: 'new', // new | accepted | done | expired
  };
  if (product) m.product = product;
  return m;
}

/** Texts of a new day (once per day). Returns the new messages. */
export function dailyMessages(game) {
  const s = game.state;
  const world = (defaultWorld ??= buildWorld());
  for (const m of s.messages) if (m.status !== 'done' && m.day < s.day) m.status = 'expired';
  const picks = [];
  for (const c of CUSTOMERS) {
    if (!isUnlocked(s, c, game.rank) || !wantsToday(s, c)) continue;
    if (s.messages.some((m) => m.id === `${c.id}-${s.day}`)) continue;
    const stayHome = staysIn(world, c, s.day);
    const rec = record(s, c.id);
    // Not every customer writes every day: the more they trust you (and the chattier they are), the more often.
    const chance = stayHome ? 0.85 : Math.min(0.95, c.texting + 0.4 * (rec.loyalty / 100));
    if (hash01(s.day, idHash(c.id), 21) > chance) continue;
    picks.push({ c, stayHome, trust: rec.loyalty });
  }
  picks.sort((a, b) => b.trust - a.trust || (a.c.id < b.c.id ? -1 : 1));
  const fresh = picks.slice(0, MAX_PER_DAY).map(({ c, stayHome }) => makeMessage(c, s.day, { rank: game.rank, stayHome, world }));
  s.messages = [...fresh, ...s.messages].slice(0, MAX_MESSAGES);
  if (fresh.length) game.emit('messages', fresh);
  game.emit('change');
  return fresh;
}

/** A message from a customer who was just introduced by a friend (now, not tomorrow). Returns it, or null. */
export function introMessage(game, customerId) {
  const s = game.state;
  const c = CUSTOMERS.find((x) => x.id === customerId);
  if (!c || s.messages.some((m) => m.id === `${c.id}-${s.day}`)) return null;
  const by = CUSTOMERS.find((x) => x.id === introducerOf(c));
  const m = makeMessage(c, s.day, { rank: game.rank, friend: by?.name ?? null, after: s.minutes, world: (defaultWorld ??= buildWorld()) });
  s.messages = [m, ...s.messages].slice(0, MAX_MESSAGES);
  game.emit('messages', [m]);
  game.emit('change');
  return m;
}

export const unread = (state) => state.messages.filter((m) => m.status === 'new').length;

export function accept(game, id) {
  const m = game.state.messages.find((x) => x.id === id);
  if (!m || m.status !== 'new') return false;
  m.status = 'accepted';
  game.emit('change');
  return true;
}

export function decline(game, id) {
  const m = game.state.messages.find((x) => x.id === id);
  if (!m || m.status !== 'new') return false;
  m.status = 'expired';
  const rec = record(game.state, m.customer);
  rec.loyalty = Math.max(0, rec.loyalty - 2);
  game.emit('change');
  return true;
}

/** The accepted request of a customer for today, or null. */
export function activeRequest(state, customerId) {
  return state.messages.find((m) => m.customer === customerId && m.status === 'accepted' && m.day === state.day) ?? null;
}

/** Whether an item key fits a request (it has the effect). */
export function fitsRequest(m, key) {
  const p = parseItem(key);
  return !!p && p.effects.includes(m.effect);
}

export function completeRequest(game, m, sold) {
  if (sold >= m.qty) {
    m.status = 'done';
    const rec = record(game.state, m.customer);
    rec.loyalty = Math.min(100, rec.loyalty + 6);
    game.addXp(10 * m.qty);
  }
  game.emit('change');
}

// ---------------------------------------------------------------- bank
import { clampDeposit } from './witwassen/bank.js';

/** Puts cash in the bank (safe from guards). Returns whether it worked. */
export function deposit(game, amount) {
  const s = game.state;
  amount = Math.floor(amount);
  if (amount <= 0 || amount > s.cash) return false;
  amount = clampDeposit(game, amount, 'phone'); // only clean cash goes in; dirty cash must be washed first (witwassen)
  if (amount <= 0) return false;
  s.cash -= amount;
  s.bank += amount;
  game.emit('change');
  return true;
}

export function withdraw(game, amount) {
  const s = game.state;
  amount = Math.floor(amount);
  if (amount <= 0 || amount > s.bank) return false;
  s.bank -= amount;
  s.cash += amount;
  game.emit('change');
  return true;
}
