// The menu of one of your places: what it holds, its stations, and its upgrades (with the paint).
// Beds and chests are used in the world (the bed and the chest prompts), this menu links to them.

import { h, modal } from '../../ui/dom.js';
import { PROPERTIES } from '../data/properties.js';
import { stationOwners } from '../panden/save.js';
import { chestUsed } from '../panden/chest.js';
import { storageOf, speedFactor } from '../panden/upgrades.js';
import { openStations } from './stationMenu.js';
import { openChest } from './chestMenu.js';
import { upgradeList } from './upgradeList.js';

/** Opens the menu of property id (owned). */
export function openPropertyMenu(game, id) {
  const p = PROPERTIES[id];
  const body = h('div', { class: 'prop' });
  const render = () => {
    const s = game.state;
    const slots = stationOwners(s).map((o, k) => ({ o, k })).filter((x) => x.o === id);
    const busy = slots.filter((x) => s.jobs[x.k]).length;
    const pct = Math.round((1 - speedFactor(s, id)) * 100);
    body.replaceChildren(
      h('p', { class: 'prop-info' }, `Kist: ${chestUsed(s, id)} van ${storageOf(s, id)} stuks.`),
      h(
        'p',
        { class: 'prop-info' },
        slots.length
          ? `${slots.length} station${slots.length > 1 ? 's' : ''}, ${busy} bezig${pct ? `. Batches gaan ${pct}% sneller` : ''}.`
          : 'Geen stations.',
      ),
      h('h3', {}, 'Verbeteringen'),
      upgradeList(game, id, render),
    );
  };
  render();
  modal({
    title: p.name,
    body,
    wide: true,
    actions: [
      { label: 'Sluiten' },
      { label: 'Kist', onClick: () => setTimeout(() => openChest(game, id), 0) },
      { label: 'Stations', onClick: () => setTimeout(() => openStations(game), 0) },
    ],
  });
}
