// The laundering buildings in the world: four businesses (for sale until you buy them), the harbour
// ATM, and the inspector of the Fiscus who stands at a business during a visit. Placed once on free
// ground when the island is built; lamps, signs and the wheel follow the save and the time.

import * as THREE from 'three';
import { MiiModel } from '../../mii/model.js';
import { OFFICIAL_MIIS } from '../../mii/official.js';
import { MII_SCALE } from '../player.js';
import { RANKS } from '../state.js';
import { BUSINESSES, BUSINESS_IDS, INSPECTORS } from './data.js';
import { bizOf } from './store.js';
import { isOpen } from './rules.js';
import { findSpot } from './spots.js';
import { buildModel, forSaleSign } from './models.js';

/** Where each building goes: an anchor on the map (findSpot searches around it) and its size. */
const PLAN = {
  ijskraam: { anchor: { x: 60, z: 222 }, r: 4.2, minH: 2, maxH: 6, reach: 90, sale: [-4.2, 0, 3.4], hit: 7, cols: [[0, 0, 3.4]] },
  surfschool: { anchor: { x: -25, z: 214 }, r: 5.4, minH: 1.8, maxH: 5, reach: 110, sale: [-5.6, 0, 4.4], hit: 8, cols: [[0, 0, 4.6]] },
  paviljoen: { anchor: { x: 100, z: 178 }, r: 7, minH: 2, maxH: 5, reach: 110, sale: [7.6, 0, 5.2], hit: 9, cols: [[0, 0, 5.6]] },
  pretpark: { anchor: { x: 232, z: 40 }, r: 13, minH: 2.5, maxH: 8, reach: 100, sale: [12.8, 0, 9.6], hit: 12, cols: [[-7, 0, 7], [0, 0, 7], [7, 0, 7]] },
  atm: { r: 1.4, minH: 2, maxH: 8, reach: 60, hit: 3.5, cols: [[0, 0, 1.1]] },
};
const OPEN = 0x35e06a;
const CLOSED = 0xff5a3a;
const SALE = 0x8e96a3;

/** The harbour: the first pier boat, stepped back towards the middle of Havenstad (the ATM stands on land there). */
function harbourAnchor(ctx) {
  const boat = ctx.props.boats?.[0]?.position;
  if (!boat) return { x: 258, z: 84 };
  const tx = 250;
  const tz = 70;
  const dx = tx - boat.x;
  const dz = tz - boat.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: boat.x + (dx / len) * 16, z: boat.z + (dz / len) * 16 };
}

export class WitWorld {
  /**
   * ctx: the feature context (scene, props, interactions, heightAt, shadowsOn, game).
   * actions: { business(id), buy(id), atm(), audit() } run by the interactions.
   */
  constructor(ctx, actions) {
    this.ctx = ctx;
    this.game = ctx.game;
    this.actions = actions;
    this.items = [];
    this.spin = 0;
    this.lastRefresh = -1;
    this.mii = null;
    this.inspectorOf = null;
    this.entries = [];

    for (const id of BUSINESS_IDS) this.entries.push(this.place(id));
    const atmSpot = findSpot(ctx, harbourAnchor(ctx), PLAN.atm) ?? { x: 258, z: 84, y: ctx.heightAt(258, 84), yaw: 0 };
    this.atm = this.placeModel('atm', atmSpot);
    this.addItem(atmSpot.x, atmSpot.z, PLAN.atm.hit, 'Pinautomaat', () => actions.atm());
    // The inspector: only while a visit is on (enabled), at the business he stands at.
    this.inspectorItem = this.addItem(0, 0, 4, 'Praat met de Fiscus', () => actions.audit(), () => !!this.inspectorOf);
    this.refresh();
  }

  /** Puts a model on the ground and its colliders and interaction in the props. */
  placeModel(id, spot) {
    const g = buildModel(id);
    g.position.set(spot.x, spot.y, spot.z);
    g.rotation.y = spot.yaw;
    this.ctx.scene.add(g);
    this.ctx.shadowsOn(g);
    const cols = PLAN[id].cols;
    const c = Math.cos(spot.yaw);
    const s = Math.sin(spot.yaw);
    for (const [dx, dz, r] of cols) {
      // Local offsets turned with the building (+z is the front).
      const x = spot.x + dx * c + dz * s;
      const z = spot.z - dx * s + dz * c;
      this.ctx.props.colliders.push({ x, z, r });
    }
    return g;
  }

