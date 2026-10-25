// The bridge over the strait to Vuurtorenkaap, in the style of the Golden Gate: a flat road deck
// with orange side girders and railings, two tall orange towers with cross struts, two main
// cables that sag between the towers, and thin hangers down to the deck. Built in its own frame
// (z along the bridge from end a, x sideways, y up) and merged per colour.

import * as THREE from 'three';
import { mergeInPlace } from '../uiterlijk/merge.js';

const ORANGE = '#c4402f';
const ROAD = '#4b5058';
const CONCRETE = '#cbc4b8';
const HALF = 3; // walkable half width of the deck (metres)
const LEG_X = 4.2; // the towers' legs and the cables, from the middle
const TOWER_UP = 22; // tower tops above the deck

const MATS = {};
const mat = (c, extra = {}) => (MATS[c] ??= new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...extra }));
const BOX = new THREE.BoxGeometry(1, 1, 1);

function box(g, w, h, d, x, y, z, color, material) {
  const m = new THREE.Mesh(BOX, material ?? mat(color));
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  g.add(m);
  return m;
}

/**
 * Builds the bridge from a [x, z] to b [x, z] with the deck top at `top`; groundAt(x, z) is the
 * terrain (for the tower footings). Returns { group, walk, colliders, blockers }: walk is the deck
 * for world/decks.js, colliders keep the Mii between the railings, blockers keep boats off the towers.
 */
export function buildBridge(a, b, top, groundAt) {
  const dx0 = b[0] - a[0];
  const dz0 = b[1] - a[1];
  const L = Math.hypot(dx0, dz0);
  const dx = dx0 / L;
  const dz = dz0 / L;
  const world = (x, z) => ({ x: a[0] + dx * z + dz * x, z: a[1] + dz * z - dx * x });
  const g = new THREE.Group();

  // The deck: road, a white dashed middle line, orange girders under both edges, railings.
  box(g, HALF * 2 + 1, 0.5, L + 0.4, 0, top - 0.25, L / 2, ROAD);
  for (let z = 2; z < L - 1; z += 4) box(g, 0.15, 0.02, 1.6, 0, top + 0.01, z, '#f4f1e8');
  for (const s of [-1, 1]) {
    box(g, 0.35, 1.6, L, s * (HALF + 0.55), top - 0.9, L / 2, ORANGE);
    for (let z = 0; z <= L; z += 3) box(g, 0.4, 1.6, 0.2, s * (HALF + 0.55), top - 0.9, z, ORANGE);
    box(g, 0.1, 0.1, L, s * (HALF + 0.4), top + 1.05, L / 2, ORANGE);
    for (let z = 0; z <= L; z += 2) box(g, 0.08, 1.05, 0.08, s * (HALF + 0.4), top + 0.52, z, ORANGE);
  }

  // The towers, a quarter in from each end, and the cables between them.
  const towers = [L * 0.25, L * 0.75];
  const yTop = top + TOWER_UP;
  const blockers = [];
  for (const tz of towers) {
    const p = world(0, tz);
    const ground = Math.min(...[-1, 1].map((s) => groundAt(world(s * LEG_X, tz).x, world(s * LEG_X, tz).z)));
    const foot = Math.min(ground, 1.2);
    if (ground < 1.2) box(g, LEG_X * 2 + 3, 1.2 - ground + 1, 4.5, 0, (ground - 1 + 1.2) / 2, tz, CONCRETE); // footing in the water
    for (const s of [-1, 1]) box(g, 1.3, yTop - foot + 0.5, 1.7, s * LEG_X, (yTop + foot) / 2, tz, ORANGE);
    for (const y of [top - 4, top + 7, top + 14, top + 20.5]) box(g, LEG_X * 2 + 1.3, 1.0, 1.2, 0, y, tz, ORANGE);
    box(g, LEG_X * 2 + 1.8, 0.5, 2, 0, yTop + 0.25, tz, ORANGE);
    for (const s of [-1, 1]) box(g, 0.4, 0.4, 0.4, s * LEG_X, yTop + 0.7, tz, null, mat('#ff5040', { emissive: '#ff2a1a', emissiveIntensity: 0.8 }));
    if (ground < 0) blockers.push({ x: p.x, z: p.z, r: LEG_X + 2 });
  }
  // The cable's height along the bridge: sagging side spans from the anchors to the tower tops,
  // and a parabola between the towers down to just above the road.
  const [t1, t2] = towers;
  const low = top + 2.2;
  const cableY = (z) => {
    if (z <= t1) {
      const f = (z + 1) / (t1 + 1);
      return top + 0.8 + (yTop - top - 0.8) * f - 1.2 * Math.sin(Math.PI * f);
    }
    if (z >= t2) return cableY(t1 - (z - t2) * ((t1 + 1) / (L + 1 - t2)));
    const u = (z - (t1 + t2) / 2) / ((t2 - t1) / 2);
    return low + (yTop - low) * u * u;
  };
  for (const s of [-1, 1]) {
    const pts = [];
    for (let z = -1; z <= L + 1; z += 1) pts.push(new THREE.Vector3(s * LEG_X, cableY(z), z));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.2, 6), mat(ORANGE)));
    // Hangers from the cable to the deck edge, every 2.5 m (not through the towers).
    for (let z = 1.5; z < L - 1; z += 2.5) {
      if (towers.some((tz) => Math.abs(z - tz) < 1.2)) continue;
      const h = cableY(z) - top;
      if (h > 0.6) box(g, 0.07, h, 0.07, s * LEG_X, top + h / 2, z, ORANGE);
    }
    // Anchor blocks where the cables end, beside the road.
    for (const z of [-1.5, L + 1.5]) box(g, 1.4, 1.6, 2, s * LEG_X, top + 0.3, z, CONCRETE);
  }

  mergeInPlace(g);
  g.position.set(a[0], 0, a[1]);
  g.rotation.y = Math.atan2(dx, dz);
  for (const m of g.children) {
    m.castShadow = true;
    m.receiveShadow = true;
  }

  // The walkable deck, and colliders: a row along each railing, and the anchor blocks.
  const walk = { x0: a[0], z0: a[1], dx, dz, length: L, half: HALF, top, blockers };
  const colliders = [];
  for (let z = 0; z <= L; z += 0.8) for (const s of [-1, 1]) colliders.push({ ...world(s * (HALF + 0.3), z), r: 0.25, top });
  for (const z of [-1.5, L + 1.5]) for (const s of [-1, 1]) colliders.push({ ...world(s * LEG_X, z), r: 1.0, top });
  return { group: g, walk, colliders, blockers };
}
