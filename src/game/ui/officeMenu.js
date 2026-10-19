// The office in Havenstad: buy properties and hire staff.

import { h, modal } from '../../ui/dom.js';
import { PROPERTIES } from '../data/properties.js';
import { STAFF } from '../data/staff.js';
import { RANKS } from '../state.js';
import { buyProperty, hire, fire, stockLimit, staffLimit } from '../empire.js';

const euro = (n) => `€${n.toLocaleString('nl-NL')}`;

export function openOffice(game) {
  const body = h('div', { class: 'shop' });
  const refresh = () => {
    const s = game.state;
    body.replaceChildren(
      h('p', { class: 'shop-cash' }, `Je hebt ${euro(s.cash)}. Plek voor ${s.staff.length} van ${staffLimit(s)} medewerkers, voorraad tot ${stockLimit(s)} stuks.`),
      h('h3', {}, 'Panden'),
      ...Object.entries(PROPERTIES).map(([id, p]) => {
        const owned = s.properties.includes(id);
        const locked = game.rank < p.rank;
        return h(
          'div',
          { class: 'shop-row' },
          h('span', { class: 'shop-name' }, `${p.name}`),
          h('span', { class: 'shop-have' }, owned ? 'van jou' : locked ? `vanaf rang ${RANKS[p.rank]}` : euro(p.price)),
          h('span', { class: 'shop-have' }, `${p.slots} plekken, ${p.storage} voorraad`),
          owned || locked
            ? null
            : h('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: s.cash < p.price, onClick: () => (buyProperty(game, id), refresh()) }, 'Koop'),
        );
      }),
      h('h3', {}, 'Personeel'),
      ...Object.entries(STAFF).map(([id, w]) => {
        const has = s.staff.includes(id);
        const locked = game.rank < w.rank;
        return h(
          'div',
          { class: 'shop-row staff-row' },
          h('span', { class: 'shop-name' }, `${w.name} — ${euro(w.wage)} per dag`),
          h('span', { class: 'shop-have' }, locked ? `vanaf rang ${RANKS[w.rank]}` : w.text),
          locked
            ? null
            : has
              ? h('button', { class: 'btn btn-small', type: 'button', onClick: () => (fire(game, id), refresh()) }, 'Ontslaan')
              : h('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: s.staff.length >= staffLimit(s), onClick: () => (hire(game, id), refresh()) }, 'Inhuren'),
        );
      }),
    );
  };
  refresh();
  modal({ title: 'Kantoor', body, wide: true, actions: [{ label: 'Klaar', kind: 'primary' }] });
}
