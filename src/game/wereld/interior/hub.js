// The interior hub. Walking up to a door and pressing E fades the screen out, puts the Mii in a
// small furnished room far below the island (y = -1000, see INTERIOR_Y) and fades in again.
// While inside, the island is hidden (its objects are not drawn), the sun is off and the room's
// own lamps (up to three point lights) light it. The Mii is walked here (player.update is
// wrapped while inside), the camera stays behind the Mii and never leaves the room, and the
// room's items (the door out, the bed, the bar) join the interaction prompt.

import * as THREE from 'three';
import { heightAt } from '../../world/island.js';

export const INTERIOR_Y = -1000;
const BASE_X = -3000;
const BASE_Z = -3000;
const SLOT = 90; // metres between the rooms, so they never overlap
const WALK = 3.2;
const RUN = 5.6;
const FADE_MS = 380;
const MAX_CAM = 6.5;

export const FADE_CSS = `
.wereld-fade { position: absolute; inset: 0; background: #07050d; opacity: 0; pointer-events: none; transition: opacity 0.35s ease; z-index: 6; }
.wereld-fade.is-on { opacity: 1; pointer-events: auto; }
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Camera swings to try, in radians from the follow camera's yaw (0 = straight behind). */
const CAM_SWING = [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, Math.PI];

/**
 * The longest camera distance (up to maxD) along yaw from p at which the camera stands inside
 * the box b and not inside furniture (solids).
 */
function fitDistance(p, yaw, pitch, maxD, b, solids = []) {
  const sx = Math.sin(yaw) * Math.cos(pitch);
  const cz = Math.cos(yaw) * Math.cos(pitch);
  for (let d = maxD; d > 1.4; d -= 0.25) {
    const x = p.x + sx * d;
    const z = p.z + cz * d;
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
    if (solids.some((s) => x > s.x0 - 0.3 && x < s.x1 + 0.3 && z > s.z0 - 0.3 && z < s.z1 + 0.3)) continue;
    return d;
  }
  return 1.4;
}

export class InteriorHub {
  constructor(ctx) {
    this.ctx = ctx;
    this.regs = new Map();
    this.active = null;
    this.busy = false;
    this.saved = [];
    this.root = new THREE.Group();
    this.root.name = 'interiors';
    ctx.scene.add(this.root);
    // Three point lights for the rooms: the scene always has the same light count, so no shader
    // is rebuilt when the Mii goes in or out.
    this.lamps = [0, 1, 2].map(() => {
      const l = new THREE.PointLight('#ffffff', 0, 14, 1.3);
      ctx.scene.add(l);
      return l;
    });
    this.fadeEl = ctx.h('div', { class: 'wereld-fade', 'aria-hidden': 'true' });
    ctx.screen.append(this.fadeEl);
    ctx.addStyle(FADE_CSS);
    this.origWalk = ctx.player.update.bind(ctx.player);
    this.origAmbience = ctx.audio.setAmbience.bind(ctx.audio);
    ctx.player.update = (move, camYaw, dt, t) => (this.active ? this.walk(move, camYaw, dt, t) : this.origWalk(move, camYaw, dt, t));
    ctx.audio.setAmbience = (opts = {}) => this.origAmbience({ ...opts, nearSea: this.active ? 0 : opts.nearSea });
    this.keep = new Set([this.root, ctx.player.group]);
    // What the rooms may use: the game, the toast, the audio and leaving.
    this.env = { ctx, game: ctx.game, audio: ctx.audio, toast: ctx.toast, exit: () => this.exit() };
  }

  /** Registers a room: build(ctx, origin) returns its def (see rooms.js); door and out are island points. */
  register(id, { door, out, build, label }) {
    const origin = { x: BASE_X - this.regs.size * SLOT, y: INTERIOR_Y, z: BASE_Z };
    this.regs.set(id, { id, door, out, build, label, origin, def: null });
  }

  /** The interaction for an island door: E (or a tap) goes in. */
  doorItem(id) {
    const reg = this.regs.get(id);
    return {
      x: reg.door.x,
      z: reg.door.z,
      r: reg.door.r ?? 3,
      label: reg.label,
      run: () => this.enter(id),
      enabled: () => !this.active && !this.busy,
    };
  }

  /** Enters a room: fade out, build (first time), hide the island, move the Mii in, fade in. */
  async enter(id) {
    if (this.busy || this.active) return;
    const reg = this.regs.get(id);
    if (!reg) return;
    this.busy = true;
    const { ctx } = this;
    try {
      await this.fade(true);
      reg.def ??= reg.build(this.env, reg.origin);
      const def = reg.def;
      if (!def.group.parent) this.root.add(def.group);
      def.group.visible = true;
      this.hide();
      this.active = { id, reg, def };
      this.camOff = 0;
      ctx.scene.background = def.bg;
      this.addedItems = def.items;
      ctx.interactions.items.push(...def.items);
      def.lamps.forEach((L, i) => {
        const pl = this.lamps[i];
        pl.position.set(L.x, L.y, L.z);
        pl.color.set(L.color);
        pl.intensity = L.intensity;
        pl.distance = L.dist ?? 12;
      });
      for (let i = def.lamps.length; i < this.lamps.length; i++) this.lamps[i].intensity = 0;
      const p = ctx.player;
      p.pos.copy(def.spawn);
      p.heading = def.heading ?? 0;
      p.speed = 0;
      p.grounded = true;
      p.swimming = false;
      p.group.position.copy(p.pos);
      p.group.rotation.y = p.heading;
      def.onEnter?.();
    } catch (err) {
      console.error('Interior could not be opened', err);
      this.active = null;
      ctx.toast('Die ruimte is nog dicht.');
    }
    await this.fade(false);
    this.busy = false;
  }

  /** Leaves the room through its door: the Mii stands outside the door again. */
  async exit() {
    if (this.busy || !this.active) return;
    this.busy = true;
    const { ctx } = this;
    await this.fade(true);
    const { reg, def } = this.active;
    const gone = new Set(def.items);
    ctx.interactions.items = ctx.interactions.items.filter((i) => !gone.has(i));
    def.group.visible = false;
    this.show();
    this.lamps.forEach((l) => (l.intensity = 0));
    ctx.scene.background = null;
    ctx.sky.sun.intensity = this.sunSaved;
    ctx.sky.hemi.intensity = this.hemiSaved;
    const o = reg.out;
    const p = ctx.player;
    p.pos.set(o.x, Math.max(0, heightAt(o.x, o.z)), o.z);
    p.speed = 0;
    p.group.position.copy(p.pos);
    this.active = null;
    await this.fade(false);
    this.busy = false;
  }

  /** Once per frame, after the island's own frame: the room's light, the animation and the camera. */
  frame(camera, follow, t, dt, paused) {
    if (!this.active) return;
    const { def } = this.active;
    const { sky } = this.ctx;
    sky.sun.intensity = 0;
    sky.hemi.intensity = def.ambient;
    sky.hemi.color.copy(def.ambColor);
    sky.hemi.groundColor.copy(def.ambGround);
    if (!paused) def.update?.(t, dt);
    this.placeCamera(camera, follow, def, dt);
  }

  /**
   * The camera stays behind the Mii. In a tight room it swings round to a side (the offset is
   * smoothed) so it keeps a little distance; the controls turn with it (see walk).
   */
  placeCamera(camera, follow, def, dt) {
    const p = this.ctx.player.group.position;
    const pitch = Math.min(0.7, Math.max(-0.1, follow.pitch));
    const maxD = Math.min(follow.dist, def.camDist ?? MAX_CAM);
    const b = def.camBoundsAt ? def.camBoundsAt(p.x, p.z) : def.bounds;
    let best = 0;
    let bestD = -1;
    for (const off of CAM_SWING) {
      const d = fitDistance(p, follow.yaw + off, pitch, maxD, b, def.solids);
      if (d > bestD + 0.4 || (Math.abs(d - bestD) <= 0.4 && Math.abs(off) < Math.abs(best))) {
        best = off;
        bestD = d;
      }
    }
    this.camOff ??= 0;
    this.camOff += (best - this.camOff) * Math.min(1, dt * 3);
    const yaw = follow.yaw + this.camOff;
    const d = fitDistance(p, yaw, pitch, maxD, b, def.solids);
    const cp = Math.cos(pitch);
    const fy = p.y + 1.3;
    camera.position.set(p.x + Math.sin(yaw) * cp * d, fy + Math.sin(pitch) * d, p.z + Math.cos(yaw) * cp * d);
    camera.lookAt(p.x, fy - 0.1, p.z);
  }

  /** The Mii walks inside the room: the same controls as outside, but only the room is solid. */
  walk(move, camYaw, dt, t) {
    const p = this.ctx.player;
    const { def } = this.active;
    const amount = Math.min(1, Math.hypot(move.x, move.y));
    const target = amount > 0.05 ? (move.run ? RUN : WALK) * amount : 0;
    p.speed += (target - p.speed) * Math.min(1, dt * 10);
    if (amount > 0.05) {
      // Controls follow the camera as it is now (it may have swung to a side in a tight room).
      const want = camYaw + (this.camOff ?? 0) + Math.atan2(-move.x, move.y) + Math.PI;
      let d = want - p.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      p.heading += d * Math.min(1, dt * 12);
    }
    if (p.speed > 0.01) {
      const step = p.speed * dt;
      const dx = Math.sin(p.heading) * step;
      const dz = Math.cos(p.heading) * step;
      const { x, z } = p.pos;
      if (def.free(x + dx, z + dz)) {
        p.pos.x = x + dx;
        p.pos.z = z + dz;
      } else if (def.free(x + dx, z)) p.pos.x = x + dx;
      else if (def.free(x, z + dz)) p.pos.z = z + dz;
      else p.speed = 0;
    }
    p.pos.y = def.floorAt(p.pos.x, p.pos.z);
    p.grounded = true;
    p.swimming = false;
    p.vy = 0;
    p.group.position.copy(p.pos);
    p.group.rotation.y = p.heading;
    p.animate(dt, t, 0);
  }

  /** Hides everything of the island that is in the scene (lights stay: the light count must not change). */
  hide() {
    this.saved = [];
    for (const c of this.ctx.scene.children) {
      if (c.isLight || this.keep.has(c) || c.isCamera) continue;
      this.saved.push([c, c.visible]);
      c.visible = false;
    }
    this.sunSaved = this.ctx.sky.sun.intensity;
    this.hemiSaved = this.ctx.sky.hemi.intensity;
  }

  show() {
    for (const [c, v] of this.saved) c.visible = v;
    this.saved = [];
  }

  fade(on) {
    this.fadeEl.classList.toggle('is-on', on);
    return sleep(FADE_MS);
  }

  dispose() {
    if (this.active) {
      this.show();
      this.active = null;
    }
    this.ctx.player.update = this.origWalk;
    this.ctx.audio.setAmbience = this.origAmbience;
    this.ctx.scene.background = null;
    this.lamps.forEach((l) => this.ctx.scene.remove(l));
    this.ctx.scene.remove(this.root);
    this.fadeEl.remove();
  }
}
