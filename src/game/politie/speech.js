// A speech bubble above a point in the 3D world (a rival's taunt). One at a time: say() sets it,
// update() keeps it over the point, and it fades out after a few seconds. Never takes taps.

import * as THREE from 'three';

export class Speech {
  constructor(parent, camera, h) {
    this.camera = camera;
    this.h = h;
    this.el = h('div', { class: 'pz-speech', hidden: true, 'aria-hidden': 'true' });
    parent.append(this.el);
    this.v = new THREE.Vector3();
    this.pos = null;
    this.until = 0;
    this.now = 0;
  }

  /** Shows `name: text` above pos (an object with x, y, z that is read each frame). */
  say(name, text, pos, ms = 4200) {
    this.el.replaceChildren(this.h('b', { class: 'pz-speech-name' }, name), this.h('span', {}, text));
    this.el.hidden = false;
    this.pos = pos;
    this.until = this.now + ms / 1000;
  }

  /** Moves the bubble to its point on the screen. w, hgt: the size of the screen. */
  update(dt, w, hgt) {
    this.now += dt;
    if (!this.pos) return;
    if (this.now > this.until) {
      this.el.hidden = true;
      this.pos = null;
      return;
    }
    this.v.set(this.pos.x, this.pos.y + 2.5, this.pos.z).project(this.camera);
    if (this.v.z > 1 || this.v.z < -1) {
      this.el.style.visibility = 'hidden';
      return;
    }
    this.el.style.visibility = 'visible';
    const x = (this.v.x * 0.5 + 0.5) * w;
    const y = (-this.v.y * 0.5 + 0.5) * hgt;
    this.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
  }

  dispose() {
    this.el.remove();
  }
}
