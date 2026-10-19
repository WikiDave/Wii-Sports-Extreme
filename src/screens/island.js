// Wahoe-eiland: walk your Mii around the island (WASD or the touch stick, drag to look
// around, scroll or pinch to zoom); time runs by itself (1 s = 1 game minute), and the game state is saved.

import * as THREE from 'three';
import { h, icon, toast } from '../ui/dom.js';
import { buildIsland } from '../game/world/island.js';
import { buildProps } from '../game/world/props.js';
import { Sky } from '../game/world/sky.js';
import { heightAt } from '../game/world/island.js';
import { buildHut } from '../game/world/hut.js';
import { Player } from '../game/player.js';
import { FollowCamera } from '../game/camera.js';
import { Game, formatClock, RANKS } from '../game/state.js';
import { Interactions } from '../game/interact.js';
import { openHutMenu } from '../game/ui/hutMenu.js';
import { Minimap } from '../game/ui/minimap.js';
import { Input } from '../game/input.js';
import { miiStore } from '../mii/storage.js';
import { defaultMii } from '../mii/data.js';

/** A dry spot on the beach at least 14 m from `from`, away from other props, for the hut. */
function findHutSpot(from, colliders) {
  for (let i = 0; i < 600; i++) {
    const a = i * 2.4;
    const r = 14 + i * 0.5;
    const x = from.x + Math.cos(a) * r;
    const z = from.z + Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y > 2.4 && y < 4 && colliders.every((c) => Math.hypot(c.x - x, c.z - z) > c.r + 9)) return { x, z, y };
  }
  return { x: from.x + 14, z: from.z, y: heightAt(from.x + 14, from.z) };
}

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

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

  const game = new Game(safeStorage());
  const clock = h('span', { class: 'hud-clock' });
  const day = h('span', { class: 'hud-day' });
  const cash = h('span', { class: 'hud-cash' });
  const rank = h('span', { class: 'hud-rank' });
  const refreshHud = () => {
    const st = game.state;
    clock.textContent = formatClock(st.minutes);
    day.textContent = `Dag ${st.day}`;
    cash.textContent = `€${st.cash.toLocaleString('nl-NL')}`;
    rank.textContent = RANKS[game.rank];
  };
  const refreshSky = () => {
    sky.setTime(game.hour);
    props.lamp.emissiveIntensity = game.isNight ? 1.6 : 0;
  };
  game.on('time', () => {
    refreshHud();
    refreshSky();
  });
  game.on('change', refreshHud);
  game.on('newday', (d) => toast(`Een nieuwe dag: dag ${d}`));
  refreshHud();
  refreshSky();

  const view = h('div', { class: 'island-view' }, renderer.domElement);
  const screen = h(
    'main',
    { class: 'screen island' },
    view,
    h(
      'div',
      { class: 'island-bar' },
      h('button', { class: 'btn btn-round', type: 'button', 'aria-label': 'Terug naar het menu', onClick: () => app.go('menu') }, icon('back')),
      h('div', { class: 'island-clock' }, day, clock),
      h('div', { class: 'island-clock hud-money' }, cash, rank),
    ),
  );
  root.append(screen);

  // The player's Mii, on the beach in the south.
  const mii = miiStore.get(game.state.player.miiId) ?? miiStore.all()[0] ?? defaultMii('m');
  game.state.player.miiId = mii.id ?? null;
  // The beach hut: home base, a few metres from where the player starts.
  const hutPos = findHutSpot(findSpawn(props.colliders), props.colliders);
  const hut = buildHut();
  hut.position.set(hutPos.x, hutPos.y - 0.2, hutPos.z);
  scene.add(hut);
  props.colliders.push({ x: hutPos.x, z: hutPos.z, r: 4.8 });
  const interactions = new Interactions(screen);
  interactions.add({ x: hutPos.x, z: hutPos.z, r: 9, label: 'Strandhut', run: () => openHutMenu(game) });
  const saved = game.state.player;
  const spawn = saved.x != null && heightAt(saved.x, saved.z) > 0.3 ? { x: saved.x, z: saved.z } : findSpawn(props.colliders);
  const player = new Player(mii, { ...spawn, colliders: props.colliders });
  scene.add(player.group);
  const follow = new FollowCamera(camera);
  follow.yaw = player.heading + Math.PI;
  const input = new Input(screen, renderer.domElement, { onLook: (dx, dy) => follow.look(dx, dy), onZoom: (f) => follow.zoom(f) });
  const minimap = new Minimap(screen);
  window.__game = { player, follow, game, hutPos, interactions }; // for tests

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
  const timer = new THREE.Clock();
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.elapsedTime;
    game.tick(dt);
    const move = input.move();
    player.update(move, follow.yaw, dt, t);
    follow.update(player, move, dt);
    interactions.update(player.pos);
    minimap.draw(player);
    sky.follow(camera);
    renderer.render(scene, camera);
  };
  frame();

  return {
    unmount() {
      cancelAnimationFrame(raf);
      game.state.player.x = player.pos.x;
      game.state.player.z = player.pos.z;
      game.save();
      input.dispose();
      minimap.dispose();
      interactions.dispose();
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
