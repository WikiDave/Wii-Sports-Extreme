// The talk with a customer: who they are (trust, likes, dislikes), what they say, what to sell, how
// many, at which price, and how they react. A customer who already bought today (or is angry, or
// you have nothing on you) only chats. At a front door (c.visit === 'deur') you sell safely and a
// bit dearer.

import { h, modal } from '../../ui/dom.js';
import { snapshotImage } from '../../mii/thumbs.js';
import { EFFECTS } from '../data/effects.js';
import { PRODUCTS } from '../data/products.js';
import { CUSTOMERS } from '../data/customers.js';
import { itemName, parseItem, qualityLabel } from '../economy.js';
import { OFFERS, deal, valueFor, record, MAX_LOYALTY, maxQtyOf, budgetOf, boycotted, wantsToday, wishProduct, fitsWish, isUnlocked } from '../customers.js';
import { activeRequest, fitsRequest, completeRequest, REQUEST_BONUS } from '../phone.js';
import { appraise, MOOD, fxOf } from '../klanten/appraise.js';
import { lineFor } from '../klanten/lines.js';
import { TYPES } from '../klanten/types.js';
import { tierIndex, tierOf, toNextTier } from '../klanten/tiers.js';
import { routineHint } from '../klanten/timeline.js';
import { miiFor } from '../klanten/looks.js';
import { introduction } from '../klanten/unlock.js';
import { rivalAt, RIVAL_FACTOR } from '../rivals.js';
import { priceFactor } from '../weather.js';

export const DOOR_BONUS = 1.1;

const offerLabel = (loyalty) => ({ laag: tierIndex(loyalty) >= 2 ? 'Stamkorting' : 'Voordelig', eerlijk: 'Eerlijk', hoog: 'Duur' });
const euro = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;

/** The effect chips of a customer: loved ones coloured, the disliked one crossed out. */
export function effectChips(c) {
  return [
    ...c.likes.map((e) => h('span', { class: 'kl-chip', style: { '--fx': EFFECTS[e].color } }, EFFECTS[e].name)),
    ...(c.dislikes ?? []).map((e) => h('span', { class: 'kl-chip is-no', title: 'Houdt hier niet van' }, `✗ ${EFFECTS[e].name}`)),
  ];
}

/** A round face of the customer, filled in when the snapshot is ready. */
export function portrait(c, cls = 'kl-portrait', size = 128, isCancelled = null) {
  const img = h('img', { class: cls, alt: '', width: 76, height: 76 });
  try {
    snapshotImage(img, miiFor(c), { view: 'face', size }, isCancelled);
  } catch {
    img.classList.add('is-loading');
  }
  return img;
}

/**
 * opts.factor: price factor (a rival at the spot, weather); opts.onDone(result) after a deal.
 * A customer that is talked to at a door (c.visit === 'deur') pays DOOR_BONUS more and the
 * deal does not count for the guards (onDone is not called for a sale).
 */
