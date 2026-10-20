// The faces of the sellers and suppliers: fixed Miis made from a seed, and small portraits.
// (Uses the Mii code, so this file is for the browser only.)

import { h } from '../../ui/dom.js';
import { randomMii, seededRandom } from '../../mii/data.js';
import { snapshotImage } from '../../mii/thumbs.js';
import { SHIRT } from './data.js';

/** Shirt colours of the suppliers (FAVORITE_COLORS index), so they differ from each other and from the sellers. */
const SUPPLIER_SHIRT = { pim: 3, suus: 7, koko: 6, ivo: 10, sjaak: 11 };

const cache = new Map();

/** Mii data of a candidate ('seller') or a supplier ('supplier'); the same every time. */
export function miiFor(kind, def) {
  const key = `${kind}:${def.id ?? def.name}`;
  if (!cache.has(key)) {
    const data = randomMii(def.gender, seededRandom(def.seed));
    data.name = def.name.slice(0, 10);
    data.favoriteColor = kind === 'seller' ? SHIRT : SUPPLIER_SHIRT[def.id] ?? 4;
    cache.set(key, data);
  }
  return cache.get(key);
}

/** Round portrait (face snapshot), with the first letter shown until it is ready. */
export function avatar(kind, def, { big = false } = {}) {
  const img = h('img', { alt: '', width: 96, height: 96 });
  const box = h('span', { class: `hd-avatar ${big ? 'is-big' : ''} ${kind === 'seller' ? 'is-orange' : ''}`, 'data-initial': def.name[0] }, img);
  try {
    snapshotImage(img, miiFor(kind, def), { view: 'face', size: 96 }, () => !box.isConnected);
  } catch {
    // no portrait: the letter stays
  }
  return box;
}
