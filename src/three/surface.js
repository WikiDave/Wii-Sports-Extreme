import * as THREE from 'three';

const E = 1e-4;
const _p = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _du = new THREE.Vector3();
const _dv = new THREE.Vector3();
const _n = new THREE.Vector3();
const _r = new THREE.Vector3();

/**
 * Builds a smooth indexed BufferGeometry from a parametric function.
 *
 * fn(u, v, out) writes the position for u, v in [0, 1] (it may be called slightly
 * outside that range). Normals come from central differences, so deformed shapes
 * stay smooth across seams. ref(u, v, p, out) writes a vector pointing "outwards";
 * it orients the normals and is the fallback normal at degenerate points (poles).
 */
export function parametric(fn, uSeg, vSeg, ref = null) {
  const count = (uSeg + 1) * (vSeg + 1);
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  let orientation = 0;

  for (let j = 0, k = 0; j <= vSeg; j++) {
    const v = j / vSeg;
    for (let i = 0; i <= uSeg; i++, k++) {
      const u = i / uSeg;
      fn(u, v, _p);
      fn(u + E, v, _a);
      fn(u - E, v, _b);
      _du.subVectors(_a, _b);
      fn(u, v + E, _a);
      fn(u, v - E, _b);
      _dv.subVectors(_a, _b);
      _n.crossVectors(_du, _dv);
      if (ref) ref(u, v, _p, _r);
      else _r.copy(_p);

      const degenerate = _n.lengthSq() <= 1e-10 * _du.lengthSq() * _dv.lengthSq() || _du.lengthSq() < 1e-24 || _dv.lengthSq() < 1e-24;
      if (degenerate) {
        _n.copy(_r);
      } else {
        const d = _n.dot(_r);
        orientation += d >= 0 ? 1 : -1;
        if (d < 0) _n.negate();
      }
      if (_n.lengthSq() < 1e-20) _n.set(0, 1, 0);
      _n.normalize();

      pos[k * 3] = _p.x;
      pos[k * 3 + 1] = _p.y;
      pos[k * 3 + 2] = _p.z;
      nor[k * 3] = _n.x;
      nor[k * 3 + 1] = _n.y;
      nor[k * 3 + 2] = _n.z;
      uvs[k * 2] = u;
      uvs[k * 2 + 1] = 1 - v;
    }
  }

  // Wind the triangles so their front faces agree with the oriented normals.
  const flip = orientation < 0;
  const index = [];
  const row = uSeg + 1;
  for (let j = 0; j < vSeg; j++) {
    for (let i = 0; i < uSeg; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      if (flip) index.push(a, c, b, b, c, d);
      else index.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

/** A tube along a curve whose radius follows radius(t); handy for ponytails and pigtails. */
export function taperedTube(curve, radius, lenSeg = 24, radSeg = 16) {
  const t = new THREE.Vector3();
  const up = new THREE.Vector3();
  const n = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const frame = (s) => {
    s = THREE.MathUtils.clamp(s, 0, 1);
    curve.getTangentAt(s, t);
    up.set(1, 0, 0);
    if (Math.abs(t.dot(up)) > 0.9) up.set(0, 0, 1);
    n.crossVectors(t, up).normalize();
    b.crossVectors(t, n).normalize();
    curve.getPointAt(s, c);
  };
  return parametric(
    (u, v, out) => {
      frame(v);
      const a = u * Math.PI * 2;
      const r = radius(THREE.MathUtils.clamp(v, 0, 1));
      return out.copy(c).addScaledVector(n, Math.cos(a) * r).addScaledVector(b, Math.sin(a) * r);
    },
    radSeg,
    lenSeg,
    (u, v, p, out) => {
      frame(v);
      return out.subVectors(p, c);
    },
  );
}