export function openDealMenu(game, c, { factor = 1, onDone } = {}) {
  const state = game.state;
  const door = c.visit === 'deur';
  const baseFactor = factor * (door ? DOOR_BONUS : 1);
  const rec = record(state, c.id);
  const request = activeRequest(state, c.id);
  const rival = c.spot ? rivalAt(state, c.spot) : null;
  const weatherFactor = priceFactor(state.day);
  const body = h('div', { class: 'kl-deal' });
  let said = '';
  let closed = false;
  const dlg = modal({
    title: door ? `Bij de deur van ${c.name}` : c.name,
    body,
    actions: [{ label: 'Weg' }],
    onClose: () => {
      closed = true;
      // After the talk the customer calls out a last word above their head.
      if (said) game.emit('klanten:say', { customer: c.id, text: said });
    },
  });
  const closeBtn = () => dlg.dialog.querySelector('.modal-actions .btn');
  const stock = () => Object.keys(state.inventory).filter((k) => parseItem(k) && state.inventory[k] > 0);
  const maxQty = () => maxQtyOf(c, rec.loyalty);
  let qty = Math.max(1, Math.min(maxQty(), request?.qty ?? 3));

  const trustBar = () => {
    const next = toNextTier(rec.loyalty);
    return h(
      'div',
      { class: 'kl-trust' },
      h('div', { class: 'kl-bar', title: `${rec.loyalty}/${MAX_LOYALTY}` }, h('span', { style: { width: `${rec.loyalty}%` } })),
      h('span', {}, next ? `Vertrouwen ${rec.loyalty} · nog ${next.points} tot ${next.tier.name.toLowerCase()}` : `Vertrouwen ${rec.loyalty} · hoger kan niet!`),
    );
  };
  const head = () =>
    h(
      'div',
      { class: 'kl-head' },
      portrait(c, 'kl-portrait', 128, () => closed),
      h(
        'div',
        { class: 'kl-who' },
        h('div', { class: 'kl-type' }, `${TYPES[c.type].icon} ${TYPES[c.type].name} · ${tierOf(rec.loyalty).icon} ${tierOf(rec.loyalty).name}`),
        trustBar(),
        h('div', { class: 'kl-chips' }, ...effectChips(c)),
      ),
    );
  const facts = () => {
    const parts = [`Budget ${euro(c.budget)}`, `max ${maxQty()} stuks`, `wil graag ${PRODUCTS[c.prefers].name.toLowerCase()}`, `verwacht ${qualityLabel(c.standard)}`];
    return h('div', { class: 'kl-facts' }, ...parts.map((p) => h('span', {}, p)));
  };
  const speech = (text, event, mood = true) => {
    said = text;
    return h('div', { class: 'kl-say' }, mood ? h('span', { class: 'kl-mood' }, MOOD[event] ?? '🙂') : '', text);
  };
  const frame = (...content) => {
    body.replaceChildren(head(), ...content);
  };

  // ---------------------------------------------------------------- chatting
  const friendHint = () => {
    // A friend of theirs you almost get to know.
    const friend = CUSTOMERS.find((x) => introduction(x)?.by === c.id && !isUnlocked(state, x, game.rank) && introduction(x).need - rec.loyalty <= 12);
    return friend ? 'Ik ken iemand die ook wel iets lekkers lust. Blijf zo doorgaan!' : '';
  };
  const chat = (event, extra = []) => {
    const wish = wishProduct(c, game.rank);
    frame(
      speech(lineFor(c.voice, event, {}), event),
      ...extra,
      h('p', { class: 'kl-small' }, `${c.name} is ${routineHint(c)}.`),
      friendHint() ? h('div', { class: 'kl-note' }, friendHint()) : '',
      wish ? h('div', { class: 'kl-note' }, `Heb je ooit ${PRODUCTS[wish].name.toLowerCase()}? Daar zou ${c.name} veel voor geven!`) : '',
    );
    closeBtn().textContent = 'Tot ziens';
  };

  // ---------------------------------------------------------------- selling
  /** How many units the customer buys at a unit price: stock, the stepper, their limit and their budget. */
  const unitsAt = (key, price) => Math.min(qty, state.inventory[key] ?? 0, maxQty(), Math.floor(budgetOf(c, rec.loyalty) / Math.max(1, price)));
  const affordable = (key) => unitsAt(key, Math.round(valueFor(c, key) * baseFactor)) >= 1;

  const sell = (note = null, event = request ? 'request' : 'greet') => {
    const keys = stock().sort((a, b) => affordable(b) - affordable(a) || valueFor(c, b) - valueFor(c, a));
    qty = Math.max(1, Math.min(qty, maxQty()));
    const best = affordable(keys[0]) ? keys[0] : null;
    frame(
      speech(note?.line ?? lineFor(c.voice, event, {}), note?.reaction ?? event),
      facts(),
      note?.text ? h('div', { class: 'kl-note is-warn' }, note.text) : '',
      door ? h('div', { class: 'kl-note' }, `Aan de deur: de bewaking ziet niets, en ${c.name} betaalt ${Math.round((DOOR_BONUS - 1) * 100)}% extra.`) : '',
      request ? h('div', { class: 'kl-note' }, `Je afspraak: ${request.qty}× ${request.product ? PRODUCTS[request.product].name.toLowerCase() + ' met ' : 'iets '}${EFFECTS[request.effect].name.toLowerCase()}, met +${Math.round((REQUEST_BONUS - 1) * 100)}% bonus.`) : '',
      rival ? h('div', { class: 'kl-note is-warn' }, `${rival.name} staat hier: ze betalen ${Math.round((1 - RIVAL_FACTOR) * 100)}% minder.`) : '',
      Math.abs(weatherFactor - 1) > 0.01 ? h('div', { class: `kl-note ${weatherFactor < 1 ? 'is-warn' : ''}` }, `Door het weer en de dag betalen ze vandaag ${Math.round(Math.abs(weatherFactor - 1) * 100)}% ${weatherFactor < 1 ? 'minder' : 'meer'}.`) : '',
      best ? '' : h('div', { class: 'kl-note is-warn' }, `Wat je bij je hebt is te duur voor het budget van ${c.name} (${euro(budgetOf(c, rec.loyalty))}).`),
      h(
        'div',
        { class: 'kl-qty' },
        h('span', {}, 'Aantal'),
        h('button', { class: 'btn', type: 'button', 'aria-label': 'Minder', disabled: qty <= 1, onClick: () => ((qty -= 1), sell(note, event)) }, '−'),
        h('b', {}, String(qty)),
        h('button', { class: 'btn', type: 'button', 'aria-label': 'Meer', disabled: qty >= maxQty(), onClick: () => ((qty += 1), sell(note, event)) }, '+'),
      ),
      h('div', { class: 'kl-items' }, ...keys.map((key) => item(key, key === best && keys.length > 1))),
    );
    closeBtn().textContent = 'Weg';
  };

  const item = (key, isBest) => {
    const ap = appraise(c, key);
    const fits = request && fitsRequest(request, key) && fitsWish(request, key);
    const mult = baseFactor * (fits ? REQUEST_BONUS : 1);
    const have = state.inventory[key];
    const react = ap.disliked.length
      ? `😖 Houdt niet van ${EFFECTS[ap.disliked[0]].name.toLowerCase()}`
      : ap.gap < 0
        ? `😕 Verwacht ${qualityLabel(c.standard)}`
        : ap.liked.length
          ? `${ap.liked.length > 1 ? '😍' : '🙂'} Houdt van ${ap.liked.map((e) => EFFECTS[e].name.toLowerCase()).join(' en ')}`
          : '😐 Niets bijzonders';
    const labels = offerLabel(rec.loyalty);
    return h(
      'div',
      { class: `kl-item ${isBest ? 'is-best' : ''}` },
      h('div', { class: 'kl-item-top' }, h('span', {}, itemName(key)), h('small', {}, `${have}× in je tas${ap.preferred ? ' · hun favoriet' : ''}`)),
      h('div', { class: 'kl-react' }, react + (fits ? ' · past bij de afspraak' : '')),
      h(
        'div',
        { class: 'kl-offers' },
        ...Object.keys(OFFERS).map((offer) => {
          const price = Math.round(valueFor(c, key) * OFFERS[offer] * mult);
          const n = unitsAt(key, price);
          return h(
            'button',
            { class: 'btn kl-offer', type: 'button', disabled: n < 1, title: n < 1 ? 'Past niet in het budget' : '', onClick: () => offered(key, offer, fits, mult) },
            h('span', {}, labels[offer]),
            h('b', {}, euro(price)),
            h('small', {}, n < 1 ? 'te duur' : `${n}× = ${euro(price * n)}`),
          );
        }),
      ),
    );
  };

  const offered = (key, offer, fits, mult) => {
    const r = deal(game, c, key, qty, offer, mult);
    if (fits && r.ok) completeRequest(game, request, r.sold);
    if (!(door && r.ok)) onDone?.(r);
    if (!r.ok && r.retry) {
      sell({ line: r.line, reaction: r.reaction, text: `${c.name} blijft nog even staan. Probeer een lagere prijs.` });
      return;
    }
    result(r, fits && r.ok && r.sold >= request.qty);
  };

  const result = (r, requestDone) => {
    const delta = r.delta ?? 0;
    frame(
      h(
        'div',
        { class: 'kl-result' },
        h('div', { class: 'kl-face' }, MOOD[r.reaction] ?? '🙂'),
        speech(r.line || r.message, r.reaction, false),
        h('div', { class: 'kl-sum' }, r.ok ? `${c.name} koopt ${r.sold}× voor ${euro(r.money)}${r.tip ? ` + ${euro(r.tip)} fooi` : ''}` : r.message),
        delta ? h('div', { class: delta > 0 ? 'kl-gain' : 'kl-loss' }, `Vertrouwen ${delta > 0 ? '+' : ''}${delta}`) : '',
        r.tipLine ? h('div', { class: 'kl-small' }, `"${r.tipLine}"`) : '',
        r.tierUp ? h('div', { class: 'kl-tierup' }, `${r.tierUp.icon} ${c.name} is nu ${r.tierUp.name.toLowerCase()}!`, r.tierLine ? h('div', { class: 'kl-small' }, `"${r.tierLine}"`) : '') : '',
        requestDone ? h('div', { class: 'kl-note' }, 'Afspraak nagekomen! Bonus verdiend.') : '',
        r.tipOff ? h('div', { class: 'kl-note is-warn' }, `${c.name} gaat het doorvertellen aan de bewaking...`) : '',
        r.boycott ? h('div', { class: 'kl-note is-warn' }, `${c.name} wil je twee dagen niet zien.`) : '',
      ),
    );
    closeBtn().textContent = 'Klaar';
  };

  // ---------------------------------------------------------------- what to show first
  if (boycotted(state, c)) chat('boycott', [h('div', { class: 'kl-note is-warn' }, `${c.name} wil je even niet zien.`)]);
  else if (!stock().length) chat(request ? 'request' : 'greet', [h('div', { class: 'kl-note' }, `${c.name} wil graag iets kopen, maar je hebt niets bij je.`)]);
  else if (!wantsToday(state, c)) chat('again', [h('div', { class: 'kl-note' }, `${c.name} heeft vandaag al gekocht.`)]);
  else sell();
  return dlg;
}
