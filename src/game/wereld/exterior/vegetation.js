// New plants: banana plants, bushes with red berries, volcano pines and flower beds by the
// houses. Each kind is one merged geometry, drawn instanced; the instances are grouped in
// 120 m chunks and a chunk is only drawn when the camera is near it (distance culling).

import * as THREE from 'three';
import { heightAt, zoneAt } from '../../world/island.js';
import { pathDistance } from '../../world/zones.js';
import { merge, painted, place, mat } from '../mats.js';
import { rng, between, scatter } from '../rng.js';
import { clearOf, flatness } from './sites.js';

const CHUNK = 120;
const DRAW_DIST = 330;

const LEAF = ['#4fb43f', '#5ea93e', '#3f9a36'];

/** One banana plant: a short stem and six slender leaves that lean out. */
function bananaGeometry() {
  const parts = [painted(new THREE.CylinderGeometry(0.1, 0.16, 1.6, 5), '#9c7a3a', place(0, 0.8, 0))];
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.PlaneGeometry(0.55, 1.6, 1, 3);
    leaf.translate(0, 0.8, 0);
    parts.push(painted(leaf, LEAF[i % 3], place(0, 1.35, 0, { ry: (i / 6) * Math.PI * 2, rx: -0.75 })));
  }
  return merge(parts);
}

/** A bush: a squashed ball with berries on it (berries carry their own colour). */
function bushGeometry() {
  const parts = [painted(new THREE.IcosahedronGeometry(1, 0), '#3f9a36', place(0, 0.75, 0, { sx: 1.2, sy: 0.85, sz: 1.2 }))];
  const r = rng(91);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const y = 0.5 + r() * 0.7;
    const d = 1.05 * (1.0 - (y - 0.5) * 0.4);
    parts.push(painted(new THREE.IcosahedronGeometry(0.16, 0), '#e2513f', place(Math.cos(a) * d, y, Math.sin(a) * d)));
  }
  return merge(parts);
}

/** A volcano pine: three tiers of dark needles on a trunk. */
function pineGeometry() {
  const dark = '#2f6b35';
  return merge([
    painted(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 5), '#6a4a2a', place(0, 0.6, 0)),
    painted(new THREE.ConeGeometry(1.5, 2.6, 7), dark, place(0, 2.2, 0)),
    painted(new THREE.ConeGeometry(1.15, 2.2, 7), '#3a7d3f', place(0, 3.4, 0)),
    painted(new THREE.ConeGeometry(0.75, 1.8, 7), dark, place(0, 4.4, 0)),
  ]);
}

/** A flower bed patch: a few flowers on a low mound (instance colour tints the mound). */
function flowerGeometry() {
  const parts = [painted(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 7), '#ffffff', place(0, 0.06, 0))];
  const cols = ['#ffe14a', '#ff7aa8', '#ffffff', '#b06ce0'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push(painted(new THREE.OctahedronGeometry(0.1, 0), cols[i % cols.length], place(Math.cos(a) * 0.14, 0.2, Math.sin(a) * 0.14)));
  }
  return merge(parts);
}

export const KINDS = {
  banana: { make: bananaGeometry, tint: ['#ffffff', '#e8ffd0', '#d7f5b0'], scale: [0.8, 1.35] },
  bush: { make: bushGeometry, tint: ['#ffffff', '#d8f7c0', '#c5efae'], scale: [0.7, 1.2] },
  pine: { make: pineGeometry, tint: ['#ffffff', '#e0f0d8'], scale: [0.9, 1.4] },
  flower: { make: flowerGeometry, tint: ['#ffffff', '#fff4c0', '#ffd6e6'], scale: [0.9, 1.3] },
};

/**
 * Chooses where the plants stand (seeded), given the props' colliders and the house list.
 * Returns { banana: [...], bush: [...], pine: [...], flower: [...] } with { x, y, z, ry, s }.
 */
