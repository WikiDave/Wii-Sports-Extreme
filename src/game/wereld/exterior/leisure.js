// Places to spend a sunny day: the resort pool with sunbeds and parasols by the hotel, the skate
// park with its ramps and a rail, and the fishing jetty that runs out from the south beach.

import * as THREE from 'three';
import { box, cyl, newMii, placeMii } from '../interior/common.js';
import { mat } from '../mats.js';
import { pier } from '../../world/buildings.js';

const TOWEL = ['#e2513f', '#3a9ad9', '#ffe14a', '#2fb5a6'];
const HALF = { x: 6.5, z: 4.5 };

/**
 * The resort pool on a raised terrace: a plinth reaches down to the lowest ground under the
 * pool, the deck and the water sit above the highest point, so the pool is level on any slope.
 * Sunbeds in two rows, four parasols, and a white rim.
 */
export function resortPool(site, heightAt) {
  const g = new THREE.Group();
  const { x, z } = site;
  let hi = -Infinity;
  let lo = Infinity;
  for (let dx = -HALF.x; dx <= HALF.x + 0.01; dx += 2.2) {
    for (let dz = -HALF.z - 3; dz <= HALF.z + 3.01; dz += 1.8) {
      const h = heightAt(x + dx, z + dz);
      hi = Math.max(hi, h);
      lo = Math.min(lo, h);
    }
  }
  const top = hi + 0.3; // the deck
  const plinthH = top - lo + 0.4;
  g.add(box(HALF.x * 2 + 3, plinthH, HALF.z * 2 + 6, '#e9dcc0', x, lo - 0.4 + plinthH / 2, z));
  // The deck is a ring round the pool; the water lies a little lower, inside it.
  const deckW = 15;
  for (const [w, d, px, pz] of [[deckW, 2.5, 0, -(5 + 1.25)], [deckW, 2.5, 0, 5 + 1.25], [2.5, 5, -(5 + 1.25), 0], [2.5, 5, 5 + 1.25, 0]]) {
    g.add(box(w, 0.3, d, '#f6e7c8', x + px, top + 0.15, z + pz));
  }
  const water = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 6), mat('#4fd6ff', { emissive: '#1b8fc4', emissiveIntensity: 0.2 }));
  water.position.set(x, top + 0.02, z);
  g.add(water);
  // The white coping along the inner edge of the ring.
  for (const [w, d, px, pz] of [[10.4, 0.3, 0, -3.15], [10.4, 0.3, 0, 3.15], [0.3, 6.4, -5.15, 0], [0.3, 6.4, 5.15, 0]]) {
    g.add(box(w, 0.2, d, '#ffffff', x + px, top + 0.2, z + pz));
  }
  for (let i = -2; i <= 2; i++) g.add(box(0.5, 0.05, 0.5, '#2fb5a6', x + i * 2, top + 0.3, z + 3.4));
  // Sunbeds: a white frame, a towel and a backrest tilted up; they stand on the deck.
  const beds = [];
  for (const row of [-6.2, 6.4]) {
    for (let i = 0; i < 5; i++) {
      const bx = x - 4.2 + i * 2.1;
      const bz = z + row;
      const bed = new THREE.Group();
      bed.add(box(0.9, 0.2, 2.0, '#ffffff', 0, 0.45, 0));
      bed.add(box(0.8, 0.08, 1.8, TOWEL[(i + (row > 0 ? 1 : 0)) % TOWEL.length], 0, 0.58, 0));
      const back = box(0.9, 0.12, 1.0, '#ffffff', 0, 0.9, -1.1);
      back.rotation.x = -0.9;
      bed.add(back);
      bed.add(box(0.1, 0.45, 0.1, '#e8d8b8', 0.3, 0.22, 0.8));
      bed.add(box(0.1, 0.45, 0.1, '#e8d8b8', -0.3, 0.22, 0.8));
      bed.position.set(bx, top, bz);
      bed.rotation.y = row > 0 ? Math.PI : 0;
      g.add(bed);
      beds.push(bed);
    }
  }
  // Parasols in front of the rows.
  for (const [px, pz, c] of [[x - 4.4, z - 8.4, '#ff7aa8'], [x + 4.4, z - 8.4, '#ffe14a'], [x - 4.4, z + 9.2, '#3a9ad9'], [x + 4.4, z + 9.2, '#2fb5a6']]) {
    const pole = cyl(0.06, 0.06, 2.6, '#ffffff', px, heightAt(px, pz) + 1.3, pz, 6);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.8, 8), mat(c));
    canopy.position.set(px, heightAt(px, pz) + 2.7, pz);
    g.add(pole, canopy);
  }
  return { group: g, colliders: [{ x, z, r: 6.2 }], beds, top };
}

