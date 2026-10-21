// The clothing shop: shirts for the player's Mii (a shirt colour from the Mii palette, see
// src/mii/palette.js FAVORITE_COLORS) and the costumes that make the guards' disguise real.
// A costume worn while the Reglement-meter is up lowers it by one level, once a day, the same
// day slot as the hut's "Omkleden" (police.js disguise). Pure logic.

import { addHeat } from '../police.js';
import { wereldOf } from './progress.js';

/** fav is the index in FAVORITE_COLORS. */
export const OUTFITS = [
  { id: 'geel', name: 'Gele strandshirt', fav: 2, price: 0 },
  { id: 'blauw', name: 'Blauwe polo', fav: 5, price: 10 },
  { id: 'groen', name: 'Groen hemd', fav: 4, price: 10 },
  { id: 'wit', name: 'Wit linnen', fav: 10, price: 15 },
  { id: 'roze', name: 'Roze blouse', fav: 7, price: 15 },
  { id: 'paars', name: 'Paarse jas', fav: 8, price: 20 },
  { id: 'toerist', name: 'Toeristenshirt (vermomming)', fav: 1, price: 25, disguise: true },
  { id: 'zwart', name: 'Zwart pak (vermomming)', fav: 11, price: 30, disguise: true },
];

export const outfitById = (id) => OUTFITS.find((o) => o.id === id) ?? null;

/**
 * Puts an outfit on: pays its price, and a costume lowers a heat level once a day while the
 * guards are looking. Returns { ok, msg, fav } (fav is the shirt colour to show).
 */
export function changeClothes(game, id) {
  const o = outfitById(id);
  if (!o) return { ok: false, msg: 'Die kleding hebben we niet.' };
  if (o.price && !game.addCash(-o.price)) return { ok: false, msg: `Dat kost €${o.price}. Dat kun je niet betalen.` };
  const s = game.state;
  wereldOf(s).outfit = o.id;
  let msg = `Je draagt nu: ${o.name.replace(' (vermomming)', '')}.`;
  if (o.disguise && s.heat >= 1 && s.disguisedDay !== s.day) {
    s.disguisedDay = s.day;
    addHeat(game, -1);
    msg += ' De bewaking herkent je minder snel: de meter gaat een stap omlaag.';
  }
  game.save();
  return { ok: true, msg, fav: o.fav };
}

/** The shirt colour (FAVORITE_COLORS index) of the saved outfit, or null for the Mii's own. */
export function savedFavorite(state) {
  return outfitById(wereldOf(state).outfit)?.fav ?? null;
}
