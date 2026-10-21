// Going to bed: a question first, then the day ends and a morning dialog tells what the night did.

import { h, modal } from '../../ui/dom.js';
import { PROPERTIES } from '../data/properties.js';
import { sleepAt } from '../panden/sleep.js';
import { ready } from '../stations.js';
import { formatClock } from '../state.js';

/** Asks whether to sleep in the bed of property id. */
export function askSleep(game, id) {
  const s = game.state;
  modal({
    title: 'Slapen',
    body: h('p', {}, `Je gaat slapen in ${PROPERTIES[id].name}. Morgen om 06:00 begint dag ${s.day + 1}.`),
    actions: [
      { label: 'Nog niet' },
      { label: 'Slapen', kind: 'primary', onClick: () => setTimeout(() => sleepHere(game, id), 0) },
    ],
  });
}

/** Sleeps in property id now and shows the morning dialog. Returns the comfort bonus, or null. */
export function sleepHere(game, id) {
  const bonus = sleepAt(game, id);
  if (!bonus) return null;
  const s = game.state;
  const waiting = ready(s).length;
  const lines = [h('p', {}, `Het is dag ${s.day}, ${formatClock(s.minutes)}. Je sliep in ${PROPERTIES[id].name}.`)];
  if (bonus.heat) lines.push(h('p', {}, `Lekker geslapen: de bewaking vergeet je ${bonus.heat > 1 ? 'extra ' : ''}snel (reglement-meter omlaag).`));
  if (bonus.xp) lines.push(h('p', {}, `Comfort geeft je ${bonus.xp} ervaring.`));
  if (waiting) lines.push(h('p', {}, `${waiting === 1 ? 'Er staat 1 batch' : `Er staan ${waiting} batches`} klaar op de stations.`));
  modal({ title: 'Goedemorgen', body: h('div', { class: 'morning' }, lines), actions: [{ label: 'Aan het werk', kind: 'primary' }] });
  return bonus;
}
