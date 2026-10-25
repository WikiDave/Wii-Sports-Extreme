// A sailing boat in the Resort style: a rounded hull in a bright colour with a dark waterline and
// a white rim, a wooden deck, a little cabin with portholes, a mast with a boom, a white mainsail
// and jib, and a flag on top. The bow points to +z. Everything sits in userData.hull, so the
// whole boat rocks on the swell (bobBoats in buildings.js). Shared geometries and materials.

import * as THREE from 'three';

// Top view of the hull: the stern at -z, the bow at +z.
const OUTLINE = [[-0.8, -2.1], [0.8, -2.1], [0.95, -1.0], [0.92, 0.4], [0.7, 1.4], [0.35, 2.1], [0, 2.5], [-0.35, 2.1], [-0.7, 1.4], [-0.92, 0.4], [-0.95, -1.0]];

/** The outline (scaled) as a slab from y0 to y1. */
function slab(scale, y0, y1) {
  const s = new THREE.Shape();
  OUTLINE.forEach(([x, z], i) => (i ? s.lineTo(x * scale, z * scale) : s.moveTo(x * scale, z * scale)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(Math.PI / 2); // shape y -> world z, the extrusion -> down
  g.translate(0, y1, 0);
  return g;
}

/** A triangle (a sail) through three points. */
function triangle(a, b, c) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  g.computeVertexNormals();
  return g;
}

let GEO = null;
const geo = () =>
  (GEO ??= {
    hull: slab(1, 0.05, 0.8),
    waterline: slab(1.03, -0.05, 0.24),
    rim: slab(1.05, 0.78, 0.9),
    deck: slab(0.9, 0.8, 0.84),
    box: new THREE.BoxGeometry(1, 1, 1),
    pole: new THREE.CylinderGeometry(1, 1, 1, 8),
    port: new THREE.CylinderGeometry(1, 1, 1, 10),
    main: triangle([0, 6.0, 0.48], [0, 1.85, 0.45], [0, 1.85, -2.0]),
    jib: triangle([0, 5.4, 0.62], [0, 1.0, 2.35], [0, 1.35, 0.7]),
  });

const MATS = {};
const paint = (color, extra = {}) => (MATS[color + JSON.stringify(extra)] ??= new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra }));
const sailMat = () => paint('#fffaf0', { side: THREE.DoubleSide });

function piece(g, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  g.add(m);
  return m;
}

/** A new sailing boat with its hull in `color`. */
export function sailboat(color = '#3a9ad9') {
  const G = geo();
  const g = new THREE.Group();
  const hull = new THREE.Group();
  piece(hull, G.hull, paint(color), 0, 0, 0);
  piece(hull, G.waterline, paint('#26364d'), 0, 0, 0);
  piece(hull, G.rim, paint('#ffffff'), 0, 0, 0);
  piece(hull, G.deck, paint('#d9b07a'), 0, 0, 0);
  // The cabin, with a roof in the hull colour and three portholes a side.
  piece(hull, G.box, paint('#ffffff'), 0, 1.12, 0.25, 1.1, 0.56, 1.45);
  piece(hull, G.box, paint(color), 0, 1.44, 0.25, 1.22, 0.1, 1.6);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const p = piece(hull, G.port, paint('#2a3a52'), s * 0.56, 1.14, -0.2 + i * 0.45, 0.1, 0.03, 0.1);
      p.rotation.z = Math.PI / 2;
    }
  }
  // Mast, boom and the sails.
  piece(hull, G.pole, paint('#f2efe6'), 0, 3.55, 0.55, 0.06, 5.3, 0.06);
  const boom = piece(hull, G.pole, paint('#f2efe6'), 0, 1.78, -0.8, 0.05, 2.7, 0.05);
  boom.rotation.x = Math.PI / 2;
  piece(hull, G.main, sailMat(), 0, 0, 0);
  piece(hull, G.jib, sailMat(), 0, 0, 0);
  piece(hull, G.box, paint(color), 0.22, 6.12, 0.55, 0.4, 0.24, 0.03); // the flag
  // A tiller at the stern, for the one at the helm.
  piece(hull, G.box, paint('#a8743a'), 0, 0.98, -1.95, 0.08, 0.08, 0.8);
  g.add(hull);
  g.userData.hull = hull;
  g.userData.boat = true;
  return g;
}
