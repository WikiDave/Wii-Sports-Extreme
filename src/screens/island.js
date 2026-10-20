// Wahoe-eiland: walk your Mii around the island (WASD or the touch stick, drag to look
// around, scroll or pinch to zoom); time runs by itself (1 s = 1 game minute), and the game state is saved.

import * as THREE from 'three';
import { h, icon, toast } from '../ui/dom.js';
import { createLoader, nextFrame } from '../ui/loading.js';
import { buildIsland } from '../game/world/island.js';
import { buildProps } from '../game/world/props.js';
import { Sky } from '../game/world/sky.js';
import { heightAt } from '../game/world/island.js';
import { buildHut } from '../game/world/hut.js';
import { CustomerView } from '../game/world/customerView.js';
import { openDealMenu } from '../game/ui/dealMenu.js';
import { Audio } from '../game/audio.js';
import { IslandRenderer, shadowsOn } from '../game/world/render.js';
import { buildWater } from '../game/world/water.js';
import { Grass } from '../game/world/grass.js';
import { Life } from '../game/world/life.js';
import { bobBoats, windowGlass, lampLight } from '../game/world/buildings.js';
import { SEA_LEVEL } from '../game/world/zones.js';
import { WeatherFx } from '../game/world/weatherFx.js';
import { dayInfo, WEATHER, EVENTS, priceFactor } from '../game/weather.js';
import { Guards } from '../game/world/guards.js';
import { RivalView } from '../game/world/rivalView.js';
import { addHeat, onDeal, onRefused, tickHeat, frisk, caught, escaped, heatLevel, LEVEL_NAMES } from '../game/police.js';
import { rollRival, spotFactor } from '../game/rivals.js';
import { RIVALS } from '../game/data/rivals.js';
import { Player } from '../game/player.js';
import { FollowCamera } from '../game/camera.js';
import { Game, formatClock, RANKS, MINUTES_PER_SECOND } from '../game/state.js';
import { Interactions } from '../game/interact.js';
import { openHutMenu } from '../game/ui/hutMenu.js';
import { openMarket, openStand } from '../game/ui/tradeMenus.js';
import { openOffice } from '../game/ui/officeMenu.js';
import { attachDaily } from '../game/empire.js';
import { buildStall } from '../game/world/stall.js';
import { Minimap } from '../game/ui/minimap.js';
import { Input } from '../game/input.js';
import { miiStore } from '../mii/storage.js';
import { defaultMii } from '../mii/data.js';

/** A dry spot on the beach at least 14 m from `from`, away from other props, for the hut. */
function findHutSpot(from, colliders, maxH = 4) {
  for (let i = 0; i < 600; i++) {
    const a = i * 2.4;
    const r = 14 + i * 0.5;
    const x = from.x + Math.cos(a) * r;
    const z = from.z + Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y > 2.4 && y < maxH && colliders.every((c) => Math.hypot(c.x - x, c.z - z) > c.r + 9)) return { x, z, y };
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
  const loader = createLoader('Het eiland wordt klaargemaakt');
  root.append(loader.el);
  let cleanup = null;
  let cancelled = false;
  buildIsland3d(root, app, loader, () => cancelled).then(
    (fn) => (cancelled ? fn() : (cleanup = fn)),
    (err) => {
      if (err !== CANCELLED) {
        console.error(err);
        loader.fail('Het eiland kon niet worden geladen. Probeer de pagina opnieuw te laden.');
      }
    },
  );
  return {
    unmount() {
      cancelled = true;
      cleanup?.();
      loader.remove();
    },
  };
}

const CANCELLED = Symbol('cancelled');

