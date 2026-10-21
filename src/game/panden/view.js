// The properties in the world. Each owned place is built once (hidden until owned): its model,
// its colliders, its machines (stations), a chest, a bed and an entrance. Also the upgrade parts,
// the paint, the station lamps and the minimap marks. No menus here: the feature passes the actions.

import * as THREE from 'three';
import { PROPERTIES } from '../data/properties.js';
import { buildMachine } from '../world/stall.js';
import { shadowsOn } from '../world/render.js';
import { HUT_LAYOUT } from '../world/hut.js';
import { buildLoods } from './models/loods.js';
import { buildVilla } from './models/villa.js';
import { buildGrot } from './models/grot.js';
import { addUpgradeParts, applyPaint } from './models/upgrades3d.js';
import { findSite, toWorld, facing, downhill } from './place.js';
import { levelOf, stationOwners } from './save.js';
import { paintOf, UPGRADE_KEYS } from './upgrades.js';
import { now } from '../stations.js';

/** Seconds of the build-in animation (the building grows out of the ground). */
export const BUILD_TIME = 0.9;
const MACHINE_R = 1.1;
const LAMP = { idle: '#555555', ready: '#35e06a', busy: '#ff5a3a' };
const BUILDERS = { loods: buildLoods, villa: buildVilla, grot: buildGrot };
/** Short names for the entrance prompts and the minimap. */
export const SHORT = { hut: 'Strandhut', loods: 'Loods', villa: 'Villa', grot: 'Grotkeuken' };

/** The places that are built (not the hut, which island.js builds). */
export const BUILT = Object.keys(BUILDERS);

/** Finds a site for each property: { x, z, y, rot } in world coordinates. Call before adding colliders. */
export function findSites(heightAt, colliders) {
  // The harbour: the shore east of Havenstad. The pier runs out from it, so keep clear of that.
  let shore = 250;
  while (shore < 460 && heightAt(shore, 70) > 0.3) shore += 1;
  const found = {
    loods: findSite(heightAt, { start: { x: shore - 26, z: 46 }, zone: 'haven', minH: 1.2, maxH: 7, flat: 1.8, half: 6, clearance: 5, colliders, avoid: [{ x: shore + 18, z: 70, r: 24 }], reach: 140 }),
    villa: findSite(heightAt, { start: { x: -60, z: 40 }, zone: 'heuvels', minH: 5, maxH: 34, flat: 5, half: 7, clearance: 9, colliders, reach: 260 }),
    grot: findSite(heightAt, { start: { x: 40, z: -150 }, zone: 'vulkaan', minH: 14, maxH: 70, flat: 9, half: 7, clearance: 8, colliders, reach: 260 }),
  };
  const fallback = { loods: { x: shore - 26, z: 46 }, villa: { x: -60, z: 40 }, grot: { x: 40, z: -150 } };
  const sites = {};
  for (const id of BUILT) {
    const f = found[id] ?? { ...fallback[id], y: 0 };
    const y = heightAt(f.x, f.z);
    let rot = 0;
    if (id === 'loods') rot = facing(f.x, f.z, shore, 70); // the door looks at the quay
    if (id === 'villa') rot = facing(f.x, f.z, -40, 10); // the veranda looks at the island
    if (id === 'grot') rot = downhill(heightAt, f.x, f.z); // the mouth looks down the slope
    sites[id] = { x: f.x, z: f.z, y: Math.max(y, 0.2), rot };
  }
  return sites;
}

/** easeOutBack: a little overshoot as the building lands. */
function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

