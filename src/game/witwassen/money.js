// Paying and receiving money for the laundering layer. Purchases and upgrades are paid from the
// bank first (clean) and then from cash, dirty cash first; the ledger must not count these moves.

import { quiet, takeDirty } from './ledger.js';
import { dirtyHand } from './store.js';

export const canPay = (game, amount) => game.state.cash + game.state.bank >= amount;

/** Pays `amount` (bank first, then cash). Returns whether it worked. */
export function pay(game, amount) {
  if (!(amount >= 0) || !canPay(game, amount)) return false;
  const s = game.state;
  const fromBank = Math.min(s.bank, amount);
  const fromCash = amount - fromBank;
  quiet(game, () => {
    takeDirty(game, Math.min(fromCash, dirtyHand(game)));
    s.bank -= fromBank;
    s.cash -= fromCash;
    game.emit('change');
  });
  return true;
}

/** Takes as much as possible of `amount` (bank first, then cash). Returns { paid, unpaid }. */
export function collect(game, amount) {
  const s = game.state;
  const paid = Math.min(amount, s.bank + s.cash);
  const fromBank = Math.min(s.bank, paid);
  const fromCash = paid - fromBank;
  quiet(game, () => {
    takeDirty(game, Math.min(fromCash, dirtyHand(game)));
    s.bank -= fromBank;
    s.cash -= fromCash;
    game.emit('change');
  });
  return { paid, unpaid: amount - paid };
}

/** Puts clean money on the bank account (takings, payouts). */
export function wire(game, amount) {
  const s = game.state;
  quiet(game, () => {
    s.bank += amount;
    game.emit('change');
  });
}
