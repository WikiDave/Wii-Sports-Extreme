// The villa in the resort hills: a two-storey house with a gable roof, a veranda on white columns,
// a garden with a pool and palms, a sun lounger under a parasol, and a side wing for the machines.

import * as THREE from 'three';
import { box, wall, gableRoof, cyl, cone, palm, nameBoard, mailboxMesh, chestMesh, loungerMesh } from './parts.js';
import { windowGlass } from '../../world/buildings.js';

/** Builds the villa; `name` is painted on its name board. Returns the layout (see view.js). */
export function buildVilla(name) {
  const g = new THREE.Group();
  box(g, 16.4, 2.4, 11.4, 0, -1.0, -3, '#d9c39c'); // plinth
  wall(g, 14, 4.2, 9, 0, 2.3, -3, '#fff4e0'); // ground floor
  wall(g, 13, 3.4, 8.4, 0, 6.0, -3.2, '#fff4e0'); // first floor
  gableRoof(g, 14, 9.6, 2.8, 0, 7.7, -3.2, '#e2513f');
  // Windows, glowing at night (windowGlass), and the front door.
  for (const x of [-4.2, 4.2]) box(g, 2.4, 2.2, 0.12, x, 2.2, 1.56, null, windowGlass);
  for (const x of [-3.5, 3.5]) box(g, 2.2, 1.8, 0.12, x, 5.6, 1.04, null, windowGlass);
  box(g, 1.7, 2.6, 0.16, 0, 1.5, 1.6, '#3a9ad9');
  // Veranda: a floor, a flat roof on white columns.
  box(g, 14, 0.3, 4.2, 0, 0.15, 3.6, '#f2e6cc');
  box(g, 14.4, 0.4, 4.4, 0, 4.6, 3.6, '#fff4e0');
  for (const x of [-6.4, -2.2, 2.2, 6.4]) cyl(g, 0.2, 4.1, x, 2.35, 5.5, '#ffffff');
  // Garden: a pool with a raised rim, palms, a parasol and a sun lounger.
  box(g, 7.8, 0.9, 4.3, -9.5, 0.45, 9.5, '#ffffff');
  box(g, 6.6, 0.1, 3.1, -9.5, 0.84, 9.5, '#4fd3ff');
  palm(g, -13, 3.5, 1.0, 0.1);
  palm(g, 12.5, 10, 1.0, -0.12);
  palm(g, 13, -9, 1.1, 0.1);
  palm(g, -12.5, -8, 0.9, 0.08);
  cyl(g, 0.08, 2.6, 5.5, 1.3, 7.0, '#ffffff');
  cone(g, 2.2, 0.9, 5.5, 2.9, 7.0, '#ff6f61');
  const lounger = loungerMesh('#ff8a6b');
  lounger.position.set(5.5, 0, 9.2);
  g.add(lounger);
  const chest = chestMesh();
  chest.position.set(-6.4, 0.3, 4.2);
  g.add(chest);
  const mailbox = mailboxMesh();
  mailbox.position.set(-9.2, 0, 5.4);
  g.add(mailbox);
  const sign = nameBoard(name, 4.8);
  sign.position.set(-2.6, 0, 7.9);
  g.add(sign);
  return {
    group: g,
    colliders: [
      { x: -4.6, z: -3, r: 4.6 },
      { x: 4.6, z: -3, r: 4.6 },
      { x: -9.5, z: 9.5, r: 4.4 },
      { x: -13, z: 3.5, r: 0.6 },
      { x: 12.5, z: 10, r: 0.6 },
      { x: 13, z: -9, r: 0.6 },
      { x: -12.5, z: -8, r: 0.6 },
    ],
    entrance: { x: 0, z: 6.4 },
    chest: { x: -6.4, y: 0.3, z: 4.2, rot: 0 },
    bed: { x: 5.5, y: 0, z: 9.2, rot: 0 },
    mailbox: { x: -9.2, y: 0, z: 5.4 },
    machines: [
      { x: 10.6, z: -4 },
      { x: 10.6, z: -1 },
      { x: 10.6, z: 2 },
    ],
    up: {
      lock: { x: 0.9, y: 2.9, z: 1.7 },
      cams: [
        { x: -6.9, y: 3.8, z: 5.6, rot: 0 },
        { x: 6.9, y: 3.8, z: 5.6, rot: 0 },
      ],
      crates: [
        { x: 8.6, z: 5.4 },
        { x: 8.6, z: 7.1 },
        { x: 9.8, z: 5.4 },
      ],
      lamps: [{ x: 7.4, z: 9.9 }],
      flowers: [
        { x: -4.2, z: 9.5, rot: 0 },
        { x: 2.4, z: 9.8, rot: 0 },
      ],
      lanterns: [
        { x: -6.2, z: 7.2 },
        { x: 6.2, z: 7.2 },
      ],
      bed: { x: 5.5, z: 9.2 },
    },
  };
}
