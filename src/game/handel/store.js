// The save data of the feature: game.state.ext.handel, plus the phone inbox. Pure logic.
//
// {
//   v, clock (absolute game minute up to which the sellers were simulated), lastDay,
//   sellers: [seller], blocked: { candidateId: day it can be hired again },
//   inbox: [{ id, day, minutes, kind, who, text, read }],
//   rel: { supplierId: points }, orders: [order], crate: [{ good, n, tier, supplier, order }],
//   fresh: { good: { vers: n, top: n } }, seq: counter for ids
// }

import { candidateById } from './data.js';
import { now } from './time.js';

export const VERSION = 1;
export const INBOX_MAX = 24;
export const HISTORY_MAX = 10;

/** The feature's save data, created or repaired on demand. Always call this again after a reset. */
export function handelState(game) {
  const st = game.state;
  const e = (st.ext ??= {});
  const h = (e.handel ??= {});
  h.v = VERSION;
  h.clock = Number.isFinite(h.clock) ? h.clock : now(st);
  h.lastDay = Number.isFinite(h.lastDay) ? h.lastDay : st.day;
  h.sellers = Array.isArray(h.sellers) ? h.sellers.filter((s) => s && candidateById(s.id)) : [];
  h.blocked = h.blocked && typeof h.blocked === 'object' ? h.blocked : {};
  h.inbox = Array.isArray(h.inbox) ? h.inbox : [];
  h.rel = h.rel && typeof h.rel === 'object' ? h.rel : {};
  h.orders = Array.isArray(h.orders) ? h.orders : [];
  h.crate = Array.isArray(h.crate) ? h.crate : [];
  h.fresh = h.fresh && typeof h.fresh === 'object' ? h.fresh : {};
  h.seq = Number.isFinite(h.seq) ? h.seq : 0;
  for (const s of h.sellers) {
    s.stock = s.stock && typeof s.stock === 'object' ? s.stock : {};
    s.zone = s.zone ?? null;
    for (const k of ['pouch', 'loyalty', 'sold', 'earned', 'skimmed', 'skimSince']) {
      if (!Number.isFinite(s[k])) s[k] = k === 'loyalty' ? candidateById(s.id).loyalty : 0;
    }
    s.flags = s.flags && typeof s.flags === 'object' ? s.flags : {};
    s.today = s.today && typeof s.today === 'object' ? s.today : { day: st.day, sold: 0, money: 0 };
  }
  return h;
}

export const nextId = (h, prefix) => `${prefix}${++h.seq}`;

/** Adds a message to the inbox of the phone apps (newest first). Returns it. */
export function notify(game, { kind, who, text }) {
  const h = handelState(game);
  const msg = { id: nextId(h, 'n'), day: game.state.day, minutes: Math.floor(game.state.minutes), kind, who, text, read: false };
  h.inbox.unshift(msg);
  h.inbox.length = Math.min(h.inbox.length, INBOX_MAX);
  return msg;
}

export const unreadCount = (game, kinds = null) => handelState(game).inbox.filter((m) => !m.read && (!kinds || kinds.includes(m.kind))).length;

export function markRead(game, kinds = null) {
  for (const m of handelState(game).inbox) if (!kinds || kinds.includes(m.kind)) m.read = true;
}

export function dismiss(game, id) {
  const h = handelState(game);
  h.inbox = h.inbox.filter((m) => m.id !== id);
}