/** The skate park: two quarter pipes, a half pipe and a rail, all in concrete grey. */
export function skatePark(site) {
  const g = new THREE.Group();
  const { x, z } = site;
  const y = site.y;
  const concrete = '#c3c8ce';
  const quarter = (r) => {
    const geo = new THREE.CylinderGeometry(r, r, 6, 16, 1, true, 0, Math.PI / 2);
    return new THREE.Mesh(geo, mat(concrete, { side: THREE.DoubleSide }));
  };
  // A quarter pipe curls up from the ground in the x-y plane (its open side faces away).
  const qa = quarter(3.5);
  qa.rotation.set(Math.PI / 2, 0, 0);
  qa.position.set(x - 5, y + 0.1, z - 6);
  qa.rotation.y = Math.PI / 2;
  g.add(qa);
  const qb = quarter(3.5);
  qb.rotation.set(Math.PI / 2, 0, 0);
  qb.position.set(x + 5, y + 0.1, z + 6);
  qb.rotation.y = -Math.PI / 2;
  g.add(qb);
  // A half pipe: the semicircle lies along z.
  const half = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 9, 16, 1, true, 0, Math.PI), mat(concrete, { side: THREE.DoubleSide }));
  half.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  half.position.set(x + 0, y + 3.0, z + 0);
  g.add(half);
  // A rail: two posts and a bar.
  for (const dx of [-1.6, 1.6]) g.add(cyl(0.08, 0.08, 0.8, '#7a8794', x + dx, y + 0.4, z - 2.2, 6));
  g.add(cyl(0.07, 0.07, 3.6, '#c9d2dc', x, y + 0.82, z - 2.2, 6).rotateZ(Math.PI / 2));
  // Two skaters.
  const skaters = [newMii('Ren', 5), newMii('Rin', 9)];
  for (const s of skaters) g.add(s.group);
  return { group: g, colliders: [{ x, z, r: 6.5 }], skaters, centre: { x, y, z } };
}

/** The fishing jetty: a wooden pier from the beach into the sea with four moored boats. */
export function fishingJetty(site) {
  const dir = { x: 0, z: 1 };
  const p = pier(site.x, site.z, dir, site.length, site.y - 0.5);
  const g = new THREE.Group();
  g.add(p.group);
  // Two fishermen at the end, each with a rod and a float on the water.
  const end = { x: site.x, z: site.z + site.length - 1.5 };
  const men = [newMii('Andy', 1), newMii('Haru', 6)];
  const floats = [];
  men.forEach((m, i) => {
    const mx = end.x + (i ? -0.9 : 0.9);
    placeMii(m, mx, site.y + 0.15, end.z, i ? 0.4 : -0.4);
    g.add(m.group);
    const rod = cyl(0.03, 0.03, 3.4, '#6a4a2a', mx + (i ? -1.4 : 1.4), site.y + 2.6, end.z + 2.4, 4);
    rod.rotation.set(0.6, 0, i ? 0.8 : -0.8);
    g.add(rod);
    const float = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat('#e2513f'));
    float.position.set(mx + (i ? -2.4 : 2.4), 0.1, end.z + 5.0);
    g.add(float);
    floats.push(float);
  });
  g.add(cyl(0.3, 0.26, 0.5, '#e2513f', end.x, site.y + 0.5, end.z - 1.5, 8));
  return { group: g, boats: p.boats, men, floats, end, colliders: [{ x: end.x, z: end.z, r: 1.4 }] };
}
