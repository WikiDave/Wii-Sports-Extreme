// The new buildings you can walk into, seen from outside: the beach bar (an open-fronted
// shelter with a sign), the clothes shop in Havenstad, the windmill on the hill (its sails turn),
// and the door at the foot of the lighthouse. Each one reports its door and the spot outside it.

import * as THREE from 'three';
import { box, cyl } from '../interior/common.js';
import { mat } from '../mats.js';
import { textBoard } from '../interior/common.js';
import { LIGHTHOUSE } from './sites.js';

/** The beach bar: thatched roof on posts, a sea-blue back wall, an open front and a sign. */
export function beachBar(site) {
  const g = new THREE.Group();
  const { x, z } = site;
  const y = site.y;
  g.add(box(12.6, 0.4, 9.6, '#e8c79a', x, y + 0.2, z)); // deck
  g.add(box(12, 3.4, 0.5, '#c9955a', x, y + 2.0, z - 4.4)); // back wall
  g.add(box(0.5, 3.4, 9, '#c9955a', x - 5.9, y + 2.0, z)); // side walls
  g.add(box(0.5, 3.4, 9, '#c9955a', x + 5.9, y + 2.0, z));
  for (const dx of [-3.4, -1.2, 1.2, 3.4]) g.add(box(0.3, 1.4, 0.3, '#8a5a30', x + dx, y + 0.9, z + 4.3)); // low front rail posts
  // The back wall shows the sea through two windows.
  for (const wx of [-3, 3]) g.add(box(2.4, 1.6, 0.12, '#3aa6d9', x + wx, y + 2.3, z - 4.1));
  // Roof: a flat thatch on four posts, overhanging the front.
  for (const [px, pz] of [[-5.6, -4], [5.6, -4], [-5.6, 4.6], [5.6, 4.6]]) g.add(cyl(0.22, 0.22, 4.2, '#8a5a30', x + px, y + 2.1, z + pz, 6));
  g.add(box(13.4, 0.4, 11.2, '#d9a86a', x, y + 4.4, z + 0.3));
  g.add(box(13.2, 0.5, 2.4, '#e2b97a', x, y + 4.2, z - 4.6));
  const sign = textBoard(['STRANDBAR'], 4.2, 1.0, { bg: '#2fb5a6', fg: '#ffffff', size: 64 });
  sign.position.set(x, y + 3.2, z + 4.9);
  g.add(sign);
  // Bar stools and a parasol outside.
  for (const sx of [-2.6, 2.6]) {
    g.add(cyl(0.4, 0.4, 0.14, '#e2513f', x + sx, y + 1.0, z + 6.6, 10));
    g.add(cyl(0.07, 0.07, 0.9, '#8a5a30', x + sx, y + 0.5, z + 6.6, 6));
  }
  const parasol = cyl(0.05, 0.05, 3.2, '#ffffff', x + 7.6, y + 1.6, z + 5.4, 6);
  g.add(parasol);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.8, 8), mat('#ff7aa8'));
  canopy.position.set(x + 7.6, y + 3.4, z + 5.4);
  g.add(canopy);
  const door = { x, z: z + 4.0, r: 3.2, out: { x, z: z + 7.4 } };
  return { group: g, colliders: [{ x, z, r: 6.6 }], door };
}

/** The clothes shop in Havenstad: a white house with a striped awning, mannequins in the window. */
export function clothesShop(site) {
  const g = new THREE.Group();
  const { x, z } = site;
  const y = site.y;
  g.add(box(9, 4.4, 7, '#fff1d6', x, y + 2.2, z));
  g.add(box(9.6, 0.3, 7.6, '#8a5a30', x, y + 4.55, z));
  const roof = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.3, 4.6), mat('#2fb5a6'));
  roof.position.set(x, y + 5.3, z);
  roof.rotation.x = 0.42;
  g.add(roof);
  const roof2 = roof.clone();
  roof2.rotation.x = -0.42;
  roof2.position.set(x, y + 5.3, z);
  g.add(roof2);
  // The shop front: two windows, the door between, and a striped awning.
  for (const wx of [-2.6, 2.6]) {
    g.add(box(2.6, 2.3, 0.12, '#bfe8ff', x + wx, y + 2.3, z + 3.56));
    g.add(box(2.8, 0.14, 0.14, '#ffffff', x + wx, y + 3.5, z + 3.6));
    for (let k = 0; k < 3; k++) {
      const mx = x + wx - 0.7 + k * 0.7;
      const colour = ['#ff7aa8', '#3a9ad9', '#ffe14a'][k];
      g.add(cyl(0.12, 0.16, 1.3, colour, mx, y + 1.5, z + 3.0, 8));
      g.add(cyl(0.1, 0.1, 0.6, '#ffffff', mx, y + 2.7, z + 3.0, 8));
    }
  }
  g.add(box(1.5, 2.8, 0.14, '#3a9ad9', x, y + 1.4, z + 3.56));
  for (let i = 0; i < 6; i++) g.add(box(0.7, 0.45, 0.2, i % 2 ? '#ffffff' : '#e2513f', x - 3.1 + i * 1.2, y + 4.0, z + 4.4));
  const sign = textBoard(['KLEDING'], 4.0, 0.9, { bg: '#ffffff', fg: '#e2513f', size: 62 });
  sign.position.set(x, y + 3.85, z + 3.66);
  g.add(sign);
  const door = { x, z: z + 4.1, r: 2.8, out: { x, z: z + 6.3 } };
  return { group: g, colliders: [{ x, z, r: 6.2 }], door };
}

/** The windmill on the hill: a tower, a cap, a little door and four sails that turn. */
export function windmill(site) {
  const g = new THREE.Group();
  const { x, z } = site;
  const y = site.y;
  g.add(cyl(2.0, 2.7, 9, '#fff4e0', x, y + 4.5, z, 12));
  g.add(cyl(2.3, 2.3, 0.4, '#e2513f', x, y + 9.2, z, 12));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.3, 2.4, 12), mat('#e2513f'));
  cap.position.set(x, y + 10.6, z);
  g.add(cap);
  g.add(box(1.0, 2.0, 0.2, '#a8743a', x, y + 1.0, z + 2.5));
  g.add(box(0.8, 0.8, 0.12, '#bfe8ff', x, y + 4.4, z + 2.55));
  const rotor = new THREE.Group();
  rotor.position.set(x, y + 7.8, z + 2.9);
  for (let i = 0; i < 4; i++) {
    const sail = new THREE.Group();
    sail.add(box(0.4, 5.8, 0.1, '#a8743a', 0, 2.9, 0));
    sail.add(box(1.6, 3.8, 0.06, '#fffdf6', 0.9, 2.9, 0.1));
    sail.rotation.z = (i / 4) * Math.PI * 2;
    rotor.add(sail);
  }
  g.add(rotor);
  return { group: g, colliders: [{ x, z, r: 3.2 }], rotor };
}

/** The lighthouse door: a wooden door in the foot of the tower, facing the sea. */
export function lighthouseDoor(site) {
  const g = new THREE.Group();
  const { x, z } = LIGHTHOUSE;
  const y = site.y;
  g.add(box(1.5, 2.4, 0.22, '#a8743a', x, y + 1.2, z + 3.02));
  g.add(box(1.8, 0.2, 0.3, '#ffffff', x, y + 2.5, z + 3.05));
  g.add(box(0.2, 0.2, 0.2, '#ffd24a', x + 0.5, y + 1.2, z + 3.2));
  const door = { x, z: z + 4.6, r: 2.6, out: { x, z: z + 6.2 } };
  return { group: g, door };
}
