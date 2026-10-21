// The chest of a property: move goods between your inventory and the chest. Pick an amount with the
// slider on each row, then put it in the chest or take it out.

import { h, modal, toast } from '../../ui/dom.js';
import { PROPERTIES } from '../data/properties.js';
import { itemName } from '../economy.js';
import { chestOf, chestUsed, chestFree, deposit, withdraw } from '../panden/chest.js';
import { storageOf } from '../panden/upgrades.js';

export function openChest(game, id) {
  const body = h('div', { class: 'chest' });
  const render = () => {
    const s = game.state;
    const keys = [...new Set([...Object.keys(s.inventory), ...Object.keys(chestOf(s, id))])].sort();
    const carried = Object.values(s.inventory).reduce((a, b) => a + b, 0);
    body.replaceChildren(
      h('p', { class: 'chest-cap' }, `In de kist: ${chestUsed(s, id)} van ${storageOf(s, id)} stuks. Bij je: ${carried} stuks.`),
      ...(keys.length ? keys.map((key) => row(key)) : [h('p', { class: 'chest-empty' }, 'Niets bij je en niets in de kist.')]),
    );
  };
  // One row: the amount slider, then put in / take out.
  const row = (key) => {
    const s = game.state;
    const inv = s.inventory[key] ?? 0;
    const inChest = chestOf(s, id)[key] ?? 0;
    let n = 1;
    const amount = h('strong', { class: 'chest-n' }, '1');
    const slider = h('input', {
      type: 'range',
      class: 'chest-range',
      min: 1,
      max: Math.max(1, inv, inChest),
      value: 1,
      'aria-label': `Aantal ${itemName(key)}`,
      onInput: (e) => {
        n = +e.target.value;
        amount.textContent = String(n);
      },
    });
    const putIn = () => {
      const k = Math.min(n, inv, chestFree(game.state, id));
      if (k > 0 && deposit(game, id, key, k)) toast(`${k} in de kist.`);
      else toast('Dat past niet in de kist.');
      render();
    };
    const takeOut = () => {
      const k = Math.min(n, chestOf(game.state, id)[key] ?? 0);
      if (k > 0 && withdraw(game, id, key, k)) toast(`${k} bij je.`);
      render();
    };
    return h(
      'div',
      { class: 'chest-row' },
      h('div', { class: 'chest-name' }, h('strong', {}, itemName(key)), h('small', {}, `bij je: ${inv} · in de kist: ${inChest}`)),
      h('div', { class: 'chest-pick' }, slider, amount),
      h(
        'div',
        { class: 'chest-btns' },
        h('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: !inv || !chestFree(s, id), onClick: putIn }, 'Leg in kist'),
        h('button', { class: 'btn btn-small', type: 'button', disabled: !inChest, onClick: takeOut }, 'Haal uit'),
      ),
    );
  };
  render();
  modal({ title: `Kist: ${PROPERTIES[id].name}`, body, wide: true, actions: [{ label: 'Klaar', kind: 'primary' }] });
}
