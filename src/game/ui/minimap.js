// Minimap and full map of the island: the terrain painted once from heightAt, zone
// names, and the player as an arrow. Tap or click the minimap (or press M) for the big map.

import { h } from '../../ui/dom.js';
import { heightAt } from '../world/island.js';
import { ZONES } from '../world/zones.js';

const EXTENT = 700; // metres from the centre shown on the full map
const CENTER = { x: 90, z: -20 };
const RES = 360;

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
  return c;
}

export class Minimap {
  constructor(container) {
    this.terrain = paintTerrain();
    this.big = false;
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
      this.arrow(g, 80, 80, heading, 9);
    }
    if (!this.big) return;
    const c = this.full;
    const g = c.getContext('2d');
    g.drawImage(this.terrain, 0, 0, c.width, c.height);
    const f = c.width / (EXTENT * 2);
    g.font = '700 16px sans-serif';
    g.textAlign = 'center';
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.fillStyle = '#fff';
    for (const zn of ZONES) {
      const zx = (zn.x - CENTER.x + EXTENT) * f;
      const zz = (zn.z - CENTER.z + EXTENT) * f;
      g.strokeText(zn.name, zx, zz);
      g.fillText(zn.name, zx, zz);
    }
    this.arrow(g, (x - CENTER.x + EXTENT) * f, (z - CENTER.z + EXTENT) * f, heading, 12);
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
