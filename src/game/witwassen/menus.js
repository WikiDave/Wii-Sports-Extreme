// The menus of the laundering layer: a business (wash and upgrade), buying one, the harbour ATM,
// the taxman's visit and what came of it. DOM only: the rules live in laundering.js, bank.js and audit.js.

import { h, modal, toast } from '../../ui/dom.js';
import { BUSINESSES, UPGRADE_IDS, UPGRADE_LABEL, INSPECTORS } from './data.js';
import { RANKS } from '../state.js';
import { wState, bizOf, dirtyHand, rollBiz } from './store.js';
import { cover, feeRate, safeLeft, upgradeCost, revenue } from './rules.js';
import { bizRow } from './summary.js';
import { maxWash, safeWash, previewWash, launder, upgrade, buyBusiness } from './laundering.js';
import { atmDeposit, atmWithdraw, dirtyLeft, withdrawLeft } from './bank.js';
import { inspect, canBribe, bribeCost, bribeOdds, resolveAudit } from './audit.js';
import { BANK_LIMIT_TEXT } from './texts.js';

const eur = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
const pct = (f) => `${Math.round(f * 100)}%`;
const stat = (label, value) => h('div', { class: 'wit-stat' }, h('small', {}, label), h('strong', {}, value));
const bar = (value, max, cls = '') => h('div', { class: `wit-bar ${cls}` }, h('i', { style: { width: `${Math.round(Math.min(1, value / Math.max(1, max)) * 100)}%` } }));
const AMOUNTS = [100, 250, 500, 1000];