export class Properties {
  /**
   * ctx: the island context (scene, game, props, interactions, heightAt, hutPos, fx, minimap).
   * actions: { openProperty(id), openChest(id), askSleep(id) }.
   */
  constructor(ctx, actions) {
    this.ctx = ctx;
    this.game = ctx.game;
    this.actions = actions;
    this.items = [];
    this.building = false; // true once the first sync is done: later purchases animate
    this.sites = findSites(ctx.heightAt, ctx.props.colliders);
    this.hutPos = ctx.hutPos;
    this.hut = ctx.scene.children.find((o) => o.userData?.property === 'hut') ?? null;

    // The island's six machines stand beside the hut. The hut keeps the first; the others move to
    // the places that own stations. Their island colliders go: the places bring their own.
    const islandMachines = ctx.scene.children.filter((o) => o.userData?.lamp);
    this.machines = { hut: islandMachines.slice(0, 1), loods: islandMachines.slice(1, 3), villa: islandMachines.slice(3, 6), grot: [] };
    for (const m of islandMachines.slice(1)) {
      const i = ctx.props.colliders.findIndex((c) => c.r === MACHINE_R && c.x === m.position.x && c.z === m.position.z);
      if (i >= 0) ctx.props.colliders.splice(i, 1);
    }
    for (let i = 0; i < PROPERTIES.grot.stations; i++) {
      const m = buildMachine();
      ctx.scene.add(m);
      this.machines.grot.push(m);
    }
    this.allMachines = Object.values(this.machines).flat();

    this.views = {};
    for (const id of BUILT) this.views[id] = this.buildPlace(id);
    this.views.hut = { id: 'hut', root: this.hut, layout: HUT_LAYOUT, owned: true, colliders: [], grow: null, paint: -1 };
    this.placeInteractions();
    this.sync();
    this.building = true;
  }

  /** Builds the model of a place, hidden, with its machines and its world colliders. */
  buildPlace(id) {
    const { ctx } = this;
    const site = this.sites[id];
    const model = BUILDERS[id](PROPERTIES[id].name);
    const root = model.group;
    root.userData.property = id;
    root.position.set(site.x, site.y, site.z);
    root.rotation.y = site.rot;
    shadowsOn(root);
    addUpgradeParts(root, model);
    const colliders = model.colliders.map((c) => {
      const p = toWorld(site, c.x, c.z);
      return { x: p.x, z: p.z, r: c.r };
    });
    model.machines.forEach((spot, i) => {
      const m = this.machines[id][i];
      m.position.set(spot.x, 0, spot.z);
      m.rotation.y = 0;
      root.add(m);
      const p = toWorld(site, spot.x, spot.z);
      colliders.push({ x: p.x, z: p.z, r: MACHINE_R });
    });
    root.visible = false;
    ctx.scene.add(root);
    return { id, root, layout: model, colliders, owned: false, grow: null, paint: -1, site };
  }

  /** The chest, bed and entrance of every place as interactions. */
  placeInteractions() {
    const { interactions, game } = this.ctx;
    const hut = this.hutPos;
    const add = (x, z, r, label, run, enabled) => {
      const item = interactions.add({ x, z, r, label, run, enabled });
      this.items.push(item);
    };
    const owned = (id) => () => game.state.properties.includes(id);
    // The hut: chest and lounger (its menu is in hutMenu.js, opened by the island).
    const hl = HUT_LAYOUT;
    add(hut.x + hl.chest.x, hut.z + hl.chest.z, 2.6, 'Kist', () => this.actions.openChest('hut'), owned('hut'));
    add(hut.x + hl.bed.x, hut.z + hl.bed.z, 2.6, 'Slapen', () => this.actions.askSleep('hut'), owned('hut'));
    for (const id of BUILT) {
      const v = this.views[id];
      const L = v.layout;
      const at = (p) => toWorld(v.site, p.x, p.z);
      const e = at(L.entrance);
      add(e.x, e.z, 3.2, SHORT[id], () => this.actions.openProperty(id), owned(id));
      const c = at(L.chest);
      add(c.x, c.z, 2.4, 'Kist', () => this.actions.openChest(id), owned(id));
      const b = at(L.bed);
      add(b.x, b.z, 2.6, 'Slapen', () => this.actions.askSleep(id), owned(id));
    }
  }

