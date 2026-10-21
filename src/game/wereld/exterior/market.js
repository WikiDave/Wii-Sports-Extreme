// The market square of Havenstad: a round plaza with a fountain and nine colourful stalls in a
// ring, bunting between the stall roofs that flutters in the wind, and crates of goods on the
// counters. The strings of lights are built in night/strings.js from the same ring.

import * as THREE from 'three';
import { buildStall } from '../../world/stall.js';
import { mat } from '../mats.js';
import { MARKET_RING } from './sites.js';

export const AWNINGS = ['#e2513f', '#3a9ad9', '#ffe14a', '#2fb5a6', '#f09a3a', '#8e5fd0', '#ff7aa8', '#7ed957', '#ffffff'];
const FLAG_COLORS = ['#e2513f', '#ffe14a', '#3a9ad9', '#ffffff', '#2fb5a6', '#ff7aa8'];
const FLAGS_PER_SEGMENT = 7;

/** The ring of stall positions: { x, y, z, ry, colour } for stall i (its counter faces the centre). */
export function stallRing(site, n = 9) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = site.x + Math.cos(a) * MARKET_RING;
    const z = site.z + Math.sin(a) * MARKET_RING;
    out.push({ x, z, a, colour: AWNINGS[i % AWNINGS.length], ry: Math.atan2(-Math.cos(a), -Math.sin(a)) });
  }
  return out;
}

export class Market {
  /** site: { x, y, z } of the centre; heightAt for the stalls' ground. */
  constructor(scene, site, heightAt) {
    this.group = new THREE.Group();
    scene.add(this.group);
    const y = site.y;
    // The plaza: a round slab of warm paving, a little raised above the ground.
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(MARKET_RING + 2.5, MARKET_RING + 2.8, 0.5, 28), mat('#e9d8b0'));
    plaza.position.set(site.x, y + 0.05, site.z);
    this.group.add(plaza);
    // Fountain: a basin with water and a little column with a spout.
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.7, 16), mat('#f4efe4'));
    basin.position.set(site.x, y + 0.45, site.z);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.1, 16), mat('#4fd6ff', { emissive: '#1b8fc4', emissiveIntensity: 0.25 }));
    water.position.set(site.x, y + 0.72, site.z);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.6, 8), mat('#f4efe4'));
    column.position.set(site.x, y + 1.3, site.z);
    const spout = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), mat('#bfe8ff'));
    spout.position.set(site.x, y + 2.2, site.z);
    this.group.add(basin, water, column, spout);
    this.fountainSpout = spout;
    this.spoutY = spout.position.y;

    // Stalls in a ring; crates of goods on each counter.
    this.stalls = stallRing(site);
    this.stallObjs = [];
    for (const s of this.stalls) {
      const stall = buildStall(s.colour);
      const sy = heightAt(s.x, s.z);
      stall.position.set(s.x, sy - 0.1, s.z);
      stall.rotation.y = s.ry;
      this.group.add(stall);
      for (let k = 0; k < 4; k++) {
        const c = ['#ffd820', '#ff6e19', '#78d220', '#f55a7d', '#3caade'][(k + Math.round(s.a * 3)) % 5];
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.6), mat(c));
        crate.position.set(-1.6 + k * 1.05, 1.42, 0.1);
        stall.add(crate);
      }
      this.stallObjs.push(stall);
    }

    // Bunting: flags between neighbouring stall roofs, sagging a little.
    const flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.5, 0], 3));
    flagGeo.computeVertexNormals();
    const n = this.stalls.length * FLAGS_PER_SEGMENT;
    this.flags = new THREE.InstancedMesh(flagGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, flatShading: true }), n);
    this.flagBase = [];
    const col = new THREE.Color();
    const tmp = new THREE.Matrix4();
    let idx = 0;
    this.strings = [];
    for (let i = 0; i < this.stalls.length; i++) {
      const a = this.stalls[i];
      const b = this.stalls[(i + 1) % this.stalls.length];
      const top = (s) => ({ x: s.x, y: heightAt(s.x, s.z) + 3.6, z: s.z });
      const p = top(a);
      const q = top(b);
      this.strings.push({ a: p, b: q, sag: 0.7 });
      for (let k = 0; k < FLAGS_PER_SEGMENT; k++) {
        const t = (k + 0.5) / FLAGS_PER_SEGMENT;
        const x = p.x + (q.x - p.x) * t;
        const z = p.z + (q.z - p.z) * t;
        const y = p.y + (q.y - p.y) * t - 0.7 * 4 * t * (1 - t) - 0.15;
        this.flagBase.push({ x, y, z, phase: idx * 0.7 });
        this.flags.setColorAt(idx, col.set(FLAG_COLORS[(idx + i) % FLAG_COLORS.length]));
        tmp.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        this.flags.setMatrixAt(idx, tmp);
        idx++;
      }
    }
    this.flags.instanceColor.needsUpdate = true;
    this.group.add(this.flags);
    this.flagSpin = new THREE.Vector3();
  }

  /** The flags flutter; the fountain spout bobs. */
  update(t) {
    const tmp = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    this.flagBase.forEach((f, i) => {
      q.setFromAxisAngle(this.flagSpin.set(0, 1, 0), Math.sin(t * 2.2 + f.phase) * 0.35);
      tmp.compose(new THREE.Vector3(f.x, f.y, f.z), q, s);
      this.flags.setMatrixAt(i, tmp);
    });
    this.flags.instanceMatrix.needsUpdate = true;
    this.fountainSpout.position.y = this.spoutY + Math.sin(t * 3) * 0.08;
  }

  dispose() {
    this.group.traverse((o) => {
      o.geometry?.dispose?.();
    });
    this.group.removeFromParent();
  }
}
