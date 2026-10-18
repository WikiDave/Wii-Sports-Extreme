// The head: a deformed sphere (face shape), the face texture wrapped over the
// front, ears and a 3D nose. Angles: theta runs down from the crown (0) to the
// chin (PI); phi runs around the head with phi = 0 facing forward (+z).

import * as THREE from 'three';
import { parametric } from '../three/surface.js';
import { FACE_TEX } from './face.js';

export const HEAD_R = 0.5;

export const FACE_SHAPES = [
  { name: 'Rond', w: 1.0, jaw: 0.94, chin: 1.0, sq: 0 },
  { name: 'Ovaal', w: 0.93, jaw: 0.86, chin: 1.1, sq: 0 },
  { name: 'Puntkin', w: 0.98, jaw: 0.72, chin: 1.14, sq: 0 },
  { name: 'Vierkant', w: 1.0, jaw: 1.0, chin: 0.98, sq: 0.9 },
  { name: 'Breed', w: 1.09, jaw: 0.98, chin: 0.94, sq: 0.35 },
  { name: 'Hoekige kaak', w: 1.0, jaw: 1.06, chin: 1.02, sq: 0.6 },
  { name: 'Smal', w: 0.88, jaw: 0.86, chin: 1.04, sq: 0.15 },
  { name: 'Peer', w: 0.95, jaw: 1.12, chin: 1.0, sq: 0.25 },
];

const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Point on the head surface; scale > 1 gives a shell around the head (for hair). */
export function headPoint(shape, theta, phi, scale = 1, out = new THREE.Vector3()) {
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
    x *= 1 + (shape.jaw - 1) * t * t;
    z *= 1 + (shape.jaw - 1) * t * t * 0.4;
    y *= shape.chin;
  }
  return out.set(x * shape.w * 1.02, y * 1.06, z * 0.97).multiplyScalar(HEAD_R * scale);
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

export function headGeometry(shape) {
  return parametric((u, v, out) => headPoint(shape, Math.PI * v, -Math.PI + 2 * Math.PI * u, 1, out), 72, 48);
}

/** The patch the face canvas is drawn on; its UVs match the canvas layout in face.js. */
export function faceGeometry(shape) {
  const t0 = FACE_TEX.theta0;
  const tSpan = (FACE_TEX.height / FACE_TEX.width) * FACE_TEX.phiSpan;
  const p0 = -FACE_TEX.phiSpan / 2;
  return parametric((u, v, out) => headPoint(shape, t0 + tSpan * v, p0 + FACE_TEX.phiSpan * u, 1, out), 64, 48);
}

// ---------------------------------------------------------------- noses
// Built from a few squashed spheres in a frame where +z points out of the face.

export const NOSES = [
  { name: 'Knopje', parts: [{ s: [0.055, 0.05, 0.045] }] },
  { name: 'Rond', parts: [{ s: [0.075, 0.065, 0.06] }] },
  { name: 'Lang', parts: [{ s: [0.05, 0.11, 0.06], o: [0, 0.03, 0], r: -0.25 }, { s: [0.055, 0.045, 0.05], o: [0, -0.05, 0.03] }] },
  { name: 'Breed', parts: [{ s: [0.1, 0.055, 0.05] }] },
  {
    name: 'Haakneus',
    parts: [
      { s: [0.045, 0.1, 0.055], o: [0, 0.04, 0.01], r: -0.35 },
      { s: [0.05, 0.05, 0.05], o: [0, -0.04, 0.05] },
    ],
  },
  { name: 'Wipneus', parts: [{ s: [0.055, 0.06, 0.06], r: 0.45 }] },
  {
    name: 'Groot',
    parts: [
      { s: [0.08, 0.08, 0.075] },
      { s: [0.04, 0.034, 0.034], o: [0.055, -0.025, -0.01] },
      { s: [0.04, 0.034, 0.034], o: [-0.055, -0.025, -0.01] },
    ],
  },
  { name: 'Plat', parts: [{ s: [0.07, 0.045, 0.028] }] },
  { name: 'Puntig', parts: [{ s: [0.045, 0.09, 0.05], o: [0, 0.02, 0], r: -0.15 }, { s: [0.03, 0.03, 0.06], o: [0, -0.035, 0.03] }] },
];

const unitSphere = new THREE.SphereGeometry(1, 28, 20);
unitSphere.userData.shared = true;

export function buildNose(type, shape, theta, scale, material) {
  const group = new THREE.Group();
  const anchor = headPoint(shape, theta, 0);
  const normal = headNormal(shape, theta, 0);
  group.position.copy(anchor);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  group.scale.setScalar(scale);
  for (const part of NOSES[type].parts) {
    const mesh = new THREE.Mesh(unitSphere, material);
    mesh.scale.set(...part.s);
    const [ox, oy, oz] = part.o ?? [0, 0, 0];
    mesh.position.set(ox, oy, oz + part.s[2] * 0.25);
    mesh.rotation.x = part.r ?? 0;
    group.add(mesh);
  }
  return group;
}

export function buildEars(shape, material) {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const phi = side * THREE.MathUtils.degToRad(88);
    const theta = THREE.MathUtils.degToRad(100);
    const ear = new THREE.Mesh(unitSphere, material);
    ear.scale.set(0.05, 0.1, 0.075);
    ear.position.copy(headPoint(shape, theta, phi)).add(new THREE.Vector3(side * 0.01, 0, -0.02));
    ear.rotation.y = side * 0.25;
    ear.rotation.z = -side * 0.12;
    group.add(ear);
  }
  return group;
}
