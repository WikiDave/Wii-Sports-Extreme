// A village house from the inside: a living room with a sofa, a rug, a bookshelf and a lamp.
// Every house gets its own wall colour and cover colour, from its seed, so they never all look
// the same. The room is small and warm; the door leads back out.

import * as THREE from 'three';
import { box, cyl, ball, roomShell, solid } from './common.js';
import { makeDef, item } from './def.js';
import { rng, pick } from '../rng.js';

const WALLS = ['#fff1d6', '#ffd9b0', '#cdeedd', '#cfe6ff', '#ffe0e8', '#f6f2c8'];
const COVERS = ['#e2513f', '#3a9ad9', '#2fb5a6', '#f09a3a', '#8e5fd0'];
const BOOKS = ['#e2513f', '#3a9ad9', '#ffe14a', '#2fb5a6', '#8e5fd0', '#f09a3a'];
const SAYINGS = [
  'Het ruikt naar koffie en zonnebrand.',
  'Een foto van een schildpad op het aanrecht.',
  'Op de koelkast hangt een lijstje met boodschappen: limonade, limonade, limonade.',
  'Een kat slaapt op de bank en doet of hij je niet ziet.',
  'Overal liggen schelpen op de vensterbank.',
];

export function buildHouse(env, o, seed) {
  const rand = rng(seed * 7919);
  const wall = pick(rand, WALLS);
  const cover = pick(rand, COVERS);
  const g = new THREE.Group();
  const hw = 3.9;
  const hd = 3.3;
  const x0 = o.x - hw;
  const x1 = o.x + hw;
  const z0 = o.z - hd;
  const z1 = o.z + hd;
  const bounds = roomShell(g, { x0, x1, z0, z1, y0: o.y, h: 3.4, floor: '#c9955a', wall, trim: '#ffffff', door: { x: o.x, w: 2.2 } });
  const solids = [];

  // Rug in the middle, sofa against the back wall, a low table in front of it.
  g.add(box(3.6, 0.03, 2.6, cover, o.x, o.y + 0.02, o.z + 0.4));
  g.add(box(3.0, 0.5, 1.0, cover, o.x, o.y + 0.35, z1 - 0.8));
  g.add(box(3.0, 0.9, 0.25, cover, o.x, o.y + 0.95, z1 - 0.35));
  solids.push(solid(o.x - 1.6, o.x + 1.6, z1 - 1.3, z1 - 0.3));
  g.add(box(1.4, 0.12, 0.9, '#a8743a', o.x, o.y + 0.5, o.z - 0.6));
  solids.push(solid(o.x - 0.8, o.x + 0.8, o.z - 1.1, o.z - 0.1));

  // Bookshelf on the right wall: a row of coloured spines on three shelves.
  const bx = x1 - 0.35;
  g.add(box(0.5, 2.4, 2.2, '#a8743a', bx, o.y + 1.2, o.z - 1.2));
  for (let s = 0; s < 3; s++) {
    for (let b = 0; b < 4; b++) g.add(box(0.06, 0.45, 0.2, pick(rand, BOOKS), bx - 0.2, o.y + 0.5 + s * 0.75, o.z - 2.0 + b * 0.45));
  }
  solids.push(solid(bx - 0.3, x1, o.z - 2.3, o.z - 0.1));

  // Plant in the front-left corner.
  const px = x0 + 0.9;
  const pz = z0 + 0.9;
  g.add(cyl(0.45, 0.38, 0.7, '#c96a3a', px, o.y + 0.35, pz, 10));
  g.add(ball(0.6, '#4fb43f', px, o.y + 1.2, pz, 1.2));
  solids.push(solid(px - 0.45, px + 0.45, pz - 0.45, pz + 0.45));

  // A standing lamp by the sofa, and the ceiling lamp.
  g.add(cyl(0.05, 0.05, 1.6, '#3a4452', x0 + 0.8, o.y + 0.8, z1 - 0.8, 6));
  g.add(ball(0.22, '#fff3c0', x0 + 0.8, o.y + 1.7, z1 - 0.8));

  let talk = 0;
  const items = [
    item(o.x, z0 + 0.6, 1.8, 'Naar buiten', () => env.exit()),
    item(bx - 0.4, o.z - 1.2, 1.8, 'Kijk in de boekenkast', () => env.toast(SAYINGS[talk++ % SAYINGS.length])),
  ];
  return makeDef({
    group: g,
    origin: o,
    bounds,
    solids,
    spawn: { x: o.x, z: z0 + 1.6 },
    items,
    ambient: 0.9,
    ambColor: '#fff1d6',
    lamps: [
      { x: o.x, y: o.y + 3.0, z: o.z, color: '#fff1c8', intensity: 7, dist: 12 },
      { x: x0 + 0.8, y: o.y + 1.8, z: z1 - 0.8, color: '#ffe6b0', intensity: 3, dist: 6 },
    ],
    camDist: 7,
  });
}
