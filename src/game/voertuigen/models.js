// The vehicles as boxy, bright toy models (flat colours, like the Mii and the island). Each model
// has its origin on the ground at the centre, faces +z (the way a Mii with heading 0 faces) and
// keeps the parts that move: spinning wheels, steering front wheels, handlebars or a wheel, a
// propeller and oars. Shared geometry and materials, so building many is cheap.

import * as THREE from 'three';
import { sailboat } from '../world/sailboat.js';

const UP = new THREE.Vector3(0, 1, 0);
const colorCache = new Map();
/** A flat-shaded Lambert colour, shared per hex. */
export const paint = (hex) => {
  if (!colorCache.has(hex)) colorCache.set(hex, new THREE.MeshLambertMaterial({ color: hex, flatShading: true }));
  return colorCache.get(hex);
};
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 8); // unit cylinder along y
const TIRE = new THREE.CylinderGeometry(1, 1, 1, 18).rotateZ(Math.PI / 2); // along x (an axle)
const DARK = '#2b2f36';
const WHITE = '#ffffff';

/** A box centred at (x, y, z), size (w, h, d), optionally rotated (rx, ry, rz) and added to parent. */
export function box(parent, w, h, d, x, y, z, color, rot = null) {
  const m = new THREE.Mesh(BOX, paint(color));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] ?? 0, rot[1] ?? 0, rot[2] ?? 0);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/** A round rod from a to b (vectors or [x, y, z]), radius r. */
export function rod(parent, a, b, r, color) {
  const A = Array.isArray(a) ? new THREE.Vector3(...a) : a.clone();
  const B = Array.isArray(b) ? new THREE.Vector3(...b) : b.clone();
  const d = new THREE.Vector3().subVectors(B, A);
  const m = new THREE.Mesh(CYL, paint(color));
  m.scale.set(r, d.length(), r);
  m.position.addVectors(A, B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  m.castShadow = true;
  parent.add(m);
  return m;
}

/** A wheel of radius r and width w, axle along x, centred on its own origin, with spokes. */
export function wheel(r, w, tire = DARK, rim = WHITE) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(TIRE, paint(tire));
  t.scale.set(w, r, r);
  const hub = new THREE.Mesh(TIRE, paint(rim));
  hub.scale.set(w + 0.02, r * 0.55, r * 0.55);
  g.add(t, hub);
  const s1 = box(g, w + 0.03, r * 1.8, 0.05, 0, 0, 0, rim);
  const s2 = box(g, w + 0.03, r * 1.8, 0.05, 0, 0, 0, rim, [Math.PI / 2, 0, 0]);
  s1.castShadow = s2.castShadow = false;
  g.userData.radius = r;
  return g;
}

/** A soft blob shadow on the ground (for land vehicles), one shared canvas texture. */
let blobTex = null;
function blobTexture() {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(20,30,40,0.55)');
  grad.addColorStop(0.6, 'rgba(20,30,40,0.25)');
  grad.addColorStop(1, 'rgba(20,30,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  blobTex = new THREE.CanvasTexture(c);
  return blobTex;
}
export function blob(w, l) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.9 }));
  m.scale.set(w, 1, l);
  m.position.y = 0.04;
  m.renderOrder = 1;
  m.name = 'blob';
  return m;
}

