// The sellers in the world: orange-shirted Miis who stand at their route (with a cooler box and a
// parasol), wander about it while they work and wait by the hut when they have no route. A name tag
// shows what they need. Walk up to one and press E to talk. They only exist as 3D objects while the
// player is within 150 m; the selling itself is simulated in sim.js, whether you look or not.

import * as THREE from 'three';
import { MiiModel } from '../../mii/model.js';
import { MII_SCALE } from '../player.js';
import { STOCK_MAX, candidateById } from './data.js';
import { miiFor } from './looks.js';
import { findFree, isFree } from './place.js';
import { Popups, buildStand, buildTag } from './props3d.js';
import * as S from './sellers.js';
import { sellerPanel } from './sellerPanel.js';
import { handelState } from './store.js';
import { onShift } from './time.js';

const NEAR = 150;
const WALK = 1.3;
const SLOTS = [[0, 0], [8, 2], [-8, 3], [3, -9]];
// Constant option objects, so walking does not allocate every frame.
const STEP_OPTS = { gap: 0.4, minH: 0.4, maxH: 70 };
const PICK_OPTS = { gap: 0.5, minH: 0.4, maxH: 70 };

export class SellerView {
  constructor(ctx) {
    this.ctx = ctx;
    this.entries = new Map();
    this.popups = new Popups(ctx.scene);
    this.syncT = 0;
    this.homes = new Map();
    this.anchors = this.findAnchors();
  }

  findAnchors() {
    const { spots, hutPos, props } = this.ctx;
    const hotel = props.colliders.find((c) => c.hotel)?.hotel ?? { x: -30, z: 120 };
    const at = {
      hut: [hutPos.x - 3, hutPos.z + 12],
      strand: [spots.strand.x + 16, spots.strand.z - 6],
      haven: [spots.haven.x + 16, spots.haven.z - 6],
      kaap: [-262, -142],
      heuvels: [hotel.x + 24, hotel.z + 12],
    };
    const out = {};
    for (const [k, [x, z]] of Object.entries(at)) out[k] = findFree(this.ctx, x, z, { gap: 3, maxH: 70 });
    return out;
  }

  /** The spot where slot n of a place stands (a few metres apart for sellers sharing a route). */
  home(place, slot = 0) {
    const key = `${place}:${slot}`;
    if (!this.homes.has(key)) {
      const a = this.anchors[place];
      const [dx, dz] = SLOTS[slot % SLOTS.length];
      this.homes.set(key, slot === 0 ? a : findFree(this.ctx, a.x + dx, a.z + dz, { gap: 2.5, maxH: 70 }));
    }
    return this.homes.get(key);
  }

  /** Where a seller is right now: his route in working hours, the hut during the day, else nowhere. */
  where(s) {
    const hour = this.ctx.game.hour;
    if (s.zone) return onShift(hour) ? s.zone : null;
    return hour >= 7 && hour < 22 ? 'hut' : null;
  }

  ensure(s) {
    let e = this.entries.get(s.id);
    if (e) return e;
    const cand = candidateById(s.id);
    e = { id: s.id, cand, group: new THREE.Group(), mii: null, stand: null, tag: null, place: null, slot: 0, reset: true, x: 0, z: 0, heading: 0, target: null, wait: 1, phase: Math.random() * 6, speed: 0, shown: false, near: false, hx: 0, hz: 0 };
    e.group.visible = false;
    this.ctx.scene.add(e.group);
    e.item = this.ctx.interactions.add({ x: 0, z: 0, r: 4.2, label: `Praat met ${cand.name}`, enabled: () => e.shown, run: () => this.talk(s.id) });
    this.entries.set(s.id, e);
    return e;
  }

  /** Builds the 3D pieces of one seller (once, when he first comes into view). */
  build(e) {
    const { ctx } = this;
    const mii = new MiiModel(structuredClone(miiFor('seller', e.cand)));
    mii.group.scale.setScalar(MII_SCALE);
    ctx.shadowsOn(mii.group, false);
    e.mii = mii;
    e.stand = buildStand();
    ctx.shadowsOn(e.stand);
    e.tag = buildTag();
    e.tag.position.y = 2.45;
    e.group.add(mii.group, e.tag);
    ctx.scene.add(e.stand);
    this.setTag(e);
    e.stand.userData.set(e.state ? S.stockCount(e.state) / STOCK_MAX : 0);
  }

