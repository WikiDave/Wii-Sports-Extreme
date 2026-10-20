// The island guards: Miis in blue that patrol between spots with a visible view cone. A
// guard that sees you carrying product grows suspicious and frisks you; at the highest
// level (Achtervolging) any guard that sees you gives chase. Hide in the hut or get out of
// sight to escape.

import * as THREE from 'three';
import { shadowsOn } from './render.js';
import { MiiModel } from '../../mii/model.js';
import { OFFICIAL_MIIS } from '../../mii/official.js';
import { MII_SCALE } from '../player.js';
import { heightAt } from './island.js';
import { GUARDS, MAX_LEVEL, heatLevel, carried, inCone, viewRange } from '../police.js';
import { viewFactor } from '../weather.js';

const LOOKS = ['Gast A', 'Gast B', 'Gast C', 'Gast D', 'Gast E', 'Gast F', 'Kentaro'];
const PATROL = 2.2;
const CHASE = 7.4; // a little slower than the player running (8.5)
const FOV = 0.95;
const LOSE_AFTER = 7; // seconds out of sight to escape a chase
const COLORS = { patrol: '#ffe14a', alert: '#ff9a2a', chase: '#ff3b2f' };

function coneMesh() {
  const geo = new THREE.CircleGeometry(1, 20, -Math.PI / 2 - FOV / 2, FOV);
  // Lay it flat; the fan then points along +z, the way the guard faces.
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: COLORS.patrol, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 2;
  return m;
}

export class Guards {
  /** centres: patrol points [{x,z}]; colliders as for the player. */
  constructor(scene, game, colliders, centres) {
    this.scene = scene;
    this.game = game;
    this.colliders = colliders;
    this.centres = centres;
    this.list = [];
    this.chasing = false;
    this.unseen = 0;
    this.sync();
  }

  free(x, z) {
    if (heightAt(x, z) < 0.4) return false;
    return this.colliders.every((c) => (x - c.x) ** 2 + (z - c.z) ** 2 > (c.r + 0.5) ** 2);
  }

  /** A random free waypoint near one of the patrol centres. */
  waypoint() {
    for (let i = 0; i < 30; i++) {
      const c = this.centres[Math.floor(Math.random() * this.centres.length)];
      const x = c.x + (Math.random() - 0.5) * 70;
      const z = c.z + (Math.random() - 0.5) * 70;
      if (this.free(x, z)) return { x, z };
    }
    return { ...this.centres[0] };
  }

  /** Matches the number of guards to the heat level. */
  sync() {
    const want = GUARDS[heatLevel(this.game.state)];
    while (this.list.length < want) {
      const data = structuredClone(OFFICIAL_MIIS.find((m) => m.name === LOOKS[this.list.length % LOOKS.length]));
      data.favoriteColor = 5; // blue uniform
      const mii = new MiiModel(data);
      mii.group.scale.setScalar(MII_SCALE);
      const start = this.waypoint();
      const cone = coneMesh();
      shadowsOn(mii.group, false);
      this.scene.add(mii.group, cone);
      this.list.push({ mii, cone, x: start.x, z: start.z, heading: 0, target: this.waypoint(), suspicion: 0, cooldown: 0, phase: Math.random() * 6, speed: 0 });
    }
    while (this.list.length > want) {
      const g = this.list.pop();
      this.scene.remove(g.mii.group, g.cone);
      g.mii.dispose();
      g.cone.geometry.dispose();
      g.cone.material.dispose();
    }
  }

  /** Whether any guard sees point p (for deals in plain sight). */
  sees(p) {
    const range = viewRange(heatLevel(this.game.state), viewFactor(this.game.state.day));
    return this.list.some((g) => inCone(g.x, g.z, g.heading, p.x, p.z, range, FOV));
  }

