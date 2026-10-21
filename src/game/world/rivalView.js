// Today's rival standing at their spot, walking about it (and now and then over to the other
// spot, see rivals.js moveRival), and the talk with them. The politie feature adds their taunts.

import { shadowsOn } from './render.js';
import { MiiModel } from '../../mii/model.js';
import { OFFICIAL_MIIS } from '../../mii/official.js';
import { h, modal, toast } from '../../ui/dom.js';
import { MII_SCALE } from '../player.js';
import { RIVALS } from '../data/rivals.js';
import { bribe, tipOff, moveRival, RIVAL_FACTOR } from '../rivals.js';
import { heightAt } from './island.js';

const WALK = 4.5; // metres the rival strolls around the spot
const SPEED = 0.9; // metres per second

export class RivalView {
  constructor(scene, game, spots, interactions) {
    this.scene = scene;
    this.game = game;
    this.spots = spots;
    this.mii = null;
    this.walk = null; // { x, z, tx, tz, home, wait, phase, heading, moving }
    this.shownId = null;
    this.lastT = 0;
    this.hour = null;
    this.item = interactions.add({ x: 0, z: 0, r: 3.5, label: 'Rivaal', enabled: () => !!this.mii, run: () => this.talk() });
    this.off = game.on('change', () => this.refresh());
    this.refresh();
  }

  refresh() {
    const r = this.game.state.rival;
    const key = r ? `${r.id}@${r.spot}` : null;
    if (key === this.shownId) return;
    if (this.mii) {
      this.scene.remove(this.mii.group);
      this.mii.dispose();
      this.mii = null;
    }
    this.shownId = key;
    if (!r) {
      this.walk = null;
      return;
    }
    const rival = RIVALS.find((x) => x.id === r.id);
    const base = this.spots[r.spot];
    const x = base.x - 5;
    const z = base.z - 3;
    this.mii = new MiiModel(structuredClone(OFFICIAL_MIIS.find((m) => m.name === rival.mii)));
    this.mii.group.scale.setScalar(MII_SCALE);
    this.mii.group.position.set(x, heightAt(x, z), z);
    shadowsOn(this.mii.group, false);
    this.scene.add(this.mii.group);
    this.walk = { x, z, tx: x, tz: z, home: { x, z }, wait: 1, phase: 0, heading: 0, moving: 0 };
    Object.assign(this.item, { x, z, label: `Praat met ${rival.name}` });
  }

  /** A new target on dry land near the spot, for the stroll. */
  pickTarget(w) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * WALK;
      const x = w.home.x + Math.cos(a) * d;
      const z = w.home.z + Math.sin(a) * d;
      if (heightAt(x, z) > 0.6) {
        w.tx = x;
        w.tz = z;
        return;
      }
    }
    w.tx = w.home.x;
    w.tz = w.home.z;
  }

  update(t) {
    const dt = Math.min(0.1, Math.max(0, t - this.lastT));
    this.lastT = t;
    if (!this.mii || !this.walk) return;
    const paused = !!document.querySelector('.modal-backdrop, .minigame, .fullmap-wrap:not([hidden])');
    const w = this.walk;
    if (!paused) {
      // Once an hour the rival may walk over to the other spot.
      const hr = Math.floor(this.game.hour);
      if (this.hour === null) this.hour = hr;
      else if (hr !== this.hour) {
        this.hour = hr;
        const name = RIVALS.find((x) => x.id === this.game.state.rival?.id)?.name;
        const spot = moveRival(this.game);
        if (spot && name) toast(`${name} loopt over naar ${spot === 'strand' ? 'het strand' : 'de markt'}. Daar betalen klanten nu minder.`);
        return;
      }
      if (w.wait > 0) {
        w.wait -= dt;
        w.moving = 0;
      } else {
        const dx = w.tx - w.x;
        const dz = w.tz - w.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.3) {
          w.wait = 2 + Math.random() * 4;
          this.pickTarget(w);
          w.moving = 0;
        } else {
          const step = Math.min(d, SPEED * dt);
          w.x += (dx / d) * step;
          w.z += (dz / d) * step;
          w.heading = Math.atan2(dx, dz);
          w.moving = 1;
        }
      }
      w.phase += dt * 6 * w.moving;
      Object.assign(this.item, { x: w.x, z: w.z });
    }
    this.mii.idle(t);
    this.mii.group.position.set(w.x, heightAt(w.x, w.z), w.z);
    this.mii.group.rotation.y = w.heading;
    const sw = Math.sin(w.phase) * 0.5 * w.moving;
    const p = this.mii.parts;
    p.legL.rotation.x = sw;
    p.legR.rotation.x = -sw;
    if (w.moving) {
      p.armL.rotation.x = -sw;
      p.armR.rotation.x = sw;
    }
  }

  talk() {
    const r = RIVALS.find((x) => x.id === this.game.state.rival?.id);
    if (!r) return;
    modal({
      title: r.name,
      body: h('p', {}, `"Dit is vandaag mijn plek." Zolang ${r.name} hier staat, betalen klanten hier maar ${Math.round(RIVAL_FACTOR * 100)}%.`),
      actions: [
        { label: 'Weg' },
        { label: 'Verklikken bij de bewaking', onClick: () => (tipOff(this.game), toast(`${r.name} gaat ervandoor. De bewaking let nu ook op jou.`)) },
        { label: `Afkopen (€${r.bribe})`, kind: 'primary', onClick: () => toast(bribe(this.game) ? `${r.name} pakt het geld en vertrekt.` : 'Daar heb je niet genoeg geld voor.') },
      ],
    });
  }

  dispose() {
    this.off();
    this.mii?.dispose();
  }
}
