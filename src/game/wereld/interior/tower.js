// The inside of the lighthouse: a stone room with a stair of twelve steps that climbs to the
// gallery on the outside of the tower, where a telescope looks over the sea. The sea and the
// island are painted on a big cylinder round the gallery (one canvas, drawn once).

import * as THREE from 'three';
import { box, cyl, solid, WALL_T } from './common.js';
import { makeDef, item } from './def.js';
import { gossip } from '../gossip.js';
import { mat } from '../mats.js';

const STEPS = 12;
const RISE = 3.6;
const BAND = 1.2; // the stair is 2.4 m wide, centred on oz

/** A panorama of sea, sky and the island's hills, painted once. */
function panorama() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 150);
  sky.addColorStop(0, '#5d9fe0');
  sky.addColorStop(1, '#cdeeff');
  x.fillStyle = sky;
  x.fillRect(0, 0, 1024, 150);
  const sea = x.createLinearGradient(0, 128, 0, 256);
  sea.addColorStop(0, '#3ab0e6');
  sea.addColorStop(1, '#1d6fa5');
  x.fillStyle = sea;
  x.fillRect(0, 128, 1024, 128);
  // Sun glints on the water.
  x.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 40; i++) x.fillRect((i * 97) % 1024, 140 + ((i * 53) % 100), 14 + (i % 4) * 6, 2);
  // Island hills, in two layers.
  x.fillStyle = '#5ea93e';
  for (const [hx, hw, hh] of [[180, 230, 60], [520, 300, 80], [850, 200, 45]]) {
    x.beginPath();
    x.ellipse(hx, 128, hw, hh, 0, Math.PI, 0);
    x.fill();
  }
  x.fillStyle = '#3f8a2e';
  x.beginPath();
  x.ellipse(680, 128, 120, 36, 0, Math.PI, 0);
  x.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildTower(env, o) {
  const g = new THREE.Group();
  const x0 = o.x - 4;
  const x1 = o.x + 4;
  const z0 = o.z - 4;
  const z1 = o.z + 4;
  const y0 = o.y;
  const H = RISE;
  const stone = '#f4efe4';
  const T = WALL_T;
  // Floor, back, left and front walls (the front has the door), and the right wall with the stair gap.
  g.add(box(x1 - x0 + T * 2, 0.3, z1 - z0 + T * 2, '#e7dccb', (x0 + x1) / 2, y0 - 0.15, (z0 + z1) / 2));
  g.add(box(x1 - x0 + T * 2, H + 0.4, T, stone, (x0 + x1) / 2, y0 + (H + 0.4) / 2, z1 + T / 2));
  g.add(box(T, H + 0.4, z1 - z0, stone, x0 - T / 2, y0 + (H + 0.4) / 2, (z0 + z1) / 2));
  // Front wall with the door (2 m wide, centred on o.x).
  const side = (x1 - x0 + T * 2 - 2.0) / 2;
  g.add(box(side, H, T, stone, x0 - T + side / 2, y0 + H / 2, z0 - T / 2));
  g.add(box(side, H, T, stone, x1 + T - side / 2, y0 + H / 2, z0 - T / 2));
  g.add(box(2.0, H - 2.6, T, stone, o.x, y0 + 2.6 + (H - 2.6) / 2, z0 - T / 2));
  // Right wall in two parts, with the gap for the stair.
  const zA = o.z - BAND;
  const zB = o.z + BAND;
  g.add(box(T, H, zA - z0, stone, x1 + T / 2, y0 + H / 2, (z0 + zA) / 2));
  g.add(box(T, H, z1 - zB, stone, x1 + T / 2, y0 + H / 2, (zB + z1) / 2));
  const solids = [solid(x1 - 0.2, x1 + T, z0, zA), solid(x1 - 0.2, x1 + T, zB, z1)];

  // The stair: twelve steps rising along +x into the gallery.
  const run = (x1 - x0) / STEPS;
  for (let i = 0; i < STEPS; i++) {
    g.add(box(run, (i + 1) * (H / STEPS), BAND * 2, '#f6d7a8', x0 + (i + 0.5) * run, y0 + ((i + 1) * (H / STEPS)) / 2, o.z));
  }

  // The gallery outside the right wall, on posts, with a railing round the outside.
  const gx0 = x1;
  const gx1 = x1 + 5;
  g.add(box(gx1 - gx0, 0.3, z1 - z0, '#c9955a', (gx0 + gx1) / 2, y0 + H - 0.15, o.z));
  for (const px of [gx0 + 0.6, gx1 - 0.6]) for (const pz of [z0 + 0.6, z1 - 0.6]) g.add(cyl(0.14, 0.14, H - 0.3, '#8a5a30', px, y0 + (H - 0.3) / 2, pz, 6));
  g.add(box(0.1, 1.0, z1 - z0, '#ffffff', gx1 - 0.05, y0 + H + 0.5, o.z));
  g.add(box(gx1 - gx0, 1.0, 0.1, '#ffffff', (gx0 + gx1) / 2, y0 + H + 0.5, z0 + 0.05));
  g.add(box(gx1 - gx0, 1.0, 0.1, '#ffffff', (gx0 + gx1) / 2, y0 + H + 0.5, z1 - 0.05));
  // Telescope on a tripod.
  const tx = gx0 + 2.2;
  const tz = o.z - 2.4;
  g.add(cyl(0.05, 0.05, 1.2, '#3a4452', tx, y0 + H + 0.6, tz, 6));
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 1.2, 8), mat('#3a4452'));
  tube.rotation.set(0.3, 0, Math.PI / 2 - 0.2);
  tube.position.set(tx, y0 + H + 1.3, tz);
  g.add(tube);
  // The painted view round the gallery.
  const pano = new THREE.Mesh(new THREE.CylinderGeometry(160, 160, 80, 40, 1, true), new THREE.MeshBasicMaterial({ map: panorama(), side: THREE.BackSide, depthWrite: false }));
  pano.position.set(o.x + 2, y0 + 30, o.z);
  g.add(pano);

  const roomB = { x0: x0 + 0.25, x1: x1 - 0.25, z0: z0 + 0.25, z1: z1 - 0.25 };
  const wideB = { x0: x0 + 0.25, x1: gx1 - 0.3, z0: z0 + 0.25, z1: z1 - 0.25 };
  const floorAt = (x, z) => {
    if (x >= x0 && x <= x1 && z >= zA && z <= zB) {
      const k = Math.min(STEPS - 1, Math.max(0, Math.floor((x - x0) / run)));
      return y0 + (k + 1) * (H / STEPS);
    }
    if (x > x1) return y0 + H;
    return y0;
  };
  const items = [
    item(o.x, z0 + 0.9, 1.6, 'Naar buiten', () => env.exit()),
    item(tx + 1.2, tz, 1.8, 'Kijk door de verrekijker', () => env.toast(gossip(env.game.state.day, 2))),
  ];
  return makeDef({
    group: g,
    origin: o,
    bounds: wideB,
    solids,
    floorAt,
    spawn: { x: o.x - 2.2, z: o.z - 2.2 },
    items,
    ambient: 0.8,
    ambColor: '#fff3da',
    lamps: [
      { x: o.x - 2.2, y: y0 + 3.0, z: o.z - 1.0, color: '#fff1c8', intensity: 6, dist: 10 },
      { x: gx0 + 2.4, y: y0 + H + 2.6, z: o.z + 2.0, color: '#fff6d6', intensity: 5, dist: 12 },
      { x: o.x + 2.4, y: y0 + 2.6, z: z0 + 1.2, color: '#ffe6b0', intensity: 3, dist: 8 },
    ],
    camDist: 7,
    camBoundsAt: (px) => (px > x1 ? wideB : roomB),
  });
}
