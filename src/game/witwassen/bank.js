// The bank side of laundering: unlaundered cash may only be deposited up to a daily limit
// (phone banking is watched closer than the ATM at the harbour), and the ATM limits withdrawals.
// phone.js deposit() asks clampDeposit() how much of a deposit the bank takes. Pure logic.

import { DIRTY_DEPOSIT, ATM_WITHDRAW } from './data.js';
import { wState, dirtyHand } from './store.js';
import { takeDirty } from './ledger.js';

export const dirtyLimit = (rank, via = 'phone') => DIRTY_DEPOSIT[via].base + DIRTY_DEPOSIT[via].perRank * rank;
export const withdrawLimit = (rank) => ATM_WITHDRAW.base + ATM_WITHDRAW.perRank * rank;

/** The bank counters of today (reset on a new day). */
function today(game) {
  const w = wState(game);
  if (w.bank.day !== game.state.day) w.bank = { day: game.state.day, dirty: 0, out: 0 };
  return w.bank;
}

/** Unlaundered euros that can still be deposited today. */
export const dirtyLeft = (game, via = 'phone') => Math.max(0, dirtyLimit(game.rank, via) - today(game).dirty);
/** Euros that can still be withdrawn at the ATM today. */
export const withdrawLeft = (game) => Math.max(0, withdrawLimit(game.rank) - today(game).out);
export const depositedDirty = (game) => today(game).dirty;

/**
 * What the bank takes of a deposit of `amount`: clean cash always goes through (it is taken
 * first), dirty cash only up to the daily limit.
 */
export function planDeposit(game, amount, via = 'phone') {
  amount = Math.max(0, Math.floor(amount));
  const clean = Math.max(0, game.state.cash - dirtyHand(game));
  const cleanPart = Math.min(amount, clean);
  const dirtyPart = Math.min(amount - cleanPart, dirtyLeft(game, via));
  return { asked: amount, accepted: cleanPart + dirtyPart, clean: cleanPart, dirty: dirtyPart, over: amount - cleanPart - dirtyPart };
}

/**
 * The hook for phone.js deposit(): returns the amount the bank accepts and books the dirty part
 * against today's limit. Emits 'witwassen:limiet' when the bank turns money away.
 */
export function clampDeposit(game, amount, via = 'phone') {
  const p = planDeposit(game, amount, via);
  if (p.dirty > 0) {
    today(game).dirty += p.dirty;
    takeDirty(game, p.dirty);
  }
  if (p.over > 0) game.emit('witwassen:limiet', { ...p, via, left: dirtyLeft(game, via) });
  return p.accepted;
}

/** Deposit at the ATM (higher limit for unlaundered cash than the phone). */
export function atmDeposit(game, amount) {
  const s = game.state;
  amount = Math.floor(amount);
  if (!(amount > 0) || amount > s.cash) return { ok: false, amount: 0, reason: 'Zoveel contant geld heb je niet bij je.' };
  const got = clampDeposit(game, amount, 'atm');
  if (got <= 0) return { ok: false, amount: 0, reason: 'De pinautomaat weigert ongewassen geld: de limiet van vandaag is bereikt.' };
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
