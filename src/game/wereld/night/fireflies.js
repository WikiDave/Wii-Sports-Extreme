// Fireflies in the hills at night: a few dozen small yellow-green points that drift slowly
// round their starting places. One Points object; it is hidden by day.

import * as THREE from 'three';
import { softTexture } from '../exterior/volcano.js';

export class Fireflies {
  /** places: [{ x, y, z }] start points (ground plus a height); the feature picks them. */
  constructor(scene, places) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.base = places;
    const n = places.length;
    this.pos = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.tex = softTexture('rgba(255,255,190,1)');
    this.material = new THREE.PointsMaterial({ color: '#e8ff8a', size: 1.6, sizeAttenuation: true, map: this.tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  update(t, night) {
    this.group.visible = night > 0.05;
    if (!this.group.visible) return;
    this.material.opacity = 0.9 * night * (0.7 + 0.3 * Math.sin(t * 1.7));
    this.base.forEach((p, i) => {
      this.pos[i * 3] = p.x + Math.sin(t * 0.37 + i * 1.9) * 3.5;
      this.pos[i * 3 + 1] = p.y + Math.sin(t * 0.9 + i * 2.3) * 0.9;
      this.pos[i * 3 + 2] = p.z + Math.cos(t * 0.31 + i * 1.3) * 3.5;
    });
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.tex.dispose();
    this.points.geometry.dispose();
    this.material.dispose();
    this.group.removeFromParent();
  }
}
