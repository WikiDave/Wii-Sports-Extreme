// The Wii beards (types 1..3), measured from Mii Studio renders as 3D meshes around the jaw
// (beard-data.js), in the facial hair colour. BEARD_OFFSET moves them to each face shape.

import * as THREE from 'three';
import { BEARD_MESHES, BEARD_OFFSET } from './beard-data.js';
import { MASK } from './mask.js';

const geometries = new Map();

export function beardGeometry(type) {
  if (!type) return null;
  let g = geometries.get(type);
  if (g) return g;
  const [p, i] = BEARD_MESHES[type].map((s) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0)).buffer);
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(new Int16Array(p), (v) => v / 16384), 3));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array(i), 1));
  g.computeVertexNormals();
  g.userData.shared = true;
  geometries.set(type, g);
  return g;
}

/** The beard of `type` for face `shape`, or null. */
export function buildBeard(type, shape, material) {
  const g = beardGeometry(type);
  if (!g) return null;
  const mesh = new THREE.Mesh(g, material);
  const [dy, dz] = BEARD_OFFSET[shape];
  mesh.position.set(0, dy, dz);
  return mesh;
}

/** Draws the beard seen from the front into c, in mask units (for option icons). */
export function drawBeardIcon(c, type, color) {
  const g = beardGeometry(type);
  if (!g) return;
  const p = g.attributes.position;
  const idx = g.index.array;
  c.save();
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = 0.08;
  c.beginPath();
  for (let t = 0; t < idx.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const v = idx[t + k];
      const u = MASK.u(p.getX(v));
      const w = MASK.v(p.getY(v));
      if (k) c.lineTo(u, w);
      else c.moveTo(u, w);
    }
    c.closePath();
  }
  c.fill('nonzero');
  c.stroke();
  c.restore();
}
