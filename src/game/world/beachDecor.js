// Beach decoration: parasols with a towel on the dry sand, placed with their own seeded random
// generator (so the rest of the island is unchanged). They are walk-through decoration with no
// colliders, merged into one mesh per colour.

import * as THREE from 'three';
import { heightAt, zoneAt } from './island.js';
import { bakeMeshes } from '../uiterlijk/merge.js';

const CANOPY = ['#e2513f', '#ffffff', '#3a9ad9', '#ffe14a', '#2fb5a6'];
const TOWEL = ['#3a9ad9', '#ffe14a', '#ff8fb1', '#2fb5a6', '#f09a3a'];
const mat = (() => {
  const cache = new Map();
  return (color) => {
    if (!cache.has(color)) cache.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
    return cache.get(color);
  };
})();
const POLE = mat('#f2efe6');
const POLE_GEO = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6);
const CANOPY_GEO = new THREE.ConeGeometry(1.5, 0.7, 8);
const TOWEL_GEO = new THREE.BoxGeometry(1.2, 0.05, 0.62);

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/**
 * Adds up to n parasols with towels to `group`, on dry sand within r metres of (cx, cz).
 * Returns the number placed.
 */
export function addBeachDecor(group, { cx, cz, r, n, seed }) {
  const rand = rng(seed);
  const parts = [];
  for (let i = 0; i < n * 14 && parts.length < n; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * r;
    const x = cx + Math.cos(a) * d;
    const z = cz + Math.sin(a) * d;
    const y = heightAt(x, z);
    if (y < 0.9 || y > 4 || zoneAt(x, z) === null) continue; // dry sand only
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    holder.rotation.y = rand() * Math.PI * 2;
    const pole = new THREE.Mesh(POLE_GEO, POLE);
    pole.position.y = 1.2;
    const canopy = new THREE.Mesh(CANOPY_GEO, mat(CANOPY[Math.floor(rand() * CANOPY.length)]));
    canopy.position.y = 2.5;
    canopy.rotation.y = Math.PI / 8;
    const towel = new THREE.Mesh(TOWEL_GEO, mat(TOWEL[Math.floor(rand() * TOWEL.length)]));
    towel.position.set(1.25, 0.05, 0.3);
    towel.rotation.y = rand() * 0.6 - 0.3;
    holder.add(pole, canopy, towel);
    parts.push(holder);
  }
  const meshes = bakeMeshes(parts, { space: group });
  if (meshes.length) group.add(...meshes); // three.js complains about an add() with no objects
  return parts.length;
}
