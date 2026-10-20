// Starts the feature "handel" in the island: wires the logic (sim.js, suppliers.js, freshness.js)
// to the world (sellers, mailbox, board), the phone apps and the HUD, and turns events into
// messages. Called by features/handel.js.
//
// Game events this feature emits (game.on):
//   'handel:levering' { order }          an order arrived in the crate at the hut
//   'handel:leeg' { seller }             a seller ran out of stock
//   'handel:vol' { seller }              a seller's pouch is full
//   'handel:gepakt' { seller, lost, pouch, zone }   a guard caught a seller
//   'handel:weg' { seller, took }        a seller quit and took the pouch
// Save data: game.state.ext.handel (see store.js).

import { unregisterApp } from '../phoneApps.js';
import { candidateById, STEP, SUPPLIERS } from './data.js';
import { Board } from './board.js';
import { trackFresh } from './freshness.js';
import { Mailbox } from './mailbox.js';
import { sellersApp, sellersUi } from './sellerApp.js';
import { SellerView } from './sellerView.js';
import { simulate } from './sim.js';
import { attentionCount } from './sellers.js';
import { handelState, notify } from './store.js';
import { STYLE } from './style.js';
import { suppliersApp, suppliersUi } from './supplierApp.js';
import * as P from './suppliers.js';
import { now } from './time.js';
import { euro } from './ui.js';

const TICK = 0.25; // seconds between two looks at the logic

