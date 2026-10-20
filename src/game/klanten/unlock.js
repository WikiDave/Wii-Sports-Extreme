// When a customer becomes known to the player. Pure logic.
//
// unlock: null (known from the start), a condition, or { any: [condition, ...] }.
// A condition holds when all its parts hold:
//   rank n              the player has at least this rank
//   loyalty [id, n]     a friend trusts the player this much (that friend introduces them)
//   deals n             this many deals made in total ("word gets around")
//   earned n            this much earned from customers in total
//   day n               from this day on

import { RANKS } from '../state.js';
import { CUSTOMERS } from '../data/customers.js';

export const totalDeals = (state) => Object.values(state.customers).reduce((n, r) => n + (r.deals ?? 0), 0);
export const totalEarned = (state) => Object.values(state.customers).reduce((n, r) => n + (r.spent ?? 0), 0);

function holds(state, rank, cond) {
  if (cond.rank != null && rank < cond.rank) return false;
  if (cond.loyalty && (state.customers[cond.loyalty[0]]?.loyalty ?? 0) < cond.loyalty[1]) return false;
  if (cond.deals != null && totalDeals(state) < cond.deals) return false;
  if (cond.earned != null && totalEarned(state) < cond.earned) return false;
  if (cond.day != null && state.day < cond.day) return false;
  return true;
}

export function unlockMet(state, unlock, rank) {
  if (!unlock) return true;
  if (unlock.any) return unlock.any.some((c) => holds(state, rank, c));
  return holds(state, rank, unlock);
}

const nameOf = (id) => CUSTOMERS.find((c) => c.id === id)?.name ?? id;

/** The friend that introduces this customer and the trust they need: { by, need }, or null. */
export function introduction(c) {
  const conds = c.unlock?.any ?? (c.unlock ? [c.unlock] : []);
  const withFriend = conds.find((x) => x.loyalty);
  return withFriend ? { by: withFriend.loyalty[0], need: withFriend.loyalty[1] } : null;
}

/** Id of the friend that introduces this customer, or null. */
export const introducerOf = (c) => introduction(c)?.by ?? null;

/** Dutch lines about what is still missing; [] when nothing is. */
export function missing(state, unlock, rank) {
  if (!unlock || unlockMet(state, unlock, rank)) return [];
  const cond = unlock.any ?? [unlock];
  // Of several ways in, show the one that is closest (fewest missing parts).
  let best = null;
  for (const c of cond) {
    const lines = [];
    if (c.rank != null && rank < c.rank) lines.push(`rang ${RANKS[c.rank]} (nu ${RANKS[rank]})`);
    if (c.loyalty) {
      const have = state.customers[c.loyalty[0]]?.loyalty ?? 0;
      if (have < c.loyalty[1]) lines.push(`vertrouwen van ${nameOf(c.loyalty[0])}: ${have}/${c.loyalty[1]}`);
    }
    if (c.deals != null && totalDeals(state) < c.deals) lines.push(`${c.deals} deals (nu ${totalDeals(state)})`);
    if (c.earned != null && totalEarned(state) < c.earned) lines.push(`€${c.earned} verdiend (nu €${totalEarned(state)})`);
    if (c.day != null && state.day < c.day) lines.push(`dag ${c.day}`);
    if (!best || lines.length < best.length) best = lines;
  }
  return best ?? [];
}
