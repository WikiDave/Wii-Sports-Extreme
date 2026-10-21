// The loods (warehouse) at the harbour of Havenstad: a steel shed with a blue gable roof, a big
// striped roll door at the front, and two production machines outside on the quay side.

import * as THREE from 'three';
import { box, wall, gableRoof, nameBoard, mailboxMesh, chestMesh, cotMesh } from './parts.js';

/** Builds the loods; `name` is painted on its name board. Returns the layout (see view.js). */
export function buildLoods(name) {
  const g = new THREE.Group();
  box(g, 18, 2.4, 14, 0, -1.0, 0, '#9aa3ad'); // plinth, sunk into the ground
  wall(g, 16, 6.5, 12, 0, 3.25, 0, '#dfe6ec');
  gableRoof(g, 17, 12.4, 3.6, 0, 6.5, 0, '#3a7bd5');
  // Roll door on the front (+z): horizontal bands, a frame on top.
  box(g, 9, 5.1, 0.2, 0, 2.55, 6.05, '#2c3440');
  for (let i = 0; i < 5; i++) box(g, 8.8, 0.8, 0.24, 0, 0.6 + i * 1.0, 6.14, i % 2 ? '#f2c14e' : '#3a7bd5');
  box(g, 10, 0.5, 0.4, 0, 5.45, 6.12, '#ffd24a');
  // Small windows high on the side walls.
  for (const x of [-8.1, 8.1]) for (const z of [-3, 3]) box(g, 0.12, 1.1, 1.6, x, 4.8, z, '#8fd2ff');
  const sign = nameBoard(name, 6.4);
  sign.position.set(-3.2, 0, 10.4);
  g.add(sign);
  const mailbox = mailboxMesh();
  mailbox.position.set(-8.4, 0, 8.3);
  g.add(mailbox);
  const chest = chestMesh();
  chest.position.set(-5.4, 0, 8.4);
  g.add(chest);
  const cot = cotMesh();
  cot.position.set(5.6, 0, 9.4);
  g.add(cot);
  return {
    group: g,
    colliders: [
      { x: -4.5, z: 0, r: 6.3 },
      { x: 4.5, z: 0, r: 6.3 },
    ],
    entrance: { x: 0, z: 8.6 },
    chest: { x: -5.4, y: 0, z: 8.4, rot: 0 },
    bed: { x: 5.6, y: 0, z: 9.4, rot: 0 },
    mailbox: { x: -8.4, y: 0, z: 8.3 },
    machines: [
      { x: -12.6, z: -2.2 },
      { x: -12.6, z: 1.8 },
    ],
    // Upgrade places: lock on the roll door, cameras, crates, a lamp by the cot, flowers and lanterns.
    up: {
      lock: { x: 4.6, y: 4.4, z: 6.2 },
      cams: [
        { x: -7.6, y: 5.6, z: 6.1, rot: 0 },
        { x: 7.6, y: 5.6, z: -6.1, rot: Math.PI },
      ],
      crates: [
        { x: -9.5, z: -4.5 },
        { x: -9.5, z: -2.6 },
        { x: -9.5, z: -0.7 },
      ],
      lamps: [{ x: 7.6, z: 9.4 }],
      flowers: [
        { x: 1.2, z: 10.6, rot: 0 },
        { x: -1.4, z: 11.6, rot: 0 },
      ],
      lanterns: [
        { x: 3.6, z: 6.6 },
        { x: -6.2, z: 6.6 },
      ],
      bed: { x: 5.6, z: 9.4 },
      machines: [
        { x: -12.6, z: -2.2 },
        { x: -12.6, z: 1.8 },
      ],
    },
  };
}