  /**
   * One frame. player: the Player. hidden(pos): true when the player is hiding (in the hut).
   * on: { frisk(), caught(), escaped(), chase() } callbacks.
   */
  update(dt, player, hidden, on) {
    const level = heatLevel(this.game.state);
    const range = viewRange(level, viewFactor(this.game.state.day));
    const p = player.pos;
    const hasGoods = carried(this.game.state) > 0;
    let seenNow = false;
    for (const g of this.list) {
      g.cooldown = Math.max(0, g.cooldown - dt);
      const sees = !hidden(p) && inCone(g.x, g.z, g.heading, p.x, p.z, this.chasing ? range * 1.5 : range, this.chasing ? FOV * 1.6 : FOV);
      if (sees) seenNow = true;
      if (!this.chasing && sees && level >= MAX_LEVEL) {
        this.chasing = true;
        this.unseen = 0;
        on.chase();
      }
      let tx = g.target.x;
      let tz = g.target.z;
      let speed = PATROL;
      if (this.chasing) {
        tx = p.x;
        tz = p.z;
        speed = CHASE;
      } else if (sees && hasGoods && level >= 1 && !g.cooldown) {
        // Suspicious: stop, look at the player, then come and frisk.
        g.suspicion = Math.min(1, g.suspicion + dt * (0.5 + 0.15 * level));
        tx = p.x;
        tz = p.z;
        speed = g.suspicion > 0.6 ? 4 : 0;
        if (g.suspicion >= 1 && Math.hypot(p.x - g.x, p.z - g.z) < 2.5) {
          g.suspicion = 0;
          g.cooldown = 45;
          on.frisk();
        }
      } else {
        g.suspicion = Math.max(0, g.suspicion - dt * 0.3);
      }
      // Walk towards the target.
      const dx = tx - g.x;
      const dz = tz - g.z;
      const d = Math.hypot(dx, dz);
      if (!this.chasing && d < 1.5 && !sees) g.target = this.waypoint();
      const want = Math.atan2(dx, dz);
      let turn = want - g.heading;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      g.heading += turn * Math.min(1, dt * (this.chasing ? 10 : 4));
      g.speed += (speed - g.speed) * Math.min(1, dt * 6);
      if (d > 0.8 && g.speed > 0.05) {
        const nx = g.x + Math.sin(g.heading) * g.speed * dt;
        const nz = g.z + Math.cos(g.heading) * g.speed * dt;
        if (this.free(nx, nz)) [g.x, g.z] = [nx, nz];
        else if (this.free(nx, g.z)) g.x = nx;
        else if (this.free(g.x, nz)) g.z = nz;
        else if (!this.chasing) g.target = this.waypoint();
      }
      if (this.chasing && Math.hypot(p.x - g.x, p.z - g.z) < 1.3) {
        this.chasing = false;
        on.caught();
        break;
      }
      this.pose(g, dt, level);
    }
    if (this.chasing) {
      this.unseen = seenNow ? 0 : this.unseen + dt;
      if (this.unseen > LOSE_AFTER || hidden(p)) {
        this.chasing = false;
        on.escaped();
      }
    }
    if (this.list.length !== GUARDS[heatLevel(this.game.state)]) this.sync();
  }

  pose(g, dt, level) {
    const y = heightAt(g.x, g.z);
    g.mii.group.position.set(g.x, y, g.z);
    g.mii.group.rotation.y = g.heading;
    const parts = g.mii.parts;
    const f = Math.min(1, g.speed / 4);
    g.phase += dt * (6 + g.speed * 1.1);
    const s = Math.sin(g.phase);
    parts.legL.rotation.x = s * 0.55 * f;
    parts.legR.rotation.x = -s * 0.55 * f;
    parts.armL.rotation.x = -s * 0.5 * f;
    parts.armR.rotation.x = s * 0.5 * f;
    g.mii.group.position.y += Math.abs(Math.cos(g.phase)) * 0.05 * f;
    const range = viewRange(level, viewFactor(this.game.state.day)) * (this.chasing ? 1.5 : 1);
    g.cone.position.set(g.x, y + 0.25, g.z);
    g.cone.rotation.y = g.heading;
    g.cone.scale.setScalar(range);
    g.cone.material.color.set(this.chasing ? COLORS.chase : g.suspicion > 0.05 ? COLORS.alert : COLORS.patrol);
  }

  dispose() {
    for (const g of this.list) {
      g.mii.dispose();
      g.cone.geometry.dispose();
      g.cone.material.dispose();
    }
  }
}
