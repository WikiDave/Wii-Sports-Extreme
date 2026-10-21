// Save data of the laundering layer: game.state.ext.witwassen. Created and repaired on first use.
//
//   dirty   unlaundered cash in your pocket (never more than your cash)
//   src     lifetime dirty income by source (klanten, strandtent, personeel, overig)
//   biz     owned businesses, see newBiz()
//   bank    { day, dirty, out } deposits of unlaundered cash and ATM withdrawals today
//   audit   the taxman's visit that is planned or going on, or null
//   last    day of the last visit per business
//   inbox   letters and messages shown in the phone app "Zaken"
//   stats   lifetime totals

import { BUSINESS_IDS, KEEP_DAYS } from './data.js';

export const EXT_ID = 'witwassen';
export const MAX_INBOX = 24;

export const newBiz = (day) => ({
  since: day, // day you bought it
  up: { cap: 0, fee: 0, books: 0 },
  rep: 0, // reputation 0..100
  pen: 0, // lingering suspicion after a visit of the taxman
  day, // the day `in` belongs to
  in: 0, // dirty euros washed on `day`
  hist: [], // closed days: { d, in }
  closed: 0, // day until which it is closed (could not pay the wages)
  earned: 0, // lifetime net takings
});

const fresh = () => ({
  v: 1,
  dirty: 0,
  src: { klanten: 0, strandtent: 0, personeel: 0, overig: 0 },
  biz: {},
  bank: { day: 0, dirty: 0, out: 0 },
  audit: null,
  last: {},
  inbox: [],
  stats: { washed: 0, fees: 0, fines: 0, visits: 0, passed: 0, warned: 0, failed: 0, bribes: 0, profit: 0 },
});

/** The save data of the feature; fills in whatever an older save lacks. */
export function wState(game) {
  const ext = (game.state.ext ??= {});
  const w = (ext[EXT_ID] ??= fresh());
  const base = fresh();
  for (const k of Object.keys(base)) if (w[k] == null) w[k] = base[k];
  w.src = { ...base.src, ...w.src };
  w.bank = { ...base.bank, ...w.bank };
  w.stats = { ...base.stats, ...w.stats };
  if (!Number.isFinite(w.dirty) || w.dirty < 0) w.dirty = 0;
  for (const id of Object.keys(w.biz)) if (!BUSINESS_IDS.includes(id)) delete w.biz[id];
  return w;
}

export const owned = (game) => BUSINESS_IDS.filter((id) => wState(game).biz[id]);
export const bizOf = (game, id) => wState(game).biz[id] ?? null;

/** Dirty cash in your pocket. */
export const dirtyHand = (game) => Math.floor(Math.max(0, Math.min(wState(game).dirty, game.state.cash)) + 1e-6);

/** Moves a business to `day`: the washing of earlier days goes to the history (last seven days). */
export function rollBiz(b, day) {
  if (b.day === day) return b;
  b.hist.push({ d: b.day, in: b.in });
  b.hist = b.hist.filter((e) => e.d > day - KEEP_DAYS);
  b.day = day;
  b.in = 0;
  return b;
}

/** Euros washed at this business today. */
export const washedToday = (b, day) => (b.day === day ? b.in : 0);

/** Euros washed in the last seven days, today included. */
export function washedWeek(b, day) {
  let sum = 0;
  for (const e of b.hist) if (e.d > day - KEEP_DAYS && e.d <= day) sum += e.in;
  if (b.day > day - KEEP_DAYS && b.day <= day) sum += b.in;
  return sum;
}

/** Adds a letter to the inbox of the phone app. */
export function mail(game, kind, title, text, read = false) {
  const w = wState(game);
  const s = game.state;
  w.inbox.unshift({ id: `${s.day}-${Math.floor(s.minutes)}-${w.inbox.length}-${kind}`, day: s.day, min: Math.floor(s.minutes), kind, title, text, read });
  w.inbox.length = Math.min(w.inbox.length, MAX_INBOX);
  game.emit('witwassen:mail', w.inbox[0]);
  return w.inbox[0];
}

export const unreadMail = (game) => wState(game).inbox.filter((m) => !m.read).length;
export const markRead = (game) => wState(game).inbox.forEach((m) => (m.read = true));
