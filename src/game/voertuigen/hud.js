// The fuel gauge and speed while you drive, a pill in the island's top bar. Styles are injected
// by the feature (CSS below).

import { h } from '../../ui/dom.js';

export const CSS = `
.vh-gauge { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.92); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); font-weight: 800;
  white-space: nowrap; }
.vh-gauge[hidden] { display: none; }
.vh-ico { font-size: 1.15rem; line-height: 1; }
.vh-fuel { width: 64px; height: 10px; border-radius: 6px; background: #e3e9f0; overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12); }
.vh-fuel[hidden] { display: none; }
.vh-fuel i { display: block; height: 100%; width: 100%; background: #35c46a; transition: width 0.25s linear, background 0.25s; }
.vh-gauge.is-low .vh-fuel i { background: #e0533f; }
.vh-speed { min-width: 64px; text-align: right; font-variant-numeric: tabular-nums; }
.vh-row { flex-wrap: wrap; row-gap: 6px; }
.vh-row .shop-name { flex: 1 1 100%; }
.vh-row .shop-have { flex: 1 1 auto; }
.vh-desc { display: block; font-weight: 500; font-size: 0.85em; line-height: 1.3; opacity: 0.75; margin-top: 2px; }
.vh-note { font-size: 0.9em; opacity: 0.75; margin: 10px 0 0; }
.vh-card strong, .vh-card small { display: block; }
.vh-card small { margin-top: 3px; }
.vh-card .msg-actions { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.vh-where { color: #2b6fa3; }
.vh-chest-reward { font-size: 1.3rem; font-weight: 900; color: #b07a00; }
@media (max-width: 560px) {
  .vh-gauge { padding: 5px 9px; font-size: 0.8rem; gap: 6px; }
  .vh-fuel { width: 44px; }
  .vh-speed { min-width: 52px; }
}
`;

/** Makes the gauge. show(name, usesFuel) / hide() / update(share, kmh, empty). */
export function makeGauge(hudBar) {
  const icon = h('span', { class: 'vh-ico', 'aria-hidden': 'true' }, '🚲');
  const fill = h('i', {});
  const fuel = h('span', { class: 'vh-fuel', title: 'Benzine' }, fill);
  const speed = h('span', { class: 'vh-speed' }, '0 km/u');
  const el = h('div', { class: 'vh-gauge', hidden: true, role: 'status', 'aria-label': 'Voertuig' }, icon, fuel, speed);
  hudBar.append(el);
  let last = '';
  return {
    el,
    show(icoText, usesFuel) {
      icon.textContent = icoText;
      fuel.hidden = !usesFuel;
      el.hidden = false;
      last = '';
    },
    hide() {
      el.hidden = true;
    },
    update(share, kmh, empty) {
      const key = `${Math.round(share * 50)}|${kmh}|${empty}`;
      if (key === last) return;
      last = key;
      fill.style.width = `${Math.round(share * 100)}%`;
      el.classList.toggle('is-low', share < 0.25 && share >= 0);
      speed.textContent = empty ? 'leeg' : `${kmh} km/u`;
    },
    dispose() {
      el.remove();
    },
  };
}
