// The vehicles in the island: they stand, drive and sail. This file owns the 3D vehicles, the
// places (the Garage in Havenstad, the harbour rental with its pump, the jetties, the treasure
// crate), the rider (the Mii sits on the vehicle while you drive), the fuel gauge, the sounds and
// the phone app. The rules live in the pure modules next to it (physics, store, fuel, heat, ...).
// Started by features/voertuigen.js.

import * as THREE from 'three';
import { VEHICLES } from './data.js';
import { drive, surfaceFrame, WATER_MAX } from './physics.js';
import { usesFuel, fuelShare, isEmpty } from './fuel.js';
import { store, list, acquire, giveBack, expireRentals, refuel, openChest as takeChest } from './store.js';
import { deckAt, findJetty, jettyBlockers, tipOf, DECK_HALF } from './harbour.js';
import { allDecks, deckBlockers, deckHeight } from '../world/decks.js';
import { findSpot } from './spots.js';
import { recklessRate, seenBy, bumped, BUMP_HEAT } from './heat.js';
import { addHeat, heatLevel } from '../police.js';
import { viewFactor } from '../weather.js';
import { pathDistance } from '../world/zones.js';
import { buildVehicle } from './models.js';
import { buildGarage, buildRentalHut, buildPump, buildJetty, buildChest } from './places.js';
import { makeGauge, CSS } from './hud.js';
import { openGarage, openHarbour, openPump, openChest as chestDialog } from './menus.js';
import { garageApp, zoneName } from './phoneApp.js';
import { unregisterApp } from '../phoneApps.js';

/** Height of the Mii's hips above its feet, in metres (measured in the game: so it sits on the seat). */
const SEAT_HIP = 0.47;
/** How much further the camera stands back while you ride (metres). */
const CAM_EXTRA = { fiets: 1.5, scooter: 2, golfkar: 4, roeiboot: 4, motorboot: 5.5, zeilboot: 6 };
const ICON = { fiets: '🚲', scooter: '🛵', golfkar: '🛺', roeiboot: '🛶', motorboot: '🚤', zeilboot: '⛵' };
const STROKE_RATE = 1.7;

/** Starts the vehicles in the island (see features/voertuigen.js). Returns { update, dispose }. */
export function startVoertuigen(ctx) {
  const vehicles = new Vehicles(ctx);
  // For tests and other features: ctx.voertuigen.mount(view), .buy(type, { where, rent }), .summon(id), ...
  ctx.voertuigen = vehicles;
  return vehicles.start();
}

class Vehicles {
  constructor(ctx) {
    this.ctx = ctx;
    this.game = ctx.game;
    this.player = ctx.player;
    this.follow = ctx.follow;
    this.scene = ctx.scene;
    this.props = ctx.props;
    this.interactions = ctx.interactions;
    this.audio = ctx.audio;
    this.fx = ctx.fx;
    this.views = new Map(); // id -> view (see addView)
    this.riding = null; // the view of the vehicle the Mii sits in
    this.blockers = []; // jetty sides: boats only
    this.decks = []; // jetties: { x, z, dx, dz, length, y }
    this.sites = {}; // the places: garage, harbour, pump, chest
    this.placeCols = []; // colliders of the places
    this.placeItems = []; // interaction items of the places
    this.placeGroups = [];
    this.offs = [];
    this.camBase = null;
    this.camExtra = 2;
    this.camBack = null;
    this.blinkAt = 2;
    this.dustAt = 0;
    this.wakeAt = 0;
    this.engineAt = 0;
    this.bumpAt = 0;
    this.bumpGuardAt = 0;
    this.t = 0;
    this.world = { height: (x, z) => this.groundAt(x, z), colliders: this.props.colliders, skip: null, extra: null };
    this.hook = (move, camYaw, dt, t) => this.onFrame(move, dt, t);
    this.gauge = makeGauge(ctx.hudBar);
  }

  start() {
    const { ctx, game } = this;
    ctx.addStyle(CSS);
    store(game);
    this.buildPlaces();
    this.player.deck = (x, z) => this.deckHeight(x, z);
    this.offs.push(game.on('newday', () => this.onNewDay()));
    ctx.registerApp(garageApp(this));
    this.sync();
    const e = store(game);
    if (e.riding) {
      const v = this.views.get(e.riding);
      if (v) this.mount(v);
      else e.riding = null;
    }
    return { update: (t, dt, paused) => this.update(t, dt, paused), dispose: () => this.dispose() };
  }

