// The deal with a customer: pick what to sell, how many and at which price.

import { h, modal, toast } from '../../ui/dom.js';
import { EFFECTS } from '../data/effects.js';
import { itemName, parseItem } from '../economy.js';
import { OFFERS, deal, valueFor, record, MAX_LOYALTY } from '../customers.js';
import { activeRequest, fitsRequest, completeRequest, REQUEST_BONUS } from '../phone.js';

const OFFER_LABELS = { laag: 'Voordelig', eerlijk: 'Eerlijk', hoog: 'Duur' };

/** opts.factor: price factor (a rival at the spot); opts.onDone(result) after a deal. */
export function openDealMenu(game, c, { factor = 1, onDone } = {}) {
  const items = Object.keys(game.state.inventory).filter((k) => parseItem(k));
  if (!items.length) {
    toast(`${c.name} wil graag iets kopen, maar je hebt niets bij je.`);
    return;
  }
  const likes = c.likes.map((e) => EFFECTS[e].name).join(', ');
  const rec = record(game.state, c.id);
  const request = activeRequest(game.state, c.id);
  const body = h('div', { class: 'deal' });
  const dlg = modal({ title: c.name, body, actions: [{ label: 'Weg' }] });
  const render = () => {
    body.replaceChildren(
      h('p', {}, `Houdt van: ${likes}. Budget: €${c.budget}. Vertrouwen: ${rec.loyalty}/${MAX_LOYALTY}.`),
      request ? h('p', { class: 'deal-msg' }, `Je afspraak: ${request.qty}× iets ${EFFECTS[request.effect].name.toLowerCase()}s, met +${Math.round((REQUEST_BONUS - 1) * 100)}% bonus.`) : '',
      factor < 1 ? h('p', { class: 'deal-msg' }, 'Er staat een rivaal: hier betalen ze vandaag minder.') : '',
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
                    const fits = request && fitsRequest(request, key);
                    const r = deal(game, c, key, fits ? request.qty : 3, offer, factor * (fits ? REQUEST_BONUS : 1));
                    if (fits && r.ok) completeRequest(game, request, r.sold);
                    toast(r.message + (fits && r.ok && r.sold >= request.qty ? ' Afspraak nagekomen!' : ''));
                    onDone?.(r);
                    dlg.close();
                  },
                },
                `${OFFER_LABELS[offer]} €${Math.round(valueFor(c, key) * OFFERS[offer] * factor * (request && fitsRequest(request, key) ? REQUEST_BONUS : 1))}`,
              ),
            ),
          ),
        ),
    );
  };
  render();
}
