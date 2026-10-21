// The Garage app on the phone: call an owned vehicle to you, load stock in its back (the guards
// never see it there), see its petrol and hand a rental back. Works through the runtime (api).

import { h } from '../../ui/dom.js';
import { itemName } from '../economy.js';
import { ZONES } from '../world/zones.js';
import { VEHICLES } from './data.js';
import { list, cargoUnits, loadCargo, unloadCargo } from './store.js';
import { usesFuel } from './fuel.js';

/** The zone's name for a point, e.g. "Havenstad" ("ergens op zee" in the sea). */
export function zoneName(zoneId) {
  return ZONES.find((z) => z.id === zoneId)?.name ?? 'ergens op zee';
}

/** The app definition for ctx.registerApp. api: the runtime (see runtime.js). */
export function garageApp(api) {
  return {
    id: 'garage',
    label: 'Garage',
    icon: '🛵',
    color: '#ff9a2a',
    render({ page, game, toast }) {
      const home = () => {
        const vs = list(game);
        page(
          'Garage',
          h('p', { class: 'vh-note' }, 'Roep je voertuig naar je toe, of laad je spullen erin. Achterin zien de bewakers niets.'),
          ...(vs.length
            ? vs.map((v) => card(v))
            : [h('p', { class: 'phone-empty' }, 'Je hebt nog geen voertuig. Koop of huur er een in de Garage in Havenstad, of bij de Havenverhuur.')]),
        );
      };
      const card = (v) => {
        const spec = VEHICLES[v.type];
        const riding = api.isRiding(v.id);
        const bits = [h('strong', {}, `${spec.name}${v.rent ? ' (gehuurd)' : ''}`), h('small', { class: 'vh-where' }, riding ? 'Je zit erin.' : api.whereOf(v))];
        if (usesFuel(spec)) bits.push(h('small', {}, `Benzine: ${v.fuel.toFixed(1).replace('.', ',')} van ${spec.fuelMax} liter${v.fuel <= 0.01 ? ' (leeg)' : ''}`));
        if (spec.cargo) bits.push(h('small', {}, `Achterin: ${cargoUnits(v)} van ${spec.cargo} stuks`));
        const buttons = [];
        if (!riding) buttons.push(h('button', { class: 'btn btn-small btn-primary', type: 'button', onClick: () => (toast(api.summon(v.id).msg), home()) }, 'Roep naar mij'));
        buttons.push(h('button', { class: 'btn btn-small', type: 'button', disabled: !spec.cargo, onClick: () => loadPage(v) }, 'Laden'));
        if (v.rent) buttons.push(h('button', { class: 'btn btn-small', type: 'button', onClick: () => (toast(api.giveBack(v.id).msg), home()) }, 'Inleveren'));
        return h('div', { class: 'msg vh-card' }, ...bits, h('div', { class: 'msg-actions' }, ...buttons));
      };
      const loadPage = (v) => {
        const spec = VEHICLES[v.type];
        const near = api.canLoad(v);
        const again = () => loadPage(v);
        const inBag = Object.entries(game.state.inventory);
        const inBack = Object.entries(v.cargo ?? {});
        const row = (key, n, act) =>
          h(
            'div',
            { class: 'shop-row' },
            h('span', { class: 'shop-name' }, itemName(key)),
            h('span', { class: 'shop-have' }, `${n}×`),
            ...act.map(([label, k]) => h('button', { class: 'btn btn-small', type: 'button', disabled: !near, onClick: () => (k(), again()) }, label)),
          );
        page(
          `Lading: ${spec.name}`,
          h('p', { class: 'vh-note' }, near ? `Achterin zit ${cargoUnits(v)} van ${spec.cargo} stuks.` : 'Ga naast je voertuig staan (of zit erin) om te laden.'),
          h('h3', {}, 'In je zak'),
          ...(inBag.length
            ? inBag.map(([key, n]) => row(key, n, [['+1', () => loadCargo(game, v.id, key, 1)], ['Alles', () => loadCargo(game, v.id, key, n)]]))
            : [h('p', { class: 'hut-empty' }, 'Niets in je zak.')]),
          h('h3', {}, 'Achterin'),
          ...(inBack.length
            ? inBack.map(([key, n]) => row(key, n, [['-1', () => unloadCargo(game, v.id, key, 1)], ['Alles', () => unloadCargo(game, v.id, key, n)]]))
            : [h('p', { class: 'hut-empty' }, 'Niets achterin.')]),
          h('div', { class: 'msg-actions' }, h('button', { class: 'btn btn-small', type: 'button', onClick: home }, '‹ Terug naar de Garage')),
        );
      };
      home();
    },
  };
}