/** A business: the day's washing, the books, the fee, the upgrades. */
export function openBusiness(game, id, onChange = () => {}) {
  const d = BUSINESSES[id];
  let amt = 250;
  const body = h('div', { class: 'shop wit' });
  const draw = () => {
    const s = game.state;
    const b = bizOf(game, id);
    if (!b) return;
    rollBiz(b, s.day);
    const row = bizRow(game, id);
    const max = maxWash(game, id);
    const safe = safeWash(game, id);
    const dirty = dirtyHand(game);
    const can = max > 0 && row.open;
    if (amt > max) amt = Math.max(0, max);
    const p = amt > 0 ? previewWash(id, b, amt) : null;
    const left = safeLeft(id, b, s.day);
    body.replaceChildren(
      h('p', { class: 'wit-blurb' }, d.blurb),
      h('div', { class: 'wit-stats' }, stat('Commissie', pct(feeRate(id, b))), stat('Dekking per dag', eur(cover(id, b))), stat('Capaciteit per dag', eur(row.cap)), stat('Eerlijke omzet vandaag', eur(revenue(id, b, s.day)))),
      h('p', { class: row.open ? 'wit-ok' : 'wit-warn' }, row.open ? 'Open vandaag.' : 'Vandaag dicht: de lonen waren niet te betalen. Morgen weer.'),
      h('div', { class: 'wit-meter' }, h('span', {}, `Vandaag gewassen: ${eur(row.used)} van ${eur(row.cap)}`)),
      bar(row.used, row.cap, row.used > row.safe ? 'is-hot' : ''),
      h('div', { class: 'wit-meter' }, h('span', {}, `Verdachtheid van de boeken: ${row.word}`), h('small', {}, `${row.suspicion}/100`)),
      bar(row.suspicion, 100, row.suspicion >= 65 ? 'is-hot' : ''),
      h('h3', {}, 'Zwart geld door de zaak'),
      h('p', {}, `Zwart geld op zak: ${eur(dirty)}. Vandaag nog ${eur(max)} kwijt aan deze zaak.`),
      h(
        'div',
        { class: 'wit-amounts' },
        ...AMOUNTS.map((a) => h('button', { class: `btn btn-small ${amt === a ? 'btn-primary' : ''}`, type: 'button', disabled: !can || a > max, onClick: () => ((amt = a), draw()) }, eur(a))),
        h('button', { class: `btn btn-small ${amt === max && max > 0 ? 'btn-primary' : ''}`, type: 'button', disabled: !can, onClick: () => ((amt = max), draw()) }, 'Zoveel mogelijk'),
      ),
      p
        ? h('p', {}, `De zaak houdt ${eur(p.fee)} aan commissie. ${eur(p.out)} komt schoon op je bank.`)
        : h('p', { class: 'wit-small' }, dirty > 0 ? 'Kies een bedrag.' : 'Je hebt geen zwart geld op zak.'),
      amt > 0 && amt > left
        ? h('p', { class: 'wit-warn' }, `Boven de dekking (${eur(left)} over): de Fiscus let hier op.`)
        : h('p', { class: 'wit-ok' }, `Binnen de dekking: nog ${eur(left)} rustig te wassen.`),
      h(
        'div',
        { class: 'wit-actions' },
        h('button', { class: 'btn btn-primary', type: 'button', disabled: !can || amt <= 0, onClick: () => wash() }, amt > 0 ? `Was ${eur(amt)}` : 'Was'),
      ),
      h('h3', {}, 'Verbeteren'),
      ...UPGRADE_IDS.map((kind) => {
        const level = b.up[kind];
        const cost = upgradeCost(id, kind, level);
        const u = d.upgrades[kind];
        return h(
          'div',
          { class: 'shop-row wit-upgrade' },
          h('span', { class: 'shop-name' }, `${u.name}: ${u.text}`),
          h('span', { class: 'wit-pips' }, ...[1, 2, 3].map((i) => h('i', { class: i <= level ? 'is-on' : '' }))),
          h('small', {}, UPGRADE_LABEL[kind](level)),
          cost == null
            ? h('span', { class: 'shop-have' }, 'Hoogste niveau')
            : h('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: game.state.cash + game.state.bank < cost, onClick: () => doUpgrade(kind) }, `Upgrade ${eur(cost)}`),
        );
      }),
    );
  };
  const wash = () => {
    const r = launder(game, id, amt);
    if (!r.ok) toast(r.reason);
    else toast(r.risky ? `${eur(r.out)} schoon op je bank. Wel boven de dekking: let op de Fiscus.` : `${eur(r.out)} schoon op je bank (commissie ${eur(r.fee)}).`);
    onChange();
    draw();
  };
  const doUpgrade = (kind) => {
    const r = upgrade(game, id, kind);
    toast(r.ok ? `Verbeterd naar niveau ${r.level}.` : r.reason);
    onChange();
    draw();
  };
  draw();
  modal({ title: d.name, body, wide: true, actions: [{ label: 'Klaar', kind: 'primary' }] });
}

/** Buy a business: its numbers, the price and the rank it needs. */
export function openBuy(game, id, onChange = () => {}) {
  const d = BUSINESSES[id];
  const body = h(
    'div',
    { class: 'shop wit' },
    h('p', { class: 'wit-blurb' }, d.blurb),
    h('div', { class: 'wit-stats' }, stat('Prijs', eur(d.price)), stat('Vanaf', RANKS[d.rank]), stat('Dekking per dag', eur(d.cover)), stat('Commissie', pct(d.fee)), stat('Eerlijke omzet', `${eur(d.revenue)} per dag`), stat('Lonen', `${eur(d.staff)} per dag`)),
    h('p', {}, `Zwart geld wassen gaat tot ${eur(d.capacity)} per dag. Hoe netter de boeken, hoe rustiger de Fiscus.`),
    h('p', { class: 'wit-small' }, `Je hebt ${eur(game.state.cash)} contant en ${eur(game.state.bank)} op de bank. Eerst de bank, dan het contante geld.`),
  );
  modal({
    title: d.name,
    body,
    actions: [
      { label: 'Later' },
      {
        label: `Kopen voor ${eur(d.price)}`,
        kind: 'primary',
        onClick: () => {
          const r = buyBusiness(game, id);
          if (!r.ok) {
            toast(r.reason);
            return false; // keep the dialog open
          }
          toast(`${d.short} is van jou! Loop er naartoe om zwart geld te wassen.`);
          onChange();
        },
      },
    ],
  });
}

/** The harbour ATM: deposit (unlaundered cash up to today's limit) and withdraw (up to the daily limit). */
export function openAtm(game) {
  const body = h('div', { class: 'shop wit' });
  const draw = () => {
    const s = game.state;
    body.replaceChildren(
      h('div', { class: 'bank-card wit-card' }, h('small', {}, 'Op de bank'), h('strong', {}, eur(s.bank)), h('small', {}, `Contant: ${eur(s.cash)} · waarvan zwart: ${eur(dirtyHand(game))}`)),
      h('p', { class: 'wit-small' }, BANK_LIMIT_TEXT(dirtyLeft(game, 'atm'), 'atm')),
      h('p', {}, 'Storten'),
      h(
        'div',
        { class: 'bank-row' },
        ...[50, 100, 500, 1000].map((a) => h('button', { class: 'btn btn-small', type: 'button', disabled: s.cash < a, onClick: () => dep(a) }, eur(a))),
        h('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: s.cash < 1, onClick: () => dep(s.cash) }, 'Alles'),
      ),
      h('p', {}, `Opnemen (vandaag nog ${eur(withdrawLeft(game))})`),
      h(
        'div',
        { class: 'bank-row' },
        ...[50, 100, 500, 1000].map((a) => h('button', { class: 'btn btn-small', type: 'button', disabled: s.bank < a || withdrawLeft(game) <= 0, onClick: () => wd(a) }, eur(a))),
        h('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: s.bank < 1 || withdrawLeft(game) <= 0, onClick: () => wd(s.bank) }, 'Alles'),
      ),
    );
  };
  const dep = (a) => {
    const r = atmDeposit(game, a);
    if (!r.ok) toast(r.reason);
    else toast(r.short ? `${eur(r.amount)} gestort. De rest wil de pin vandaag niet hebben.` : `${eur(r.amount)} op je rekening.`);
    draw();
  };
  const wd = (a) => {
    const r = atmWithdraw(game, a);
    toast(r.ok ? `${eur(r.amount)} opgenomen.${r.short ? ' Je daglimiet is op.' : ''}` : r.reason);
    draw();
  };
  draw();
  modal({ title: 'Pinautomaat', body, actions: [{ label: 'Klaar', kind: 'primary' }] });
}

/**
 * The inspector of the Fiscus talks to you: the books, and an offer of coffee money when a fine
 * is coming. Settles the visit (resolveAudit) and shows the result.
 */
export function openAudit(game, onDone = () => {}) {
  const w = wState(game);
  const a = w.audit;
  const b = a ? bizOf(game, a.id) : null;
  if (!a || !b) return toast('De Fiscus is er nu niet.');
  rollBiz(b, game.state.day);
  const report = inspect(a.id, b, a.day);
  const who = INSPECTORS[a.who % INSPECTORS.length];
  const expect =
    report.verdict === 'goed'
      ? 'De cijfers kloppen. Hij verwacht een goed rapport.'
      : report.verdict === 'waarschuwing'
        ? 'Een beetje veel, maar een waarschuwing is het enige.'
        : `Dit klopt niet: zonder uitleg komt er een boete van ${eur(report.fine)}.`;
  const body = h(
    'div',
    { class: 'wit-audit' },
    h('div', { class: 'wit-quote' }, h('span', { class: 'wit-badge' }, '🏛️'), h('div', {}, h('strong', {}, who.name), h('p', {}, `“${who.quip}”`))),
    h('p', {}, `${BUSINESSES[a.id].short}: deze week ${eur(report.washed)} gewassen. De boeken kunnen ${eur(report.allowed)} verklaren.`),
    h('p', { class: report.verdict === 'goed' ? 'wit-ok' : 'wit-warn' }, expect),
  );
  const settle = (opts) => {
    const r = resolveAudit(game, opts);
    if (r) openAuditResult(r);
    onDone(r);
  };
  const actions = [{ label: 'Even wegwezen' }];
  if (canBribe(game, report)) {
    actions.push({
      label: `Koffiegeld (${eur(bribeCost(report))}, kans ${Math.round(bribeOdds(report) * 100)}%)`,
      onClick: () => settle({ present: true, bribe: true }),
    });
  }
  actions.push({ label: 'Boeken laten zien', kind: 'primary', onClick: () => settle({ present: true }) });
  modal({ title: `Bezoek van de Fiscus`, body, actions });
}

const TITLES = { goed: 'Goedgekeurd!', waarschuwing: 'Waarschuwing', boete: 'Boete', omgekocht: 'Koffiegeld werkt', betrapt: 'Betrapt!' };

/** The result of a visit: what he wrote down, what it costs. */
export function openAuditResult(r) {
  const lines = [`Deze week ${eur(r.report.washed)} gewassen, ${eur(Math.round(r.report.allowed))} uitlegbaar.`];
  if (!r.present) lines.push('Je was er niet bij: de boete is een kwart hoger.');
  if (r.spent) lines.push(`Koffiegeld: ${eur(r.spent)}.`);
  if (r.fine) lines.push(`Boete: ${eur(r.fine)}${r.unpaid ? `, waarvan ${eur(r.unpaid)} niet betaald kon worden` : ''}.`);
  if (r.heat > 0) lines.push('De Reglement-meter stijgt.');
  modal({
    title: TITLES[r.outcome] ?? 'De Fiscus',
    body: h('div', { class: 'wit-audit' }, h('div', { class: 'wit-quote' }, h('span', { class: 'wit-badge' }, '🏛️'), h('div', {}, h('strong', {}, r.who.name), h('p', {}, `“${r.text}”`))), ...lines.map((l) => h('p', {}, l))),
    actions: [{ label: 'Klaar', kind: 'primary' }],
  });
}

