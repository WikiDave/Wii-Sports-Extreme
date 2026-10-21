// The title screen's background: Wahoe-eiland seen from high up, turning very slowly, in the
// game's own colours. It is built with the island's code (terrain, sea, sky, props) but drawn
// without shadows, grass or the grading pass, so it stays light on a phone. dispose() frees
// the GPU context when the title screen closes.

import * as THREE from 'three';
import { Sky } from '../world/sky.js';
import { buildIsland } from '../world/island.js';
import { buildProps } from '../world/props.js';
import { buildWater } from '../world/water.js';
import { bobBoats } from '../world/buildings.js';
import { SEA_LEVEL } from '../world/zones.js';

const CENTRE = { x: 60, z: 40 }; // the middle of the island, a little towards Havenstad
const RADIUS = 400;
const HEIGHT = 250;
const SPIN = 0.022; // radians per second: a full turn takes about five minutes

export class TitleScene {
  constructor(container, { phone = false, reducedMotion = false } = {}) {
    this.container = container;
    this.reducedMotion = reducedMotion;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor('#9fd8f5');
    this.canvas = this.renderer.domElement;
    container.append(this.canvas);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 2, 9000);
    this.sky = new Sky(this.scene);
    this.sky.setTime(17.4); // late afternoon: warm light on the island
    this.angle = 0.7;
    this.raf = 0;
    this.built = false;
    this.disposed = false;
    this.onResize = () => this.resize();
    this.observer = new ResizeObserver(this.onResize);
    this.observer.observe(container);
    this.resize();
  }

  /** Builds the island (takes a moment; call once the title is on screen). */
  build() {
    if (this.built || this.disposed) return;
    this.built = true;
    this.island = buildIsland();
    this.scene.add(this.island.group);
    this.water = buildWater(this.island.ground, this.sky);
    this.water.position.y = SEA_LEVEL;
    this.scene.add(this.water);
    this.props = buildProps();
    this.scene.add(this.props.group);
    this.sky.follow(this.camera);
    this.start();
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Portrait screens (phones) need to see the whole island, so the lens widens.
    this.camera.fov = w / h < 0.9 ? 56 : 40;
    this.camera.updateProjectionMatrix();
  }

  start() {
    const clock = performance.now();
    const loop = (now) => {
      this.raf = requestAnimationFrame(loop);
      this.frame((now - clock) / 1000);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** One frame at time t (seconds). */
  frame(t) {
    if (!this.built || this.disposed) return;
    const spin = this.reducedMotion ? SPIN * 0.3 : SPIN;
    const a = this.angle + t * spin;
    const cam = this.camera.position;
    cam.set(CENTRE.x + Math.cos(a) * RADIUS, HEIGHT + Math.sin(t * 0.13) * 6, CENTRE.z + Math.sin(a) * RADIUS);
    this.camera.lookAt(CENTRE.x, 0, CENTRE.z);
    this.sky.follow(this.camera);
    bobBoats(this.props.boats, t);
    this.props.swayPalms(t, cam);
    this.water.userData.update(t, 1, 1);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
