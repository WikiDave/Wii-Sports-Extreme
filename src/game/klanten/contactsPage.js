// The Contacten app of the phone: everybody on the island, with search, a filter (known / unknown /
// regulars), a sort (trust, name, who is out now) and, for each contact, where they usually are.
// Tap a known contact for the details. Scrolls with 28 entries; the tools stay at the top.

import { h } from '../../ui/dom.js';
import { CUSTOMERS } from '../data/customers.js';
import { EFFECTS } from '../data/effects.js';
import { PRODUCTS } from '../data/products.js';
import { RANKS } from '../state.js';
import { isUnlocked, record, unlockHint, wishProduct } from '../customers.js';
import { TYPES } from './types.js';
import { tierOf } from './tiers.js';
import { introduction } from './unlock.js';
import { routineHint, whereNow } from './timeline.js';
import { getLiveWorld } from './live.js';
import { portrait } from '../ui/dealMenu.js';

/** What the page remembers while the phone is open and between visits to the page. */
const ui = { q: '', filter: 'alle', sort: 'vertrouwen', open: null };
const FILTERS = [
  ['alle', 'Alle'],
  ['bekend', 'Bekend'],
  ['onbekend', 'Onbekend'],
  ['vast', 'Vast'],
];
const SORTS = [
  ['vertrouwen', 'Vertrouwen'],
  ['naam', 'Naam'],
  ['buiten', 'Nu buiten'],
];

/** The Dutch contact rows: known, trust, where they are now. */
function rowsOf(game) {
  const s = game.state;
  const world = getLiveWorld();
  return CUSTOMERS.map((c) => {
    const known = isUnlocked(s, c, game.rank);
    const rec = s.customers[c.id];
    const trust = known ? rec?.loyalty ?? 0 : -1;
    const now = known ? whereNow(world, c, s.day, s.minutes) : '';
    return { c, known, rec, trust, now, hint: known ? routineHint(c) : '' };
  });
}

