// People of the new places: villagers chatting on the market square by day (they go home at
// night), skaters circling the skate park, and fishermen on the jetty. The Miis are the official
// ones (src/mii/official.js). They are made a few at a time, so the first frames do not stutter,
// and only the ones near the camera are shown.

import { newMii, placeMii } from '../interior/common.js';
import { nightLevel } from '../night.js';

const VILLAGERS = ['Keiko', 'Yoko', 'Miyu', 'Ai', 'Misaki', 'Sakura', 'Fumiko', 'Haru'];
const SHOW_DIST = 170;

export class Crowd {
  /** market: { x, y, z } centre of the square; skate/jetty: the parts from leisure.js; heightAt. */
  constructor(scene, { market, skate, jetty, heightAt }) {
    this.scene = scene;
    this.heightAt = heightAt;
    this.market = market;
    this.skate = skate;
    this.jetty = jetty;
    this.villagers = [];
    // Pairs chatting face to face round the square, each pair 0.6 m either side of its middle.
    const pairs = [
      { a: 0.4, r: 4.6 },
      { a: 2.6, r: 5.4 },
      { a: 4.6, r: 4.2 },
    ];
    let k = 0;
    for (const s of pairs) {
      const gx = market.x + Math.cos(s.a) * s.r;
      const gz = market.z + Math.sin(s.a) * s.r;
      const px = -Math.sin(s.a) * 0.6;
      const pz = Math.cos(s.a) * 0.6;
      // Person 0 stands on the -p side and looks towards +p; person 1 the other way round.
      const looks = [
        { x: gx - px, z: gz - pz, ry: Math.atan2(px, pz) },
        { x: gx + px, z: gz + pz, ry: Math.atan2(-px, -pz) },
      ];
      for (const L of looks) {
        this.villagers.push({ name: VILLAGERS[k % VILLAGERS.length], fav: (k * 5) % 12, x: L.x, z: L.z, ry: L.ry, phase: k * 1.7, model: null });
        k++;
      }
    }
    this.queue = this.villagers.slice();
    this.madeAt = 0;
    this.shown = true;
  }

  /** Makes the next few Miis (a couple per frame). */
  makeSome(n = 2) {
    for (let i = 0; i < n && this.queue.length; i++) {
      const v = this.queue.shift();
      v.model = newMii(v.name, v.fav);
      v.model.group.visible = false;
      this.scene.add(v.model.group);
    }
  }

  /** One frame: t seconds, the camera position, the game hour. */
  update(t, camera, hour) {
    this.makeSome(2);
    const night = nightLevel(hour);
    const day = night < 0.5;
    const cx = camera.x;
    const cz = camera.z;
    for (const v of this.villagers) {
      if (!v.model) continue;
      const near = (v.x - cx) ** 2 + (v.z - cz) ** 2 < SHOW_DIST * SHOW_DIST;
      const show = day && near;
      v.model.group.visible = show;
      if (!show) continue;
      const y = this.heightAt(v.x, v.z);
      // Chatting: a little turn of the head and a sway, out of step with the others.
      placeMii(v.model, v.x, y - 0.05, v.z, v.ry + Math.sin(t * 0.5 + v.phase) * 0.12);
      v.model.idle(t + v.phase);
    }
    // Skaters: they loop round the park, and the Mii turns with the way they go.
    if (this.skate?.skaters) {
      this.skate.skaters.forEach((s, k) => {
        const a = t * 0.55 + k * Math.PI;
        const { x, y, z } = this.skate.centre;
        const px = x + Math.cos(a) * 4.2;
        const pz = z + Math.sin(a) * 4.2;
        const near = (px - cx) ** 2 + (pz - cz) ** 2 < SHOW_DIST * SHOW_DIST;
        s.group.visible = near;
        if (!near) return;
        placeMii(s, px, y + 0.1 + Math.abs(Math.sin(t * 5 + k)) * 0.08, pz, a + Math.PI / 2);
      });
    }
    // Fishermen wait, a little idle; their floats bob on the water.
    if (this.jetty?.men) {
      const near = (this.jetty.end.x - cx) ** 2 + (this.jetty.end.z - cz) ** 2 < SHOW_DIST * SHOW_DIST;
      for (const m of this.jetty.men) {
        m.group.visible = near;
        if (near) m.idle(t);
      }
      this.jetty.floats.forEach((f, i) => (f.position.y = 0.05 + Math.sin(t * 2 + i) * 0.05));
    }
  }

  dispose() {
    for (const v of this.villagers) {
      if (!v.model) continue;
      this.scene.remove(v.model.group);
      v.model.dispose();
    }
  }
}
