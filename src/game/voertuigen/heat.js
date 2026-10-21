// What the guards make of your driving. Pure: the view cone rules are the guards' own (police.js).
// Driving fast where a guard can see you is suspicious, and bumping a guard is worse. A vehicle
// with stock in its back is not: the stock is not in your pockets, so it is not searched.

import { inCone, viewRange } from '../police.js';

/** The guards' view angle (world/guards.js). */
const FOV = 0.95;
/** Heat per second for reckless driving in view, at full speed. */
export const RECKLESS_HEAT = 0.05;
/** Heat for running into a guard. */
export const BUMP_HEAT = 0.6;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Whether a guard (x, z, heading) with this view range sees the point (px, pz). */
export function seenBy(px, pz, guards, level, factor = 1) {
  const range = viewRange(level, factor);
  return guards.some((g) => inCone(g.x, g.z, g.heading, px, pz, range, FOV));
}

/** Heat per second for driving at `speed` (m/s) in view of a guard: nothing below half top speed. */
export function recklessRate(speed, maxSpeed, seen) {
  if (!seen) return 0;
  const r = clamp(Math.abs(speed) / maxSpeed, 0, 1);
  return RECKLESS_HEAT * clamp((r - 0.5) / 0.5, 0, 1);
}

/** The guard that the vehicle at (px, pz) runs into (closer than reach metres while fast), or null. */
export function bumped(px, pz, speed, guards, reach = 1.8) {
  if (Math.abs(speed) < 2.5) return null;
  return guards.find((g) => Math.hypot(g.x - px, g.z - pz) < reach) ?? null;
}
