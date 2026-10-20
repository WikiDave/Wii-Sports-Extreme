// The sellers at work: the game minutes since the last call are played in steps of 10 minutes.
// Pure logic: the same state and the same times give the same sales (the "dice" are hashes of
// the step number), so it works the same after sleeping, loading a save or in a test.
//
// simulate() returns events, which the feature turns into toasts, phone messages and pictures:
//   { type: 'sale', seller, units, money }          sold to passers-by (money = your share)
//   { type: 'empty', seller } / { type: 'full', seller }
//   { type: 'skim', seller, amount }                a seller kept part of a sale for himself
//   { type: 'caught', seller, lost, pouch, zone }   a guard got him: stock and pouch gone, he quits
//   { type: 'quit', seller, took, zone }            loyalty ran out: he leaves with the pouch

import { parseItem } from '../economy.js';
import { valueFor } from '../customers.js';
import { addHeat, heatLevel } from '../police.js';
import { EVENTS, WEATHER, dayInfo, hash01, priceFactor } from '../weather.js';
import { EVENT_TRAFFIC, ROUTES, STEP, STREET_PRICE, candidateById, pouchCap } from './data.js';
import { noticeMult, priceCapture, skimChance, stockCount, tempoMult } from './sellers.js';
import { handelState } from './store.js';
import { DAY_LENGTH, clockAt, hourFactor, now, onShift } from './time.js';

/** Longest stretch that is replayed after a long sleep or an old save. */
export const MAX_CATCHUP = 3 * DAY_LENGTH;
/** Base chance per step to be caught (scaled by heat level, route, discretion and events). */
export const CATCH_BASE = 0.0012;
/** Minutes in one call that count as "skipped" time, and the heat that sinks per skipped minute. */
const SKIP_AFTER = 30;
const HEAT_DECAY = 0.003;
/** Heat added by every customer a seller serves (scaled by route risk and discretion). */
export const HEAT_PER_SALE = 0.08;

const canServe = (game, s) => s.zone && stockCount(s) > 0 && s.pouch < pouchCap(game.rank);

/** Chance per step that a guard gets this seller; near = guards close to his spot (0, 1, 2+). */
export function catchChance(game, s, day, near = 0) {
  const c = candidateById(s.id);
  const route = ROUTES[s.zone];
  if (!route) return 0;
  const level = heatLevel(game.state);
  const inspection = EVENTS[dayInfo(day).event].heat ? 1.6 : 1;
  return Math.min(0.5, CATCH_BASE * (0.4 + level) * route.risk * noticeMult(c) * inspection * (1 + 1.5 * Math.min(2, near)));
}

/** The chance of being caught during a whole shift, for the display. */
export function catchChanceToday(game, s) {
  const p = catchChance(game, s, game.state.day);
  return 1 - (1 - p) ** 78;
}

/** Customers per step for a seller on a route at a time (before sharing with other sellers). */
export function customersPerStep(c, route, clk) {
  const info = dayInfo(clk.day);
  return route.traffic * hourFactor(clk.hour) * (STEP / 60) * tempoMult(c) * (1 - WEATHER[info.weather].skip) * EVENT_TRAFFIC[info.event];
}

/** Plays the sellers' work up to absolute time `upto` (default: now). Returns the events. */
export function simulate(game, env = {}, upto = now(game.state)) {
  const h = handelState(game);
  const out = [];
  let t = h.clock;
  if (upto - t > MAX_CATCHUP) t = upto - MAX_CATCHUP;
  // Time that passed in one go (sleeping, an old save): the heat sinks as it does while you play
  // (see police.tickHeat), so sleeping does not make the sellers' work pile up as heat.
  if (upto - t > SKIP_AFTER) addHeat(game, -HEAT_DECAY * (upto - t - SKIP_AFTER), true);
  h.lastDay = Math.max(h.lastDay, clockAt(t).day - 3);
  while (t + STEP <= upto) {
    const clk = clockAt(t);
    while (h.lastDay < clk.day) rollDay(game, h, h.lastDay++, out);
    stepAll(game, h, t, clk, env, out);
    t += STEP;
  }
  h.clock = t;
  return out;
}

function stepAll(game, h, t, clk, env, out) {
  if (!onShift(clk.hour)) return;
  const crowd = {};
  for (const s of h.sellers) if (canServe(game, s)) crowd[s.zone] = (crowd[s.zone] ?? 0) + 1;
  for (const s of [...h.sellers]) stepSeller(game, h, s, t, clk, crowd, env, out);
}

