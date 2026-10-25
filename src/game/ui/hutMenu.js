// The menu of the beach hut (home base): make lemonade, sleep to the next morning, look
// at the stock and the chest, upgrade the hut, save the game.

import { h, modal, toast } from '../../ui/dom.js';
import { formatClock, RANKS, RANK_XP } from '../state.js';
import { itemName } from '../economy.js';
import { openStations } from './stationMenu.js';
import { openChest } from './chestMenu.js';
import { openPropertyMenu } from './propertyMenu.js';
import { askSleep } from './sleepUi.js';
import { disguise } from '../police.js';
import { chestOf } from '../panden/chest.js';

/** Opens the hut menu for a Game. */
export function openHutMenu(game) {
  const s = game.state;
  const stock = Object.entries(s.inventory);
  const inChest = Object.entries(chestOf(s, 'hut'));
  const body = h(
    'div',
    { class: 'hut' },
    h('p', {}, `Dag ${s.day}, ${formatClock(s.minutes)}. Je hebt €${s.cash.toLocaleString('nl-NL')} in je zak en €${s.bank.toLocaleString('nl-NL')} op de bank.`),
    h('p', {}, `Rang: ${RANKS[game.rank]} (${s.xp} ervaring${game.rank < RANKS.length - 1 ? `, volgende rang bij ${RANK_XP[game.rank + 1]}` : ''}).`),
    h('h3', {}, 'Voorraad bij je'),
    stock.length
      ? h('ul', { class: 'hut-stock' }, stock.map(([id, n]) => h('li', {}, `${itemName(id)}: ${n}`)))
      : h('p', { class: 'hut-empty' }, 'Nog niets op voorraad.'),
    h('h3', {}, 'In de kist'),
    inChest.length
      ? h('ul', { class: 'hut-stock' }, inChest.map(([id, n]) => h('li', {}, `${itemName(id)}: ${n}`)))
      : h('p', { class: 'hut-empty' }, 'De kist is leeg.'),
  );
  modal({
    title: 'Strandhut',
    body,
    actions: [
      { label: 'Sluiten' },
      { label: 'Stations', onClick: () => setTimeout(() => openStations(game), 0) },
      { label: 'Kist', onClick: () => setTimeout(() => openChest(game, 'hut'), 0) },
      { label: 'Verbeteren', onClick: () => setTimeout(() => openPropertyMenu(game, 'hut'), 0) },
      {
        label: 'Opslaan',
        onClick: () => {
          toast(game.save() ? 'Opgeslagen' : 'Opslaan lukt niet in deze browser');
        },
      },
      {
        label: 'Omkleden (€20)',
        onClick: () => toast(disguise(game) ? 'Andere kleren aan: de bewaking herkent je minder snel.' : 'Omkleden helpt nu niet (één keer per dag, en alleen als ze je zoeken).'),
      },
      {
        label: 'Slapen',
        kind: 'primary',
        onClick: () => setTimeout(() => askSleep(game, 'hut'), 0),
      },
    ],
  });
}
