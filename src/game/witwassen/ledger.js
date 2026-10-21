// The ledger: keeps track of how much of your cash is dirty.
//
// Every euro that comes into your pocket from outside (a deal, the beach stand, a street seller
// handing over his pouch, the salesman) is dirty until it has gone through a business. We do not
// need to know the sources: any rise of cash+bank that ends up in cash is dirty income. Spending
// or a fine takes dirty and clean cash in proportion. Moves between cash and bank change nothing.
// Our own operations run inside quiet() so they are not counted twice.

import { wState } from './store.js';

const books = new WeakMap(); // game -> { state, cash, bank, pend, mute }

function book(game) {
  let bk = books.get(game);
  if (!bk) books.set(game, (bk = { state: game.state, cash: game.state.cash, bank: game.state.bank, pend: 0, mute: 0 }));
  return bk;
}

function sync(game, bk) {
  bk.state = game.state;
  bk.cash = game.state.cash;
  bk.bank = game.state.bank;
}

function onChange(game) {
  const bk = book(game);
  const s = game.state;
  if (bk.mute || bk.state !== s) return sync(game, bk);
  const dc = s.cash - bk.cash;
  const db = s.bank - bk.bank;
  bk.cash = s.cash;
  bk.bank = s.bank;
  if (!dc && !db) return;
  const w = wState(game);
  const dW = dc + db;
  if (dW > 0 && dc > 0) {
    const gain = Math.min(dW, dc);
    w.dirty += gain;
    bk.pend += gain;
  } else if (dW < 0 && dc < 0 && s.cash - dc > 0) {
    w.dirty *= s.cash / (s.cash - dc);
  }
  w.dirty = Math.max(0, Math.min(w.dirty, s.cash));
}

/** Starts listening to the game; returns the function that stops it. */
export function track(game) {
  const bk = book(game);
  sync(game, bk);
  const off = game.on('change', () => onChange(game));
  const offDeal = game.on('deal', (e) => claim(game, 'klanten', e?.money ?? 0));
  return () => (off(), offDeal());
}

/** Runs fn (which changes cash or bank) without the ledger counting it as income or spending. */
export function quiet(game, fn) {
  const bk = book(game);
  bk.mute++;
  try {
    return fn();
  } finally {
    bk.mute--;
    sync(game, bk);
  }
}

/** Dirty income not yet given a source: `amount` of it came from `source`. */
function claim(game, source, amount) {
  const bk = book(game);
  const k = Math.min(bk.pend, Math.max(0, amount));
  if (k > 0) {
    wState(game).src[source] += k;
    bk.pend -= k;
  }
}

/** Gives all dirty income that is still unexplained a source (strandtent, personeel, overig). */
export function flushSource(game, source) {
  claim(game, source, book(game).pend);
}

export const pending = (game) => book(game).pend;

/** Dirty cash goes away (washed, deposited, confiscated). */
export function takeDirty(game, amount) {
  const w = wState(game);
  w.dirty = Math.max(0, w.dirty - amount);
}
