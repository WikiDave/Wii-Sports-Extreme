// Everyone on the island who is a Mii: villagers, customers, guards, sellers, fishermen, skaters.
// Each system moves its own Miis; this keeps them solid. Once a frame, after they moved, nobody
// may stand inside the player or inside another Mii: who walks into someone is pushed aside, and
// the player is stopped (Player.people). The same list gives the Mii nearest to the player for a
// chat (see island.js). The Miis are found by the tag MiiModel puts on its group.

import * as THREE from 'three';

export const BODY = 0.4; // a Mii's radius for bumping (the player's is 0.45, player.js)
const PLAYER_R = 0.45;
const NEAR = 40; // only Miis this close to the player take part
const RESCAN = 1; // seconds between two searches of the scene for Miis
const _w = new THREE.Vector3();

export class People {
  constructor(scene, player, heightAt) {
    this.scene = scene;
    this.player = player;
    this.heightAt = heightAt;
    this.all = [];
    this.near = []; // { m, x, y, z, r } this frame
    this.scanAt = 0;
  }

  /** Looks for the Miis in the scene again (they come and go: customers, guards at night). */
  scan() {
    this.all = [];
    this.scene.traverse((o) => {
      const m = o.userData.mii;
      if (m && m !== this.player.mii) this.all.push(m);
    });
  }

  /** Whether obj is drawn: it and all its parents are visible, up to the scene. */
  shown(obj) {
    for (let o = obj; o; o = o.parent) {
      if (!o.visible) return false;
      if (o === this.scene) return true;
    }
    return false;
  }

  /** One frame, after everyone moved: t seconds. */
  update(t) {
    if (t >= this.scanAt) {
      this.scan();
      this.scanAt = t + RESCAN;
    }
    const p = this.player.pos;
    this.near = [];
    for (const m of this.all) {
      if (!this.shown(m.group)) continue;
      m.group.getWorldPosition(_w);
      // Rooms far below the island, or a Mii on a roof: not where the player walks.
      if (Math.abs(_w.y - p.y) > 3) continue;
      if ((_w.x - p.x) ** 2 + (_w.z - p.z) ** 2 > NEAR * NEAR) continue;
      this.near.push({ m, x: _w.x, y: _w.y, z: _w.z, r: BODY, dx: 0, dz: 0 });
    }
    // Nobody inside the player: who walked into the player steps aside.
    for (const a of this.near) away(a, p.x, p.z, BODY + PLAYER_R, 1);
    // Nobody inside each other: both give way by half.
    for (let i = 0; i < this.near.length; i++) {
      for (let k = i + 1; k < this.near.length; k++) {
        const a = this.near[i];
        const b = this.near[k];
        const dx = a.x + a.dx - (b.x + b.dx);
        const dz = a.z + a.dz - (b.z + b.dz);
        const d = Math.hypot(dx, dz);
        const min = BODY * 2;
        if (d >= min) continue;
        const [ux, uz] = d > 1e-4 ? [dx / d, dz / d] : [Math.cos(i + k), Math.sin(i + k)];
        const push = (min - d) / 2;
        a.dx += ux * push;
        a.dz += uz * push;
        b.dx -= ux * push;
        b.dz -= uz * push;
      }
    }
    for (const a of this.near) if (a.dx || a.dz) this.shift(a);
  }

  /** Moves a Mii by its push (world metres), keeping it on the ground. */
  shift(a) {
    const g = a.m.group;
    const nx = a.x + a.dx;
    const nz = a.z + a.dz;
    let y = a.y;
    const was = this.heightAt(a.x, a.z);
    if (Math.abs(a.y - was) < 0.4) y += this.heightAt(nx, nz) - was; // walking on the terrain
    _w.set(nx, y, nz);
    if (g.parent !== this.scene) g.parent.worldToLocal(_w);
    g.position.copy(_w);
    a.x = nx;
    a.z = nz;
    a.dx = a.dz = 0;
  }

  /** The Mii nearest to (x, z) within reach, for a chat, or null. skip(entry) leaves some out. */
  nearest(x, z, reach, skip = () => false) {
    let best = null;
    let bestD = reach;
    for (const a of this.near) {
      const d = Math.hypot(a.x - x, a.z - z);
      if (d < bestD && !skip(a)) [best, bestD] = [a, d];
    }
    return best;
  }
}

/** Pushes entry a out of a circle of radius min round (x, z). */
function away(a, x, z, min, share) {
  const dx = a.x + a.dx - x;
  const dz = a.z + a.dz - z;
  const d = Math.hypot(dx, dz);
  if (d >= min) return;
  const [ux, uz] = d > 1e-4 ? [dx / d, dz / d] : [1, 0];
  a.dx += ux * (min - d) * share;
  a.dz += uz * (min - d) * share;
}
