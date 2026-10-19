// The Wii make-up and wrinkles (faceTex 1..11), measured from Mii Studio renders as RGBA
// rasters in mask space, one per face shape (assets/facetex.png: 11 columns, 8 rows of
// 240 x 288 px covering mask u 12..52, v 8..56). They are soft overlays (alpha up to ~0.27)
// drawn on the skin underneath every other face part. loadFaceTex() must finish first.

import { FACE_LIFT, MASK } from './mask.js';

const CELL = { w: 240, h: 288, u0: 12, v0: 8, du: 40, dv: 48 };
let atlas = null;
let loading = null;

export function loadFaceTex(base = new URL('../../assets/', import.meta.url)) {
  loading ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve((atlas = img));
    img.onerror = reject;
    img.src = new URL('facetex.png', base).href;
  });
  return loading;
}

/**
 * Draws make-up `feature` (1..11) for face `shape` into c (mask units). The rasters are in
 * Studio's mask frame; the app's face texture of the lifted face shapes sits higher by the
 * lift, so they are drawn lower by the same amount. Returns false while the atlas is loading.
 */
export function drawFaceTex(c, feature, shape) {
  if (!feature) return true;
  if (!atlas) return false;
  const lift = FACE_LIFT[shape] / MASK.unit;
  c.save();
  c.imageSmoothingEnabled = true;
  c.drawImage(atlas, (feature - 1) * CELL.w, shape * CELL.h, CELL.w, CELL.h, CELL.u0, CELL.v0 + lift, CELL.du, CELL.dv);
  c.restore();
  return true;
}
