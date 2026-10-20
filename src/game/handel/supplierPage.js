// The page of one supplier: what he sells today (price, mood, quality tier), a basket with
// steppers, the bill with bulk discount, delivery and rush, and the order button.

import { h } from '../../ui/dom.js';
import { RANKS } from '../state.js';
import { LEVELS, LEVEL_PERKS, SUPPLIERS, TIERS, maxOrder } from './data.js';
import { avatar } from './looks.js';
import * as P from './suppliers.js';
import { btn, bar, chip, euro, euro1, note } from './ui.js';
import { now, whenText } from './time.js';

const MOODS = { koopje: ['Koopje', 'good'], duur: ['Duur', 'warn'] };

/** Draws supplier `id` through `page`. baskets keeps the unfinished baskets per supplier. */
export function supplierPage({ page, game, toast, onChange, back, baskets, orders }) {
  return function show(id) {
    const sup = SUPPLIERS[id];
    const day = game.state.day;
    const level = P.relLevel(game, id);
    const b = (baskets[id] ??= { items: {}, rush: false });
    const tiers = P.tiersFor(sup, level);
    const open = game.rank >= sup.rank;
    const redraw = () => show(id);

    const setN = (good, n) => {
      const it = (b.items[good] ??= { n: 0, tier: tiers.includes('standaard') ? 'standaard' : tiers[0] });
      it.n = Math.max(0, Math.min(maxOrder(level), n));
      if (!it.n) delete b.items[good];
      redraw();
    };
    const setTier = (good, tier) => {
      const it = (b.items[good] ??= { n: 0, tier });
      it.tier = tier;
      if (!it.n) delete b.items[good];
      redraw();
    };

    const rows = Object.keys(sup.goods).map((good) => {
      const av = P.availability(day, id, good);
      const it = b.items[good];
      const tier = it?.tier && tiers.includes(it.tier) ? it.tier : tiers.includes('standaard') ? 'standaard' : tiers[0];
      const unit = P.unitPriceOn(day, id, good, tier, level);
      const m = MOODS[P.priceMood(day, id, good)];
      const fc = P.forecast(game, id, good);
      const n = it?.n ?? 0;
      return h(
        'div',
        { class: `hd-good ${av.ok ? '' : 'is-off'}` },
        h(
          'div',
          { class: 'hd-row hd-between' },
          h('span', { class: 'hd-name' }, P.goodName(good)),
          av.ok ? h('span', { class: 'hd-row' }, m ? chip(m[0], m[1]) : null, h('strong', {}, `${euro1(unit)} per stuk`)) : chip(av.reason, 'dim'),
        ),
        h('div', { class: 'hd-sub' }, `Markt ${euro1(P.marketPrice(good))}${fc ? (fc.ok ? ` · morgen ${euro1(fc.unit)}` : ' · morgen niet leverbaar') : ''}`),
        av.ok && open
          ? h(
              'div',
              { class: 'hd-row hd-wrap hd-between' },
              tiers.length > 1
                ? h('div', { class: 'hd-tiers' }, ...tiers.map((t) => btn(TIERS[t].name, () => setTier(good, t), { kind: tier === t ? 'is-on' : '', title: TIERS[t].text })))
                : null,
              h(
                'div',
                { class: 'hd-stepper' },
                btn('−5', () => setN(good, n - 5), { kind: 'is-small', disabled: n < 1 }),
                btn('−', () => setN(good, n - 1), { kind: 'is-small', disabled: n < 1 }),
                h('output', {}, String(n)),
                btn('+', () => setN(good, n + 1), { kind: 'is-small' }),
                btn('+5', () => setN(good, n + 5), { kind: 'is-small' }),
              ),
            )
          : null,
      );
    });

    const basket = Object.entries(b.items).map(([good, it]) => ({ good, n: it.n, tier: it.tier }));
    const q = P.quote(game, id, basket, b.rush);
    const travel = Math.max(0, Math.round(q.arrive - now(game.state)));
    const rushQ = sup.flat ? null : P.quote(game, id, basket, true);
    const next = LEVELS[level + 1];

    const bill = h(
      'div',
      { class: 'hd-card' },
      h('strong', {}, 'Je bestelling'),
      basket.length
        ? h(
            'div',
            { class: 'hd-sum' },
            ...q.lines.map((l) => h('div', {}, h('span', {}, `${l.n}× ${P.goodName(l.good)}${l.tier === 'standaard' ? '' : ` (${TIERS[l.tier].name.toLowerCase()})`}`), h('span', {}, euro(l.total)))),
            q.bulk ? h('div', {}, h('span', {}, `Inclusief ${Math.round(q.bulk * 100)}% staffelkorting`), h('span', {}, '')) : h('div', {}, h('span', { class: 'hd-sub' }, 'Vanaf 10 stuks staffelkorting'), h('span', {}, '')),
            q.fee ? h('div', {}, h('span', {}, 'Bezorgkosten (onder €40)'), h('span', {}, euro(q.fee))) : null,
            q.rushFee ? h('div', {}, h('span', {}, 'Spoedtoeslag'), h('span', {}, euro(q.rushFee))) : null,
            h('div', { class: 'is-total' }, h('span', {}, `Totaal (${q.units} stuks)`), h('span', {}, euro(q.total))),
          )
        : h('div', { class: 'hd-sub' }, 'Kies met + en − wat je wilt bestellen.'),
      basket.length && q.lines.length ? h('div', { class: 'hd-sub' }, `Bezorgd ${whenText(q.arrive, day)} (over ${Math.floor(travel / 60)} uur ${travel % 60} min) bij de brievenbus van je hut.`) : null,
      sup.flat
        ? h('div', { class: 'hd-sub' }, 'Sjaak komt altijd snel, ook \'s nachts.')
        : btn(b.rush ? `✔ Spoed aan (+${euro(rushQ?.rushFee ?? 0)})` : `Spoed: sneller, ${basket.length ? `+${euro(rushQ?.rushFee ?? 0)}` : 'tegen toeslag'}`, () => ((b.rush = !b.rush), redraw()), { kind: b.rush ? 'is-on' : '' }),
      ...(basket.length ? q.errors.slice(0, 3).map((e) => note(e, 'is-bad')) : []),
      btn(`Bestellen${q.total ? ` (${euro(q.total)})` : ''}`, () => {
        const r = P.placeOrder(game, id, basket, b.rush);
        if (!r.ok) return toast(r.reason);
        baskets[id] = { items: {}, rush: false };
        toast(`Besteld bij ${sup.name}: bezorging ${whenText(r.order.arriveAt, day)}.`);
        onChange();
        orders();
      }, { kind: 'is-primary', disabled: !q.ok || !q.affordable }),
      basket.length && q.ok && !q.affordable ? note(`Je hebt ${euro(game.state.cash)}, dit kost ${euro(q.total)}.`, 'is-bad') : null,
    );

    page(
      sup.name,
      h(
        'div',
        { class: 'hd' },
        btn('‹ Alle leveranciers', back, { kind: 'hd-back' }),
        h(
          'div',
          { class: 'hd-card' },
          h('div', { class: 'hd-row' }, avatar('supplier', { ...sup, id }, { big: true }), h('div', { class: 'hd-grow' }, h('div', { class: 'hd-name' }, `${sup.icon} ${sup.name}`), h('div', { class: 'hd-sub' }, sup.title), h('div', { class: 'hd-sub' }, `“${sup.line}”`))),
          h('div', { class: 'hd-row hd-between' }, chip(LEVELS[level].name, level ? 'good' : 'dim'), h('span', { class: 'hd-sub' }, next ? `${Math.round(P.levelProgress(game, id) * 100)}% naar ${next.name}` : 'Hoogste niveau')),
          bar(P.levelProgress(game, id)),
          h('div', { class: 'hd-sub' }, LEVEL_PERKS[level]),
          next ? h('div', { class: 'hd-sub' }, `Straks: ${LEVEL_PERKS[level + 1]}`) : null,
          h('div', { class: 'hd-sub' }, `Minimaal ${sup.minUnits} stuks · maximaal ${maxOrder(level)} · reistijd ongeveer ${Math.floor(sup.base / 60)} uur ${sup.base % 60 ? `${sup.base % 60} min` : ''}`),
        ),
        open ? null : note(`${sup.name} werkt pas voor je vanaf rang ${RANKS[sup.rank]}.`, 'is-bad'),
        h('div', { class: 'hd-card' }, h('strong', {}, 'Vandaag in de aanbieding'), ...rows),
        open ? bill : null,
      ),
    );
  };
}
