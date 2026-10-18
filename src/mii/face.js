// Paints the face: places the Wii face parts (parts.js) plus beards, glasses and
// make-up onto the face texture (see head.js), and draws the editor's option icons.
//
// The texture is a front view of the head: canvas x and y map linearly onto world
// x and y (FACE_TEX.scale pixels per unit, head height = 1 unit), so a feature
// drawn N pixels wide appears N / scale units wide when the Mii faces you.

import { SKIN_COLORS, HAIR_COLORS, EYE_COLORS, LIP_COLORS, GLASSES_COLORS, mixHex } from './palette.js';
import { EYES, BROWS, NOSES, MOUTHS, MUSTACHES, E } from './parts.js';

export { EYES, BROWS, NOSES, MOUTHS, MUSTACHES };

export const FACE_TEX = { scale: 1000, halfWidth: 0.47, top: 0.45, bottom: -0.62 };
FACE_TEX.width = Math.round(2 * FACE_TEX.halfWidth * FACE_TEX.scale);
FACE_TEX.height = Math.round((FACE_TEX.top - FACE_TEX.bottom) * FACE_TEX.scale);

const K = FACE_TEX.scale;
const CX = FACE_TEX.width / 2;
const OUTLINE = '#22160f';

/** World coordinates (head space, facing +z) to canvas pixels. */
export const faceX = (x) => CX + x * K;
export const faceY = (y) => (FACE_TEX.top - y) * K;
const deg = (d) => (d * Math.PI) / 180;

/** Where every feature sits for the given Mii, in canvas pixels (plus world y for 3D parts). */
export function faceLayout(m) {
  const mouthWorldY = -0.21 - m.mouth.y * 0.013;
  const noseWorldY = -0.09 - m.nose.y * 0.011;
  return {
    eyeX: (0.1 + m.eyes.spacing * 0.016) * K,
    eyeY: faceY(0.135 - m.eyes.y * 0.012),
    eyeScale: (0.64 + m.eyes.size * 0.09) * 2.4,
    eyeRot: deg((m.eyes.rotation - 4) * 5),
    browX: (0.1 + m.brows.spacing * 0.016) * K,
    browY: faceY(0.27 - m.brows.y * 0.012),
    browScale: (0.64 + m.brows.size * 0.09) * 2.5,
    browRot: deg((m.brows.rotation - 6) * 4),
    noseWorldY,
    noseY: faceY(noseWorldY),
    noseScale: (0.6 + m.nose.size * 0.1) * 3.4,
    mouthWorldY,
    mouthY: faceY(mouthWorldY),
    mouthScale: (0.64 + m.mouth.size * 0.09) * 3.8,
    mustacheY: faceY(-0.2 - m.facialHair.y * 0.012),
    mustacheScale: (0.64 + m.facialHair.size * 0.09) * 3.4,
    glassesY: faceY(0.12 - m.glasses.y * 0.012),
    glassesScale: (0.7 + m.glasses.size * 0.075) * 2.05,
    moleX: faceX(-0.3 + m.mole.x * 0.0375),
    moleY: faceY(0.3 - m.mole.y * 0.022),
    moleScale: (0.5 + m.mole.size * 0.12) * 2,
  };
}

// ---------------------------------------------------------------- helpers

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

function circle(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
}

function ellipse(c, x, y, rx, ry, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function strokePath(c, path, color, width) {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = width;
  c.strokeStyle = color;
  if (path) c.stroke(path);
  else c.stroke();
}

function stroke(c, color, width, build) {
  c.beginPath();
  build(c);
  strokePath(c, undefined, color, width);
}

/** Polygon through world-space points. */
function worldPoly(c, pts) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(faceX(x), faceY(y)) : c.moveTo(faceX(x), faceY(y))));
  c.closePath();
}

function hexAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------------------------------------------------------------- drawing the parts

function iris(c, o, x, y, r, clip) {
  c.save();
  if (clip) c.clip(P(clip));
  circle(c, x, y, r);
  c.fillStyle = o.eye;
  c.fill();
  c.lineWidth = r * 0.18;
  c.strokeStyle = 'rgba(0,0,0,0.28)';
  c.stroke();
  circle(c, x, y, r * 0.5);
  c.fillStyle = '#050505';
  c.fill();
  circle(c, x - r * 0.35, y - r * 0.38, r * 0.26);
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.fill();
  c.restore();
}

