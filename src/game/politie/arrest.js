// Getting caught: the police post for the night, or bail. Pure logic. The cutscene is in
// politie/cutscene.js; this file changes the state and tells what happened.
//
// Without bail: all your goods are gone, a share of your cash too, and you sleep in the cell until
// the morning. With bail (borg): you pay it, keep half of your goods and you are out after an hour.
// Each catch within ARREST_WINDOW days raises the sentence (nights) and the cash loss.

import { parseItem } from '../economy.js';
import { logEvent, pol } from './state.js';

export const ARREST_WINDOW = 4; // days
export const MAX_NIGHTS = 3;
export const BAIL_BASE = 60;
export const BAIL_PER_CATCH = 30;
export const CASH_LOSS = 0.3;
export const CASH_LOSS_PER_CATCH = 0.1;
export const CASH_LOSS_MAX = 0.6;
export const BAIL_SKIP_MINUTES = 60;
const ARRESTS_MAX = 12;

/** Units of product (not plain goods) in the inventory. */
export const goodsCarried = (state) => Object.entries(state.inventory).reduce((n, [k, v]) => n + (parseItem(k) ? v : 0), 0);

/** Catches in the last ARREST_WINDOW days before `day` (the current one is not saved yet). */
export function recentArrests(ext, day) {
  return ext.arrests.filter((d) => d <= day && day - d < ARREST_WINDOW).length;
}

/** What getting caught now would cost: the numbers the cutscene shows. */
export function arrestPlan(state) {
  const recent = recentArrests(pol(state), state.day);
  const bail = BAIL_BASE + BAIL_PER_CATCH * recent;
  const goods = goodsCarried(state);
  return {
    recent,
    nights: Math.min(MAX_NIGHTS, 1 + recent),
    bail,
    canBail: state.cash >= bail,
    cashLoss: Math.round(state.cash * Math.min(CASH_LOSS_MAX, CASH_LOSS + CASH_LOSS_PER_CATCH * recent)),
    goods,
    keep: Math.floor(goods / 2),
  };
}

/** Takes up to n units of product out of the inventory, biggest stacks first. Returns how many. */
export function takeGoods(state, n) {
  let left = n;
  let taken = 0;
  const stacks = Object.entries(state.inventory)
    .filter(([k]) => parseItem(k))
    .sort((a, b) => b[1] - a[1]);
  for (const [k, have] of stacks) {
    if (left <= 0) break;
    const t = Math.min(have, left);
    left -= t;
    taken += t;
    if (have - t === 0) delete state.inventory[k];
    else state.inventory[k] = have - t;
  }
  return taken;
}

/**
 * Applies the arrest: bail or the cell. Sets the heat to 2 and records the catch.
 * Returns { bail, nights, paid, lost, cashLost, keep, recent }. Time is not touched (see skipTime).
 */
export function resolveArrest(game, { bail = false } = {}) {
  const s = game.state;
  const ext = pol(s);
  const plan = arrestPlan(s);
  const useBail = bail && plan.canBail;
  let paid = 0;
  let lost = 0;
  let cashLost = 0;
  if (useBail) {
    paid = plan.bail;
    s.cash -= paid;
    lost = takeGoods(s, plan.goods - plan.keep);
  } else {
    lost = takeGoods(s, plan.goods);
    cashLost = Math.min(s.cash, plan.cashLoss);
    s.cash -= cashLost;
  }
  ext.arrests = [...ext.arrests, s.day].slice(-ARRESTS_MAX);
  ext.pending = false;
  s.heat = 2;
  const keep = useBail ? plan.goods - lost : 0;
  logEvent(s, 'gepakt', `Gepakt${useBail ? ', borg betaald' : ''}: ${lost} stuks kwijt${cashLost ? `, €${cashLost} boete` : ''}${paid ? `, borg €${paid}` : ''}.`);
  game.emit('heat', 2);
  game.emit('caught', { lost, cashLost, paid });
  game.emit('change');
  return { bail: useBail, nights: useBail ? 0 : plan.nights, paid, lost, cashLost, keep, recent: plan.recent };
}

/** Time after an arrest: a bail release after an hour, otherwise a night in the cell (sleep to the morning). */
export function skipTime(game, result) {
  if (result.bail) game.tick(BAIL_SKIP_MINUTES);
  else for (let i = 0; i < result.nights; i++) game.sleep();
}
