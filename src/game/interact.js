// Things the player can use by walking up to them: a prompt shows the nearest one,
// E (or a tap on the prompt) runs it. Items are { x, z, r, label, run }.

import { h } from '../ui/dom.js';

export class Interactions {
  constructor(container) {
    this.items = [];
    this.current = null;
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
      const d = Math.hypot(it.x - pos.x, it.z - pos.z);
      if (d < it.r && d < bestD) [best, bestD] = [it, d];
    }
    if (best === this.current) return;
    this.current = best;
    this.button.hidden = !best;
    if (best) this.button.textContent = `E · ${best.label}`;
  }

  use() {
    if (this.current && !document.querySelector('.modal-backdrop')) this.current.run();
  }

  dispose() {
    window.removeEventListener('keydown', this.onKey);
  }
}
