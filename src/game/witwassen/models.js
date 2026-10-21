// 3D models of the laundering layer: the four businesses, the harbour ATM and the signs.
// Flat-coloured boxes, cylinders, cones and tori like world/buildings.js. The front (door) faces +z.
// Every model keeps userData.front (where a visitor stands) and userData.lamp (open, closed or for sale).

import * as THREE from 'three';
import { windowGlass } from '../world/buildings.js';

const MAT = {};
const mat = (c) => (MAT[c] ??= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
const glow = (c, k) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: k, flatShading: true });
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cone: new THREE.ConeGeometry(1, 1, 14),
  ball: new THREE.SphereGeometry(1, 12, 8),
};

/** Adds a unit geometry scaled to size; a material overrides the colour. */
function add(g, geo, color, x, y, z, sx, sy, sz, material = null) {
  const m = new THREE.Mesh(geo, material ?? mat(color));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  g.add(m);
  return m;
}
const box = (g, c, x, y, z, w, h, d, m) => add(g, GEO.box, c, x, y, z, w, h, d, m);
const cyl = (g, c, x, y, z, r, h, m) => add(g, GEO.cyl, c, x, y, z, r, h, r, m);
const cone = (g, c, x, y, z, r, h, m) => add(g, GEO.cone, c, x, y, z, r, h, r, m);
const ball = (g, c, x, y, z, r, m) => add(g, GEO.ball, c, x, y, z, r, r, r, m);
/** A ring in the plane of the front (XY), with its own geometry so the tube keeps its thickness. */
function ring(g, c, radius, tube, x, y, z) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 28), mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

