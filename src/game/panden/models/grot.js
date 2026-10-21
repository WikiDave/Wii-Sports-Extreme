// The grotkeuken: a cave kitchen in the volcano. A rock face with an arched tunnel mouth, lit by
// warm lanterns, and a stone terrace in front where the machines stand. The front looks downhill.

import * as THREE from 'three';
import { box, mat, nameBoard, mailboxMesh, chestMesh, bedrollMesh, glow } from './parts.js';

/** The arch of the tunnel mouth: a half-disc of dark rock with an arched top at (0, 0). */
function archShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
  s.lineTo(-w / 2, 0);
  return s;
}

/** Builds the grot; `name` is painted on its sign. Returns the layout (see view.js). */
export function buildGrot(name) {
  const g = new THREE.Group();
  // Stone terrace, thick so it sits on a slope (its front may drop 4 m below the back).
  box(g, 20, 8.1, 9.5, 0, -3.95, 1.25, '#8c8178');
  // Rock face with the mouth in its front (z = -3.5). Boulders on top.
  box(g, 20, 10, 7, 0, 5, -7, '#6e625a');
  for (const [x, y, z, s] of [
    [-7, 10.2, -7, 2.8],
    [6.5, 10.6, -7.5, 3.4],
    [0, 11, -6.2, 2.4],
    [-10.2, 6.5, -5, 2.6],
    [10.4, 6, -6, 2.4],
  ]) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat('#7b6e65'));
    rock.scale.set(s, s * 0.7, s * 0.9);
    rock.position.set(x, y, z);
    g.add(rock);
  }
  // The tunnel mouth: dark stone inside a lit arch.
  const mouth = new THREE.Mesh(new THREE.ShapeGeometry(archShape(4.4, 4.6), 14), mat('#150f0c'));
  mouth.position.set(0, 0, -3.44);
  g.add(mouth);
  const glowMat = glow('#ffa64a', 1.5);
  for (const x of [-2.2, 2.2]) box(g, 0.32, 2.5, 0.3, x, 1.25, -3.4, null, glowMat);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.16, 6, 18, Math.PI), glowMat);
  arch.position.set(0, 2.45, -3.42);
  g.add(arch);
  // Lanterns inside the mouth, and the name board on the terrace.
  for (const [x, y] of [[-1.1, 1.4], [1.1, 1.4], [0, 3.4]]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), glowMat);
    lamp.position.set(x, y, -3.3);
    g.add(lamp);
  }
  const sign = nameBoard(name, 6);
  sign.position.set(-6.4, 0, 6.5);
  g.add(sign);
  // Things on the terrace.
  const chest = chestMesh();
  chest.position.set(7.2, 0, -1.4);
  g.add(chest);
  const bedroll = bedrollMesh('#3a9ad9');
  bedroll.position.set(-7.4, 0, -1.2);
  g.add(bedroll);
  const mailbox = mailboxMesh();
  mailbox.position.set(-9.4, 0, 1.6);
  g.add(mailbox);
  return {
    group: g,
    colliders: [
      { x: -6, z: -7, r: 4.8 },
      { x: 6, z: -7, r: 4.8 },
    ],
    entrance: { x: 0, z: 0.4 },
    chest: { x: 7.2, y: 0, z: -1.4, rot: 0 },
    bed: { x: -7.4, y: 0, z: -1.2, rot: 0 },
    mailbox: { x: -9.4, y: 0, z: 1.6 },
    machines: [
      { x: -6.4, z: 3.6 },
      { x: -2.2, z: 4.4 },
      { x: 2.2, z: 4.4 },
      { x: 6.4, z: 3.6 },
    ],
    up: {
      lock: { x: 2.4, y: 1.4, z: -3.3 },
      cams: [
        { x: -8.8, y: 4.6, z: -3.3, rot: 0 },
        { x: 8.8, y: 4.6, z: -3.3, rot: 0 },
      ],
      crates: [
        { x: 8.6, z: 2.4 },
        { x: 8.6, z: 3.9 },
        { x: 9.6, z: 2.4 },
      ],
      lamps: [{ x: -8.6, z: -0.2 }],
      flowers: [
        { x: -3.4, z: 0.2, rot: 0 },
        { x: 3.4, z: 0.2, rot: 0 },
      ],
      lanterns: [
        { x: -4.6, z: 1.0 },
        { x: 4.6, z: 1.0 },
      ],
      bed: { x: -7.4, z: -1.2 },
    },
  };
}
