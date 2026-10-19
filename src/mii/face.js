// Paints the face texture: the Wii face mask. Eyes, eyebrows, mouth, moustache and mole
// are placed exactly like the Wii does it (RFL_MakeTex.c): every part is one texture
// quad on the 64 x 64 mask grid, scaled by 1 + 0.4 size, turned in 11.25 degree steps
// around its inner edge and squashed by (0.8896, 0.9277); eyes, eyebrows and the two
// moustache halves are mirrored onto the left of the face. The part shapes themselves
// (parts.js) were traced from the Wii textures in frame units, 0..1000 across the quad.
//
// drawFace() draws in mask units: the caller maps the FACE_TEX rectangle onto its canvas.

import { GLASSES_DATA } from './glasses-data.js';
import { SKIN_COLORS, HAIR_COLORS, EYE_COLORS, LIP_COLORS, GLASSES_COLORS } from './palette.js';
import { EYES, BROWS, NOSES, MOUTHS, MUSTACHES, MOLE, BLINK_EYE } from './parts.js';
import { FACE_TEX } from './mask.js';
import { drawFaceTex } from './facetex.js';
import { drawNoseLine, noseAnchorV, noseScale } from './nose.js';
import { drawBeardIcon } from './beard.js';
import * as legacy from './legacy.js';

export { EYES, BROWS, NOSES, MOUTHS, MUSTACHES };
export const { BEARDS, FEATURES } = legacy;
export const GLASSES = [{ name: 'Geen', none: true }, ...['Vierkant', 'Smal', 'Rond', 'Ovaal', 'Dik ovaal', 'Pilotenbril', 'Zonnebril', 'Vlinderbril'].map((name, i) => ({ name, layers: GLASSES_DATA[i + 1] }))];

const SX = 0.88961464;
const SY = 0.9276675;
const STEP = 1.0760943;
const grow = (size) => 1 + 0.4 * size;
const RAD = Math.PI / 180;

/** Where every part sits for Mii m, in mask units (u, v anchor; w, h quad size; a angle in degrees). */
export function faceLayout(m) {
  const eye = grow(m.eyes.size);
  const brow = grow(m.brows.size);
  const mouth = grow(m.mouth.size);
  const hair = grow(m.facialHair.size);
  const mole = grow(m.mole.size);
  return {
    eye: {
      u: 32 + SX * m.eyes.spacing,
      v: 18.451525 + STEP * m.eyes.y,
      w: 5.34375 * eye,
      h: 4.5 * eye,
      a: 11.25 * ((m.eyes.rotation + EYES[m.eyes.type].rot) % 32),
    },
    brow: {
      u: 32 + SX * m.brows.spacing,
      v: 16.549807 + STEP * m.brows.y,
      w: 5.0625 * brow,
      h: 4.5 * brow,
      a: 11.25 * ((m.brows.rotation + BROWS[m.brows.type].rot) % 32),
    },
    mouth: { u: 32, v: 29.25885 + STEP * m.mouth.y, w: 6.1875 * mouth, h: 4.5 * mouth, a: 0 },
    mustache: { u: 32, v: 31.763554 + STEP * m.facialHair.y, w: 4.5 * hair, h: 9 * hair, a: 0 },
    mole: { u: 17.766165 + 1.7792293 * m.mole.x, v: 17.95986 + STEP * m.mole.y, w: mole, h: mole, a: 0 },
    // Nose and glasses, measured in Studio's face-0 frame. The lifted face shapes (2, 6, 7) raise
    // them by the same amount as the whole face texture, so no extra offset here.
    nose: { u: 32, v: noseAnchorV(m.nose.y), s: noseScale(m.nose.size) },
    glasses: { u: 32, v: 31.7 + 0.9557 * (m.glasses.y - 10), s: (0.4 + 0.175 * m.glasses.size) / 1.1 },
  };
}

/** All colours used by the face drawings, for one Mii (Mii Studio palette). */
export function faceColors(m) {
  const lip = LIP_COLORS[m.mouth.color];
  return {
    skin: SKIN_COLORS[m.face.skin].hex,
    eye: { W: '#ffffff', I: EYE_COLORS[m.eyes.color].hex, K: '#000000' },
    brow: { F: HAIR_COLORS[m.brows.color].hex },
    mouth: { R: lip.hex, G: lip.dark, T: '#ffffff', K: '#000000' },
    hair: { F: HAIR_COLORS[m.facialHair.color].hex },
    mole: { F: '#120f0f' },
    noseLine: '#000000',
    glasses: GLASSES_COLORS[m.glasses.color].hex,
  };
}

