// Dirty cash in your pocket draws looks from the guards. Pure.

import { CARRY } from './data.js';

/** The amount of dirty cash from which the guards start to frown. */
export const carryLimit = (rank) => CARRY.base + CARRY.perRank * rank;

/**
 * Heat per game minute while a guard can see you: nothing below the limit, and nothing once
 * the Reglement-meter is already at level CARRY.maxLevel (cash alone never starts a chase).
 */
export function carryHeatRate(dirty, rank, level) {
  const limit = carryLimit(rank);
  if (dirty < limit || level >= CARRY.maxLevel) return 0;
  const over = Math.min(2, dirty / limit - 1);
  return CARRY.rate * (0.5 + over);
}

/** How full your pockets look, 0..1 (1 = the guards frown). */
export const bulge = (dirty, rank) => Math.max(0, Math.min(1, dirty / carryLimit(rank)));
