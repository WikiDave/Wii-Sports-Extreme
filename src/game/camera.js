// Third-person camera behind the player: drag to look around, zoom in and out. It
// trails the player smoothly and never dips under the ground.

import * as THREE from 'three';
import { heightAt } from './world/island.js';
import { SEA_LEVEL } from './world/zones.js';

export class FollowCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.2;
    this.dist = 7;
    this.focus = new THREE.Vector3();
    this.idle = 0;
  }

  look(dx, dy) {
    this.yaw -= dx * 0.006;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.004, -0.15, 1.3);
    this.idle = 0;
  }

  zoom(f) {
    this.dist = THREE.MathUtils.clamp(this.dist * f, 3.5, 40);
  }

  /** Jumps straight to the player (no glide), e.g. right after loading. */
  snap(player) {
    this.focus.copy(player.group.position);
    this.focus.y += 1.4;
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
    const target = player.group.position.clone();
    target.y += 1.4;
    this.focus.lerp(target, Math.min(1, dt * 8));
    const cp = Math.cos(this.pitch);
    const cam = this.camera.position;
    cam.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp).multiplyScalar(this.dist).add(this.focus);
    const floor = Math.max(heightAt(cam.x, cam.z), SEA_LEVEL) + 0.6;
    if (cam.y < floor) cam.y = floor;
    // Look a little above the head, so the view shows the island rather than the ground.
    this.camera.lookAt(this.focus.x, this.focus.y + 0.6, this.focus.z);
  }
}
