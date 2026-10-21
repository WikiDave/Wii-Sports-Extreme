// The inside of the beach bar: a counter with stools, a menu board, shelves of bottles, a
// jukebox that plays a short jingle, and the barman. Ordinary drinks cost a few euros; the
// barman knows the gossip of the island.

import * as THREE from 'three';
import { box, cyl, roomShell, solid, newMii, placeMii, textBoard } from './common.js';
import { makeDef, item } from './def.js';
import { mat } from '../mats.js';
import { gossip } from '../gossip.js';
import { wereldOf } from '../progress.js';

const DRINK = 4;
const JINGLE = [523.25, 659.25, 783.99, 659.25, 880, 783.99, 659.25, 523.25];

export function buildBar(env, o) {
  const g = new THREE.Group();
  const x0 = o.x - 6;
  const x1 = o.x + 6;
  const z0 = o.z - 4.5;
  const z1 = o.z + 4.5;
  const bounds = roomShell(g, { x0, x1, z0, z1, y0: o.y, h: 3.4, floor: '#d9a86a', wall: '#e8c79a', trim: '#3a9ad9', door: { x: o.x, w: 3.6 } });
  const solids = [];
  const wood = '#8a5a30';

  // Sea painting on the back wall, and the menu board.
  g.add(box(3.2, 1.8, 0.08, '#fff4e0', o.x + 3.0, o.y + 2.0, z1 - 0.1));
  g.add(box(3.0, 1.6, 0.1, '#3aa6d9', o.x + 3.0, o.y + 2.0, z1 - 0.08));
  g.add(box(3.0, 0.3, 0.12, '#ffffff', o.x + 3.0, o.y + 1.45, z1 - 0.06));
  const menu = textBoard(['Limonade       €4', 'Ijsje            €3', 'Snoepje         €2', 'Kokosdrankje   €5'], 2.6, 1.6);
  menu.position.set(o.x - 3.2, o.y + 2.0, z1 - 0.1);
  menu.rotation.y = Math.PI;
  g.add(menu);

  // The counter, the bottle shelves behind it, and the barman.
  g.add(box(8.0, 1.2, 1.2, wood, o.x, o.y + 0.6, o.z + 1.8));
  g.add(box(8.3, 0.12, 1.5, '#fff4e0', o.x, o.y + 1.26, o.z + 1.8));
  solids.push(solid(o.x - 4.1, o.x + 4.1, o.z + 1.2, o.z + 3.4));
  g.add(box(7.4, 2.4, 0.5, wood, o.x, o.y + 1.2, o.z + 3.9));
  const bottles = ['#ffd820', '#ff6e19', '#f55a7d', '#3caade', '#78d220', '#ffffff', '#7328ad'];
  for (let s = 0; s < 3; s++) {
    g.add(box(7.2, 0.08, 0.5, '#c9955a', o.x, o.y + 0.9 + s * 0.7, o.z + 3.9));
    for (let i = 0; i < 9; i++) g.add(box(0.26, 0.5, 0.26, bottles[(s * 9 + i) % bottles.length], o.x - 3.2 + i * 0.8, o.y + 1.2 + s * 0.7, o.z + 3.9));
  }
  const barman = newMii('Shinnosuke', 10);
  placeMii(barman, o.x - 0.6, o.y, o.z + 3.0, Math.PI);
  g.add(barman.group);

  // Stools in front of the counter.
  for (let i = 0; i < 4; i++) {
    const sx = o.x - 3.3 + i * 2.2;
    g.add(cyl(0.42, 0.42, 0.14, '#e2513f', sx, o.y + 0.9, o.z + 0.5, 12));
    g.add(cyl(0.08, 0.08, 0.85, wood, sx, o.y + 0.45, o.z + 0.5, 6));
    solids.push(solid(sx - 0.45, sx + 0.45, o.z + 0.05, o.z + 0.95));
  }

  // A table with two chairs by the sea window.
  const tx = o.x - 3.9;
  const tz = o.z - 2.0;
  g.add(cyl(0.7, 0.7, 0.1, '#fff4e0', tx, o.y + 0.95, tz, 14));
  g.add(cyl(0.1, 0.1, 0.9, wood, tx, o.y + 0.47, tz, 6));
  solids.push(solid(tx - 0.75, tx + 0.75, tz - 0.75, tz + 0.75));
  for (const cx of [tx - 1.2, tx + 1.2]) {
    g.add(box(0.6, 0.08, 0.6, '#2fb5a6', cx, o.y + 0.5, tz));
    g.add(box(0.6, 0.7, 0.08, '#2fb5a6', cx, o.y + 0.9, tz + (cx < tx ? -0.26 : 0.26)));
    solids.push(solid(cx - 0.35, cx + 0.35, tz - 0.35, tz + 0.35));
  }

  // The jukebox: a coloured body with a glowing front that changes colour.
  const jx = o.x + 5;
  const jz = o.z - 2.6;
  g.add(box(1.1, 2.0, 0.9, '#e2513f', jx, o.y + 1.0, jz));
  g.add(cyl(0.55, 0.55, 1.1, '#e2513f', jx, o.y + 2.0, jz, 10, null));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.05), mat('#ffffff', { emissive: '#ffd24a', emissiveIntensity: 0.9 }));
  glass.position.set(jx, o.y + 1.2, jz + 0.48);
  g.add(glass);
  solids.push(solid(jx - 0.6, jx + 0.6, jz - 0.5, jz + 0.5));

  // Hanging lamps.
  for (const lx of [o.x - 3, o.x + 3]) {
    g.add(cyl(0.02, 0.02, 1.0, '#3a4452', lx, o.y + 3.9, o.z - 0.5));
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 10, 1, true), mat('#ffb347', { side: THREE.DoubleSide }));
    shade.position.set(lx, o.y + 3.2, o.z - 0.5);
    g.add(shade);
  }

  const music = () => wereldOf(env.game.state).muziek !== false;
  let talk = 0;
  const items = [
    item(o.x, z0 + 0.8, 1.6, 'Naar buiten', () => env.exit()),
    item(o.x + 1.0, o.z + 0.1, 1.8, `Bestel een limonade (€${DRINK})`, () => {
      if (!env.game.addCash(-DRINK)) return env.toast('Je hebt te weinig geld voor een limonade.');
      env.toast('Lekker koud! Het smaakt naar zomer.');
    }),
    item(o.x - 1.0, o.z + 0.1, 1.8, 'Praat met de barman', () => env.toast(gossip(env.game.state.day, talk++))),
    item(jx, jz + 1.8, 2.0, 'Jukebox: muziek aan of uit', () => {
      const w = wereldOf(env.game.state);
      w.muziek = !music();
      env.toast(w.muziek ? 'De jukebox speelt weer.' : 'De jukebox is uit.');
    }),
  ];
  let next = 0;
  let step = 0;
  return makeDef({
    group: g,
    origin: o,
    bounds,
    solids,
    spawn: { x: o.x, z: o.z - 1.0 },
    items,
    ambient: 1.0,
    ambColor: '#ffe6c0',
    lamps: [
      { x: o.x - 3, y: o.y + 3.0, z: o.z - 0.5, color: '#ffc27a', intensity: 6, dist: 10 },
      { x: o.x + 3, y: o.y + 3.0, z: o.z - 0.5, color: '#ffc27a', intensity: 6, dist: 10 },
      { x: o.x, y: o.y + 2.8, z: o.z + 2.0, color: '#ffe0b0', intensity: 4, dist: 8 },
    ],
    camDist: 7.5,
    update: (t, dt) => {
      glass.material.emissive.setHSL((t * 0.08) % 1, 0.9, 0.5);
      next -= dt;
      if (next > 0 || !music() || !env.audio?.ready) return;
      next = 2.6;
      // A short jingle: eight notes, a little off-beat each time round.
      step = (step + 1) % JINGLE.length;
      for (let i = 0; i < 4; i++) env.audio.tone(JINGLE[(step + i * 2) % JINGLE.length] / 2, 0.32, { type: 'triangle', vol: 0.05, at: i * 0.2 });
    },
  });
}