/** Builds the whole island step by step (the loader shows progress); resolves with its cleanup. */
async function buildIsland3d(root, app, loader, isCancelled) {
  const step = async (p, text) => {
    loader.set(p, text);
    await nextFrame();
    if (isCancelled()) throw CANCELLED;
  };
  await step(0.03, 'Spelstand laden');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const phone = matchMedia('(pointer: coarse)').matches;
  // Phones: a little lower resolution keeps shadows and the grading pass smooth.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const pipeline = new IslandRenderer(renderer, { quality: phone ? 'low' : 'high' });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.2, 9000);
  const sky = new Sky(scene);
  await step(0.08, 'Het eiland vormen');
  pipeline.setupSun(sky.sun);
  const island = buildIsland();
  await step(0.35, 'De zee vullen');
  const water = buildWater(island.ground, sky);
  water.position.y = SEA_LEVEL;
  scene.add(water);
  await step(0.45, 'Huizen en palmen neerzetten');
  const props = buildProps();
  scene.add(island.group, props.group);
  shadowsOn(props.group);

  const game = new Game(safeStorage());
  const clock = h('span', { class: 'hud-clock' });
  const day = h('span', { class: 'hud-day' });
  const cash = h('span', { class: 'hud-cash' });
  const rank = h('span', { class: 'hud-rank' });
  const heat = h('div', { class: 'island-clock hud-heat', title: 'Reglement-meter' });
  const refreshHud = () => {
    const st = game.state;
    clock.textContent = formatClock(st.minutes);
    const info = dayInfo(st.day);
    day.textContent = `Dag ${st.day} ${WEATHER[info.weather].icon}`;
    day.title = `${WEATHER[info.weather].name}${EVENTS[info.event].text ? ' · ' + EVENTS[info.event].name : ''}`;
    cash.textContent = `€${st.cash.toLocaleString('nl-NL')}`;
    rank.textContent = RANKS[game.rank];
    const lvl = heatLevel(st);
    heat.replaceChildren(
      ...[1, 2, 3, 4].map((i) => h('span', { class: `heat-dot ${i <= lvl ? 'is-on' : ''}` })),
      h('span', { class: 'heat-name' }, LEVEL_NAMES[lvl]),
    );
    heat.dataset.level = lvl;
  };
  const weatherFx = new WeatherFx(scene, sky);
  const audio = new Audio();
  const muteBtn = h('button', { class: 'btn btn-round', type: 'button', 'aria-label': 'Geluid aan of uit' });
  const showMute = () => (muteBtn.textContent = audio.muted ? '🔇' : '🔊');
  muteBtn.addEventListener('click', () => (audio.setMuted(!audio.muted), showMute()));
  showMute();
  // Sounds from what happens in the game.
  let lastCash = game.state.cash;
  let lastSound = 0;
  game.on('change', () => {
    const d = game.state.cash - lastCash;
    lastCash = game.state.cash;
    // One sound per burst of changes (a deal changes cash, stock and xp at once).
    if (!d || performance.now() - lastSound < 120) return;
    lastSound = performance.now();
    audio.play(d > 0 ? 'cash' : 'spend');
  });
  game.on('rank', () => audio.play('rank'));
  game.on('newday', () => audio.play('newday'));
  game.on('heat', (l) => audio.play(l >= 4 ? 'alarm' : 'alert'));
  const onClick = (e) => e.target.closest?.('.btn, .interact-btn') && audio.play('click');
  document.addEventListener('click', onClick);
  const refreshSky = () => {
    weatherFx.setWeather(dayInfo(game.state.day).weather);
    sky.setTime(game.hour);
    props.lamp.emissiveIntensity = game.isNight ? 1.6 : 0;
    windowGlass.emissiveIntensity = game.isNight ? 0.9 : 0;
    lampLight.emissiveIntensity = game.isNight ? 1.8 : 0;
  };
  game.on('time', () => {
    refreshHud();
    refreshSky();
  });
  game.on('change', refreshHud);
  game.on('newday', (d) => toast(`Een nieuwe dag: dag ${d}`));
  const stopDaily = attachDaily(game, (lines) => setTimeout(() => toast(lines.join(' ')), 2500));
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
      heat,
      muteBtn,
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
  shadowsOn(hut);
  props.colliders.push({ x: hutPos.x, z: hutPos.z, r: 4.8 });
  const interactions = new Interactions(screen);
  // Grass after all buildings are placed, so it keeps clear of them.
  const grassReady = () => new Grass(scene, island.ground, props.colliders, phone ? 0.45 : 1);
  interactions.add({ x: hutPos.x, z: hutPos.z, r: 9, label: 'Strandhut', run: () => openHutMenu(game) });
  // The market in Havenstad and the beach stand that buys your products.
  for (const [where, label, color, run] of [
    [{ x: 250, z: 70 }, 'Markt', '#3a9ad9', () => openMarket(game)],
    [{ x: hutPos.x, z: hutPos.z }, 'Strandtent', '#e2513f', () => openStand(game)],
    [{ x: 270, z: 60 }, 'Kantoor', '#4fb43f', () => openOffice(game)],
  ]) {
    const spot = findHutSpot(where, props.colliders, 14);
    const stall = buildStall(color);
    stall.position.set(spot.x, spot.y - 0.1, spot.z);
    scene.add(stall);
    shadowsOn(stall);
    props.colliders.push({ x: spot.x, z: spot.z, r: 2.6 });
    interactions.add({ x: spot.x, z: spot.z, r: 5.5, label, run });
  }
  await step(0.55, 'Gras en bloemen laten groeien');
  const grass = grassReady();
  const life = new Life(scene, { phone });
  await step(0.75, 'Bewoners en bewaking op hun plek');
  // Customers wait near the beach stand and the market.
  const standSpot = interactions.items.find((i) => i.label === 'Strandtent');
  const marketSpot = interactions.items.find((i) => i.label === 'Markt');
  const spotNear = (a) => findHutSpot({ x: a.x + 8, z: a.z + 8 }, props.colliders, 14);
  const spots = { strand: spotNear(standSpot), haven: spotNear(marketSpot) };
  // Guards patrol the spots, the hut and the market; rivals take a spot some days.
  const guards = new Guards(scene, game, props.colliders, [spots.strand, spots.haven, hutPos, marketSpot]);
  const rival = new RivalView(scene, game, spots, interactions);
  const talk = (c) =>
    openDealMenu(game, c, {
      factor: spotFactor(game.state, c.spot) * priceFactor(game.state.day),
      onDone: (r) => (r.ok ? onDeal(game, guards.sees(player.pos)) : onRefused(game, game.state.customers[c.id]?.loyalty ?? 0)),
    });
  const customers = new CustomerView(scene, spots, interactions, game, talk);
  game.on('newday', (d) => {
    const info = dayInfo(d);
    const ev = EVENTS[info.event];
    if (ev.heat) addHeat(game, ev.heat);
    setTimeout(() => toast(`${WEATHER[info.weather].icon} ${WEATHER[info.weather].name}.${ev.text ? ' ' + ev.text : ''}`), 1800);
    const r = rollRival(game);
    if (r) setTimeout(() => toast(`${RIVALS.find((x) => x.id === r.id).name} staat vandaag bij ${r.spot === 'strand' ? 'het strand' : 'de markt'}.`), 5200);
  });
  const hidden = (p) => Math.hypot(p.x - hutPos.x, p.z - hutPos.z) < 7;
  const police = {
    frisk: () => toast(frisk(game)),
    caught: () => toast(caught(game)),
    escaped: () => {
      escaped(game);
      toast(hidden(player.pos) ? 'Je verstopt je in de hut. Ze zijn je kwijt!' : 'Je bent ze kwijt!');
    },
    chase: () => toast('De bewaking zit achter je aan! Ren of verstop je in je hut.'),
  };
  const saved = game.state.player;
  const spawn = saved.x != null && heightAt(saved.x, saved.z) > 0.3 ? { x: saved.x, z: saved.z } : findSpawn(props.colliders);
  await step(0.85, 'Je Mii aankleden');
  const player = new Player(mii, { ...spawn, colliders: props.colliders });
  scene.add(player.group);
  shadowsOn(player.group, false);
  const follow = new FollowCamera(camera);
  follow.yaw = player.heading + Math.PI;
  const input = new Input(screen, renderer.domElement, { onLook: (dx, dy) => follow.look(dx, dy), onZoom: (f) => follow.zoom(f) });
  const minimap = new Minimap(screen);
  window.__game = { player, follow, game, weatherFx, heightAt, props, life, grassCount: grass.count, hutPos, interactions, guards, teleport: (it) => { player.pos.set(it.x, 0, it.z + 4); player.group.position.copy(player.pos); } }; // for tests

  const resize = () => {
    const w = view.clientWidth || 1;
    const hgt = view.clientHeight || 1;
    renderer.setSize(w, hgt, false);
    pipeline.setSize(w, hgt);
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
    // A menu or minigame pauses the island: no clock, no guards, no walking.
    const paused = !!document.querySelector('.modal-backdrop, .minigame, .fullmap-wrap:not([hidden])');
    if (!paused) game.tick(dt);
    const move = paused ? { x: 0, y: 0, run: false } : input.move();
    player.update(move, follow.yaw, dt, t);
    follow.update(player, move, dt);
    if (!paused) {
      tickHeat(game, dt * MINUTES_PER_SECOND, game.isNight);
      guards.update(dt, player, hidden, police);
    }
    rival.update(t);
    customers.update(t, player.pos);
    interactions.update(player.pos);
    minimap.draw(player);
    sky.follow(camera);
    weatherFx.update(dt, camera, t);
    grass.update(t, camera);
    bobBoats(props.boats, t);
    props.swayPalms(t, camera.position);
    life.update(t, dt, camera);
    water.userData.update(t, Math.min(1.1, 0.25 + sky.hemi.intensity * 0.7), 1 + weatherFx.level.rain * 0.8);
    audio.setAmbience({ nearSea: Math.max(0, 1 - heightAt(player.pos.x, player.pos.z) / 8), rain: weatherFx.level.rain });
    pipeline.follow(player.group.position, sky.dir);
    pipeline.render(scene, camera, sky.night);
  };
  // Compile every shader and draw once behind the loader, so the first second does not stutter.
  await step(0.92, 'Licht en schaduwen');
  resize();
  follow.snap(player);
  renderer.compile(scene, camera);
  pipeline.render(scene, camera, sky.night);
  await step(0.98, 'Bijna klaar');
  frame();
  loader.done();

  return () => {
    cancelAnimationFrame(raf);
    game.state.player.x = player.pos.x;
    game.state.player.z = player.pos.z;
    game.save();
    input.dispose();
    minimap.dispose();
    stopDaily();
    weatherFx.dispose();
    document.removeEventListener('click', onClick);
    audio.dispose();
    guards.dispose();
    rival.dispose();
    interactions.dispose();
    customers.dispose();
    player.dispose();
    ro.disconnect();
    scene.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    grass.dispose();
    life.dispose();
    pipeline.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
