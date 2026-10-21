// The places of the vehicles: the Garage in Havenstad, the harbour boat rental with its fuel pump,
// the jetties, and the treasure crate on the hidden beach. Built from boxes and cylinders in the
// same flat Resort style as the rest of the island. Each one faces +z (the door, the counter).

import * as THREE from 'three';
import { box, paint, rod } from './models.js';
import { DECK_HALF, DECK_Y } from './harbour.js';

/** A sign with text on a canvas, for a flat panel. Lines: [{ text, size, color }]. */
export function signTexture(lines, bg = '#e2513f') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  const n = lines.length;
  lines.forEach((l, i) => {
    g.font = `900 ${l.size ?? 64}px "Trebuchet MS", Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = l.color ?? '#ffffff';
    g.fillText(l.text, c.width / 2, ((i + 0.5) * c.height) / n);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A panel with a sign texture, facing +z, centred at (x, y, z). */
function panel(parent, tex, w, h, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** The Garage (Havenstad): a cream workshop with a striped roll-up door and a red sign. */
export function buildGarage() {
  const g = new THREE.Group();
  box(g, 12.4, 0.5, 8.4, 0, 0.25, 0, '#d8c8a8'); // plinth
  box(g, 11, 5.6, 7.5, 0, 3.3, 0, '#fff1d6'); // walls
  box(g, 11.8, 0.7, 8.3, 0, 6.4, 0, '#2fb5a6'); // roof
  box(g, 10.6, 0.3, 0.9, 0, 6.9, 3.4, '#ffffff'); // roof edge at the front
  // the roll-up door: a dark opening with yellow and white bands
  box(g, 5.6, 4.2, 0.1, -1.6, 2.4, 3.78, '#3a4452');
  for (let i = 0; i < 7; i++) box(g, 5.6, 0.18, 0.12, -1.6, 0.6 + i * 0.6, 3.86, i % 2 ? '#ffe14a' : '#f5f5f5');
  box(g, 6.1, 0.3, 0.3, -1.6, 4.6, 3.9, '#e2513f'); // door frame, top
  for (const x of [-4.3, 1.1]) box(g, 0.3, 4.5, 0.3, x, 2.45, 3.9, '#e2513f');
  // the people door and the windows
  box(g, 1.5, 2.7, 0.14, 3.6, 1.45, 3.8, '#a8743a');
  box(g, 1.2, 0.2, 0.2, 3.6, 0.1, 3.9, '#a8743a');
  for (const x of [0.4, 2.1]) box(g, 0.1, 1.2, 0.1, x, 3.2, 3.85, '#ffffff');
  box(g, 2.8, 1.5, 0.1, 0.1, 3.3, 3.8, '#8fd2ff');
  // striped awning over the door
  for (let i = 0; i < 8; i++) box(g, 1.4, 0.16, 2.0, -4.9 + i * 1.4, 5.0, 4.6, i % 2 ? '#ffffff' : '#e2513f', [-0.22, 0, 0]);
  // the sign on the roof
  const sign = signTexture([
    { text: 'GARAGE', size: 96, color: '#ffffff' },
    { text: 'fietsen · scooters · golfkarren', size: 34, color: '#ffe14a' },
  ]);
  panel(g, sign, 8.6, 2.7, 0, 8.4, 3.45);
  box(g, 0.25, 2.2, 0.25, -4.2, 7.3, 3.2, '#3a4452');
  box(g, 0.25, 2.2, 0.25, 4.2, 7.3, 3.2, '#3a4452');
  // a little pile of tyres by the wall
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.14, 8, 14), paint('#2b2f36'));
    t.rotation.x = Math.PI / 2;
    t.position.set(6.2 + (i % 2) * 0.5, 0.35 + Math.floor(i / 2) * 0.5, 3.8 + i * 0.1);
    g.add(t);
  }
  return g;
}

/** The harbour boat rental: a blue-roofed booth with a counter and a sign. Faces the sea (+z). */
export function buildRentalHut() {
  const g = new THREE.Group();
  box(g, 5.2, 0.4, 4.4, 0, 0.2, 0, '#d8c8a8');
  box(g, 4.6, 2.9, 3.6, 0, 1.85, 0, '#ffe2a8');
  box(g, 5.2, 0.4, 4.2, 0, 3.5, 0, '#3a9ad9');
  box(g, 3.8, 0.9, 0.7, 0, 0.9, 2.2, '#a8743a'); // counter
  box(g, 3.9, 0.12, 0.8, 0, 1.4, 2.25, '#ffffff');
  for (let i = 0; i < 6; i++) box(g, 0.9, 0.16, 1.6, -2.25 + i * 0.9, 2.95, 2.6, i % 2 ? '#ffffff' : '#e2513f', [-0.25, 0, 0]);
  panel(g, signTexture([{ text: 'Havenverhuur', size: 72, color: '#ffffff' }], '#3a9ad9'), 3.4, 1.1, 0, 3.0, 2.42);
  return g;
}

/** The fuel pump: a blue column with a display, a hose and a nozzle. Faces +z. */
export function buildPump() {
  const g = new THREE.Group();
  box(g, 0.2, 0.2, 0.2, 0, 0.1, 0, '#8a949e');
  box(g, 0.8, 1.5, 0.55, 0, 0.95, 0, '#3a9ad9');
  box(g, 0.9, 0.22, 0.65, 0, 1.8, 0, '#ffffff');
  box(g, 0.5, 0.28, 0.05, 0, 1.32, 0.3, '#2b2f36');
  box(g, 0.42, 0.2, 0.04, 0, 1.32, 0.33, '#35e06a');
  panel(g, signTexture([{ text: 'Benzine', size: 80, color: '#ffffff' }], '#3a9ad9'), 0.72, 0.22, 0, 1.62, 0.3);
  rod(g, [0.4, 1.3, 0.27], [0.62, 0.8, 0.32], 0.035, '#2b2f36');
  rod(g, [0.62, 0.8, 0.32], [0.62, 0.42, 0.34], 0.035, '#2b2f36');
  box(g, 0.14, 0.26, 0.14, 0.62, 0.32, 0.34, '#e2513f');
  return g;
}

/** A jetty: planks from (x, z) along (dx, dz) with posts, rails and a lantern at the tip. */
export function buildJetty(j) {
  const g = new THREE.Group();
  g.position.set(j.x, 0, j.z);
  g.rotation.y = Math.atan2(j.dx, j.dz);
  const L = j.length;
  for (let u = 0; u <= L - 0.25; u += 0.5) {
    box(g, DECK_HALF * 2, 0.1, 0.46, 0, DECK_Y - 0.05, u + 0.25, Math.round(u * 2) % 2 ? '#a8743a' : '#b27c3c');
  }
  for (let u = 0; u <= L + 0.01; u += 4) {
    for (const s of [-1, 1]) {
      rod(g, [s * (DECK_HALF - 0.2), -3.6, u], [s * (DECK_HALF - 0.2), DECK_Y - 0.1, u], 0.13, '#6a4a2a');
    }
  }
  for (const s of [-1, 1]) {
    box(g, 0.07, 0.07, L, s * (DECK_HALF - 0.05), DECK_Y + 0.5, L / 2, '#e8d8b8');
    for (let u = 0; u <= L + 0.01; u += 2) rod(g, [s * (DECK_HALF - 0.05), DECK_Y, u], [s * (DECK_HALF - 0.05), DECK_Y + 0.5, u], 0.04, '#e8d8b8');
  }
  // lantern and bollards at the tip
  rod(g, [0.9, DECK_Y, L], [0.9, DECK_Y + 1.8, L], 0.07, '#3a4452');
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), paint('#fff3c0'));
  lamp.position.set(0.9, DECK_Y + 2.0, L);
  g.add(lamp);
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.4, 8), paint('#3a4452'));
    b.position.set(s * 0.8, DECK_Y + 0.25, L - 0.2);
    g.add(b);
  }
  return g;
}

/** The treasure crate: a brown chest with gold bands. The lid hinges open (lid.rotation.x). */
export function buildChest() {
  const g = new THREE.Group();
  box(g, 1.3, 0.6, 0.9, 0, 0.3, 0, '#a8743a');
  for (const x of [-0.45, 0.45]) box(g, 0.14, 0.64, 0.94, x, 0.3, 0, '#ffd24a');
  box(g, 1.1, 0.04, 0.72, 0, 0.6, 0, '#ffd24a'); // gold, seen when the lid is open
  const lid = new THREE.Group();
  lid.position.set(0, 0.6, -0.45);
  box(lid, 1.3, 0.28, 0.9, 0, 0.14, 0.45, '#c8905a');
  box(lid, 1.34, 0.08, 0.94, 0, 0.3, 0.45, '#ffd24a');
  g.add(lid);
  return { group: g, lid };
}
