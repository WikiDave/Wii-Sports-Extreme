// The 72 hairstyles of the Wii Mii Channel, in Wii order.
//
// Most of a hairstyle is a shell hugging the scalp: for every angle phi around the
// head the hair covers theta from `from(phi)` to `to(phi)`, lifted off the head by
// `off(theta, phi, v)` (a fraction of the head size). A rim closes the gap between
// the shell edge and the scalp, so the hair reads as a solid mass. Long styles add
// a curtain hanging from the hairline; tails, buns, spikes and hats are extras.
//
// Each style is described by a few numbers (see `style`), angles in degrees:
//   f, s, b    hairline height at the front, the sides and the back (0 = crown)
//   locks      [period, depth] pointed locks over the forehead
//   sweep      fringe swept to one side (+ lower on the right of the picture)
//   part       [angle, depth, width] parting that opens the fringe
//   arch       raises the whole front hairline (receding)
//   peak       widow's peak
//   burns      pointed sideburns
//   jag        [period, depth] ragged edge all round
//   base, vol, fvol   thickness at the edge, extra on the crown, extra at the front
//   flare      ends that stick out (bob), curl: bumpy curls, box: square top
//   long       { drop, flare, ends: 'flat' | 'point' | 'curl' | 'out' } hair below the jaw
//   ears       false hides the ears, x: extras, hat: 'cap' | 'beanie'

import * as THREE from 'three';
import { parametric, taperedTube } from '../three/surface.js';
import { headPoint, headNormal } from './head.js';
import { MiiMaterial } from '../three/miiMaterial.js';

const D = THREE.MathUtils.degToRad;
const TAU = Math.PI * 2;
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const gauss = (x, w) => Math.exp(-((x / w) ** 2));
/** Triangle wave between -1 and 1. */
const tri = (x) => 1 - 4 * Math.abs(x - Math.floor(x) - 0.5);
/** 1 at the front of the head, 0 from the sides backwards. */
const front = (phi) => Math.max(0, Math.cos(phi)) ** 2;
/** Angle from the front, 0..PI. */
const fromFront = (phi) => Math.acos(Math.cos(phi));
/** Signed angle in -PI..PI. */
const wrap = (phi) => Math.atan2(Math.sin(phi), Math.cos(phi));
/** Thickness that is largest on the crown and flat there (no peak). */
const dome = (v) => 1 - v * v;

/** Hairline height (theta, radians) at phi, blending front / side / back values in degrees. */
function zone(phi, f, side, back, pf = 1.4, pb = 1.2) {
  const c = Math.cos(phi);
  return D(c >= 0 ? side + (f - side) * c ** pf : side + (back - side) * (-c) ** pb);
}

// ---------------------------------------------------------------- geometry

function shell(shape, { from, to, off }) {
  // Styles that start at the crown share one thickness there; otherwise the
  // shell would pinch into a point where all angles meet.
  let pole = null;
  if (from(0) === 0) {
    pole = 0;
    for (let k = 0; k < 8; k++) pole += off(0, (k / 8) * TAU - Math.PI, 0) / 8;
  }
  return parametric(
    (u, v, out) => {
      const phi = -Math.PI + TAU * u;
      const a = from(phi);
      const b = to(phi);
      const theta = a + (b - a) * v;
      const cover = smooth(0, D(12), b - a);
      // Where there is no hair the shell sinks just below the scalp.
      let o = off(theta, phi, v) * cover - 0.02 * (1 - cover);
      if (pole !== null) o = pole + (o - pole) * smooth(0, 0.35, v);
      return headPoint(shape, theta, phi, 1 + o, out);
    },
    144,
    32,
  );
}

/** Closes the hair along one edge, from the shell down to the scalp. */
function rim(shape, { from, to, off }, upper) {
  const edge = upper ? from : to;
  return parametric(
    (u, v, out) => {
      const phi = -Math.PI + TAU * u;
      const t = edge(phi);
      const cover = smooth(0, D(12), to(phi) - from(phi));
      const outer = 1 + off(t, phi, upper ? 0 : 1) * cover - 0.02 * (1 - cover);
      return headPoint(shape, t, phi, outer * (1 - v) + 0.985 * v, out);
    },
    144,
    2,
    (u, v, p, out) => {
      const phi = -Math.PI + TAU * u;
      const t = edge(phi);
      headPoint(shape, t + (upper ? -0.05 : 0.05), phi, 1, out);
      return out.sub(headPoint(shape, t, phi, 1, tmp2));
    },
  );
}

