// Menus for making and trading: mixing a batch (hut), the market (Havenstad) and the
// beach stand that buys your products (until there are customers, step 2.4).

import { h, modal, toast } from '../../ui/dom.js';
import { EFFECTS } from '../data/effects.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { PRODUCTS, GOODS } from '../data/products.js';
import { recipeEffects, unitPrice, canMake, makeBatch, buy, sell, itemName, parseItem } from '../economy.js';
import { playPour } from '../minigames/pour.js';

const MAX_MIX = 3;
const STAND_SHARE = 0.6;

const chip = (effect) => h('span', { class: 'fx-chip', style: { '--fx': EFFECTS[effect].color } }, EFFECTS[effect].name);

/** Mixing a batch of a product: pick up to three ingredients in order, then pour. */
export function openMixMenu(game, productId = 'limonade') {
  const p = PRODUCTS[productId];
  const chosen = [];
  const preview = h('div', { class: 'mix-preview' });
  const picks = h('div', { class: 'mix-picks' });
  let go = null;
  const refresh = () => {
    const fx = recipeEffects(productId, chosen);
    const have = (id) => game.state.inventory[id] ?? 0;
    preview.replaceChildren(
      h('p', {}, `Nodig: ${Object.entries(p.needs).map(([id, n]) => `${n} ${GOODS[id].name.toLowerCase()} (je hebt ${have(id)})`).join(', ')}${chosen.length ? ' + ' + chosen.map((c) => INGREDIENTS[c].name.toLowerCase()).join(', ') : ''}.`),
      h('div', { class: 'fx-row' }, fx.map(chip)),
      h('p', { class: 'mix-price' }, `${p.yield} flesjes van ongeveer €${unitPrice(productId, fx)} per stuk.`),
    );
    picks.replaceChildren(
      ...Object.entries(INGREDIENTS).map(([id, ing]) => {
        const used = chosen.filter((c) => c === id).length;
        return h(
          'button',
          {
            class: `btn btn-small ${used ? 'btn-primary' : ''}`,
            type: 'button',
            disabled: chosen.length >= MAX_MIX || have(id) <= used,
            onClick: () => {
              chosen.push(id);
              refresh();
            },
          },
          `${ing.name} (${have(id)})`,
        );
      }),
      chosen.length ? h('button', { class: 'btn btn-small', type: 'button', onClick: () => (chosen.pop(), refresh()) }, 'Laatste eruit') : null,
    );
    if (go) go.disabled = !canMake(game.state.inventory, productId, chosen);
  };
  const dlg = modal({
    title: `${p.name} maken`,
    body: h('div', { class: 'mix' }, h('p', {}, 'Meng tot drie ingrediënten erdoor. De volgorde telt: een ingrediënt kan effecten die er al zijn veranderen.'), picks, preview),
    actions: [
      { label: 'Annuleren' },
      {
        label: 'Schenken',
        kind: 'primary',
        onClick: () => {
          if (!canMake(game.state.inventory, productId, chosen)) return false;
          const mixIn = [...chosen];
          playPour(document.body, { color: EFFECTS[recipeEffects(productId, mixIn).at(-1)].color }).then((quality) => {
            const key = makeBatch(game, productId, mixIn, quality);
            if (key) toast(`${p.yield}× ${itemName(key)}`);
          });
        },
      },
    ],
  });
  go = dlg.dialog.querySelector('.btn-primary:last-child');
  refresh();
}

/** The market: buy base goods and ingredients. */
export function openMarket(game) {
  const list = h('div', { class: 'shop' });
  const all = [...Object.entries(GOODS), ...Object.entries(INGREDIENTS)].filter(([id]) => !PRODUCTS[id]);
  const refresh = () => {
    list.replaceChildren(
      h('p', { class: 'shop-cash' }, `Je hebt €${game.state.cash}.`),
      ...all.map(([id, item]) =>
        h(
          'div',
          { class: 'shop-row' },
          h('span', { class: 'shop-name' }, `${item.name} — €${item.price}`),
          h('span', { class: 'shop-have' }, `${game.state.inventory[id] ?? 0} in bezit`),
          ...[1, 5].map((n) =>
            h(
              'button',
              {
                class: 'btn btn-small',
                type: 'button',
                disabled: game.state.cash < item.price * n,
                onClick: () => {
                  buy(game, id, n);
                  refresh();
                },
              },
              `+${n}`,
            ),
          ),
        ),
      ),
    );
  };
  refresh();
  modal({ title: 'Markt van Havenstad', body: list, actions: [{ label: 'Klaar', kind: 'primary' }] });
}

/** The beach stand buys your products at a fixed share of their value. */
export function openStand(game) {
  const list = h('div', { class: 'shop' });
  const refresh = () => {
    const items = Object.entries(game.state.inventory).filter(([k]) => parseItem(k));
    list.replaceChildren(
      h('p', {}, `De strandtent koopt je waar voor ${Math.round(STAND_SHARE * 100)}% van de waarde. Klanten betalen straks meer.`),
      ...(items.length
        ? items.map(([key, n]) => {
            const it = parseItem(key);
            const each = Math.round(unitPrice(it.product, it.effects, it.quality) * STAND_SHARE);
            return h(
              'div',
              { class: 'shop-row' },
              h('span', { class: 'shop-name' }, itemName(key)),
              h('span', { class: 'shop-have' }, `${n}× €${each}`),
              h('button', { class: 'btn btn-small', type: 'button', onClick: () => (sell(game, key, 1, STAND_SHARE), refresh()) }, 'Verkoop 1'),
              h('button', { class: 'btn btn-small btn-primary', type: 'button', onClick: () => (toast(`+€${sell(game, key, n, STAND_SHARE)}`), refresh()) }, 'Alles'),
            );
          })
        : [h('p', { class: 'hut-empty' }, 'Je hebt niets om te verkopen.')]),
    );
  };
  refresh();
  modal({ title: 'Strandtent', body: list, actions: [{ label: 'Klaar', kind: 'primary' }] });
}
