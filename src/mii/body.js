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
const ARM_LEN = Math.hypot(HAND.x - SHOULDER.x, HAND.y - SHOULDER.y);
const ARM_DIR = { x: (HAND.x - SHOULDER.x) / ARM_LEN, y: (HAND.y - SHOULDER.y) / ARM_LEN };
const SHOULDER_BALL = new THREE.SphereGeometry(0.095, 16, 12);
const ARM = new THREE.CapsuleGeometry(0.072, ARM_LEN - 0.1, 6, 14);
const CORE = new THREE.CapsuleGeometry(0.115, 0.36, 6, 16);
for (const g of [SHOULDER_BALL, ARM, CORE]) g.userData.shared = true;

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** Beside the upper three quarters of the arm (where the scan has a web between arm and torso); the hem stays. */
function underArm(ax, y) {
  const dx = HAND.x - SHOULDER.x;
  const dy = HAND.y - SHOULDER.y;
  const t = ((ax - SHOULDER.x) * dx + (y - SHOULDER.y) * dy) / (dx * dx + dy * dy);
  return t < 0.75 && Math.hypot(ax - (SHOULDER.x + t * dx), y - (SHOULDER.y + t * dy)) < 0.15;
}
/** Half the width of the torso at height y (head-local units). */
const torsoHalf = (y) => 0.17 + 0.06 * smooth((SHOULDER.y - y) / 0.6);

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
  const arm = smooth((0.11 - d) / 0.04) * smooth((ax - torsoHalf(y) + 0.02) / 0.05) * smooth((SHOULDER.y + 0.02 - y) / 0.06);
  // Shirt below the hips (the tail of the hull under the hands) moves with the legs.
  const leg = (1 - arm) * smooth((HIP.y - 0.1 - y) / 0.1);
  w[3 + side] = arm;
  w[1 + side] = leg;
  w[0] = 1 - arm - leg;
  return w;
}

/**
 * The shirt without its captured sleeves: those stretch into sheets when an arm swings. The
 * torso keeps its own triangles (following the torso, and the legs for the tail under the hands);
 * round arms (buildBody) take the place of the sleeves, and a core fills the torso's sides.
 */
function torsoShirt(src) {
  const vp = src.attributes.position;
  const w = [];
  for (let i = 0; i < vp.count; i++) w.push(weights('shirt', vp.getX(i), vp.getY(i), vp.getZ(i)));
  const idx = src.index.array;
  const keep = [];
  for (let t = 0; t < idx.length; t += 3) {
    const arm = Math.max(...[3, 4].map((b) => (w[idx[t]][b] + w[idx[t + 1]][b] + w[idx[t + 2]][b]) / 3));
    // The centre of the triangle: strips of the scan beside the torso (under the arms) go too.
    const cx = Math.abs(vp.getX(idx[t]) + vp.getX(idx[t + 1]) + vp.getX(idx[t + 2])) / 3;
    const cy = (vp.getY(idx[t]) + vp.getY(idx[t + 1]) + vp.getY(idx[t + 2])) / 3;
    const side = cy < SHOULDER.y && cx > torsoHalf(cy) + 0.005 && underArm(cx, cy);
    if (arm <= 0.5 && !side) keep.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  const g = src.clone();
  g.setIndex(keep);
  const index = new Uint16Array(vp.count * 4);
  const weight = new Float32Array(vp.count * 4);
  for (let i = 0; i < vp.count; i++) {
    const ww = w[i];
    const sum = ww[0] + ww[1] + ww[2] || 1;
    index[i * 4] = 0;
    weight[i * 4] = ww[0] / sum;
    index[i * 4 + 1] = ww[1] >= ww[2] ? 1 : 2;
    weight[i * 4 + 1] = Math.max(ww[1], ww[2]) / sum;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(index, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weight, 4));
  return g;
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
  if (part === 'shirt') g = torsoShirt(g);
  else {
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
  }
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
  // Round arms in the shirt colour, hanging from a ball on each shoulder, as on a Wii Mii; and a
  // core inside the torso so its open sides never show through.
  for (const [arm, side] of [[armL, 1], [armR, -1]]) {
    arm.add(new THREE.Mesh(SHOULDER_BALL, mats.shirt));
    const sleeve = new THREE.Mesh(ARM, mats.shirt);
    sleeve.position.set((side * ARM_DIR.x * ARM_LEN) / 2, (ARM_DIR.y * ARM_LEN) / 2, 0);
    sleeve.rotation.z = side * Math.atan2(ARM_DIR.x, -ARM_DIR.y);
    arm.add(sleeve);
  }
  const core = new THREE.Mesh(CORE, mats.shirt);
  core.position.set(0, -0.9, 0);
  core.scale.set(1.35, 1, 1);
  root.add(core);
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
