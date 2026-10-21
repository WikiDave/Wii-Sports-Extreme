// Production stations: a batch is started in a free station, takes `time` game minutes and is
// collected afterwards. The cook starts batches in the morning through the same stations (empire.js).
// Pure logic.

import { PROPERTIES } from './data/properties.js';
import { PRODUCTS } from './data/products.js';
import { canMake, itemKey, recipeEffects, limitFree, batchInputs, FULL_STOCK } from './economy.js';
import { DAY_START } from './state.js';
import { speedFor } from './panden/upgrades.js';

/** Minutes of one game day on the clock (06:00 to 04:00). */
export const DAY_LENGTH = 22 * 60;

/** Absolute game time in minutes, continuous across sleeping. */
export const now = (state) => (state.day - 1) * DAY_LENGTH + (state.minutes - DAY_START);

/** How many stations the player has: one per property slot group (the hut has 1). */
export const stationLimit = (state) => state.properties.reduce((n, id) => n + PROPERTIES[id].stations, 0);

export const busy = (state) => state.jobs.length;
export const ready = (state) => state.jobs.filter((j) => j.readyAt <= now(state));

/**
 * Why a batch cannot start now, as Dutch text; '' when it can. `extra` is the number of bottles
 * on top of the product's yield (the packer). The inputs leave the stock first, so their room
 * counts for the bottles.
 */
export function jobBlock(game, productId, ingredients, extra = 0) {
  const s = game.state;
  const p = PRODUCTS[productId];
  if (busy(s) >= stationLimit(s)) return 'Alle stations zijn bezig.';
  if (!canMake(s.inventory, productId, ingredients)) return 'Je mist grondstoffen.';
  if (limitFree(game) + batchInputs(productId, ingredients) < p.yield + extra) return FULL_STOCK;
  return '';
}

/**
 * Starts a batch in a free station. Returns the job, or null (see jobBlock). `extra` adds bottles
 * to the yield.
 */
export function startJob(game, productId, ingredients, quality, extra = 0) {
  if (jobBlock(game, productId, ingredients, extra)) return null;
  const s = game.state;
  const p = PRODUCTS[productId];
  for (const [id, n] of Object.entries(p.needs)) game.addItem(id, -n);
  for (const i of ingredients) game.addItem(i, -1);
  const job = {
    id: `${now(s)}-${s.jobs.length}-${Math.floor(Math.random() * 1e4)}`,
    product: productId,
    key: itemKey(productId, recipeEffects(productId, ingredients), quality),
    yield: p.yield + extra,
    startedAt: now(s),
    // The station's property may have the Productie upgrade (panden/upgrades.js speedFor).
    readyAt: now(s) + Math.round(p.time * speedFor(s, s.jobs.length)),
  };
  s.jobs.push(job);
  game.emit('change');
  return job;
}

/** Collects every finished batch. Returns the number of items. */
export function collect(game) {
  const s = game.state;
  const done = ready(s);
  if (!done.length) return 0;
  let n = 0;
  for (const j of done) {
    game.addItem(j.key, j.yield);
    game.addXp(8);
    n += j.yield;
  }
  s.jobs = s.jobs.filter((j) => !done.includes(j));
  game.emit('collected', { items: n });
  game.emit('change');
  return n;
}

/** 0..1 progress of a job. */
export const progress = (state, j) => Math.max(0, Math.min(1, (now(state) - j.startedAt) / (j.readyAt - j.startedAt)));
