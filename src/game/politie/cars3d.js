// The police cars on the island: patrol cars drive the roads back and forth from heat level 3 (two at
// level 4), each one stops at the checkpoint near Havenstad. From level 4 a roadblock stands across
// the road (two parked cars and a barrier, which blocks the way like a prop). Logic in cars.js and
// route.js; this file only moves the meshes and calls back into the feature.

import * as THREE from 'three';
import { buildPoliceCar, setLights } from './visuals/carMesh.js';
import { buildBarrier, buildCheckpoint } from './visuals/station.js';
import { makeRoute, along, routeAt, driveCar, crossed } from './route.js';
import { CAR_SPEED, CHECKPOINT_STOP, SIREN_RANGE, carsFor, roadblockFor } from './cars.js';

const BLOCK_R = 3.4;
const POOL = 2;
const RESET_FAR = 60; // metres away from the checkpoint before a car may be checked again

export class PoliceCars {
  /**
   * lines: road polylines the cars drive. checkpoint and roadblock: { line, seg, f } (which road,
   * which segment, how far along it). heightAt(x, z). colliders: the props list (the roadblock adds one
   * collider while it stands). Callbacks: onCheckpoint(car), onRoadblock(), onSiren(distance).
   */
  constructor(scene, { lines, checkpoint, roadblock, heightAt, colliders, onCheckpoint = () => {}, onRoadblock = () => {}, onSiren = () => {} }) {
    this.scene = scene;
    this.heightAt = heightAt;
    this.colliders = colliders;
    this.onCheckpoint = onCheckpoint;
    this.onRoadblock = onRoadblock;
    this.onSiren = onSiren;
    this.routes = lines.map(makeRoute);
    const cpRoute = this.routes[checkpoint.line];
    this.cpRoute = cpRoute;
    this.cpS = along(cpRoute, checkpoint.seg, checkpoint.f);
    this.cpPos = routeAt(cpRoute, this.cpS);
    const rbRoute = this.routes[roadblock.line];
    this.rbPos = routeAt(rbRoute, along(rbRoute, roadblock.seg, roadblock.f));

    this.cars = [];
    for (let i = 0; i < POOL; i++) {
      const built = buildPoliceCar();
      built.group.visible = false;
      scene.add(built.group);
      const route = this.routes[i % this.routes.length];
      this.cars.push({ car: built, route, s: route.total * (0.2 + 0.5 * i), dir: i % 2 ? -1 : 1, stop: 0, checked: false });
    }

    // The checkpoint: the barrier arm across the road and the booth beside it.
    const cp = this.cpPos;
    this.checkpoint = buildCheckpoint();
    this.checkpoint.position.set(cp.x, heightAt(cp.x, cp.z), cp.z);
    this.checkpoint.rotation.y = cp.heading;
    scene.add(this.checkpoint);

    // The roadblock: two cars across the road, a barrier in front, one collider in the middle.
    this.block = new THREE.Group();
    this.block.visible = false;
    this.parked = [];
    const { x, z, heading } = this.rbPos;
    const px = Math.sin(heading);
    const pz = Math.cos(heading);
    const across = heading + Math.PI / 2;
    for (const [d, rot] of [[0, across], [3.6, across + 0.12]]) {
      const parked = buildPoliceCar();
      parked.group.position.set(x + px * d, heightAt(x + px * d, z + pz * d), z + pz * d);
      parked.group.rotation.y = rot;
      this.block.add(parked.group);
      this.parked.push(parked);
    }
    const barrier = buildBarrier();
    barrier.position.set(x - px * 6.5, heightAt(x - px * 6.5, z - pz * 6.5) + 0.05, z - pz * 6.5);
    barrier.rotation.y = heading;
    this.block.add(barrier);
    scene.add(this.block);
    this.blockCollider = { x, z, r: BLOCK_R };
    this.blockOn = false;
    this.sirenT = 0;
    this.sirenStep = 0;
  }

  /** One frame: cars move, checkpoints stop them, the roadblock goes up or down. pos: the player's position. */
  update(dt, t, pos, level) {
    const want = carsFor(level);
    let nearest = Infinity;
    const tmp = this.tmp ?? (this.tmp = { x: 0, z: 0, heading: 0 });
    this.cars.forEach((c, i) => {
      const on = i < want;
      if (c.car.group.visible !== on) c.car.group.visible = on;
      if (!on) return;
      const prevS = c.s;
      if (c.stop > 0) c.stop -= dt;
      else driveCar(c, c.route, dt, CAR_SPEED);
      const onCp = c.route === this.cpRoute;
      if (onCp && !c.checked && crossed(prevS, c.s, this.cpS)) {
        c.checked = true;
        c.stop = CHECKPOINT_STOP;
        this.onCheckpoint(c);
      }
      if (onCp && Math.abs(c.s - this.cpS) > RESET_FAR) c.checked = false;
      routeAt(c.route, c.s, tmp);
      c.car.group.position.set(tmp.x, this.heightAt(tmp.x, tmp.z) + 0.05, tmp.z);
      c.car.group.rotation.y = c.dir > 0 ? tmp.heading : tmp.heading + Math.PI;
      setLights(c.car, t, true);
      nearest = Math.min(nearest, Math.hypot(tmp.x - pos.x, tmp.z - pos.z));
    });

    if (this.blockOn) for (const p of this.parked) setLights(p, t, true);
    const block = roadblockFor(level);
    if (block && !this.blockOn && Math.hypot(this.blockCollider.x - pos.x, this.blockCollider.z - pos.z) > BLOCK_R + 5) {
      this.blockOn = true;
      this.block.visible = true;
      this.colliders.push(this.blockCollider);
      this.onRoadblock();
    } else if (!block && this.blockOn) {
      this.blockOn = false;
      this.block.visible = false;
      const i = this.colliders.indexOf(this.blockCollider);
      if (i >= 0) this.colliders.splice(i, 1);
    }

    this.sirenT -= dt;
    if (nearest < SIREN_RANGE && this.sirenT <= 0) {
      this.sirenT = 0.5;
      this.onSiren(nearest);
    }
  }

  dispose() {
    if (this.blockOn) {
      const i = this.colliders.indexOf(this.blockCollider);
      if (i >= 0) this.colliders.splice(i, 1);
      this.blockOn = false;
    }
    for (const c of this.cars) this.scene.remove(c.car.group);
    this.scene.remove(this.block);
    this.scene.remove(this.checkpoint);
  }
}
