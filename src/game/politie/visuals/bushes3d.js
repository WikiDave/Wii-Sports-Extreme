// Bushes you can hide in: round green clusters that do not block the way. Shared geometry and
// three greens; the places come from politie/hide.js (placeBushes).

import * as THREE from 'three';

const GREENS = ['#3f9b43', '#4fb43f', '#2f7d3a'].map((c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
const blob = new THREE.IcosahedronGeometry(1, 0);

/** One bush at each place: three blobs of leaves. Returns a group. */
export function buildBushes(places) {
  const g = new THREE.Group();
  places.forEach((p, i) => {
    const bush = new THREE.Group();
    const offsets = [
      [0, 0.7, 0, 1.0],
      [0.7, 0.45, 0.4, 0.7],
      [-0.6, 0.4, -0.3, 0.75],
    ];
    offsets.forEach(([x, y, z, s], k) => {
      const m = new THREE.Mesh(blob, GREENS[(i + k) % GREENS.length]);
      m.position.set(x, y, z);
      m.scale.setScalar(s * 0.95 * p.s);
      bush.add(m);
    });
    bush.position.set(p.x, p.y - 0.1, p.z);
    bush.rotation.y = i * 1.7;
    g.add(bush);
  });
  return g;
}
