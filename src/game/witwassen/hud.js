// The HUD chip with the dirty cash on you: hidden when you carry none, orange when your pockets bulge.

import { h } from '../../ui/dom.js';
import { dirtyHand } from './store.js';
import { bulge } from './carry.js';

/** Adds the chip to the HUD bar; returns { remove() }. */
export function addDirtyChip(bar, game) {
  const el = h('span', { class: 'wit-chip', hidden: true, title: 'Zwart geld op zak: was het bij een zaak of zet het op de pinautomaat' });
  bar.append(el);
  const update = () => {
    const d = dirtyHand(game);
    el.hidden = d <= 0;
    el.textContent = `🧾 ${d.toLocaleString('nl-NL')}`;
    el.classList.toggle('is-hot', bulge(d, game.rank) >= 0.7);
  };
  const off = game.on('change', update);
  update();
  return {
    remove() {
      off();
      el.remove();
    },
  };
}
