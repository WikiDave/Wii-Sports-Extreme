// Shared parts for the property models: flat-shaded boxes, gable roofs, palms, chests, beds,
// mailboxes and name boards. Every builder works in local coordinates: the ground is y = 0 and the
// front of a building looks towards +z. Upgrade parts carry userData.track and userData.level: they
// show when that track reaches that level (see view.js).

import * as THREE from 'three';

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 8),
  ball: new THREE.SphereGeometry(1, 8, 6),
};

const cache = new Map();
/** A shared flat-shaded Lambert material for a colour (not for walls that get painted). */
export function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!cache.has(key)) cache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra }));
  return cache.get(key);
}

/** A glowing material (lamps, glass at night). */
export const glow = (color = '#ffd36a', intensity = 1.2) =>
  new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: intensity, flatShading: true });

/** A box of size w x h x d with its centre at (x, y, z). */
export function box(parent, w, h, d, x, y, z, color, material) {
  const m = new THREE.Mesh(GEO.box, material ?? mat(color));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** A wall box with its own material, so that paint changes only this wall (view.js applyPaint). */
export function wall(parent, w, h, d, x, y, z, color) {
  const m = box(parent, w, h, d, x, y, z, color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  m.userData.wall = true;
  m.userData.base = color;
  return m;
}

/** A cone (tip up), centre at (x, y, z). */
export function cone(parent, r, h, x, y, z, color, seg = 8) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** A vertical cylinder, centre at (x, y, z). */
export function cyl(parent, r, h, x, y, z, color, material, seg = 10) {
  const g = seg === 10 ? GEO.cyl : new THREE.CylinderGeometry(1, 1, 1, seg);
  const m = new THREE.Mesh(g, material ?? mat(color));
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** A group with a userData tag, for upgrade parts. */
export function part(track, level) {
  const g = new THREE.Group();
  g.userData = { track, level };
  return g;
}

/**
 * A gable roof: ridge along z, spanning x from -span/2 to span/2, rising `rise` above its base at y.
 * The roof's bottom edge sits at y.
 */
export function gableRoof(parent, span, length, rise, x, y, z, color) {
  const s = new THREE.Shape();
  s.moveTo(-span / 2, 0);
  s.lineTo(span / 2, 0);
  s.lineTo(0, rise);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
  g.translate(0, 0, -length / 2);
  const m = new THREE.Mesh(g, mat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** A simple palm tree, about 7 m tall; collider radius 0.5 at its foot. */
export function palm(parent, x, z, scale = 1, lean = 0.1) {
  const g = new THREE.Group();
  const trunk = cyl(g, 0.3, 7, 0, 3.5, 0, '#a8743a', null, 6);
  trunk.rotation.z = lean;
  trunk.position.x = Math.sin(lean) * 3.5;
  // Six fronds: thin cones that lie out from the top of the trunk.
  for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(trunk.position.x, 7, 0);
    pivot.rotation.y = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(GEO.cone, mat('#4fb43f'));
    leaf.scale.set(0.5, 2.4, 0.5);
    leaf.rotation.z = -1.3;
    leaf.position.set(1.2, 0.2, 0);
    pivot.add(leaf);
    g.add(pivot);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  parent.add(g);
  return g;
}

/** A treasure-chest-like wooden box for stock, about 1.5 m wide, facing +z. */
export function chestMesh() {
  const g = new THREE.Group();
  box(g, 1.5, 0.75, 0.9, 0, 0.38, 0, '#a8743a');
  box(g, 1.56, 0.26, 0.96, 0, 0.88, 0, '#c58a4b');
  box(g, 0.24, 0.3, 0.06, 0, 0.6, 0.48, '#ffd24a');
  return g;
}

/** A beach lounger (sun bed), lying along z with its head at -z. */
export function loungerMesh(color = '#ff6f61') {
  const g = new THREE.Group();
  box(g, 1.0, 0.16, 2.0, 0, 0.55, 0, color);
  box(g, 1.0, 0.18, 0.9, 0, 0.85, -1.05, color).rotation.x = -0.7;
  box(g, 0.1, 0.5, 0.1, 0.42, 0.25, 0.8, '#ffffff');
  box(g, 0.1, 0.5, 0.1, -0.42, 0.25, 0.8, '#ffffff');
  box(g, 0.1, 0.5, 0.1, 0.42, 0.25, -0.8, '#ffffff');
  box(g, 0.1, 0.5, 0.1, -0.42, 0.25, -0.8, '#ffffff');
  return g;
}

/** A camp bed (veldbed) with a blanket, lying along z. */
export function cotMesh(color = '#3a9ad9') {
  const g = new THREE.Group();
  box(g, 1.0, 0.14, 2.1, 0, 0.5, 0, '#8e9aa6');
  box(g, 0.94, 0.12, 1.8, 0, 0.6, 0, color);
  for (const [x, z] of [[0.44, 0.9], [-0.44, 0.9], [0.44, -0.9], [-0.44, -0.9]]) box(g, 0.08, 0.5, 0.08, x, 0.25, z, '#5b6470');
  return g;
}

/** A sleeping bag (bedroll) on the ground, lying along z. */
export function bedrollMesh(color = '#3a9ad9') {
  const g = new THREE.Group();
  box(g, 1.2, 0.26, 2.2, 0, 0.16, 0, color);
  box(g, 0.9, 0.2, 0.45, 0, 0.3, -0.8, '#ffffff');
  return g;
}

/** A mailbox on a post, the flag up; the front (the letter slot) faces +z. */
export function mailboxMesh() {
  const g = new THREE.Group();
  box(g, 0.14, 1.3, 0.14, 0, 0.65, 0, '#a8743a');
  box(g, 0.7, 0.42, 0.9, 0, 1.45, 0, '#e2513f');
  box(g, 0.08, 0.5, 0.08, 0.32, 1.66, 0.2, '#ffd24a');
  box(g, 0.1, 0.1, 0.1, 0.32, 1.9, 0.2, '#ffd24a');
  return g;
}

/** A name board on two posts, text painted on a canvas. Text is shown on the front (+z). */
export function nameBoard(text, width = 5) {
  const g = new THREE.Group();
  box(g, 0.2, 1.6, 0.2, -width / 2 + 0.6, 0.8, 0, '#a8743a');
  box(g, 0.2, 1.6, 0.2, width / 2 - 0.6, 0.8, 0, '#a8743a');
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const c = canvas.getContext('2d');
  c.fillStyle = '#fff8e8';
  c.fillRect(0, 0, 512, 160);
  c.strokeStyle = '#3a9ad9';
  c.lineWidth = 14;
  c.strokeRect(10, 10, 492, 140);
  c.fillStyle = '#2b3440';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let size = 72;
  c.font = `800 ${size}px sans-serif`;
  while (c.measureText(text).width > 440 && size > 28) c.font = `800 ${(size -= 4)}px sans-serif`;
  c.fillText(text, 256, 84);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.31), new THREE.MeshLambertMaterial({ map: tex }));
  face.position.set(0, 1.25, 0.12);
  g.add(face);
  box(g, width + 0.3, 0.14, 0.2, 0, 1.25, 0.06, '#3a9ad9');
  return g;
}

/** A small plant in a pot: a flower bed with coloured dots (decor). Returns the group. */
export function flowerBed(width = 3, depth = 1.2, seed = 1) {
  const g = new THREE.Group();
  box(g, width, 0.35, depth, 0, 0.18, 0, '#7a5230');
  const colors = ['#ff6fa3', '#ffe14a', '#ffffff', '#b58cff', '#ff8a4a'];
  let s = seed * 97;
  for (let i = 0; i < Math.round(width * 4); i++) {
    s = (s * 16807) % 2147483647;
    const x = (((s % 1000) / 1000) - 0.5) * (width - 0.4);
    s = (s * 16807) % 2147483647;
    const z = (((s % 1000) / 1000) - 0.5) * (depth - 0.3);
    const f = new THREE.Mesh(GEO.ball, mat(colors[i % colors.length]));
    f.scale.setScalar(0.2);
    f.position.set(x, 0.55, z);
    g.add(f);
  }
  return g;
}

/** A stack of crates (storage upgrade). `n` crates in two layers. */
export function crateStack(n, x, z, rot = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const col = i % 2 ? '#d9a86a' : '#c9925a';
    box(g, 1.1, 1.0, 1.1, (i % 2) * 1.15 - 0.5, 0.5 + Math.floor(i / 2) * 1.02, 0, col);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

/** A camera on a bracket, looking along +z. */
export function cameraMesh() {
  const g = new THREE.Group();
  box(g, 0.1, 0.1, 0.5, 0, 0, -0.2, '#4a5866');
  box(g, 0.5, 0.36, 0.34, 0, 0, 0.1, '#2d3440');
  cyl(g, 0.12, 0.2, 0, 0, 0.36, '#15191f', null, 8).rotation.x = Math.PI / 2;
  box(g, 0.08, 0.08, 0.08, 0.2, 0.14, 0.1, '#ff4d4d', glow('#ff4d4d', 1.4));
  return g;
}

/** A gold padlock on a hasp, for the security upgrade. */
export function lockMesh() {
  const g = new THREE.Group();
  box(g, 0.44, 0.04, 0.12, 0, 0.3, 0, '#8e9aa6');
  box(g, 0.34, 0.3, 0.16, 0, 0.1, 0, '#ffc93c');
  return g;
}