export function startHandel(ctx) {
  const { game, toast, h, modal, audio, hudBar } = ctx;
  ctx.addStyle(STYLE);
  handelState(game);

  const view = new SellerView(ctx);
  const onChange = () => (chipT = 0);
  const openHandel = (tab = 'handelaren') => {
    const content = h('div', {});
    const tabs = h('div', { class: 'hd-btns' });
    const body = h('div', { class: 'hd-modal-body hd' }, tabs, content);
    const page = (title, ...c) => content.replaceChildren(h('h3', {}, title), ...c);
    const uis = {
      handelaren: sellersUi({ page, game, toast, onChange }),
      leveranciers: suppliersUi({ page, game, toast, onChange }),
    };
    const show = (t) => {
      tabs.replaceChildren(
        h('button', { class: `hd-btn ${t === 'handelaren' ? 'is-on' : ''}`, type: 'button', onClick: () => show('handelaren') }, '🧢 Handelaren'),
        h('button', { class: `hd-btn ${t === 'leveranciers' ? 'is-on' : ''}`, type: 'button', onClick: () => show('leveranciers') }, '📦 Leveranciers'),
      );
      uis[t].home();
    };
    show(tab);
    return modal({ title: 'Handel', body, wide: true, actions: [{ label: 'Sluiten', kind: 'primary' }] });
  };
  const mailbox = new Mailbox(ctx, { openWholesale: () => openHandel('leveranciers') });
  const board = new Board(ctx, { open: () => openHandel('leveranciers') });
  ctx.registerApp(sellersApp(onChange));
  ctx.registerApp(suppliersApp(onChange));

  // A small HUD button that shows up when something needs you (a delivery, an empty seller).
  const badge = h('i', { class: 'phone-badge' }, '0');
  const chip = h('button', { class: 'btn btn-round hd-hud', type: 'button', hidden: true, 'aria-label': 'Handel: er wacht iets op je', onClick: () => openHandel(P.crateUnits(handelState(game)) ? 'leveranciers' : 'handelaren') }, '🧢', badge);
  hudBar.append(chip);
  let chipT = 0;
  let lastChip = -1;
  let pulseTimer = 0;
  const showChip = () => {
    const n = attentionCount(game) + (P.crateUnits(handelState(game)) ? 1 : 0);
    if (n === lastChip) return;
    // It bounces for a few seconds when something new needs you.
    if (n > Math.max(0, lastChip)) {
      chip.classList.add('is-pulse');
      clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => chip.classList.remove('is-pulse'), 5000);
    }
    lastChip = n;
    chip.hidden = n === 0;
    badge.textContent = String(n);
  };

  // For other features and for tests: window.__game.ctx.handel
  ctx.handel = { view, mailbox, board, openHandel };
  const env = { guardNear: (zone) => view.guardsNear(zone) };
  const fresh = trackFresh(game);
  let acc = 0;
  let reportDay = handelState(game).lastDay;

  /** Turns what happened into toasts, phone messages and pictures. */
  function handle(events) {
    const lines = [];
    const few = events.length <= 12;
    for (const e of events) {
      const c = candidateById(e.seller);
      if (e.type === 'sale') {
        if (few && view.isShown(e.seller)) {
          view.popup(e.seller, `+${euro(e.money)}`);
          audio.tone(1175, 0.1, { type: 'sine', vol: 0.05 });
        }
      } else if (e.type === 'empty') {
        const text = `${c.name}: “Mijn voorraad is op! Kom je bijvullen?”`;
        notify(game, { kind: 'leeg', who: e.seller, text });
        lines.push(text);
        game.emit('handel:leeg', { seller: e.seller });
      } else if (e.type === 'full') {
        const text = `${c.name}: “Mijn zak zit vol. Kom je het geld ophalen?”`;
        notify(game, { kind: 'vol', who: e.seller, text });
        lines.push(text);
        game.emit('handel:vol', { seller: e.seller });
      } else if (e.type === 'caught') {
        const text = `${c.name} is gepakt door de bewaking! ${e.lost} stuks en ${euro(e.pouch)} zijn weg. Hij duikt een paar dagen onder.`;
        notify(game, { kind: 'gepakt', who: e.seller, text });
        lines.push(text);
        view.vanish(e.seller);
        audio.play('bad');
        game.emit('handel:gepakt', { seller: e.seller, lost: e.lost, pouch: e.pouch, zone: e.zone });
      } else if (e.type === 'quit') {
        const text = `${c.name} heeft ontslag genomen en nam ${euro(e.took)} uit de kas mee. Hij was je niet meer trouw.`;
        notify(game, { kind: 'weg', who: e.seller, text });
        lines.push(text);
        view.remove(e.seller);
        audio.play('bad');
        game.emit('handel:weg', { seller: e.seller, took: e.took });
      }
    }
    if (lines.length) {
      toast(`📱 ${lines[0]}${lines.length > 1 ? ` (+${lines.length - 1} meer)` : ''}`);
      if (!events.some((e) => e.type === 'caught' || e.type === 'quit')) audio.play('alert');
    }
    chipT = 0;
  }

  /** The report of a finished day, once the sellers' day has been settled. */
  function report() {
    const hs = handelState(game);
    if (hs.lastDay <= reportDay) return;
    const day = hs.lastDay - 1;
    reportDay = hs.lastDay;
    let units = 0;
    let money = 0;
    for (const s of hs.sellers) {
      if (s.today.day === day) {
        units += s.today.sold;
        money += s.today.money;
      }
    }
    if (!units) return;
    const text = `Dagrapport dag ${day}: je handelaren verkochten ${units} stuks. Jouw deel: ${euro(money)}.`;
    notify(game, { kind: 'rapport', who: '', text });
    toast(`📈 ${text}`);
  }

  function deliver() {
    for (const o of P.deliverDue(game)) {
      const sup = SUPPLIERS[o.supplier];
      const text = `📦 ${sup.name} heeft bezorgd: ${o.units} stuks staan bij de brievenbus bij je hut.`;
      notify(game, { kind: 'levering', who: o.supplier, text });
      toast(text);
      audio.play('alert');
      game.emit('handel:levering', { order: o });
    }
    chipT = 0;
  }

  return {
    update(t, dt, paused) {
      view.update(t, dt, paused);
      mailbox.update(t, dt);
      if (paused) return;
      acc += dt;
      chipT -= dt;
      if (acc >= TICK) {
        acc = 0;
        const hs = handelState(game);
        if (now(game.state) - hs.clock >= STEP) {
          handle(simulate(game, env));
          report();
        }
        if (P.hasDue(game)) deliver();
        const r = fresh.tick();
        if (r) {
          toast(`🍋 Verse ingrediënten: je batch is ${Math.round(r.bonus * 100)}% beter.`);
          audio.play('perfect');
        }
      }
      if (chipT <= 0) {
        chipT = 0.5;
        showChip();
      }
    },
    dispose() {
      fresh.dispose();
      clearTimeout(pulseTimer);
      unregisterApp('handelaren');
      unregisterApp('leveranciers');
      chip.remove();
      delete ctx.handel;
      view.dispose();
      mailbox.dispose();
      board.dispose();
    },
  };
}
