// The head: the eight Wii face shapes, measured from rotated renders of bald Miis
// (head-data.js). Each shape is a radial map around HEAD_CENTER; the front carries the
// face texture and a small nose bulge. Angles: theta runs down from the crown (0) to
// the chin (PI); phi runs around the head, phi = 0 facing +z.

import * as THREE from 'three';
import { parametric } from '../three/surface.js';
import { NOSES } from './face.js';
import { CAPTURE_UNIT, FACE_TEX, FACE_LIFT, MASK } from './mask.js';
import { HEAD_CENTER, HEAD_STEP, HEAD_MAPS } from './head-data.js';

export const FACE_SHAPES = ['Ei', 'Rond', 'Ovaal', 'Peer', 'Schild', 'Trapezium', 'Achthoek', 'Rechthoek'].map((name, i) => ({
  name,
  map: HEAD_MAPS[i],
  lift: FACE_LIFT[i],
}));

const N = 180 / HEAD_STEP + 1;
const center = new THREE.Vector3(...HEAD_CENTER).multiplyScalar(CAPTURE_UNIT);

/** Catmull-Rom weights for fraction t. */
function cr(t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return [(-t3 + 2 * t2 - t) / 2, (3 * t3 - 5 * t2 + 2) / 2, (-3 * t3 + 4 * t2 + t) / 2, (t3 - t2) / 2];
}