// ---------------------------------------------------------------- drawing

const paths = new Map();
/** Cached Path2D for an SVG path string. */
function P(d) {
  let p = paths.get(d);
  if (!p) {
    p = new Path2D(d);
    paths.set(d, p);
  }
  return p;
}

function fillLayers(c, layers, colors) {
  for (const [role, d, color] of layers) {
    c.fillStyle = color ?? colors[role];
    c.fill(P(d), 'evenodd');
  }
}

/** Into the frame of a quad: (0, 0) top-left, (1000, 1000) bottom-right. */
function enterFrame(c, q, centred) {
  c.translate(q.u, q.v);
  c.scale(SX, SY);
  c.rotate(-q.a * RAD);
  c.scale(q.w / 1000, q.h / 1000);
  c.translate(centred ? -500 : 0, -500);
}

/** A part drawn on both sides: the image-right quad from its anchor, then its mirror image. */
function bothSides(c, q, draw) {
  for (const side of [1, -1]) {
    c.save();
    if (side < 0) {
      c.translate(64, 0);
      c.scale(-1, 1);
    }
    enterFrame(c, q, false);
    draw();
    c.restore();
  }
}

function centred(c, q, draw) {
  c.save();
  enterFrame(c, q, true);
  draw();
  c.restore();
}

// Parts not traced yet use the old hand-drawn shapes, mapped into the frame where the
// traced Wii textures put them: [x, y] of the old origin and old units per frame unit.
const OLD_FRAME = { eye: [383, 500, 10.57, 12.05], brow: [478, 334, 11.48, 12.39], mouth: [500, 500, 12.18, 16.07] };
function oldShape(c, kind, draw) {
  const [x, y, sx, sy] = OLD_FRAME[kind];
  c.translate(x, y);
  c.scale(sx, sy);
  draw();
}

function drawEyes(c, m, L, o, blink) {
  const type = blink ? BLINK_EYE : EYES[m.eyes.type];
  bothSides(c, L.eye, () => {
    if (type.layers) fillLayers(c, type.layers, o.eye);
    else oldShape(c, 'eye', () => legacy.drawEye(c, type.old, legacyColors(m), blink));
  });
}

function drawBrows(c, m, L, o) {
  const type = BROWS[m.brows.type];
  bothSides(c, L.brow, () => {
    if (type.layers) fillLayers(c, type.layers, o.brow);
    else oldShape(c, 'brow', () => legacy.drawFlat(c, type.old.layers, o.brow.F));
  });
}

function drawMouth(c, m, L, o) {
  const type = MOUTHS[m.mouth.type];
  centred(c, L.mouth, () => {
    if (type.layers) fillLayers(c, type.layers, o.mouth);
    else oldShape(c, 'mouth', () => legacy.drawMouth(c, type.old, legacyColors(m)));
  });
}

function drawMustache(c, m, L, o) {
  const type = MUSTACHES[m.facialHair.mustache];
  if (type.none) return;
  if (type.layers) {
    bothSides(c, L.mustache, () => fillLayers(c, type.layers, o.hair));
    return;
  }
  // Old moustaches are drawn whole, centred below the nose.
  c.save();
  c.translate(32, L.mustache.v - 0.2 * L.mustache.h * SY);
  c.scale(0.167 * L.mustache.w / 11.7, 0.167 * L.mustache.w / 11.7);
  legacy.drawFlat(c, type.old.layers, o.hair.F);
  c.restore();
}

/** Colours in the shape the old drawings expect. */
function legacyColors(m) {
  const o = faceColors(m);
  return { eye: o.eye.I, lidColor: '#b0283a', lip: o.mouth.R, lipTop: o.mouth.G, mouthLine: '#000000', mouthDark: '#5a1008' };
}

/** Old-pixel layout values for the interim drawings (make-up, beards, glasses, nose line). */
function oldLayout(m, L) {
  const eyeU = L.eye.u + SX * 0.383 * L.eye.w;
  const mouthY = legacy.oldY(L.mouth.v);
  return {
    eyeX: legacy.oldX(eyeU) - legacy.CX,
    eyeY: legacy.oldY(L.eye.v),
    mouthY,
    mouthWorldY: 0.62 - mouthY / 1000,
    mouthScale: 4.8 * (grow(m.mouth.size) / 2.6),
    noseY: legacy.oldY(L.nose.v),
    noseScale: 5.2 * L.nose.s,
    glassesY: legacy.oldY(L.glasses.v),
    glassesScale: 2.8 * L.glasses.s,
  };
}