/** Long hair hanging down from the back and sides of the hairline. */
function curtain(shape, { to, off }, long) {
  const phiMin = D(long.from ?? 58);
  const flare = long.flare ?? 0.15;
  const ends = long.ends ?? 'flat';
  return parametric(
    (u, v, out) => {
      const phi = phiMin + u * (TAU - 2 * phiMin);
      const theta = to(phi);
      headPoint(shape, theta, phi, 1 + off(theta, phi, 1), tmp);
      let spread = flare * v;
      if (ends === 'out') spread = flare * v * v * 2.2;
      if (ends === 'curl') spread = flare * v - 0.12 * v ** 4 + 0.05 * Math.sin(phi * 9) * v;
      const r = Math.hypot(tmp.x, tmp.z) * (1 + spread);
      const a = Math.atan2(tmp.x, tmp.z);
      let len = long.drop * (1 - 0.25 * front(phi));
      if (ends === 'point') len *= 1 + 0.12 * tri(phi / D(12)) * v;
      if (ends === 'curl') len *= 1 + 0.06 * Math.sin(phi * 9);
      return out.set(Math.sin(a) * r, tmp.y - len * v, Math.cos(a) * r);
    },
    96,
    12,
    (u, v, p, out) => out.set(p.x, 0, p.z),
  );
}

/** Smooth, slightly glossy hair like the Wii models (no strand texture). */
export function hairMaterial(color) {
  return new MiiMaterial({ color, side: THREE.DoubleSide });
}

const clipMaterial = new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: 0.35, metalness: 0.2 });

// ---------------------------------------------------------------- extras

function spike(shape, mat, theta, phi, height, radius, tilt = 0.35) {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 12, 1), mat);
  const n = headNormal(shape, theta, phi);
  // Lean the spikes backwards a little, like gel-styled hair (negative: forwards).
  n.add(new THREE.Vector3(0, 0, -tilt)).normalize();
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  cone.position.copy(headPoint(shape, theta, phi, 1.04)).addScaledVector(n, height * 0.4);
  return cone;
}

function tail(mat, points, thickness) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geo = taperedTube(curve, (t) => thickness * Math.sin(Math.PI * (0.16 + 0.84 * t)) ** 0.55, 28, 18);
  return new THREE.Mesh(geo, mat);
}

function ball(mat, position, radius, squash = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 20), mat);
  m.position.copy(position);
  m.scale.y = squash;
  return m;
}

/** Spikes on a ring of the head: [theta, count, phase, height, radius, tilt, phi range]. */
function ring(shape, mat, theta, count, phase, height, radius, tilt, phiMin = -180, phiMax = 180) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const phi = D(phiMin + ((i + phase) / count) * (phiMax - phiMin));
    out.push(spike(shape, mat, D(theta), phi, height, radius, tilt));
  }
  return out;
}

