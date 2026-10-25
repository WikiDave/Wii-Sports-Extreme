// Minimap and full map of the island: the terrain painted once from heightAt, zone
// names, and the player as an arrow. Tap or click the minimap (or press M) for the big map.

import { h } from '../../ui/dom.js';
import { heightAt } from '../world/island.js';
import { ZONES, PATHS, BRIDGE } from '../world/zones.js';

const EXTENT = 700; // metres from the centre shown on the full map
const CENTER = { x: 90, z: -20 };
const RES = 360;
const LABEL_DROP = 22; // a place's label is drawn this far under its dot (full-map pixels)
const CLASH = 40; // a zone name this close to a place's label gives way to it (full-map pixels)

function paintTerrain() {
  const c = document.createElement('canvas');
  c.width = c.height = RES;
  const g = c.getContext('2d');
  const img = g.createImageData(RES, RES);
  for (let py = 0; py < RES; py++) {
    for (let px = 0; px < RES; px++) {
      const x = CENTER.x + ((px / RES) * 2 - 1) * EXTENT;
      const z = CENTER.z + ((py / RES) * 2 - 1) * EXTENT;
      const y = heightAt(x, z);
      let col;
      if (y < 0) col = y < -8 ? [42, 150, 200] : [120, 215, 225];
      else if (y < 2.4) col = [243, 226, 168];
      else if (y > 70) col = [110, 90, 82];
      else {
        const k = Math.min(1, y / 60);
        col = [131 - 45 * k, 201 - 40 * k, 77 - 20 * k];
      }
      const i = (py * RES + px) * 4;
      img.data.set([...col, 255], i);
    }
  }
  g.putImageData(img, 0, 0);
  // Paths
  g.strokeStyle = '#c9a874';
  g.lineWidth = 1.6;
  g.lineJoin = g.lineCap = 'round';
  const px = (x) => ((x - CENTER.x) / (EXTENT * 2) + 0.5) * RES;
  const pz = (z) => ((z - CENTER.z) / (EXTENT * 2) + 0.5) * RES;
  for (const line of PATHS) {
    g.beginPath();
    line.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))));
    g.stroke();
  }
  // The bridge to the cape, in its own orange.
  g.strokeStyle = '#c4402f';
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(px(BRIDGE.a[0]), pz(BRIDGE.a[1]));
  g.lineTo(px(BRIDGE.b[0]), pz(BRIDGE.b[1]));
  g.stroke();
  return c;
}

export class Minimap {
  constructor(container) {
    this.terrain = paintTerrain();
    this.big = false;
    /** Places to mark on the maps: [{ x, z, label }] (set by features/panden.js). */
    this.marks = [];
    this.mini = h('canvas', { class: 'minimap', width: 160, height: 160, 'aria-label': 'Minikaart, tik voor de grote kaart' });
    this.full = h('canvas', { class: 'fullmap', width: 640, height: 640 });
    this.overlay = h('div', { class: 'fullmap-wrap', hidden: true, onClick: () => this.toggle(false) }, this.full, h('p', {}, 'Tik om te sluiten'));
    this.mini.addEventListener('click', () => this.toggle(true));
    container.append(this.mini, this.overlay);
    this.onKey = (e) => e.key.toLowerCase() === 'm' && this.toggle(!this.big);
    window.addEventListener('keydown', this.onKey);
  }

  toggle(on) {
    this.big = on;
    this.overlay.hidden = !on;
  }

  /** Draws the map around player (position x/z, heading) every frame. */
  draw(player) {
    const { x, z } = player.pos;
    const heading = player.heading;
    // Minimap: 260 m around the player.
    {
      const c = this.mini;
      const g = c.getContext('2d');
      const view = 260;
      g.save();
      g.clearRect(0, 0, c.width, c.height);
      g.beginPath();
      g.arc(80, 80, 78, 0, Math.PI * 2);
      g.clip();
      g.fillStyle = '#2a96c8';
      g.fillRect(0, 0, 160, 160);
      const px = ((x - CENTER.x) / (EXTENT * 2) + 0.5) * RES;
      const pz = ((z - CENTER.z) / (EXTENT * 2) + 0.5) * RES;
      const k = (160 / (view * 2)) * ((EXTENT * 2) / RES);
      g.translate(80, 80);
      g.scale(k, k);
      g.drawImage(this.terrain, -px, -pz);
      g.restore();
      g.lineWidth = 4;
      g.strokeStyle = '#fff';
      g.beginPath();
      g.arc(80, 80, 78, 0, Math.PI * 2);
      g.stroke();
      for (const m of this.marks) {
        const mx = 80 + ((((m.x - CENTER.x) / (EXTENT * 2) + 0.5) * RES) - px) * k;
        const my = 80 + ((((m.z - CENTER.z) / (EXTENT * 2) + 0.5) * RES) - pz) * k;
        if (Math.hypot(mx - 80, my - 80) < 74) this.mark(g, mx, my, 6);
      }
      this.arrow(g, 80, 80, heading, 9);
    }
    if (!this.big) return;
    const c = this.full;
    const g = c.getContext('2d');
    g.drawImage(this.terrain, 0, 0, c.width, c.height);
    const f = c.width / (EXTENT * 2);
    // Where the place labels will be. A zone name that would sit on one of them is left out.
    const labels = this.marks.filter((m) => m.label).map((m) => [(m.x - CENTER.x + EXTENT) * f, (m.z - CENTER.z + EXTENT) * f + LABEL_DROP]);
    g.font = '700 16px sans-serif';
    g.textAlign = 'center';
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.fillStyle = '#fff';
    for (const zn of ZONES) {
      const zx = (zn.x - CENTER.x + EXTENT) * f;
      const zz = (zn.z - CENTER.z + EXTENT) * f;
      if (labels.some(([lx, ly]) => Math.hypot(lx - zx, ly - zz) < CLASH)) continue;
      g.strokeText(zn.name, zx, zz);
      g.fillText(zn.name, zx, zz);
    }
    for (const m of this.marks) this.mark(g, (m.x - CENTER.x + EXTENT) * f, (m.z - CENTER.z + EXTENT) * f, 9, m.label);
    this.arrow(g, (x - CENTER.x + EXTENT) * f, (z - CENTER.z + EXTENT) * f, heading, 12);
  }

  /** An owned place: a blue dot with a white rim, and its short name on the full map. */
  mark(g, cx, cy, r, label = '') {
    g.save();
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fillStyle = '#3a9ad9';
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.fill();
    g.stroke();
    if (label) {
      g.font = '700 14px sans-serif';
      g.textAlign = 'center';
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(0,0,0,0.5)';
      g.fillStyle = '#fff';
      g.strokeText(label, cx, cy + LABEL_DROP);
      g.fillText(label, cx, cy + LABEL_DROP);
    }
    g.restore();
  }

  arrow(g, cx, cy, heading, r) {
    g.save();
    g.translate(cx, cy);
    g.rotate(Math.PI - heading);
    g.beginPath();
    g.moveTo(0, -r);
    g.lineTo(r * 0.7, r * 0.8);
    g.lineTo(0, r * 0.4);
    g.lineTo(-r * 0.7, r * 0.8);
    g.closePath();
    g.fillStyle = '#e2513f';
    g.strokeStyle = '#fff';
    g.lineWidth = 2.5;
    g.fill();
    g.stroke();
    g.restore();
  }

  dispose() {
    window.removeEventListener('keydown', this.onKey);
  }
}