function sparkle(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y - s);
  c.quadraticCurveTo(x, y, x + s, y);
  c.quadraticCurveTo(x, y, x, y + s);
  c.quadraticCurveTo(x, y, x - s, y);
  c.quadraticCurveTo(x, y, x, y - s);
  c.fillStyle = '#ffffff';
  c.fill();
}

function closedEye(c, w) {
  stroke(c, OUTLINE, 6, (cc) => {
    cc.moveTo(-w, -1);
    cc.quadraticCurveTo(0, 9, w, -2);
  });
}

function drawEye(c, eye, o, blink) {
  if (blink && !eye.closed) {
    closedEye(c, eye.w);
    return;
  }
  for (const layer of eye.layers) {
    const [k, a, b, r, clip] = layer;
    if (k === 'W') {
      c.fillStyle = '#ffffff';
      c.fill(P(a));
    } else if (k === 'I') iris(c, o, a, b, r, clip);
    else if (k === 'K') {
      c.fillStyle = OUTLINE;
      c.fill(P(a));
    } else if (k === 'L') strokePath(c, P(a), OUTLINE, b);
    else if (k === 'R') strokePath(c, P(a), o.lidColor, b);
    else if (k === 'S') sparkle(c, a, b, r);
  }
}

/** Draws simple fill / line / dot layers in one colour. */
function drawFlat(c, layers, color) {
  for (const [k, a, b, r] of layers) {
    if (k === 'F') {
      c.fillStyle = color;
      c.fill(P(a));
    } else if (k === 'L' || k === 'B') strokePath(c, P(a), color, b);
    else if (k === 'O') {
      circle(c, a, b, r);
      c.fillStyle = color;
      c.fill();
    }
  }
}

function drawMouth(c, mouth, o) {
  for (const [k, a, b] of mouth.layers) {
    if (k === 'U' || k === 'D') {
      c.fillStyle = k === 'U' ? o.lipTop : o.lip;
      c.fill(P(a));
    } else if (k === 'G') {
      const g = c.createLinearGradient(0, -18, 0, 18);
      g.addColorStop(0, o.lipTop);
      g.addColorStop(0.5, o.lip);
      g.addColorStop(1, o.lipTop);
      c.fillStyle = g;
      c.fill(P(a));
    } else if (k === 'T') {
      c.save();
      if (b) c.clip(P(b));
      c.fillStyle = '#ffffff';
      c.fill(P(a));
      c.restore();
    } else if (k === 'K') {
      c.fillStyle = o.mouthDark;
      c.fill(P(a));
    } else if (k === 'L') strokePath(c, P(a), o.mouthLine, b);
  }
}

// ---------------------------------------------------------------- beards
// World-space shapes around the jaw, relative to the mouth height.

/** Points along a polyline with every other point pushed up, for a bristly edge. */
function bristly(pts, segments, amp) {
  const out = [];
  const n = pts.length - 1;
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * n;
    const j = Math.min(n - 1, Math.floor(t));
    const f = t - j;
    const x = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f;
    const y = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f;
    out.push([x, y + (i % 2 ? amp : 0)]);
  }
  return out;
}

function beardFill(c, color) {
  c.save();
  c.fillStyle = color;
  c.shadowColor = color;
  c.shadowBlur = 4;
  c.fill();
  c.restore();
}

export const BEARDS = [
  { name: 'Geen', none: true, draw() {} },
  {
    name: 'Sik',
    draw(c, L, o) {
      const my = L.mouthWorldY;
      worldPoly(c, [[0.09, -0.66], ...bristly([[0.09, my - 0.085], [-0.09, my - 0.085]], 8, 0.035), [-0.09, -0.66]]);
      beardFill(c, o.facialHair);
    },
  },
  {
    name: 'Kinbaard',
    draw(c, L, o) {
      const my = L.mouthWorldY;
      worldPoly(c, [[0.22, -0.66], ...bristly([[0.21, my - 0.11], [0, my - 0.075], [-0.21, my - 0.11]], 12, 0.035), [-0.22, -0.66]]);
      beardFill(c, o.facialHair);
    },
  },
  {
    name: 'Volle baard',
    draw(c, L, o) {
      const my = L.mouthWorldY;
      const inner = bristly([[0.34, -0.02], [0.31, -0.2], [0.21, my - 0.03], [0, my - 0.075], [-0.21, my - 0.03], [-0.31, -0.2], [-0.34, -0.02]], 22, 0.03);
      worldPoly(c, [[-0.42, -0.02], [-0.47, -0.66], [0.47, -0.66], [0.42, -0.02], ...inner]);
      beardFill(c, o.facialHair);
    },
  },
];

