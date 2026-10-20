// Features: self-contained add-ons to the island game. Each feature is a file in this folder
// with `export default { id, install(ctx) }`; install() may return { update(t, dt, paused), dispose() }.
// The island screen builds the `ctx` (see docs/FEATURES.md) and installs every feature below.
// A feature that throws while installing or updating is switched off and logged; the game goes on.

import klanten from './klanten.js';
import handel from './handel.js';
import witwassen from './witwassen.js';
import politie from './politie.js';
import panden from './panden.js';
import voertuigen from './voertuigen.js';
import missies from './missies.js';
import wereld from './wereld.js';
import uiterlijk from './uiterlijk.js';

export const FEATURES = [klanten, handel, witwassen, politie, panden, voertuigen, missies, wereld, uiterlijk];

/** Installs all features; returns { update(t, dt, paused), dispose(), installed }. */
export function installFeatures(ctx) {
  const live = [];
  for (const f of FEATURES) {
    try {
      const inst = f.install(ctx) ?? {};
      live.push({ id: f.id, inst });
    } catch (err) {
      console.error(`Feature ${f.id} could not be installed`, err);
    }
  }
  return {
    installed: live.map((l) => l.id),
    update(t, dt, paused) {
      for (const l of live) {
        if (l.dead || !l.inst.update) continue;
        try {
          l.inst.update(t, dt, paused);
        } catch (err) {
          l.dead = true;
          console.error(`Feature ${l.id} stopped after an error`, err);
        }
      }
    },
    dispose() {
      for (const l of live) {
        try {
          l.inst.dispose?.();
        } catch (err) {
          console.error(`Feature ${l.id} dispose failed`, err);
        }
      }
    },
  };
}
