// Wahoe-eiland, step 1.1: the island, the sea and the light of the day, seen with a
// free orbit camera (drag to turn, scroll or pinch to zoom). The player follows in 1.3.

import * as THREE from 'three';
import { h, icon } from '../ui/dom.js';
import { buildIsland } from '../game/world/island.js';
import { Sky } from '../game/world/sky.js';

export function islandScreen(root, app) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 1, 9000);
  const sky = new Sky(scene);
  const island = buildIsland();
  scene.add(island.group);

  let hour = 10;
  const label = h('span', { class: 'island-time' });
  const slider = h('input', { type: 'range', min: 0, max: 24, step: 0.1, value: hour, 'aria-label': 'Tijd van de dag' });
  const setHour = (v) => {
    hour = +v;
    sky.setTime(hour);
    const hh = Math.floor(hour) % 24;
    label.textContent = `${String(hh).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;
  };
  slider.addEventListener('input', () => setHour(slider.value));
  setHour(hour);

  const view = h('div', { class: 'island-view' }, renderer.domElement);
  const screen = h(
    'main',
    { class: 'screen island' },
    view,
    h(
      'div',
      { class: 'island-bar' },
      h('button', { class: 'btn btn-round', type: 'button', 'aria-label': 'Terug naar het menu', onClick: () => app.go('menu') }, icon('back')),
      h('div', { class: 'island-clock' }, label, slider),
    ),
  );
  root.append(screen);

  // Orbit camera around the island.
  const orbit = { yaw: 0.6, pitch: 0.55, dist: 1300, target: new THREE.Vector3(30, 0, 0) };
  const pointers = new Map();
  let pinch = 0;
  const canvas = renderer.domElement;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    if (pointers.size === 1) {
      orbit.yaw -= (e.clientX - p.x) * 0.005;
      orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + (e.clientY - p.y) * 0.004, 0.08, 1.45);
    }
    p.x = e.clientX;
    p.y = e.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) orbit.dist = THREE.MathUtils.clamp(orbit.dist * (pinch / d), 120, 2200);
      pinch = d;
    }
  });
  const up = (e) => {
    pointers.delete(e.pointerId);
    pinch = 0;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    orbit.dist = THREE.MathUtils.clamp(orbit.dist * Math.exp(e.deltaY * 0.001), 120, 2200);
  }, { passive: false });

  const resize = () => {
    const w = view.clientWidth || 1;
    const hgt = view.clientHeight || 1;
    renderer.setSize(w, hgt, false);
    camera.aspect = w / hgt;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(view);
  resize();

  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const cp = Math.cos(orbit.pitch);
    camera.position.set(Math.sin(orbit.yaw) * cp, Math.sin(orbit.pitch), Math.cos(orbit.yaw) * cp).multiplyScalar(orbit.dist).add(orbit.target);
    camera.lookAt(orbit.target);
    sky.follow(camera);
    renderer.render(scene, camera);
  };
  frame();

  return {
    unmount() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
