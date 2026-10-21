// Things the player can use by walking up to them: a prompt shows the nearest one,
// E (or a tap on the prompt) runs it. Items are { x, z, r, label, run, enabled? }.

import { h } from '../ui/dom.js';

export class Interactions {
  constructor(container) {
    this.items = [];
    this.current = null;
    // A touch screen has no E key to press, so the prompt says Tik (tap) there.
    this.touch = !!window.matchMedia?.('(pointer: coarse)').matches;
    this.button = h('button', { class: 'interact-btn', type: 'button', hidden: true, onClick: () => this.use() });
    container.append(this.button);
    this.onKey = (e) => {
      if (e.key.toLowerCase() === 'e' && !document.querySelector('.modal-backdrop')) this.use();
    };
    window.addEventListener('keydown', this.onKey);
  }

  add(item) {
    this.items.push(item);
    return item;
  }

  /** Picks the nearest item in reach of position pos and updates the prompt. */
  update(pos) {
    let best = null;
    let bestD = Infinity;
    for (const it of this.items) {
      if (it.enabled && !it.enabled()) continue;
      const d = Math.hypot(it.x - pos.x, it.z - pos.z);
      if (d < it.r && d < bestD) [best, bestD] = [it, d];
    }
    const text = best ? `${this.touch ? 'Tik' : 'E'} · ${best.label}` : '';
    if (best === this.current && (!best || this.button.textContent === text)) return;
    this.current = best;
    this.button.hidden = !best;
    if (best) this.button.textContent = text;
  }

  use() {
    if (this.current && !document.querySelector('.modal-backdrop')) this.current.run();
  }

  dispose() {
    window.removeEventListener('keydown', this.onKey);
  }
}
