// Fresh and top-quality ingredients from the suppliers improve the batch they are used in.
// Pure logic.
//
// The ingredient stock only knows counts (citroen: 12), so this feature keeps its own pool of
// "fresh" units per good (h.fresh). When a station job starts, the ingredients that disappeared
// from the stock are matched against that pool and the new job's product gets extra quality:
// +2% per fresh unit and +4% per top unit, at most +12% per batch.

import { itemKey, parseItem } from '../economy.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { GOODS } from '../data/products.js';
import { MAX_FRESH_BONUS, TIERS } from './data.js';
import { handelState } from './store.js';

const isIngredient = (id) => !!(GOODS[id] ?? INGREDIENTS[id]);

/** A delivered batch of a good enters your stock: remember that these units are fresh. */
export function addFresh(h, good, tier, n) {
  if (!TIERS[tier]?.bonus || n <= 0) return;
  const pool = (h.fresh[good] ??= { vers: 0, top: 0 });
  pool[tier] = (pool[tier] ?? 0) + n;
}

/** The pool can never hold more units than are in stock (the plain units are assumed used first). */
export function clampFresh(h, inventory) {
  for (const [good, pool] of Object.entries(h.fresh)) {
    const have = inventory[good] ?? 0;
    let excess = (pool.vers ?? 0) + (pool.top ?? 0) - have;
    if (excess > 0) {
      const v = Math.min(pool.vers ?? 0, excess);
      pool.vers -= v;
      excess -= v;
      pool.top = Math.max(0, (pool.top ?? 0) - excess);
    }
    if (!pool.vers && !pool.top) delete h.fresh[good];
  }
}

/** Total fresh units in stock of a good: { vers, top }. */
export const freshOf = (h, good) => h.fresh[good] ?? { vers: 0, top: 0 };

/** Uses `used` ({ good: n }) from the pool (top first). Returns the quality bonus (0..MAX_FRESH_BONUS). */
export function consumeFresh(h, used) {
  let bonus = 0;
  for (const [good, n] of Object.entries(used)) {
    const pool = h.fresh[good];
    if (!pool || n <= 0) continue;
    let left = n;
    for (const tier of ['top', 'vers']) {
      const k = Math.min(left, pool[tier] ?? 0);
      pool[tier] = (pool[tier] ?? 0) - k;
      left -= k;
      bonus += k * TIERS[tier].bonus;
    }
    if (!pool.vers && !pool.top) delete h.fresh[good];
  }
  return Math.min(MAX_FRESH_BONUS, Math.round(bonus * 100) / 100);
}

/** The same item key with `bonus` more quality. */
export function bumpKey(key, bonus) {
  const p = parseItem(key);
  return p ? itemKey(p.product, p.effects, p.quality + bonus) : key;
}

/** Copy of the ingredient counts in a stock. */
export function snapshot(inventory) {
  const out = {};
  for (const [k, v] of Object.entries(inventory)) if (isIngredient(k)) out[k] = v;
  return out;
}

/** What watchJobs remembers between two looks. */
export function newMemo(game) {
  return { inv: snapshot(game.state.inventory), jobs: new Set(game.state.jobs.map((j) => j.id)) };
}

/**
 * Call it every frame. When a station job has appeared since the last look, the ingredients that
 * left the stock are what it used: fresh ones raise its quality. Returns { job, bonus } or null.
 */
export function watchJobs(game, memo) {
  const h = handelState(game);
  const st = game.state;
  const now = snapshot(st.inventory);
  const fresh = st.jobs.filter((j) => !memo.jobs.has(j.id));
  let result = null;
  if (fresh.length) {
    const used = {};
    for (const [k, v] of Object.entries(memo.inv)) if ((now[k] ?? 0) < v) used[k] = v - (now[k] ?? 0);
    const bonus = consumeFresh(h, used);
    if (bonus > 0) {
      const job = fresh[0];
      job.key = bumpKey(job.key, bonus);
      result = { job, bonus };
      game.emit('change');
    }
    for (const j of fresh) memo.jobs.add(j.id);
  }
  clampFresh(h, st.inventory);
  memo.inv = snapshot(st.inventory);
  for (const id of [...memo.jobs]) if (!st.jobs.some((j) => j.id === id)) memo.jobs.delete(id);
  return result;
}
