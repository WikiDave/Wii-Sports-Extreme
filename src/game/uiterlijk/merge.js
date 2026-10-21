// Static mesh merging: every mesh under some roots, baked into one geometry per material. A
// house made of 40 boxes becomes one draw call per colour, and the whole island's houses a few
// dozen. Materials are kept as they are (the same objects), so the lights that change at night
// still work. The source geometries are read, never changed.

import * as THREE from 'three';

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m3 = new THREE.Matrix3();

/** Appends one geometry, transformed by matrix, to the accumulator { p, n, uv } (plain arrays). */
function append(acc, geo, matrix) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  const idx = geo.index;
  const count = idx ? idx.count : pos.count;
  _m3.getNormalMatrix(matrix);
  for (let k = 0; k < count; k++) {
    const i = idx ? idx.getX(k) : k;
    _v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    acc.p.push(_v.x, _v.y, _v.z);
    if (nor) {
      _n.fromBufferAttribute(nor, i).applyMatrix3(_m3).normalize();
      acc.n.push(_n.x, _n.y, _n.z);
    } else acc.n.push(0, 1, 0);
    if (uv) acc.uv.push(uv.getX(i), uv.getY(i));
    else acc.uv.push(0, 0);
  }
}

/**
 * Merges the meshes under `roots` (Object3D[]) into one Mesh per material. Positions are baked
 * into the frame of `space` (an Object3D with an up-to-date world matrix, default: the world).
 * `keep(mesh)` returning true leaves that mesh out. Returns the new meshes; the caller adds them
 * and removes or clears the roots' own meshes.
 */
export function bakeMeshes(roots, { space = null, keep = null } = {}) {
  let inv = null;
  if (space) {
    space.updateMatrixWorld(true);
    inv = new THREE.Matrix4().copy(space.matrixWorld).invert();
  }
  const buckets = new Map();
  const m = new THREE.Matrix4();
  for (const root of roots) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || Array.isArray(o.material) || (keep && keep(o))) return;
      m.copy(o.matrixWorld);
      if (inv) m.premultiply(inv);
      let acc = buckets.get(o.material);
      if (!acc) buckets.set(o.material, (acc = { p: [], n: [], uv: [] }));
      append(acc, o.geometry, m);
    });
  }
  const out = [];
  for (const [material, acc] of buckets) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(acc.p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(acc.n, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(acc.uv, 2));
    out.push(new THREE.Mesh(geo, material));
  }
  return out;
}

/**
 * Replaces all meshes of `root` by one mesh per material, in the root's own frame, so the root
 * keeps its transform. Use it for objects that are built once and never animated.
 */
export function mergeInPlace(root) {
  const merged = bakeMeshes([root], { space: root });
  root.clear();
  if (merged.length) root.add(...merged);
  return root;
}
