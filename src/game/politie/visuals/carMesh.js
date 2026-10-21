// A low-poly police car: white body with a blue stripe, a dark cabin and a light bar that flashes
// red and blue. Built once per car; the light bar is animated by setLights().

import * as THREE from 'three';

const body = new THREE.MeshLambertMaterial({ color: '#f4f7fb', flatShading: true });
const stripe = new THREE.MeshLambertMaterial({ color: '#2a5bd7', flatShading: true });
const glass = new THREE.MeshLambertMaterial({ color: '#2a3340', flatShading: true });
const tyre = new THREE.MeshLambertMaterial({ color: '#23262b', flatShading: true });
const box = new THREE.BoxGeometry(1, 1, 1);
const wheel = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 8);
wheel.rotateZ(Math.PI / 2);

const part = (geo, mat, x, y, z, sx, sy, sz) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
};

/** The car: front is +z. Returns { group, red, blue } (the two lamp materials of the light bar). */
export function buildPoliceCar() {
  const g = new THREE.Group();
  g.add(part(box, body, 0, 0.75, 0, 1.9, 0.8, 4.2));
  g.add(part(box, stripe, 0, 0.9, 0, 1.94, 0.14, 4.22));
  g.add(part(box, glass, 0, 1.45, -0.25, 1.62, 0.62, 2.0));
  g.add(part(box, glass, 0, 1.2, 1.6, 1.7, 0.4, 0.2));
  for (const z of [-1.35, 1.35]) {
    for (const x of [-0.98, 0.98]) {
      const w = new THREE.Mesh(wheel, tyre);
      w.position.set(x, 0.36, z);
      g.add(w);
    }
  }
  const red = new THREE.MeshBasicMaterial({ color: '#ff2a2a' });
  const blue = new THREE.MeshBasicMaterial({ color: '#2a7bff' });
  g.add(part(box, body, 0, 1.9, -0.2, 1.3, 0.2, 0.55));
  g.add(part(box, red, -0.34, 2.05, -0.2, 0.52, 0.22, 0.4), part(box, blue, 0.34, 2.05, -0.2, 0.52, 0.22, 0.4));
  return { group: g, red, blue };
}

const ON = new THREE.Color('#ff2a2a');
const OFF = new THREE.Color('#5a1212');
const ON_B = new THREE.Color('#2a7bff');
const OFF_B = new THREE.Color('#12305e');

/** Flashes the light bar: red and blue take turns; `on` false turns both dim. */
export function setLights(car, t, on) {
  const phase = Math.floor(t * 5) % 2;
  car.red.color.copy(on && phase === 0 ? ON : OFF);
  car.blue.color.copy(on && phase === 1 ? ON_B : OFF_B);
}