/** The bicycle: red frame, yellow basket, steering from the head tube. */
function fiets() {
  const g = new THREE.Group();
  const frame = '#e2513f';
  const r = 0.33;
  rod(g, [0, 0.38, 0], [0, 0.92, 0.42], 0.035, frame); // down tube
  rod(g, [0, 0.92, 0.42], [0, 0.9, -0.22], 0.035, frame); // top tube
  rod(g, [0, 0.38, 0], [0, 0.9, -0.22], 0.035, frame); // seat tube
  rod(g, [0, 0.38, 0], [0, r, -0.62], 0.03, DARK); // chainstay
  rod(g, [0, 0.9, -0.22], [0, r, -0.62], 0.03, DARK); // seatstay
  box(g, 0.18, 0.06, 0.34, 0, 0.96, -0.26, '#3a3f4a'); // saddle
  box(g, 0.14, 0.12, 0.14, 0, 0.38, 0, DARK); // crank
  box(g, 0.2, 0.04, 0.12, 0.14, 0.38, 0, DARK); // pedal
  box(g, 0.2, 0.04, 0.12, -0.14, 0.38, 0, DARK);
  const rear = wheel(r, 0.07);
  rear.position.set(0, r, -0.62);
  g.add(rear);
  // rear rack with a crate
  box(g, 0.34, 0.08, 0.3, 0, 0.7, -0.64, '#ffd24a');
  // the front: fork and wheel, handlebars and basket turn together
  const steer = new THREE.Group();
  steer.position.set(0, 0.92, 0.42);
  const front = wheel(r, 0.07);
  front.position.set(0, -0.59, 0.2);
  steer.add(front);
  rod(steer, [0, 0, 0], [0, -0.59, 0.2], 0.03, DARK); // fork
  rod(steer, [0, 0, 0], [0, 0.16, -0.04], 0.04, DARK); // stem
  const bars = new THREE.Group();
  bars.position.set(0, 0.16, -0.04);
  rod(bars, [-0.26, 0, 0], [0.26, 0, 0], 0.03, DARK);
  rod(bars, [-0.26, 0, 0], [-0.26, 0.06, 0], 0.045, '#e2513f');
  rod(bars, [0.26, 0, 0], [0.26, 0.06, 0], 0.045, '#e2513f');
  steer.add(bars);
  box(steer, 0.42, 0.22, 0.3, 0, -0.32, 0.5, '#ffd24a'); // basket
  box(steer, 0.46, 0.04, 0.34, 0, -0.2, 0.5, '#e8b730');
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), paint('#ffd24a'));
  bell.position.set(0.2, 0.2, -0.06);
  steer.add(bell);
  g.add(steer);
  return { group: g, spin: [rear, front], steer: [steer], bars: [bars], wheelR: r, steerTurn: 0.6, lean: 0.25, arm: -1.15, shadow: [0.5, 1.9] };
}

/** The scooter: mint body, a red box on the back, steering column at the front. */
function scooter() {
  const g = new THREE.Group();
  const body = '#2fb5a6';
  box(g, 0.46, 0.44, 1.02, 0, 0.5, -0.02, body);
  box(g, 0.42, 0.44, 0.36, 0, 0.6, 0.5, body);
  box(g, 0.44, 0.06, 0.6, 0, 0.23, 0.22, '#cfd8e0'); // footboard
  box(g, 0.38, 0.1, 0.62, 0, 0.84, -0.22, '#3a3f4a'); // seat
  box(g, 0.5, 0.36, 0.42, 0, 0.98, -0.62, '#e2513f'); // box on the back
  box(g, 0.52, 0.06, 0.46, 0, 1.17, -0.62, '#ffe14a');
  box(g, 0.5, 0.14, 0.62, 0, 0.45, -0.66, body); // rear mudguard
  const rear = wheel(0.26, 0.12);
  rear.position.set(0, 0.26, -0.66);
  g.add(rear);
  const steer = new THREE.Group();
  steer.position.set(0, 0.5, 0.55);
  const front = wheel(0.27, 0.12);
  front.position.set(0, -0.23, 0.17);
  steer.add(front);
  rod(steer, [0, 0, 0], [0, 0.42, -0.05], 0.05, DARK); // column
  const bars = new THREE.Group();
  bars.position.set(0, 0.42, -0.05);
  rod(bars, [-0.26, 0, 0], [0.26, 0, 0], 0.035, DARK);
  rod(bars, [-0.26, 0, 0], [-0.26, -0.04, 0.02], 0.05, '#2b2f36');
  rod(bars, [0.26, 0, 0], [0.26, -0.04, 0.02], 0.05, '#2b2f36');
  box(bars, 0.42, 0.3, 0.03, 0, 0.14, -0.04, '#bfe8ff', [-0.3, 0, 0]); // windscreen
  steer.add(bars);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), paint('#fff3c0'));
  lamp.position.set(0, 0.08, 0.2);
  steer.add(lamp);
  g.add(steer);
  return { group: g, spin: [rear, front], steer: [steer], bars: [bars], wheelR: 0.27, lean: 0.12, leg: -1.2, arm: -0.9, hip: 0.85, shadow: [0.55, 1.6] };
}

