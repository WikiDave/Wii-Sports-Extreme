// The player's Mii on the island: walks and runs relative to the camera, follows the
// ground, stays out of the sea and out of houses, palms and rocks, and swings its arms
// and legs while it walks.

import * as THREE from 'three';
import { MiiModel } from '../mii/model.js';
import { heightAt } from './world/island.js';
import { deckHeight } from './world/decks.js';

/** Mii units to metres: a default Mii is about 1.75 m tall. */
export const MII_SCALE = 0.7;
const WALK = 4;
const RUN = 8.5;
const SWIM = 2.8;
const SWIM_FAST = 4.8;
const GRAVITY = 24;
const JUMP = 8.2;
const RADIUS = 0.45;
const DEEPEST = -9; // the open sea: swimming stops here
const SWIM_IN = -1.0; // water this deep (ground below this) means swimming
const SWIM_OUT = -0.7;

export class Player {
  constructor(mii, { x, z, colliders }) {
    this.mii = new MiiModel(mii);
    this.group = new THREE.Group();
    this.mii.group.scale.setScalar(MII_SCALE);
    this.group.add(this.mii.group);
    this.pos = new THREE.Vector3(x, Math.max(0, heightAt(x, z)), z);
    this.heading = Math.PI; // facing -z (north)
    this.speed = 0;
    this.phase = 0;
    this.vy = 0;
    this.grounded = true;
    this.swimming = false;
    this.swimBlend = 0; // 0 walking .. 1 swimming, for the pose
    this.colliders = colliders;
    this.people = []; // the other Miis nearby, { x, z, r } (world/people.js sets this every frame)
    this.blinkAt = 2;
    this.fx = null; // Effects, set by the screen
    this.onStep = null; // (running) => void, for footstep sounds
    this.onSplash = null; // () => void
    this.lastStepSign = 1;
    // Hooks for features: external(move, camYaw, dt, t) takes over the Mii (a vehicle drives it),
    // deck(x, z) returns the height of a walkable deck (a jetty) or null.
    this.external = null;
    this.deck = null;
    this.group.position.copy(this.pos);
  }

  /** Walkable height at (x, z): a deck if there is one (a feature's, or a pier's), else the terrain. */
  groundAt(x, z) {
    const own = this.deck?.(x, z);
    if (own !== null && own !== undefined) return own;
    const pier = deckHeight(x, z, this.pos.y);
    const ground = heightAt(x, z);
    return pier === null ? ground : Math.max(pier, ground);
  }

