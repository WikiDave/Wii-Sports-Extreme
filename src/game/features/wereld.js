// Feature "wereld" (6.11): the island feels bigger and alive.
//
// - Interiors: the strandhut, the hotel lobby, the beach bar, the clothes shop in Havenstad and the
//   lighthouse. A door (E) fades the screen out and in, and the Mii walks in a small room far
//   below the island (wereld/interior). The clothes shop changes the Mii's shirt (state.ext.wereld).
// - Places: the beach bar with its jukebox music, the market square of Havenstad (nine stalls,
//   bunting), a resort pool with sunbeds by the hotel, a skate park, a fishing jetty with
//   fishermen, a windmill on the hill, and the volcano with its smoke.
// - Shells: 60 hidden shells (schelpen) on beaches, cliffs, roofs, the jetty and in the bushes.
//   Walking past one picks it up; 10, 25, 40 and 60 pay milestones. The phone app "Schelpen"
//   shows the count and gives a rough direction to the nearest one.
// - Night: string lights on the jetty and round the market, a beach campfire with sparks, fireflies
//   in the hills, glowing windows. By day the market fills with villagers who chat.
// - Plants: banana plants, bushes with berries, volcano pines and flower beds by the houses,
//   drawn instanced in 120 m chunks that are only shown near the camera.
//
// Save data: state.ext.wereld (shells, milestones paid, hints, outfit). Game events it emits:
// 'wereld:shell' { id, cash, xp } when a shell is picked up, 'wereld:milestone' { n } for a milestone.
// Pure logic: wereld/shells.js, wereld/progress.js, wereld/outfits.js, wereld/gossip.js, wereld/night.js.

import { heightAt } from '../world/island.js';
import { registerApp, unregisterApp } from '../phoneApps.js';
import { InteriorHub } from '../wereld/interior/hub.js';
import { buildHut } from '../wereld/interior/hut.js';
import { buildLobby } from '../wereld/interior/lobby.js';
import { buildBar } from '../wereld/interior/bar.js';
import { buildShop, SHOP_CSS } from '../wereld/interior/shop.js';
import { buildTower } from '../wereld/interior/tower.js';
import { buildHouse } from '../wereld/interior/house.js';
import { houseDoor } from '../wereld/houses.js';
import { cyl } from '../wereld/interior/common.js';
import { findSites } from '../wereld/exterior/sites.js';
import { Market, stallRing } from '../wereld/exterior/market.js';
import { beachBar, clothesShop, windmill, lighthouseDoor } from '../wereld/exterior/buildings.js';
import { resortPool, skatePark, fishingJetty } from '../wereld/exterior/leisure.js';
import { Vegetation, planVegetation } from '../wereld/exterior/vegetation.js';
import { Volcano } from '../wereld/exterior/volcano.js';
import { StringLights } from '../wereld/night/lights.js';
import { WindowHalos } from '../wereld/night/lights.js';
import { Campfire } from '../wereld/night/campfire.js';
import { Fireflies } from '../wereld/night/fireflies.js';
import { Crowd } from '../wereld/life/crowd.js';
import { layoutShells } from '../wereld/shells/spots.js';
import { ShellView } from '../wereld/shells/view.js';
import { shellsApp } from '../wereld/phoneApp.js';
import { wereldOf, collectShell } from '../wereld/progress.js';
import { savedFavorite } from '../wereld/outfits.js';
import { nightLevel } from '../wereld/night.js';
import { rng, between } from '../wereld/rng.js';
import { SHELL_COUNT } from '../wereld/shells.js';

const JINGLE = [523.25, 659.25, 783.99, 659.25, 880, 783.99, 659.25, 523.25];
const BAR_NEAR = 16;

/** The houses of the props: { x, z, top } (the hotel is not one of them). */
function housesOf(props) {
  const out = [];
  for (const c of props.group.children) {
    if (!c.userData.house) continue;
    const body = c.children[1];
    if (body && body.scale.x > 15) continue; // the hotel
    const top = c.position.y + (body?.scale.y ?? 4) + 2.4;
    out.push({ x: c.position.x, z: c.position.z, top, group: c });
  }
  return out;
}

