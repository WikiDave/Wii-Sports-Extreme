// Festive lights for the night: strings of bulbs between posts (along the jetty and round the
// market), and glowing halos on the windows of the houses. The bulbs share one material whose
// glow follows the night, and all of them are one instanced draw call.

import * as THREE from 'three';
import { softTexture } from '../exterior/volcano.js';

const BULB_COLOURS = ['#ffe9a0', '#ffb3cf', '#a6e8ff', '#fff3c0', '#c9ffb0'];

/** Points along the sagging curve from a to b (catenary-ish, sag in metres), n+1 points. */
export function sagPoints(a, b, sag, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t), z: a.z + (b.z - a.z) * t });
  }
  return out;
}

export class StringLights {
  /** strings: [{ a, b, sag }] with points { x, y, z }; step: metres between bulbs. */
  constructor(scene, strings, step = 0.7) {
    this.group = new THREE.Group();
    scene.add(this.group);
    const bulbs = [];
    const wires = [];
    for (const s of strings) {
      const len = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y, s.b.z - s.a.z);
      const n = Math.max(2, Math.round(len / step));
      const pts = sagPoints(s.a, s.b, s.sag ?? 0.5, n);
      for (let i = 0; i < pts.length - 1; i++) {
        wires.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
      }
      for (let i = 1; i < pts.length - 1; i++) bulbs.push(pts[i]);
    }
    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
    this.group.add(new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: '#3a4452' })));
    const geo = new THREE.SphereGeometry(0.13, 6, 5);
    this.material = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#ffd36a', emissiveIntensity: 0 });
    this.bulbs = new THREE.InstancedMesh(geo, this.material, Math.max(1, bulbs.length));
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    bulbs.forEach((p, i) => {
      m.makeTranslation(p.x, p.y, p.z);
      this.bulbs.setMatrixAt(i, m);
      this.bulbs.setColorAt(i, c.set(BULB_COLOURS[i % BULB_COLOURS.length]));
    });
    this.bulbs.count = bulbs.length;
    this.bulbs.instanceMatrix.needsUpdate = true;
    if (this.bulbs.instanceColor) this.bulbs.instanceColor.needsUpdate = true;
    this.group.add(this.bulbs);
    this.n = bulbs.length;
  }

  /** night 0..1: the bulbs glow more as it gets darker, with a gentle twinkle. */
  update(t, night) {
    this.group.visible = night > 0.02;
    this.material.emissiveIntensity = night * (1.4 + Math.sin(t * 2.3) * 0.15);
  }

  dispose() {
    this.bulbs.geometry.dispose();
    this.group.traverse((o) => o.geometry?.dispose?.());
    this.group.removeFromParent();
  }
}

/**
 * Glowing halos on the window panes of the houses at night. houses: the house groups from the
 * props (userData.house) with their body (children[1]: scale = w, h, d); about 60% of the
 * houses light up, chosen by their position.
 */
export class WindowHalos {
  constructor(scene, houses) {
    this.group = new THREE.Group();
    scene.add(this.group);
    const tex = softTexture('rgba(255, 214, 130, 1)');
    this.material = new THREE.MeshBasicMaterial({ map: tex, color: '#ffe0a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const spots = [];
    for (const house of houses) {
      const body = house.children[1];
      if (!body) continue;
      const w = body.scale.x;
      const d = body.scale.z;
      const lit = (Math.sin(house.position.x * 12.9898 + house.position.z * 78.233) * 43758.5453) % 1;
      if (Math.abs(lit) > 0.6) continue;
      const cos = Math.cos(house.rotation.y);
      const sin = Math.sin(house.rotation.y);
      for (const sx of [-0.3, 0.3]) {
        const lx = sx * w;
        const lz = d / 2 + 0.16;
        spots.push({
          x: house.position.x + lx * cos + lz * sin,
          y: house.position.y + 2.2,
          z: house.position.z - lx * sin + lz * cos,
          ry: house.rotation.y,
        });
      }
    }
    this.n = spots.length;
    const geo = new THREE.PlaneGeometry(2.6, 2.4);
    this.mesh = new THREE.InstancedMesh(geo, this.material, Math.max(1, spots.length));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    spots.forEach((p, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.ry);
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, s);
      this.mesh.setMatrixAt(i, m);
    });
    this.mesh.count = spots.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.mesh);
    this.tex = tex;
  }

  update(night) {
    this.group.visible = night > 0.05;
    this.material.opacity = 0.75 * night;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.tex.dispose();
    this.group.removeFromParent();
  }
}
