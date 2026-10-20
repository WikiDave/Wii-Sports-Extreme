// Absolute game time for the dealers and suppliers. Pure logic.
//
// stations.js counts game minutes continuously across the nights (now(state)); here that
// number is turned back into a day and a clock time, and delivery times are fitted to the
// hours the couriers work.

import { DAY_LENGTH, now } from '../stations.js';
import { DAY_START, formatClock } from '../state.js';
import { HOURS, SHIFT, WORK } from './data.js';

export { DAY_LENGTH, now };

/** Day number, clock minutes (360..1680) and hour of the day (0..24) of an absolute time. */
export function clockAt(t) {
  const day = Math.floor(t / DAY_LENGTH) + 1;
  const minutes = DAY_START + (t - (day - 1) * DAY_LENGTH);
  return { day, minutes, hour: (minutes / 60) % 24 };
}

export const onShift = (hour) => hour >= SHIFT[0] && hour < SHIFT[1];

/** How busy the streets are at this hour (0 outside the shift). */
export function hourFactor(hour) {
  for (const [from, to, f] of HOURS) if (hour >= from && hour < to) return f;
  return 0;
}

/** The first moment at or after t at which the couriers work (07:00-21:00). */
export function workTime(t) {
  const { day, minutes } = clockAt(t);
  if (minutes < WORK[0]) return t + (WORK[0] - minutes);
  if (minutes >= WORK[1]) return day * DAY_LENGTH + (WORK[0] - DAY_START);
  return t;
}

/** "vandaag 14:30", "morgen 07:00" or "dag 5 07:00", seen from today. */
export function whenText(t, today) {
  const c = clockAt(t);
  const label = c.day === today ? 'vandaag' : c.day === today + 1 ? 'morgen' : `dag ${c.day}`;
  return `${label} ${formatClock(c.minutes)}`;
}
