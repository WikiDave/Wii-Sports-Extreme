// The phone app "Handelaren": your street sellers, messages from them and the people you can hire.
// sellersUi({ page, game, toast }) draws on any `page(title, ...elements)` function, so the same
// screens work inside the phone and inside a dialog (the HUD button).

import { h } from '../../ui/dom.js';
import { RANKS } from '../state.js';
import { CANDIDATES, ROUTES, STOCK_MAX, candidateById, hireFee } from './data.js';
import { avatar } from './looks.js';
import { sellerPanel, loyaltyLabel } from './sellerPanel.js';
import * as S from './sellers.js';
import { handelState, markRead, dismiss, unreadCount } from './store.js';
import { btn, chip, euro, note, skillGrid, toTop } from './ui.js';

/** Inbox kinds that belong to the sellers. */
export const SELLER_KINDS = ['leeg', 'vol', 'gepakt', 'weg', 'rapport'];

/** Number on the app icon: sellers that need you plus unread messages. */
export const sellersBadge = (game) => Math.max(S.attentionCount(game), unreadCount(game, SELLER_KINDS));

export function sellersUi({ page, game, toast, onChange = () => {} }) {
  const drawHome = () => {
    const st = game.state;
    const hs = handelState(game);
    const msgs = hs.inbox.filter((m) => SELLER_KINDS.includes(m.kind)).slice(0, 4);
    const fresh = new Set(msgs.filter((m) => !m.read).map((m) => m.id));
    markRead(game, SELLER_KINDS);
    const limit = S.sellerLimit(game);
    const total = S.pouchTotal(game);
    const summary = h(
      'div',
      { class: 'hd-card' },
      h('div', { class: 'hd-row hd-between' }, h('strong', {}, `Handelaren ${hs.sellers.length}/${limit}`), chip(game.rank < 1 ? `vanaf rang ${RANKS[1]}` : `${limit - hs.sellers.length} plek${limit - hs.sellers.length === 1 ? '' : 'ken'} vrij`, game.rank < 1 ? 'dim' : '')),
      h('div', { class: 'hd-row hd-between' }, h('span', { class: 'hd-sub' }, 'In de zakken van je verkopers'), h('span', { class: 'hd-big hd-money' }, euro(total))),
      btn('Alles laten overmaken (−5%)', () => {
        const r = S.collectAll(game, 'bank');
        toast(r.amount ? `${euro(r.net)} naar de bank (kosten ${euro(r.fee)}).` : 'Er zit niets in de zakken.');
        onChange();
        drawHome();
      }, { kind: 'is-primary', disabled: total <= 0 }),
    );

    const inbox = msgs.map((m) => note(`${m.text}`, fresh.has(m.id) ? (m.kind === 'gepakt' || m.kind === 'weg' ? 'is-bad' : '') : '', () => (dismiss(game, m.id), drawHome())));

    const rows = hs.sellers.map((s) => {
      const c = candidateById(s.id);
      const need = S.needs(game, s);
      return h(
        'button',
        { class: `hd-card ${need.includes('leeg') || need.includes('vol') ? 'is-warn' : ''}`, type: 'button', onClick: () => detail(s.id) },
        h(
          'div',
          { class: 'hd-row' },
          avatar('seller', c),
          h(
            'div',
            { class: 'hd-grow' },
            h('div', { class: 'hd-name' }, c.name),
            h('div', { class: 'hd-row hd-wrap' }, chip(s.zone ? ROUTES[s.zone].name : 'Bij de hut', s.zone ? '' : 'dim'), need.includes('leeg') ? chip('Leeg!', 'warn') : null, need.includes('vol') ? chip('Zak vol', 'warn') : null, need.includes('route') ? chip('Geen route', 'dim') : null),
          ),
        ),
        h('div', { class: 'hd-row hd-between' }, h('span', { class: 'hd-sub' }, `Voorraad ${S.stockCount(s)}/${STOCK_MAX}`), h('span', { class: 'hd-money' }, `Zak ${euro(s.pouch)}`)),
        h('div', { class: 'hd-sub' }, `${loyaltyLabel(s.loyalty)} · vandaag ${s.today.day === st.day ? s.today.sold : 0} stuks verkocht`),
      );
    });

    const pool = S.recruits(game);
    const hire = pool.map((c) => {
      const why = S.hireBlocker(game, c.id);
      return h(
        'div',
        { class: 'hd-card' },
        h('div', { class: 'hd-row' }, avatar('seller', c), h('div', { class: 'hd-grow' }, h('div', { class: 'hd-name' }, c.name), h('div', { class: 'hd-sub' }, c.line))),
        skillGrid([['Prijsgevoel', c.prijs], ['Discretie', c.disc], ['Tempo', c.tempo]]),
        h('div', { class: 'hd-sub' }, `Houdt ${c.cut}% van elke verkoop · ${loyaltyLabel(c.loyalty).toLowerCase()}`),
        btn(`Inhuren voor ${euro(hireFee(c))}`, () => {
          const r = S.hireSeller(game, c.id);
          if (!r.ok) return toast(r.reason);
          toast(`${c.name} werkt nu voor je. Kies een route en geef voorraad mee.`);
          onChange();
          detail(c.id);
        }, { kind: 'is-primary', disabled: !!why }),
        why ? h('div', { class: 'hd-sub' }, why) : null,
      );
    });
    const locked = CANDIDATES.filter((c) => c.rank > game.rank).length;

    page(
      'Handelaren',
      h(
        'div',
        { class: 'hd' },
        summary,
        ...inbox,
        ...(rows.length ? rows : [h('p', { class: 'phone-empty' }, game.rank < 1 ? 'Verkopers werken voor je vanaf rang Kraamhouder.' : 'Je hebt nog geen verkopers. Huur er hieronder een in.')]),
        game.rank < 1 ? null : h('h3', {}, 'Op zoek naar werk'),
        ...(hire.length ? hire : game.rank < 1 ? [] : [h('p', { class: 'hd-sub' }, 'Vandaag is er niemand beschikbaar.')]),
        locked && game.rank >= 1 ? h('p', { class: 'hd-sub' }, `Nog ${locked} verkoper${locked === 1 ? '' : 's'} komen er bij hogere rangen.`) : null,
      ),
    );
  };

  const home = () => {
    drawHome();
    toTop();
  };

  const detail = (id) => {
    const c = candidateById(id);
    toTop();
    page(
      c.name,
      h(
        'div',
        { class: 'hd' },
        btn('‹ Alle handelaren', home, { kind: 'hd-back' }),
        sellerPanel(game, id, { toast, onGone: home, onChange }),
      ),
    );
  };

  return { home, detail };
}

/** The phone app definition for ctx.registerApp. */
export function sellersApp(onChange) {
  return {
    id: 'handelaren',
    label: 'Handelaren',
    icon: '🧢',
    color: '#ff9a2a',
    badge: sellersBadge,
    render({ page, game, toast }) {
      sellersUi({ page, game, toast, onChange }).home();
    },
  };
}
