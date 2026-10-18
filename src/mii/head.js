// The head: an egg-shaped surface (taller than wide, like a Wii Mii) whose front
// carries the face texture and a small nose bulge. Angles: theta runs down from
// the crown (0) to the chin (PI); phi runs around the head, phi = 0 facing +z.

import * as THREE from 'three';
import { parametric } from '../three/surface.js';
import { FACE_TEX, NOSES } from './face.js';

/** Head radii in world units: the head is 1 unit tall. */
export const HEAD = { rx: 0.4, ry: 0.5, rz: 0.44 };

export const FACE_SHAPES = [
  { name: 'Ei', w: 1.0, jaw: 0.86, chin: 1.02, sq: 0 },
  { name: 'Rond', w: 1.05, jaw: 0.97, chin: 0.94, sq: 0 },
  { name: 'Puntkin', w: 0.98, jaw: 0.72, chin: 1.12, sq: 0 },
  { name: 'Vierkant', w: 1.0, jaw: 1.0, chin: 0.97, sq: 0.9 },
  { name: 'Breed', w: 1.1, jaw: 0.95, chin: 0.93, sq: 0.35 },
  { name: 'Hoekige kaak', w: 1.0, jaw: 1.06, chin: 1.0, sq: 0.6 },
  { name: 'Smal', w: 0.9, jaw: 0.84, chin: 1.06, sq: 0.15 },
  { name: 'Peer', w: 0.96, jaw: 1.12, chin: 0.98, sq: 0.25 },
];

const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

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
  const s = scale / 3.4;
  return { y: worldY, A: b.A * s, L: b.L * s, tipW: b.tipW * s, bridgeW: b.bridgeW * s, fall: 0.028 * s };
}

/**
 * Point on the head surface. scale > 1 gives a shell around the head (for hair);
 * nose (from noseShape) adds the nose bulge to the face.
 */
export function headPoint(shape, theta, phi, scale = 1, out = new THREE.Vector3(), nose = null) {
  const st = Math.sin(theta);
  let x = st * Math.sin(phi);
  let y = Math.cos(theta);
  let z = st * Math.cos(phi);
  if (shape.sq > 0) {
    // Blend towards a rounded box, mostly around the jaw.
    const k = Math.pow(x ** 4 + y ** 4 + z ** 4, -0.25);
    const w = shape.sq * 0.5 * smooth(0.5, -0.5, y);
    x *= 1 + (k - 1) * w;
    y *= 1 + (k - 1) * w;
    z *= 1 + (k - 1) * w * 0.5;
  }
  if (y < 0) {
    const t = Math.min(1, -y);
    x *= 1 + (shape.jaw - 1) * t ** 1.5;
    z *= 1 + (shape.jaw - 1) * t * t * 0.5;
    y *= shape.chin;
  }
  // Slightly fuller cheeks, flatter face front.
  x *= 1 + 0.04 * Math.exp(-(((y + 0.15) / 0.35) ** 2));
  z *= 1 - 0.05 * Math.max(0, Math.cos(phi)) ** 4 * st;
  out.set(x * shape.w * HEAD.rx, y * HEAD.ry, z * HEAD.rz).multiplyScalar(scale);
  if (nose && out.z > 0) out.z += noseBump(nose, out.x, out.y);
  return out;
}

const _q = new THREE.Vector3();
const _q2 = new THREE.Vector3();

/** Unit normal of the head surface at (theta, phi). */
export function headNormal(shape, theta, phi, out = new THREE.Vector3()) {
  const e = 1e-3;
  const du = headPoint(shape, theta, phi + e, 1, _q).sub(headPoint(shape, theta, phi - e, 1, _q2)).clone();
  const dv = headPoint(shape, theta + e, phi, 1, _q).sub(headPoint(shape, theta - e, phi, 1, _q2));
  out.crossVectors(du, dv).normalize();
  if (out.dot(headPoint(shape, theta, phi, 1, _q)) < 0) out.negate();
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

  // Front-view UVs: the face canvas is a straight-on picture of the face.
  const pos = face.attributes.position;
  const uv = face.attributes.uv;
  const height = FACE_TEX.top - FACE_TEX.bottom;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, 0.5 + pos.getX(i) / (2 * FACE_TEX.halfWidth), (pos.getY(i) - FACE_TEX.bottom) / height);
  }
  return { face, crown, back };
}

const unitSphere = new THREE.SphereGeometry(1, 28, 20);
unitSphere.userData.shared = true;

export function buildEars(shape, material) {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const phi = side * THREE.MathUtils.degToRad(88);
    const theta = THREE.MathUtils.degToRad(97);
    const ear = new THREE.Mesh(unitSphere, material);
    ear.scale.set(0.035, 0.085, 0.06);
    ear.position.copy(headPoint(shape, theta, phi)).add(new THREE.Vector3(side * 0.008, 0, -0.01));
    ear.rotation.y = side * 0.3;
    ear.rotation.z = -side * 0.1;
    group.add(ear);
  }
  return group;
}
