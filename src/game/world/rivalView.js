// Today's rival standing at their spot, and the talk with them.

import { shadowsOn } from './render.js';
import { MiiModel } from '../../mii/model.js';
import { OFFICIAL_MIIS } from '../../mii/official.js';
import { h, modal, toast } from '../../ui/dom.js';
import { MII_SCALE } from '../player.js';
import { RIVALS } from '../data/rivals.js';
import { bribe, tipOff, RIVAL_FACTOR } from '../rivals.js';
import { heightAt } from './island.js';

export class RivalView {
  constructor(scene, game, spots, interactions) {
    this.scene = scene;
    this.game = game;
    this.spots = spots;
    this.mii = null;
    this.shownId = null;
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
    if (!r) return;
    const rival = RIVALS.find((x) => x.id === r.id);
    const base = this.spots[r.spot];
    const x = base.x - 5;
    const z = base.z - 3;
    this.mii = new MiiModel(structuredClone(OFFICIAL_MIIS.find((m) => m.name === rival.mii)));
    this.mii.group.scale.setScalar(MII_SCALE);
    this.mii.group.position.set(x, heightAt(x, z), z);
    shadowsOn(this.mii.group, false);
    this.scene.add(this.mii.group);
    Object.assign(this.item, { x, z, label: `Praat met ${rival.name}` });
  }

  update(t) {
    this.mii?.idle(t);
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