  // ---- the world: height, clearance, the places

  /** Ground height for vehicles and the Mii: the terrain, or a jetty deck if that is higher. */
  groundAt(x, z) {
    let y = this.ctx.heightAt(x, z);
    for (const j of this.decks) {
      const d = deckAt(j, x, z);
      if (d !== null && d > y) y = d;
    }
    // The island's piers and the bridge (world/decks.js), for a vehicle at about their height.
    const p = deckHeight(x, z, this.world.y ?? -Infinity);
    if (p !== null && p > y) y = p;
    return y;
  }

  /** Walkable height of a jetty deck at (x, z), or null (the Player asks this through player.deck). */
  deckHeight(x, z) {
    let best = null;
    for (const j of this.decks) {
      const d = deckAt(j, x, z);
      if (d !== null && (best === null || d > best)) best = d;
    }
    return best === null ? null : Math.max(best, this.ctx.heightAt(x, z));
  }

  /** No obstacle within R metres of (x, z) (the vehicle `skip` does not count). */
  clear(x, z, R, skip = null) {
    for (const c of this.props.colliders) {
      if (c === skip) continue;
      const dx = c.x - x;
      const dz = c.z - z;
      const m = c.r + R;
      if (dx * dx + dz * dz < m * m) return false;
    }
    return true;
  }

  /** Dry land (not the water, not a cliff) with nothing within R metres. */
  dryFree(x, z, R) {
    const y = this.groundAt(x, z);
    return y >= 0.4 && y < 14 && this.clear(x, z, R);
  }

