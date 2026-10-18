// 2D drawings of the facial features, in the bold line style of Wii Miis. They are
// painted onto the face texture (see head.js) and reused for the editor's option icons.
//
// The texture is a front view of the head: canvas x and y map linearly onto world
// x and y (FACE_TEX.scale pixels per unit, head height = 1 unit), so a feature
// drawn N pixels wide appears N / scale units wide when the Mii faces you.

import { SKIN_COLORS, HAIR_COLORS, EYE_COLORS, LIP_COLORS, GLASSES_COLORS, mixHex } from './palette.js';

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

function circle(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
}

function ellipse(c, x, y, rx, ry, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function stroke(c, color, width, build) {
  c.beginPath();
  build(c);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = width;
  c.strokeStyle = color;
  c.stroke();
}

function fill(c, color, build) {
  c.beginPath();
  build(c);
  c.closePath();
  c.fillStyle = color;
  c.fill();
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

// ---------------------------------------------------------------- eyes
// Local space: eye centred on (0, 0), outer corner towards +x, y down.

function almond(c, p) {
  const { w, top, bot } = p;
  const outer = p.outer ?? 0;
  const inner = p.inner ?? 0;
  c.beginPath();
  c.moveTo(-w, inner);
  c.bezierCurveTo(-w * 0.55, -top * 1.33 + inner * 0.5, w * 0.55, -top * 1.33 + outer * 0.5, w, outer);
  c.bezierCurveTo(w * 0.55, bot * 1.33 + outer * 0.5, -w * 0.55, bot * 1.33 + inner * 0.5, -w, inner);
  c.closePath();
}

function upperLid(c, p) {
  const { w, top } = p;
  const outer = p.outer ?? 0;
  const inner = p.inner ?? 0;
  c.moveTo(-w, inner);
  c.bezierCurveTo(-w * 0.55, -top * 1.33 + inner * 0.5, w * 0.55, -top * 1.33 + outer * 0.5, w, outer);
}

function eyeBase(c, o, p) {
  almond(c, p);
  c.fillStyle = '#ffffff';
  c.fill();
  c.save();
  c.clip();
  const r = p.iris;
  const ix = p.irisX ?? 0;
  const iy = p.irisY ?? 0;
  circle(c, ix, iy, r);
  c.fillStyle = o.eye;
  c.fill();
  c.lineWidth = r * 0.2;
  c.strokeStyle = 'rgba(0,0,0,0.3)';
  c.stroke();
  circle(c, ix, iy, r * 0.5);
  c.fillStyle = '#050505';
  c.fill();
  circle(c, ix - r * 0.36, iy - r * 0.38, r * 0.27);
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.fill();
  if (p.sparkle) {
    circle(c, ix + r * 0.38, iy + r * 0.36, r * 0.13);
    c.fill();
  }
  c.restore();
  almond(c, p);
  c.lineWidth = 3.4;
  c.strokeStyle = OUTLINE;
  c.stroke();
  if (p.lid !== 0) stroke(c, OUTLINE, p.lid ?? 6, (cc) => upperLid(cc, p));
}

/** Covers the eye above a line with a lid in skin colour (sleepy and angry eyes). */
function lidCover(c, o, p, x0, y0, x1, y1) {
  c.save();
  almond(c, p);
  c.clip();
  c.beginPath();
  c.moveTo(-60, -60);
  c.lineTo(60, -60);
  c.lineTo(60, y1 + ((y1 - y0) * (60 - x1)) / (x1 - x0));
  c.lineTo(-60, y0 - ((y1 - y0) * (x0 + 60)) / (x1 - x0));
  c.closePath();
  c.fillStyle = o.lid;
  c.fill();
  c.restore();
  stroke(c, OUTLINE, 6, (cc) => {
    cc.moveTo(x0, y0);
    cc.lineTo(x1, y1);
  });
}

function closedEye(c, w) {
  stroke(c, OUTLINE, 6, (cc) => {
    cc.moveTo(-w, -1);
    cc.quadraticCurveTo(0, 9, w, -2);
  });
}

const eye = (name, p, extra) => ({
  name,
  draw(c, o) {
    eyeBase(c, o, p);
    if (extra) extra(c, o, p);
  },
  blink: (c) => closedEye(c, p.w),
});

export const EYES = [
  eye('Normaal', { w: 33, top: 22, bot: 20, iris: 17, irisY: 2 }),
  eye('Rond', { w: 29, top: 26, bot: 25, iris: 16, irisY: 1 }),
  eye('Smal', { w: 36, top: 12, bot: 10, iris: 12, irisY: 1 }),
  eye('Slaperig', { w: 34, top: 19, bot: 16, iris: 14, irisY: 4, lid: 0 }, (c, o, p) => lidCover(c, o, p, -36, 0, 36, -3)),
  {
    name: 'Vrolijk',
    draw: (c) =>
      stroke(c, OUTLINE, 7, (cc) => {
        cc.moveTo(-28, 8);
        cc.quadraticCurveTo(0, -26, 28, 8);
      }),
    blink: (c) => closedEye(c, 28),
  },
  eye('Boos', { w: 34, top: 19, bot: 16, iris: 14, irisY: 4, lid: 0 }, (c, o, p) => lidCover(c, o, p, -36, 3, 36, -17)),
  eye('Wimpers', { w: 33, top: 20, bot: 17, iris: 15, irisY: 2, lid: 6.5 }, (c) =>
    stroke(c, OUTLINE, 4, (cc) => {
      cc.moveTo(30, -6);
      cc.lineTo(42, -14);
      cc.moveTo(23, -15);
      cc.lineTo(32, -26);
    }),
  ),
  eye('Groot', { w: 32, top: 29, bot: 26, iris: 21, irisY: 3, sparkle: true }),
  {
    name: 'Stipjes',
    draw(c, o) {
      ellipse(c, 0, 2, 9, 13);
      c.fillStyle = mixHex(o.eye, '#000000', 0.5);
      c.fill();
      circle(c, -2.5, -3, 2.8);
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.fill();
    },
    blink: (c) => closedEye(c, 12),
  },
  {
    name: 'Dicht',
    draw(c) {
      closedEye(c, 30);
      stroke(c, OUTLINE, 3.5, (cc) => {
        cc.moveTo(18, 4);
        cc.lineTo(22, 12);
        cc.moveTo(28, 1);
        cc.lineTo(35, 7);
      });
    },
    blink: (c) => closedEye(c, 30),
  },
  eye('Puppy', { w: 32, top: 23, bot: 20, outer: 8, inner: -3, iris: 16, irisY: 3 }),
  eye('Katachtig', { w: 36, top: 17, bot: 13, outer: -9, inner: 3, iris: 13, irisY: 2, lid: 6.5 }, (c) =>
    stroke(c, OUTLINE, 5, (cc) => {
      cc.moveTo(34, -9);
      cc.lineTo(47, -17);
    }),
  ),
  eye('Verbaasd', { w: 28, top: 27, bot: 27, iris: 8, lid: 4 }),
];

// ---------------------------------------------------------------- eyebrows
// Local space: brow centred on (0, 0), outer end towards +x.

export const BROWS = [
  {
    name: 'Dun',
    draw: (c, o) =>
      stroke(c, o.brow, 6, (cc) => {
        cc.moveTo(-36, 5);
        cc.quadraticCurveTo(0, -10, 37, 5);
      }),
  },
  {
    name: 'Normaal',
    draw: (c, o) =>
      fill(c, o.brow, (cc) => {
        cc.moveTo(-38, 8);
        cc.lineTo(-37, -6);
        cc.quadraticCurveTo(0, -15, 38, 0);
        cc.quadraticCurveTo(2, -1, -38, 8);
      }),
  },
  {
    name: 'Dik',
    draw: (c, o) =>
      fill(c, o.brow, (cc) => {
        cc.moveTo(-36, -5);
        cc.quadraticCurveTo(0, -15, 36, -5);
        cc.lineTo(36, 8);
        cc.quadraticCurveTo(0, -1, -36, 10);
      }),
  },
  {
    name: 'Borstelig',
    draw: (c, o) =>
      fill(c, o.brow, (cc) => {
        cc.moveTo(-37, 10);
        for (let i = 0; i <= 8; i++) {
          const x = -37 + i * 9.25;
          const arch = -9 + (x / 37) ** 2 * 7;
          cc.lineTo(x, arch - (i % 2 ? 7 : 0));
        }
        cc.lineTo(37, 9);
        cc.quadraticCurveTo(0, 0, -37, 10);
      }),
  },
  {
    name: 'Hoekig',
    draw: (c, o) =>
      stroke(c, o.brow, 10, (cc) => {
        cc.moveTo(-35, 6);
        cc.lineTo(8, -10);
        cc.lineTo(36, 3);
      }),
  },
  {
    name: 'Kort',
    draw(c, o) {
      ellipse(c, -8, 0, 22, 10, -0.12);
      c.fillStyle = o.brow;
      c.fill();
    },
  },
  {
    name: 'Recht',
    draw: (c, o) =>
      stroke(c, o.brow, 8, (cc) => {
        cc.moveTo(-34, 0);
        cc.lineTo(34, 0);
      }),
  },
  {
    name: 'Bezorgd',
    draw: (c, o) =>
      fill(c, o.brow, (cc) => {
        cc.moveTo(-37, -12);
        cc.lineTo(-35, 1);
        cc.quadraticCurveTo(0, 4, 37, 10);
        cc.quadraticCurveTo(2, -6, -37, -12);
      }),
  },
  {
    name: 'Stip',
    draw(c, o) {
      ellipse(c, -16, 0, 13, 9);
      c.fillStyle = o.brow;
      c.fill();
    },
  },
  {
    name: 'Boog',
    draw: (c, o) =>
      stroke(c, o.brow, 10, (cc) => {
        cc.moveTo(-33, 8);
        cc.quadraticCurveTo(0, -18, 33, 8);
      }),
  },
  {
    name: 'Golvend',
    draw: (c, o) =>
      stroke(c, o.brow, 8, (cc) => {
        cc.moveTo(-36, 4);
        cc.bezierCurveTo(-14, -14, 10, 10, 36, -5);
      }),
  },
  { name: 'Geen', none: true, draw() {} },
];

// ---------------------------------------------------------------- noses
// Line drawings like the Wii nose icons. Local space: (0, 0) is the tip, the
// bridge runs up to about y = -38. `bump` shapes the small 3D bulge under it.

const BUMP = {
  small: { A: 0.018, L: 0.07, tipW: 0.03, bridgeW: 0.02 },
  normal: { A: 0.03, L: 0.13, tipW: 0.04, bridgeW: 0.022 },
  big: { A: 0.042, L: 0.16, tipW: 0.048, bridgeW: 0.026 },
  wide: { A: 0.026, L: 0.1, tipW: 0.062, bridgeW: 0.026 },
};

const noseLine = (name, bump, build) => ({ name, bump: BUMP[bump], draw: (c, o) => stroke(c, o.noseLine, 4, build) });

export const NOSES = [
  noseLine('Haakje', 'normal', (c) => {
    c.moveTo(3, -36);
    c.bezierCurveTo(3, -18, -11, -9, -11, -2);
    c.bezierCurveTo(-11, 5, -2, 6, 5, 1);
  }),
  noseLine('Rondje', 'normal', (c) => {
    c.moveTo(-15, -8);
    c.quadraticCurveTo(0, 10, 15, -8);
  }),
  {
    name: 'Stipjes',
    bump: BUMP.small,
    draw(c, o) {
      c.fillStyle = o.noseLine;
      for (const x of [-6, 6]) {
        circle(c, x, -2, 3.3);
        c.fill();
      }
    },
  },
  noseLine('Puntje', 'normal', (c) => {
    c.moveTo(-13, -12);
    c.quadraticCurveTo(-3, 4, 0, 4);
    c.quadraticCurveTo(3, 4, 13, -12);
  }),
  noseLine('Groot', 'big', (c) => {
    c.moveTo(-4, -38);
    c.quadraticCurveTo(-5, -16, -9, -10);
    c.quadraticCurveTo(-18, -4, -13, 2);
    c.quadraticCurveTo(-7, 6, 0, 2);
    c.quadraticCurveTo(7, 6, 13, 2);
    c.quadraticCurveTo(18, -4, 9, -10);
  }),
  {
    name: 'Driehoekje',
    bump: BUMP.small,
    draw: (c, o) =>
      fill(c, o.noseLine, (cc) => {
        cc.moveTo(-9, 0);
        cc.lineTo(9, 0);
        cc.lineTo(0, -9);
      }),
  },
  noseLine('Bakje', 'wide', (c) => {
    c.moveTo(-16, -12);
    c.quadraticCurveTo(-17, 2, -8, 2);
    c.lineTo(8, 2);
    c.quadraticCurveTo(17, 2, 16, -12);
  }),
  noseLine('Boogje', 'small', (c) => {
    c.moveTo(-11, 2);
    c.quadraticCurveTo(0, -14, 11, 2);
  }),
  noseLine('Lang', 'big', (c) => {
    c.moveTo(-8, -36);
    c.bezierCurveTo(-12, -4, -9, 4, 0, 4);
    c.bezierCurveTo(9, 4, 12, -4, 8, -36);
  }),
  noseLine('Neusgaten', 'big', (c) => {
    c.moveTo(-5, -38);
    c.lineTo(-6, -10);
    c.quadraticCurveTo(-16, -6, -14, 0);
    c.quadraticCurveTo(-11, 6, -4, 1);
    c.moveTo(5, -38);
    c.lineTo(6, -10);
    c.quadraticCurveTo(16, -6, 14, 0);
    c.quadraticCurveTo(11, 6, 4, 1);
  }),
  noseLine('Golfje', 'wide', (c) => {
    c.moveTo(-16, -8);
    c.quadraticCurveTo(-15, 2, -8, 0);
    c.quadraticCurveTo(-4, -1, -3, 2);
    c.quadraticCurveTo(0, 6, 3, 2);
    c.quadraticCurveTo(4, -1, 8, 0);
    c.quadraticCurveTo(15, 2, 16, -8);
  }),
  noseLine('Recht', 'big', (c) => {
    c.moveTo(-4, -38);
    c.lineTo(-5, -6);
    c.lineTo(-12, 2);
    c.moveTo(4, -38);
    c.lineTo(5, -6);
    c.lineTo(12, 2);
  }),
];

// ---------------------------------------------------------------- mouths
// Local space: mouth centred on (0, 0).

function openMouth(c, o, build, { teeth = 0, tongue = true } = {}) {
  c.beginPath();
  build(c);
  c.closePath();
  c.fillStyle = '#6a1414';
  c.fill();
  c.save();
  c.clip();
  if (teeth) {
    c.fillStyle = '#ffffff';
    c.fillRect(-60, -40, 120, 40 + teeth);
  }
  if (tongue) {
    ellipse(c, 0, 24, 16, 10);
    c.fillStyle = o.tongue;
    c.fill();
  }
  c.restore();
  c.beginPath();
  build(c);
  c.closePath();
  c.lineWidth = 3.5;
  c.lineJoin = 'round';
  c.strokeStyle = o.mouthLine;
  c.stroke();
}

const line = (name, build) => ({ name, draw: (c, o) => stroke(c, o.mouthLine, 5, build) });

export const MOUTHS = [
  line('Glimlach', (c) => {
    c.moveTo(-30, -4);
    c.quadraticCurveTo(0, 13, 30, -4);
  }),
  {
    name: 'Lach',
    draw: (c, o) =>
      openMouth(
        c,
        o,
        (cc) => {
          cc.moveTo(-30, -6);
          cc.quadraticCurveTo(0, 0, 30, -6);
          cc.quadraticCurveTo(0, 36, -30, -6);
        },
        { teeth: 3 },
      ),
  },
  line('Neutraal', (c) => {
    c.moveTo(-27, 0);
    c.lineTo(27, 0);
  }),
  line('Sip', (c) => {
    c.moveTo(-27, 7);
    c.quadraticCurveTo(0, -10, 27, 7);
  }),
  {
    name: 'Oo',
    draw: (c, o) => openMouth(c, o, (cc) => cc.ellipse(0, 2, 9, 11, 0, 0, Math.PI * 2), { tongue: false }),
  },
  {
    name: 'Grijns',
    draw(c, o) {
      const build = (cc) => {
        cc.moveTo(-34, -8);
        cc.lineTo(34, -8);
        cc.quadraticCurveTo(28, 20, 0, 20);
        cc.quadraticCurveTo(-28, 20, -34, -8);
      };
      fill(c, '#ffffff', build);
      stroke(c, 'rgba(60,20,20,0.45)', 2.5, (cc) => {
        cc.moveTo(-31, 3);
        cc.quadraticCurveTo(0, 9, 31, 3);
      });
      c.beginPath();
      build(c);
      c.closePath();
      c.lineWidth = 3.5;
      c.strokeStyle = o.mouthLine;
      c.stroke();
    },
  },
  {
    name: 'Lippen',
    draw(c, o) {
      fill(c, o.lip, (cc) => {
        cc.moveTo(-28, 0);
        cc.bezierCurveTo(-17, -12, -8, -12, 0, -6);
        cc.bezierCurveTo(8, -12, 17, -12, 28, 0);
        cc.quadraticCurveTo(0, 4, -28, 0);
      });
      fill(c, mixHex(o.lip, '#ffffff', 0.15), (cc) => {
        cc.moveTo(-28, 0);
        cc.quadraticCurveTo(0, 4, 28, 0);
        cc.bezierCurveTo(17, 14, -17, 14, -28, 0);
      });
      stroke(c, mixHex(o.lip, '#300808', 0.55), 2.5, (cc) => {
        cc.moveTo(-27, 0);
        cc.quadraticCurveTo(0, 4, 27, 0);
      });
    },
  },
  line('Scheef', (c) => {
    c.moveTo(-28, 2);
    c.quadraticCurveTo(4, 12, 30, -10);
  }),
  line('Kattensnoet', (c) => {
    c.moveTo(-22, -2);
    c.quadraticCurveTo(-11, 12, 0, 0);
    c.quadraticCurveTo(11, 12, 22, -2);
  }),
  {
    name: 'Tong uit',
    draw(c, o) {
      const tongue = (cc) => {
        cc.moveTo(-11, 4);
        cc.lineTo(-11, 14);
        cc.quadraticCurveTo(-11, 26, 0, 26);
        cc.quadraticCurveTo(11, 26, 11, 14);
        cc.lineTo(11, 4);
      };
      fill(c, o.tongue, tongue);
      stroke(c, o.mouthLine, 3, tongue);
      stroke(c, o.mouthLine, 5, (cc) => {
        cc.moveTo(-30, -4);
        cc.quadraticCurveTo(0, 13, 30, -4);
      });
    },
  },
  {
    name: 'Ooh',
    draw: (c, o) => openMouth(c, o, (cc) => cc.ellipse(0, 4, 15, 19, 0, 0, Math.PI * 2), { teeth: -14 }),
  },
  {
    name: 'Tanden',
    draw(c, o) {
      c.beginPath();
      c.roundRect(-26, -9, 52, 18, 7);
      c.fillStyle = '#ffffff';
      c.fill();
      stroke(c, 'rgba(60,20,20,0.5)', 2, (cc) => {
        cc.moveTo(-26, 0);
        cc.lineTo(26, 0);
        for (const x of [-13, 0, 13]) {
          cc.moveTo(x, -9);
          cc.lineTo(x, 9);
        }
      });
      c.beginPath();
      c.roundRect(-26, -9, 52, 18, 7);
      c.lineWidth = 3.5;
      c.strokeStyle = o.mouthLine;
      c.stroke();
    },
  },
];

// ---------------------------------------------------------------- moustaches
// Local space: centred under the nose.

export const MUSTACHES = [
  { name: 'Geen', none: true, draw() {} },
  {
    name: 'Snor',
    draw: (c, o) =>
      fill(c, o.facialHair, (cc) => {
        cc.moveTo(0, -8);
        cc.bezierCurveTo(14, -15, 40, -9, 46, 8);
        cc.bezierCurveTo(30, 4, 14, 6, 0, 2);
        cc.bezierCurveTo(-14, 6, -30, 4, -46, 8);
        cc.bezierCurveTo(-40, -9, -14, -15, 0, -8);
      }),
  },
  {
    name: 'Potlood',
    draw: (c, o) =>
      stroke(c, o.facialHair, 5, (cc) => {
        cc.moveTo(-34, 4);
        cc.quadraticCurveTo(-16, -6, -3, -3);
        cc.moveTo(3, -3);
        cc.quadraticCurveTo(16, -6, 34, 4);
      }),
  },
  {
    name: 'Krulsnor',
    draw(c, o) {
      fill(c, o.facialHair, (cc) => {
        cc.moveTo(0, -9);
        cc.bezierCurveTo(12, -13, 26, -8, 32, 0);
        cc.bezierCurveTo(22, 0, 10, 2, 0, 2);
        cc.bezierCurveTo(-10, 2, -22, 0, -32, 0);
        cc.bezierCurveTo(-26, -8, -12, -13, 0, -9);
      });
      stroke(c, o.facialHair, 6, (cc) => {
        cc.moveTo(30, -1);
        cc.quadraticCurveTo(48, 4, 48, -8);
        cc.quadraticCurveTo(47, -15, 40, -13);
        cc.moveTo(-30, -1);
        cc.quadraticCurveTo(-48, 4, -48, -8);
        cc.quadraticCurveTo(-47, -15, -40, -13);
      });
    },
  },
  {
    name: 'Walrus',
    draw: (c, o) =>
      fill(c, o.facialHair, (cc) => {
        cc.moveTo(0, -12);
        cc.bezierCurveTo(20, -17, 44, -6, 46, 22);
        cc.bezierCurveTo(36, 13, 20, 11, 0, 12);
        cc.bezierCurveTo(-20, 11, -36, 13, -46, 22);
        cc.bezierCurveTo(-44, -6, -20, -17, 0, -12);
      }),
  },
  {
    name: 'Chevron',
    draw: (c, o) =>
      fill(c, o.facialHair, (cc) => {
        cc.moveTo(-38, 8);
        cc.lineTo(-29, -9);
        cc.lineTo(29, -9);
        cc.lineTo(38, 8);
        cc.quadraticCurveTo(0, 1, -38, 8);
      }),
  },
  {
    name: 'Klein',
    draw(c, o) {
      c.beginPath();
      c.roundRect(-15, -8, 30, 14, 4);
      c.fillStyle = o.facialHair;
      c.fill();
    },
  },
];

// ---------------------------------------------------------------- beards
// World-space shapes around the jaw, relative to the mouth height.

function fullBeard(c, my, holeBelowMouth) {
  worldPoly(c, [
    [-0.4, 0.04], [-0.47, -0.2], [-0.47, -0.66], [0.47, -0.66], [0.47, -0.2], [0.4, 0.04],
    [0.33, 0.04], [0.3, -0.12], [0.21, my + 0.07], [0.12, my + 0.075], [0.085, my - holeBelowMouth],
    [-0.085, my - holeBelowMouth], [-0.12, my + 0.075], [-0.21, my + 0.07], [-0.3, -0.12], [-0.33, 0.04],
  ]);
}

function softFill(c, color) {
  c.save();
  c.fillStyle = color;
  c.shadowColor = color;
  c.shadowBlur = 10;
  c.fill();
  c.restore();
}

export const BEARDS = [
  { name: 'Geen', none: true, draw() {} },
  {
    name: 'Stoppels',
    draw(c, L, o) {
      fullBeard(c, L.mouthWorldY, 0.01);
      softFill(c, hexAlpha(o.facialHair, 0.2));
      ellipse(c, CX, faceY(L.mouthWorldY + 0.045), 95, 28);
      softFill(c, hexAlpha(o.facialHair, 0.18));
    },
  },
  {
    name: 'Sik',
    draw(c, L, o) {
      const my = L.mouthWorldY;
      worldPoly(c, [[-0.1, my + 0.02], [-0.12, my - 0.08], [-0.05, my - 0.17], [0.05, my - 0.17], [0.12, my - 0.08], [0.1, my + 0.02], [0.06, my - 0.035], [-0.06, my - 0.035]]);
      softFill(c, o.facialHair);
    },
  },
  {
    name: 'Volle baard',
    draw(c, L, o) {
      fullBeard(c, L.mouthWorldY, 0.035);
      softFill(c, o.facialHair);
    },
  },
  {
    name: 'Kinbaard',
    draw(c, L, o) {
      worldPoly(c, [
        [-0.4, 0.04], [-0.47, -0.2], [-0.47, -0.66], [0.47, -0.66], [0.47, -0.2], [0.4, 0.04],
        [0.35, 0.04], [0.33, -0.16], [0.24, -0.34], [0.12, -0.43], [0, -0.455], [-0.12, -0.43], [-0.24, -0.34], [-0.33, -0.16], [-0.35, 0.04],
      ]);
      softFill(c, o.facialHair);
    },
  },
  {
    name: 'Matje',
    draw(c, L, o) {
      const my = L.mouthWorldY;
      worldPoly(c, [[-0.025, my - 0.035], [0.025, my - 0.035], [0, my - 0.09]]);
      softFill(c, o.facialHair);
    },
  },
];

// ---------------------------------------------------------------- glasses
// Lens shapes in lens space (outer edge towards +x); pairs are placed by drawGlasses.

const CLEAR_LENS = 'rgba(214,236,255,0.22)';

const glasses = (name, lens, opts = {}) => ({ name, lens, ...opts });

export const GLASSES = [
  { name: 'Geen', none: true },
  glasses('Rond', (c) => c.arc(0, 0, 44, 0, Math.PI * 2), { half: 44 }),
  glasses('Vierkant', (c) => c.roundRect(-46, -38, 92, 76, 14), { half: 46 }),
  glasses('Smal', (c) => c.roundRect(-48, -24, 96, 48, 10), { half: 48 }),
  glasses(
    'Piloot',
    (c) => {
      c.moveTo(-44, -30);
      c.lineTo(42, -34);
      c.quadraticCurveTo(52, -32, 49, -2);
      c.bezierCurveTo(44, 40, -8, 46, -30, 27);
      c.bezierCurveTo(-48, 10, -50, -20, -44, -30);
    },
    { half: 48, tint: 'rgba(120,84,40,0.42)' },
  ),
  glasses(
    'Kattenoog',
    (c) => {
      c.moveTo(-44, -18);
      c.quadraticCurveTo(-30, -36, 20, -34);
      c.lineTo(54, -46);
      c.quadraticCurveTo(54, 10, 30, 30);
      c.quadraticCurveTo(0, 42, -30, 30);
      c.quadraticCurveTo(-50, 10, -44, -18);
    },
    { half: 50 },
  ),
  glasses('Halve rand', (c) => c.roundRect(-46, -30, 92, 62, 12), { half: 46, halfRim: true }),
  glasses('Zonnebril', (c) => c.roundRect(-48, -34, 96, 68, 22), { half: 48, tint: 'rgba(14,14,20,0.9)', shine: true }),
  glasses('Groot rond', (c) => c.arc(0, 0, 56, 0, Math.PI * 2), { half: 56 }),
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
    c.beginPath();
    g.lens(c);
    c.closePath();
    c.fillStyle = g.tint ?? CLEAR_LENS;
    c.fill();
    if (g.shine) {
      c.save();
      c.clip();
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.beginPath();
      c.moveTo(-40, -40);
      c.lineTo(-10, -40);
      c.lineTo(-50, 30);
      c.lineTo(-70, 30);
      c.fill();
      c.restore();
      c.beginPath();
      g.lens(c);
      c.closePath();
    }
    c.strokeStyle = color;
    if (g.halfRim) {
      c.lineWidth = 2;
      c.globalAlpha = 0.45;
      c.stroke();
      c.globalAlpha = 1;
      c.beginPath();
      c.moveTo(-46, -4);
      c.lineTo(-46, -18);
      c.quadraticCurveTo(-46, -30, -34, -30);
      c.lineTo(34, -30);
      c.quadraticCurveTo(46, -30, 46, -18);
      c.lineTo(46, -4);
      c.lineWidth = 8;
    } else {
      c.lineWidth = 6;
    }
    c.stroke();
    c.restore();
  }
  const inner = lensX - g.half * s;
  c.strokeStyle = color;
  c.lineWidth = 5 * s;
  c.beginPath();
  c.moveTo(-inner - 2, -8 * s);
  c.quadraticCurveTo(0, -20 * s, inner + 2, -8 * s);
  c.moveTo(-lensX - g.half * s + 2, -14 * s);
  c.lineTo(-CX, -20 * s);
  c.moveTo(lensX + g.half * s - 2, -14 * s);
  c.lineTo(CX, -20 * s);
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- facial features
// Pixel offsets below are world units x 1000.

function cheeks(c, L, color, radius) {
  for (const side of [-1, 1]) {
    const x = CX + side * (L.eyeX + 55);
    const y = L.eyeY + 125;
    const g = c.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,120,120,0)');
    c.fillStyle = g;
    c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

export const FEATURES = [
  { name: 'Geen', none: true, draw() {} },
  { name: 'Blosjes', draw: (c, L) => cheeks(c, L, 'rgba(255,92,92,0.45)', 75) },
  {
    name: 'Sproeten',
    draw(c, L, o) {
      const spots = [[10, 80], [24, 100], [36, 76], [50, 96], [20, 122], [42, 120], [62, 112], [70, 82]];
      c.fillStyle = mixHex(o.skin, '#5a2a10', 0.42);
      for (const side of [-1, 1]) {
        for (const [dx, dy] of spots) {
          circle(c, CX + side * (L.eyeX * 0.45 + dx), L.eyeY + dy, 6.5);
          c.fill();
        }
      }
    },
  },
  {
    name: 'Rimpels',
    draw(c, L, o) {
      const col = mixHex(o.skin, '#000000', 0.32);
      for (const side of [-1, 1]) {
        const x = CX + side * L.eyeX;
        stroke(c, col, 5, (cc) => {
          cc.moveTo(x - 45, L.eyeY + 62);
          cc.quadraticCurveTo(x, L.eyeY + 82, x + 45, L.eyeY + 62);
        });
      }
      stroke(c, col, 5, (cc) => {
        for (const y of [0.31, 0.265]) {
          cc.moveTo(faceX(-0.13), faceY(y - 0.008));
          cc.quadraticCurveTo(CX, faceY(y + 0.012), faceX(0.13), faceY(y - 0.008));
        }
      });
    },
  },
  {
    name: 'Make-up',
    draw(c, L) {
      for (const side of [-1, 1]) {
        const x = CX + side * L.eyeX;
        const y = L.eyeY - 35;
        const g = c.createRadialGradient(x, y, 0, x, y, 80);
        g.addColorStop(0, 'rgba(150,80,200,0.55)');
        g.addColorStop(1, 'rgba(150,80,200,0)');
        c.fillStyle = g;
        c.fillRect(x - 90, y - 90, 180, 180);
      }
      cheeks(c, L, 'rgba(255,110,140,0.38)', 70);
    },
  },
  {
    name: 'Lachrimpels',
    draw(c, L, o) {
      const col = mixHex(o.skin, '#000000', 0.28);
      for (const side of [-1, 1]) {
        const x = CX + side * (30 * L.mouthScale + 25);
        stroke(c, col, 5, (cc) => {
          cc.moveTo(x - side * 8, L.mouthY - 55);
          cc.quadraticCurveTo(x + side * 16, L.mouthY, x - side * 4, L.mouthY + 45);
        });
      }
    },
  },
  {
    name: 'Kuiltje',
    draw(c, L, o) {
      const y = faceY(L.mouthWorldY - 0.11);
      stroke(c, mixHex(o.skin, '#000000', 0.3), 5, (cc) => {
        cc.moveTo(CX - 15, y);
        cc.quadraticCurveTo(CX, y + 12, CX + 15, y);
      });
    },
  },
  {
    name: 'Wallen',
    draw(c, L) {
      for (const side of [-1, 1]) {
        ellipse(c, CX + side * L.eyeX, L.eyeY + 58, 66, 20);
        c.fillStyle = 'rgba(90,50,90,0.2)';
        c.fill();
      }
    },
  },
];

// ---------------------------------------------------------------- whole face

/** All colours used by the face drawings, for one Mii. */
export function faceColors(m) {
  const skin = SKIN_COLORS[m.face.skin].hex;
  const lip = LIP_COLORS[m.mouth.color].hex;
  return {
    skin,
    lid: mixHex(skin, '#000000', 0.08),
    noseLine: mixHex(skin, '#2a1206', 0.62),
    eye: EYE_COLORS[m.eyes.color].hex,
    brow: HAIR_COLORS[m.brows.color].hex,
    lip,
    mouthLine: mixHex(lip, '#2a0c06', 0.62),
    tongue: mixHex(lip, '#ff9a9a', 0.55),
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
  if (want('nose')) placed(c, CX, L.noseY, L.noseScale, 0, false, () => NOSES[m.nose.type].draw(c, o));
  if (want('mouth')) placed(c, CX, L.mouthY, L.mouthScale, 0, false, () => MOUTHS[m.mouth.type].draw(c, o));
  if (want('mustache')) {
    placed(c, CX, L.mustacheY, L.mustacheScale, 0, false, () => MUSTACHES[m.facialHair.mustache].draw(c, o));
  }
  if (want('eyes')) {
    const type = EYES[m.eyes.type];
    for (const side of [-1, 1]) {
      placed(c, CX + side * L.eyeX, L.eyeY, L.eyeScale, L.eyeRot, side < 0, () => (blink ? type.blink(c, o) : type.draw(c, o)));
    }
  }
  if (want('brows')) {
    const type = BROWS[m.brows.type];
    for (const side of [-1, 1]) {
      placed(c, CX + side * L.browX, L.browY, L.browScale, L.browRot, side < 0, () => type.draw(c, o));
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
    glasses: [CX, L.glassesY, 340],
    feature: [CX, faceY(-0.1), 330],
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