function inOldSpace(c, fn) {
  c.save();
  c.translate(legacy.OLD_ORIGIN.u, legacy.OLD_ORIGIN.v);
  c.scale(1 / legacy.OLD_PX, 1 / legacy.OLD_PX);
  fn();
  c.restore();
}

/**
 * Paints the face of Mii m onto c, in mask units, on a skin background.
 * only: draw one part ('eyes', 'brows', ...), used for option icons.
 */
export function drawFace(c, m, { blink = false, only = null } = {}) {
  const L = faceLayout(m);
  const o = faceColors(m);
  const want = (k) => !only || only === k;
  const old = oldLayout(m, L);
  const oldColors = { ...legacyColors(m), skin: o.skin, wrinkle: '#5a2a14', facialHair: o.hair.F, noseLine: o.noseLine };

  c.fillStyle = o.skin;
  c.fillRect(-64, -64, 192, 192);
  // Make-up and wrinkles (measured rasters; the old drawing while they load).
  if (want('feature') && !drawFaceTex(c, m.face.feature, m.face.shape)) inOldSpace(c, () => FEATURES[m.face.feature].draw(c, old, oldColors));
  // Beards are 3D (beard.js); only the option icon shows one here.
  if (only === 'beard') drawBeardIcon(c, m.facialHair.beard, o.hair.F);
  // The Wii draws the mask parts so that the first one stays on top: moustache, mouth,
  // eyebrows, eyes, mole. Here they are painted bottom first.
  if (want('mole') && m.mole.on) centred(c, L.mole, () => fillLayers(c, MOLE.layers, o.mole));
  if (want('eyes')) drawEyes(c, m, L, o, blink);
  if (want('brows')) drawBrows(c, m, L, o);
  if (want('mouth')) drawMouth(c, m, L, o);
  if (want('mustache')) drawMustache(c, m, L, o);
  if (want('nose')) drawNoseLine(c, NOSES[m.nose.type].id, m.nose.y, m.nose.size, o.noseLine);
  if (want('glasses') && !GLASSES[m.glasses.type].none) {
    c.save();
    c.translate(L.glasses.u, L.glasses.v);
    c.scale(L.glasses.s / 100, L.glasses.s / 100);
    for (const [, d, color, alpha] of GLASSES[m.glasses.type].layers) {
      c.globalAlpha = alpha;
      c.fillStyle = color === 'glass' ? o.glasses : color;
      c.fill(P(d), 'evenodd');
    }
    c.restore();
  }
}

/** Paints the face onto a FACE_TEX-sized canvas context at the given resolution scale. */
export function paintFaceTexture(ctx, m, { scale = 1, blink = false } = {}) {
  const k = FACE_TEX.px * scale;
  ctx.setTransform(k, 0, 0, k, -FACE_TEX.u0 * k, -FACE_TEX.v0 * k);
  drawFace(ctx, m, { blink });
}

/** Paints an option icon: a close-up of one face part on a skin-coloured tile. */
export function drawFeatureThumb(canvas, m, kind) {
  const c = canvas.getContext('2d');
  const W = canvas.width;
  const L = faceLayout(m);
  const eyeU = L.eye.u + SX * 0.45 * L.eye.w;
  const browU = L.brow.u + SX * 0.5 * L.brow.w;
  // Centre (u, v) and half size of each crop, in mask units.
  const crops = {
    eyes: [eyeU, L.eye.v, 5.2],
    brows: [browU, L.brow.v, 5.2],
    nose: [32, L.nose.v - 2.5, 4.5],
    mouth: [32, L.mouth.v, 6.2],
    mustache: [32, L.mustache.v, 7.5],
    beard: [32, L.mouth.v + 2, 14],
    glasses: [32, L.glasses.v, 11],
    feature: [32, L.eye.v + 5, 12],
  };
  const [cu, cv, half] = crops[kind];
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, W);
  c.save();
  c.scale(W / (2 * half), W / (2 * half));
  c.translate(half - cu, half - cv);
  drawFace(c, m, { only: kind });
  c.restore();
}
