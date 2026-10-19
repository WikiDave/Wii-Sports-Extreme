// Lowpoly props for the island: palms, houses, lighthouse, rocks. Flat colours, shared
// geometries and instancing, scattered with a seeded random so the island is always the same.

import * as THREE from 'three';
import { heightAt, zoneAt } from './island.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
const M = {
  trunk: mat('#a8743a'),
  leaf: mat('#4fb43f'),
  wall: mat('#fff4e0'),
  wallB: mat('#ffd9a8'),
  roof: mat('#e2513f'),
  roofB: mat('#3a9ad9'),
  white: mat('#ffffff'),
  red: mat('#e2513f'),
  rock: mat('#9a8f80'),
  glass: new THREE.MeshLambertMaterial({ color: '#ffe9a0', emissive: '#ffd24a', emissiveIntensity: 0.0 }),
};

function palm() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), M.trunk);
  trunk.position.y = 3.5;
  trunk.rotation.z = 0.12;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.7, 4.2, 4), M.leaf);
    leaf.scale.z = 0.25;
    leaf.position.set(0.8, 7.1, 0);
    leaf.rotation.set(0, (i / 6) * Math.PI * 2, 0);
    leaf.geometry.translate(0, 1.6, 0);
    leaf.rotation.z = -1.1;
    const pivot = new THREE.Group();
    pivot.position.set(0.8, 7, 0);
    leaf.position.set(0, 0, 0);
    pivot.rotation.y = (i / 6) * Math.PI * 2;
    pivot.add(leaf);
    g.add(pivot);
  }
  return g;
}

function house(wall, roof) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 6), wall);
  body.position.y = 2.25;
  const top = new THREE.Mesh(new THREE.ConeGeometry(5.8, 3, 4), roof);
  top.rotation.y = Math.PI / 4;
  top.position.y = 6;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.2), M.trunk);
  door.position.set(0, 1.1, 3.05);
  g.add(body, top, door);
  return g;
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

function rock() {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), M.rock);
  m.scale.set(1.3, 0.8, 1);
  return m;
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
  const place = (obj, x, z, y, rot = rand() * Math.PI * 2, s = 1, r = 0) => {
    if (r) colliders.push({ x, z, r: r * s });
    obj.position.set(x, y, z);
    obj.rotation.y = rot;
    obj.scale.setScalar(s);
    group.add(obj);
  };

  // Palms: dense on the beaches and shores, sparse inland.
  for (let i = 0; i < 700; i++) {
    const x = (rand() - 0.5) * 1300;
    const z = (rand() - 0.5) * 1000;
    const y = ground(x, z, 1.3);
    if (y === null || y > 14) continue;
    const zone = zoneAt(x, z);
    if (zone === 'vulkaan' || (y > 5 && rand() < 0.55)) continue;
    const obj = palm();
    place(obj, x, z, y - 0.2, undefined, 0.8 + rand() * 0.6, 0.5);
    obj.rotation.z = (rand() - 0.5) * 0.12;
  }

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
      const obj = house(rand() < 0.5 ? M.wall : M.wallB, rand() < 0.5 ? M.roof : M.roofB);
      obj.userData.house = true;
      place(obj, x, z, y - 0.3, Math.round(rand() * 4) * (Math.PI / 2), 1, 4.4);
      placed++;
    }
  }

  // The lighthouse on the cape.
  const lh = lighthouse();
  const lx = -270;
  const lz = -150;
  place(lh, lx, lz, ground(lx, lz, 0) ?? 24, 0, 1, 3.2);
  const lamp = lh.getObjectByName('lamp').material;

  // Rocks along the shores and the mountain.
  for (let i = 0; i < 160; i++) {
    const x = (rand() - 0.5) * 1300;
    const z = (rand() - 0.5) * 1000;
    const y = heightAt(x, z);
    if (y < -0.5 || (y > 3 && zoneAt(x, z) !== 'vulkaan')) continue;
    const obj = rock();
    place(obj, x, z, y, undefined, 0.7 + rand() * 2.2, 1.1);
  }

  return { group, lamp, colliders };
}
