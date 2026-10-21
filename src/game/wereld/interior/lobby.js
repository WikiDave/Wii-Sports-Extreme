// The hotel lobby: reception desk with keys on the wall, a bell, two sofas, a coffee table,
// plants and a chandelier, and the bellboy who knows the gossip of the island.

import * as THREE from 'three';
import { box, cyl, ball, roomShell, solid, newMii, placeMii } from './common.js';
import { makeDef, item } from './def.js';
import { mat } from '../mats.js';
import { gossip } from '../gossip.js';

export function buildLobby(env, o) {
  const g = new THREE.Group();
  const x0 = o.x - 9;
  const x1 = o.x + 9;
  const z0 = o.z - 6;
  const z1 = o.z + 6;
  const bounds = roomShell(g, { x0, x1, z0, z1, y0: o.y, h: 4.2, floor: '#f2e6cf', wall: '#fff6e6', trim: '#2fb5a6', door: { x: o.x, w: 3.2 } });
  const solids = [];
  const wood = '#a8743a';

  // The red carpet from the door to the desk.
  g.add(box(2.6, 0.03, 8.6, '#c0283a', o.x, o.y + 0.02, o.z - 1.6));
  // Teal wainscot along the walls.
  g.add(box(0.1, 1.1, 11.6, '#2fb5a6', x0 + 0.08, o.y + 0.55, o.z));
  g.add(box(0.1, 1.1, 11.6, '#2fb5a6', x1 - 0.08, o.y + 0.55, o.z));
  g.add(box(17.6, 1.1, 0.1, '#2fb5a6', o.x, o.y + 0.55, z1 - 0.08));

  // Reception: the desk, its white top, a bell, and a board with key cabinets behind it.
  g.add(box(7.0, 1.1, 1.3, wood, o.x, o.y + 0.55, o.z + 3.4));
  g.add(box(7.3, 0.12, 1.6, '#fff4e0', o.x, o.y + 1.16, o.z + 3.4));
  g.add(cyl(0.2, 0.25, 0.14, '#ffd24a', o.x + 2.2, o.y + 1.29, o.z + 3.3, 12));
  g.add(box(6.6, 2.4, 0.18, '#fff4e0', o.x, o.y + 2.5, z1 - 0.25));
  for (let i = 0; i < 12; i++) {
    const c = ['#e2513f', '#3a9ad9', '#ffe14a', '#2fb5a6'][i % 4];
    g.add(box(0.4, 0.3, 0.1, c, o.x - 2.6 + (i % 6) * 1.04, o.y + 2.0 + Math.floor(i / 6) * 0.6, z1 - 0.12));
  }
  solids.push(solid(o.x - 3.7, o.x + 3.7, o.z + 2.7, o.z + 5.4));

  // Two sofas facing the desk, with a coffee table between them.
  for (const sx of [-5.6, 5.6]) {
    const x = o.x + sx;
    const z = o.z - 1.2;
    g.add(box(2.4, 0.5, 1.1, '#e2513f', x, o.y + 0.35, z));
    g.add(box(2.4, 0.9, 0.3, '#e2513f', x, o.y + 0.95, z - 0.45));
    g.add(box(0.3, 0.7, 1.1, '#e2513f', x - 1.15, o.y + 0.6, z));
    g.add(box(0.3, 0.7, 1.1, '#e2513f', x + 1.15, o.y + 0.6, z));
    solids.push(solid(x - 1.3, x + 1.3, z - 0.6, z + 0.6));
  }
  g.add(cyl(0.8, 0.8, 0.1, '#ffffff', o.x, o.y + 0.5, o.z - 1.2, 16));
  g.add(cyl(0.12, 0.12, 0.5, wood, o.x, o.y + 0.25, o.z - 1.2, 8));
  solids.push(solid(o.x - 0.9, o.x + 0.9, o.z - 2.1, o.z - 0.3));

  // Plants in pots, one in each corner.
  for (const [px, pz] of [[x0 + 1.2, z0 + 1.2], [x1 - 1.2, z0 + 1.2], [x0 + 1.2, z1 - 1.5], [x1 - 1.2, z1 - 1.5]]) {
    g.add(cyl(0.5, 0.42, 0.8, '#c96a3a', px, o.y + 0.4, pz, 10));
    g.add(ball(0.7, '#4fb43f', px, o.y + 1.5, pz, 1.2));
    g.add(ball(0.5, '#5ea93e', px + 0.3, o.y + 1.9, pz - 0.2, 1));
    solids.push(solid(px - 0.5, px + 0.5, pz - 0.5, pz + 0.5));
  }

  // The chandelier: a gold ring with six bulbs.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 6, 16), mat('#ffd24a'));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(o.x, o.y + 3.5, o.z);
  g.add(ring);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(ball(0.18, '#fff6d0', o.x + Math.cos(a) * 1.4, o.y + 3.35, o.z + Math.sin(a) * 1.4, 1, mat('#fff6d0', { emissive: '#ffd27a', emissiveIntensity: 0.9 })));
  }

  // The bellboy behind the desk, in a red uniform.
  const boy = newMii('Takumi', 0);
  placeMii(boy, o.x - 2.2, o.y, o.z + 4.7, Math.PI);
  g.add(boy.group);
  let talk = 0;
  const items = [
    item(o.x, z0 + 0.8, 1.6, 'Naar buiten', () => env.exit()),
    item(o.x - 2.2, o.z + 2.9, 2.2, 'Praat met de piccolo', () => env.toast(gossip(env.game.state.day, talk++))),
  ];
  return makeDef({
    group: g,
    origin: o,
    bounds,
    solids,
    spawn: { x: o.x, z: o.z - 3.2 },
    items,
    ambient: 1.0,
    ambColor: '#fff6e6',
    lamps: [
      { x: o.x, y: o.y + 3.4, z: o.z, color: '#fff1c8', intensity: 9, dist: 16 },
      { x: o.x - 5.6, y: o.y + 3.2, z: o.z - 1.2, color: '#ffe6b0', intensity: 6, dist: 10 },
      { x: o.x + 5.6, y: o.y + 3.2, z: o.z - 1.2, color: '#ffe6b0', intensity: 6, dist: 10 },
    ],
    camDist: 8,
  });
}