export function planVegetation(colliders, houses, avoid = []) {
  const r = rng(4417);
  // avoid: the squares and yards of the new places, { x, z, r } each.
  const free = (x, z, pad) => clearOf(colliders, x, z, pad) && !avoid.some((a) => Math.hypot(a.x - x, a.z - z) < a.r + pad);
  const spot = (x, z) => heightAt(x, z);
  const common = (kind) => (x, z) => {
    const h = spot(x, z);
    if (h < 1.6) return null;
    if (pathDistance(x, z) < 3.5) return null;
    if (!free(x, z, 1.6)) return null;
    if (kind === 'pine') {
      if (zoneAt(x, z) !== 'vulkaan' || h < 8) return null;
    } else if (zoneAt(x, z) === 'vulkaan') return null;
    if (kind === 'banana' && (h > 34 || flatness(x, z, 2) > 1.2)) return null;
    return { y: h };
  };
  const box = { x0: -750, x1: 750, z0: -600, z1: 500 };
  const out = {};
  out.banana = scatter(r, { n: 230, box, accept: common('banana'), spacing: 6 }).map((p) => ({ ...p, ry: r() * 6.28, s: between(r, ...KINDS.banana.scale), c: pick(r, KINDS.banana.tint) }));
  out.bush = scatter(r, { n: 300, box, accept: common('bush'), spacing: 5 }).map((p) => ({ ...p, ry: r() * 6.28, s: between(r, ...KINDS.bush.scale), c: pick(r, KINDS.bush.tint) }));
  out.pine = scatter(r, { n: 170, box: { x0: -40, x1: 130, z0: -330, z1: -130 }, accept: common('pine'), spacing: 5 }).map((p) => ({ ...p, ry: r() * 6.28, s: between(r, ...KINDS.pine.scale), c: '#ffffff' }));
  // Flower beds: a few small clusters by each house, on the side away from the path.
  const beds = [];
  for (const hz of houses) {
    if (r() > 0.55) continue;
    const a = r() * Math.PI * 2;
    const d = 6.5 + r() * 2.5;
    const x = hz.x + Math.cos(a) * d;
    const z = hz.z + Math.sin(a) * d;
    const y = heightAt(x, z);
    if (y < 2.4 || pathDistance(x, z) < 3 || !free(x, z, 1.2)) continue;
    for (let k = 0; k < 4; k++) {
      const fx = x + (r() - 0.5) * 2.2;
      const fz = z + (r() - 0.5) * 2.2;
      beds.push({ x: fx, y: heightAt(fx, fz), z: fz, ry: r() * 6.28, s: between(r, ...KINDS.flower.scale), c: pick(r, KINDS.flower.tint) });
    }
  }
  out.flower = beds;
  return out;
}

function pick(r, list) {
  return list[Math.floor(r() * list.length) % list.length];
}

/** Chunked instanced plants: call update(camera) every frame to show the near chunks. */
export class Vegetation {
  constructor(scene, plan) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.chunks = [];
    this.count = 0;
    const buckets = new Map();
    for (const [kind, list] of Object.entries(plan)) {
      for (const p of list) {
        const key = `${kind}:${Math.floor(p.x / CHUNK)}:${Math.floor(p.z / CHUNK)}`;
        if (!buckets.has(key)) buckets.set(key, { kind, list: [], cx: 0, cz: 0 });
        buckets.get(key).list.push(p);
      }
    }
    const geos = {};
    const color = new THREE.Color();
    for (const [, b] of buckets) {
      geos[b.kind] ??= KINDS[b.kind].make();
      const mesh = new THREE.InstancedMesh(geos[b.kind], mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide }), b.list.length);
      const m4 = new THREE.Matrix4();
      let sx = 0;
      let sz = 0;
      b.list.forEach((p, i) => {
        m4.compose(new THREE.Vector3(p.x, p.y - 0.1, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.ry), new THREE.Vector3(p.s, p.s, p.s));
        mesh.setMatrixAt(i, m4);
        mesh.setColorAt(i, color.set(p.c));
        sx += p.x;
        sz += p.z;
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.chunks.push({ mesh, x: sx / b.list.length, z: sz / b.list.length, n: b.list.length });
      this.count += b.list.length;
    }
  }

  /** Shows the chunks near the camera (pass the camera's position). */
  update(cam) {
    for (const c of this.chunks) {
      const dx = c.x - cam.x;
      const dz = c.z - cam.z;
      c.mesh.visible = dx * dx + dz * dz < DRAW_DIST * DRAW_DIST;
    }
  }

  dispose() {
    this.group.traverse((o) => o.geometry?.dispose?.());
    this.group.clear();
    this.group.removeFromParent();
  }
}
