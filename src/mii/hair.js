// Hairstyles. Most are a shell hugging the scalp: for every angle phi around the
// head the hair covers theta from `from(phi)` to `to(phi)`, lifted off the head by
// `off(theta, phi, v)` (a fraction of the head radius). A rim closes the gap
// between the shell edge and the scalp, so the hair reads as a solid mass.

import * as THREE from 'three';
import { parametric, taperedTube } from '../three/surface.js';
import { headPoint, headNormal } from './head.js';

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
const jag = (phi, period, amp) => D(amp) * tri(phi / D(period));

/** Hairline height (theta, radians) at phi, blending front / side / back values in degrees. */
function zone(phi, f, side, back, pf = 1.4, pb = 1.2) {
  const c = Math.cos(phi);
  return D(c >= 0 ? side + (f - side) * c ** pf : side + (back - side) * (-c) ** pb);
}

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
    128,
    32,
  );
}

/** Closes the hair along one edge, from the shell down to the scalp. */
function rim(shape, { from, to, off }, upper) {
  const edge = upper ? from : to;
  const theta = (phi) => edge(phi);
  return parametric(
    (u, v, out) => {
      const phi = -Math.PI + TAU * u;
      const t = theta(phi);
      const cover = smooth(0, D(12), to(phi) - from(phi));
      const outer = 1 + off(t, phi, upper ? 0 : 1) * cover - 0.02 * (1 - cover);
      const k = outer * (1 - v) + 0.985 * v;
      return headPoint(shape, t, phi, k, out);
    },
    128,
    2,
    (u, v, p, out) => {
      const phi = -Math.PI + TAU * u;
      const t = theta(phi);
      headPoint(shape, t + (upper ? -0.05 : 0.05), phi, 1, out);
      return out.sub(headPoint(shape, t, phi, 1, tmp2));
    },
  );
}

/** Long hair hanging down from the back and sides of the hairline. */
function curtain(shape, { to, off }, { phiMin, drop, flare = 0.15 }) {
  return parametric(
    (u, v, out) => {
      const phi = phiMin + u * (TAU - 2 * phiMin);
      const theta = to(phi);
      headPoint(shape, theta, phi, 1 + off(theta, phi, 1), tmp);
      const r = Math.hypot(tmp.x, tmp.z) * (1 + flare * v);
      const a = Math.atan2(tmp.x, tmp.z);
      const len = drop * (1 - 0.25 * front(phi) - 0.06 * tri(phi / D(14)) * v);
      return out.set(Math.sin(a) * r, tmp.y - len * v, Math.cos(a) * r);
    },
    72,
    10,
    (u, v, p, out) => out.set(p.x, 0, p.z),
  );
}

function strandTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * 256;
    const shade = Math.round(205 + rnd() * 40);
    g.strokeStyle = `rgba(${shade},${shade},${shade},0.55)`;
    g.lineWidth = 1 + rnd() * 2;
    g.beginPath();
    g.moveTo(x, -2);
    g.bezierCurveTo(x + rnd() * 6 - 3, 90, x + rnd() * 6 - 3, 170, x + rnd() * 4 - 2, 258);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 1);
  return tex;
}

let strands = null;
export function hairMaterial(color) {
  strands ??= strandTexture();
  return new THREE.MeshStandardMaterial({ color, map: strands, roughness: 0.62, side: THREE.DoubleSide });
}

// ---------------------------------------------------------------- extras

function spike(shape, mat, theta, phi, height, radius, tilt = 0.35) {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 12, 1), mat);
  const n = headNormal(shape, theta, phi);
  // Lean the spikes backwards a little, like gel-styled hair.
  n.add(new THREE.Vector3(0, 0, -tilt)).normalize();
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  cone.position.copy(headPoint(shape, theta, phi, 1.02)).addScaledVector(n, height * 0.42);
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

// ---------------------------------------------------------------- styles

