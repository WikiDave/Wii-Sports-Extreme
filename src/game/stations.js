// Production stations: a batch is started in a free station, takes `time` game minutes and is
// collected afterwards. Staff cooks still make batches in the morning (empire.js). Pure logic.

import { PROPERTIES } from './data/properties.js';
import { PRODUCTS } from './data/products.js';
import { canMake, itemKey, recipeEffects, limitFree } from './economy.js';
import { DAY_START } from './state.js';

/** Minutes of one game day on the clock (06:00 to 04:00). */
export const DAY_LENGTH = 22 * 60;

/** Absolute game time in minutes, continuous across sleeping. */
export const now = (state) => (state.day - 1) * DAY_LENGTH + (state.minutes - DAY_START);

/** How many stations the player has: one per property slot group (the hut has 1). */
export const stationLimit = (state) => state.properties.reduce((n, id) => n + PROPERTIES[id].stations, 0);

export const busy = (state) => state.jobs.length;
export const ready = (state) => state.jobs.filter((j) => j.readyAt <= now(state));

/** Starts a batch. Returns the job, or null (no free station, missing goods or no room). */
export function startJob(game, productId, ingredients, quality) {
  const s = game.state;
  const p = PRODUCTS[productId];
  if (busy(s) >= stationLimit(s) || !canMake(s.inventory, productId, ingredients)) return null;
  // Room for the result must stay free, counting the batches already cooking.
  const cooking = s.jobs.reduce((n, j) => n + j.yield, 0);
  if (limitFree(game) - cooking < p.yield) return null;
  for (const [id, n] of Object.entries(p.needs)) game.addItem(id, -n);
  for (const i of ingredients) game.addItem(i, -1);
  const job = {
    id: `${now(s)}-${s.jobs.length}-${Math.floor(Math.random() * 1e4)}`,
    product: productId,
    key: itemKey(productId, recipeEffects(productId, ingredients), quality),
    yield: p.yield,
    startedAt: now(s),
    readyAt: now(s) + p.time,
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
