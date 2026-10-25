// Buildings of Wahoe-eiland in Resort style: cheerful houses with windows, shutters and
// chimneys, a hotel, a wooden pier with boats and street lamps. All flat-coloured boxes and
// prisms, built from shared geometries and materials.

import * as THREE from 'three';
import { sailboat } from './sailboat.js';

const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
const MAT = {};
const m = (c) => (MAT[c] ??= mat(c));
const WALLS = ['#fff1d6', '#ffd9b0', '#cdeedd', '#cfe6ff', '#ffe0e8', '#f6f2c8'];
const ROOFS = ['#e2513f', '#3a9ad9', '#2fb5a6', '#f09a3a', '#8e5fd0'];
const TRIM = '#ffffff';
const WOOD = '#a8743a';
const glass = new THREE.MeshLambertMaterial({ color: '#8fd2ff', emissive: '#ffd36a', emissiveIntensity: 0 });
/** Window glass of every building: lights up at night. */
export const windowGlass = glass;

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone4: new THREE.ConeGeometry(0.7071, 1, 4),
  ico: new THREE.IcosahedronGeometry(1, 0),
};
GEO.cone4.rotateY(Math.PI / 4);
// A prism for gable roofs: triangle section along z.
const prism = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0, 1);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  g.rotateY(Math.PI / 2);
  return g;
})();

