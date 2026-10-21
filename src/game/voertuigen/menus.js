// The dialogs of the vehicle places: the Garage (bikes, scooters, golf carts), the harbour boat
// rental, the fuel pump and the treasure crate. They talk to the runtime (api) and only draw.

import { h, modal } from '../../ui/dom.js';
import { RANKS } from '../state.js';
import { VEHICLES, GARAGE_LAND, HARBOUR_BOATS, CHEST_CASH, CHEST_XP, FUEL_PRICE } from './data.js';
import { ofType } from './store.js';

const euro = (n) => `€${n.toLocaleString('nl-NL')}`;

/** One row per vehicle: what it is, what it costs, and buttons to buy or rent it. */
function shopList(game, api, ids, where) {
  const body = h('div', { class: 'shop' });
  const refresh = () => {
    const s = game.state;
    body.replaceChildren(
      h('p', { class: 'shop-cash' }, `Je hebt ${euro(s.cash)}.`),
      ...ids.map((id) => {
        const spec = VEHICLES[id];
        const have = ofType(game, id);
        const locked = game.rank < spec.rank;
        const status = have ? (have.rent ? 'gehuurd tot morgen' : 'van jou') : locked ? `vanaf rang ${RANKS[spec.rank]}` : '';
        const buttons = [];
        if (!have && !locked) {
          buttons.push(
            h('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: s.cash < spec.price, onClick: () => (api.buy(id, { where }), refresh()) }, `Koop ${euro(spec.price)}`),
            h('button', { class: 'btn btn-small', type: 'button', disabled: s.cash < spec.rent, onClick: () => (api.buy(id, { where, rent: true }), refresh()) }, `Huur ${euro(spec.rent)}/dag`),
          );
        }
        return h(
          'div',
          { class: 'shop-row vh-row' },
          h('div', { class: 'shop-name' }, h('span', {}, spec.name), h('small', { class: 'vh-desc' }, spec.desc)),
          h('span', { class: 'shop-have' }, status),
          ...buttons,
        );
      }),
      h('p', { class: 'vh-note' }, where === 'garage' ? 'Een huurvoertuig gaat terug naar de Garage zodra het nieuwe dag is.' : 'Boten huur je per dag. Een motorboot tankt bij de benzinepomp in de haven.'),
    );
  };
  refresh();
  return body;
}

/** The Garage in Havenstad. */
export function openGarage(game, api) {
  modal({
    title: 'Garage Havenstad',
    body: shopList(game, api, GARAGE_LAND, 'garage'),
    wide: true,
    actions: [{ label: 'Klaar', kind: 'primary' }],
  });
}

/** The harbour boat rental (beside the jetty). */
export function openHarbour(game, api) {
  modal({
    title: 'Havenverhuur',
    body: shopList(game, api, HARBOUR_BOATS, 'harbour'),
    wide: true,
    actions: [{ label: 'Klaar', kind: 'primary' }],
  });
}

/** The fuel pump: fills the vehicles that stand here (within reach of the pump). */
export function openPump(game, api) {
  const body = h('div', { class: 'shop' });
  const refresh = () => {
    const near = api.fuelNearPump();
    body.replaceChildren(
      h('p', { class: 'shop-cash' }, `Benzine: €${FUEL_PRICE.toFixed(2).replace('.', ',')} per liter.`),
      ...(near.length
        ? near.map((v) => {
            const spec = VEHICLES[v.type];
            const cost = Math.ceil((spec.fuelMax - v.fuel) * FUEL_PRICE);
            return h(
              'div',
              { class: 'shop-row vh-row' },
              h('span', { class: 'shop-name' }, spec.name),
              h('span', { class: 'shop-have' }, `${v.fuel.toFixed(1).replace('.', ',')} van ${spec.fuelMax} liter`),
              h('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: cost <= 0 || game.state.cash < cost, onClick: () => (api.refuelAt(v.id), refresh()) }, cost > 0 ? `Vol tanken ${euro(cost)}` : 'Vol'),
            );
          })
        : [h('p', { class: 'hut-empty' }, 'Zet je scooter, golfkar of motorboot bij de pomp. Je moet er dan vlak naast staan.')]),
    );
  };
  refresh();
  modal({ title: 'Benzinepomp', body, wide: true, actions: [{ label: 'Klaar', kind: 'primary' }] });
}

/** The treasure crate on the hidden beach: opens once. */
export function openChest(game, reward) {
  modal({
    title: 'Een schatkist!',
    body: h(
      'div',
      { class: 'vh-chest' },
      h('p', {}, 'Onder het zand zat een oude kist vol gouden munten. Je vindt er meteen zeker:'),
      h('p', { class: 'vh-chest-reward' }, `${euro(reward?.cash ?? CHEST_CASH)} en ${reward?.xp ?? CHEST_XP} ervaring.`),
      h('p', { class: 'vh-note' }, 'De kist is leeg en blijft hier. Je vaart er niet voor terug, maar je weet nu waar hij is.'),
    ),
    actions: [{ label: 'Hoera!', kind: 'primary' }],
  });
}

