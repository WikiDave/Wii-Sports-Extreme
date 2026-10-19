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

// Joints in head-local units (the captured body's space): hips and shoulders, mirrored in x.
const HIP = { x: 0.1, y: -1.18 };
const SHOULDER = { x: 0.16, y: -0.64 };
const HAND = { x: 0.4, y: -1.3 };

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Skin weights of one vertex: [torso, legL, legR, armL, armR] (L = +x, the Mii's left). */
function weights(part, x, y, z) {
  const w = [0, 0, 0, 0, 0];
  const side = x >= 0 ? 0 : 1;
  if (part !== 'shirt') {
    const leg = smooth((HIP.y + 0.04 - y) / 0.12);
    w[1 + side] = leg;
    w[0] = 1 - leg;
    return w;
  }
  // Arms: close to the line from the shoulder to the hand, and outside the torso.
  const ax = Math.abs(x);
  const dx = HAND.x - SHOULDER.x;
  const dy = HAND.y - SHOULDER.y;
  const t = Math.min(1, Math.max(0, ((ax - SHOULDER.x) * dx + (y - SHOULDER.y) * dy) / (dx * dx + dy * dy)));
  const d = Math.hypot(ax - (SHOULDER.x + t * dx), y - (SHOULDER.y + t * dy));
  const torsoHalf = 0.17 + 0.06 * smooth((SHOULDER.y - y) / 0.6);
  const arm = smooth((0.11 - d) / 0.04) * smooth((ax - torsoHalf + 0.02) / 0.05) * smooth((SHOULDER.y + 0.02 - y) / 0.06);
  // Shirt below the hips (the tail of the hull under the hands) moves with the legs.
  const leg = (1 - arm) * smooth((HIP.y - 0.1 - y) / 0.1);
  w[3 + side] = arm;
  w[1 + side] = leg;
  w[0] = 1 - arm - leg;
  return w;
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
  // Skinning: bone 0 torso, 1/2 legs, 3/4 arms (see buildBody).
  const vp = g.attributes.position;
  const index = new Uint16Array(vp.count * 4);
  const weight = new Float32Array(vp.count * 4);
  for (let i = 0; i < vp.count; i++) {
    const w = weights(part, vp.getX(i), vp.getY(i), vp.getZ(i));
    const order = [0, 1, 2, 3, 4].sort((a, b) => w[b] - w[a]).slice(0, 4);
    order.forEach((b, k) => {
      index[i * 4 + k] = b;
      weight[i * 4 + k] = w[b];
    });
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(index, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weight, 4));
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
  // Bones: hips and shoulders, so the Mii can walk and swing its arms.
  const root = new THREE.Bone();
  const joint = (x, y) => {
    const b = new THREE.Bone();
    b.position.set(x, y, 0);
    root.add(b);
    return b;
  };
  const legL = joint(HIP.x, HIP.y);
  const legR = joint(-HIP.x, HIP.y);
  const armL = joint(SHOULDER.x, SHOULDER.y);
  const armR = joint(-SHOULDER.x, SHOULDER.y);
  parts.add(root);
  torso.add(parts);
  body.add(torso);
  group.add(body);
  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton([root, legL, legR, armL, armR]);
  for (const [part, mat] of [['shirt', mats.shirt], ['pants', mats.pants], ['shoes', mats.pants]]) {
    if (!BODIES[gender][part]) continue;
    const mesh = new THREE.SkinnedMesh(geometry(gender, part), mat);
    parts.add(mesh);
    mesh.updateMatrixWorld(true);
    mesh.bind(skeleton);
  }
  return {
    group,
    torso,
    armL,
    armR,
    legL,
    legR,
    // The head's origin, so its chin sits on the collar of the stretched body.
    headY: (BODY_NECK_Y - BODY_FEET_Y) * s.y - BODY_NECK_Y,
  };
}