  sync() {
    const sellers = handelState(this.ctx.game).sellers;
    const count = {};
    const present = new Set();
    for (const s of sellers) {
      present.add(s.id);
      const e = this.ensure(s);
      const place = this.where(s);
      const slot = place ? (count[place] = (count[place] ?? -1) + 1) : 0;
      if (place !== e.place || slot !== e.slot) {
        e.place = place;
        e.slot = slot;
        e.reset = true;
      }
      e.state = s;
    }
    for (const id of [...this.entries.keys()]) if (!present.has(id)) this.remove(id);
  }

  setTag(e) {
    const s = e.state;
    if (!s || !e.tag) return;
    const carry = S.stockCount(s);
    const need = S.needs(this.ctx.game, s);
    let sub = '';
    let warn = false;
    if (!s.zone) sub = 'wacht op jou';
    else if (need.includes('leeg')) (sub = '⚠ voorraad op'), (warn = true);
    else if (need.includes('vol')) (sub = '💰 zak vol'), (warn = true);
    else sub = s.pouch > 0 ? `💰 €${s.pouch}` : `${carry} stuks`;
    e.tag.userData.set(e.cand.name, sub, warn);
  }

  update(t, dt, paused) {
    this.syncT -= dt;
    const doSync = this.syncT <= 0;
    if (doSync) {
      this.syncT = 0.5;
      this.sync();
    }
    const p = this.ctx.player.pos;
    let built = 0;
    for (const e of this.entries.values()) {
      if (!e.place) {
        this.hide(e);
        continue;
      }
      const home = this.home(e.place, e.slot);
      e.near = Math.hypot(home.x - p.x, home.z - p.z) < NEAR;
      if (!e.near) {
        this.hide(e);
        continue;
      }
      if (!e.mii) {
        if (built++) continue; // at most one new Mii per frame
        this.build(e);
      }
      if (e.reset) this.rehome(e, home);
      if (!e.shown) {
        e.group.visible = true;
        e.shown = true;
      }
      e.stand.visible = e.place !== 'hut';
      if (!paused) this.walk(e, dt, p);
      this.pose(e, t, dt);
      if (doSync) {
        this.setTag(e);
        e.stand.userData.set(e.state ? S.stockCount(e.state) / STOCK_MAX : 0);
      }
      const dist = Math.hypot(e.x - p.x, e.z - p.z);
      e.tag.visible = dist < 40;
      e.item.x = e.x;
      e.item.z = e.z;
    }
    this.popups.update(dt);
  }

  hide(e) {
    if (!e.shown && !e.group.visible) return;
    e.shown = false;
    e.group.visible = false;
    if (e.stand) e.stand.visible = false;
  }

  /** Puts him at his place (he starts a new shift or his route changed). */
  rehome(e, home) {
    e.reset = false;
    e.hx = home.x;
    e.hz = home.z;
    e.x = home.x + 1.8;
    e.z = home.z + 1.2;
    e.target = this.pick(e);
    e.wait = 0.5 + Math.random() * 2;
    e.heading = Math.random() * 6.28;
    e.stand.position.set(home.x, home.y - 0.05, home.z);
    e.stand.rotation.y = 0.35 + e.slot * 0.5;
  }

