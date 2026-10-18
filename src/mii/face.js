// 2D drawings of the facial features. They are painted onto a transparent canvas
// that wraps around the front of the head (see head.js), and reused for the
// option icons in the Mii editor.
//
// Canvas x maps linearly to the angle around the head (phi) and canvas y to the
// angle down from the crown (theta), both at FACE_SCALE pixels per radian.

import { SKIN_COLORS, HAIR_COLORS, EYE_COLORS, LIP_COLORS, GLASSES_COLORS, mixHex } from './palette.js';

export const FACE_TEX = { width: 1024, height: 768, theta0: 0.2 * Math.PI, phiSpan: Math.PI };
export const FACE_SCALE = FACE_TEX.width / FACE_TEX.phiSpan;
const CX = FACE_TEX.width / 2;
const OUTLINE = '#2b1d18';

export const deg = (d) => (d * Math.PI) / 180;
export const faceX = (phi) => CX + phi * FACE_SCALE;
export const faceY = (theta) => (theta - FACE_TEX.theta0) * FACE_SCALE;
const ax = (d) => faceX(deg(d));
const ay = (d) => faceY(deg(d));

/** Where every feature sits for the given Mii (canvas pixels, plus a few 3D angles). */
export function faceLayout(m) {
  const mouthTheta = 118 + m.mouth.y * 1.5;
  return {
    eyeY: ay(83 + m.eyes.y * 1.5),
    eyeDX: deg(13 + m.eyes.spacing * 1.7) * FACE_SCALE,
    eyeScale: (0.64 + m.eyes.size * 0.09) * 1.6,
    eyeRot: deg((m.eyes.rotation - 4) * 5),
    browY: ay(65 + m.brows.y * 1.5),
    browDX: deg(13 + m.brows.spacing * 1.7) * FACE_SCALE,
    browScale: (0.64 + m.brows.size * 0.09) * 1.55,
    browRot: deg((m.brows.rotation - 6) * 4),
    noseTheta: deg(101 + m.nose.y * 1.5),
    noseScale: (0.6 + m.nose.size * 0.1) * 0.9,
    mouthTheta,
    mouthY: ay(mouthTheta),
    mouthScale: (0.64 + m.mouth.size * 0.09) * 1.65,
    mustacheY: ay(114 + m.facialHair.y * 1.5),
    mustacheScale: (0.64 + m.facialHair.size * 0.09) * 1.5,
    glassesY: ay(83 + m.glasses.y * 1.8),
    glassesScale: (0.7 + m.glasses.size * 0.075) * 1.45,
    moleX: ax(-45 + m.mole.x * 5.6),
    moleY: ay(70 + m.mole.y * 2.6),
    moleScale: 0.5 + m.mole.size * 0.12,
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
  circle(c, ix, iy, r * 0.48);
  c.fillStyle = '#060606';
  c.fill();
  circle(c, ix - r * 0.36, iy - r * 0.4, r * 0.27);
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.fill();
  if (p.sparkle) {
    circle(c, ix + r * 0.38, iy + r * 0.36, r * 0.13);
    c.fill();
  }
  c.restore();
  almond(c, p);
  c.lineWidth = 2.6;
  c.strokeStyle = OUTLINE;
  c.stroke();
  if (p.lid !== 0) stroke(c, OUTLINE, p.lid ?? 5, (cc) => upperLid(cc, p));
}

/** Covers the eye above a line with a lid in skin colour (sleepy and angry eyes). */
function lidCover(c, o, p, x0, y0, x1, y1) {
  c.save();
  almond(c, p);
  c.clip();
  c.beginPath();
  c.moveTo(-60, -60);
  c.lineTo(60, -60);
  c.lineTo(60, y1 + (y1 - y0) * (60 - x1) / (x1 - x0));
  c.lineTo(-60, y0 - (y1 - y0) * (x0 + 60) / (x1 - x0));
  c.closePath();
  c.fillStyle = o.lid;
  c.fill();
  c.restore();
  stroke(c, OUTLINE, 5, (cc) => {
    cc.moveTo(x0, y0);
    cc.lineTo(x1, y1);
  });
}

function closedEye(c, w) {
  stroke(c, OUTLINE, 5, (cc) => {
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
  eye('Normaal', { w: 34, top: 20, bot: 17, iris: 14, irisY: 1 }),
  eye('Rond', { w: 29, top: 26, bot: 25, iris: 15, irisY: 1 }),
  eye('Smal', { w: 36, top: 11, bot: 9, iris: 12, irisY: 1 }),
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
  eye('Wimpers', { w: 34, top: 19, bot: 16, iris: 14, irisY: 2, lid: 6 }, (c) =>
    stroke(c, OUTLINE, 4, (cc) => {
      cc.moveTo(31, -6);
      cc.lineTo(43, -14);
      cc.moveTo(24, -15);
      cc.lineTo(33, -26);
      cc.moveTo(13, -20);
      cc.lineTo(18, -32);
    }),
  ),
  eye('Groot', { w: 32, top: 29, bot: 26, iris: 20, irisY: 3, sparkle: true }),
  {
    name: 'Stipjes',
    draw(c, o) {
      ellipse(c, 0, 2, 8, 12);
      c.fillStyle = mixHex(o.eye, '#000000', 0.5);
      c.fill();
      circle(c, -2.5, -3, 2.6);
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
  eye('Puppy', { w: 32, top: 23, bot: 20, outer: 8, inner: -3, iris: 15, irisY: 3 }),
  eye('Katachtig', { w: 36, top: 17, bot: 13, outer: -9, inner: 3, iris: 13, irisY: 2, lid: 6 }, (c) =>
    stroke(c, OUTLINE, 5, (cc) => {
      cc.moveTo(34, -9);
      cc.lineTo(47, -17);
    }),
  ),
  eye('Verbaasd', { w: 28, top: 27, bot: 27, iris: 8, lid: 3.5 }),
];

// ---------------------------------------------------------------- eyebrows
// Local space: brow centred on (0, 0), outer end towards +x.

export const BROWS = [
  {
    name: 'Dun',
    draw: (c, o) =>
      stroke(c, o.brow, 5.5, (cc) => {
        cc.moveTo(-36, 5);
        cc.quadraticCurveTo(0, -11, 37, 6);
      }),
  },
  {
    name: 'Normaal',
    draw: (c, o) =>
      fill(c, o.brow, (cc) => {
        cc.moveTo(-38, 7);
        cc.lineTo(-37, -4);
        cc.quadraticCurveTo(0, -15, 38, 2);
        cc.quadraticCurveTo(0, -4, -38, 7);
      }),
  },
  {
    name: 'Dik',
    draw: (c, o) =>
      fill(c, o.brow, (cc) => {
        cc.moveTo(-36, -4);
        cc.quadraticCurveTo(0, -15, 36, -4);
        cc.lineTo(36, 8);
        cc.quadraticCurveTo(0, -2, -36, 9);
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
      stroke(c, o.brow, 9, (cc) => {
        cc.moveTo(-35, 6);
        cc.lineTo(8, -10);
        cc.lineTo(36, 3);
      }),
  },
  {
    name: 'Kort',
    draw(c, o) {
      ellipse(c, -8, 0, 22, 9, -0.12);
      c.fillStyle = o.brow;
      c.fill();
    },
  },
  {
    name: 'Recht',
    draw: (c, o) =>
      stroke(c, o.brow, 6, (cc) => {
        cc.moveTo(-34, 0);
        cc.lineTo(34, 0);
      }),
  },
  {
    name: 'Bezorgd',
    draw: (c, o) =>
      fill(c, o.brow, (cc) => {
        cc.moveTo(-37, -11);
        cc.lineTo(-35, -1);
        cc.quadraticCurveTo(0, 3, 37, 10);
        cc.quadraticCurveTo(2, -6, -37, -11);
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
      stroke(c, o.brow, 7, (cc) => {
        cc.moveTo(-36, 4);
        cc.bezierCurveTo(-14, -14, 10, 10, 36, -5);
      }),
  },
  { name: 'Geen', none: true, draw() {} },
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

const line = (name, build) => ({ name, draw: (c, o) => stroke(c, o.mouthLine, 5.5, build) });

export const MOUTHS = [
  line('Glimlach', (c) => {
    c.moveTo(-30, -4);
    c.quadraticCurveTo(0, 14, 30, -4);
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
    c.moveTo(-24, 0);
    c.lineTo(24, 0);
  }),
  line('Sip', (c) => {
    c.moveTo(-27, 7);
    c.quadraticCurveTo(0, -11, 27, 7);
  }),
  {
    name: 'Oo',
    draw: (c, o) =>
      openMouth(c, o, (cc) => cc.ellipse(0, 2, 9, 11, 0, 0, Math.PI * 2), { tongue: false }),
  },
  {
    name: 'Grijns',
    draw(c, o) {
      const build = (cc) => {
        cc.moveTo(-36, -8);
        cc.lineTo(36, -8);
        cc.quadraticCurveTo(30, 22, 0, 22);
        cc.quadraticCurveTo(-30, 22, -36, -8);
      };
      fill(c, '#ffffff', build);
      stroke(c, 'rgba(60,20,20,0.45)', 2.5, (cc) => {
        cc.moveTo(-33, 3);
        cc.quadraticCurveTo(0, 9, 33, 3);
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
        cc.moveTo(-30, 0);
        cc.bezierCurveTo(-18, -13, -8, -13, 0, -7);
        cc.bezierCurveTo(8, -13, 18, -13, 30, 0);
        cc.quadraticCurveTo(0, 4, -30, 0);
      });
      fill(c, mixHex(o.lip, '#ffffff', 0.15), (cc) => {
        cc.moveTo(-30, 0);
        cc.quadraticCurveTo(0, 4, 30, 0);
        cc.bezierCurveTo(18, 15, -18, 15, -30, 0);
      });
      stroke(c, mixHex(o.lip, '#300808', 0.55), 2.5, (cc) => {
        cc.moveTo(-29, 0);
        cc.quadraticCurveTo(0, 4, 29, 0);
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
      stroke(c, o.mouthLine, 5.5, (cc) => {
        cc.moveTo(-30, -4);
        cc.quadraticCurveTo(0, 14, 30, -4);
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
// These use absolute positions (they wrap around the jaw), relative to the mouth.

function beardOutline(c, L, holeBelowMouth) {
  const m = L.mouthTheta;
  const pts = [
    [-82, 92], [-86, 130], [-90, 172], [90, 172], [86, 130], [82, 92],
    [72, 92], [64, 112], [44, m - 4], [26, m - 6], [14, m + holeBelowMouth], [-14, m + holeBelowMouth],
    [-26, m - 6], [-44, m - 4], [-64, 112], [-72, 92],
  ];
  c.beginPath();
  pts.forEach(([p, t], i) => (i ? c.lineTo(ax(p), ay(t)) : c.moveTo(ax(p), ay(t))));
  c.closePath();
}

function softFill(c, color) {
  c.save();
  c.fillStyle = color;
  c.shadowColor = color;
  c.shadowBlur = 8;
  c.fill();
  c.restore();
}

export const BEARDS = [
  { name: 'Geen', none: true, draw() {} },
  {
    name: 'Stoppels',
    draw(c, L, o) {
      beardOutline(c, L, -2);
      softFill(c, hexAlpha(o.facialHair, 0.22));
      ellipse(c, CX, ay(L.mouthTheta - 6), 44, 14);
      softFill(c, hexAlpha(o.facialHair, 0.2));
    },
  },
  {
    name: 'Sik',
    draw(c, L, o) {
      const m = L.mouthTheta;
      const pts = [[-16, m - 3], [-20, m + 14], [-8, m + 30], [8, m + 30], [20, m + 14], [16, m - 3], [9, m + 5], [-9, m + 5]];
      c.beginPath();
      pts.forEach(([p, t], i) => (i ? c.lineTo(ax(p), ay(t)) : c.moveTo(ax(p), ay(t))));
      c.closePath();
      softFill(c, o.facialHair);
    },
  },
  {
    name: 'Volle baard',
    draw(c, L, o) {
      beardOutline(c, L, 5);
      softFill(c, o.facialHair);
    },
  },
  {
    name: 'Kinbaard',
    draw(c, L, o) {
      const pts = [
        [-82, 92], [-86, 130], [-90, 172], [90, 172], [86, 130], [82, 92],
        [76, 92], [68, 118], [42, L.mouthTheta + 10], [0, L.mouthTheta + 17], [-42, L.mouthTheta + 10], [-68, 118], [-76, 92],
      ];
      c.beginPath();
      pts.forEach(([p, t], i) => (i ? c.lineTo(ax(p), ay(t)) : c.moveTo(ax(p), ay(t))));
      c.closePath();
      softFill(c, o.facialHair);
    },
  },
  {
    name: 'Matje',
    draw(c, L, o) {
      const m = L.mouthTheta;
      c.beginPath();
      c.moveTo(ax(-3.5), ay(m + 6));
      c.lineTo(ax(3.5), ay(m + 6));
      c.lineTo(ax(0), ay(m + 15));
      c.closePath();
      softFill(c, o.facialHair);
    },
  },
];

function hexAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

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

function cheeks(c, L, color, radius) {
  for (const side of [-1, 1]) {
    const x = CX + side * (L.eyeDX + deg(11) * FACE_SCALE);
    const y = L.eyeY + deg(14) * FACE_SCALE;
    const g = c.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,120,120,0)');
    c.fillStyle = g;
    c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

export const FEATURES = [
  { name: 'Geen', none: true, draw() {} },
  { name: 'Blosjes', draw: (c, L) => cheeks(c, L, 'rgba(255,92,92,0.42)', 46) },
  {
    name: 'Sproeten',
    draw(c, L, o) {
      const spots = [[6, 11], [9, 14], [12, 10], [15, 13], [8, 17], [13, 17], [18, 16], [20, 11]];
      c.fillStyle = mixHex(o.skin, '#5a2a10', 0.42);
      for (const side of [-1, 1]) {
        for (const [p, t] of spots) {
          circle(c, CX + side * (deg(p) * FACE_SCALE + L.eyeDX * 0.35), L.eyeY + deg(t) * FACE_SCALE, 3.6);
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
        const x = CX + side * L.eyeDX;
        stroke(c, col, 3, (cc) => {
          cc.moveTo(x - 24, L.eyeY + 26);
          cc.quadraticCurveTo(x, L.eyeY + 36, x + 24, L.eyeY + 26);
        });
      }
      stroke(c, col, 3, (cc) => {
        for (const t of [58, 64]) {
          cc.moveTo(ax(-14), ay(t + 1));
          cc.quadraticCurveTo(ax(0), ay(t - 1.5), ax(14), ay(t + 1));
        }
      });
    },
  },
  {
    name: 'Make-up',
    draw(c, L) {
      for (const side of [-1, 1]) {
        const x = CX + side * L.eyeDX;
        const y = L.eyeY - 16 * L.eyeScale;
        const g = c.createRadialGradient(x, y, 0, x, y, 40 * L.eyeScale);
        g.addColorStop(0, 'rgba(150,80,200,0.55)');
        g.addColorStop(1, 'rgba(150,80,200,0)');
        c.fillStyle = g;
        c.fillRect(x - 60, y - 60, 120, 120);
      }
      cheeks(c, L, 'rgba(255,110,140,0.36)', 42);
    },
  },
  {
    name: 'Lachrimpels',
    draw(c, L, o) {
      const col = mixHex(o.skin, '#000000', 0.28);
      for (const side of [-1, 1]) {
        const x = CX + side * (36 * L.mouthScale + 14);
        stroke(c, col, 3, (cc) => {
          cc.moveTo(x - side * 4, L.mouthY - 26);
          cc.quadraticCurveTo(x + side * 8, L.mouthY, x - side * 2, L.mouthY + 22);
        });
      }
    },
  },
  {
    name: 'Kuiltje',
    draw(c, L, o) {
      const y = ay(L.mouthTheta + 22);
      stroke(c, mixHex(o.skin, '#000000', 0.3), 3, (cc) => {
        cc.moveTo(CX - 8, y);
        cc.quadraticCurveTo(CX, y + 7, CX + 8, y);
      });
    },
  },
  {
    name: 'Wallen',
    draw(c, L) {
      for (const side of [-1, 1]) {
        ellipse(c, CX + side * L.eyeDX, L.eyeY + 22 * L.eyeScale, 28 * L.eyeScale, 9 * L.eyeScale);
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
    eye: EYE_COLORS[m.eyes.color].hex,
    brow: HAIR_COLORS[m.brows.color].hex,
    lip,
    mouthLine: mixHex(lip, '#2a0c06', 0.6),
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
 * Paints the face of Mii m onto ctx (in face-canvas coordinates).
 * only: draw one layer ('eyes', 'brows', ...), used for option icons.
 */
export function drawFace(c, m, { blink = false, only = null } = {}) {
  const L = faceLayout(m);
  const o = faceColors(m);
  const want = (k) => !only || only === k;

  if (want('feature')) FEATURES[m.face.feature].draw(c, L, o);
  if (want('beard')) BEARDS[m.facialHair.beard].draw(c, L, o);
  if (want('mouth')) placed(c, CX, L.mouthY, L.mouthScale, 0, false, () => MOUTHS[m.mouth.type].draw(c, o));
  if (want('mustache')) {
    placed(c, CX, L.mustacheY, L.mustacheScale, 0, false, () => MUSTACHES[m.facialHair.mustache].draw(c, o));
  }
  if (want('eyes')) {
    const type = EYES[m.eyes.type];
    for (const side of [-1, 1]) {
      placed(c, CX + side * L.eyeDX, L.eyeY, L.eyeScale, L.eyeRot, side < 0, () => (blink ? type.blink(c, o) : type.draw(c, o)));
    }
  }
  if (want('brows')) {
    const type = BROWS[m.brows.type];
    for (const side of [-1, 1]) {
      placed(c, CX + side * L.browDX, L.browY, L.browScale, L.browRot, side < 0, () => type.draw(c, o));
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
    eyes: [CX + L.eyeDX, L.eyeY, 92],
    brows: [CX + L.browDX, L.browY, 86],
    mouth: [CX, L.mouthY + 6, 96],
    mustache: [CX, L.mustacheY + 6, 96],
    beard: [CX, ay(L.mouthTheta + 4), 270],
    glasses: [CX, L.glassesY, 240],
    feature: [CX, ay(112), 240],
  };
  const [cx, cy, half] = crops[kind];
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, W);
  c.fillStyle = faceColors(m).skin;
  c.fillRect(0, 0, W, W);
  c.save();
  c.scale(W / (2 * half), W / (2 * half));
  c.translate(half - cx, half - cy);
  drawFace(c, m, { only: kind });
  c.restore();
}