/** A canvas picture with text (signs). lines: [{ text, size, color }]. */
export function signTexture(lines, { bg = '#ffffff', w = 512, h = 160 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.beginPath();
  if (x.roundRect) x.roundRect(6, 6, w - 12, h - 12, 26);
  else x.rect(6, 6, w - 12, h - 12);
  x.fill();
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const step = h / (lines.length + 1);
  lines.forEach((l, i) => {
    x.fillStyle = l.color ?? '#2d3440';
    x.font = `800 ${l.size ?? 56}px "Arial Rounded MT Bold", Nunito, "Segoe UI", system-ui, sans-serif`;
    x.fillText(l.text, w / 2, step * (i + 1) + 2, w - 40);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A flat sign facing +z, `w` x `hgt` metres; the picture keeps the same proportions. */
export function signPlate(lines, w, hgt, bg = '#ffffff') {
  const tex = signTexture(lines, { bg, w: 512, h: Math.round((512 * hgt) / w) });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), new THREE.MeshLambertMaterial({ map: tex, flatShading: true }));
}

/** A status lamp: a small ball on the front. The world sets its colour: green open, red closed, grey for sale. */
function lampOn(g, x, y, z, r = 0.32) {
  const m = new THREE.MeshLambertMaterial({ color: '#888888', emissive: '#000000', flatShading: true });
  add(g, GEO.ball, null, x, y, z, r, r, r, m);
  return m;
}

/** IJskraam: a striped kiosk with a giant ice-cream cone on the roof. */
function ijskraam(g) {
  box(g, '#d8c8a8', 0, 0.2, 0, 6.4, 0.4, 4.6);
  box(g, '#fff4e0', 0, 1.5, 0, 5.2, 2.2, 3.6);
  box(g, '#ff8fb1', 0, 0.85, 2.05, 4.6, 0.9, 0.5); // counter
  box(g, '#dff4ff', 0, 1.85, 1.82, 3.6, 1.1, 0.08, windowGlass);
  box(g, '#3fb6ef', 0, 3.0, 0, 5.9, 0.35, 4.2); // roof
  for (let i = 0; i < 6; i++) ball(g, '#ffffff', -2.6 + i * 1.04, 2.82, 2.18, 0.3); // scalloped edge
  for (let i = 0; i < 6; i++) box(g, i % 2 ? '#ffffff' : '#ff8fb1', -2.5 + i * 1.0, 2.6, 2.5, 0.95, 0.12, 1.6).rotation.x = 0.26; // awning, sloping down to the front
  cone(g, '#e8b56a', 0, 4.6, 0, 0.95, 2.4).rotation.x = Math.PI; // waffle cone, tip down
  ball(g, '#ff8fb1', 0, 6.1, 0, 1.05);
  ball(g, '#8b5a2b', 0, 6.95, 0, 0.92);
  ball(g, '#e2513f', 0, 7.7, 0, 0.22);
  const sign = signPlate([{ text: 'IJSKRAAM', size: 64 }], 4.0, 0.8, '#fff4e0');
  sign.position.set(0, 3.55, 2.14);
  g.add(sign);
  g.userData.lamp = lampOn(g, 2.7, 3.55, 2.2);
  g.userData.front = { x: 0, z: 4.2 };
}

/** Surfschool: a long wooden hut with a teal roof, a surfboard rack and a bench. */
function surfschool(g) {
  box(g, '#d8c8a8', 0, 0.2, 0, 8.6, 0.4, 5.8);
  box(g, '#fff0d8', 0, 1.6, 0, 8, 2.4, 5.2);
  for (const y of [0.9, 1.5, 2.1]) box(g, '#c99a5e', 0, y, 2.63, 8, 0.07, 0.05);
  box(g, '#2fb5a6', -2.1, 3.55, 0, 4.9, 0.3, 6.4).rotation.z = 0.4;
  box(g, '#2fb5a6', 2.1, 3.55, 0, 4.9, 0.3, 6.4).rotation.z = -0.4;
  const boards = ['#ff7a59', '#3fb6ef', '#ffe14a', '#7ed957', '#ff8fb1'];
  for (let i = 0; i < 5; i++) add(g, GEO.ball, boards[i], -2.8 + i * 0.7, 1.15, 3.7, 0.32, 0.05, 1.45).rotation.x = 0.5;
  box(g, '#a8743a', -3.4, 0.9, 3.7, 0.12, 1.8, 0.12);
  box(g, '#a8743a', 2.4, 0.9, 3.7, 0.12, 1.8, 0.12);
  box(g, '#a8743a', -0.5, 1.9, 3.7, 6.0, 0.1, 0.1);
  box(g, '#a8743a', -2.4, 0.22, 4.4, 2.4, 0.2, 0.6); // bench
  box(g, '#a8743a', 2.4, 0.22, 4.4, 2.4, 0.2, 0.6);
  const sign = signPlate([{ text: 'HANG TEN', size: 70, color: '#0e94c9' }], 4.8, 1.0);
  sign.position.set(0, 3.4, 2.7);
  g.add(sign);
  g.userData.lamp = lampOn(g, 2.9, 3.4, 2.75);
  g.userData.front = { x: 0, z: 4.6 };
}

/** Strandpaviljoen: a round white pavilion with a red roof, a terrace with parasols and tables. */
function paviljoen(g) {
  box(g, '#a8743a', 0, 0.25, 4.6, 12.5, 0.5, 6.5);
  cyl(g, '#fff4e0', 0, 1.4, 0, 4.2, 2.8);
  cone(g, '#e2513f', 0, 4.3, 0, 5.4, 3.0);
  ring(g, '#ffffff', 5.3, 0.18, 0, 2.85, 0).rotation.x = Math.PI / 2;
  box(g, '#ff9a6a', 0, 0.95, 3.2, 3.6, 0.9, 0.6); // counter
  box(g, '#dff4ff', 0, 1.9, 3.8, 2.8, 1.0, 0.06, windowGlass);
  ball(g, '#fff3c0', 0, 2.7, 0, 0.45, glow('#ffe9a0', 0.4));
  for (const [x, z, c] of [[-4.2, 6.6, '#3fb6ef'], [-0.3, 7.6, '#ffe14a'], [3.8, 6.6, '#ff8fb1']]) {
    cyl(g, '#ffffff', x, 2.2, z, 0.1, 3.2);
    cone(g, c, x, 3.9, z, 2.2, 0.9);
    cyl(g, '#ffffff', x, 1.05, z - 0.9, 0.7, 0.12);
    cyl(g, '#ffffff', x, 0.5, z - 0.9, 0.1, 1.0);
    box(g, '#e8d8b8', x, 0.6, z - 1.9, 0.9, 0.12, 0.9);
    box(g, '#e8d8b8', x, 0.25, z - 1.9, 0.9, 0.5, 0.1);
  }
  const sign = signPlate([{ text: 'ZEEZICHT', size: 60, color: '#e2513f' }], 3.8, 1.0, '#fff4e0');
  sign.position.set(-6.2, 1.9, 6.0);
  sign.rotation.y = 0.4;
  g.add(sign);
  box(g, '#a8743a', -6.2, 0.8, 6.0, 0.14, 1.6, 0.14);
  g.userData.lamp = lampOn(g, 2.4, 2.2, 4.2);
  g.userData.front = { x: 0, z: 8.4 };
}

/** Waterpretpark: a gate with a banner, a waterslide, a pool and a little ferris wheel (turns, see world.js). */
function pretpark(g) {
  box(g, '#d8c8a8', 0, 0.12, 0, 24, 0.24, 16);
  box(g, '#ffffff', 0, 0.22, 2.2, 12.8, 0.2, 7); // pool rim
  box(g, '#3ec7ef', 0, 0.3, 2.2, 12, 0.14, 6.4); // pool water
  for (const x of [-6, 6]) cyl(g, '#ffffff', x, 2.3, 8, 0.45, 4.6);
  box(g, '#ff7a59', 0, 4.8, 8, 13, 1.5, 0.4);
  const banner = signPlate([{ text: 'PLONS!', size: 90, color: '#ffffff' }], 11.6, 1.2, '#ff7a59');
  banner.position.set(0, 4.8, 8.3);
  g.add(banner);
  // Waterslide: a tower with a tube sloping down to the pool.
  cyl(g, '#ffffff', -8, 5, -4, 1.1, 10);
  cyl(g, '#ff8fb1', -8, 10.1, -4, 1.4, 0.3);
  const top = new THREE.Vector3(-8, 10, -4);
  const end = new THREE.Vector3(-7.2, 0.5, 2.6);
  const dir = end.clone().sub(top);
  const slide = new THREE.Mesh(GEO.cyl, mat('#ff8fb1'));
  slide.scale.set(0.55, dir.length(), 0.55);
  slide.position.copy(top).add(end).multiplyScalar(0.5);
  slide.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.add(slide);
  // Ferris wheel: a ring in the front plane with gondolas on the rim.
  const wheel = new THREE.Group();
  wheel.position.set(7.5, 9.5, -4.5);
  ring(wheel, '#ffe14a', 6, 0.22, 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    box(wheel, '#ffffff', Math.cos(a) * 3, Math.sin(a) * 3, 0, 6, 0.12, 0.12).rotation.z = a;
    box(wheel, ['#ff7a59', '#3fb6ef', '#7ed957', '#ff8fb1'][i % 4], Math.cos(a) * 6, Math.sin(a) * 6, 0, 0.9, 0.9, 0.9);
  }
  ball(wheel, '#ffffff', 0, 0, 0.2, 0.6);
  g.add(wheel);
  g.userData.wheel = wheel;
  box(g, '#a8743a', 7.5 - 3.4, 4.6, -4.5, 0.4, 9.2, 0.4).rotation.z = 0.18;
  box(g, '#a8743a', 7.5 + 3.4, 4.6, -4.5, 0.4, 9.2, 0.4).rotation.z = -0.18;
  box(g, '#3a9ad9', -9.5, 1.3, 7.2, 2.4, 2.6, 2.2); // ticket booth
  box(g, '#ffffff', -9.5, 1.8, 8.33, 1.6, 1.0, 0.08, windowGlass);
  for (const x of [-3, 3]) box(g, '#a8743a', x, 0.5, 6.2, 1.6, 0.8, 0.8); // loungers
  g.userData.lamp = lampOn(g, -11.4, 4.0, 8.2);
  g.userData.front = { x: 0, z: 10.5 };
}

/** The harbour ATM: a blue kiosk with a glowing screen and a cash slot. */
function atm(g) {
  box(g, '#d8c8a8', 0, 0.1, 0, 2.2, 0.2, 1.8);
  box(g, '#3a9ad9', 0, 1.4, 0, 1.6, 2.4, 1.2);
  box(g, '#2fb5a6', 0, 2.8, 0, 2.0, 0.3, 1.5);
  const sign = signPlate([{ text: 'PIN', size: 90 }, { text: 'GELD', size: 40, color: '#0e94c9' }], 1.6, 0.6, '#f2b45a');
  sign.position.set(0, 2.45, 0.78);
  g.add(sign);
  box(g, '#8fd2ff', 0, 1.95, 0.61, 0.9, 0.6, 0.06, glow('#8fd2ff', 0.55));
  box(g, '#2d3440', 0, 1.2, 0.62, 0.6, 0.7, 0.05);
  box(g, '#ffe14a', 0, 0.75, 0.62, 0.5, 0.1, 0.05);
  g.userData.lamp = lampOn(g, 0.6, 2.8, 0.66, 0.12);
  g.userData.front = { x: 0, z: 1.6 };
}

const BUILDERS = { ijskraam, surfschool, paviljoen, pretpark, atm };

/** A new model group for a business id or 'atm'. Shadows are set by the caller. */
export function buildModel(id) {
  const g = new THREE.Group();
  BUILDERS[id](g);
  return g;
}

/** A "for sale" post with a board: TE KOOP, the price and the rank. Its front faces +z. */
export function forSaleSign(price, rankName) {
  const g = new THREE.Group();
  box(g, '#a8743a', 0, 1.3, 0, 0.14, 2.6, 0.14);
  const plate = signPlate([{ text: 'TE KOOP', size: 66, color: '#e2513f' }, { text: `€${price.toLocaleString('nl-NL')} · ${rankName}`, size: 34 }], 3.2, 1.2, '#fff9e6');
  plate.position.set(0, 2.6, 0.1);
  g.add(plate);
  return g;
}