  /** A new spot to walk to, 1.8 to 3.8 m from home. */
  pick(e) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.8 + Math.random() * 2;
      const x = e.hx + Math.cos(a) * r;
      const z = e.hz + Math.sin(a) * r;
      if (isFree(this.ctx, x, z, PICK_OPTS)) return { x, z };
    }
    return { x: e.hx + 1.8, z: e.hz + 1.2 };
  }

  walk(e, dt, playerPos) {
    const toPlayer = Math.hypot(playerPos.x - e.x, playerPos.z - e.z);
    if (e.wait > 0) {
      e.wait -= dt;
      e.speed *= Math.max(0, 1 - dt * 8);
      if (toPlayer < 6) e.heading = turnTo(e.heading, Math.atan2(playerPos.x - e.x, playerPos.z - e.z), dt * 5);
      return;
    }
    const dx = e.target.x - e.x;
    const dz = e.target.z - e.z;
    if (Math.hypot(dx, dz) < 0.35) {
      e.wait = 2 + Math.random() * 4;
      e.target = this.pick(e);
      return;
    }
    e.heading = turnTo(e.heading, Math.atan2(dx, dz), dt * 6);
    e.speed += (WALK - e.speed) * Math.min(1, dt * 6);
    const nx = e.x + Math.sin(e.heading) * e.speed * dt;
    const nz = e.z + Math.cos(e.heading) * e.speed * dt;
    if (isFree(this.ctx, nx, nz, STEP_OPTS)) [e.x, e.z] = [nx, nz];
    else e.target = this.pick(e);
  }

  pose(e, t, dt) {
    const y = this.ctx.heightAt(e.x, e.z);
    e.group.position.set(e.x, y, e.z);
    e.mii.group.rotation.y = e.heading;
    const parts = e.mii.parts;
    if (!parts) return;
    const f = Math.min(1, e.speed / WALK);
    if (f > 0.05) {
      e.phase += dt * (6 + e.speed * 1.1);
      const s = Math.sin(e.phase);
      parts.legL.rotation.x = s * 0.5 * f;
      parts.legR.rotation.x = -s * 0.5 * f;
      parts.armL.rotation.x = -s * 0.45 * f;
      parts.armR.rotation.x = s * 0.45 * f;
      e.mii.group.position.y = Math.abs(Math.cos(e.phase)) * 0.04 * f;
    } else {
      parts.legL.rotation.x = parts.legR.rotation.x = 0;
      e.mii.group.position.y = 0;
      e.mii.idle(t + e.cand.num);
    }
  }

  /** A floating text above a seller ("+€18"), if he is in view. */
  popup(id, text, color) {
    const e = this.entries.get(id);
    if (!e?.shown) return;
    const jitter = (this.popupN = (this.popupN ?? 0) + 1) % 5;
    this.popups.show(e.x + (jitter - 2) * 0.22, this.ctx.heightAt(e.x, e.z) + 3.1 + jitter * 0.55, e.z, text, color);
  }

  isShown(id) {
    return !!this.entries.get(id)?.shown;
  }

  /** A seller was caught: a puff of white and he is gone. */
  vanish(id) {
    const e = this.entries.get(id);
    if (e?.shown) this.ctx.fx.burst({ x: e.x, y: this.ctx.heightAt(e.x, e.z) + 1, z: e.z }, 28, { color: '#ffffff', spread: 2.4, up: 3.2, life: 0.9, gravity: 4 });
    this.remove(id);
  }

  /** How many guards (0..2) are close to where the sellers of a route stand. */
  guardsNear(zone) {
    const a = this.anchors[zone];
    if (!a) return 0;
    let n = 0;
    for (const g of this.ctx.guards.list) if ((g.x - a.x) ** 2 + (g.z - a.z) ** 2 < 18 * 18) n++;
    return Math.min(2, n);
  }

  talk(id) {
    const { game, h, modal, toast } = this.ctx;
    const c = candidateById(id);
    const cheered = S.meet(game, id);
    let dlg = null;
    const body = h('div', { class: 'hd-modal-body' }, sellerPanel(game, id, { inPerson: true, toast, onGone: () => dlg?.close(), onChange: () => this.sync() }));
    dlg = modal({ title: `Praten met ${c.name}`, body, actions: [{ label: 'Klaar', kind: 'primary' }] });
    if (cheered) toast(`${c.name} is blij dat je even langskomt.`);
  }

  remove(id) {
    const e = this.entries.get(id);
    if (!e) return;
    const { scene, interactions } = this.ctx;
    scene.remove(e.group);
    if (e.stand) {
      scene.remove(e.stand);
      e.stand.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    if (e.tag) {
      e.tag.material.map.dispose();
      e.tag.material.dispose();
    }
    e.mii?.dispose();
    const i = interactions.items.indexOf(e.item);
    if (i >= 0) interactions.items.splice(i, 1);
    this.entries.delete(id);
  }

  dispose() {
    for (const id of [...this.entries.keys()]) this.remove(id);
    this.popups.dispose();
  }
}

function turnTo(from, to, k) {
  let d = to - from;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return from + d * Math.min(1, k);
}