  /** A jetty from the shore of anchor a: the nearest one that has room (no obstacle, no other jetty). */
  pickJetty(a) {
    const cands = [];
    for (let i = 0; i < 36; i++) {
      const ang = (i / 36) * Math.PI * 2;
      const j = findJetty((x, z) => this.ctx.heightAt(x, z), a.x, a.z, Math.cos(ang), Math.sin(ang), { length: 16, maxD: 220 });
      if (j) cands.push(j);
    }
    cands.sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z));
    return cands.find((j) => this.clearDeck(j)) ?? null;
  }

  clearDeck(j) {
    for (let u = 4; u <= j.length; u += 1) {
      const x = j.x + j.dx * u;
      const z = j.z + j.dz * u;
      if (!this.clear(x, z, DECK_HALF + 0.4)) return false;
      for (const b of this.ctx.props.boats) if (Math.hypot(b.position.x - x, b.position.z - z) < 6) return false;
    }
    return this.decks.every((o) => Math.hypot(o.x - j.x, o.z - j.z) > 40);
  }

  /** Builds the jetties and the places: the Garage, the harbour rental and pump, the treasure crate. */
  buildPlaces() {
    for (const a of [
      { id: 'haven', x: 250, z: 70 },
      { id: 'strand', x: 20, z: 230 },
      { id: 'kaap', x: -270, z: -150 },
      { id: 'vliegveld', x: 470, z: -300 },
    ]) {
      const j = this.pickJetty(a);
      if (!j) continue;
      this.decks.push(j);
      this.blockers.push(...jettyBlockers(j));
      const g = buildJetty(j);
      this.addPlace(g);
      if (a.id === 'haven') this.sites.harbourJetty = j;
    }

    // The harbour rental and the pump, on the land beside the jetty of Havenstad.
    const hj = this.sites.harbourJetty;
    if (hj) {
      const hut = findSpot(hj.x - hj.dx * 6, hj.z - hj.dz * 6, (x, z) => this.dryFree(x, z, 3.4), { rMax: 16, step: 1 });
      if (hut) {
        const heading = Math.atan2(hj.dx, hj.dz);
        const hg = buildRentalHut();
        hg.position.set(hut.x, this.groundAt(hut.x, hut.z), hut.z);
        hg.rotation.y = heading;
        this.addPlace(hg, { x: hut.x, z: hut.z, r: 3.2 });
        const tip = tipOf(hj);
        this.sites.harbour = { x: hut.x, z: hut.z, heading, tip };
        this.placeItem({ x: hut.x + hj.dx * 2.8, z: hut.z + hj.dz * 2.8, r: 4.5, label: 'Havenverhuur', run: () => openHarbour(this.game, this) });
        const pump = findSpot(hut.x + hj.dz * 3.8, hut.z - hj.dx * 3.8, (x, z) => this.dryFree(x, z, 1.2), { rMax: 6, step: 0.5 });
        if (pump) {
          const pg = buildPump();
          pg.position.set(pump.x, this.groundAt(pump.x, pump.z), pump.z);
          pg.rotation.y = heading;
          this.addPlace(pg, { x: pump.x, z: pump.z, r: 0.7 });
          this.sites.pump = { x: pump.x, z: pump.z };
          this.placeItem({ x: pump.x, z: pump.z, r: 3.4, label: 'Benzinepomp', run: () => openPump(this.game, this) });
        }
      }
    }

    // The Garage: a workshop in Havenstad, away from the paths.
    const gspot = findSpot(238, 62, (x, z) => {
      const y = this.groundAt(x, z);
      return y > 1.2 && y < 6 && pathDistance(x, z) > 10 && this.clear(x, z, 8);
    }, { rMax: 70, step: 1.5 });
    if (gspot) {
      const gy = this.groundAt(gspot.x, gspot.z);
      const gg = buildGarage();
      gg.position.set(gspot.x, gy - 0.25, gspot.z);
      this.addPlace(gg, { x: gspot.x, z: gspot.z, r: 7 });
      this.sites.garage = { x: gspot.x, z: gspot.z, front: { x: gspot.x, z: gspot.z + 10 }, heading: 0 };
      this.placeItem({ x: gspot.x, z: gspot.z + 8, r: 6, label: 'Garage', run: () => openGarage(this.game, this) });
    }

    // The treasure crate on the hidden beach, the sandbank far out at sea (reached by boat).
    const cspot = findSpot(-430, 255, (x, z) => this.groundAt(x, z) > 0.9 && this.clear(x, z, 1.2), { rMax: 60, step: 2 });
    if (cspot) {
      const chest = buildChest();
      chest.group.position.set(cspot.x, this.groundAt(cspot.x, cspot.z), cspot.z);
      chest.group.rotation.y = 0.6;
      this.addPlace(chest.group, { x: cspot.x, z: cspot.z, r: 0.9 });
      this.chest = chest;
      this.syncChest();
      this.placeItem({
        x: cspot.x,
        z: cspot.z,
        r: 4,
        label: 'Kist openen',
        enabled: () => !store(this.game).schat,
        run: () => {
          const r = takeChest(this.game);
          this.syncChest();
          if (r) chestDialog(this.game, r);
        },
      });
    }
  }

  syncChest() {
    if (this.chest) this.chest.lid.rotation.x = store(this.game).schat ? -1.5 : 0;
  }

  /** Puts a place's model into the island, with its collider (if any) and nothing else. */
  addPlace(group, col = null) {
    this.ctx.shadowsOn(group);
    this.scene.add(group);
    this.placeGroups.push(group);
    if (col) {
      const c = { x: col.x, z: col.z, r: col.r };
      this.props.colliders.push(c);
      this.placeCols.push(c);
    }
  }

  /** An interaction on a place, removed again when the feature stops. */
  placeItem(item) {
    const it = this.interactions.add({ r: 4, ...item });
    this.placeItems.push(it);
    return it;
  }

  // ---- the vehicles: views of the records in the save

  /** Makes the 3D view of a record of list(game) (once). */
  addView(rec) {
    const spec = VEHICLES[rec.type];
    if (!spec) return null;
    rec.speed ??= 0; // a parked vehicle stands still (older saves may lack these)
    rec.wheel ??= 0;
    rec.cargo ??= {};
    const model = buildVehicle(rec.type, { color: rec.color });
    model.group.rotation.order = 'YXZ';
    this.ctx.shadowsOn(model.group);
    this.scene.add(model.group);
    const col = { x: rec.x, z: rec.z, r: spec.radius + 0.15 };
    this.props.colliders.push(col);
    const view = { id: rec.id, rec, spec, model, col, phase: 0, phase0: Math.random() * 6, warned: false, exitAt: 0, exitOk: false, lastSin: 0, item: null };
    view.item = this.interactions.add({
      x: rec.x,
      z: rec.z,
      r: spec.kind === 'water' ? 3.6 : 3,
      label: `Stap op: ${spec.name}`,
      enabled: () => (this.riding === view ? view.exitOk && Math.abs(rec.speed) < 1.5 : !this.riding),
      run: () => (this.riding === view ? this.dismount() : this.mount(view)),
    });
    this.views.set(rec.id, view);
    this.place(view);
    return view;
  }

  removeView(id) {
    const view = this.views.get(id);
    if (!view) return;
    if (this.riding === view) this.dismount(true);
    this.views.delete(id);
    this.scene.remove(view.model.group);
    view.model.group.traverse((o) => {
      if (o.name === 'blob') o.material.dispose();
    });
    this.removeFrom(this.props.colliders, view.col);
    this.removeFrom(this.interactions.items, view.item);
  }

  removeFrom(list, item) {
    const i = list.indexOf(item);
    if (i >= 0) list.splice(i, 1);
  }

  /** Makes the views match the records (a rental that went back is removed, a new one appears). */
  sync() {
    const recs = list(this.game);
    const ids = new Set(recs.map((r) => r.id));
    for (const [id, view] of [...this.views]) if (!ids.has(id) && !view.rec.public) this.removeView(id);
    for (const rec of recs) if (!this.views.has(rec.id)) this.addView(rec);
  }

  /** Puts a parked vehicle on the ground where its record says (and keeps its collider and label). */
  place(view) {
    const { rec, spec, model } = view;
    const g = model.group;
    if (spec.kind === 'land') {
      this.world.y = rec.y ?? null;
      const f = surfaceFrame(rec, spec, this.world);
      g.position.set(rec.x, f.y, rec.z);
      g.rotation.set(f.pitch, rec.h, f.roll, 'YXZ');
    } else {
      g.position.set(rec.x, 0.03, rec.z);
      g.rotation.set(0, rec.h, 0, 'YXZ');
    }
    view.col.x = rec.x;
    view.col.z = rec.z;
    view.item.x = rec.x;
    view.item.z = rec.z;
  }

  // ---- the Garage, the rental and the pump (used by the menus and the phone)

  /** A place on the land (or the water) for a new or summoned vehicle near (x, z). */
  landSpot(x, z, skip = null) {
    return findSpot(x, z, (px, pz) => this.dryFree(px, pz, 1.1) && this.clear(px, pz, 0.1, skip), { rMax: 12, step: 0.75 });
  }

  waterSpot(x, z, rMax = 14) {
    return findSpot(x, z, (px, pz) => this.groundAt(px, pz) <= WATER_MAX - 0.2 && this.clear(px, pz, 1.8), { rMax, step: 1 });
  }

  /** Buys or rents a vehicle at the Garage (where = 'garage') or the harbour rental ('harbour'). */
  buy(type, { where = 'garage', rent = false } = {}) {
    const boat = VEHICLES[type]?.kind === 'water';
    const at = where === 'harbour' ? this.sites.harbour : this.sites.garage;
    if (!at) return { ok: false, msg: 'Die verhuur is er niet.' };
    const spot = boat ? this.waterSpot(at.tip.x, at.tip.z) : this.landSpot(at.front?.x ?? at.x + 8, at.front?.z ?? at.z + 8);
    if (!spot) {
      this.toast('Hier is geen vrije plek voor. Zet eerst iets weg.');
      return { ok: false, msg: 'geen plek' };
    }
    const r = acquire(this.game, type, { x: spot.x, z: spot.z, h: boat ? at.heading : 0 }, { rent });
    if (r.ok) {
      this.sync();
      this.game.save();
      this.audio.play('cash');
    }
    this.toast(r.msg);
    return r;
  }

  /** Hands a rented vehicle back. */
  giveBack(id) {
    const view = this.views.get(id);
    if (view && this.riding === view) this.dismount(true);
    const r = giveBack(this.game, id);
    if (r.ok) this.sync();
    return r;
  }

  /** Fills the tank of a vehicle at the pump. */
  refuelAt(id) {
    const r = refuel(this.game, id);
    this.toast(r.msg);
    return r;
  }

  /** The fuel vehicles that stand at the pump (you are at the pump, or sitting in one there). */
  fuelNearPump() {
    const p = this.sites.pump;
    if (!p) return [];
    return list(this.game).filter((v) => usesFuel(VEHICLES[v.type]) && Math.hypot(v.x - p.x, v.z - p.z) < 9);
  }

  /** Calls a vehicle to you: it appears in front of you (or on the water near you). */
  summon(id) {
    const view = this.views.get(id);
    if (!view) return { ok: false, msg: 'Dat voertuig is er niet.' };
    if (this.riding === view) return { ok: false, msg: 'Je zit er al in.' };
    const p = this.player.pos;
    const h = this.player.heading;
    const water = view.spec.kind === 'water';
    const spot = findSpot(
      p.x + Math.sin(h) * 3.2,
      p.z + Math.cos(h) * 3.2,
      (x, z) => (water ? this.groundAt(x, z) <= WATER_MAX - 0.2 && this.clear(x, z, 1.8, view.col) : this.dryFree(x, z, 1.0) && this.clear(x, z, 0.1, view.col) && Math.hypot(x - p.x, z - p.z) > 1.8),
      { rMax: water ? 30 : 9, step: 1 },
    );
    if (!spot) return { ok: false, msg: water ? 'Er is hier geen water in de buurt.' : 'Er is hier geen plek naast je.' };
    view.rec.x = spot.x;
    view.rec.z = spot.z;
    view.rec.h = h;
    this.place(view);
    this.audio.play('click');
    return { ok: true, msg: `${view.spec.name} staat naast je.` };
  }

  // ---- what the phone shows

  isRiding(id) {
    return this.riding?.id === id;
  }

  /** Where a vehicle is, for the phone: the zone and how far from you. */
  whereOf(rec) {
    const d = Math.hypot(rec.x - this.player.pos.x, rec.z - this.player.pos.z);
    if (d < 12) return 'Vlakbij je.';
    return `Op ${Math.round(d)} m, bij ${zoneName(this.ctx.zoneAt(rec.x, rec.z))}.`;
  }

  /** You can load a vehicle when you are next to it, or in it (not a pier boat: it is not yours). */
  canLoad(rec) {
    if (rec.public) return false;
    if (this.riding?.id === rec.id) return true;
    return Math.hypot(rec.x - this.player.pos.x, rec.z - this.player.pos.z) < 8;
  }

  // ---- riding

  mount(view) {
    if (this.riding || !view) return false;
    this.riding = view;
    store(this.game).riding = view.rec.public ? null : view.id; // a pier boat is not in the save
    this.player.external = this.hook;
    this.player.swimming = false;
    this.player.grounded = true;
    this.player.vy = 0;
    this.camBase = this.follow.dist;
    this.camExtra = CAM_EXTRA[view.model.type] ?? 2;
    this.camBack = null;
    view.item.label = 'Stap af';
    view.exitAt = 0;
    view.warned = false;
    this.gauge.show(ICON[view.model.type] ?? '🚲', usesFuel(view.spec));
    this.placeRider(view, 0, this.t);
    this.audio.play('click');
    return true;
  }

  /** Gets off: beside the vehicle, on ground the Mii can stand on. Returns false when there is no such place. */
  dismount(force = false) {
    const view = this.riding;
    if (!view) return false;
    let spot = this.exitSpot(view);
    if (!spot) {
      if (!force) {
        this.toast('Hier kun je niet afstappen: het water is hier te diep.');
        return false;
      }
      const hut = this.ctx.hutPos;
      spot = { x: hut.x, z: hut.z + 4 };
      this.toast('Je wordt naar je hut gebracht.');
    }
    this.riding = null;
    store(this.game).riding = null;
    this.resetRider();
    const p = this.player;
    p.pos.set(spot.x, this.groundAt(spot.x, spot.z), spot.z);
    p.group.position.copy(p.pos);
    p.heading = view.rec.h;
    p.speed = 0;
    view.item.label = `Stap op: ${view.spec.name}`;
    this.gauge.hide();
    this.camBack = this.camBase;
    this.camBase = null;
    this.audio.play('click');
    this.game.save();
    return true;
  }

  /** Gives the Mii back its own pose (the walking animation takes over again). */
  resetRider() {
    const p = this.player;
    p.external = null;
    p.group.rotation.set(0, p.heading, 0, 'XYZ');
    p.mii.group.position.set(0, 0, 0);
    p.mii.group.rotation.set(0, 0, 0);
    p.mii.headPivot.rotation.set(0, 0, 0);
  }

  /** A free spot next to the vehicle to step off onto, or null. */
  exitSpot(view) {
    const { rec, spec } = view;
    const d = spec.radius + 0.9;
    const fx = Math.sin(rec.h);
    const fz = Math.cos(rec.h);
    const walk = (x, z) => this.groundAt(x, z) > -8 && this.clear(x, z, 0.5, view.col);
    for (const [ux, uz] of [[fz, -fx], [-fz, fx], [-fx, -fz], [fx, fz]]) {
      const x = rec.x + ux * d;
      const z = rec.z + uz * d;
      if (walk(x, z)) return { x, z };
    }
    return findSpot(rec.x, rec.z, walk, { rMax: 8, step: 1 });
  }

  /** Every frame while you ride (the Player hands over to this, see player.js external). */
  onFrame(move, dt, t) {
    const view = this.riding;
    if (!view) return;
    this.t = t;
    const paused = this.ctx.isPaused();
    if (!paused && dt > 0) this.step(view, { throttle: move.y, steer: move.x, brake: !!move.brake }, dt, t);
    this.placeRider(view, dt, t);
    this.pose(view, dt, t);
    this.wheels(view, dt, t);
    this.camera(dt);
    this.sounds(view, dt, t);
    const { rec, spec } = view;
    this.gauge.update(fuelShare(spec, rec.fuel), Math.round(Math.abs(rec.speed) * 3.6), isEmpty(spec, rec.fuel));
  }

  /** One drive step of the vehicle, with bumps, the guards and the empty tank. */
  step(view, ctl, dt, t) {
    const { rec, spec } = view;
    this.world.skip = view.col;
    this.world.extra = spec.kind === 'water' ? this.blockers : null;
    this.world.y = rec.y ?? null; // the height it drives at: on the bridge, or under it
    const out = drive(rec, spec, ctl, dt, this.world);
    view.col.x = rec.x;
    view.col.z = rec.z;
    view.item.x = rec.x;
    view.item.z = rec.z;
    if (out.hit && out.impact > 1.2 && t - this.bumpAt > 0.3) {
      this.bumpAt = t;
      if (this.audio.ready) this.audio.tone(110, 0.16, { type: 'square', vol: 0.07, glide: 0.6 });
      this.fx.dust({ x: rec.x, y: 0.2, z: rec.z }, true);
    }
    this.watchGuards(rec, spec, dt, t);
    if (usesFuel(spec) && isEmpty(spec, rec.fuel)) {
      if (!view.warned) {
        view.warned = true;
        this.toast('Leeg! Je duwt nu maar. Tank bij de pomp in de haven.');
      }
    } else view.warned = false;
    view.exitAt -= dt;
    if (view.exitAt <= 0) {
      view.exitAt = 0.25;
      view.exitOk = !!this.exitSpot(view);
    }
  }

  /** Driving fast in view of a guard is suspicious; running into one is worse. Stock in the back is not seen. */
  watchGuards(rec, spec, dt, t) {
    const guards = this.ctx.guards?.list;
    if (!guards?.length) return;
    const s = this.game.state;
    const seen = seenBy(rec.x, rec.z, guards, heatLevel(s), viewFactor(s.day));
    const rate = recklessRate(rec.speed, spec.maxSpeed, seen);
    if (rate > 0) addHeat(this.game, rate * dt, true);
    if (bumped(rec.x, rec.z, rec.speed, guards) && t - this.bumpGuardAt > 4) {
      this.bumpGuardAt = t;
      addHeat(this.game, BUMP_HEAT);
      this.toast('Oeps! Pas op voor de bewaker.');
    }
  }

  /** The vehicle and the rider at the same spot: the ground under the vehicle, tilted to the slope. */
  placeRider(view, dt, t) {
    const { rec, spec, model } = view;
    let y;
    let pitch = 0;
    let roll = 0;
    if (spec.kind === 'land') {
      this.world.y = rec.y ?? null;
      const f = surfaceFrame(rec, spec, this.world);
      y = f.y;
      rec.y = y;
      pitch = f.pitch;
      roll = f.roll;
    } else {
      const sp = Math.min(1, Math.abs(rec.speed) / spec.maxSpeed);
      y = 0.03 + Math.sin(t * 1.3 + view.phase0) * 0.07;
      pitch = -0.07 * sp + 0.025 * Math.sin(t * 0.9 + view.phase0);
      roll = -0.09 * rec.wheel * sp + 0.035 * Math.sin(t * 0.7 + view.phase0 * 2);
    }
    const g = model.group;
    g.position.set(rec.x, y, rec.z);
    g.rotation.set(pitch, rec.h, roll, 'YXZ');
    const pg = this.player.group;
    pg.position.copy(g.position);
    pg.rotation.set(pitch, rec.h, roll, 'YXZ');
    this.player.pos.copy(g.position);
    this.player.heading = rec.h;
    this.player.speed = Math.abs(rec.speed);
  }

  /** The Mii sits on the seat: legs forward, hands on the bars or the oars. */
  pose(view, dt, t) {
    const { rec, spec, model } = view;
    const mii = this.player.mii;
    const parts = mii.parts;
    if (!parts) return;
    const sp = Math.abs(rec.speed);
    if (model.type === 'fiets') view.phase += (sp * dt) / 0.33;
    else if (model.type === 'roeiboot') view.phase += dt * (sp > 0.2 ? STROKE_RATE + sp * 0.2 : 0);
    let legL = -1.2;
    let legR = legL;
    let armL = model.arm ?? -1.0;
    let armR = armL;
    if (model.type === 'fiets') {
      const s = Math.sin(view.phase);
      legL = -0.95 + 0.5 * s;
      legR = -0.95 - 0.5 * s;
    }
    if (model.type === 'roeiboot') {
      const s = Math.sin(view.phase);
      legL = legR = -0.5;
      armL = armR = -0.9 + 0.8 * s;
    }
    parts.legL.rotation.x = legL;
    parts.legR.rotation.x = legR;
    parts.armL.rotation.x = armL;
    parts.armR.rotation.x = armR;
    parts.armL.rotation.z = 0.12;
    parts.armR.rotation.z = -0.12;
    mii.group.position.set(0, spec.seat - SEAT_HIP, spec.seatZ);
    mii.group.rotation.set(model.lean ?? 0.05, 0, 0);
    mii.headPivot.rotation.set(0, 0, 0);
    if (t > this.blinkAt) {
      mii.setBlink(true);
      if (t > this.blinkAt + 0.12) {
        mii.setBlink(false);
        this.blinkAt = t + 2 + Math.random() * 3;
      }
    }
  }

  /** Wheels turn with the distance, the front wheels and the bars with the steering, the propeller and the oars. */
  wheels(view, dt, t) {
    const { rec, spec, model } = view;
    const d = rec.speed * dt;
    if (model.wheelR) {
      for (const w of model.spin) w.rotation.x -= d / model.wheelR;
      for (const s of model.steer) s.rotation.y = rec.wheel * 0.55;
      for (const b of model.bars) if (model.type !== 'golfkar') b.rotation.y = rec.wheel * 0.8;
    }
    if (model.prop) model.prop.rotation.z += (2 + Math.abs(rec.speed) * 3) * dt * 6;
    if (model.oars) for (const o of model.oars) o.rotation.y = Math.sin(view.phase) * 0.45;
    const sp = Math.abs(rec.speed);
    if (spec.kind === 'land' && sp > 3 && t - this.dustAt > 0.35) {
      this.dustAt = t;
      this.fx.dust({ x: rec.x, y: 0.1, z: rec.z }, true);
    }
    if (spec.kind === 'water' && sp > 1.2 && t - this.wakeAt > 0.22) {
      this.wakeAt = t;
      const sx = Math.sin(rec.h);
      const sz = Math.cos(rec.h);
      this.fx.ripple({ x: rec.x - sx * spec.len * 0.5, y: 0, z: rec.z - sz * spec.len * 0.5 }, 2 + sp * 0.12);
      if (sp > 3) this.fx.splash({ x: rec.x + sx * spec.len * 0.5, y: 0.2, z: rec.z + sz * spec.len * 0.5 }, 3);
    }
  }

  /** Parked boats float: bob on the swell. */
  bob(view, t) {
    const g = view.model.group;
    g.position.y = 0.03 + Math.sin(t * 1.3 + view.phase0) * 0.07;
    g.rotation.x = 0.025 * Math.sin(t * 0.9 + view.phase0);
    g.rotation.z = 0.035 * Math.sin(t * 0.7 + view.phase0 * 2);
  }

  /** The camera stands further back while you ride, and swings back when you get off. */
  camera(dt) {
    if (this.camBase == null) return;
    const target = this.camBase + this.camExtra;
    this.follow.dist += (target - this.follow.dist) * Math.min(1, dt * 2);
  }

  /** The motor and the bicycle tick, the oars splash at every stroke, bumps bang. */
  sounds(view, dt, t) {
    if (!this.audio.ready) return;
    const { rec, model } = view;
    const sp = Math.abs(rec.speed);
    if (model.type === 'roeiboot') {
      const s = Math.sin(view.phase);
      if (view.lastSin < 0 && s >= 0 && sp > 0.3) this.audio.play('splash');
      view.lastSin = s;
      return;
    }
    if (sp < 0.4 || t - this.engineAt < 0.1) return;
    this.engineAt = t;
    const tone = (f, d, o) => this.audio.tone(f, d, o);
    if (model.type === 'fiets') tone(1200 + sp * 60, 0.05, { type: 'triangle', vol: 0.025 });
    else if (model.type === 'scooter') tone(120 + sp * 14, 0.12, { type: 'sawtooth', vol: 0.009 });
    else if (model.type === 'golfkar') tone(220 + sp * 18, 0.12, { type: 'sine', vol: 0.012 });
    else if (model.type === 'motorboot') tone(60 + sp * 6, 0.14, { type: 'sawtooth', vol: 0.012 });
  }

  toast(text) {
    this.ctx.toast(text);
  }

  // ---- the frame and the day

  /** The parked boats bob; the day ends (rentals go back). */
  update(t, dt, paused = false) {
    this.t = t;
    if (!this.pierBoats) this.makePierBoats(); // after all features are in: the wereld jetty is there by now
    this.sync();
    if (!this.riding && !paused) for (const view of this.views.values()) if (view.spec.kind === 'water') this.bob(view, t);
    if (this.camBack != null && !this.riding) {
      const d = this.camBack - this.follow.dist;
      this.follow.dist += d * Math.min(1, dt * 2);
      if (Math.abs(d) < 0.02) this.camBack = null;
    }
  }

  /**
   * The boats moored at the piers become pier boats anyone can sail: each decor boat is hidden and
   * a sailing boat (VEHICLES.zeilboot) takes its place, with the same colour and heading.
   */
  makePierBoats() {
    this.pierBoats = [];
    // The piers' planks are in the way of boats, as the jetties are.
    for (const d of allDecks()) this.blockers.push(...deckBlockers(d)); // a high bridge only blocks with its towers
    const found = [];
    this.scene.traverse((o) => o.userData.moored && found.push(o));
    const w = new THREE.Vector3();
    found.forEach((b, i) => {
      b.getWorldPosition(w);
      b.visible = false;
      // The decor boat's own collider (the wereld jetty pushes one per boat) goes with it.
      const old = this.props.colliders.find((c) => Math.hypot(c.x - w.x, c.z - w.z) < 0.6 && c.r > 1.5 && c.r < 2);
      if (old) this.removeFrom(this.props.colliders, old);
      const rec = { id: `pier-${i}`, type: 'zeilboot', public: true, color: b.userData.color, x: w.x, z: w.z, h: b.rotation.y, speed: 0, wheel: 0, cargo: {}, fuel: 0 };
      this.pierBoats.push(rec);
      this.addView(rec);
    });
  }

  onNewDay() {
    const gone = expireRentals(this.game);
    if (!gone.length) return;
    this.sync();
    const names = gone.map((v) => VEHICLES[v.type].name.toLowerCase()).join(', ');
    setTimeout(() => this.toast(`Gehuurd: ${names} is weer naar de verhuurder.`), 4200);
  }

  dispose() {
    for (const off of this.offs) off();
    this.offs = [];
    if (this.riding) this.resetRider();
    this.riding = null;
    this.player.external = null;
    this.player.deck = null;
    for (const id of [...this.views.keys()]) this.removeView(id);
    for (const it of this.placeItems) this.removeFrom(this.interactions.items, it);
    for (const c of this.placeCols) this.removeFrom(this.props.colliders, c);
    for (const g of this.placeGroups) this.scene.remove(g);
    this.gauge.dispose();
    unregisterApp('garage');
  }
}
