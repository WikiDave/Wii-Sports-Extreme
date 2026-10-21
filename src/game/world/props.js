// Lowpoly props for the island: palms, houses, lighthouse, rocks. Flat colours, seeded so the
// island is always the same. For speed the palms and rocks are instanced (one draw call for
// all of them), and the houses, lamps and pier deck are merged into one mesh per colour.
// Palms sway in the wind; only the ones near the camera are updated each frame.

import * as THREE from 'three';
import { heightAt, zoneAt } from './island.js';
import { house as newHouse, hotel, pier, streetLamp } from './buildings.js';
import { PATH_SEGMENTS, pathDistance } from './zones.js';
import { bakeMeshes } from '../uiterlijk/merge.js';
import { addBeachDecor } from './beachDecor.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
const M = {
  // Instanced parts are white: the colour of each instance comes from setColorAt.
  trunk: mat('#ffffff'),
  leaf: new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, side: THREE.DoubleSide }),
  coconut: mat('#6b4a2a'),
  wall: mat('#fff4e0'),
  roof: mat('#e2513f'),
  white: mat('#ffffff'),
  red: mat('#e2513f'),
  trunkWood: mat('#a8743a'),
  rock: mat('#ffffff'),
  glass: new THREE.MeshLambertMaterial({ color: '#ffe9a0', emissive: '#ffd24a', emissiveIntensity: 0.0 }),
};

const TRUNK_H = 7.2;
const BEND = 0.35; // how far the top leans sideways
const FRONDS = 10;
const FROND_LEN = 4.0;
const TRUNK_TINTS = ['#a8743a', '#b98349', '#9a6532', '#c08a4f'];
const LEAF_TINTS = ['#4fb43f', '#5cc04a', '#3fa23a', '#6cc35a', '#7fb83c'];
const ROCK_TINTS = ['#9a8f80', '#8c8275', '#a89c8b', '#948a7c'];

/** A trunk: an open tube that tapers and leans, its base at the origin. */
function trunkGeometry() {
  const g = new THREE.CylinderGeometry(0.22, 0.42, TRUNK_H, 7, 6, true);
  g.translate(0, TRUNK_H / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / TRUNK_H;
    p.setX(i, p.getX(i) + BEND * t * t);
  }
  g.computeVertexNormals();
  return g;
}

/** All fronds in one geometry: each a drooping, double-sided leaf strip around the crown. */
function frondGeometry(crown) {
  const pos = [];
  const idx = [];
  const SEG = 6;
  for (let f = 0; f < FRONDS; f++) {
    const th = (f / FRONDS) * Math.PI * 2 + (f % 2) * 0.2;
    const cx = Math.cos(th);
    const cz = Math.sin(th);
    const sx = -cz;
    const sz = cx;
    const base = pos.length / 3;
    for (let i = 0; i <= SEG; i++) {
      const s = i / SEG;
      const d = FROND_LEN * 0.95 * s; // how far it reaches out
      const y = FROND_LEN * (0.9 * s - 0.6 * s * s) * 0.9; // up, then the tip droops
      const w = 0.85 * (0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, s * 0.95 + 0.05))) * (1 - 0.35 * s);
      const fold = 0.28 * w; // the sides hang below the midrib
      pos.push(crown.x + cx * d + sx * w, crown.y + y - fold, crown.z + cz * d + sz * w);
      pos.push(crown.x + cx * d - sx * w, crown.y + y - fold, crown.z + cz * d - sz * w);
    }
    for (let i = 0; i < SEG; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Coconuts: a small cluster under the crown. */
function coconutGeometry(crown) {
  const parts = [
    [0.3, -0.35, 0.1],
    [-0.1, -0.5, -0.2],
    [0.05, -0.3, 0.32],
  ];
  const geos = parts.map(([x, y, z]) => {
    const g = new THREE.IcosahedronGeometry(0.2, 0);
    g.translate(crown.x + x, crown.y + y, crown.z + z);
    return g; // already non-indexed
  });
  return mergeNonIndexed(geos);
}

function mergeNonIndexed(geos) {
  const count = geos.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

const CROWN = new THREE.Vector3(BEND, TRUNK_H, 0);
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _mat = new THREE.Matrix4();

/** Instanced palms: a trunk, the fronds and the coconuts, one draw call each. */
function buildPalms(specs) {
  const n = specs.length;
  const trunk = new THREE.InstancedMesh(trunkGeometry(), M.trunk, n);
  const leaves = new THREE.InstancedMesh(frondGeometry(CROWN), M.leaf, n);
  const nuts = new THREE.InstancedMesh(coconutGeometry(CROWN), M.coconut, n);
  const color = new THREE.Color();
  specs.forEach((p, i) => {
    trunk.setColorAt(i, color.set(TRUNK_TINTS[Math.floor(p.tint * TRUNK_TINTS.length) % TRUNK_TINTS.length]));
    leaves.setColorAt(i, color.set(LEAF_TINTS[Math.floor(p.tint * 7.3) % LEAF_TINTS.length]));
  });
  const set = (i, sx, sz) => {
    const p = specs[i];
    _euler.set(sx, p.rot, p.tilt + sz);
    _quat.setFromEuler(_euler);
    _pos.set(p.x, p.y, p.z);
    _scale.setScalar(p.s);
    _mat.compose(_pos, _quat, _scale);
    trunk.setMatrixAt(i, _mat);
    leaves.setMatrixAt(i, _mat);
    nuts.setMatrixAt(i, _mat);
  };
  specs.forEach((_, i) => set(i, 0, 0));
  for (const m of [trunk, leaves, nuts]) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
  return { trunk, leaves, nuts, set };
}

function lighthouse() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(2.6 - i * 0.28, 3 - i * 0.28, 4, 10), i % 2 ? M.red : M.white);
    seg.position.y = 2 + i * 4;
    g.add(seg);
  }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 10), M.glass);
  lamp.position.y = 17.2;
  lamp.name = 'lamp';
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.4, 10), M.red);
  cap.position.y = 19.6;
  g.add(lamp, cap);
  return g;
}

