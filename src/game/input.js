// Player input: keyboard (WASD or arrows, Shift to run) and, on touch screens, a stick
// at the bottom left and a run button. move() gives the wanted direction (x right,
// y forward, length 0..1); camera drags elsewhere on the canvas are reported to onLook.

import { h } from '../ui/dom.js';

export class Input {
  constructor(container, canvas, { onLook, onZoom }) {
    this.keys = new Set();
    this.stick = { x: 0, y: 0, id: null, cx: 0, cy: 0 };
    this.runHeld = false;
    this.onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      const down = e.type === 'keydown';
      const k = e.key.toLowerCase();
      if (down) this.keys.add(k);
      else this.keys.delete(k);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    };
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
    this.onBlur = () => this.keys.clear();
    window.addEventListener('blur', this.onBlur);

    // Touch stick and run button.
    this.knob = h('span', { class: 'stick-knob' });
    this.stickEl = h('div', { class: 'stick', 'aria-hidden': 'true' }, this.knob);
    this.runEl = h('button', { class: 'run-btn', type: 'button', 'aria-label': 'Rennen' }, 'Ren');
    container.append(this.stickEl, this.runEl);
    const R = 46;
    this.stickEl.addEventListener('pointerdown', (e) => {
      const b = this.stickEl.getBoundingClientRect();
      Object.assign(this.stick, { id: e.pointerId, cx: b.left + b.width / 2, cy: b.top + b.height / 2 });
      this.stickEl.setPointerCapture(e.pointerId);
      this.moveStick(e, R);
    });
    this.stickEl.addEventListener('pointermove', (e) => e.pointerId === this.stick.id && this.moveStick(e, R));
    const release = (e) => {
      if (e.pointerId !== this.stick.id) return;
      Object.assign(this.stick, { id: null, x: 0, y: 0 });
      this.knob.style.transform = '';
    };
    this.stickEl.addEventListener('pointerup', release);
    this.stickEl.addEventListener('pointercancel', release);
    this.runEl.addEventListener('pointerdown', () => (this.runHeld = !this.runHeld));
    this.runEl.addEventListener('click', () => this.runEl.classList.toggle('is-on', this.runHeld));

    // Camera: drag on the canvas, wheel or pinch to zoom.
    const pointers = new Map();
    let pinch = 0;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (pointers.size === 1) onLook(e.clientX - p.x, e.clientY - p.y);
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) onZoom(pinch / d);
        pinch = d;
      }
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      pinch = 0;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    this.onWheel = (e) => {
      e.preventDefault();
      onZoom(Math.exp(e.deltaY * 0.001));
    };
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  moveStick(e, R) {
    let x = e.clientX - this.stick.cx;
    let y = e.clientY - this.stick.cy;
    const d = Math.hypot(x, y);
    if (d > R) [x, y] = [(x / d) * R, (y / d) * R];
    this.knob.style.transform = `translate(${x}px, ${y}px)`;
    this.stick.x = x / R;
    this.stick.y = -y / R;
  }

  /** Wanted movement: { x, y, run }. */
  move() {
    const k = this.keys;
    let x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    let y = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const d = Math.hypot(x, y);
    if (d > 1) [x, y] = [x / d, y / d];
    if (!d) [x, y] = [this.stick.x, this.stick.y];
    // A stick pushed far runs too.
    const run = k.has('shift') || this.runHeld || Math.hypot(this.stick.x, this.stick.y) > 0.98;
    return { x, y, run };
  }

  dispose() {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    window.removeEventListener('blur', this.onBlur);
  }
}
