// The panel of one seller: skills, route, stock, cash pouch, tip and fire. Used inside the phone
// app (inPerson false: money goes to the bank) and in the chat with the seller in the world
// (inPerson true: money in cash). It redraws itself after every action.

import { h } from '../../ui/dom.js';
import { itemName, parseItem } from '../economy.js';
import { RANKS } from '../state.js';
import { BANK_FEE, ROUTES, ROUTE_IDS, STOCK_MAX, candidateById, pouchCap } from './data.js';
import { avatar } from './looks.js';
import * as S from './sellers.js';
import { catchChanceToday } from './sim.js';
import { bar, btn, chip, euro, note, stars } from './ui.js';

export const loyaltyLabel = (l) => (l < 15 ? 'Wil weg' : l < 35 ? 'Onbetrouwbaar' : l < 55 ? 'Twijfelt' : l < 80 ? 'Betrouwbaar' : 'Trouw');
const routeName = (z) => (z ? ROUTES[z].name : 'Bij de hut');

export function sellerPanel(game, id, { inPerson = false, toast = () => {}, onGone = () => {}, onChange = () => {} } = {}) {
  const root = h('div', { class: 'hd' });
  let confirmFire = false;

  const say = (r, okText) => {
    if (!r.ok) toast(r.reason);
    else if (okText) toast(okText);
    confirmFire = false;
    render();
    onChange();
  };

  function render() {
    const s = S.sellerById(game, id);
    if (!s) {
      onGone();
      return;
    }
    const c = candidateById(id);
    const cap = pouchCap(game.rank);
    const carry = S.stockCount(s);
    const mine = Object.entries(game.state.inventory).filter(([k]) => parseItem(k));
    const risk = s.zone ? catchChanceToday(game, s) : 0;
    const needs = S.needs(game, s);

    const head = h(
      'div',
      { class: 'hd-row' },
      avatar('seller', c, { big: true }),
      h('div', { class: 'hd-grow' }, h('div', { class: 'hd-name' }, c.name), h('div', { class: 'hd-sub' }, c.line), h('div', { class: 'hd-row hd-wrap' }, chip(routeName(s.zone), s.zone ? '' : 'dim'), chip(`${loyaltyLabel(s.loyalty)}`, s.loyalty < 35 ? 'warn' : 'good'))),
    );

    const skills = h(
      'div',
      { class: 'hd-card' },
      h('div', { class: 'hd-skill' }, h('span', {}, 'Prijsgevoel'), stars(c.prijs)),
      h('div', { class: 'hd-skill' }, h('span', {}, 'Discretie'), stars(c.disc)),
      h('div', { class: 'hd-skill' }, h('span', {}, 'Tempo'), stars(c.tempo)),
      h('div', { class: 'hd-skill' }, h('span', {}, 'Houdt zelf'), h('span', {}, `${c.cut}% van elke verkoop`)),
      h('div', { class: 'hd-skill' }, h('span', {}, 'Trouw'), bar(s.loyalty / 100)),
      s.loyalty < 55 ? h('div', { class: 'hd-sub' }, 'Let op: hij houdt soms een deel van de kas achter. Een fooi of een praatje helpt.') : null,
    );

    const route = s.zone ? ROUTES[s.zone] : null;
    const routes = h(
      'div',
      { class: 'hd-card' },
      h('strong', {}, 'Route'),
      h(
        'div',
        { class: 'hd-routes' },
        btn(h('span', {}, 'Bij de hut', h('br'), h('small', {}, 'rust, verkoopt niets')), () => say(S.setZone(game, id, null)), { kind: `hd-route ${s.zone ? '' : 'is-on'}` }),
        ...ROUTE_IDS.map((z) => {
          const r = ROUTES[z];
          const open = game.rank >= r.rank;
          return btn(h('span', {}, r.name, h('br'), h('small', {}, open ? `drukte ${'★'.repeat(r.stars.drukte)}` : `vanaf rang ${RANKS[r.rank]}`)), () => say(S.setZone(game, id, z), `${c.name} gaat naar ${r.name}.`), { kind: `hd-route ${s.zone === z ? 'is-on' : ''}`, disabled: !open });
        }),
      ),
      route
        ? h(
            'div',
            { class: 'hd-sub' },
            route.text,
            h('div', { class: 'hd-row hd-wrap' }, h('span', {}, 'Drukte ', stars(route.stars.drukte)), h('span', {}, 'Prijs ', stars(route.stars.prijs)), h('span', {}, 'Risico ', stars(route.stars.risico))),
            h('div', {}, `Kans dat een bewaker hem vandaag pakt: ongeveer ${Math.max(1, Math.round(risk * 100))}%.`),
          )
        : h('div', { class: 'hd-sub' }, 'Zonder route verkoopt hij niets. Kies hierboven een plek.'),
    );

    const stockRows = Object.entries(s.stock).map(([key, n]) =>
      h(
        'div',
        { class: 'hd-item' },
        h('div', { class: 'hd-row hd-between' }, h('span', { class: 'hd-name' }, itemName(key)), h('strong', {}, `×${n}`)),
        h('div', { class: 'hd-btns' }, btn('−1', () => say(S.takeStock(game, id, key, 1)), { kind: 'is-small' }), btn('Alles terug', () => say(S.takeStock(game, id, key, n)), { kind: 'is-small' })),
      ),
    );
    const giveRows = mine.map(([key, n]) =>
      h(
        'div',
        { class: 'hd-item' },
        h('div', { class: 'hd-row hd-between' }, h('span', { class: 'hd-name' }, itemName(key)), h('span', { class: 'hd-sub' }, `jij hebt ${n}`)),
        h(
          'div',
          { class: 'hd-btns' },
          btn('+1', () => say(S.giveStock(game, id, key, 1)), { kind: 'is-small', disabled: carry >= STOCK_MAX }),
          btn('+5', () => say(S.giveStock(game, id, key, 5)), { kind: 'is-small', disabled: carry >= STOCK_MAX }),
          btn('Zoveel mogelijk', () => say(S.giveStock(game, id, key, STOCK_MAX), 'Voorraad meegegeven.'), { kind: 'is-small', disabled: carry >= STOCK_MAX }),
        ),
      ),
    );
    const stock = h(
      'div',
      { class: 'hd-card' },
      h('div', { class: 'hd-row hd-between' }, h('strong', {}, 'Zijn voorraad'), chip(`${carry}/${STOCK_MAX}`, carry === 0 && s.zone ? 'warn' : '')),
      bar(carry / STOCK_MAX),
      ...(stockRows.length ? stockRows : [h('div', { class: 'hd-sub' }, s.zone ? 'Hij heeft niets meer te verkopen. Geef hem iets mee.' : 'Hij heeft niets bij zich.')]),
      h('strong', {}, 'Meegeven'),
      ...(giveRows.length ? giveRows : [h('div', { class: 'hd-sub' }, 'Je hebt geen producten in je voorraad. Maak er een in de stations bij je hut.')]),
    );

    const fee = Math.round(s.pouch * BANK_FEE);
    const till = h(
      'div',
      { class: `hd-card ${needs.includes('vol') ? 'is-warn' : ''}` },
      h('div', { class: 'hd-row hd-between' }, h('strong', {}, 'Kas van jouw deel'), h('span', { class: 'hd-big hd-money' }, euro(s.pouch))),
      bar(s.pouch / cap, s.pouch / cap > 0.7 ? 'is-risk' : ''),
      h('div', { class: 'hd-sub' }, `Hij stopt met verkopen bij ${euro(cap)}. Bewaar niet te veel bij hem: pakt een bewaker hem, dan is het geld weg.`),
      h(
        'div',
        { class: 'hd-btns' },
        inPerson ? btn(`Geld pakken (${euro(s.pouch)})`, () => collectWith('hand'), { kind: 'is-primary', disabled: s.pouch <= 0 }) : null,
        btn(inPerson ? 'Naar de bank' : `Laten overmaken (−${euro(fee)})`, () => collectWith('bank'), { kind: inPerson ? '' : 'is-primary', disabled: s.pouch <= 0 }),
      ),
      inPerson ? null : h('div', { class: 'hd-sub' }, `Via de telefoon betaal je ${Math.round(BANK_FEE * 100)}% kosten; het geld staat dan veilig op de bank. Persoonlijk ophalen is gratis.`),
    );

    const history = h(
      'div',
      { class: 'hd-card' },
      h('strong', {}, 'Sinds hij voor je werkt'),
      h('div', { class: 'hd-sub' }, `${s.sold} stuks verkocht, ${euro(s.earned)} voor jou. Vandaag: ${s.today.day === game.state.day ? s.today.sold : 0} stuks.`),
      s.skimmed > 0 ? note(`Kassaverschil: hij hield ${euro(s.skimmed)} voor zichzelf achter.`, 'is-bad') : null,
    );

    const actions = h(
      'div',
      { class: 'hd-card' },
      h('strong', {}, 'Omgang'),
      h(
        'div',
        { class: 'hd-btns' },
        btn('Fooi €20', () => say(S.tip(game, id, 20), `${c.name} is blij met de fooi.`), { disabled: game.state.cash < 20 }),
        btn('Fooi €50', () => say(S.tip(game, id, 50), `${c.name} is dolblij.`), { disabled: game.state.cash < 50 }),
        btn(confirmFire ? 'Zeker weten?' : 'Ontslaan', () => {
          if (!confirmFire) {
            confirmFire = true;
            render();
            return;
          }
          const r = S.fireSeller(game, id);
          toast(`${c.name} is ontslagen.${r.back ? ` ${r.back} stuks terug in je voorraad.` : ''}${r.left ? ` ${r.left} stuks nam hij mee.` : ''}${r.pouch ? ` Je kreeg ${euro(r.pouch)}.` : ''}`);
          onChange();
          onGone();
        }, { kind: 'is-danger' }),
      ),
    );

    root.replaceChildren(head, skills, routes, stock, till, history, actions);
  }

  function collectWith(mode) {
    const r = S.collect(game, id, mode);
    if (!r.ok) return say(r);
    const lost = r.skimmed > 0 ? ` Let op: er ontbreekt ${euro(r.skimmed)} aan de kas.` : '';
    toast(mode === 'hand' ? `${euro(r.net)} opgehaald.${lost}` : `${euro(r.net)} naar de bank (kosten ${euro(r.fee)}).${lost}`);
    return say({ ok: true });
  }

  render();
  root.refresh = render;
  return root;
}
