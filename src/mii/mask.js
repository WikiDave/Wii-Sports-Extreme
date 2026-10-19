// Shared measures of the Wii face. The Wii draws eyes, eyebrows, mouth, moustache and
// mole on a 64 x 64 grid, the face mask (RFL_MakeTex.c): u to the right, v down, centre
// line u = 32. The mask is projected straight onto the front of the head; these
// constants were measured from Mii renders (capture units: see head-data.js).

/** World units per capture unit. */
export const CAPTURE_UNIT = 0.0118;

/** Mask grid <-> head-local world coordinates (x right, y up). */
export const MASK = {
  unit: 2.334 * CAPTURE_UNIT,
  v0: 29.32,
  u: (x) => 32 + x / MASK.unit,
  v: (y) => MASK.v0 - y / MASK.unit,
  x: (u) => (u - 32) * MASK.unit,
  y: (v) => (MASK.v0 - v) * MASK.unit,
};

/** The face texture: the part of the mask that covers the head, at px pixels per unit. */
export const FACE_TEX = { px: 24, u0: 12, u1: 52, v0: 8, v1: 56 };
FACE_TEX.width = (FACE_TEX.u1 - FACE_TEX.u0) * FACE_TEX.px;
FACE_TEX.height = (FACE_TEX.v1 - FACE_TEX.v0) * FACE_TEX.px;