  /** Free spot test: not out in the open sea, and no obstacle. */
  free(x, z) {
    if (heightAt(x, z) < DEEPEST) return false;
    for (const c of this.colliders) {
      if (c.top !== undefined && Math.abs(this.pos.y - c.top) > 2.5) continue; // a railing high above or far below
      const dx = x - c.x;
      const dz = z - c.z;
      const r = c.r + RADIUS;
      if (dx * dx + dz * dz < r * r) return false;
    }
    // Other Miis (world/people.js): no walking into them; stepping away from one is always fine.
    for (const c of this.people) {
      const dx = x - c.x;
      const dz = z - c.z;
      const r = c.r + RADIUS;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r && d2 < (this.pos.x - c.x) ** 2 + (this.pos.z - c.z) ** 2) return false;
    }
    return true;
  }

  /**
   * One frame: move = input.move() ({ x, y, run, jump }), camYaw = the camera's heading
   * (radians), dt in seconds.
   */
  update(move, camYaw, dt, t) {
    if (this.external) return this.external(move, camYaw, dt, t);
    const ground = this.groundAt(this.pos.x, this.pos.z);
    if (!this.swimming && ground < SWIM_IN && this.grounded) {
      this.swimming = true;
      this.fx?.splash({ x: this.pos.x, y: 0.1, z: this.pos.z }, 18);
      this.fx?.ripple(this.pos, 4);
      this.onSplash?.();
    } else if (this.swimming && ground > SWIM_OUT) {
      this.swimming = false;
    }
    const amount = Math.min(1, Math.hypot(move.x, move.y));
    const top = this.swimming ? (move.run ? SWIM_FAST : SWIM) : move.run ? RUN : WALK;
    const target = amount > 0.05 ? top * amount : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * (this.grounded || this.swimming ? 10 : 2.5));
    if (amount > 0.05) {
      // Forward is away from the camera.
      const want = camYaw + Math.atan2(-move.x, move.y) + Math.PI;
      let d = want - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * 12);
    }
    if (this.speed > 0.01) {
      const step = this.speed * dt;
      const dx = Math.sin(this.heading) * step;
      const dz = Math.cos(this.heading) * step;
      // Slide along obstacles: try the full step, then each axis.
      const { x, z } = this.pos;
      if (this.free(x + dx, z + dz)) [this.pos.x, this.pos.z] = [x + dx, z + dz];
      else if (this.free(x + dx, z)) this.pos.x = x + dx;
      else if (this.free(x, z + dz)) this.pos.z = z + dz;
      else this.speed = 0;
    }
    // Vertical: jump and fall on land, float in water.
    const gy = this.groundAt(this.pos.x, this.pos.z);
    if (this.swimming) {
      const floatY = -0.95 + Math.sin(t * 2.2) * 0.04;
      this.pos.y += (floatY - this.pos.y) * Math.min(1, dt * 9);
      this.vy = 0;
      this.grounded = true;
      if (move.jump && !this.diveCool) {
        this.fx?.splash({ x: this.pos.x, y: 0.1, z: this.pos.z }, 8);
        this.diveCool = 0.5;
      }
    } else {
      if (move.jump && this.grounded) {
        this.vy = JUMP;
        this.grounded = false;
      }
      const floorY = Math.max(0, gy);
      if (!this.grounded) {
        this.vy -= GRAVITY * dt;
        this.pos.y += this.vy * dt;
        if (this.pos.y <= floorY && this.vy < 0) {
          this.pos.y = floorY;
          this.vy = 0;
          this.grounded = true;
          this.fx?.dust(this.pos, true);
        }
      } else {
        // Follow the ground, wading through the shallows.
        const y = Math.max(gy, -0.7);
        this.pos.y += (y - this.pos.y) * Math.min(1, dt * 22);
        if (this.pos.y > floorY + 0.4 && gy < this.pos.y - 0.4) this.grounded = false; // walked off an edge
      }
    }
    if (this.diveCool) this.diveCool = Math.max(0, this.diveCool - dt);
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.heading;
    this.animate(dt, t, gy);
  }

  animate(dt, t, gy = 1) {
    const p = this.mii.parts;
    const f = Math.min(1, this.speed / WALK);
    const run = Math.max(0, (this.speed - WALK) / (RUN - WALK));
    const swimF = this.swimming ? Math.min(1, 0.45 + this.speed / SWIM_FAST) : 0;
    this.swimBlend += (swimF - this.swimBlend) * Math.min(1, dt * 8);
    const sw = this.swimBlend;
    this.phase += dt * (this.swimming ? 4 + this.speed * 1.4 : 6 + this.speed * 1.1);
    const s = Math.sin(this.phase);
    const air = this.grounded ? 0 : 1;
    // Walking and running
    let legL = s * (0.5 + 0.25 * run) * f;
    let legR = -legL;
    let armL = -s * (0.45 + 0.4 * run) * f;
    let armR = -armL;
    let armLz = 0.08 + 0.15 * run;
    let armRz = -armLz;
    if (air) {
      // In the air: arms up, legs tucked
      legL = 0.5;
      legR = -0.35;
      armL = armR = -2.6;
      armLz = 0.35;
      armRz = -0.35;
    }
    // Swimming: front crawl, arms circling overhead, legs fluttering
    if (sw > 0.01) {
      const c = this.phase * 0.9;
      const swimArmL = -2.4 + Math.sin(c) * 1.1;
      const swimArmR = -2.4 + Math.sin(c + Math.PI) * 1.1;
      const flutter = Math.sin(this.phase * 3) * 0.35;
      legL += (flutter - legL) * sw;
      legR += (-flutter - legR) * sw;
      armL += (swimArmL - armL) * sw;
      armR += (swimArmR - armR) * sw;
      armLz += (0.15 - armLz) * sw;
      armRz += (-0.15 - armRz) * sw;
    }
    p.legL.rotation.x = legL;
    p.legR.rotation.x = legR;
    p.armL.rotation.x = armL;
    p.armR.rotation.x = armR;
    p.armL.rotation.z = armLz;
    p.armR.rotation.z = armRz;
    // Body: bounce while walking, lean while running, lie flat in the water
    const bounce = this.swimming || air ? 0 : Math.abs(Math.cos(this.phase)) * 0.08 * f;
    this.mii.group.position.y = bounce + sw * 0.15;
    this.mii.group.rotation.x = (0.06 * f + 0.1 * run) * (1 - sw) + sw * 1.2 + air * -0.1;
    this.mii.headPivot.rotation.x = -sw * 0.95; // keep looking ahead
    if (f < 0.05 && !this.swimming && !air) this.mii.idle(t);
    // Footsteps, dust and splashes
    const sign = Math.sign(s) || 1;
    if (sign !== this.lastStepSign) {
      this.lastStepSign = sign;
      if (!this.swimming && this.grounded && this.speed > 1.5) {
        if (gy > -0.1) {
          this.fx?.dust(this.pos, this.speed > WALK + 0.5);
          this.onStep?.(this.speed > WALK + 0.5, gy < 2.6);
        } else {
          this.fx?.splash({ x: this.pos.x, y: Math.max(gy, -0.5) + 0.1, z: this.pos.z }, 3);
          this.onSplash?.();
        }
      } else if (this.swimming && this.speed > 0.8) {
        this.fx?.ripple(this.pos, 2.4);
        this.fx?.splash({ x: this.pos.x, y: 0.05, z: this.pos.z }, 2);
      }
    }
    // Blink now and then.
    if (t > this.blinkAt) {
      this.mii.setBlink(true);
      if (t > this.blinkAt + 0.12) {
        this.mii.setBlink(false);
        this.blinkAt = t + 2 + Math.random() * 3;
      }
    }
  }

  dispose() {
    this.mii.dispose();
  }
}