  /** Brings the world in line with the save: what is owned, the upgrades, the paint, the stations. */
  sync() {
    const s = this.game.state;
    for (const id of BUILT) {
      const v = this.views[id];
      const owned = s.properties.includes(id);
      if (owned !== v.owned) this.setOwned(v, owned);
    }
    for (const v of Object.values(this.views)) if (v.owned) this.looks(v);
    this.showMachines();
    this.markMap();
  }

  setOwned(v, owned) {
    v.owned = owned;
    v.root.visible = owned;
    const cols = this.ctx.props.colliders;
    if (owned) {
      cols.push(...v.colliders);
      if (this.building && v.id !== 'hut') v.grow = 0; // the build-in animation
    } else {
      for (const c of v.colliders) {
        const i = cols.indexOf(c);
        if (i >= 0) cols.splice(i, 1);
      }
    }
  }

  /** Shows the upgrade parts of each level and the paint colour of a place. */
  looks(v) {
    const s = this.game.state;
    const id = v.id;
    const paint = paintOf(s, id);
    const key = UPGRADE_KEYS.map((t) => levelOf(s, t, id)).join('') + ':' + paint;
    if (key === v.key) return; // nothing changed: skip the walk over the parts
    v.key = key;
    v.root.traverse((o) => {
      const t = o.userData?.track;
      if (t) o.visible = levelOf(s, t, id) >= o.userData.level;
    });
    if (paint !== v.paint) {
      v.paint = paint;
      applyPaint(v.root, paint);
    }
  }

  /** The machines: station slot k is the k-th machine of the owned places (in order); the lamp shows its job. */
  showMachines() {
    const s = this.game.state;
    const used = {};
    const active = [];
    for (const id of stationOwners(s)) {
      const i = used[id] ?? 0;
      used[id] = i + 1;
      const m = this.machines[id]?.[i];
      if (m) active.push(m);
    }
    const t = now(s);
    for (const m of this.allMachines) {
      const k = active.indexOf(m);
      m.visible = k >= 0 || m === this.machines.hut[0];
      if (k < 0) {
        m.userData.lamp.color.set(LAMP.idle);
        m.userData.lamp.emissive.set('#000000');
        continue;
      }
      const job = s.jobs[k];
      const c = !job ? LAMP.idle : job.readyAt <= t ? LAMP.ready : LAMP.busy;
      m.userData.lamp.color.set(c);
      m.userData.lamp.emissive.set(job ? c : '#000000');
    }
  }

  /** The owned places as minimap marks. */
  markMap() {
    const s = this.game.state;
    const marks = s.properties.map((id) => {
      const p = id === 'hut' ? this.hutPos : this.sites[id];
      return { x: p.x, z: p.z, label: SHORT[id], id };
    });
    if (this.ctx.minimap) this.ctx.minimap.marks = marks;
  }

  /** Runs the build-in animation of a newly bought place (cosmetic: it runs while menus are open too). */
  update(t, dt) {
    for (const v of Object.values(this.views)) {
      if (v.grow == null) continue;
      v.grow += dt;
      const k = Math.min(1, v.grow / BUILD_TIME);
      v.root.scale.setScalar(Math.max(0.001, easeOutBack(k)));
      if (k >= 1) {
        v.grow = null;
        v.root.scale.setScalar(1);
        this.ctx.fx?.burst({ x: v.site.x, y: v.site.y + 0.3, z: v.site.z }, 18, { color: '#d8c79a', spread: 3.2, up: 2.4, life: 0.9, gravity: 4 });
      }
    }
  }

  dispose() {
    const cols = this.ctx.props.colliders;
    for (const v of Object.values(this.views)) {
      if (!v.owned) continue;
      for (const c of v.colliders) {
        const i = cols.indexOf(c);
        if (i >= 0) cols.splice(i, 1);
      }
    }
    const list = this.ctx.interactions.items;
    for (const it of this.items) {
      const i = list.indexOf(it);
      if (i >= 0) list.splice(i, 1);
    }
    if (this.ctx.minimap) this.ctx.minimap.marks = [];
  }
}