function stepSeller(game, h, s, t, clk, crowd, env, out) {
  if (!s.zone) return;
  const c = candidateById(s.id);
  const route = ROUTES[s.zone];
  const k = Math.floor(t / STEP);
  const r = (n) => hash01(k, c.num * 101 + n, 7);

  // The guards: only someone carrying goods or money is interesting (env.catch === false: tests).
  if (env.catch !== false && (stockCount(s) > 0 || s.pouch > 0)) {
    const near = env.guardNear?.(s.zone) ?? 0;
    if (r(1) < catchChance(game, s, clk.day, near)) {
      catchSeller(game, h, s, clk.day, out);
      return;
    }
  }
  if (stockCount(s) === 0) {
    if (!s.flags.empty) {
      s.flags.empty = true;
      out.push({ type: 'empty', seller: s.id });
    }
    return;
  }
  if (s.pouch >= pouchCap(game.rank)) {
    if (!s.flags.full) {
      s.flags.full = true;
      out.push({ type: 'full', seller: s.id });
    }
    return;
  }

  // Customers: shared with other sellers on the same route (two together earn a bit more than one).
  const share = (crowd[s.zone] ?? 1) ** -0.7;
  const lambda = customersPerStep(c, route, clk) * share;
  let customers = Math.floor(lambda);
  if (r(2) < lambda - customers) customers++;
  let units = 0;
  let money = 0;
  for (let i = 0; i < customers && stockCount(s) > 0; i++) {
    const sale = sellTo(game, s, c, route, clk.day, (j) => r(20 + i * 11 + j));
    if (!sale) break;
    units += sale.units;
    money += sale.net;
    if (sale.skim) out.push({ type: 'skim', seller: s.id, amount: sale.skim });
  }
  if (units) out.push({ type: 'sale', seller: s.id, units, money });
  if (stockCount(s) === 0 && !s.flags.empty) {
    s.flags.empty = true;
    out.push({ type: 'empty', seller: s.id });
  }
}

/** One customer buys one to three units. Returns { units, net, skim } or null. */
function sellTo(game, s, c, route, day, rr) {
  const keys = Object.keys(s.stock).filter((key) => s.stock[key] > 0 && parseItem(key));
  if (!keys.length) return null;
  // Customers prefer what they like (liked effects count double).
  const weights = keys.map((key) => 1 + 1.5 * parseItem(key).effects.filter((e) => route.likes.includes(e)).length);
  let pick = rr(0) * weights.reduce((a, b) => a + b, 0);
  let idx = 0;
  while (idx < keys.length - 1 && pick >= weights[idx]) pick -= weights[idx++];
  const key = keys[idx];
  const units = Math.min(s.stock[key], 1 + (rr(1) < 0.28 ? 1 : 0) + (rr(2) < 0.07 ? 1 : 0));
  const fair = valueFor({ likes: route.likes }, key) * route.wealth * priceFactor(day) * STREET_PRICE;
  const unit = Math.round(fair * (0.85 + 0.3 * rr(3)) * priceCapture(c));
  const gross = unit * units;
  let net = gross - Math.round((gross * c.cut) / 100);
  let skim = 0;
  if (rr(4) < skimChance(s.loyalty)) {
    skim = Math.round(net * (0.35 + 0.3 * rr(5)));
    net -= skim;
  }
  s.stock[key] -= units;
  if (!s.stock[key]) delete s.stock[key];
  s.pouch += net;
  s.sold += units;
  s.earned += net;
  s.skimmed += skim;
  s.skimSince += skim;
  if (s.today.day !== day) s.today = { day, sold: 0, money: 0 };
  s.today.sold += units;
  s.today.money += net;
  addHeat(game, HEAT_PER_SALE * route.risk * noticeMult(c), true);
  return { units, net, skim };
}

function catchSeller(game, h, s, day, out) {
  const ev = { type: 'caught', seller: s.id, lost: stockCount(s), pouch: s.pouch, zone: s.zone };
  h.sellers.splice(h.sellers.indexOf(s), 1);
  h.blocked[s.id] = day + 5;
  addHeat(game, 0.3, true);
  out.push(ev);
}

/** The end of a day: loyalty goes up with a busy day, down with boredom or a full pouch; low loyalty may quit. */
function rollDay(game, h, day, out) {
  for (const s of [...h.sellers]) {
    const c = candidateById(s.id);
    const sold = s.today.day === day ? s.today.sold : 0;
    if (s.zone && sold > 0) s.loyalty = Math.min(100, s.loyalty + 1);
    else if (s.zone) s.loyalty = Math.max(0, s.loyalty - 1);
    if (s.pouch >= pouchCap(game.rank) * 0.5) s.loyalty = Math.max(0, s.loyalty - 2);
    if (s.loyalty < 15 && hash01(day, c.num, 77) < ((15 - s.loyalty) / 15) * 0.4) {
      h.sellers.splice(h.sellers.indexOf(s), 1);
      h.blocked[s.id] = day + 4;
      out.push({ type: 'quit', seller: s.id, took: s.pouch, lost: stockCount(s), zone: s.zone });
    }
  }
}
