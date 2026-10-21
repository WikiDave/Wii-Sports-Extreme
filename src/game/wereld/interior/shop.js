// The clothing shop in Havenstad: a rack of shirts, a changing cubicle, a mirror and the
// counter with the shopkeeper. Trying on opens a menu of outfits (see outfits.js); the Mii
// takes the shirt colour at once.

import * as THREE from 'three';
import { box, cyl, roomShell, solid, newMii, placeMii } from './common.js';
import { makeDef, item } from './def.js';
import { h, modal, toast } from '../../../ui/dom.js';
import { FAVORITE_COLORS } from '../../../mii/palette.js';
import { OUTFITS, changeClothes } from '../outfits.js';

export const SHOP_CSS = `
.outfit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
.outfit-btn { display: flex; align-items: center; gap: 10px; text-align: left; padding: 10px; min-height: 52px; }
.outfit-swatch { flex: 0 0 26px; width: 26px; height: 26px; border-radius: 8px; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.7), 0 1px 3px rgba(0,0,0,0.25); }
.outfit-btn small { display: block; opacity: 0.75; }
@media (max-width: 420px) { .outfit-grid { grid-template-columns: 1fr; } }
`;

/** The clothes menu: pick a shirt; env.dress(colour) puts it on the Mii. */
export function openOutfits(env) {
  const s = env.game.state;
  const body = h(
    'div',
    {},
    h('p', {}, `Je hebt €${s.cash.toLocaleString('nl-NL')} op zak. Een vermomming helpt tegen de bewaking als de meter hoog staat (één keer per dag).`),
    h(
      'div',
      { class: 'outfit-grid' },
      OUTFITS.map((o) =>
        h(
          'button',
          {
            class: 'btn outfit-btn',
            type: 'button',
            onClick: () => {
              const r = changeClothes(env.game, o.id);
              if (r.ok) env.dress(r.fav);
              toast(r.msg);
            },
          },
          h('span', { class: 'outfit-swatch', style: { background: FAVORITE_COLORS[o.fav].hex } }),
          h('span', {}, h('strong', {}, o.name.replace(' (vermomming)', '')), h('small', {}, o.disguise ? `Vermomming · €${o.price}` : o.price ? `€${o.price}` : 'Gratis')),
        ),
      ),
    ),
  );
  modal({ title: 'Kledingrek', body, actions: [{ label: 'Klaar', kind: 'primary' }] });
}

export function buildShop(env, o) {
  const g = new THREE.Group();
  const x0 = o.x - 5;
  const x1 = o.x + 5;
  const z0 = o.z - 4;
  const z1 = o.z + 4;
  const bounds = roomShell(g, { x0, x1, z0, z1, y0: o.y, h: 3.6, floor: '#e8e0d0', wall: '#cfe6ff', trim: '#ffffff', door: { x: o.x, w: 2.4 } });
  const solids = [];
  const wood = '#a8743a';

  // The rail with eight shirts, one in each colour of the outfits.
  g.add(cyl(0.04, 0.04, 6.4, '#9aa6b2', o.x, o.y + 2.2, o.z + 0.4, 6).rotateZ(Math.PI / 2));
  for (const ux of [-3.4, 3.4]) {
    g.add(cyl(0.05, 0.05, 2.2, '#9aa6b2', o.x + ux, o.y + 1.1, o.z + 0.4, 6));
    solids.push(solid(o.x + ux - 0.2, o.x + ux + 0.2, o.z + 0.2, o.z + 0.6));
  }
  OUTFITS.forEach((of, i) => {
    // A shirt: a body with two short sleeves, hanging from the rail.
    const sx = o.x - 3.0 + i * 0.86;
    const colour = FAVORITE_COLORS[of.fav].hex;
    g.add(box(0.5, 0.78, 0.1, colour, sx, o.y + 1.72, o.z + 0.4));
    g.add(box(0.16, 0.42, 0.1, colour, sx - 0.33, o.y + 1.9, o.z + 0.4, { rz: 0.25 }));
    g.add(box(0.16, 0.42, 0.1, colour, sx + 0.33, o.y + 1.9, o.z + 0.4, { rz: -0.25 }));
  });

  // A mirror on the right wall.
  g.add(box(0.1, 2.2, 1.6, wood, x1 - 0.2, o.y + 1.5, o.z - 1.8));
  g.add(box(0.05, 1.9, 1.3, '#c8ecff', x1 - 0.24, o.y + 1.5, o.z - 1.8));

  // The changing cubicle in the back corner, with a pink curtain.
  g.add(box(2.2, 2.4, 0.08, '#ff7aa8', o.x - 3.8, o.y + 1.2, o.z + 2.4));
  g.add(box(0.08, 2.4, 1.6, '#ff7aa8', o.x - 2.8, o.y + 1.2, o.z + 3.2));
  solids.push(solid(o.x - 4.9, o.x - 2.7, o.z + 2.0, o.z + 3.6));

  // The counter and the till; the shopkeeper stands behind it.
  g.add(box(2.6, 1.1, 0.9, wood, o.x + 2.4, o.y + 0.55, o.z - 2.6));
  g.add(box(2.8, 0.1, 1.1, '#fff4e0', o.x + 2.4, o.y + 1.15, o.z - 2.6));
  g.add(box(0.5, 0.4, 0.4, '#3a4452', o.x + 2.4, o.y + 1.4, o.z - 2.6));
  g.add(box(0.4, 0.2, 0.05, '#8fe3ff', o.x + 2.4, o.y + 1.5, o.z - 2.4, { mat: null }));
  solids.push(solid(o.x + 1.1, o.x + 3.7, o.z - 3.1, o.z - 1.3));
  const shopkeeper = newMii('Yoko', 7);
  placeMii(shopkeeper, o.x + 2.4, o.y, o.z - 1.7, Math.PI);
  g.add(shopkeeper.group);

  const items = [
    item(o.x, z0 + 0.8, 1.6, 'Naar buiten', () => env.exit()),
    item(o.x, o.z - 0.6, 2.2, 'Kledingrek', () => openOutfits(env)),
    item(o.x - 3.8, o.z + 1.2, 1.9, 'Pashokje', () => openOutfits(env)),
    item(x1 - 1.5, o.z - 1.8, 1.8, 'Spiegel', () => toast('Je ziet er goed uit!')),
    item(o.x + 2.4, o.z - 3.6, 1.8, 'Praat met de verkoopster', () => toast('Welkom! Deze week gaan de gele strandshirts als warme broodjes.')),
  ];
  return makeDef({
    group: g,
    origin: o,
    bounds,
    solids,
    spawn: { x: o.x - 1.6, z: o.z - 1.6 },
    items,
    ambient: 1.1,
    ambColor: '#ffffff',
    lamps: [
      { x: o.x - 1, y: o.y + 3.1, z: o.z + 0.4, color: '#ffffff', intensity: 6, dist: 10 },
      { x: o.x + 2, y: o.y + 3.1, z: o.z - 1.5, color: '#fff6e8', intensity: 6, dist: 10 },
      { x: o.x - 3.8, y: o.y + 3.0, z: o.z + 2.4, color: '#ffe0f0', intensity: 3, dist: 6 },
    ],
    camDist: 7,
  });
}
