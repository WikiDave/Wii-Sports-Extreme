// The beach campfire: a ring of stones, logs and three flickering flames, with a warm light on
// the sand and sparks that rise and fade. Only the flames and the light grow at night; the
// sparks are a small pool of points, recycled.

import * as THREE from 'three';
import { mat } from '../mats.js';
import { softTexture } from '../exterior/volcano.js';
import { cyl } from '../interior/common.js';

const SPARKS = 32;

export class Campfire {
  /** site: { x, y, z }; light: the PointLight the feature gave us (the scene has four in all). */
  constructor(scene, site, light) {
    this.group = new THREE.Group();
    this.group.position.set(site.x, site.y, site.z);
    scene.add(this.group);
    this.light = light;
    this.light.position.set(site.x, site.y + 1.6, site.z);
    // Stones: one instanced draw.
    const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.42, 0), mat('#8f8a84'), 10);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      m.compose(new THREE.Vector3(Math.cos(a) * 2.1, 0.2, Math.sin(a) * 2.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(i, a, 0)), new THREE.Vector3(1.2, 0.7, 1));
      stones.setMatrixAt(i, m);
    }
    this.group.add(stones);
    // Logs criss-crossing on the ground.
    for (let i = 0; i < 3; i++) {
      const log = cyl(0.22, 0.22, 2.4, '#6a4a2a', 0, 0.3, 0, 6);
      log.rotation.set(0, (i / 3) * Math.PI, Math.PI / 2 - 0.25 * (i - 1));
      log.position.y = 0.26;
      this.group.add(log);
    }
    // Flames: three cones (outer orange, inner yellow) that flicker in height and lean.
    this.flames = [];
    for (let i = 0; i < 3; i++) {
      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 7, 1, true), new THREE.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.0, 6, 1, true), new THREE.MeshBasicMaterial({ color: '#fff1a0', transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
      const f = new THREE.Group();
      outer.position.y = 0.8;
      inner.position.y = 0.6;
      f.add(outer, inner);
      f.position.set(Math.cos(i * 2.1) * 0.35, 0.4, Math.sin(i * 2.1) * 0.35);
      this.group.add(f);
      this.flames.push(f);
    }
    // A soft glow on the sand.
    this.glowTex = softTexture('rgba(255,160,70,1)');
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: '#ffb070', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glow.scale.set(9, 9, 1);
    this.glow.position.set(0, 0.6, 0);
    this.group.add(this.glow);
    // Sparks: a pool of points that rise from the flames and fade.
    const pos = new Float32Array(SPARKS * 3);
    this.sparks = [];
    for (let i = 0; i < SPARKS; i++) this.sparks.push({ x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, life: 0, seed: i * 1.37 });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.pos = pos;
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffd36a', size: 0.16, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.group.add(this.points);
    this.cursor = 0;
  }

  /** t in seconds, night 0..1; dt seconds since the last frame. */
  update(t, dt, night) {
    const flick = 0.85 + Math.sin(t * 9.1) * 0.08 + Math.sin(t * 17.3) * 0.05;
    this.flames.forEach((f, i) => {
      const k = 1 + Math.sin(t * (6 + i * 1.3) + i) * 0.12;
      f.scale.set(1 + Math.sin(t * 5 + i) * 0.08, k, 1 + Math.cos(t * 4.6 + i) * 0.08);
      f.rotation.z = Math.sin(t * 2.1 + i * 2) * 0.12;
    });
    this.light.intensity = night * (5 + Math.sin(t * 8.2) * 0.9 + Math.sin(t * 13.7) * 0.5);
    this.glow.material.opacity = 0.9 * night * flick;
    this.points.material.opacity = 0.9 * night;
    // Sparks: spawn one now and then, move the live ones.
    this.cursor -= dt;
    if (this.cursor <= 0 && night > 0.1) {
      this.cursor = 0.12;
      const s = this.sparks.find((p) => p.life <= 0);
      if (s) {
        s.x = (Math.random() - 0.5) * 0.8;
        s.y = 1.2;
        s.z = (Math.random() - 0.5) * 0.8;
        s.vx = (Math.random() - 0.5) * 0.8;
        s.vy = 1.6 + Math.random() * 1.6;
        s.vz = (Math.random() - 0.5) * 0.8;
        s.life = 1.4 + Math.random();
      }
    }
    this.sparks.forEach((s, i) => {
      if (s.life > 0) {
        s.life -= dt;
        s.vy -= dt * 0.4;
        s.x += (s.vx + Math.sin(t * 3 + s.seed) * 0.2) * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;
      } else {
        s.y = -10;
      }
      this.pos[i * 3] = s.x;
      this.pos[i * 3 + 1] = s.y;
      this.pos[i * 3 + 2] = s.z;
    });
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.light.intensity = 0;
    this.glowTex.dispose();
    this.group.traverse((o) => {
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
    this.group.removeFromParent();
  }
}
