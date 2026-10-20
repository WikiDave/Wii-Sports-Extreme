// The phone app "Leveranciers": suppliers with today's prices, orders on their way, the crate at
// the hut and a price comparison with the market of Havenstad. suppliersUi({ page, game, toast })
// draws on any `page(title, ...elements)` function, so the screens also work inside a dialog.

import { h } from '../../ui/dom.js';
import { RANKS } from '../state.js';
import { WEATHER, dayInfo, EVENTS } from '../weather.js';
import { LEVELS, ORDERABLE, SUPPLIERS, SUPPLIER_IDS, TIERS } from './data.js';
import { avatar } from './looks.js';
import { handelState, markRead, dismiss, unreadCount } from './store.js';
import { supplierPage } from './supplierPage.js';
import * as P from './suppliers.js';
import { now, whenText } from './time.js';
import { btn, bar, chip, euro, euro1, note, toTop } from './ui.js';

/** Inbox kinds that belong to the suppliers. */
export const SUPPLIER_KINDS = ['levering', 'uitverkocht'];

/** Number on the app icon: a delivery waiting plus unread messages. */
export const suppliersBadge = (game) => (P.crateUnits(handelState(game)) > 0 ? 1 : 0) + unreadCount(game, SUPPLIER_KINDS);

const lineText = (l) => `${l.n}× ${P.goodName(l.good)}${l.tier === 'standaard' ? '' : ` (${TIERS[l.tier].name.toLowerCase()})`}`;
const crateText = (hs) => {
  const sums = {};
  for (const e of hs.crate) sums[e.good] = (sums[e.good] ?? 0) + e.n;
  return Object.entries(sums).map(([g, n]) => `${n}× ${P.goodName(g).toLowerCase()}`).join(', ');
};

