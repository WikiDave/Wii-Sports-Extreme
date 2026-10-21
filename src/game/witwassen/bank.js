// The bank side of laundering. The bank (phone) and the ATM only take CLEAN cash: dirty cash has to
// go through a business first (laundering.js), where it pays a fee and counts against the cover and
// the taxman. The ATM limits withdrawals per day. phone.js deposit() asks clampDeposit() how much of
// a deposit the bank takes. Pure logic.

import { ATM_WITHDRAW } from './data.js';
import { wState, dirtyHand } from './store.js';

export const withdrawLimit = (rank) => ATM_WITHDRAW.base + ATM_WITHDRAW.perRank * rank;
export const CLEAN_ONLY = 'De pinautomaat en de bank nemen alleen schoon geld aan. Zwart geld moet eerst door een van je bedrijven.';

/** The ATM counters of today (reset on a new day). */
function today(game) {
  const w = wState(game);
  if (w.bank.day !== game.state.day) w.bank = { day: game.state.day, out: 0 };
  return w.bank;
}

/** Clean cash on hand: the only money the bank takes. */
export const cleanCash = (game) => Math.max(0, game.state.cash - dirtyHand(game));
/** Euros that can still be withdrawn at the ATM today. */
export const withdrawLeft = (game) => Math.max(0, withdrawLimit(game.rank) - today(game).out);

/** What the bank takes of a deposit of `amount`: clean cash up to the amount, the dirty rest is turned away. */
export function planDeposit(game, amount) {
  amount = Math.max(0, Math.floor(amount));
  const accepted = Math.min(amount, cleanCash(game));
  return { asked: amount, accepted, over: amount - accepted };
}

/**
 * The hook for phone.js deposit(): returns the amount the bank accepts. Emits 'witwassen:limiet'
 * { asked, accepted, over, via } when dirty cash is turned away.
 */
export function clampDeposit(game, amount, via = 'phone') {
  const p = planDeposit(game, amount);
  if (p.over > 0) game.emit('witwassen:limiet', { ...p, via });
  return p.accepted;
}

/** Deposit at the ATM: clean cash only. */
export function atmDeposit(game, amount) {
  const s = game.state;
  amount = Math.floor(amount);
  if (!(amount > 0) || amount > s.cash) return { ok: false, amount: 0, reason: 'Zoveel contant geld heb je niet bij je.' };
  const got = clampDeposit(game, amount, 'atm');
  if (got <= 0) return { ok: false, amount: 0, reason: CLEAN_ONLY };
  s.cash -= got;
  s.bank += got;
  game.emit('change');
  return { ok: true, amount: got, short: amount - got };
}

/** Withdrawal at the ATM, up to what is left of today's limit. */
export function atmWithdraw(game, amount) {
  const s = game.state;
  amount = Math.floor(amount);
  if (!(amount > 0) || amount > s.bank) return { ok: false, amount: 0, reason: 'Zoveel staat er niet op je rekening.' };
  const give = Math.min(amount, withdrawLeft(game));
  if (give <= 0) return { ok: false, amount: 0, reason: 'Je daglimiet voor opnemen is op. Morgen weer.' };
  today(game).out += give;
  s.bank -= give;
  s.cash += give;
  game.emit('change');
  return { ok: true, amount: give, short: amount - give };
}
