// Customers standing in the world: a Mii at their spot while they are present and unserved.

import * as THREE from 'three';
import { MiiModel } from '../../mii/model.js';
import { OFFICIAL_MIIS } from '../../mii/official.js';
import { MII_SCALE } from '../player.js';
import { CUSTOMERS } from '../data/customers.js';
import { available } from '../customers.js';
import { heightAt } from './island.js';

export class CustomerView {
  /** spots: { strand: {x,z}, haven: {x,z} }, each a free place with room for a few customers. */
  constructor(scene, spots, interactions, game, onTalk) {
    this.scene = scene;
    this.game = game;
    this.minis = new Map();
    this.slots = {};
    this.spots = spots;
    this.interactions = interactions;
    for (const c of CUSTOMERS) {
      const n = (this.slots[c.spot] = (this.slots[c.spot] ?? 0) + 1) - 1;
      const base = spots[c.spot];
      c.pos = { x: base.x + (n % 3) * 2.2 - 2.2, z: base.z + Math.floor(n / 3) * 2.2 };
      interactions.add({ x: c.pos.x, z: c.pos.z, r: 3, label: `Praat met ${c.name}`, enabled: () => this.minis.has(c.id), run: () => onTalk(c) });
    }
    this.refresh();
    this.off = [game.on('time', () => this.refresh()), game.on('change', () => this.refresh())];
  }

  refresh() {
    const here = new Set(available(this.game.state, this.game.rank, this.game.hour).map((c) => c.id));
    for (const c of CUSTOMERS) {
      const shown = this.minis.has(c.id);
      if (here.has(c.id) && !shown) {
        const data = OFFICIAL_MIIS.find((m) => m.name === c.mii);
        const mii = new MiiModel(structuredClone(data));
        mii.group.scale.setScalar(MII_SCALE);
        mii.group.position.set(c.pos.x, heightAt(c.pos.x, c.pos.z), c.pos.z);
        mii.group.rotation.y = Math.PI * (0.8 + 0.4 * Math.random());
        this.scene.add(mii.group);
        this.minis.set(c.id, mii);
      } else if (!here.has(c.id) && shown) {
        const mii = this.minis.get(c.id);
        this.scene.remove(mii.group);
        mii.dispose();
        this.minis.delete(c.id);
      }
    }
  }

  /** Idle motion and turning towards the player. */
  update(t, playerPos) {
    for (const [id, mii] of this.minis) {
      mii.idle(t + id.length);
      const c = CUSTOMERS.find((x) => x.id === id);
      if (Math.hypot(c.pos.x - playerPos.x, c.pos.z - playerPos.z) < 8) mii.group.rotation.y = Math.atan2(playerPos.x - c.pos.x, playerPos.z - c.pos.z);
    }
  }

  dispose() {
    this.off.forEach((f) => f());
    for (const mii of this.minis.values()) mii.dispose();
  }
}
