// The volcano: a smoke plume that rises from the crater (puffs that grow, drift and fade), and
// at night a faint glow in the crater with a little lava pool. Sprites share one soft texture.

import * as THREE from 'three';
import { heightAt } from '../../world/island.js';
import { VOLCANO } from './sites.js';

const PUFFS = 14;
const LIFE = 9; // seconds for one puff from the crater to gone

/** A soft round sprite texture (white centre, transparent edge). */
export function softTexture(inner = 'rgba(255,255,255,1)') {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Volcano {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    // The crater: the lowest point inside the rim.
    this.top = heightAt(VOLCANO.x, VOLCANO.z);
    this.cx = VOLCANO.x;
    this.cz = VOLCANO.z;
    this.puffTex = softTexture('rgba(255,255,255,0.9)');
    this.puffs = [];
    for (let i = 0; i < PUFFS; i++) {
      const m = new THREE.SpriteMaterial({ map: this.puffTex, color: '#e8e4df', transparent: true, opacity: 0, depthWrite: false });
      const s = new THREE.Sprite(m);
      s.userData.phase = i / PUFFS;
      this.group.add(s);
      this.puffs.push(s);
    }
    this.glowTex = softTexture('rgba(255,140,60,1)');
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: '#ff7a3a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glow.scale.set(26, 26, 1);
    this.glow.position.set(this.cx, this.top + 1.5, this.cz);
    this.group.add(this.glow);
    // The lava: a dark disc with a warm rim in the crater.
    this.lava = new THREE.Mesh(new THREE.CircleGeometry(7, 16), new THREE.MeshBasicMaterial({ color: '#ff6a2a', transparent: true, opacity: 0 }));
    this.lava.rotation.x = -Math.PI / 2;
    this.lava.position.set(this.cx, this.top + 0.6, this.cz);
    this.group.add(this.lava);
  }

  /** t in seconds, night 0..1 (see night.js). */
  update(t, night) {
    const base = new THREE.Vector3(this.cx, this.top + 0.5, this.cz);
    for (const p of this.puffs) {
      const k = (t / LIFE + p.userData.phase) % 1;
      const drift = Math.sin(p.userData.phase * 40) * 2.2;
      p.position.set(base.x + drift * k + Math.sin(t * 0.3 + p.userData.phase * 9) * 1.2, base.y + k * 46, base.z + k * 8 * Math.cos(p.userData.phase * 12));
      const s = 5 + k * 15;
      p.scale.set(s, s, 1);
      p.material.opacity = Math.sin(Math.min(1, k * 2.4) * Math.PI * 0.5) * (1 - k) * 0.42;
      p.material.rotation = t * 0.1 + p.userData.phase * 6;
      // The plume takes on the glow of the crater at night.
      p.material.color.setRGB(0.9 + night * 0.1, 0.89 + night * 0.02 - night * 0.2 * k, 0.87 - night * 0.25 * (1 - k));
    }
    const flicker = 0.7 + Math.sin(t * 3.1) * 0.15 + Math.sin(t * 7.3) * 0.08;
    this.glow.material.opacity = night * 0.85 * flicker;
    this.lava.material.opacity = night * 0.55 * flicker;
  }

  dispose() {
    this.group.traverse((o) => {
      o.material?.dispose?.();
      o.geometry?.dispose?.();
    });
    this.puffTex.dispose();
    this.glowTex.dispose();
    this.group.removeFromParent();
  }
}
