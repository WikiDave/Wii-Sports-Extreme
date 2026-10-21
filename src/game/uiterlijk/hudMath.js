// Numbers behind the HUD (no DOM): rank progress, the smoothed cash counter, the floating
// "+€30" labels and the heat segments. Pure logic, tested in tests/uiterlijk.test.mjs.

import { RANKS, RANK_XP } from '../state.js';

/**
 * Where the player stands between two ranks: { rank, name, next, pct, toNext }.
 * pct is 0..1 (1 at the top rank, where next and toNext are null).
 */
export function rankProgress(xp) {
  const x = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let rank = 0;
  RANK_XP.forEach((need, i) => x >= need && (rank = i));
  const name = RANKS[rank];
  if (rank >= RANK_XP.length - 1) return { rank, name, next: null, pct: 1, toNext: null };
  const from = RANK_XP[rank];
  const to = RANK_XP[rank + 1];
  const pct = clamp01((x - from) / (to - from));
  return { rank, name, next: RANKS[rank + 1], pct, toNext: to - x };
}

export const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * Moves `shown` towards `target` by an exponential ease (frame-rate independent). Snaps when
 * close, so the counter stops exactly on the value.
 */
export function approach(shown, target, dt, speed = 8) {
  const d = target - shown;
  if (Math.abs(d) < 0.5) return target;
  return shown + d * (1 - Math.exp(-speed * Math.max(0, dt)));
}

/** The label that floats up after cash changes: '+€30', '−€12', or '' for no change. */
export function floatLabel(delta, format = (n) => n.toLocaleString('nl-NL')) {
  const d = Math.round(delta);
  if (!d) return '';
  return `${d > 0 ? '+' : '−'}€${format(Math.abs(d))}`;
}

/** Four heat segments; lit ones are true. Level 0..4. */
export function heatSegments(level) {
  const lvl = Math.max(0, Math.min(4, Math.floor(level) || 0));
  return [1, 2, 3, 4].map((i) => i <= lvl);
}

/** Maps a weather id (weather.js) to the HUD icon name. */
export function weatherIcon(id) {
  return { zon: 'sun', bewolkt: 'cloud', regen: 'rain', storm: 'storm' }[id] ?? 'sun';
}