const crown = () => 0;
/** Extra thickness that is largest on the crown and flat there (no peak). */
const dome = (v) => 1 - v * v;
/** Big pointed locks over the forehead, like the default Wii hairstyle. */
const locks = (p, period, amp, shift = 0) => Math.max(0, Math.cos(p)) ** 0.4 * D(amp) * tri(p / D(period) + shift);
/** A pointed sideburn in front of each ear. */
const sideburn = (p, amp = 12) => D(amp) * gauss(fromFront(p) - D(76), D(8));

export const HAIR_STYLES = [
  {
    name: 'Kort',
    cover: {
      to: (p) => zone(p, 62, 97, 128) + locks(p, 19, 7) + sideburn(p),
      off: (t, p, v) => 0.07 + 0.14 * dome(v) + 0.04 * front(p) * dome(v),
    },
  },
  {
    name: 'Zijscheiding',
    cover: {
      to: (p) => zone(p, 58, 97, 130) + front(p) * D(13) * smooth(-0.5, 0.7, p) + locks(p, 14, 2.5) + sideburn(p, 8),
      off: (t, p, v) => 0.07 + 0.13 * dome(v) + 0.04 * smooth(-0.3, 0.5, p) * front(p) - 0.05 * gauss(p + 0.45, 0.1) * dome(v),
    },
  },
  {
    name: 'Stekels',
    cover: { to: (p) => zone(p, 58, 94, 124) + locks(p, 16, 4) + sideburn(p, 8), off: (t, p, v) => 0.06 + 0.05 * dome(v) },
    extras(shape, mat) {
      const out = [];
      const rings = [[6, 1, 0], [24, 6, 0.3], [42, 9, 0.1], [58, 7, 0.5]];
      for (const [theta, count, shift] of rings) {
        for (let i = 0; i < count; i++) {
          const phi = ((i + shift) / count) * TAU - Math.PI;
          if (theta > 50 && Math.cos(phi) < -0.2) continue;
          out.push(spike(shape, mat, D(theta), phi, 0.22 - theta * 0.0012, 0.07));
        }
      }
      return out;
    },
  },
  { name: 'Kaal', cover: null },
  {
    name: 'Kalend',
    cover: {
      from: (p) => zone(p, 72, 76, 64),
      to: (p) => {
        const a = zone(p, 72, 76, 64);
        return a + (zone(p, 72, 104, 128) - a) * smooth(1.05, 1.6, fromFront(p));
      },
      off: () => 0.06,
    },
  },
  {
    name: 'Pottenkapsel',
    cover: { to: (p) => zone(p, 70, 100, 124, 0.7), off: (t, p, v) => 0.1 + 0.08 * dome(v) - 0.03 * v ** 4 },
  },
  {
    name: 'Lang',
    hideEars: true,
    cover: {
      to: (p) => zone(p, 62, 138, 150, 0.8) + front(p) * D(16) * smooth(-0.7, 0.5, p),
      off: (t, p, v) => 0.08 + 0.1 * dome(v) + 0.03 * front(p) * smooth(-0.4, 0.4, p) - 0.04 * gauss(p + 0.5, 0.08) * dome(v),
    },
    curtain: { phiMin: D(58), drop: 0.36, flare: 0.2 },
  },
  {
    name: 'Paardenstaart',
    cover: {
      to: (p) => zone(p, 54, 100, 122, 1.8) + front(p) * D(8) * smooth(-0.6, 0.6, p),
      off: (t, p, v) => 0.05 + 0.08 * dome(v),
    },
    extras: (shape, mat) => [tail(mat, [[0, 0.22, -0.34], [0, 0.3, -0.6], [0, 0.06, -0.8], [0, -0.28, -0.76]], 0.1)],
  },
  {
    name: 'Staartjes',
    cover: {
      to: (p) => zone(p, 62, 98, 126) - front(p) * D(10) * gauss(p, 0.2),
      off: (t, p, v) => 0.06 + 0.07 * dome(v) - 0.03 * gauss(p, 0.05) * dome(v),
    },
    extras: (shape, mat) =>
      [-1, 1].map((s) => tail(mat, [[s * 0.32, 0.12, -0.12], [s * 0.52, 0.1, -0.14], [s * 0.62, -0.16, -0.12], [s * 0.58, -0.48, -0.06]], 0.085)),
  },
  {
    name: 'Knot',
    cover: { to: (p) => zone(p, 52, 94, 122) + front(p) * D(6) * smooth(-0.6, 0.6, p), off: (t, p, v) => 0.05 + 0.07 * dome(v) },
    extras: (shape, mat) => [ball(mat, headPoint(shape, D(28), Math.PI, 1.22), 0.15, 0.88)],
  },
  {
    name: 'Bob',
    hideEars: true,
    cover: {
      to: (p) => zone(p, 70, 128, 134, 0.7) + locks(p, 10, 2.5),
      off: (t, p, v) => 0.07 + 0.09 * dome(v) + 0.14 * v ** 3 * (1 - front(p)),
    },
  },
  {
    name: 'Afro',
    hideEars: true,
    cover: {
      to: (p) => zone(p, 54, 104, 136),
      off: (t, p, v) => (0.36 + 0.035 * Math.sin(7 * p) * Math.sin(9 * t)) * (1 - 0.55 * v * v),
    },
  },
  {
    name: 'Hanenkam',
    cover: null,
    extras(shape, mat) {
      const out = [];
      for (let a = -40; a <= 118; a += 14) {
        const theta = D(Math.abs(a));
        const phi = a < 0 ? 0 : Math.PI;
        const h = 0.26 - Math.abs(a - 30) * 0.0011;
        out.push(spike(shape, mat, theta, phi, h, 0.075, a < 0 ? 0.2 : 0.5));
      }
      return out;
    },
  },
  {
    name: 'Krullen',
    hideEars: true,
    cover: {
      to: (p) => zone(p, 62, 112, 140, 0.9),
      off: (t, p, v) => (0.14 + 0.06 * dome(v) + 0.035 * Math.sin(11 * p) * Math.sin(13 * t) + 0.02 * Math.sin(5 * p + 3 * t)) * (1 - 0.3 * v * v),
    },
  },
  {
    name: 'Halflang',
    hideEars: true,
    cover: {
      to: (p) => zone(p, 64, 118, 140) + jag(p, 9, 4.5),
      off: (t, p, v) => 0.08 + 0.1 * dome(v) + 0.05 * v * v,
    },
  },
  {
    name: 'Kuif',
    cover: {
      to: (p) => zone(p, 50, 94, 124) + sideburn(p, 8),
      off: (t, p, v) => 0.06 + 0.07 * dome(v) + 0.26 * gauss(t - D(28), D(20)) * Math.max(0, Math.cos(p)) ** 1.5,
    },
  },
  {
    name: 'Middenscheiding',
    hideEars: true,
    cover: {
      to: (p) => zone(p, 66, 138, 150, 0.8) - front(p) * D(16) * gauss(p, 0.2),
      off: (t, p, v) => 0.08 + 0.09 * dome(v) - 0.04 * gauss(p, 0.06) * dome(v),
    },
    curtain: { phiMin: D(58), drop: 0.36, flare: 0.2 },
  },
];

/** Builds the hair for a style as a group in head space. */
export function buildHair(styleIndex, shape, material) {
  const style = HAIR_STYLES[styleIndex];
  const group = new THREE.Group();
  if (style.cover) {
    const cover = { from: crown, ...style.cover };
    group.add(new THREE.Mesh(shell(shape, cover), material));
    group.add(new THREE.Mesh(rim(shape, cover, false), material));
    if (style.cover.from) group.add(new THREE.Mesh(rim(shape, cover, true), material));
    if (style.curtain) group.add(new THREE.Mesh(curtain(shape, cover, style.curtain), material));
  }
  if (style.extras) for (const mesh of style.extras(shape, material)) group.add(mesh);
  return group;
}