/** Distance from the centre to the surface (world units), smoothly interpolated. */
function radius(map, theta, phi) {
  // The head is symmetric: fold phi into 0..PI.
  phi = Math.abs(((phi + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
  const ft = THREE.MathUtils.clamp((theta * 180) / Math.PI / HEAD_STEP, 0, N - 1);
  const fp = (phi * 180) / Math.PI / HEAD_STEP;
  const it = Math.min(Math.floor(ft), N - 2);
  const ip = Math.min(Math.floor(fp), N - 2);
  const wt = cr(ft - it);
  const wp = cr(fp - ip);
  let r = 0;
  for (let a = 0; a < 4; a++) {
    const row = THREE.MathUtils.clamp(it - 1 + a, 0, N - 1) * N;
    for (let b = 0; b < 4; b++) {
      // Mirror across phi = 0 and phi = PI.
      let col = ip - 1 + b;
      if (col < 0) col = -col;
      if (col > N - 1) col = 2 * (N - 1) - col;
      r += wt[a] * wp[b] * map[row + col];
    }
  }
  return r * 0.1 * CAPTURE_UNIT;
}

/** Height of the nose bulge at world (x, y) on the face. */
function noseBump(n, x, y) {
  const dy = y - n.y;
  const along = dy >= 0 ? Math.max(0, 1 - dy / n.L) ** 0.8 * (0.6 + 0.4 * Math.exp(-((dy / (n.L * 0.35)) ** 2))) : Math.exp(-((dy / n.fall) ** 2));
  const w = n.tipW + (n.bridgeW - n.tipW) * THREE.MathUtils.clamp(dy / n.L, 0, 1);
  return n.A * along * Math.exp(-((x / w) ** 2));
}

/** Nose parameters for the head surface, from a Mii's nose type, size and height. */
export function noseShape(type, worldY, scale) {
  const b = NOSES[type].bump;
  const s = scale / 4.3;
  return { y: worldY, A: b.A * s, L: b.L * s, tipW: b.tipW * s, bridgeW: b.bridgeW * s, fall: 0.028 * s };
}

/**
 * Point on the head surface. scale > 1 gives a shell around the head (for hair);
 * nose (from noseShape) adds the nose bulge to the face.
 */
export function headPoint(shape, theta, phi, scale = 1, out = new THREE.Vector3(), nose = null) {
  const r = radius(shape.map, theta, phi) * scale;
  const st = Math.sin(theta);
  out.set(st * Math.sin(phi), Math.cos(theta), st * Math.cos(phi)).multiplyScalar(r).add(center);
  if (nose && out.z > 0) out.z += noseBump(nose, out.x, out.y);
  return out;
}

/**
 * Front surface of the head: z (world) at world (x, y), found by Newton steps on (theta, phi).
 * Used to place the nose. Returns a function (x, y) => z.
 */
export function faceSurface(shape) {
  const p = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const e = 1e-4;
  return (x, y) => {
    let theta = Math.PI * 0.6;
    let phi = 0;
    for (let k = 0; k < 8; k++) {
      headPoint(shape, theta, phi, 1, p);
      const fx = p.x - x;
      const fy = p.y - y;
      if (Math.abs(fx) + Math.abs(fy) < 1e-6) break;
      headPoint(shape, theta + e, phi, 1, a);
      headPoint(shape, theta, phi + e, 1, b);
      const j11 = (a.x - p.x) / e;
      const j12 = (b.x - p.x) / e;
      const j21 = (a.y - p.y) / e;
      const j22 = (b.y - p.y) / e;
      const det = j11 * j22 - j12 * j21 || 1e-9;
      theta -= (j22 * fx - j12 * fy) / det;
      phi -= (-j21 * fx + j11 * fy) / det;
    }
    return headPoint(shape, theta, phi, 1, p).z;
  };
}

const _q = new THREE.Vector3();
const _q2 = new THREE.Vector3();

/** Unit normal of the head surface at (theta, phi). */
export function headNormal(shape, theta, phi, out = new THREE.Vector3()) {
  const e = 1e-3;
  const du = headPoint(shape, theta, phi + e, 1, _q).sub(headPoint(shape, theta, phi - e, 1, _q2)).clone();
  const dv = headPoint(shape, theta + e, phi, 1, _q).sub(headPoint(shape, theta - e, phi, 1, _q2));
  out.crossVectors(du, dv).normalize();
  if (out.dot(headPoint(shape, theta, phi, 1, _q).sub(center)) < 0) out.negate();
  return out;
}

// The head is built from three patches that share their edge vertices exactly, so
// it is watertight: the textured face (front, below the forehead) and two skin
// patches (front of the crown, back of the head).
const ROWS = 120;
const FACE_ROW0 = 24;
const FRONT_COLS = 120;

export function headGeometries(shape, nose) {
  const t0 = (FACE_ROW0 / ROWS) * Math.PI;
  const at = (theta, phi, out) => headPoint(shape, theta, phi, 1, out, nose);
  const face = parametric((u, v, out) => at(t0 + (Math.PI - t0) * v, -Math.PI / 2 + Math.PI * u, out), FRONT_COLS, ROWS - FACE_ROW0);
  const crown = parametric((u, v, out) => at(t0 * v, -Math.PI / 2 + Math.PI * u, out), FRONT_COLS, FACE_ROW0);
  const back = parametric((u, v, out) => at(Math.PI * v, Math.PI / 2 + Math.PI * u, out), 64, ROWS);

  // Front-view UVs: the face texture is the Wii face mask, projected straight on.
  const pos = face.attributes.position;
  const uv = face.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = MASK.u(pos.getX(i));
    const v = MASK.v(pos.getY(i) - shape.lift);
    uv.setXY(i, (u - FACE_TEX.u0) / (FACE_TEX.u1 - FACE_TEX.u0), 1 - (v - FACE_TEX.v0) / (FACE_TEX.v1 - FACE_TEX.v0));
  }
  return { face, crown, back };
}

/** Draws a face-shape icon like the Wii one: the outline of the head seen from the front. */
export function drawFaceShapeIcon(canvas, shape, skin) {
  const c = canvas.getContext('2d');
  const W = canvas.width;
  // Front silhouette: the widest point of every row of the head.
  const rows = 60;
  const half = new Array(rows + 1).fill(0);
  const p = new THREE.Vector3();
  let top = -Infinity;
  let bottom = Infinity;
  for (let i = 0; i <= 90; i++) {
    for (let j = 0; j <= 36; j++) {
      headPoint(shape, (i / 90) * Math.PI, (j / 36) * Math.PI, 1, p);
      top = Math.max(top, p.y);
      bottom = Math.min(bottom, p.y);
    }
  }
  for (let i = 0; i <= 90; i++) {
    for (let j = 0; j <= 36; j++) {
      headPoint(shape, (i / 90) * Math.PI, (j / 36) * Math.PI, 1, p);
      const k = Math.round(((top - p.y) / (top - bottom)) * rows);
      half[k] = Math.max(half[k], Math.abs(p.x));
    }
  }
  const k = (W * 0.84) / (top - bottom);
  const ox = W / 2;
  const oy = W * 0.08;
  const y = (i) => oy + (i / rows) * (top - bottom) * k;
  c.clearRect(0, 0, W, W);
  c.beginPath();
  half.forEach((x, i) => (i ? c.lineTo(ox + x * k, y(i)) : c.moveTo(ox + x * k, y(i))));
  for (let i = rows; i >= 0; i--) c.lineTo(ox - half[i] * k, y(i));
  c.closePath();
  c.fillStyle = skin;
  c.fill();
  c.lineWidth = W * 0.05;
  c.lineJoin = 'round';
  c.strokeStyle = '#2a2a2e';
  c.stroke();
}
