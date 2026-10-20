// The looks of the customers as Mii data: an official Mii (by name) or a generated one with a
// fixed seed, plus small overrides (hair colour, height, ...). Needs the Mii code (browser only).

import { OFFICIAL_MIIS } from '../../mii/official.js';
import { cloneMii, normalizeMii, randomMii, seededRandom, setPath } from '../../mii/data.js';

const cache = new Map();

/** Mii data for a customer; the same object every time (clone it before changing it). */
export function miiFor(c) {
  let m = cache.get(c.id);
  if (m) return m;
  if (c.mii) m = cloneMii(OFFICIAL_MIIS.find((x) => x.name === c.mii) ?? OFFICIAL_MIIS[0]);
  else m = randomMii(c.look.g, seededRandom(c.look.seed));
  for (const [path, value] of Object.entries(c.look?.set ?? {})) setPath(m, path, value);
  m.id = `klant-${c.id}`;
  m.name = c.name.slice(0, 10);
  m = normalizeMii(m);
  cache.set(c.id, m);
  return m;
}
