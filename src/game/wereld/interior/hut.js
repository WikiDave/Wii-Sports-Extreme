// The inside of the beach hut: a bed, a table with a lamp, shelves of stock, a window with
// daylight on the floor. The bed opens the hut menu (save, stock, sleep).

import * as THREE from 'three';
import { box, cyl, ball, roomShell, solid } from './common.js';
import { makeDef, item } from './def.js';
import { mat } from '../mats.js';
import { openHutMenu } from '../../ui/hutMenu.js';

/** env: { game, exit() } from the feature (see feature wereld.js). */
export function buildHut(env, o) {
  const g = new THREE.Group();
  const x0 = o.x - 4.5;
  const x1 = o.x + 4.5;
  const z0 = o.z - 3.5;
  const z1 = o.z + 3.5;
  const bounds = roomShell(g, { x0, x1, z0, z1, y0: o.y, h: 3.4, floor: '#c9955a', wall: '#ffe2a8', trim: '#ffffff', door: { x: o.x, w: 1.8 } });
  const wood = '#a8743a';
  const solids = [];

  // Bed against the back wall: frame, mattress, blue blanket, two pillows, headboard.
  const bx = o.x - 2.6;
  const bz = o.z + 1.8;
  g.add(box(2.0, 0.55, 3.0, wood, bx, o.y + 0.28, bz));
  g.add(box(1.8, 0.35, 2.9, '#ffffff', bx, o.y + 0.72, bz));
  g.add(box(1.85, 0.14, 2.0, '#3a9ad9', bx, o.y + 0.94, bz + 0.5));
  g.add(box(0.75, 0.25, 0.5, '#fff8ef', bx - 0.35, o.y + 0.95, bz - 1.15));
  g.add(box(0.75, 0.25, 0.5, '#fff8ef', bx + 0.35, o.y + 0.95, bz - 1.15));
  g.add(box(2.1, 1.25, 0.2, wood, bx, o.y + 0.62, o.z + 3.25));
  solids.push(solid(bx - 1.0, bx + 1.0, bz - 1.5, bz + 1.5));

  // Table with two chairs and a lamp.
  const tx = o.x + 1.6;
  const tz = o.z - 0.6;
  g.add(box(1.4, 0.1, 1.4, '#fff4e0', tx, o.y + 1.0, tz));
  for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) g.add(box(0.12, 1.0, 0.12, wood, tx + dx, o.y + 0.5, tz + dz));
  solids.push(solid(tx - 0.8, tx + 0.8, tz - 0.8, tz + 0.8));
  for (const cz of [tz - 1.4, tz + 1.4]) {
    g.add(box(0.6, 0.08, 0.6, wood, tx, o.y + 0.55, cz));
    g.add(box(0.6, 0.7, 0.08, wood, tx, o.y + 0.95, cz + (cz < tz ? -0.26 : 0.26)));
    solids.push(solid(tx - 0.35, tx + 0.35, cz - 0.35, cz + 0.35));
  }
  g.add(cyl(0.14, 0.18, 0.2, '#e2513f', tx - 0.2, o.y + 1.15, tz + 0.1));
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.36, 10, 1, true), mat('#ffb347', { side: THREE.DoubleSide }));
  shade.position.set(tx - 0.2, o.y + 1.42, tz + 0.1);
  g.add(shade);

  // Shelves of stock along the left wall: bottles of lemonade, candy and ice.
  const sx = x0 + 0.5;
  g.add(box(0.5, 2.3, 3.2, wood, sx, o.y + 1.15, o.z - 0.8));
  solids.push(solid(sx - 0.3, sx + 0.3, o.z - 2.5, o.z + 0.8));
  const bottles = ['#ffd820', '#ff6e19', '#f55a7d', '#3caade', '#78d220', '#ffffff'];
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < 4; i++) {
      const c = bottles[(s * 4 + i) % bottles.length];
      g.add(box(0.28, 0.5, 0.28, c, sx + 0.12, o.y + 0.5 + s * 0.75, o.z - 2.0 + i * 0.7));
    }
  }
  // A plant in the corner and a rug on the floor.
  g.add(box(3.2, 0.03, 2.2, '#e2513f', o.x + 0.2, o.y + 0.02, o.z + 0.3));
  g.add(cyl(0.4, 0.34, 0.6, '#c96a3a', o.x + 3.5, o.y + 0.3, o.z - 2.6));
  g.add(ball(0.75, '#4fb43f', o.x + 3.5, o.y + 1.2, o.z - 2.6, 1.1));

  // The window on the right wall: frame, glass and a patch of sun on the floor.
  const wz = o.z - 0.3;
  g.add(box(0.1, 1.5, 2.0, '#ffffff', x1 - 0.02, o.y + 2.2, wz));
  g.add(box(0.12, 1.25, 1.75, '#bfe8ff', x1 - 0.08, o.y + 2.2, wz, { mat: mat('#bfe8ff', { emissive: '#8fd2ff', emissiveIntensity: 0.6 }) }));
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.8), new THREE.MeshBasicMaterial({ color: '#fff0c0', transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
  sun.rotation.x = -Math.PI / 2;
  sun.rotation.z = 0.5;
  sun.position.set(x1 - 2.2, o.y + 0.03, wz + 0.2);
  g.add(sun);

  // A hanging lamp in the middle of the room.
  g.add(cyl(0.02, 0.02, 1.1, '#3a4452', o.x, o.y + 3.95, o.z));
  const hang = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.45, 10, 1, true), mat('#fff1c8', { side: THREE.DoubleSide }));
  hang.position.set(o.x, o.y + 3.35, o.z);
  g.add(hang);

  const items = [
    item(o.x, z0 + 0.6, 1.5, 'Naar buiten', () => env.exit()),
    item(bx, bz, 2.3, 'Bed: slapen en voorraad', () => openHutMenu(env.game)),
  ];
  return makeDef({
    group: g,
    origin: o,
    bounds,
    solids,
    spawn: { x: o.x, z: o.z - 1.2 },
    heading: 0,
    items,
    ambient: 0.9,
    ambColor: '#ffe9c4',
    lamps: [
      { x: tx, y: o.y + 2.6, z: tz, color: '#ffd27a', intensity: 7, dist: 10 },
      { x: o.x, y: o.y + 3.0, z: o.z, color: '#ffe6b0', intensity: 6, dist: 11 },
    ],
    camDist: 6.2,
  });
}
