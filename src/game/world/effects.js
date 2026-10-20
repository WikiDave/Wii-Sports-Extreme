// Small visual effects: dust puffs, water splashes and expanding ripple rings. Pooled, so
// nothing is created while playing.

import * as THREE from 'three';

const MAX = 160;

/** A soft round dot, so particles are not squares. */
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.p = [];
    const pos = new Float32Array(MAX * 3);
    const col = new Float32Array(MAX * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.points = new THREE.Points(
      this.geo,
      new THREE.PointsMaterial({ size: 0.4, map: dotTexture(), vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true }),
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
    // Ripple rings
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.94, 1, 40);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: true }));
      m.visible = false;
      m.renderOrder = 3;
      m.userData = { life: 0 };
      scene.add(m);
      this.rings.push(m);
    }
    this.nextRing = 0;
  }

  /** n particles from `at`, spread by `spread`, flying up with speed `up`. */
  burst(at, n, { color = '#d9c08a', spread = 1.2, up = 1.6, life = 0.6, gravity = 6 } = {}) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      if (this.p.length >= MAX) this.p.shift();
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * spread;
      this.p.push({ x: at.x, y: at.y, z: at.z, vx: Math.cos(a) * s, vy: Math.random() * up, vz: Math.sin(a) * s, life, max: life, g: gravity, c });
    }
  }

  dust(at, run = false) {
    this.burst(at, run ? 4 : 2, { color: '#d8c79a', spread: run ? 1.4 : 0.7, up: 0.9, life: 0.55, gravity: 1.5 });
  }

  splash(at, n = 10) {
    this.burst(at, n, { color: '#eaf8ff', spread: 1.6, up: 3.2, life: 0.7, gravity: 9 });
  }

  /** An expanding ring on the water surface at `at`. */
  ripple(at, size = 2.2) {
    const m = this.rings[this.nextRing++ % this.rings.length];
    m.position.set(at.x, 0.04, at.z);
    m.userData = { life: 1, size };
    m.visible = true;
  }

  update(dt) {
    const pos = this.geo.attributes.position;
    const col = this.geo.attributes.color;
    let n = 0;
    this.p = this.p.filter((q) => (q.life -= dt) > 0);
    for (const q of this.p) {
      q.vy -= q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.z += q.vz * dt;
      const f = q.life / q.max;
      pos.setXYZ(n, q.x, q.y, q.z);
      col.setXYZ(n, q.c.r * (0.6 + 0.4 * f), q.c.g * (0.6 + 0.4 * f), q.c.b * (0.6 + 0.4 * f));
      n++;
    }
    this.geo.setDrawRange(0, n);
    pos.needsUpdate = true;
    col.needsUpdate = true;
    for (const m of this.rings) {
      if (!m.visible) continue;
      m.userData.life -= dt * 0.9;
      const k = 1 - m.userData.life;
      if (m.userData.life <= 0) {
        m.visible = false;
        continue;
      }
      m.scale.setScalar(0.3 + k * m.userData.size);
      m.material.opacity = 0.4 * m.userData.life;
    }
  }

  dispose() {
    this.geo.dispose();
    this.points.material.map.dispose();
    this.points.material.dispose();
    for (const m of this.rings) m.material.dispose();
    this.rings[0].geometry.dispose();
  }
}
