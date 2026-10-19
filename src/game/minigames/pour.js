// Schenken: hold (mouse, finger or space) to pour lemonade into a glass and let go when
// it is between the two lines. Three glasses; the score sets the quality of the batch
// (0.8 .. 1.2). Overflowing a glass scores nothing for that glass.

import { h } from '../../ui/dom.js';

const GLASSES = 3;
const SPEED = 0.42; // glass heights per second
const BAND = 0.1; // height of the target band

/** Runs the minigame in container; resolves with the quality 0.8..1.2. */
export function playPour(container, { color = '#f5e04a', title = 'Schenken' } = {}) {
  return new Promise((resolve) => {
    const canvas = h('canvas', { class: 'pour-canvas', width: 360, height: 420 });
    const info = h('p', { class: 'pour-info' }, 'Houd ingedrukt om te schenken, laat los tussen de lijnen.');
    const wrap = h('div', { class: 'minigame' }, h('div', { class: 'minigame-card' }, h('h2', {}, title), canvas, info));
    container.append(wrap);
    const g = canvas.getContext('2d');
    const scores = [];
    let glass = 0;
    let level = 0;
    let pouring = false;
    let done = false;
    let target = 0;
    let flash = 0;
    let last = performance.now();
    const next = () => {
      level = 0;
      target = 0.55 + Math.random() * 0.3;
    };
    next();

    const finishGlass = () => {
      if (done || level <= 0.02) return;
      const centre = target + BAND / 2;
      const score = level > 1 ? 0 : Math.max(0, 1 - Math.abs(level - centre) / 0.35);
      const inBand = level >= target && level <= target + BAND;
      scores.push(inBand ? Math.max(score, 0.85) : score);
      flash = 0.6;
      info.textContent = level > 1 ? 'Overgelopen!' : inBand ? 'Perfect!' : level < target ? 'Te weinig.' : 'Te veel.';
      glass++;
      if (glass >= GLASSES) {
        done = true;
        const avg = scores.reduce((a, b) => a + b, 0) / GLASSES;
        setTimeout(() => {
          cleanup();
          resolve(Math.round((0.8 + 0.4 * avg) * 100) / 100);
        }, 900);
      } else setTimeout(next, 600);
    };
    const down = (e) => {
      e.preventDefault();
      if (!done) pouring = true;
    };
    const up = () => {
      if (!pouring) return;
      pouring = false;
      finishGlass();
    };
    const key = (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      if (e.type === 'keydown' && !e.repeat) down(e);
      if (e.type === 'keyup') up();
    };
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);

    let raf = 0;
    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (pouring) {
        level += SPEED * dt;
        if (level > 1.02) {
          level = 1.02;
          pouring = false;
          finishGlass();
        }
      }
      flash = Math.max(0, flash - dt);
      g.clearRect(0, 0, 360, 420);
      // Glass
      const x0 = 110;
      const x1 = 250;
      const top = 110;
      const bottom = 380;
      const hgt = bottom - top;
      // Liquid
      const ly = bottom - Math.min(level, 1) * hgt;
      g.fillStyle = color;
      g.fillRect(x0 + 4, ly, x1 - x0 - 8, bottom - ly - 4);
      // Stream
      if (pouring) {
        g.fillStyle = color;
        g.fillRect(176, 40, 8, ly - 40);
      }
      // Bottle
      g.fillStyle = '#7fd0a0';
      g.beginPath();
      g.roundRect(150, 0, 60, 46, 10);
      g.fill();
      // Target band
      const bt = bottom - (target + BAND) * hgt;
      const bb = bottom - target * hgt;
      g.fillStyle = 'rgba(63,182,239,0.18)';
      g.fillRect(x0 - 16, bt, x1 - x0 + 32, bb - bt);
      g.strokeStyle = '#3fb6ef';
      g.lineWidth = 3;
      g.setLineDash([8, 6]);
      for (const y of [bt, bb]) {
        g.beginPath();
        g.moveTo(x0 - 16, y);
        g.lineTo(x1 + 16, y);
        g.stroke();
      }
      g.setLineDash([]);
      g.strokeStyle = '#5a6a7a';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(x0, top);
      g.lineTo(x0, bottom);
      g.lineTo(x1, bottom);
      g.lineTo(x1, top);
      g.stroke();
      // Glass counter
      g.fillStyle = '#5a6a7a';
      g.font = '700 18px sans-serif';
      g.textAlign = 'center';
      g.fillText(`Glas ${Math.min(glass + 1, GLASSES)} van ${GLASSES}`, 180, 410);
      if (flash) {
        g.fillStyle = `rgba(255,255,255,${flash})`;
        g.fillRect(0, 0, 360, 420);
      }
    };
    raf = requestAnimationFrame(draw);

    function cleanup() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
      wrap.remove();
    }
  });
}
