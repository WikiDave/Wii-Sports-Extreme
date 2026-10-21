// Shared materials and geometry helpers for the world content: flat-shaded Lambert colours
// (the Wii look), one material per colour, and merging small pieces into one geometry so a
// tree or a stall is a single draw call.

import * as THREE from 'three';

const cache = new Map();

/** A flat-shaded Lambert material for a colour (cached: one per colour and option set). */
export function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts }));
  return cache.get(key);
}

/** A non-indexed copy of geo, moved by matrix m and painted one colour (vertex colours). */
export function painted(geo, color, m = null) {
  const g = (geo.index ? geo.toNonIndexed() : geo.clone());
  if (m) g.applyMatrix4(m);
  if (!g.attributes.normal) g.computeVertexNormals();
  const c = new THREE.Color(color);
  const cols = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < cols.length; i += 3) {
    cols[i] = c.r;
    cols[i + 1] = c.g;
    cols[i + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

/** Joins non-indexed geometries (each with position, normal and color) into one. */
export function merge(parts) {
  let n = 0;
  for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const nrm = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o * 3);
    nrm.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

/** A matrix that places a piece: position, Euler rotation (y, then x, z) and uniform or per-axis scale. */
export function place(x, y, z, { ry = 0, rx = 0, rz = 0, s = 1, sx = s, sy = s, sz = s } = {}) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
}
