// Rivals: each morning (from rank 1) a rival may take a customer spot for the day. While
// there, deals at that spot pay 80%. Bribe them away, or tip off the guards (they leave, but
// some heat sticks to you). During the day a rival may walk over to the other spot.

import { RIVALS } from './data/rivals.js';
import { addHeat } from './police.js';

export const RIVAL_FACTOR = 0.8;
export const RIVAL_MOVE_CHANCE = 0.25; // per game hour while a rival is out
const SPOTS = ['strand', 'haven'];

/** Morning roll: from rank 1, 50% chance of a rival somewhere. */
export function rollRival(game, rand = Math.random) {
  const s = game.state;
  s.rival = null;
  if (game.rank >= 1 && rand() < 0.5) {
    const r = RIVALS[Math.min(RIVALS.length - 1, Math.floor(rand() * Math.min(RIVALS.length, game.rank)))];
    s.rival = { id: r.id, spot: SPOTS[Math.floor(rand() * SPOTS.length)] };
  }
  game.emit('change');
  return s.rival;
}

/** During the day: the rival may walk over to the other spot. Returns the new spot, or null. */
export function moveRival(game, rand = Math.random) {
  const r = game.state.rival;
  if (!r || rand() >= RIVAL_MOVE_CHANCE) return null;
  r.spot = r.spot === 'strand' ? 'haven' : 'strand';
  game.emit('change');
  return r.spot;
}

export const rivalAt = (state, spot) => (state.rival?.spot === spot ? RIVALS.find((r) => r.id === state.rival.id) : null);

/** Price factor for deals at a spot. */
export const spotFactor = (state, spot) => (rivalAt(state, spot) ? RIVAL_FACTOR : 1);

export function bribe(game) {
  const r = RIVALS.find((x) => x.id === game.state.rival?.id);
  if (!r || !game.addCash(-r.bribe)) return false;
  game.state.rival = null;
  game.emit('change');
  return true;
}

export function tipOff(game) {
  if (!game.state.rival) return false;
  game.state.rival = null;
  addHeat(game, 0.5);
  return true;
}