/** The golf cart: a white box with a blue bench, a striped canopy and four fat wheels. */
function golfkar() {
  const g = new THREE.Group();
  const r = 0.32;
  box(g, 1.3, 0.36, 2.3, 0, 0.44, 0, '#fff4e0');
  box(g, 1.34, 0.12, 2.36, 0, 0.26, 0, '#cfd8e0'); // underbody
  box(g, 1.0, 0.3, 0.5, 0, 0.5, 1.25, '#e2513f'); // nose
  for (const s of [-1, 1]) box(g, 0.14, 0.12, 0.08, s * 0.4, 0.56, 1.52, '#fff3c0'); // headlights
  box(g, 1.2, 0.28, 0.6, 0, 0.78, -0.2, '#3a9ad9'); // driver's bench
  box(g, 1.2, 0.5, 0.14, 0, 1.0, -0.5, '#3a9ad9');
  box(g, 1.2, 0.28, 0.6, 0, 0.78, -0.92, '#3a9ad9'); // back bench
  box(g, 1.2, 0.5, 0.14, 0, 1.0, -1.22, '#3a9ad9');
  for (const x of [-0.58, 0.58]) for (const z of [-1.0, 1.0]) rod(g, [x, 0.5, z], [x, 1.95, z], 0.05, '#cfd8e0');
  for (let i = 0; i < 5; i++) {
    box(g, 0.26, 0.08, 2.5, -0.52 + i * 0.26, 1.98, 0, i % 2 ? WHITE : '#ffe14a', [0.04, 0, 0]);
  }
  // steering column and wheel, turned by the steer amount
  rod(g, [0, 0.7, 0.4], [0, 1.22, 0.7], 0.04, DARK);
  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0, 1.22, 0.7);
  wheelPivot.rotation.x = -0.9;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 14), paint(DARK));
  wheelPivot.add(ring);
  rod(wheelPivot, [0, 0, 0], [0, 0, 0.04], 0.02, DARK);
  rod(wheelPivot, [-0.2, 0, 0], [0.2, 0, 0], 0.02, DARK);
  g.add(wheelPivot);
  const steer = [];
  const front = new THREE.Group();
  front.position.set(0, r, 0.9);
  for (const x of [-0.78, 0.78]) {
    const w = wheel(r, 0.24);
    w.position.set(x, 0, 0);
    front.add(w);
  }
  g.add(front);
  steer.push(front);
  const spin = [];
  for (const x of [-0.78, 0.78]) {
    const w = wheel(r, 0.24);
    w.position.set(x, r, -0.9);
    g.add(w);
    spin.push(w);
  }
  for (const w of front.children) spin.push(w);
  return { group: g, spin, steer, bars: [wheelPivot], wheelR: r, lean: 0, leg: -1.25, arm: -1.05, hip: 0.85, shadow: [1.5, 2.9] };
}

/** A hull outline (top view, bow at +y) extruded into a boat body from y0 to y1. */
function hull(points, y0, y1, color) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => (i ? shape.lineTo(x, z) : shape.moveTo(x, z)));
  shape.closePath();
  const depth = y1 - y0;
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.rotateX(Math.PI / 2); // shape y -> world z (the bow), extrusion -> up
  geo.translate(0, y0 + depth, 0);
  const m = new THREE.Mesh(geo, paint(color));
  m.castShadow = true;
  return m;
}

