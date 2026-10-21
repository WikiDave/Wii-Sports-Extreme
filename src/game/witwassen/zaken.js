// The phone app "Zaken": your businesses (today's washing against the capacity, how odd the books
// look, the fee, the takings), the businesses for sale, the letters of the taxman and a tip.
// Registered by the feature with registerApp(); the numbers come from summary.js.

import { BUSINESSES } from './data.js';
import { bizRows, totals } from './summary.js';
import { buyBusiness } from './laundering.js';
import { wState, markRead, unreadMail } from './store.js';
import { WASH_TIPS, pickLine } from './texts.js';
import { formatClock } from '../state.js';

const eur = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;

export const zakenApp = {
  id: 'zaken',
  label: 'Zaken',
  icon: '🧾',
  color: '#8e5fd0',
  badge: (game) => unreadMail(game),
  render({ page, game, h, toast }) {
    const draw = () => {
      const t = totals(game);
      const rows = bizRows(game);
      const mine = rows.filter((r) => r.owned);
      const forSale = rows.filter((r) => !r.owned);
      const mail = wState(game).inbox.slice(0, 12);
      page(
        'Zaken',
        h(
          'div',
          { class: 'wit-card' },
          h('small', {}, 'Zwart geld op zak'),
          h('strong', { class: 'wit-big' }, eur(t.dirty)),
          h('small', {}, `De bank neemt vandaag nog ${eur(t.bankLeft)} zwart geld aan via de telefoon. De pinautomaat in de haven nog ${eur(t.atmLeft)}.`),
        ),
        h('h3', {}, 'Jouw zaken'),
        ...(mine.length
          ? mine.map((r) => {
              const b = wState(game).biz[r.id];
              return h(
                'div',
                { class: 'wit-card wit-biz' },
                h('div', { class: 'wit-row-head' }, h('strong', {}, `${r.icon} ${r.short}`), h('span', { class: `wit-status ${r.open ? 'is-open' : 'is-closed'}` }, r.open ? 'Open' : 'Dicht')),
                h('small', {}, `Vandaag gewassen ${eur(r.used)} van ${eur(r.cap)}`),
                h('div', { class: `wit-bar ${r.used > r.safe ? 'is-hot' : ''}` }, h('i', { style: { width: `${Math.min(100, Math.round((r.used / Math.max(1, r.cap)) * 100))}%` } })),
                h('small', {}, `Verdachtheid: ${r.word} (${r.suspicion}/100)`),
                h('div', { class: 'wit-bar wit-bar-thin' }, h('i', { style: { width: `${r.suspicion}%` } })),
                h('small', {}, `Commissie ${Math.round(r.fee * 100)}% · dekking ${eur(r.safe)} per dag · verdiend in totaal ${eur(r.earned)}`),
                h('small', {}, `Verbeteringen: ${b.up.cap + b.up.fee + b.up.books} van 9`),
              );
            })
          : [h('p', { class: 'phone-empty' }, 'Nog geen zaak. Kijk naar de borden TE KOOP op het strand en in Havenstad.')]),
        h('h3', {}, 'Te koop'),
        ...forSale.map((r) => {
          const money = game.state.cash + game.state.bank;
          return h(
            'div',
            { class: 'wit-card wit-biz' },
            h('div', { class: 'wit-row-head' }, h('strong', {}, `${r.icon} ${r.short}`), h('small', {}, `${r.where}`)),
            h('small', {}, r.blurb),
            h(
              'div',
              { class: 'wit-row-head' },
              h('small', {}, `${eur(r.price)} · vanaf rang ${BUSINESSES[r.id].rank}`),
              h('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: r.locked || money < r.price, onClick: () => buy(r.id) }, r.locked ? 'Nog niet' : 'Kopen'),
            ),
          );
        }),
        h('h3', {}, 'Brieven en berichten'),
        ...(mail.length
          ? mail.map((m) =>
              h(
                'div',
                { class: `wit-mail ${m.read ? '' : 'is-new'}` },
                h('div', { class: 'wit-row-head' }, h('strong', {}, m.title), m.read ? null : h('span', { class: 'wit-new' }, 'nieuw')),
                h('p', {}, m.text),
                h('small', {}, `dag ${m.day} · ${formatClock(m.min)}`),
              ),
            )
          : [h('p', { class: 'phone-empty' }, 'Nog geen post van de Fiscus of je zaken.')]),
        h('p', { class: 'wit-tip' }, `Tip: ${pickLine(WASH_TIPS, game.state.day)}`),
      );
    };
    const buy = (id) => {
      const r = buyBusiness(game, id);
      toast(r.ok ? `${BUSINESSES[id].short} is van jou!` : r.reason);
      draw();
    };
    draw();
    markRead(game);
    game.emit('change');
  },
};
