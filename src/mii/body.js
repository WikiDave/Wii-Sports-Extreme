// The Mii body, measured from Mii Studio renders (body-data.js): shirt in the favourite
// colour (with the hands), grey trousers and shoes. Height and build stretch it with laws
// fitted to renders at the extremes (error under 1%); the head keeps its size and sits on
// top. Built with the feet at y = 0.

import * as THREE from 'three';
import { BODIES, BODY_FEET_Y, BODY_NECK_Y } from './body-data.js';

/** Body scale relative to the default Mii (height and build 64), from Mii Studio renders. */
export function bodyScale(height, build) {
  return {
    y: 0.55004 + 0.006762 * height + 0.0001884 * build + 0.0000022 * height * build,
    xz: 0.50164 + 0.0038369 * height + 0.0024832 * build + 0.0000239 * height * build,
  };
}

const geometries = new Map();
function geometry(gender, part) {
  const key = gender + part;
  let g = geometries.get(key);
  if (g) return g;
  const [pos, idx] = BODIES[gender][part].map((s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer);
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(new Int16Array(pos), (v) => v / 16384), 3));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1));
  g.computeVertexNormals();
  g.userData.shared = true;
  geometries.set(key, g);
  return g;
}

export function buildBody(m, mats) {
  const gender = m.gender === 'f' ? 'f' : 'm';
  const s = bodyScale(m.height, m.weight);
  const group = new THREE.Group();
  // The captured body is in head-local units with the feet at BODY_FEET_Y.
  const body = new THREE.Group();
  body.position.y = -BODY_FEET_Y * s.y;
  body.scale.set(s.xz, s.y, s.xz);
  // Breathing scales the torso about the feet.
  const torso = new THREE.Group();
  torso.position.y = BODY_FEET_Y;
  const parts = new THREE.Group();
  parts.position.y = -BODY_FEET_Y;
  for (const [part, mat] of [['shirt', mats.shirt], ['pants', mats.pants], ['shoes', mats.pants]]) {
    if (BODIES[gender][part]) parts.add(new THREE.Mesh(geometry(gender, part), mat));
  }
  torso.add(parts);
  body.add(torso);
  group.add(body);
  return {
    group,
    torso,
    armL: null,
    armR: null,
    // The head's origin, so its chin sits on the collar of the stretched body.
    headY: (BODY_NECK_Y - BODY_FEET_Y) * s.y - BODY_NECK_Y,
  };
}
