// Speech bubbles and name tags above the customers' heads: little DOM elements that follow a
// point in the 3D world. At most a few at once, reused; the layer never takes taps.

import * as THREE from 'three';

const MAX_BUBBLES = 4;
const MAX_TAGS = 3;

export class Bubbles {
  constructor(parent, camera, h) {
    this.camera = camera;
    this.h = h;
    this.layer = h('div', { class: 'kl-layer', 'aria-hidden': 'true' });
    parent.append(this.layer);
    this.items = []; // { id, el, until }
    this.tags = Array.from({ length: MAX_TAGS }, () => ({ id: null, el: h('div', { class: 'kl-tag' }) }));
    this.layer.append(...this.tags.map((t) => t.el));
    this.v = new THREE.Vector3();
    this.pos = { x: 0, y: 0, z: 0 };
    this.w = 1;
    this.hgt = 1;
    this.now = 0;
    this.ro = new ResizeObserver(() => {
      this.w = this.layer.clientWidth || 1;
      this.hgt = this.layer.clientHeight || 1;
    });
    this.ro.observe(this.layer);
  }

  /** A bubble over the customer `id` (replaces their last one). */
  say(id, name, text, { ms = 4200 } = {}) {
    const old = this.items.findIndex((b) => b.id === id);
    if (old >= 0) this.drop(old);
    while (this.items.length >= MAX_BUBBLES) this.drop(0);
    const el = this.h('div', { class: 'kl-bubble' }, this.h('b', { class: 'kl-bubble-name' }, name), this.h('span', {}, text));
    this.layer.append(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    this.items.push({ id, el, until: this.now + ms / 1000 });
  }

  drop(i) {
    const [b] = this.items.splice(i, 1);
    b.el.remove();
  }

  /** The name tags: entries are customers { c, tag, flag }, nearest first. */
  setTags(entries) {
    for (let i = 0; i < MAX_TAGS; i++) {
      const t = this.tags[i];
      const e = entries[i];
      if (!e) {
        t.id = null;
        continue;
      }
      if (t.id !== e.c.id || t.text !== e.tag + e.flag) {
        t.id = e.c.id;
        t.text = e.tag + e.flag;
        t.el.textContent = e.flag ? `${e.tag} ${e.flag}` : e.tag;
      }
    }
  }

  /** Moves everything to its place on screen. anchor(id, out) fills out {x, y, z}; false when out of sight. */
  update(dt, anchor, hidden = false) {
    this.now += dt;
    this.camera.updateMatrixWorld();
    for (let i = this.items.length - 1; i >= 0; i--) {
      const b = this.items[i];
      if (this.now > b.until || !anchor(b.id, this.pos)) {
        if (this.now > b.until) b.el.classList.remove('is-in');
        if (this.now > b.until + 0.3) this.drop(i);
        else if (this.now <= b.until) b.el.style.opacity = '0';
        continue;
      }
      this.place(b.el, 0.55);
    }
    for (const t of this.tags) {
      const live = t.id && !hidden && anchor(t.id, this.pos) && !this.items.some((b) => b.id === t.id);
      if (!live) {
        t.el.style.opacity = '0';
        continue;
      }
      if (this.place(t.el, 0.15)) t.el.style.opacity = '1';
      else t.el.style.opacity = '0';
    }
  }

  /** Puts el above this.pos (lift metres higher); false when behind the camera. */
  place(el, lift) {
    this.v.set(this.pos.x, this.pos.y + lift, this.pos.z).project(this.camera);
    if (this.v.z > 1 || this.v.z < -1) {
      el.style.visibility = 'hidden';
      return false;
    }
    el.style.visibility = 'visible';
    const x = (this.v.x * 0.5 + 0.5) * this.w;
    const y = (-this.v.y * 0.5 + 0.5) * this.hgt;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    return true;
  }

  dispose() {
    this.ro.disconnect();
    this.layer.remove();
  }
}
