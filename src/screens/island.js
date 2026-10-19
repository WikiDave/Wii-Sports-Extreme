// Wahoe-eiland: walk your Mii around the island (WASD or the touch stick, drag to look
// around, scroll or pinch to zoom); the slider sets the time of day.

import * as THREE from 'three';
import { h, icon } from '../ui/dom.js';
import { buildIsland } from '../game/world/island.js';
import { buildProps } from '../game/world/props.js';
import { Sky } from '../game/world/sky.js';
import { heightAt } from '../game/world/island.js';
import { Player } from '../game/player.js';
import { FollowCamera } from '../game/camera.js';
import { Minimap } from '../game/ui/minimap.js';
import { Input } from '../game/input.js';
import { miiStore } from '../mii/storage.js';
import { defaultMii } from '../mii/data.js';

/** A free, dry spot on Strand-Zuid, searched in a spiral from the beach centre. */
function findSpawn(colliders) {
  for (let i = 0; i < 400; i++) {
    const a = i * 2.4;
    const r = i * 0.8;
    const x = 20 + Math.cos(a) * r;
    const z = 200 + Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y > 0.8 && y < 4 && colliders.every((c) => Math.hypot(c.x - x, c.z - z) > c.r + 1)) return { x, z };
  }
  return { x: 20, z: 200 };
}

export function islandScreen(root, app) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.2, 9000);
  const sky = new Sky(scene);
  const island = buildIsland();
  const props = buildProps();
  scene.add(island.group, props.group);

  let hour = 10;
  const label = h('span', { class: 'island-time' });
  const slider = h('input', { type: 'range', min: 0, max: 24, step: 0.1, value: hour, 'aria-label': 'Tijd van de dag' });
  const setHour = (v) => {
    hour = +v;
    sky.setTime(hour);
    props.lamp.emissiveIntensity = hour < 6.5 || hour > 18.5 ? 1.6 : 0;
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

  // The player's Mii, on the beach in the south.
  const mii = miiStore.all()[0] ?? defaultMii('m');
  const spawn = findSpawn(props.colliders);
  const player = new Player(mii, { ...spawn, colliders: props.colliders });
  scene.add(player.group);
  const follow = new FollowCamera(camera);
  follow.yaw = player.heading + Math.PI;
  const input = new Input(screen, renderer.domElement, { onLook: (dx, dy) => follow.look(dx, dy), onZoom: (f) => follow.zoom(f) });
  const minimap = new Minimap(screen);
  window.__game = { player, follow }; // for tests

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
  const clock = new THREE.Clock();
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const move = input.move();
    player.update(move, follow.yaw, dt, t);
    follow.update(player, move, dt);
    minimap.draw(player);
    sky.follow(camera);
    renderer.render(scene, camera);
  };
  frame();

  return {
    unmount() {
      cancelAnimationFrame(raf);
      input.dispose();
      minimap.dispose();
      player.dispose();
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
