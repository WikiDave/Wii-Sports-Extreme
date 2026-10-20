// The phone: opens from the HUD (or Tab). Apps: Berichten (requests from customers),
// Contacten (who you know, how much they trust you), Bank (safe money) and Kaart.

import { h, modal, toast } from '../../ui/dom.js';
import { CUSTOMERS } from '../data/customers.js';
import { EFFECTS } from '../data/effects.js';
import { RANKS } from '../state.js';
import { isUnlocked, record } from '../customers.js';
import { accept, decline, unread, deposit, withdraw } from '../phone.js';
import { EXTRA_APPS } from '../phoneApps.js';

const euro = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
const nameOf = (id) => CUSTOMERS.find((c) => c.id === id)?.name ?? id;

const APPS = [
  { id: 'berichten', label: 'Berichten', icon: '💬', color: '#3fb6ef' },
  { id: 'contacten', label: 'Contacten', icon: '👥', color: '#7ed957' },
  { id: 'bank', label: 'Bank', icon: '🏦', color: '#f2b45a' },
  { id: 'kaart', label: 'Kaart', icon: '🗺️', color: '#ff7aa8' },
];

export function openPhone(game, { openMap } = {}) {
  const screen = h('div', { class: 'phone-screen' });
  let dlg = null;
  const home = () => {
    const n = unread(game.state);
    screen.replaceChildren(
      h('div', { class: 'phone-top' }, h('span', {}, `Dag ${game.state.day}`), h('span', {}, euro(game.state.cash))),
      h(
        'div',
        { class: 'phone-apps' },
        ...[...APPS, ...EXTRA_APPS].map((a) =>
          h(
            'button',
            { class: 'phone-app', type: 'button', onClick: () => open(a.id) },
            h('span', { class: 'phone-ico', style: { background: a.color } }, a.icon, (a.id === 'berichten' ? n : a.badge?.(game) ?? 0) ? h('i', { class: 'phone-badge' }, String(a.id === 'berichten' ? n : a.badge(game))) : null),
            h('span', {}, a.label),
          ),
        ),
      ),
    );
  };
  const page = (title, ...content) => {
    screen.replaceChildren(
      h('div', { class: 'phone-bar' }, h('button', { class: 'btn btn-small', type: 'button', onClick: home }, '‹ Terug'), h('strong', {}, title)),
      h('div', { class: 'phone-body' }, ...content),
    );
  };
  const open = (id) => {
    if (id === 'kaart') {
      dlg?.close();
      openMap?.();
      return;
    }
    const extra = EXTRA_APPS.find((a) => a.id === id);
    if (extra) extra.render({ page, back: home, game, h, toast });
    else ({ berichten, contacten, bank })[id]();
  };

  const berichten = () => {
    const msgs = game.state.messages.filter((m) => m.status === 'new' || m.status === 'accepted' || m.day >= game.state.day - 2);
    page(
      'Berichten',
      ...(msgs.length
        ? msgs.map((m) =>
            h(
              'div',
              { class: `msg msg-${m.status}` },
              h('div', { class: 'msg-from' }, nameOf(m.customer), h('small', {}, ` · dag ${m.day}`)),
              h('p', {}, m.text),
              h('small', {}, `${m.qty}× ${EFFECTS[m.effect].name.toLowerCase()}, bonus +30%`),
              m.status === 'new'
                ? h('div', { class: 'msg-actions' }, h('button', { class: 'btn btn-small btn-primary', type: 'button', onClick: () => (accept(game, m.id), toast('Afspraak gemaakt: zoek hem of haar vandaag op.'), berichten()) }, 'Accepteren'), h('button', { class: 'btn btn-small', type: 'button', onClick: () => (decline(game, m.id), berichten()) }, 'Weigeren'))
                : h('small', { class: 'msg-status' }, { accepted: '✔ Geaccepteerd: lever vandaag af', done: '✔ Afgeleverd', expired: 'Verlopen' }[m.status]),
            ),
          )
        : [h('p', { class: 'phone-empty' }, 'Nog geen berichten. Klanten sturen je een bericht als ze je vertrouwen.')]),
    );
  };

  const contacten = () =>
    page(
      'Contacten',
      ...CUSTOMERS.map((c) => {
        const known = isUnlocked(game.state, c, game.rank);
        const rec = record(game.state, c.id);
        return h(
          'div',
          { class: `contact ${known ? '' : 'is-locked'}` },
          h('strong', {}, known ? c.name : '???'),
          known
            ? h('div', { class: 'contact-bar', title: `Vertrouwen ${rec.loyalty}/100` }, h('span', { style: { width: `${rec.loyalty}%` } }))
            : h('small', {}, c.unlock?.rank != null ? `Komt bij rang ${RANKS[c.unlock.rank]}` : 'Wordt aan je voorgesteld door een vriend'),
          known ? h('small', {}, `Houdt van ${c.likes.map((e) => EFFECTS[e].name.toLowerCase()).join(', ')} · ${rec.deals} deals`) : null,
        );
      }),
    );

  const bank = () => {
    const s = game.state;
    const amounts = [50, 100, 500, 1000];
    page(
      'Bank',
      h('div', { class: 'bank-card' }, h('small', {}, 'Op de bank (veilig voor bewakers)'), h('strong', {}, euro(s.bank)), h('small', {}, `Contant: ${euro(s.cash)}`)),
      h('p', {}, 'Storten'),
      h('div', { class: 'bank-row' }, ...amounts.map((a) => h('button', { class: 'btn btn-small', type: 'button', disabled: s.cash < a, onClick: () => (deposit(game, a), bank()) }, `€${a}`)), h('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: s.cash < 1, onClick: () => (deposit(game, s.cash), bank()) }, 'Alles')),
      h('p', {}, 'Opnemen'),
      h('div', { class: 'bank-row' }, ...amounts.map((a) => h('button', { class: 'btn btn-small', type: 'button', disabled: s.bank < a, onClick: () => (withdraw(game, a), bank()) }, `€${a}`)), h('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: s.bank < 1, onClick: () => (withdraw(game, s.bank), bank()) }, 'Alles')),
    );
  };

  home();
  dlg = modal({ title: 'Telefoon', body: h('div', { class: 'phone' }, screen), actions: [{ label: 'Sluiten' }] });
  return dlg;
}