function part(geo, color, x, y, z, sx, sy, sz, material) {
  const mesh = new THREE.Mesh(geo, material ?? m(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

/** A window pair on the front (+z) of a wall at height y, with frame and shutters. */
function windows(g, w, y, z, count = 2, shutters = true) {
  const span = w * 0.62;
  for (let i = 0; i < count; i++) {
    const x = count === 1 ? 0 : -span / 2 + (span / (count - 1)) * i;
    g.add(part(GEO.box, TRIM, x, y, z + 0.02, 1.5, 1.35, 0.14));
    g.add(part(GEO.box, null, x, y, z + 0.1, 1.15, 1.0, 0.1, glass));
    g.add(part(GEO.box, TRIM, x, y, z + 0.16, 1.15, 0.08, 0.06));
    g.add(part(GEO.box, TRIM, x, y, z + 0.16, 0.08, 1.0, 0.06));
    if (shutters) {
      g.add(part(GEO.box, '#3f9aa8', x - 0.95, y, z + 0.06, 0.45, 1.3, 0.1));
      g.add(part(GEO.box, '#3f9aa8', x + 0.95, y, z + 0.06, 0.45, 1.3, 0.1));
    }
  }
}

/** A seeded generator of its own, so decorations never change the island's random layout. */
function ownRng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const FLOWERS = ['#ff6fa3', '#ffe14a', '#ff7a4a', '#ffffff', '#b98cff'];

/**
 * The front garden: flower boxes under the windows with blossoms, a glowing door lamp (it
 * lights up at night with the windows), a bush or two, and sometimes a white picket fence.
 */
function decorate(g, dr, w, d, winY) {
  const span = w * 0.62;
  // The window pair sits at span/2 either side of the centre (see windows()).
  for (const s of [-1, 1]) {
    const bx = s * (span / 2);
    g.add(part(GEO.box, '#8a5a32', bx, winY - 1.05, d / 2 + 0.36, 1.9, 0.36, 0.42));
    for (let k = 0; k < 4; k++) {
      const c = FLOWERS[Math.floor(dr() * FLOWERS.length)];
      g.add(part(GEO.ico, c, bx - 0.6 + k * 0.4, winY - 0.7 + dr() * 0.15, d / 2 + 0.45, 0.26, 0.24, 0.26));
    }
  }
  // Door lamp: a little lantern with a glass that glows at night.
  g.add(part(GEO.box, '#3a4452', 1.3, 2.9, d / 2 + 0.24, 0.5, 0.7, 0.3));
  g.add(part(GEO.box, null, 1.3, 2.9, d / 2 + 0.4, 0.34, 0.46, 0.08, lampGlass));
  // A bush or two beside the house.
  if (dr() < 0.7) {
    const side = dr() < 0.5 ? -1 : 1;
    g.add(part(GEO.ico, '#5ab04c', side * (w / 2 + 1.3), 0.9, d / 2 - 0.5, 1.6, 1.3, 1.5));
    if (dr() < 0.6) g.add(part(GEO.ico, '#4aa03f', side * (w / 2 + 2.6), 0.6, d / 2 + 0.2, 1.0, 0.8, 1.0));
  }
  // A short picket fence across the front, with a gap for the path to the door.
  if (dr() < 0.45) {
    const fz = d / 2 + 2.6;
    const half = w / 2 + 1.1;
    for (let x = -half; x <= half + 0.01; x += 0.8) {
      if (Math.abs(x) < 1.4) continue;
      g.add(part(GEO.box, TRIM, x, 0.55, fz, 0.12, 1.1, 0.12));
    }
    g.add(part(GEO.box, TRIM, -(half + 1.4) / 2 - 0.3, 0.8, fz, half - 1.4, 0.1, 0.08));
    g.add(part(GEO.box, TRIM, (half + 1.4) / 2 + 0.3, 0.8, fz, half - 1.4, 0.1, 0.08));
  }
}

/** A small house: random walls, roof, chimney, porch; the door faces +z. */
export function house(rand, level = 1) {
  const g = new THREE.Group();
  const w = 6.4 + rand() * 2;
  const d = 5.4 + rand() * 1.6;
  const dr = ownRng(Math.round(w * 1000) * 7919 + Math.round(d * 1000));
  const floors = rand() < 0.3 * level ? 2 : 1;
  const h = 3.4 * floors;
  const wall = WALLS[Math.floor(rand() * WALLS.length)];
  const roof = ROOFS[Math.floor(rand() * ROOFS.length)];
  g.add(part(GEO.box, '#d8c8a8', 0, 0.2, 0, w + 0.5, 0.4, d + 0.5)); // plinth
  g.add(part(GEO.box, wall, 0, h / 2 + 0.2, 0, w, h, d));
  // Roof: gable (prism) or hip (pyramid), with an overhang.
  if (rand() < 0.5) {
    g.add(part(prism, roof, 0, h + 0.2, 0, d + 1.4, 2.6, w + 1.4));
    g.children.at(-1).rotation.y = 0;
  } else {
    g.add(part(GEO.cone4, roof, 0, h + 0.2 + 1.35, 0, w + 1.6, 2.7, d + 1.6));
  }
  // Door with frame, step and a little awning
  g.add(part(GEO.box, TRIM, 0, 1.45, d / 2 + 0.02, 1.7, 2.5, 0.16));
  g.add(part(GEO.box, WOOD, 0, 1.3, d / 2 + 0.1, 1.3, 2.2, 0.12));
  g.add(part(GEO.box, '#ffd24a', 0.4, 1.3, d / 2 + 0.2, 0.12, 0.12, 0.08)); // knob
  g.add(part(GEO.box, '#d8c8a8', 0, 0.12, d / 2 + 0.7, 2.4, 0.24, 1.0));
  // Porch: two posts under the awning.
  for (const s of [-1, 1]) g.add(part(GEO.cyl, TRIM, s * 1.15, 1.45, d / 2 + 1.0, 0.16, 2.9, 0.16));
  const awn = part(GEO.box, roof, 0, 2.95, d / 2 + 0.55, 2.2, 0.12, 1.2);
  awn.rotation.x = 0.28;
  g.add(awn);
  const winY = 2.0 + (floors > 1 ? 0 : 0.3);
  windows(g, w, winY, d / 2, 2);
  if (floors > 1) windows(g, w, 5.4, d / 2, 2);
  decorate(g, dr, w, d, winY);
  // Side windows
  for (const side of [-1, 1]) {
    const sw = part(GEO.box, null, side * (w / 2 + 0.06), 2.2, 0, 0.1, 1.0, 1.15, glass);
    g.add(sw);
  }
  if (rand() < 0.6) {
    const cx = (rand() < 0.5 ? -1 : 1) * w * 0.28;
    g.add(part(GEO.box, '#b0644a', cx, h + 2.4, -d * 0.12, 0.9, 2.2, 0.9));
    g.add(part(GEO.box, '#6a3a2a', cx, h + 3.55, -d * 0.12, 1.1, 0.18, 1.1));
  }
  g.userData.radius = Math.hypot(w, d) / 2 + 0.6;
  return g;
}

/** The hotel: three floors, balconies, a striped entrance canopy and a sign on the roof. */
export function hotel() {
  const g = new THREE.Group();
  const w = 26;
  const d = 12;
  g.add(part(GEO.box, '#ead9bc', 0, 0.3, 0, w + 1, 0.6, d + 1));
  g.add(part(GEO.box, '#fff6e6', 0, 6.9, 0, w, 12.6, d));
  g.add(part(GEO.box, '#ffe3a0', -w / 2 + 3, 6.9, d / 2 + 0.02, 2.6, 12.6, 0.12)); // side pilasters
  g.add(part(GEO.box, '#ffe3a0', w / 2 - 3, 6.9, d / 2 + 0.02, 2.6, 12.6, 0.12));
  g.add(part(GEO.box, '#2fb5a6', 0, 13.4, 0, w + 1.6, 1.0, d + 1.6)); // flat roof edge
  for (let f = 0; f < 3; f++) {
    const y = 4.0 + f * 3.8;
    for (let i = 0; i < 6; i++) {
      const x = -w / 2 + 3.2 + i * ((w - 6.4) / 5);
      if (f === 0 && (i === 2 || i === 3)) continue; // the entrance
      g.add(part(GEO.box, TRIM, x, y, d / 2 + 0.03, 2.2, 2.1, 0.16));
      g.add(part(GEO.box, null, x, y, d / 2 + 0.12, 1.8, 1.7, 0.1, glass));
      if (f > 0) {
        g.add(part(GEO.box, '#e2513f', x, y - 1.35, d / 2 + 0.9, 2.6, 0.2, 1.7)); // balcony
        g.add(part(GEO.box, TRIM, x, y - 0.85, d / 2 + 1.7, 2.6, 0.9, 0.08));
      }
    }
  }
  // Entrance with canopy
  g.add(part(GEO.box, '#3a9ad9', 0, 2.2, d / 2 + 0.1, 5.2, 3.6, 0.14));
  g.add(part(GEO.box, '#8fd2ff', 0, 1.9, d / 2 + 0.2, 4.4, 3.0, 0.08, glass));
  for (let i = 0; i < 6; i++) g.add(part(GEO.box, i % 2 ? '#ffffff' : '#e2513f', -2.5 + i * 1.0, 4.4, d / 2 + 1.6, 1.0, 0.18, 3.4));
  for (const x of [-2.6, 2.6]) g.add(part(GEO.cyl, '#ffffff', x, 2.2, d / 2 + 3.1, 0.12, 4.4, 0.12));
  // Sign
  g.add(part(GEO.box, '#ffffff', 0, 15.2, 0, 12, 2.6, 0.5));
  g.add(part(GEO.box, '#3a9ad9', 0, 15.2, 0.3, 11.2, 1.9, 0.12));
  for (let i = 0; i < 7; i++) g.add(part(GEO.box, '#ffe14a', -4.2 + i * 1.4, 15.2, 0.4, 0.8, 1.0, 0.1));
  g.userData.radius = 15.5;
  return g;
}

/** A street lamp; the lamp part is returned in userData.bulb. */
export function streetLamp() {
  const g = new THREE.Group();
  g.add(part(GEO.cyl, '#3a4452', 0, 2.2, 0, 0.09, 4.4, 0.09));
  g.add(part(GEO.box, '#3a4452', 0.35, 4.4, 0, 0.8, 0.08, 0.08));
  const bulb = part(GEO.box, null, 0.7, 4.25, 0, 0.36, 0.3, 0.36, lampGlass);
  g.add(bulb);
  return g;
}
const lampGlass = new THREE.MeshLambertMaterial({ color: '#fff3c0', emissive: '#ffd36a', emissiveIntensity: 0 });
export const lampLight = lampGlass;

/** A little sailing boat; bob() animates it. */
export function boat(color) {
  return sailboat(color);
}

/**
 * The harbour pier: planks on posts running from the shore at (x0, z0) along `dir`
 * (unit vector in x/z) for `length` metres, with boats moored at both sides.
 * Returns { group, boats, colliders } (colliders keep the player on the planks' sides in the sea).
 */
export function pier(x0, z0, dir, length, groundY) {
  const group = new THREE.Group();
  const yaw = Math.atan2(dir.x, dir.z);
  const deck = new THREE.Group();
  deck.position.set(x0, groundY + 0.5, z0);
  deck.rotation.y = yaw;
  for (let i = 0; i < length; i++) {
    const shade = i % 2 ? '#b27c3c' : '#a8743a';
    deck.add(part(GEO.box, shade, 0, 0, i + 0.5, 4.4, 0.25, 0.92));
  }
  for (let i = 0; i <= length; i += 4) {
    for (const s of [-1, 1]) {
      deck.add(part(GEO.cyl, '#6a4a2a', s * 2.1, -1.4, i, 0.18, 3.6, 0.18));
      deck.add(part(GEO.cyl, '#6a4a2a', s * 2.1, 0.5, i, 0.16, 0.9, 0.16));
    }
  }
  for (const s of [-1, 1]) deck.add(part(GEO.box, '#e8d8b8', s * 2.1, 0.78, length / 2, 0.08, 0.08, length)); // rail
  deck.add(part(GEO.box, '#3a9ad9', 0, 1.2, length - 0.4, 1.6, 0.9, 0.2));
  group.add(deck);
  // Boats on both sides
  const boats = [];
  const colors = ['#e2513f', '#3a9ad9', '#ffe14a', '#2fb5a6'];
  const right = new THREE.Vector3(dir.z, 0, -dir.x);
  [[0.3, 1], [0.55, -1], [0.8, 1], [0.45, 1.75]].forEach(([f, side], i) => {
    const b = boat(colors[i % colors.length]);
    const off = side > 0 ? 4.2 * side : 4.2 * side;
    b.position.set(x0 + dir.x * length * f + right.x * off, 0, z0 + dir.z * length * f + right.z * off);
    b.rotation.y = yaw + (i % 2 ? 0.08 : -0.06);
    b.userData.base = b.position.clone();
    b.userData.phase = i * 1.7;
    b.userData.moored = true; // a boat at a pier: the vehicles feature makes it one you can sail
    b.userData.color = colors[i % colors.length];
    group.add(b);
    boats.push(b);
  });
  // The walkable planks for the Mii (world/decks.js): 4.4 m wide, the top 0.125 above the deck's centre.
  const walk = { x0, z0, dx: dir.x, dz: dir.z, length, half: 2.0, top: groundY + 0.625 };
  return { group, boats, yaw, deck, walk };
}

/** Rocking boats; call every frame with the time in seconds. */
export function bobBoats(boats, t) {
  for (const b of boats) {
    const p = t * 1.3 + b.userData.phase;
    b.position.y = Math.sin(p) * 0.09 - 0.02;
    b.userData.hull.rotation.z = Math.sin(p * 0.9) * 0.05;
    b.userData.hull.rotation.x = Math.sin(p * 0.7 + 1) * 0.03;
  }
}