const matches = (r, q) => {
  if (!q) return true;
  if (!r.known) return false; // unknown contacts do not give their name away
  const text = `${r.c.name} ${TYPES[r.c.type].name} ${r.hint} ${r.now}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => text.includes(w));
};

const inFilter = (r, f) => f === 'alle' || (f === 'bekend' && r.known) || (f === 'onbekend' && !r.known) || (f === 'vast' && r.known && r.trust >= 60);

const sorters = {
  vertrouwen: (a, b) => b.trust - a.trust || a.c.name.localeCompare(b.c.name, 'nl'),
  naam: (a, b) => (a.known === b.known ? a.c.name.localeCompare(b.c.name, 'nl') : a.known ? -1 : 1),
  buiten: (a, b) => outside(b) - outside(a) || b.trust - a.trust,
};
const outside = (r) => (r.known && r.now && r.now !== 'thuis' ? 1 : 0);

export function renderContacts({ page, game }) {
  const s = game.state;
  const list = h('div', { class: 'kl-list' });
  const filters = h('div', { class: 'kl-row' });
  const sorts = h('div', { class: 'kl-row' }, h('span', {}, 'Sorteer:'));
  const search = h('input', {
    class: 'kl-search',
    type: 'search',
    placeholder: 'Zoek op naam, soort of plek',
    'aria-label': 'Zoek een contact',
    value: ui.q,
    autocomplete: 'off',
    // Typing must not move the player or open the map (they listen to the keys of the whole page).
    onKeydown: (e) => e.key !== 'Escape' && e.stopPropagation(),
    onInput: (e) => {
      ui.q = e.target.value;
      draw();
    },
  });

  const details = (r) => {
    const { c } = r;
    const rec = record(s, c.id);
    const wish = wishProduct(c, game.rank);
    const friends = CUSTOMERS.filter((x) => introduction(x)?.by === c.id && !isUnlocked(s, x, game.rank)).length;
    return h(
      'div',
      { class: 'kl-details' },
      h('div', {}, c.bio),
      h('div', { class: 'kl-chips' }, h('span', {}, 'Houdt van'), ...c.likes.map((e) => h('span', { class: 'kl-chip', style: { '--fx': EFFECTS[e].color } }, EFFECTS[e].name)), ...c.dislikes.map((e) => h('span', { class: 'kl-chip is-no' }, `✗ ${EFFECTS[e].name}`))),
      h('div', { class: 'kl-small' }, `${TYPES[c.type].icon} ${TYPES[c.type].name} · budget €${c.budget} · ${rec.deals} deals · €${rec.spent} besteed`),
      c.every > 1 ? h('div', { class: 'kl-small' }, `Koopt om de ${c.every} dagen een grote partij.`) : '',
      h('div', { class: 'kl-small' }, `Favoriet: ${PRODUCTS[c.prefers].name.toLowerCase()}${wish ? ` (je kunt dat nog niet maken: rang ${RANKS[PRODUCTS[c.prefers].rank]})` : ''}`),
      rec.boycott >= s.day ? h('div', { class: 'kl-note is-warn' }, `Boos: wil je tot dag ${rec.boycott + 1} niet zien.`) : '',
      friends ? h('div', { class: 'kl-small' }, `Kent nog ${friends} ${friends === 1 ? 'persoon' : 'mensen'} die je misschien wil leren kennen.`) : '',
    );
  };

  const row = (r) => {
    const { c } = r;
    const open = ui.open === c.id;
    if (!r.known) {
      return h(
        'div',
        { class: 'kl-contact is-locked' },
        h('div', { class: 'kl-avatar is-unknown' }, '?'),
        h('div', { class: 'kl-main' }, h('div', { class: 'kl-top' }, h('strong', {}, '???'), h('span', { class: 'kl-badge' }, 'Onbekend')), h('div', { class: 'kl-hint' }, unlockHint(s, c, game.rank) ? `Leer je kennen met: ${unlockHint(s, c, game.rank)}` : 'Je leert hem of haar snel kennen')),
      );
    }
    const tier = tierOf(r.trust);
    const angry = (r.rec?.boycott ?? 0) >= s.day;
    return h(
      'div',
      {
        class: `kl-contact ${open ? 'is-open' : ''}`,
        role: 'button',
        tabindex: '0',
        'aria-expanded': String(open),
        onClick: () => {
          ui.open = open ? null : c.id;
          draw();
          // Bring the opened contact into view below the tools.
          if (ui.open) list.querySelector('.is-open')?.scrollIntoView({ block: 'nearest' });
        },
        onKeydown: (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), e.currentTarget.click()),
      },
      portrait(c, 'kl-avatar', 96),
      h(
        'div',
        { class: 'kl-main' },
        h('div', { class: 'kl-top' }, h('strong', {}, c.name), h('span', { class: 'kl-badge' }, angry ? '😡 Boos' : `${tier.icon} ${tier.name}`)),
        h('div', { class: 'contact-bar', title: `Vertrouwen ${r.trust}/100` }, h('span', { style: { width: `${r.trust}%` } })),
        h('div', { class: 'kl-hint' }, r.hint),
        r.trust >= 35 ? h('div', { class: 'kl-now' }, `Nu: ${r.now}`) : '',
      ),
      open ? details(r) : '',
    );
  };

  const draw = () => {
    const all = rowsOf(game);
    const shown = all.filter((r) => inFilter(r, ui.filter) && matches(r, ui.q)).sort(sorters[ui.sort]);
    const count = (f) => all.filter((r) => inFilter(r, f)).length;
    filters.replaceChildren(
      ...FILTERS.map(([id, label]) => h('button', { class: `kl-pill ${ui.filter === id ? 'is-on' : ''}`, type: 'button', onClick: () => ((ui.filter = id), draw()) }, `${label} ${count(id)}`)),
    );
    sorts.replaceChildren(h('span', {}, 'Sorteer:'), ...SORTS.map(([id, label]) => h('button', { class: `kl-pill ${ui.sort === id ? 'is-on' : ''}`, type: 'button', onClick: () => ((ui.sort = id), draw()) }, label)));
    list.replaceChildren(...(shown.length ? shown.map(row) : [h('p', { class: 'kl-empty' }, ui.q ? 'Niemand gevonden.' : 'Hier is nog niemand.')]));
  };

  draw();
  page('Contacten', h('div', { class: 'kl-tools' }, search, filters, sorts), list);
}
