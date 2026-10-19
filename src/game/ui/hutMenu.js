// The menu of the beach hut (home base): make lemonade, sleep to the next morning, look
// at the stock, save the game.

import { h, modal, toast } from '../../ui/dom.js';
import { formatClock, RANKS, RANK_XP } from '../state.js';
import { itemName } from '../economy.js';
import { openMixMenu } from './tradeMenus.js';

/** Opens the hut menu for a Game. */
export function openHutMenu(game) {
  const s = game.state;
  const stock = Object.entries(s.inventory);
  const body = h(
    'div',
    { class: 'hut' },
    h('p', {}, `Dag ${s.day}, ${formatClock(s.minutes)}. Je hebt €${s.cash.toLocaleString('nl-NL')} in je zak en €${s.bank.toLocaleString('nl-NL')} op de bank.`),
    h('p', {}, `Rang: ${RANKS[game.rank]} (${s.xp} ervaring${game.rank < RANKS.length - 1 ? `, volgende rang bij ${RANK_XP[game.rank + 1]}` : ''}).`),
    h('h3', {}, 'Voorraad'),
    stock.length
      ? h('ul', { class: 'hut-stock' }, stock.map(([id, n]) => h('li', {}, `${itemName(id)}: ${n}`)))
      : h('p', { class: 'hut-empty' }, 'Nog niets op voorraad.'),
  );
  modal({
    title: 'Strandhut',
    body,
    actions: [
      { label: 'Sluiten' },
      { label: 'Limonade maken', onClick: () => openMixMenu(game) },
      {
        label: 'Opslaan',
        onClick: () => {
          toast(game.save() ? 'Opgeslagen' : 'Opslaan lukt niet in deze browser');
        },
      },
      {
        label: 'Slapen tot de ochtend',
        kind: 'primary',
        onClick: () => game.sleep(),
      },
    ],
  });
}
