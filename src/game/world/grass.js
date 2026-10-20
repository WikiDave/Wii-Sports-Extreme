// Grass tufts and flowers on the grassy parts of the island: instanced meshes in chunks
// (only the chunks near the camera are drawn), swaying in the wind in the vertex shader.
// Heights come from the terrain mesh itself (fast), not from heightAt.

import * as THREE from 'three';
import { ISLAND_SIZE, SEGMENTS } from './island.js';
import { pathDistance, PATH_WIDTH } from './zones.js';

const CHUNK = 60;
const VIEW = 170; // metres: chunks farther away are hidden

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** Bilinear height and normal-y lookup from the terrain mesh grid. */
function lookup(ground) {
  const pos = ground.geometry.attributes.position;
  const nrm = ground.geometry.attributes.normal;
  const n = SEGMENTS + 1;
  const step = ISLAND_SIZE / SEGMENTS;
  const at = (arr, x, z) => {
    const fx = (x + ISLAND_SIZE / 2) / step;
    const fz = (z + ISLAND_SIZE / 2) / step;
    const i = Math.max(0, Math.min(n - 2, Math.floor(fx)));
    const j = Math.max(0, Math.min(n - 2, Math.floor(fz)));
    const u = fx - i;
    const v = fz - j;
    const k = j * n + i;
    return (arr.getY(k) * (1 - u) + arr.getY(k + 1) * u) * (1 - v) + (arr.getY(k + n) * (1 - u) + arr.getY(k + n + 1) * u) * v;
  };
  return { height: (x, z) => at(pos, x, z), up: (x, z) => at(nrm, x, z) };
}

/** One tuft: five thin blades fanned out, darker at the root. */
function tuftGeometry() {
  const pos = [];
  const col = [];
  const base = new THREE.Color('#4f9a34');
  const tip = new THREE.Color('#b6e36a');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const lean = 0.18 + (i % 2) * 0.1;
    const h = 0.42 + (i % 3) * 0.12;
    const w = 0.07;
    const cx = Math.cos(a);
    const sz = Math.sin(a);
    // a triangle from a wide base to a leaning tip
    pos.push(-w * sz, 0, w * cx, w * sz, 0, -w * cx, cx * lean, h, sz * lean);
    col.push(...base.toArray(), ...base.toArray(), ...tip.toArray());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  // Light the blades as if they face up, like the ground they grow on.
  const nr = g.attributes.normal;
  for (let i = 0; i < nr.count; i++) nr.setXYZ(i, 0, 1, 0);
  return g;
}

function flowerGeometry() {
  const g = new THREE.IcosahedronGeometry(0.11, 0);
  g.scale(1, 0.55, 1);
  g.translate(0, 0.3, 0);
  return g;
}

function swayMaterial(uniforms, opts) {
  const mat = new THREE.MeshLambertMaterial(opts);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec3 root = instanceMatrix[3].xyz;
          float k = transformed.y * transformed.y;
          float w = sin(uTime * 1.7 + root.x * 0.21 + root.z * 0.17) + 0.5 * sin(uTime * 3.1 + root.x * 0.7);
          transformed.x += w * k * 0.22;
          transformed.z += w * k * 0.12;
        }`,
      );
  };
  return mat;
}

export class Grass {
  /** ground: the terrain mesh; colliders: places to keep clear; density 0..1 (phones less). */
  constructor(scene, ground, colliders, density = 1) {
    this.uniforms = { uTime: { value: 0 } };
    const { height, up } = lookup(ground);
    const rand = rng(7);
    const tuftGeo = tuftGeometry();
    const flowerGeo = flowerGeometry();
    const tuftMat = swayMaterial(this.uniforms, { vertexColors: true, side: THREE.DoubleSide });
    const flowerMat = swayMaterial(this.uniforms, { color: '#ffffff' });
    this.materials = [tuftMat, flowerMat];
    this.geometries = [tuftGeo, flowerGeo];
    const petals = ['#ffffff', '#ffe14a', '#ff7aa8', '#ff5a4a', '#b48cff'].map((c) => new THREE.Color(c));
    const chunks = new Map();
    const blocked = (x, z) => colliders.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 1.2) ** 2);
    const half = ISLAND_SIZE / 2 - 10;
    const step = 2.1 / Math.sqrt(density);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const Y = new THREE.Vector3(0, 1, 0);
    for (let z = -half; z < half; z += step) {
      for (let x = -half; x < half; x += step) {
        const px = x + (rand() - 0.5) * step;
        const pz = z + (rand() - 0.5) * step;
        const y = height(px, pz);
        if (y < 3.2 || y > 70 || up(px, pz) < 0.86) continue;
        // Clumps: thin grass in some places, meadows in others.
        const clump = Math.sin(px * 0.045) * Math.cos(pz * 0.038) + Math.sin((px + pz) * 0.021);
        if (clump < -0.6 && rand() < 0.75) continue;
        if (pathDistance(px, pz) < PATH_WIDTH + 0.8 || blocked(px, pz)) continue;
        const key = `${Math.floor(px / CHUNK)},${Math.floor(pz / CHUNK)}`;
        let ch = chunks.get(key);
        if (!ch) chunks.set(key, (ch = { tufts: [], flowers: [], cx: (Math.floor(px / CHUNK) + 0.5) * CHUNK, cz: (Math.floor(pz / CHUNK) + 0.5) * CHUNK }));
        const sc = 0.8 + rand() * 0.7;
        ch.tufts.push([px, y - 0.05, pz, rand() * Math.PI * 2, sc]);
        if (clump > 0.7 && rand() < 0.35) ch.flowers.push([px + 0.4, y, pz + 0.3, petals[Math.floor(rand() * petals.length)]]);
      }
    }
    this.chunks = [];
    for (const ch of chunks.values()) {
      const group = new THREE.Group();
      const t = new THREE.InstancedMesh(tuftGeo, tuftMat, ch.tufts.length);
      ch.tufts.forEach(([x, y, z, rot, sc], i) => t.setMatrixAt(i, m.compose(p.set(x, y, z), q.setFromAxisAngle(Y, rot), s.set(sc, sc, sc))));
      t.receiveShadow = true;
      t.computeBoundingSphere();
      group.add(t);
      if (ch.flowers.length) {
        const f = new THREE.InstancedMesh(flowerGeo, flowerMat, ch.flowers.length);
        ch.flowers.forEach(([x, y, z, c], i) => {
          f.setMatrixAt(i, m.compose(p.set(x, y, z), q.identity(), s.set(1, 1, 1)));
          f.setColorAt(i, c);
        });
        f.receiveShadow = true;
        group.add(f);
      }
      group.userData.c = [ch.cx, ch.cz];
      scene.add(group);
      this.chunks.push(group);
    }
    this.count = [...chunks.values()].reduce((n, c) => n + c.tufts.length, 0);
  }

  /** Wind, and only the chunks near the camera. */
  update(t, camera) {
    this.uniforms.uTime.value = t;
    const { x, z } = camera.position;
    const r = VIEW + CHUNK;
    for (const g of this.chunks) {
      const [cx, cz] = g.userData.c;
      g.visible = (cx - x) ** 2 + (cz - z) ** 2 < r * r;
    }
  }

  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
