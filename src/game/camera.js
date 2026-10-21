// Third-person camera behind the player: drag to look around, zoom in and out. It trails the
// player smoothly and never dips under the ground. It also backs off when a house, palm or
// rock stands between it and the player (so it never sits inside a wall), widens its view a
// little while running, and uses the sensitivity and Y-inversion from the settings.

import * as THREE from 'three';
import { heightAt } from './world/island.js';
import { SEA_LEVEL } from './world/zones.js';
import { clipDistance } from './uiterlijk/collide.js';

const RUN_FOV = 7; // extra degrees of view at full run
const RUN_SPEED = 4.5; // player speed where the FOV starts to widen

export class FollowCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.2;
    this.dist = 7;
    this.shown = this.dist; // the distance actually used (shorter when a wall is in the way)
    this.focus = new THREE.Vector3();
    this.idle = 0;
    this.colliders = []; // houses, palms and rocks (props.colliders), set by the screen
    this.sensitivity = 1; // from the settings
    this.invertY = false;
    this.baseFov = camera.fov;
    this.fov = camera.fov;
  }

  look(dx, dy) {
    this.yaw -= dx * 0.006 * this.sensitivity;
    const flip = this.invertY ? -1 : 1;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.004 * this.sensitivity * flip, -0.15, 1.3);
    this.idle = 0;
  }

  zoom(f) {
    this.dist = THREE.MathUtils.clamp(this.dist * f, 3.5, 40);
  }

  /** Jumps straight to the player (no glide), e.g. right after loading. */
  snap(player) {
    this.focus.copy(player.group.position);
    this.focus.y += 1.4;
    this.shown = this.dist;
    this.update(player, { x: 0, y: 0 }, 0);
  }

  /** Follows player (a Player); when walking on (not back towards it) it swings slowly round behind it. */
  update(player, move, dt) {
    this.idle += dt;
    if (player.speed > 0.5 && this.idle > 1.5 && move.y > 0.3) {
      let d = player.heading + Math.PI - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 1.2) * Math.min(1, player.speed / 4);
    }
    // Standing still for a while: the view eases back to its usual height.
    if (this.idle > 4 && player.speed < 0.05) {
      this.pitch += (0.2 - this.pitch) * Math.min(1, dt * 0.4);
    }
    const target = player.group.position.clone();
    target.y += 1.4;
    this.focus.lerp(target, Math.min(1, dt * 8));

    const cp = Math.cos(this.pitch);
    const sx = Math.sin(this.yaw);
    const sz = Math.cos(this.yaw);
    // A wall in the way pulls the camera in at once; it eases back out slowly.
    // Never closer than a head's length: a wall right behind the player gives a close-up, not a view from inside.
    const clip = Math.max(0.8 * cp, clipDistance(this.focus, sx, sz, this.dist * cp, this.colliders)) / cp;
    const want = Math.min(this.dist, clip);
    this.shown += (want - this.shown) * Math.min(1, dt * (want < this.shown ? 18 : 3));

    const cam = this.camera.position;
    cam.set(sx * cp, Math.sin(this.pitch), sz * cp).multiplyScalar(this.shown).add(this.focus);
    const floor = Math.max(heightAt(cam.x, cam.z), SEA_LEVEL) + 0.6;
    if (cam.y < floor) cam.y = floor;
    // Look a little above the head, so the view shows the island rather than the ground.
    this.camera.lookAt(this.focus.x, this.focus.y + 0.6, this.focus.z);

    // Running widens the view a little, which gives a sense of speed.
    const runAmount = Math.min(1, Math.max(0, (player.speed - RUN_SPEED) / 4));
    const fovWant = this.baseFov + RUN_FOV * runAmount;
    this.fov += (fovWant - this.fov) * Math.min(1, dt * 4);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