export default {
  id: 'wereld',
  install(ctx) {
    const { THREE, scene, game, player, props, camera, interactions, audio, fx, toast, shadowsOn, hutPos } = ctx;
    const colliders = props.colliders;
    const w0 = wereldOf(game.state); // makes the save object
    const houses = housesOf(props);

    // Where the new places go (searched on the island as it is now).
    const sites = findSites(colliders, houses);
    const jetty = sites.jetty;

    // The new places: buildings, lots, the market, the jetty.
    const hotel = colliders.find((c) => c.hotel);
    const hotelDoorZ = hotel ? hotel.hotel.z + 7.5 : null;
    if (hotel) {
      // The hotel's collider is one big circle: split it so the entrance stays reachable.
      colliders.splice(colliders.indexOf(hotel), 1, { x: hotel.x - 9, z: hotel.z, r: 6.5 }, { x: hotel.x + 9, z: hotel.z, r: 6.5 }, { x: hotel.x, z: hotel.z - 2, r: 6.5 });
    }
    const market = new Market(scene, sites.market, heightAt);
    scene.add(market.group);
    for (const s of stallRing(sites.market)) colliders.push({ x: s.x, z: s.z, r: 2.6 });
    colliders.push({ x: sites.market.x, z: sites.market.z, r: 2.2 });

    const bar = beachBar(sites.bar);
    scene.add(bar.group);
    shadowsOn(bar.group);
    colliders.push({ x: sites.bar.x - 5, z: sites.bar.z - 3.6, r: 1.6 }, { x: sites.bar.x + 5, z: sites.bar.z - 3.6, r: 1.6 }, { x: sites.bar.x, z: sites.bar.z - 4.2, r: 3.2 });

    const shop = clothesShop(sites.shop);
    scene.add(shop.group);
    shadowsOn(shop.group);
    for (const [dx, dz, r] of [[-4.6, 0, 2.0], [4.6, 0, 2.0], [-3.5, -3.2, 2.0], [0, -3.2, 2.0], [3.5, -3.2, 2.0], [-3.4, 3.2, 2.0], [3.4, 3.2, 2.0]]) {
      colliders.push({ x: sites.shop.x + dx, z: sites.shop.z + dz, r });
    }

    const lh = lighthouseDoor(sites.lighthouse);
    scene.add(lh.group);
    colliders.push({ x: sites.lighthouse.x, z: sites.lighthouse.z, r: 3.2 });

    const mill = windmill(sites.mill);
    scene.add(mill.group);
    shadowsOn(mill.group);
    colliders.push(...mill.colliders);

    const pool = sites.pool ? resortPool(sites.pool, heightAt) : null;
    if (pool) {
      scene.add(pool.group);
      colliders.push(...pool.colliders);
    }
    const skate = skatePark(sites.skate);
    scene.add(skate.group);
    colliders.push({ x: sites.skate.x, z: sites.skate.z, r: 6.5 });

    const pierJetty = fishingJetty(jetty, heightAt);
    scene.add(pierJetty.group);
    colliders.push(...pierJetty.colliders);
    for (const b of pierJetty.boats) colliders.push({ x: b.position.x, z: b.position.z, r: 1.8 });
    // Posts for the strings of lights along the jetty.
    for (const dx of [-2, 2]) {
      for (const dz of [0, 18]) {
        const p = cyl(0.09, 0.09, 2.6, '#6a4a2a', jetty.x + dx, jetty.y + 1.3, jetty.z + dz, 6);
        scene.add(p);
      }
    }

    // Plants go where the new places are not (planned after their colliders are in place).
    const yards = [
      { x: sites.market.x, z: sites.market.z, r: 13 },
      { x: sites.bar.x, z: sites.bar.z, r: 10 },
      { x: sites.shop.x, z: sites.shop.z, r: 8 },
      { x: sites.skate.x, z: sites.skate.z, r: 12 },
      { x: sites.fire.x, z: sites.fire.z, r: 7 },
      { x: sites.mill.x, z: sites.mill.z, r: 6 },
      { x: sites.lighthouse.x, z: sites.lighthouse.z, r: 7 },
      ...(sites.pool ? [{ x: sites.pool.x, z: sites.pool.z, r: 12 }] : []),
    ];
    const plants = planVegetation(colliders, houses, yards);
    // Plants: the chunked instances; the volcano and the campfire and its light.
    const vegetation = new Vegetation(scene, plants);
    const volcano = new Volcano(scene);
    const fireLight = new THREE.PointLight('#ff9a3a', 0, 16, 1.4);
    scene.add(fireLight);
    const campfire = new Campfire(scene, sites.fire, fireLight);

    // Night: the strings of lights, the glowing windows, the fireflies in the hills.
    const strings = new StringLights(scene, [
      ...market.strings.map((s) => ({ a: s.a, b: s.b, sag: s.sag })),
      { a: { x: jetty.x - 2, y: jetty.y + 2.5, z: jetty.z }, b: { x: jetty.x - 2, y: jetty.y + 2.5, z: jetty.z + 18 }, sag: 0.6 },
      { a: { x: jetty.x + 2, y: jetty.y + 2.5, z: jetty.z }, b: { x: jetty.x + 2, y: jetty.y + 2.5, z: jetty.z + 18 }, sag: 0.6 },
    ]);
    scene.add(strings.group);
    const halos = new WindowHalos(scene, houses.map((hs) => hs.group));
    const rFly = rng(612);
    const flyPlaces = [];
    for (let i = 0; i < 400 && flyPlaces.length < 90; i++) {
      const x = -40 + (rFly() - 0.5) * 360;
      const z = 10 + (rFly() - 0.5) * 360;
      const y = heightAt(x, z);
      if (y < 8 || y > 50) continue;
      flyPlaces.push({ x, y: y + between(rFly, 1.5, 4.5), z });
    }
    const fireflies = new Fireflies(scene, flyPlaces);

    // People: villagers (made a few per frame), skaters, fishermen.
    const crowd = new Crowd(scene, { market: sites.market, skate, jetty: pierJetty, heightAt });

    // The shells: 60 on this island, one view for all of them.
    const boats = pierJetty.boats.map((b) => ({ x: b.position.x, z: b.position.z }));
    const shells = layoutShells(colliders, houses, plants.bush, jetty, boats);
    const shellView = new ShellView(scene, shells);
    shellView.setCollected(w0.shells);

    // The interiors, and the doors that lead in.
    const hub = new InteriorHub(ctx);
    // The shop puts a shirt on the Mii: the same data the Mii is built from, with another colour.
    hub.env.dress = (fav) => player.mii.update({ ...player.mii.data, favoriteColor: fav });
    hub.register('hut', { door: { x: hutPos.x, z: hutPos.z + 4.6, r: 2.4 }, out: { x: hutPos.x, z: hutPos.z + 6.4 }, build: buildHut, label: 'Naar binnen: strandhut' });
    if (hotel) hub.register('lobby', { door: { x: hotel.hotel.x, z: hotelDoorZ, r: 3 }, out: { x: hotel.hotel.x, z: hotelDoorZ + 2.8 }, build: buildLobby, label: 'Naar binnen: hotel' });
    hub.register('bar', { door: { x: bar.door.x, z: bar.door.z, r: bar.door.r }, out: bar.door.out, build: buildBar, label: 'Naar binnen: strandbar' });
    hub.register('shop', { door: { x: shop.door.x, z: shop.door.z, r: shop.door.r }, out: shop.door.out, build: buildShop, label: 'Naar binnen: kledingwinkel' });
    hub.register('tower', { door: { x: lh.door.x, z: lh.door.z, r: lh.door.r }, out: lh.door.out, build: buildTower, label: 'Naar binnen: vuurtoren' });
    // Every village house is a room too: its own wall colour, from its place in the list. The hotel has its lobby.
    houses.filter((hs) => hs.group.userData.radius < 10).forEach((hs, i) => {
      const { door, out } = houseDoor(hs.group);
      hub.register(`house-${i}`, { door: { ...door, r: 2.6 }, out, build: (env, o) => buildHouse(env, o, i + 1), label: 'Naar binnen: huis' });
    });
    const doorItems = [...hub.regs.keys()].map((id) => hub.doorItem(id));
    for (const it of doorItems) interactions.add(it);
    // For the tests (window.__game.ctx.wereld): where the places are and the shells.
    ctx.wereld = { sites, shells, hub, plants: { banana: plants.banana.length, bush: plants.bush.length, pine: plants.pine.length, flower: plants.flower.length } };
    // The clothes the Mii had on last time.
    const fav = savedFavorite(game.state);
    if (fav !== null) player.mii.update({ ...player.mii.data, favoriteColor: fav });
    ctx.addStyle(SHOP_CSS + PHONE_CSS);

    // The phone app. Inside a room the Mii is far below the island: hints then point from the door.
    const getPos = () => (hub.active ? hub.active.reg.out : player.pos);
    registerApp(shellsApp(shells, getPos));

    // A shell is picked up when the Mii walks past it.
    const pick = (s) => {
      const got = collectShell(game, s.id);
      if (!got) return;
      shellView.setCollected(wereldOf(game.state).shells);
      fx.burst({ x: s.x, y: s.y + 0.8, z: s.z }, 14, { color: '#ffd6ea', spread: 2.2, up: 3.2, life: 0.9, gravity: 4 });
      audio.play('cash');
      const n = wereldOf(game.state).shells.length;
      const ms = got.milestones.map((m) => m.text).join(' ');
      toast(`🐚 Schelp ${n} van ${SHELL_COUNT} (+€${got.cash})${ms ? ' ' + ms : ''}`);
      for (const m of got.milestones) game.emit('wereld:milestone', { n: m.n });
      game.emit('wereld:shell', { id: s.id, cash: got.cash, xp: got.xp });
    };

    // Bar music: a short jingle every few seconds while you are near the bar.
    let jingleAt = 0;
    const musicOn = () => wereldOf(game.state).muziek !== false;
    const feature = {
      update(t, dt, paused) {
        hub.frame(camera, ctx.follow, t, dt, paused);
        if (hub.active || paused) return;
        const night = nightLevel(game.hour);
        strings.update(t, night);
        halos.update(night);
        fireflies.update(t, night);
        volcano.update(t, night);
        campfire.update(t, dt, night);
        market.update(t);
        mill.rotor.rotation.z = t * 0.6;
        crowd.update(t, camera.position, game.hour);
        vegetation.update(camera.position);
        shellView.update(t, camera, player.pos.x, player.pos.y, player.pos.z, pick);
        // The jingle of the bar, only when the Mii is near and the sound is on.
        const dxb = player.pos.x - sites.bar.x;
        const dzb = player.pos.z - sites.bar.z;
        jingleAt -= dt;
        if (jingleAt <= 0 && dxb * dxb + dzb * dzb < BAR_NEAR * BAR_NEAR && musicOn() && audio.ready) {
          jingleAt = 2.6;
          for (let i = 0; i < 4; i++) audio.tone(JINGLE[(i * 2) % JINGLE.length] / 2, 0.32, { type: 'triangle', vol: 0.045, at: i * 0.2 });
        } else if (jingleAt <= 0) jingleAt = 0.5;
      },
      dispose() {
        unregisterApp('schelpen');
        hub.dispose();
        market.dispose();
        vegetation.dispose();
        volcano.dispose();
        campfire.dispose();
        strings.dispose();
        halos.dispose();
        fireflies.dispose();
        crowd.dispose();
        shellView.dispose();
        scene.remove(fireLight);
      },
    };
    return feature;
  },
};

const PHONE_CSS = `
.shell-card { padding: 12px 14px; border-radius: 14px; background: rgba(255, 158, 199, 0.16); margin-bottom: 10px; }
.shell-card strong { font-size: 1.15em; display: block; margin-bottom: 8px; }
.shell-card small { display: block; margin-top: 8px; opacity: 0.8; }
.shell-bar { height: 12px; border-radius: 8px; background: rgba(0, 0, 0, 0.12); overflow: hidden; }
.shell-bar i { display: block; height: 100%; background: linear-gradient(90deg, #ff9ec7, #ffd36a); border-radius: 8px; }
.shell-h { margin: 12px 0 6px; }
.shell-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
.shell-list li { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; background: rgba(0, 0, 0, 0.05); opacity: 0.7; }
.shell-list li.is-done { opacity: 1; background: rgba(53, 224, 106, 0.16); }
.shell-list small { opacity: 0.8; }
.shell-hint { padding: 10px 12px; border-radius: 12px; background: rgba(255, 211, 106, 0.2); }
.shell-ask { width: 100%; min-height: 48px; margin-top: 8px; }
`;
