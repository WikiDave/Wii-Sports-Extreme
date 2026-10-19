// The deal with a customer: pick what to sell, how many and at which price.

import { h, modal, toast } from '../../ui/dom.js';
import { EFFECTS } from '../data/effects.js';
import { itemName, parseItem } from '../economy.js';
import { OFFERS, deal, valueFor, record, MAX_LOYALTY } from '../customers.js';

const OFFER_LABELS = { laag: 'Voordelig', eerlijk: 'Eerlijk', hoog: 'Duur' };

export function openDealMenu(game, c) {
  const items = Object.keys(game.state.inventory).filter((k) => parseItem(k));
  if (!items.length) {
    toast(`${c.name} wil graag iets kopen, maar je hebt niets bij je.`);
    return;
  }
  const likes = c.likes.map((e) => EFFECTS[e].name).join(', ');
  const rec = record(game.state, c.id);
  const body = h('div', { class: 'deal' });
  const dlg = modal({ title: c.name, body, actions: [{ label: 'Weg' }] });
  const render = () => {
    body.replaceChildren(
      h('p', {}, `Houdt van: ${likes}. Budget: €${c.budget}. Vertrouwen: ${rec.loyalty}/${MAX_LOYALTY}.`),
      ...items
        .filter((k) => game.state.inventory[k])
        .map((key) =>
          h(
            'div',
            { class: 'shop-row deal-row' },
            h('span', { class: 'shop-name' }, `${itemName(key)} (${game.state.inventory[key]}×)`),
            ...Object.keys(OFFERS).map((offer) =>
              h(
                'button',
                {
                  class: 'btn btn-small',
                  type: 'button',
                  onClick: () => {
                    const r = deal(game, c, key, 3, offer);
                    toast(r.message);
                    dlg.close();
                  },
                },
                `${OFFER_LABELS[offer]} €${Math.round(valueFor(c, key) * OFFERS[offer])}`,
              ),
            ),
          ),
        ),
    );
  };
  render();
}