  place(id) {
    const d = BUSINESSES[id];
    const plan = PLAN[id];
    const spot = findSpot(this.ctx, plan.anchor, plan) ?? { x: plan.anchor.x, z: plan.anchor.z, y: this.ctx.heightAt(plan.anchor.x, plan.anchor.z), yaw: 0 };
    const g = this.placeModel(id, spot);
    const sale = forSaleSign(d.price, RANKS[d.rank]);
    sale.position.set(...plan.sale);
    g.add(sale);
    const item = this.addItem(spot.x, spot.z, plan.hit, d.short, () => (bizOf(this.game, id) ? this.actions.business(id) : this.actions.buy(id)));
    return { id, g, sale, lamp: g.userData.lamp, item, spot, wheel: g.userData.wheel ?? null };
  }

  addItem(x, z, r, label, run, enabled = null) {
    const item = { x, z, r, label, run };
    if (enabled) item.enabled = enabled;
    this.ctx.interactions.add(item);
    this.items.push(item);
    return item;
  }

  /** Lamps, labels and for-sale signs follow the save. */
  refresh() {
    const day = this.game.state.day;
    for (const e of this.entries) {
      const d = BUSINESSES[e.id];
      const b = bizOf(this.game, e.id);
      const open = !!b && isOpen(b, day);
      e.sale.visible = !b;
      const col = !b ? SALE : open ? OPEN : CLOSED;
      e.lamp.color.setHex(col);
      e.lamp.emissive.setHex(b ? col : 0x000000);
      e.lamp.emissiveIntensity = b ? 0.6 : 0;
      e.item.label = b ? d.short : `Te koop: ${d.short}`;
    }
    this.atm.userData.lamp.emissive.setHex(OPEN);
    this.atm.userData.lamp.emissiveIntensity = 0.6;
  }

  /** The inspector stands in front of business `id` during a visit; null sends him away. */
  setInspector(id, who = 0) {
    const e = id ? this.entries.find((x) => x.id === id) : null;
    if (!e) {
      if (this.mii) this.mii.group.visible = false;
      this.inspectorOf = null;
      return;
    }
    if (!this.mii || this.miiWho !== who) {
      this.dropInspector();
      this.createInspector(who);
    }
    if (this.inspectorOf !== id) {
      this.inspectorOf = id;
      const front = e.g.userData.front;
      const p = e.g.localToWorld(new THREE.Vector3(front.x, 0, front.z));
      this.mii.group.position.set(p.x, this.ctx.heightAt(p.x, p.z), p.z);
      this.mii.group.rotation.y = e.g.rotation.y + Math.PI; // faces the building
      this.inspectorItem.x = p.x;
      this.inspectorItem.z = p.z;
    }
    this.mii.group.visible = true;
  }

  /** The inspector's Mii, made for the visit (a dark suit, like the official Miis). */
  createInspector(who = 0) {
    const name = INSPECTORS[who % INSPECTORS.length].mii;
    const data = structuredClone(OFFICIAL_MIIS.find((m) => m.name === name) ?? OFFICIAL_MIIS[0]);
    data.favoriteColor = 11;
    this.mii = new MiiModel(data);
    this.miiWho = who;
    this.mii.group.scale.setScalar(MII_SCALE);
    this.ctx.shadowsOn(this.mii.group, false);
    this.ctx.scene.add(this.mii.group);
    this.mii.group.visible = false;
  }

  dropInspector() {
    if (!this.mii) return;
    this.ctx.scene.remove(this.mii.group);
    this.mii.dispose();
    this.mii = null;
  }

  update(t, dt, paused) {
    if (paused) return;
    this.spin += dt;
    if (this.spin - this.lastRefresh > 1) {
      this.lastRefresh = this.spin;
      this.refresh();
    }
    for (const e of this.entries) if (e.wheel) e.wheel.rotation.z -= dt * 0.25;
  }

  dispose() {
    for (const it of this.items) {
      const i = this.ctx.interactions.items.indexOf(it);
      if (i >= 0) this.ctx.interactions.items.splice(i, 1);
    }
    for (const e of this.entries) this.ctx.scene.remove(e.g);
    this.ctx.scene.remove(this.atm);
    this.dropInspector();
  }
}
