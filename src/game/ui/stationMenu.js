// The stations menu: running batches with progress, collect what is ready, start a new batch.

import { h, modal, toast } from '../../ui/dom.js';
import { PRODUCTS } from '../data/products.js';
import { itemName } from '../economy.js';
import { stationLimit, ready, collect, progress, now } from '../stations.js';
import { openMixMenu } from './tradeMenus.js';

export function openStations(game) {
  const body = h('div', { class: 'stations' });
  let timer = 0;
  const render = () => {
    const s = game.state;
    const n = stationLimit(s);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const j = s.jobs[i];
      if (!j) {
        rows.push(h('div', { class: 'station is-free' }, h('strong', {}, `Station ${i + 1}`), h('small', {}, 'Vrij')));
      } else {
        const p = progress(s, j);
        const left = Math.max(0, Math.ceil(j.readyAt - now(s)));
        rows.push(
          h(
            'div',
            { class: `station ${p >= 1 ? 'is-ready' : ''}` },
            h('strong', {}, `Station ${i + 1}: ${itemName(j.key)}`),
            h('div', { class: 'contact-bar' }, h('span', { style: { width: `${Math.round(p * 100)}%` } })),
            h('small', {}, p >= 1 ? `Klaar: ${j.yield} stuks` : `Nog ${left} min`),
          ),
        );
      }
    }
    body.replaceChildren(h('p', {}, `${s.jobs.length} van ${n} stations bezig.`), ...rows);
  };
  render();
  timer = setInterval(render, 500);
  const makeable = Object.entries(PRODUCTS).filter(([, p]) => p.rank <= game.rank);
  const dlg = modal({
    title: 'Productiestations',
    body,
    onClose: () => clearInterval(timer),
    actions: [
      { label: 'Sluiten' },
      ...makeable.map(([id, p]) => ({
        label: `${p.name} maken`,
        onClick: () => {
          if (game.state.jobs.length >= stationLimit(game.state)) {
            toast('Alle stations zijn bezig.');
            return false;
          }
          setTimeout(() => openMixMenu(game, id), 0);
        },
      })),
      {
        label: 'Ophalen',
        kind: 'primary',
        onClick: () => {
          const n = collect(game);
          toast(n ? `${n} stuks opgehaald.` : ready(game.state).length ? 'Geen ruimte.' : 'Er is nog niets klaar.');
          render();
          return false;
        },
      },
    ],
  });
  return dlg;
}
