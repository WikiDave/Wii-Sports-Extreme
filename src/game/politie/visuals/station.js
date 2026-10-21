// The police post of Havenstad, the checkpoint booth on the road and the barrier of a roadblock.
// Flat colours, shared geometry, the way the other buildings of the island are made.

import * as THREE from 'three';

const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 8);
const WHITE = mat('#f4f7fb');
const BLUE = mat('#2a5bd7');
const DARK = mat('#2c3440');
const GLASS = new THREE.MeshLambertMaterial({ color: '#8fd2ff', emissive: '#ffd36a', emissiveIntensity: 0, flatShading: true });
const RED = mat('#e2513f');

const part = (geo, m, x, y, z, sx, sy, sz) => {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  return o;
};

/** A sign texture: blue board, white letters. */
function signTexture(text, w = 512, h = 128) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#2a5bd7';
  x.fillRect(0, 0, w, h);
  x.fillStyle = '#ffffff';
  x.font = 'bold 84px sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The police post: two storeys of white walls with a blue band, a flat roof with a little light,
 * a sign over the door (+z is the front) and a flag. Returns { group, glass, door: {x, z} } where
 * door is the front door in local coordinates.
 */
export function buildPoliceStation() {
  const g = new THREE.Group();
  g.add(part(box, WHITE, 0, 2.6, 0, 9, 5.2, 7));
  g.add(part(box, BLUE, 0, 0.7, 0, 9.1, 0.9, 7.1));
  g.add(part(box, BLUE, 0, 5.5, 0, 9.4, 0.5, 7.4));
  g.add(part(box, DARK, 0, 6.1, 0, 4, 0.5, 2.2));
  g.add(part(box, mat('#fff6c4'), 0, 6.45, 0, 1.2, 0.3, 0.6));
  // Windows, two per side of the door.
  for (const x of [-3, 3]) {
    g.add(part(box, DARK, x, 3, 3.56, 1.7, 1.6, 0.14));
    g.add(part(box, GLASS, x, 3, 3.64, 1.4, 1.3, 0.1));
  }
  // The door and the sign.
  g.add(part(box, DARK, 0, 1.45, 3.56, 1.8, 2.9, 0.16));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshBasicMaterial({ map: signTexture('POLITIE'), toneMapped: false }));
  sign.position.set(0, 4.5, 3.66);
  g.add(sign);
  // A flag on a pole.
  g.add(part(cyl, DARK, 4.1, 3.8, 3.1, 0.07, 3.6, 0.07));
  g.add(part(box, BLUE, 4.85, 5.4, 3.1, 1.3, 0.8, 0.05));
  g.add(part(box, RED, 4.85, 5.05, 3.1, 1.3, 0.08, 0.05));
  return { group: g, glass: GLASS, door: { x: 0, z: 4.6 } };
}

/**
 * The checkpoint: a barrier arm across the road on two posts (local x is across the road, z along
 * it, the origin is the road's centre) and a booth beside the road on the right shoulder.
 */
export function buildCheckpoint() {
  const g = new THREE.Group();
  for (const x of [-2.6, 2.6]) g.add(part(cyl, DARK, x, 1, 0, 0.12, 2, 0.12));
  g.add(part(box, WHITE, 0, 1.6, 0, 5.2, 0.22, 0.22));
  g.add(part(box, RED, -1.5, 1.6, 0.01, 1.2, 0.24, 0.24), part(box, RED, 1.5, 1.6, 0.01, 1.2, 0.24, 0.24));
  const booth = new THREE.Group();
  booth.add(part(box, WHITE, 0, 1.2, 0, 1.6, 2.4, 1.6));
  booth.add(part(box, GLASS, 0, 1.5, 0.82, 1.2, 0.8, 0.08));
  booth.add(part(box, BLUE, 0, 2.6, 0, 1.8, 0.25, 1.8));
  booth.position.set(4.6, 0, -2.4);
  g.add(booth);
  return g;
}

/** A roadblock barrier: a striped plank across the road. */
export function buildBarrier() {
  const g = new THREE.Group();
  g.add(part(box, WHITE, 0, 0.6, 0, 5.4, 0.9, 0.5));
  g.add(part(box, RED, -1.4, 0.6, 0.01, 1.1, 0.92, 0.52));
  g.add(part(box, RED, 1.4, 0.6, 0.01, 1.1, 0.92, 0.52));
  return g;
}
