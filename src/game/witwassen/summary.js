// The numbers the phone app "Zaken" and the HUD show, as plain data. Pure: nothing is changed.

import { BUSINESSES, BUSINESS_IDS, UPGRADE_IDS } from './data.js';
import { wState, washedToday, dirtyHand } from './store.js';
import { capacity, cover, feeRate, safeLeft, suspicion, suspicionWord, revenue, isOpen, upgradeCost } from './rules.js';
import { dirtyLeft, withdrawLeft } from './bank.js';
import { bulge } from './carry.js';

/** One business as a row: always name, price and rank; the numbers only when it is yours. */
export function bizRow(game, id) {
  const d = BUSINESSES[id];
  const b = wState(game).biz[id];
  const base = { id, name: d.name, short: d.short, icon: d.icon, where: d.where, price: d.price, rank: d.rank, blurb: d.blurb, owned: !!b, locked: game.rank < d.rank };
  if (!b) return base;
  const day = game.state.day;
  const s = suspicion(id, b, day);
  return {
    ...base,
    open: isOpen(b, day),
    used: washedToday(b, day),
    cap: capacity(id, b),
    safe: cover(id, b),
    safeLeft: safeLeft(id, b, day),
    fee: feeRate(id, b),
    suspicion: s,
    word: suspicionWord(s),
    takings: revenue(id, b, day),
    staff: d.staff,
    earned: b.earned,
    rep: b.rep,
    up: { ...b.up },
    upNext: Object.fromEntries(UPGRADE_IDS.map((k) => [k, upgradeCost(id, k, b.up[k])])),
  };
}

/** All businesses in the order of the map. */
export const bizRows = (game) => BUSINESS_IDS.map((id) => bizRow(game, id));

/** Totals of the laundering layer: what you carry, what the bank still takes, lifetime stats. */
export function totals(game) {
  const w = wState(game);
  return {
    dirty: dirtyHand(game),
    bankLeft: dirtyLeft(game, 'phone'),
    atmLeft: dirtyLeft(game, 'atm'),
    withdrawLeft: withdrawLeft(game),
    bulge: bulge(dirtyHand(game), game.rank),
    profit: w.stats.profit,
    washed: w.stats.washed,
    fees: w.stats.fees,
    fines: w.stats.fines,
    visits: w.stats.visits,
    passed: w.stats.passed,
  };
}