/** The rowing boat: orange hull, white benches, two oars that swing when you row. */
function roeiboot() {
  const g = new THREE.Group();
  const outline = [[-0.95, -1.6], [0.95, -1.6], [1.0, 0.2], [0, 1.95], [-1.0, 0.2]];
  g.add(hull(outline, 0.05, 0.5, '#ff8a3a'));
  g.add(hull(outline.map(([x, z]) => [x * 0.9, z * 0.92]), 0.42, 0.52, '#e8703a'));
  box(g, 1.5, 0.07, 0.34, 0, 0.5, 0.45, WHITE);
  box(g, 1.5, 0.07, 0.34, 0, 0.5, -0.5, WHITE);
  const oars = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.95, 0.62, 0);
    rod(pivot, [0, 0, 0], [s * 0.45, 0, -1.9], 0.035, '#a8743a');
    box(pivot, 0.12, 0.05, 0.55, s * 0.45, 0, -2.1, '#e2513f');
    g.add(pivot);
    oars.push(pivot);
  }
  return { group: g, spin: [], steer: [], bars: [], oars, wheelR: 0, boat: true, seat: 0.5, shadow: null };
}

/** The motor boat: white hull with a red waterline, a cabin, a cockpit seat and a propeller. */
function motorboot() {
  const g = new THREE.Group();
  const outline = [[-1.1, -2.0], [1.1, -2.0], [1.15, 0.4], [0.5, 1.8], [0, 2.3], [-0.5, 1.8], [-1.15, 0.4]];
  g.add(hull(outline.map(([x, z]) => [x * 1.03, z * 1.02]), 0.0, 0.2, '#e2513f'));
  g.add(hull(outline, 0.15, 0.7, WHITE));
  box(g, 1.7, 0.08, 1.4, 0, 0.72, -0.5, '#ffe14a'); // deck strip
  box(g, 1.6, 0.8, 1.0, 0, 1.15, 0.7, WHITE); // cabin
  box(g, 1.8, 0.1, 1.2, 0, 1.6, 0.7, '#e2513f'); // cabin roof
  box(g, 1.5, 0.6, 0.06, 0, 1.2, 1.2, '#8fd2ff', [-0.35, 0, 0]); // windscreen
  box(g, 0.5, 0.06, 0.1, 0, 1.22, 1.0, DARK); // helm
  box(g, 1.6, 0.2, 0.6, 0, 0.66, -0.9, '#3a9ad9'); // cockpit bench
  box(g, 1.6, 0.4, 0.14, 0, 0.9, -1.2, '#3a9ad9');
  const eng = new THREE.Group();
  eng.position.set(0, 0.55, -2.3);
  box(eng, 0.36, 0.9, 0.36, 0, 0.1, 0, DARK);
  g.add(eng);
  const prop = new THREE.Group();
  prop.position.set(0, 0.22, -2.6);
  box(prop, 0.08, 0.5, 0.06, 0, 0, 0, '#cfd8e0');
  box(prop, 0.08, 0.06, 0.5, 0, 0, 0, '#cfd8e0');
  g.add(prop);
  return { group: g, spin: [], steer: [], bars: [], oars: [], prop, wheelR: 0, boat: true, seat: 0.6, shadow: null };
}

/** The sailing boat of the piers (world/sailboat.js), in the colour it had there. */
function zeilboot({ color } = {}) {
  return { group: sailboat(color), spin: [], steer: [], bars: [], oars: [], wheelR: 0, boat: true, seat: 0.84, arm: -0.7, shadow: null };
}

const MODELS = { fiets, scooter, golfkar, roeiboot, motorboot, zeilboot };

/** Builds the model for a vehicle type (see data.js). Returns the parts described above. */
export function buildVehicle(type, opts = {}) {
  const m = MODELS[type](opts);
  if (!m.boat) m.group.add(blob(m.shadow[0], m.shadow[1]));
  m.type = type;
  return m;
}
