// The numbers of a business: capacity, cover, fee, suspicion, takings, upgrade prices. Pure.

import { BUSINESSES, MAX_LEVEL, UPGRADE_COST, FEE_FLOOR, REP_CAPACITY, REP_REVENUE, KEEP_DAYS } from './data.js';
import { dayInfo, EVENTS } from '../weather.js';
import { washedToday, washedWeek } from './store.js';

const round10 = (n) => Math.round(n / 10) * 10;
const repBonus = (b) => (REP_CAPACITY * b.rep) / 100;

/** Most dirty euros that can go through per day. */
export const capacity = (id, b) => round10(BUSINESSES[id].capacity * (1 + 0.3 * b.up.cap + repBonus(b)));

/** Euros per day the books can explain; washing up to this is safe. Never more than the capacity. */
export function cover(id, b) {
  const c = BUSINESSES[id].cover * (1 + 0.3 * b.up.cap + 0.25 * b.up.books + repBonus(b));
  return Math.min(capacity(id, b), round10(c));
}

/** Share the business keeps. */
export const feeRate = (id, b) => Math.max(FEE_FLOOR, +(BUSINESSES[id].fee - 0.03 * b.up.fee).toFixed(2));

export const capacityLeft = (id, b, day) => Math.max(0, capacity(id, b) - washedToday(b, day));
export const safeLeft = (id, b, day) => Math.max(0, cover(id, b) - washedToday(b, day));

/** Days of the week window this business has existed (1..7). */
export const openDays = (b, day) => Math.max(1, Math.min(KEEP_DAYS, day - b.since + 1));

/** What the books can explain over the last (up to) seven days. */
export const allowedWeek = (id, b, day) => cover(id, b) * openDays(b, day);

/** Washed this week against what the books can explain (1 = exactly on the limit). */
export const weekRatio = (id, b, day) => washedWeek(b, day) / Math.max(1, allowedWeek(id, b, day));

/** Suspicion 0..100: how odd the books look to the taxman (the lingering part of a visit included). */
export function suspicion(id, b, day) {
  const r = weekRatio(id, b, day);
  const base = Math.max(0, Math.min(1, (r - 0.5) / 1.5)) * 100;
  return Math.round(Math.min(100, base + b.pen));
}

export const SUSPICION_WORDS = [
  [15, 'Onopvallend'],
  [40, 'Netjes'],
  [65, 'Opvallend'],
  [85, 'Verdacht'],
  [101, 'Fiscus-alarm'],
];
export const suspicionWord = (s) => SUSPICION_WORDS.find(([max]) => s < max)[1];

/** Price of the next level of an upgrade, or null at the top. */
export function upgradeCost(id, kind, level) {
  if (level >= MAX_LEVEL) return null;
  return round10(BUSINESSES[id].price * UPGRADE_COST[kind][level]);
}

/** Honest takings of a day (gross), from the weather and the event of that day. */
export function revenue(id, b, day) {
  const d = BUSINESSES[id];
  const info = dayInfo(day);
  const weather = d.weather[info.weather] ?? 1;
  const event = info.event === 'feest' ? 1.3 : info.event === 'zomerdag' ? 1.2 : 1;
  return Math.round(d.revenue * (1 + (REP_REVENUE * b.rep) / 100) * (1 + 0.15 * b.up.cap) * weather * event);
}

/** A rough description of the day for the takings report. */
export const dayWord = (day) => {
  const info = dayInfo(day);
  return `${EVENTS[info.event].name.toLowerCase()}`;
};

/** Net result of a day: takings minus wages. */
export const netIncome = (id, b, day) => revenue(id, b, day) - BUSINESSES[id].staff;

/** Whether the business is open on `day`. */
export const isOpen = (b, day) => !(b.closed >= day);