// ---------------------------------------------------------------- glasses
// Lens shapes in lens space (outer edge towards +x); drawGlasses places the pair.

const CLEAR = 'rgba(214,236,255,0.2)';

export const GLASSES = [
  { name: 'Geen', none: true },
  { name: 'Vierkant', lens: 'M-44 -32 L44 -32 Q48 -32 48 -28 L46 28 Q46 32 42 32 L-42 32 Q-46 32 -46 28 L-48 -28 Q-48 -32 -44 -32 Z', half: 48, frame: 9 },
  { name: 'Smal', lens: 'M-46 -20 L46 -20 L46 20 L-46 20 Z', half: 46, frame: 8 },
  { name: 'Rond', lens: E(0, 0, 42, 42), half: 42, frame: 5 },
  { name: 'Ovaal', lens: E(0, 0, 50, 34), half: 50, frame: 5 },
  { name: 'Dik ovaal', lens: E(0, 0, 50, 36, -6), half: 50, frame: 9 },
  {
    name: 'Pilotenbril',
    lens: 'M-46 -26 L46 -30 Q50 -30 50 -20 Q48 22 14 30 Q-30 34 -44 6 Q-50 -8 -46 -26 Z',
    half: 50,
    frame: 6,
    tint: 'rgba(60,60,66,0.62)',
    topBar: true,
  },
  { name: 'Zonnebril', lens: 'M-46 -28 L46 -28 L46 28 L-46 28 Z', half: 46, frame: 9, tint: 'rgba(36,36,40,0.82)' },
  { name: 'Vlinderbril', lens: 'M-44 -18 Q-20 -30 50 -32 Q52 10 20 24 Q-20 34 -44 10 Z', half: 50, frame: 2, tint: 'gradient' },
];

function drawGlasses(c, g, L, color) {
  const s = L.glassesScale;
  const lensX = 80 * s;
  c.save();
  c.translate(CX, L.glassesY);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const side of [-1, 1]) {
    c.save();
    c.translate(side * lensX, 0);
    c.scale(side * s, s);
    const lens = P(g.lens);
    if (g.tint === 'gradient') {
      const grad = c.createLinearGradient(0, -32, 0, 32);
      grad.addColorStop(0, 'rgba(30,30,36,0.9)');
      grad.addColorStop(1, 'rgba(110,110,120,0.45)');
      c.fillStyle = grad;
    } else {
      c.fillStyle = g.tint ?? CLEAR;
    }
    c.fill(lens);
    strokePath(c, lens, color, g.frame);
    c.restore();
  }
  // Bridge and temples.
  const inner = lensX - g.half * s;
  c.strokeStyle = color;
  c.lineWidth = Math.max(5, g.frame * 0.8) * s;
  c.beginPath();
  c.moveTo(-inner - 2, -10 * s);
  c.quadraticCurveTo(0, -20 * s, inner + 2, -10 * s);
  if (g.topBar) {
    c.moveTo(-lensX, -30 * s);
    c.lineTo(lensX, -30 * s);
  }
  c.moveTo(-lensX - g.half * s + 2, -16 * s);
  c.lineTo(-CX, -22 * s);
  c.moveTo(lensX + g.half * s - 2, -16 * s);
  c.lineTo(CX, -22 * s);
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- facial features (make-up and wrinkles)
// Pixel offsets below are world units x 1000.

function cheeks(c, L, color, radius) {
  for (const side of [-1, 1]) {
    const x = CX + side * (L.eyeX + 50);
    const y = L.eyeY + 120;
    const g = c.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,120,120,0)');
    c.fillStyle = g;
    c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

function shadowAbove(c, L, color) {
  for (const side of [-1, 1]) {
    const x = CX + side * (L.eyeX + 8);
    const y = L.eyeY - 40;
    c.save();
    c.translate(x, y);
    c.scale(1, 0.55);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 85);
    g.addColorStop(0, color);
    g.addColorStop(1, hexAlpha('#000000', 0));
    c.fillStyle = g;
    c.fillRect(-90, -90, 180, 180);
    c.restore();
  }
}

function eachSide(c, color, width, fn) {
  stroke(c, color, width, (cc) => {
    for (const side of [-1, 1]) fn(cc, side);
  });
}