export function suppliersUi({ page, game, toast, onChange = () => {} }) {
  const baskets = {};
  const api = {};
  /** Draws a page and, when it is a move to another page, scrolls back to the top. */
  const go = (draw) => (...args) => {
    draw(...args);
    toTop();
  };

  const drawHome = () => {
    const st = game.state;
    const hs = handelState(game);
    const info = dayInfo(st.day);
    const crate = P.crateUnits(hs);
    // A waiting delivery already has its own card, so its message is left out.
    const msgs = hs.inbox.filter((m) => SUPPLIER_KINDS.includes(m.kind) && !(crate && m.kind === 'levering')).slice(0, 3);
    const fresh = new Set(msgs.filter((m) => !m.read).map((m) => m.id));
    markRead(game, SUPPLIER_KINDS);
    const onWay = hs.orders.filter((o) => o.status === 'onderweg');

    const status = h(
      'div',
      { class: 'hd-card' },
      h('div', { class: 'hd-row hd-between' }, h('strong', {}, `${WEATHER[info.weather].icon} ${WEATHER[info.weather].name}`), h('span', { class: 'hd-money' }, euro(st.cash))),
      EVENTS[info.event].text ? h('div', { class: 'hd-sub' }, EVENTS[info.event].text) : null,
      h('div', { class: 'hd-sub' }, `Plek voor nog ${P.orderRoom(game)} stuks. Besteld wordt bezorgd bij de brievenbus naast je hut, tussen 07:00 en 21:00.`),
    );
    const crateNote = crate
      ? h('div', { class: 'hd-card is-good' }, h('strong', {}, `📦 Er staat een levering klaar (${crate} stuks)`), h('div', { class: 'hd-sub' }, `${crateText(hs)}. Loop naar de brievenbus bij je hut en haal hem op.`))
      : null;
    const inbox = msgs.map((m) => note(m.text, fresh.has(m.id) ? 'is-good' : '', () => (dismiss(game, m.id), drawHome())));

    const cards = SUPPLIER_IDS.map((id) => {
      const sup = SUPPLIERS[id];
      const open = game.rank >= sup.rank;
      const level = P.relLevel(game, id);
      const today = Object.keys(sup.goods).filter((g) => P.availability(st.day, id, g).ok).length;
      const total = Object.keys(sup.goods).length;
      return h(
        'button',
        { class: `hd-card ${open ? '' : 'is-locked'}`, type: 'button', onClick: () => showSupplier(id) },
        h(
          'div',
          { class: 'hd-row' },
          avatar('supplier', { ...sup, id }),
          h('div', { class: 'hd-grow' }, h('div', { class: 'hd-name' }, `${sup.icon} ${sup.name}`), h('div', { class: 'hd-sub' }, sup.title)),
        ),
        h('div', { class: 'hd-row hd-wrap' }, open ? chip(LEVELS[level].name, level ? 'good' : 'dim') : chip(`vanaf rang ${RANKS[sup.rank]}`, 'dim'), open ? chip(today ? `${today} van ${total} leverbaar` : 'Vandaag dicht', today ? '' : 'warn') : null, chip(`min. ${sup.minUnits}`, 'dim')),
        open ? bar(P.levelProgress(game, id)) : null,
      );
    });

    page(
      'Leveranciers',
      h(
        'div',
        { class: 'hd' },
        status,
        crateNote,
        ...inbox,
        h('div', { class: 'hd-btns' }, btn(`Bestellingen${onWay.length ? ` (${onWay.length})` : ''}`, api.orders), btn('Prijzen vergelijken', api.compare)),
        ...cards,
      ),
    );
  };

  const supplierDraw = supplierPage({ page, game, toast, onChange, back: () => api.home(), baskets, orders: () => api.orders() });
  const showSupplier = go(supplierDraw);
  api.supplier = showSupplier;

  const drawOrders = () => {
    const st = game.state;
    const hs = handelState(game);
    const onWay = hs.orders.filter((o) => o.status === 'onderweg');
    const past = hs.orders.filter((o) => o.status !== 'onderweg').slice(-5).reverse();
    const t = now(st);
    const card = (o) => {
      const sup = SUPPLIERS[o.supplier];
      const left = Math.max(0, Math.ceil(o.arriveAt - t));
      return h(
        'div',
        { class: 'hd-card' },
        h('div', { class: 'hd-row' }, avatar('supplier', { ...sup, id: o.supplier }), h('div', { class: 'hd-grow' }, h('div', { class: 'hd-name' }, sup.name), h('div', { class: 'hd-sub' }, `${o.rush ? 'Spoed · ' : ''}${euro(o.total)}`))),
        ...o.lines.map((l) => h('div', { class: 'hd-sub' }, lineText(l))),
        h('div', { class: 'hd-row hd-between' }, chip(`Bezorgd ${whenText(o.arriveAt, st.day)}`, ''), h('span', { class: 'hd-sub' }, left ? `nog ${Math.floor(left / 60)}u ${left % 60}m` : '')),
        btn(`Annuleren (${euro(Math.round(o.total * 0.85))} terug)`, () => {
          const r = P.cancelOrder(game, o.id);
          toast(r.ok ? `Geannuleerd. ${euro(r.refund)} terug.` : r.reason);
          onChange();
          drawOrders();
        }, { kind: 'is-danger' }),
      );
    };
    const crate = P.crateUnits(hs);
    page(
      'Bestellingen',
      h(
        'div',
        { class: 'hd' },
        btn('‹ Alle leveranciers', api.home, { kind: 'hd-back' }),
        crate ? h('div', { class: 'hd-card is-good' }, h('strong', {}, `📦 In de kist bij je hut (${crate} stuks)`), h('div', { class: 'hd-sub' }, crateText(hs))) : null,
        h('h3', {}, 'Onderweg'),
        ...(onWay.length ? onWay.map(card) : [h('p', { class: 'hd-sub' }, 'Niets onderweg. Kies een leverancier om te bestellen.')]),
        past.length ? h('h3', {}, 'Eerder') : null,
        ...past.map((o) => h('div', { class: 'hd-card' }, h('div', { class: 'hd-row hd-between' }, h('strong', {}, SUPPLIERS[o.supplier].name), chip(o.status === 'bezorgd' ? 'Bezorgd' : 'Geannuleerd', o.status === 'bezorgd' ? 'good' : 'dim')), h('div', { class: 'hd-sub' }, o.lines.map(lineText).join(', ')))),
      ),
    );
  };

  const drawCompare = () => {
    const rows = ORDERABLE.map((good) => {
      const best = P.bestOffer(game, good);
      const market = P.marketPrice(good);
      const save = best ? Math.round((1 - best.unit / market) * 100) : null;
      return h('tr', {}, h('td', {}, P.goodName(good)), h('td', {}, euro1(market)), h('td', {}, best ? euro1(best.unit) : '—'), h('td', {}, best ? `${save > 0 ? '−' : '+'}${Math.abs(save)}%` : 'dicht'));
    });
    page(
      'Prijzen vergelijken',
      h(
        'div',
        { class: 'hd' },
        btn('‹ Alle leveranciers', api.home, { kind: 'hd-back' }),
        h('div', { class: 'hd-card' }, h('strong', {}, 'Markt van Havenstad of bezorgd?'), h('div', { class: 'hd-sub' }, 'De markt is altijd open en je neemt alles direct mee. Leveranciers zijn goedkoper per stuk, maar leveren pas later bij je hut.'), h('table', { class: 'hd-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Product'), h('th', {}, 'Markt'), h('th', {}, 'Beste'), h('th', {}, ''))), h('tbody', {}, ...rows))),
      ),
    );
  };

  api.home = go(drawHome);
  api.orders = go(drawOrders);
  api.compare = go(drawCompare);
  return api;
}

/** The phone app definition for ctx.registerApp. */
export function suppliersApp(onChange) {
  return {
    id: 'leveranciers',
    label: 'Leveranciers',
    icon: '📦',
    color: '#6a8cff',
    badge: suppliersBadge,
    render({ page, game, toast }) {
      suppliersUi({ page, game, toast, onChange }).home();
    },
  };
}