const EXTRAS = {
  spikesUp: (sh, m) => [...ring(sh, m, 6, 1, 0, 0.2, 0.07, 0.3), ...ring(sh, m, 24, 6, 0.3, 0.2, 0.07, 0.4), ...ring(sh, m, 42, 8, 0.1, 0.16, 0.065, 0.4, -120, 120)],
  spikesTop: (sh, m) => [...ring(sh, m, 30, 6, 0.5, 0.15, 0.065, -0.1, -80, 80), ...ring(sh, m, 12, 3, 0.5, 0.15, 0.06, 0.2, -60, 60)],
  spikesWild: (sh, m) => [
    ...ring(sh, m, 40, 9, 0.5, 0.2, 0.075, 0.25, 40, 320),
    ...ring(sh, m, 66, 6, 0.5, 0.18, 0.07, 0.1, 50, 310),
    ...ring(sh, m, 14, 5, 0.5, 0.18, 0.065, 0.5),
  ],
  spikesFront: (sh, m) => [spike(sh, m, D(34), D(-30), 0.26, 0.09, -0.5), spike(sh, m, D(28), D(-2), 0.24, 0.085, -0.45), spike(sh, m, D(26), D(28), 0.2, 0.08, -0.3), spike(sh, m, D(46), D(-60), 0.2, 0.075, -0.2)],
  flatSpikes: (sh, m) => [...ring(sh, m, 30, 14, 0.5, 0.11, 0.05, 0.05), ...ring(sh, m, 12, 6, 0.2, 0.1, 0.05, 0.05)],
  tuft: (sh, m) => [spike(sh, m, D(26), D(40), 0.15, 0.055, 0.6)],
  tuftCenter: (sh, m) => [spike(sh, m, D(40), 0, 0.14, 0.05, 0.9)],
  sideTail: (sh, m) => [tail(m, [[0.28, 0.16, -0.12], [0.48, 0.24, -0.14], [0.6, 0.02, -0.14], [0.58, -0.3, -0.1]], 0.095)],
  ponytail: (sh, m) => [tail(m, [[0, 0.22, -0.34], [0, 0.3, -0.6], [0, 0.06, -0.8], [0, -0.28, -0.76]], 0.1)],
  lowTail: (sh, m) => [tail(m, [[0.08, -0.2, -0.34], [0.24, -0.4, -0.3], [0.34, -0.62, -0.1], [0.3, -0.82, 0.08]], 0.085)],
  bunTop: (sh, m) => [ball(m, headPoint(sh, D(8), Math.PI, 1.22), 0.15, 0.9)],
  bunBack: (sh, m) => [ball(m, headPoint(sh, D(70), Math.PI, 1.18), 0.15, 0.9)],
  knot: (sh, m) => [ball(m, headPoint(sh, D(2), 0, 1.2), 0.085, 0.85)],
  sideBuns: (sh, m) => [-1, 1].map((s) => ball(m, headPoint(sh, D(78), s * D(102), 1.14), 0.14)),
  braids: (sh, m) =>
    [-1, 1].flatMap((s) =>
      Array.from({ length: 9 }, (_, i) => {
        const b = ball(m, new THREE.Vector3(s * (0.34 + (i % 2) * 0.012), -0.14 - i * 0.085, -0.06 + i * 0.012), 0.062 - i * 0.002, 1.25);
        return b;
      }),
    ),
  clip: (sh) => {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.04), clipMaterial);
    clip.position.copy(headPoint(sh, D(62), D(38), 1.16));
    clip.rotation.set(0.3, 0.5, -0.5);
    return [clip];
  },
};

function hat(kind, shape, hatMat, hairMat) {
  const parts = [];
  if (kind === 'cap') {
    const cover = { from: () => 0, to: (p) => zone(p, 66, 90, 112), off: (t, p, v) => 0.1 + 0.05 * dome(v) };
    parts.push(new THREE.Mesh(shell(shape, cover), hatMat), new THREE.Mesh(rim(shape, cover, false), hatMat));
    const brim = parametric(
      (u, v, out) => {
        const phi = D(-72 + 144 * u);
        headPoint(shape, cover.to(phi), phi, 1.1, tmp);
        const len = 0.26 * Math.cos(phi) ** 0.7;
        const d = new THREE.Vector3(tmp.x, 0, tmp.z).normalize();
        return out.copy(tmp).addScaledVector(d, len * v).add(new THREE.Vector3(0, -0.035 * v * v, 0));
      },
      48,
      6,
      (u, v, p, out) => out.set(0, 1, 0),
    );
    parts.push(new THREE.Mesh(brim, hatMat), ball(hatMat, headPoint(shape, 0, 0, 1.16), 0.035));
    const hairCover = { from: () => 0, to: (p) => zone(p, 80, 102, 126), off: () => 0.05 };
    parts.push(new THREE.Mesh(shell(shape, hairCover), hairMat), new THREE.Mesh(rim(shape, hairCover, false), hairMat));
  } else {
    const cover = {
      from: () => 0,
      to: (p) => zone(p, 62, 96, 116),
      off: (t, p, v) => 0.11 + 0.06 * dome(v) + 0.012 * Math.abs(Math.sin(p * 22)) * (1 - smooth(0.7, 0.85, v)) + 0.04 * smooth(0.78, 0.9, v),
    };
    parts.push(new THREE.Mesh(shell(shape, cover), hatMat), new THREE.Mesh(rim(shape, cover, false), hatMat));
    const hairCover = { from: () => 0, to: (p) => zone(p, 70, 104, 128), off: () => 0.05 };
    parts.push(new THREE.Mesh(shell(shape, hairCover), hairMat), new THREE.Mesh(rim(shape, hairCover, false), hairMat));
  }
  return parts;
}