export const FEATURES = [
  { name: 'Geen', none: true, draw() {} },
  { name: 'Blosjes', draw: (c, L) => cheeks(c, L, 'rgba(255,100,110,0.5)', 72) },
  {
    name: 'Blos en oogschaduw',
    draw(c, L) {
      shadowAbove(c, L, 'rgba(80,215,230,0.65)');
      cheeks(c, L, 'rgba(255,100,110,0.5)', 72);
    },
  },
  {
    name: 'Sproeten',
    draw(c, L, o) {
      const spots = [[10, 80], [26, 100], [38, 74], [52, 96], [22, 124], [44, 120], [64, 110], [72, 82]];
      c.fillStyle = mixHex(o.skin, '#7a3410', 0.5);
      for (const side of [-1, 1]) {
        for (const [dx, dy] of spots) {
          circle(c, CX + side * (L.eyeX * 0.45 + dx), L.eyeY + dy, 6.5);
          c.fill();
        }
      }
    },
  },
  {
    name: 'Wallen',
    draw: (c, L, o) =>
      eachSide(c, o.wrinkle, 6, (cc, side) => {
        const x = CX + side * L.eyeX;
        cc.moveTo(x - 42, L.eyeY + 48);
        cc.quadraticCurveTo(x, L.eyeY + 82, x + 42, L.eyeY + 48);
      }),
  },
  {
    name: 'Lachlijnen',
    draw: (c, L, o) =>
      eachSide(c, o.wrinkle, 6, (cc, side) => {
        const x = CX + side * (L.eyeX + 10);
        cc.moveTo(x - side * 20, L.eyeY + 70);
        cc.quadraticCurveTo(x + side * 18, L.eyeY + 120, x + side * 6, L.eyeY + 190);
      }),
  },
  {
    name: 'Wangrimpels',
    draw: (c, L, o) =>
      eachSide(c, o.wrinkle, 6, (cc, side) => {
        const x = CX + side * (L.eyeX + 75);
        cc.moveTo(x - side * 30, L.eyeY + 80);
        cc.quadraticCurveTo(x, L.eyeY + 110, x + side * 8, L.eyeY + 150);
      }),
  },
  {
    name: 'Kinlijn',
    draw(c, L, o) {
      const y = faceY(L.mouthWorldY - 0.1);
      stroke(c, o.wrinkle, 6, (cc) => {
        cc.moveTo(CX - 32, y);
        cc.quadraticCurveTo(CX, y + 18, CX + 32, y);
      });
    },
  },
  { name: 'Oogschaduw', draw: (c, L) => shadowAbove(c, L, 'rgba(150,80,50,0.6)') },
  {
    name: 'Baardschaduw',
    draw(c, L) {
      const my = L.mouthWorldY;
      worldPoly(c, [[-0.4, -0.04], [-0.47, -0.66], [0.47, -0.66], [0.4, -0.04], [0.33, -0.04], [0.3, -0.2], [0.18, my + 0.06], [0.1, my + 0.065], [0.09, my - 0.04], [-0.09, my - 0.04], [-0.1, my + 0.065], [-0.18, my + 0.06], [-0.3, -0.2], [-0.33, -0.04]]);
      c.save();
      c.fillStyle = 'rgba(70,74,84,0.32)';
      c.shadowColor = 'rgba(70,74,84,0.32)';
      c.shadowBlur = 14;
      c.fill();
      c.restore();
    },
  },
  {
    name: 'Mondlijnen',
    draw: (c, L, o) =>
      eachSide(c, o.wrinkle, 6, (cc, side) => {
        cc.moveTo(CX + side * 70, L.noseY - 10);
        cc.quadraticCurveTo(CX + side * 120, L.noseY + 60, CX + side * (30 * L.mouthScale + 22), L.mouthY + 25);
      }),
  },
  {
    name: 'Rimpels',
    draw: (c, L, o) =>
      eachSide(c, o.wrinkle, 5, (cc, side) => {
        const x = CX + side * (L.eyeX + 95);
        for (const [a, b] of [[-28, -46], [0, -2], [26, 44]]) {
          cc.moveTo(x, L.eyeY + a * 0.6);
          cc.lineTo(x + side * 34, L.eyeY + b * 0.8);
        }
        const ux = CX + side * L.eyeX;
        cc.moveTo(ux - 40, L.eyeY + 56);
        cc.quadraticCurveTo(ux, L.eyeY + 84, ux + 40, L.eyeY + 56);
      }),
  },
];

