// The player's Mii on the island: walks and runs relative to the camera, follows the
// ground, stays out of the sea and out of houses, palms and rocks, and swings its arms
// and legs while it walks.

import * as THREE from 'three';
import { MiiModel } from '../mii/model.js';
import { heightAt } from './world/island.js';

/** Mii units to metres: a default Mii is about 1.75 m tall. */
export const MII_SCALE = 0.7;
const WALK = 4;
const RUN = 8.5;
const SHORE = 0.25; // lowest ground the Mii may stand on (just above the waterline)
const RADIUS = 0.45;

export class Player {
  constructor(mii, { x, z, colliders }) {
    this.mii = new MiiModel(mii);
    this.group = new THREE.Group();
    this.mii.group.scale.setScalar(MII_SCALE);
    this.group.add(this.mii.group);
    this.pos = new THREE.Vector3(x, heightAt(x, z), z);
    this.heading = Math.PI; // facing -z (north)
    this.speed = 0;
    this.phase = 0;
    this.colliders = colliders;
    this.blinkAt = 2;
    this.group.position.copy(this.pos);
  }

  /** Free spot test: dry land and no obstacle. */
  free(x, z) {
    if (heightAt(x, z) < SHORE) return false;
    for (const c of this.colliders) {
      const dx = x - c.x;
      const dz = z - c.z;
      const r = c.r + RADIUS;
      if (dx * dx + dz * dz < r * r) return false;
    }
    return true;
  }

  /**
   * One frame: move = input.move(), camYaw = the camera's heading (radians), dt in seconds.
   */
  update(move, camYaw, dt, t) {
    const amount = Math.min(1, Math.hypot(move.x, move.y));
    const target = amount > 0.05 ? (move.run ? RUN : WALK) * amount : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * 10);
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
      if (this.free(x + dx, z + dz)) this.pos.set(x + dx, 0, z + dz);
      else if (this.free(x + dx, z)) this.pos.set(x + dx, 0, z);
      else if (this.free(x, z + dz)) this.pos.set(x, 0, z + dz);
      else this.speed = 0;
    }
    this.pos.y = heightAt(this.pos.x, this.pos.z);
    this.group.position.lerp(this.pos, Math.min(1, dt * 20));
    this.group.position.x = this.pos.x;
    this.group.position.z = this.pos.z;
    this.group.rotation.y = this.heading;
    this.animate(dt, t);
  }

  animate(dt, t) {
    const p = this.mii.parts;
    const f = Math.min(1, this.speed / WALK);
    const run = Math.max(0, (this.speed - WALK) / (RUN - WALK));
    this.phase += dt * (6 + this.speed * 1.1);
    const s = Math.sin(this.phase);
    const legSwing = (0.5 + 0.25 * run) * f;
    const armSwing = (0.45 + 0.4 * run) * f;
    p.legL.rotation.x = s * legSwing;
    p.legR.rotation.x = -s * legSwing;
    p.armL.rotation.x = -s * armSwing;
    p.armR.rotation.x = s * armSwing;
    // Arms a little out to the sides, more when running.
    p.armL.rotation.z = 0.08 + 0.15 * run;
    p.armR.rotation.z = -0.08 - 0.15 * run;
    this.mii.group.position.y = Math.abs(Math.cos(this.phase)) * 0.08 * f;
    this.mii.group.rotation.x = 0.06 * f + 0.1 * run;
    if (f < 0.05) this.mii.idle(t);
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
