// The Wii noses, measured from Mii Studio (nose-data.js): the nose line drawn on the face
// texture, and the 3D nose as a small height-field mesh in front of the face. The mesh is
// mapped with the face texture by straight front projection, like the face, so the nose line
// lies on it.

import * as THREE from 'three';
import { NOSE_DATA, NOSE_ANCHOR, NOSE_ORIGIN_ABOVE_FACE } from './nose-data.js';
import { CAPTURE_UNIT, FACE_TEX, MASK } from './mask.js';

/** Nose size factor relative to the default size (4), like the Wii: (0.4 + 0.175 s) / 1.1. */
export const noseScale = (size) => (0.4 + 0.175 * size) / 1.1;
/** Anchor of the nose in the app's face mask (texture) frame. */
export const noseAnchorV = (y) => NOSE_ANCHOR.v0 + NOSE_ANCHOR.step * y;

/** Draws the nose line of internal nose `id` into c (mask units). */
export function drawNoseLine(c, id, y, size, color = '#000000') {
  const k = noseScale(size) / 100;
  c.save();
  c.translate(32, noseAnchorV(y));
  c.scale(k, k);
  c.fillStyle = color;
  for (const d of NOSE_DATA[id].line) c.fill(new Path2D(d), 'evenodd');
  c.restore();
}

function decodeGrid(b) {
  const bytes = Uint8Array.from(atob(b.z), (ch) => ch.charCodeAt(0));
  return new Int16Array(bytes.buffer);
}

/**
 * The 3D nose of internal nose `id` (or null for the flat noses), for a face whose front
 * surface z is faceZ(x, y) (world units), with the anchor at world height anchorY.
 */
export function noseGeometry(id, y, size, anchorY, faceZ) {
  const b = NOSE_DATA[id].bump;
  if (!b) return null;
  const z = decodeGrid(b);
  const k = noseScale(size);
  const unit = MASK.unit;
  const originZ = faceZ(0, anchorY) + NOSE_ORIGIN_ABOVE_FACE * CAPTURE_UNIT;
  const vAnchor = noseAnchorV(y);
  const pos = [];
  const uv = [];
  const ok = [];
  for (let j = 0; j < b.nv; j++) {
    for (let i = 0; i < b.nu; i++) {
      const du = (b.u0 + 0.25 * i) * k;
      const dv = (b.v0 + 0.25 * j) * k;
      const x = du * unit;
      const wy = anchorY - dv * unit;
      const raw = z[j * b.nu + i];
      const face = faceZ(x, wy);
      // Points without nose, or flush with the face, tuck just under it so no seam shows.
      let wz = raw === -32768 ? face - 0.004 : originZ + (k * raw * 0.1) * CAPTURE_UNIT;
      const inFront = wz > face + 0.0006;
      if (!inFront) wz = face - 0.004;
      ok.push(inFront);
      pos.push(x, wy, wz);
      const u = 32 + du;
      const v = vAnchor + dv;
      uv.push((u - FACE_TEX.u0) / (FACE_TEX.u1 - FACE_TEX.u0), 1 - (v - FACE_TEX.v0) / (FACE_TEX.v1 - FACE_TEX.v0));
    }
  }
  const index = [];
  for (let j = 0; j < b.nv - 1; j++) {
    for (let i = 0; i < b.nu - 1; i++) {
      const a = j * b.nu + i;
      const c = a + b.nu;
      if (!(ok[a] || ok[a + 1] || ok[c] || ok[c + 1])) continue;
      index.push(a, c, a + 1, a + 1, c, c + 1);
    }
  }
  if (!index.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}
