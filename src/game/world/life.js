// Life on the island: seagulls circling the coast, sailboats cruising at sea, and villagers
// (Miis) walking along the paths. All decoration: they do not collide and cannot be talked to.

import * as THREE from 'three';
import { MiiModel } from '../../mii/model.js';
import { OFFICIAL_MIIS } from '../../mii/official.js';
import { MII_SCALE } from '../player.js';
import { boat, bobBoats } from './buildings.js';
import { heightAt } from './island.js';
import { shadowsOn } from './render.js';
import { PATHS } from './zones.js';

const gullMat = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide, flatShading: true });
const wingGeo = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.25, 0, 0, 0.3, 1.5, 0.12, -0.05], 3));
  g.setIndex([0, 1, 2]);
  g.computeVertexNormals();
  return g;
})();
const bodyGeo = new THREE.ConeGeometry(0.16, 0.8, 5);
bodyGeo.rotateX(Math.PI / 2);

function gull() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(bodyGeo, gullMat));
  const l = new THREE.Mesh(wingGeo, gullMat);
  const r = new THREE.Mesh(wingGeo, gullMat);
  r.scale.x = -1;
  g.add(l, r);
  g.userData.wings = [l, r];
  g.scale.setScalar(2.4);
  return g;
}

export class Life {
  /** pathHeights: nothing needed; phone: fewer villagers. */
  constructor(scene, { phone = false } = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    // Seagulls: each circles a point near the coast at its own height and speed.
    this.gulls = [];
    const centres = [[20, 290], [250, 150], [-60, 140], [-280, -60], [60, -300], [470, -230], [330, 40], [-100, 260]];
    for (let i = 0; i < 14; i++) {
      const [cx, cz] = centres[i % centres.length];
      const g = gull();
      g.userData = { ...g.userData, cx: cx + (Math.random() - 0.5) * 40, cz: cz + (Math.random() - 0.5) * 40, r: 18 + Math.random() * 40, h: 14 + Math.random() * 22, w: (0.25 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1), p: Math.random() * 6.28 };
      this.group.add(g);
      this.gulls.push(g);
    }

    // Sailboats on a wide loop round the island, over deep water.
    this.ships = [];
    const colors = ['#ffffff', '#ffe14a', '#e2513f'];
    for (let i = 0; i < 3; i++) {
      const b = boat(colors[i]);
      b.scale.setScalar(1.6);
      b.userData.phase = i * 2.1;
      b.userData.a = (i / 3) * Math.PI * 2;
      this.group.add(b);
      this.ships.push(b);
    }

    // Villagers walking along the paths, back and forth.
    this.walkers = [];
    const names = ['Keiko', 'Yoko', 'Miyu', 'Ai', 'Misaki', 'Rin', 'Kentaro', 'Takumi', 'Haru', 'Yoshi'];
    const count = phone ? 5 : 9;
    for (let i = 0; i < count; i++) {
      const line = PATHS[i % PATHS.length];
      const data = structuredClone(OFFICIAL_MIIS.find((m) => m.name === names[i % names.length]));
      const mii = new MiiModel(data);
      mii.group.scale.setScalar(MII_SCALE);
      shadowsOn(mii.group, false);
      // The route as cumulative distances along the polyline.
      const lens = line.slice(1).map((b, k) => Math.hypot(b[0] - line[k][0], b[1] - line[k][1]));
      const total = lens.reduce((a, b) => a + b, 0);
      this.group.add(mii.group);
      this.walkers.push({ mii, line, lens, total, d: Math.random() * total, dir: i % 2 ? 1 : -1, speed: 1.3 + Math.random() * 0.5, phase: Math.random() * 6, offset: (Math.random() - 0.5) * 1.6 });
    }
  }

  pointOn(w) {
    let d = w.d;
    for (let k = 0; k < w.lens.length; k++) {
      if (d <= w.lens[k] || k === w.lens.length - 1) {
        const t = Math.min(1, d / w.lens[k]);
        const a = w.line[k];
        const b = w.line[k + 1];
        const hx = (b[0] - a[0]) / w.lens[k];
        const hz = (b[1] - a[1]) / w.lens[k];
        return { x: a[0] + (b[0] - a[0]) * t - hz * w.offset, z: a[1] + (b[1] - a[1]) * t + hx * w.offset, hx, hz };
      }
      d -= w.lens[k];
    }
  }

  update(t, dt, camera) {
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (const g of this.gulls) {
      const u = g.userData;
      const a = u.p + t * u.w;
      g.position.set(u.cx + Math.cos(a) * u.r, u.h + Math.sin(t * 0.7 + u.p) * 2, u.cz + Math.sin(a) * u.r);
      g.rotation.y = Math.atan2(-Math.sin(a) * Math.sign(u.w), Math.cos(a) * Math.sign(u.w));
      g.rotation.z = -0.25 * Math.sign(u.w);
      const flap = Math.sin(t * 7 + u.p) * 0.5;
      u.wings[0].rotation.z = flap;
      u.wings[1].rotation.z = -flap;
    }
    // Ships: slow ellipse round the island.
    for (const s of this.ships) {
      const a = s.userData.a + t * 0.012;
      const x = 80 + Math.cos(a) * 640;
      const z = -20 + Math.sin(a) * 560;
      s.position.set(x, 0, z);
      s.rotation.y = Math.atan2(-Math.sin(a) * 560, Math.cos(a) * 640);
      s.userData.base = s.position;
    }
    bobBoats(this.ships, t);
    // Villagers
    for (const w of this.walkers) {
      w.d += w.dir * w.speed * dt;
      if (w.d < 0 || w.d > w.total) {
        w.dir *= -1;
        w.d = Math.max(0, Math.min(w.total, w.d));
      }
      const p = this.pointOn(w);
      const near = (p.x - cx) ** 2 + (p.z - cz) ** 2 < 220 * 220;
      w.mii.group.visible = near;
      if (!near) continue;
      w.mii.group.position.set(p.x, heightAt(p.x, p.z), p.z);
      w.mii.group.rotation.y = Math.atan2(p.hx * w.dir, p.hz * w.dir);
      w.phase += dt * 7.5;
      const s = Math.sin(w.phase) * 0.45;
      const parts = w.mii.parts;
      parts.legL.rotation.x = s;
      parts.legR.rotation.x = -s;
      parts.armL.rotation.x = -s * 0.9;
      parts.armR.rotation.x = s * 0.9;
      parts.armL.rotation.z = 0.08;
      parts.armR.rotation.z = -0.08;
    }
  }

  dispose() {
    for (const w of this.walkers) w.mii.dispose();
  }
}