// ---------------------------------------------------------------- whole face

/** All colours used by the face drawings, for one Mii. */
export function faceColors(m) {
  const skin = SKIN_COLORS[m.face.skin].hex;
  const lip = LIP_COLORS[m.mouth.color].hex;
  return {
    skin,
    noseLine: mixHex(skin, '#2a1206', 0.62),
    wrinkle: mixHex(skin, '#5a2a14', 0.55),
    eye: EYE_COLORS[m.eyes.color].hex,
    lidColor: mixHex(skin, '#b0283a', 0.55),
    brow: HAIR_COLORS[m.brows.color].hex,
    lip,
    lipTop: mixHex(lip, '#3a0a06', 0.22),
    mouthLine: mixHex(lip, '#2a0c06', 0.62),
    mouthDark: mixHex(lip, '#1e0604', 0.72),
    facialHair: HAIR_COLORS[m.facialHair.color].hex,
    glasses: GLASSES_COLORS[m.glasses.color].hex,
  };
}

function placed(c, x, y, scale, rot, mirror, fn) {
  c.save();
  c.translate(x, y);
  if (mirror) c.scale(-1, 1);
  c.rotate(-rot);
  c.scale(scale, scale);
  fn();
  c.restore();
}

/**
 * Paints the face of Mii m onto ctx (in face-canvas coordinates), on a skin background.
 * only: draw one layer ('eyes', 'brows', ...), used for option icons.
 */
export function drawFace(c, m, { blink = false, only = null } = {}) {
  const L = faceLayout(m);
  const o = faceColors(m);
  const want = (k) => !only || only === k;

  c.fillStyle = o.skin;
  c.fillRect(-2000, -2000, 6000, 6000);
  if (want('feature')) FEATURES[m.face.feature].draw(c, L, o);
  if (want('beard')) BEARDS[m.facialHair.beard].draw(c, L, o);
  if (want('nose')) placed(c, CX, L.noseY, L.noseScale, 0, false, () => drawFlat(c, NOSES[m.nose.type].layers, o.noseLine));
  if (want('mouth')) placed(c, CX, L.mouthY, L.mouthScale, 0, false, () => drawMouth(c, MOUTHS[m.mouth.type], o));
  if (want('mustache')) {
    placed(c, CX, L.mustacheY, L.mustacheScale, 0, false, () => drawFlat(c, MUSTACHES[m.facialHair.mustache].layers, o.facialHair));
  }
  if (want('eyes')) {
    const type = EYES[m.eyes.type];
    for (const side of [-1, 1]) {
      placed(c, CX + side * L.eyeX, L.eyeY, L.eyeScale, L.eyeRot, side < 0, () => drawEye(c, type, o, blink));
    }
  }
  if (want('brows')) {
    const type = BROWS[m.brows.type];
    for (const side of [-1, 1]) {
      placed(c, CX + side * L.browX, L.browY, L.browScale, L.browRot, side < 0, () => drawFlat(c, type.layers, o.brow));
    }
  }
  if (want('mole') && m.mole.on) {
    circle(c, L.moleX, L.moleY, 7 * L.moleScale);
    c.fillStyle = '#3a2418';
    c.fill();
  }
  if (want('glasses') && !GLASSES[m.glasses.type].none) drawGlasses(c, GLASSES[m.glasses.type], L, o.glasses);
}

/** Paints an option icon: a close-up of one face layer on a skin-coloured tile. */
export function drawFeatureThumb(canvas, m, kind) {
  const c = canvas.getContext('2d');
  const W = canvas.width;
  const L = faceLayout(m);
  const crops = {
    eyes: [CX + L.eyeX, L.eyeY, 125],
    brows: [CX + L.browX, L.browY, 125],
    nose: [CX, L.noseY - 55, 105],
    mouth: [CX, L.mouthY + 10, 150],
    mustache: [CX, L.mustacheY + 10, 160],
    beard: [CX, faceY(L.mouthWorldY - 0.06), 380],
    glasses: [CX, L.glassesY + 10, 260],
    feature: [CX, faceY(-0.12), 280],
  };
  const [cx, cy, half] = crops[kind];
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, W);
  c.save();
  c.scale(W / (2 * half), W / (2 * half));
  c.translate(half - cx, half - cy);
  drawFace(c, m, { only: kind });
  c.restore();
}