// ---------------------------------------------------------------- styles

// The styles' fringe heights were set for an earlier, shorter head; the Wii fringe
// ends well above the eyebrows, so all of them move up by this much.
const FRINGE_LIFT = 10;

function style(o) {
  const f = (o.f ?? 64) - FRINGE_LIFT;
  const s = o.s ?? 97;
  const b = o.b ?? 128;
  const pf = o.pf ?? 1.4;
  const to = (p) => {
    let t = zone(p, f, s, b, pf);
    if (o.locks) t += Math.max(0, Math.cos(p)) ** 0.4 * D(o.locks[1]) * tri(p / D(o.locks[0]) + (o.locks[2] ?? 0));
    if (o.sweep) t += front(p) * D(Math.abs(o.sweep)) * smooth(-0.7, 0.6, o.sweep > 0 ? p : -p);
    if (o.part) t -= front(p) * D(o.part[1]) * gauss(wrap(p - D(o.part[0])), D(o.part[2]));
    if (o.arch) t -= D(o.arch) * front(p);
    if (o.peak) t += D(o.peak) * gauss(wrap(p), 0.1);
    if (o.burns) t += D(o.burns) * gauss(fromFront(p) - D(76), D(8));
    if (o.jag) t += D(o.jag[1]) * tri(p / D(o.jag[0]));
    return t;
  };
  const off = (t, p, v) => {
    // Thickness follows the height on the head (not the position between crown and
    // edge), so a ragged fringe does not make the crown ripple.
    const crownT = Math.max(0, 1 - (t / D(125)) ** 2);
    let k = (o.base ?? 0.07) + (o.vol ?? 0.13) * crownT + (o.fvol ?? 0.03) * front(p) * crownT + (o.svol ?? 0.035) * (1 - front(p)) * (1 - v * v * 0.5);
    if (o.flare) k += o.flare * v ** 3 * (1 - front(p));
    if (o.curl) k += o.curl * Math.sin(11 * p) * Math.sin(13 * t) + o.curl * 0.5;
    if (o.box) k += o.box * gauss(t - D(34), D(14));
    if (o.part) k -= 0.035 * gauss(wrap(p - D(o.part[0])), 0.07) * crownT;
    return k;
  };
  return { ...o, cover: { from: o.from ?? (() => 0), to: o.to ?? to, off: o.off ?? off } };
}

const S = (o) => style(o);
const SHORT = { ears: true };
const LONG = { ears: false };

