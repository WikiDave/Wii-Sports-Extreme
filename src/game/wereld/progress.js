// Save data of the world content, kept in state.ext.wereld: the collected shells, the milestones
// already paid, today's hints and the clothes the Mii wears. Pure logic on a Game (state.js).

import { SHELL_CASH, SHELL_XP, milestonesReached } from './shells.js';

/** The feature's own save object (created on first use). */
export function wereldOf(state) {
  const w = (state.ext.wereld ??= {});
  w.shells ??= []; // collected shell ids
  w.claimed ??= []; // milestone counts already paid
  w.hintDay ??= 0; // the day of the last free hint
  w.hintsToday ??= 0;
  w.outfit ??= null; // id of the clothes in OUTFITS, or null (the Mii's own colour)
  return w;
}

/** Collects a shell: pays it and any milestone it completes. Returns null if it was collected already. */
export function collectShell(game, id) {
  const w = wereldOf(game.state);
  if (w.shells.includes(id)) return null;
  w.shells.push(id);
  let cash = SHELL_CASH;
  let xp = SHELL_XP;
  const milestones = milestonesReached(w.shells.length, w.claimed);
  for (const m of milestones) {
    w.claimed.push(m.n);
    cash += m.cash;
    xp += m.xp;
  }
  game.addCash(cash);
  game.addXp(xp);
  game.save();
  return { cash, xp, milestones };
}

export const shellsCollected = (state) => wereldOf(state).shells.length;

/** The price of the next hint: the first one each day is free, the next ones cost €15. */
export function hintPrice(state) {
  const w = wereldOf(state);
  const freeLeft = w.hintDay === state.day ? w.hintsToday < 1 : true;
  return freeLeft ? 0 : 15;
}

/** Counts a hint given today (and pays for it). Returns false if the price cannot be paid. */
export function useHint(game) {
  const w = wereldOf(game.state);
  const price = hintPrice(game.state);
  if (price && !game.addCash(-price)) return false;
  if (w.hintDay !== game.state.day) {
    w.hintDay = game.state.day;
    w.hintsToday = 0;
  }
  w.hintsToday += 1;
  game.save();
  return true;
}