/** Surface point at (x, z) with ground under it, or null if under water. */
function ground(x, z, minH = 0.9) {
  const y = heightAt(x, z);
  return y >= minH ? y : null;
}

/** Scatters props over the island: the group, the lamp material (for night) and the colliders. */
export function buildProps() {
  const group = new THREE.Group();
  const rand = rng(42);

  // Round obstacles for the player: { x, z, r }.
  const colliders = [];
  const palmSpecs = [];
  const rockSpecs = [];
  const lamps = [];
  const deckMerge = [];
  // A building on the island; its collider has radius r (scaled with it). The random numbers
  // are drawn in the same order as always, so the island layout does not change.
  const place = (obj, x, z, y, rot, s = 1, r = 0) => {
    if (r) colliders.push({ x, z, r: r * s });
    obj.position.set(x, y, z);
    obj.rotation.y = rot;
    obj.scale.setScalar(s);
    group.add(obj);
  };

  // Palms: dense on the beaches and shores, sparse inland. Drawn in buildPalms().
  for (let i = 0; i < 700; i++) {
    const x = (rand() - 0.5) * 1300;
    const z = (rand() - 0.5) * 1000;
    const y = ground(x, z, 1.3);
    if (y === null || y > 14) continue;
    const zone = zoneAt(x, z);
    if (zone === 'vulkaan' || (y > 5 && rand() < 0.55)) continue;
    const s = 0.8 + rand() * 0.6;
    const rot = rand() * Math.PI * 2;
    const tilt = (rand() - 0.5) * 0.12;
    const phase = rand() * 6.28;
    palmSpecs.push({ x, y: y - 0.2, z, s, rot, tilt, phase, tint: (phase * 7.31) % 1 });
    colliders.push({ x, z, r: 0.5 * s });
  }
  const palms = buildPalms(palmSpecs);
  group.add(palms.trunk, palms.leaves, palms.nuts);

  // Houses: villages in the harbour town, a few at the beach and on the hills.
  const villages = [
    { zone: 'haven', x: 250, z: 70, n: 22, r: 100 },
    { zone: 'strand', x: 20, z: 230, n: 6, r: 80 },
    { zone: 'heuvels', x: -40, z: 10, n: 10, r: 150 },
    { zone: 'kaap', x: -270, z: -150, n: 3, r: 60 },
    { zone: 'vliegveld', x: 470, z: -300, n: 3, r: 60 },
  ];
  for (const v of villages) {
    let placed = 0;
    for (let i = 0; i < v.n * 20 && placed < v.n; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * v.r;
      const x = v.x + Math.cos(a) * d;
      const z = v.z + Math.sin(a) * d;
      const y = ground(x, z, 2.5);
      if (y === null || zoneAt(x, z) !== v.zone) continue;
      // Keep houses apart.
      if (group.children.some((c) => c.userData.house && Math.hypot(c.position.x - x, c.position.z - z) < 14)) continue;
      if (pathDistance(x, z) < 6) continue; // keep the paths free
      const obj = newHouse(rand, v.zone === 'haven' ? 1.4 : 1);
      obj.userData.house = true;
      // On a slope the lowest corner sets the height; the plinth hides the gap.
      const low = Math.min(y, heightAt(x + 4, z + 4), heightAt(x - 4, z + 4), heightAt(x + 4, z - 4), heightAt(x - 4, z - 4));
      place(obj, x, z, low - 0.15, Math.round(rand() * 4) * (Math.PI / 2), 1, obj.userData.radius);
      placed++;
    }
  }

  // The lighthouse on the cape (kept as it is: its lamp changes at night).
  const lh = lighthouse();
  const lx = -270;
  const lz = -150;
  place(lh, lx, lz, ground(lx, lz, 0) ?? 24, 0, 1, 3.2);
  const lamp = lh.getObjectByName('lamp').material;

  // Rocks along the shores and the mountain: one instanced mesh.
  for (let i = 0; i < 160; i++) {
    const x = (rand() - 0.5) * 1300;
    const z = (rand() - 0.5) * 1000;
    const y = heightAt(x, z);
    if (y < -0.5 || (y > 3 && zoneAt(x, z) !== 'vulkaan')) continue;
    const s = 0.7 + rand() * 2.2;
    const rot = rand() * Math.PI * 2;
    rockSpecs.push({ x, y, z, s, rot });
    colliders.push({ x, z, r: 1.1 * s });
  }
  // (Rock colliders are pushed in the same order as before: after the lighthouse.)
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), M.rock, rockSpecs.length);
  const color = new THREE.Color();
  rockSpecs.forEach((r, i) => {
    _euler.set(0, r.rot, 0);
    _quat.setFromEuler(_euler);
    _mat.compose(_pos.set(r.x, r.y, r.z), _quat, _scale.setScalar(r.s));
    rocks.setMatrixAt(i, _mat);
    rocks.setColorAt(i, color.set(ROCK_TINTS[i % ROCK_TINTS.length]));
  });
  rocks.instanceMatrix.needsUpdate = true;
  group.add(rocks);

  // The hotel in the hills, on the first flat enough spot near the middle.
  for (let i = 0, found = false; i < 400 && !found; i++) {
    const a = i * 2.4;
    const x = -30 + Math.cos(a) * i * 0.7;
    const z = 120 + Math.sin(a) * i * 0.7;
    const ys = [heightAt(x, z), heightAt(x + 14, z), heightAt(x - 14, z), heightAt(x, z + 8), heightAt(x, z - 8)];
    if (Math.min(...ys) > 3 && Math.max(...ys) - Math.min(...ys) < 2.2 && pathDistance(x, z) > 16 && zoneAt(x, z) === 'heuvels') {
      const obj = hotel();
      obj.userData.house = true;
      place(obj, x, z, Math.min(...ys) - 0.3, 0, 1, 16);
      colliders.at(-1).hotel = { x, z };
      found = true;
    }
  }

  // The harbour pier, on the shore east of Havenstad, and the boats along it.
  const boats = [];
  for (const ang of [0, -0.5, 0.5, -1, 1, 1.5, -1.5]) {
    const d = { x: Math.cos(ang), z: Math.sin(ang) };
    let r = 40;
    while (r < 220 && heightAt(250 + d.x * r, 70 + d.z * r) > 0.3) r += 1;
    if (r < 220) {
      const sx = 250 + d.x * (r - 3);
      const sz = 70 + d.z * (r - 3);
      const p = pier(sx, sz, d, 38, 0.2);
      group.add(p.group);
      boats.push(...p.boats);
      deckMerge.push(p.deck);
      break;
    }
  }

  // Street lamps along the paths near the towns.
  for (const [ax, az, bx, bz] of PATH_SEGMENTS) {
    const len = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s < len; s += 22) {
      const t = s / len;
      const x = ax + (bx - ax) * t + ((bz - az) / len) * 3.3;
      const z = az + (bz - az) * t - ((bx - ax) / len) * 3.3;
      const y = heightAt(x, z);
      const near = [[250, 70], [20, 230]].some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 130);
      if (!near || y < 2.5) continue;
      const lampObj = streetLamp();
      lampObj.position.set(x, y - 0.05, z);
      lampObj.rotation.y = Math.atan2(bz - az, bx - ax) > 0 ? Math.PI : 0;
      lamps.push(lampObj);
    }
  }

  // Merge the static buildings: houses (their anchors stay, so features can find them), the
  // lamps and the pier deck, into one mesh per colour.
  const houses = group.children.filter((c) => c.userData.house);
  const merged = bakeMeshes(houses, { space: group });
  for (const h of houses) h.clear();
  const lampMeshes = bakeMeshes(lamps, { space: group });
  const deckMeshes = bakeMeshes(deckMerge, { space: group });
  for (const d of deckMerge) d.clear();
  group.add(...merged, ...lampMeshes, ...deckMeshes);
  // Parasols and towels on the beaches (their own random numbers: the layout above is unchanged).
  addBeachDecor(group, { cx: 20, cz: 215, r: 70, n: 9, seed: 9001 });
  addBeachDecor(group, { cx: 300, cz: 95, r: 40, n: 4, seed: 9002 });

  /** Palms near the camera sway in the wind (the rest keep their last pose). */
  const swayPalms = (t, cam) => {
    const r2 = 160 * 160;
    for (let i = 0; i < palmSpecs.length; i++) {
      const p = palmSpecs[i];
      const dx = p.x - cam.x;
      const dz = p.z - cam.z;
      if (dx * dx + dz * dz > r2) continue;
      const w = Math.sin(t * 1.4 + p.phase) + 0.4 * Math.sin(t * 2.9 + p.phase * 2);
      palms.set(i, Math.cos(t * 1.1 + p.phase) * 0.018, w * 0.025);
    }
    palms.trunk.instanceMatrix.needsUpdate = true;
    palms.leaves.instanceMatrix.needsUpdate = true;
    palms.nuts.instanceMatrix.needsUpdate = true;
  };

  return { group, lamp, colliders, boats, swayPalms, palmCount: palmSpecs.length, rockCount: rockSpecs.length };
}
