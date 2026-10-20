// The phone: text messages from customers (requests with a bonus), and the bank. Pure logic.
//
// Each morning, every customer you know (and who does not stay home) may text a request: a few
// units with an effect they like. Accept it on the phone and hand over the goods in person for
// a bonus on the price. The bank keeps money safe from guards and from being caught.

import { CUSTOMERS } from './data/customers.js';
import { EFFECTS } from './data/effects.js';
import { isUnlocked, record } from './customers.js';
import { parseItem } from './economy.js';
import { staysHome, hash01 } from './weather.js';

export const REQUEST_BONUS = 1.3;
export const MAX_MESSAGES = 30;

const GREETINGS = ['Hoi!', 'Hey, ben jij dat?', 'Psst,', 'Goedemorgen!', 'Yo,', 'Hallo daar,'];
const ASKS = [
  (q, fx) => `heb je ${q} flesjes met iets ${fx}s voor me?`,
  (q, fx) => `ik wil graag ${q} stuks, maar wel ${fx}!`,
  (q, fx) => `kom je langs met ${q}× iets ${fx}s? Ik betaal extra.`,
  (q, fx) => `mijn feestje is vanavond: ${q} ${fx}e dingen graag.`,
];
const adjective = (id) => EFFECTS[id].name.toLowerCase();

/** One message from customer c for `day`, deterministic. */
export function makeMessage(c, day) {
  const likes = c.likes;
  const effect = likes[Math.floor(hash01(day, c.id.length * 7) * likes.length)];
  const qty = 1 + Math.floor(hash01(day, c.id.length * 13) * 3);
  const greet = GREETINGS[Math.floor(hash01(day, 3) * GREETINGS.length)];
  const ask = ASKS[Math.floor(hash01(day, c.id.length) * ASKS.length)];
  return {
    id: `${c.id}-${day}`,
    customer: c.id,
    day,
    text: `${greet} ${ask(qty, adjective(effect))}`,
    effect,
    qty,
    status: 'new', // new | accepted | done | expired
  };
}

/** Texts of a new day (once per day). Returns the new messages. */
export function dailyMessages(game) {
  const s = game.state;
  const fresh = [];
  for (const m of s.messages) if (m.status !== 'done' && m.day < s.day) m.status = m.status === 'accepted' ? 'expired' : 'expired';
  for (const c of CUSTOMERS) {
    if (!isUnlocked(s, c, game.rank) || staysHome(s.day, c.id)) continue;
    if (s.messages.some((m) => m.id === `${c.id}-${s.day}`)) continue;
    // Not every customer writes every day.
    if (hash01(s.day, c.id.charCodeAt(0)) > 0.75) continue;
    fresh.push(makeMessage(c, s.day));
  }
  s.messages = [...fresh, ...s.messages].slice(0, MAX_MESSAGES);
  if (fresh.length) game.emit('messages', fresh);
  game.emit('change');
  return fresh;
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
  amount = clampDeposit(game, amount, 'phone'); // unlaundered cash only goes in up to a daily limit (witwassen)
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
