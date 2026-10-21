// The beach hut: the player's home base. Door faces +z (south), a sign above it. Beside it: a
// chest on the porch (storage), a beach lounger (sleep), a mailbox, and the upgrade parts.
// The island places the hut; this file only builds it (origin at the hut's ground).

import * as THREE from 'three';
import { wall, chestMesh, loungerMesh, mailboxMesh, mat } from '../panden/models/parts.js';
import { addUpgradeParts } from '../panden/models/upgrades3d.js';

/** Where the hut's things stand, in its local coordinates (see panden/view.js). */
export const HUT_LAYOUT = {
  chest: { x: 1.8, y: 0.3, z: 4.4, rot: 0 },
  bed: { x: -6.0, y: 0, z: 1.2, rot: 0 },
  mailbox: { x: -3.7, y: 0, z: 4.6 },
  up: {
    lock: { x: 1.2, y: 1.6, z: 3.75 },
    cams: [
      { x: -1.9, y: 3.5, z: 3.7, rot: 0 },
      { x: 2.6, y: 3.2, z: -3.6, rot: Math.PI },
    ],
    crates: [
      { x: 6.2, z: -1.5 },
      { x: 6.2, z: 0.2 },
      { x: 6.2, z: -3.2 },
    ],
    lamps: [{ x: -4.6, z: 3.2 }],
    flowers: [
      { x: -2.4, y: 0, z: 6.0, rot: 0 },
      { x: 2.4, y: 0, z: 6.0, rot: 0 },
    ],
    lanterns: [
      { x: -4.8, z: 5.4 },
      { x: 4.8, z: 5.4 },
    ],
    bed: { x: -6.0, z: 1.2 },
  },
};

export function buildHut() {
  const g = new THREE.Group();
  g.userData.property = 'hut';
  const roof = mat('#3a9ad9');
  const wood = mat('#a8743a');
  wall(g, 8.4, 4.6, 7, 0, 2.3, 0, '#ffe2a8');
  const top = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3.4, 4), roof);
  top.rotation.y = Math.PI / 4;
  top.position.y = 6.3;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.3), wood);
  door.position.set(0, 1.4, 3.55);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.2), mat('#e2513f'));
  sign.position.set(0, 3.9, 3.6);
  const porch = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 2), wood);
  porch.position.set(0, 0.15, 4.2);
  const window_ = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.2), mat('#bfe8ff'));
  window_.position.set(-2.6, 2.6, 3.55);
  const window2 = window_.clone();
  window2.position.x = 2.6;
  g.add(top, door, sign, porch, window_, window2);
  const chest = chestMesh();
  chest.position.set(HUT_LAYOUT.chest.x, HUT_LAYOUT.chest.y, HUT_LAYOUT.chest.z);
  const bed = loungerMesh('#ff6f61');
  bed.position.set(HUT_LAYOUT.bed.x, 0, HUT_LAYOUT.bed.z);
  const mailbox = mailboxMesh();
  mailbox.position.set(HUT_LAYOUT.mailbox.x, 0, HUT_LAYOUT.mailbox.z);
  g.add(chest, bed, mailbox);
  addUpgradeParts(g, HUT_LAYOUT);
  return g;
}