export const HAIR_STYLES = [
  // Row 1: short styles
  S({ ...SHORT, locks: [19, 7], burns: 12 }),
  S({ ...SHORT, f: 68, s: 100, locks: [13, 5], burns: 14 }),
  S({ ...SHORT, f: 58, sweep: 14, locks: [22, 3], burns: 8, vol: 0.1 }),
  S({ ...SHORT, f: 60, s: 112, b: 130, part: [0, 18, 16], fvol: 0.05, vol: 0.15, ears: false }),
  S({ ...SHORT, f: 56, s: 94, b: 126, vol: 0.11, x: ['tuft'] }),
  S({ ...SHORT, f: 62, s: 98, sweep: -18, vol: 0.16, fvol: 0.06 }),
  S({ ...SHORT, f: 48, s: 92, b: 124, vol: 0.05, base: 0.05, arch: 6 }),
  S({ ...SHORT, f: 56, s: 96, b: 126, vol: 0.06, x: ['flatSpikes'] }),
  S({ ...SHORT, f: 50, s: 94, b: 126, peak: 14, vol: 0.07 }),
  S({ ...SHORT, f: 62, s: 98, locks: [10, 4], jag: [11, 3], vol: 0.14, x: ['spikesTop'] }),
  S({ ...SHORT, f: 62, s: 98, locks: [16, 5], vol: 0.1, x: ['spikesTop'] }),
  S({ ...SHORT, f: 60, s: 100, locks: [18, 6], vol: 0.08, x: ['spikesWild'] }),
  // Row 2
  S({ ...LONG, f: 74, s: 122, b: 132, locks: [12, 6], burns: 20, jag: [14, 4] }),
  S({ ...LONG, f: 72, s: 118, b: 132, locks: [14, 6] }),
  S({ ...SHORT, f: 72, s: 100, b: 126, locks: [13, 5], vol: 0.2, base: 0.12, flare: 0.06 }),
  S({ ...SHORT, f: 60, s: 98, sweep: -20, part: [30, 12, 10] }),
  S({ ...SHORT, f: 70, s: 100, part: [0, 16, 7] }),
  S({ ...SHORT, f: 70, s: 100, part: [0, 10, 4], x: ['tuftCenter'] }),
  S({ ...LONG, f: 58, s: 150, b: 150, pf: 2.4, part: [0, 10, 22], long: { drop: 0.16, flare: 0.1 } }),
  S({ ...LONG, f: 70, s: 128, b: 132, flare: 0.16, locks: [12, 2] }),
  S({ ...SHORT, f: 64, s: 98, sweep: -12, vol: 0.12 }),
  S({ ...LONG, f: 70, s: 120, b: 134, jag: [9, 5], locks: [11, 5], vol: 0.16 }),
  S({ ...LONG, f: 70, s: 124, b: 132, part: [0, 14, 8], burns: 16 }),
  S({ ...LONG, f: 68, s: 122, b: 134, sweep: -12, jag: [10, 4], flare: 0.06 }),
  // Row 3
  S({ ...SHORT, f: 58, s: 96, b: 126, vol: 0.08, x: ['spikesFront'] }),
  S({ ...SHORT, f: 42, s: 94, b: 124, vol: 0.05, x: ['spikesUp'] }),
  S({ ...LONG, f: 58, s: 132, b: 150, pf: 2, part: [0, 12, 14], curl: 0.04, long: { drop: 0.34, ends: 'curl', flare: 0.2 } }),
  S({ ...SHORT, f: 40, s: 90, b: 122, vol: 0.04, base: 0.05 }),
  S({ ...SHORT, f: 48, s: 92, b: 124, arch: 4, vol: 0.06 }),
  S({ ...LONG, f: 66, s: 100, b: 128, vol: 0.26, base: 0.16 }),
  S({ ...SHORT, f: 62, s: 98, b: 126, vol: 0.05, box: 0.14, pf: 0.8 }),
  S({
    ...SHORT,
    from: (p) => zone(p, 72, 76, 64),
    to: (p) => {
      const a = zone(p, 72, 76, 64);
      return a + (zone(p, 72, 104, 128) - a) * smooth(1.05, 1.6, fromFront(p));
    },
    off: () => 0.06,
  }),
  S({ ...SHORT, f: 40, s: 92, b: 124, arch: 10, vol: 0.05 }),
  { ears: true, cover: null },
  { ears: true, cover: null, hat: 'cap' },
  { ears: true, cover: null, hat: 'beanie' },
  // Row 4: longer styles
  S({ ...LONG, f: 62, s: 130, b: 134, sweep: -16, flare: 0.05, vol: 0.16 }),
  S({ ...LONG, f: 70, s: 128, b: 134, locks: [10, 6], burns: 10, jag: [12, 4] }),
  S({ ...LONG, f: 64, s: 128, b: 134, sweep: 12, part: [-20, 10, 10] }),
  S({ ...SHORT, f: 68, s: 98, b: 126, pf: 0.8, x: ['sideTail'] }),
  S({ ...LONG, f: 74, s: 150, b: 150, pf: 0.6, long: { drop: 0.42, flare: 0.08 } }),
  S({ ...LONG, f: 74, s: 132, b: 136, pf: 0.6 }),
  S({ ...SHORT, f: 58, s: 94, b: 124, sweep: -12, vol: 0.06, x: ['spikesUp'] }),
  S({ ...LONG, f: 62, s: 140, b: 150, pf: 2, sweep: -14, long: { drop: 0.3, flare: 0.3, ends: 'out' } }),
  S({ ...LONG, f: 64, s: 132, b: 140, sweep: -14 }),
  S({ ...LONG, f: 68, s: 128, b: 136, part: [0, 12, 8], jag: [10, 4], burns: 10 }),
  S({ ...LONG, f: 62, s: 138, b: 150, pf: 2, part: [0, 12, 14], long: { drop: 0.26, flare: 0.3, ends: 'out' } }),
  S({ ...LONG, f: 62, s: 132, b: 146, part: [0, 10, 12], curl: 0.05 }),
  // Row 5
  S({ ...LONG, f: 60, s: 148, b: 150, pf: 2.2, part: [0, 12, 14], long: { drop: 0.4, flare: 0.3 } }),
  S({ ...LONG, f: 62, s: 126, b: 134, part: [0, 12, 14], flare: 0.2 }),
  S({ ...LONG, f: 60, s: 146, b: 150, pf: 2.2, part: [0, 12, 12], long: { drop: 0.38, ends: 'point' } }),
  S({ ...LONG, f: 60, s: 156, b: 156, pf: 2.6, part: [0, 10, 22], long: { drop: 0.25, flare: 0.45 } }),
  S({ ...LONG, f: 56, s: 150, b: 150, pf: 2.4, arch: 6, long: { drop: 0.14 } }),
  S({ ...LONG, f: 74, s: 140, b: 140, pf: 0.6 }),
  S({ ...LONG, f: 70, s: 126, b: 136, locks: [11, 6], flare: 0.1, jag: [11, 4] }),
  S({ ...LONG, f: 62, s: 126, b: 136, part: [0, 10, 10], curl: 0.04, locks: [18, 4] }),
  S({ ...LONG, f: 64, s: 118, b: 132, curl: 0.05, part: [0, 8, 10] }),
  S({ ...LONG, f: 78, s: 128, b: 134, pf: 0.8, vol: 0.18 }),
  S({ ...LONG, f: 76, s: 122, b: 130, pf: 0.7, vol: 0.16 }),
  S({ ...LONG, f: 60, s: 146, b: 150, pf: 2, sweep: -34, long: { drop: 0.36 } }),
  // Row 6
  S({ ...LONG, f: 66, s: 126, b: 134, sweep: -14, x: ['clip'] }),
  S({ ...LONG, f: 64, s: 124, b: 132, sweep: 10, part: [-15, 10, 10] }),
  S({ ...SHORT, f: 64, s: 98, b: 126, locks: [16, 3], x: ['sideBuns'] }),
  S({ ...SHORT, f: 60, s: 110, b: 128, sweep: -12, x: ['lowTail'] }),
  S({ ...SHORT, f: 48, s: 96, b: 122, vol: 0.07, x: ['bunTop'] }),
  S({ ...SHORT, f: 58, s: 100, b: 126, sweep: -10, x: ['bunBack'] }),
  S({ ...SHORT, f: 60, s: 104, b: 128, part: [0, 12, 10], x: ['braids'] }),
  S({ ...LONG, f: 62, s: 124, b: 134, part: [0, 12, 12], curl: 0.05, flare: 0.06 }),
  S({ ...LONG, f: 62, s: 122, b: 134, sweep: -14, curl: 0.05 }),
  S({ ...LONG, f: 64, s: 126, b: 134, part: [0, 10, 10], flare: 0.12 }),
  S({ ...LONG, f: 60, s: 140, b: 150, pf: 2, part: [0, 12, 14], curl: 0.04, long: { drop: 0.34, ends: 'curl' } }),
  S({ ...LONG, f: 58, s: 140, b: 150, pf: 2, part: [0, 10, 10], curl: 0.04, long: { drop: 0.3 }, x: ['knot'] }),
].map((st, i) => ({ name: `Kapsel ${i + 1}`, hideEars: st.ears === false, ...st }));

/** Builds the hair for a style as a group in head space. mats: { hair, hat }. */
export function buildHair(styleIndex, shape, mats) {
  const st = HAIR_STYLES[styleIndex];
  const group = new THREE.Group();
  if (st.cover) {
    group.add(new THREE.Mesh(shell(shape, st.cover), mats.hair));
    group.add(new THREE.Mesh(rim(shape, st.cover, false), mats.hair));
    if (st.from) group.add(new THREE.Mesh(rim(shape, st.cover, true), mats.hair));
    if (st.long) group.add(new THREE.Mesh(curtain(shape, st.cover, st.long), mats.hair));
  }
  if (st.hat) for (const mesh of hat(st.hat, shape, mats.hat, mats.hair)) group.add(mesh);
  for (const name of st.x ?? []) for (const mesh of EXTRAS[name](shape, mats.hair)) group.add(mesh);
  return group;
}
