// Going to bed: a menu with a slider for the time to get up, then the day ends and a morning
// dialog tells what the night did. The chosen time is remembered (state.wakeAt).

import { h, modal } from '../../ui/dom.js';
import { PROPERTIES } from '../data/properties.js';
import { sleepAt } from '../panden/sleep.js';
import { ready } from '../stations.js';
import { formatClock, DAY_START, WAKE_LATEST } from '../state.js';

const STEP = 15; // minutes per notch of the slider

/** The sleep menu for the bed of property id: choose when to get up, then sleep. */
export function askSleep(game, id) {
  const s = game.state;
  let wake = Math.max(DAY_START, Math.min(WAKE_LATEST, s.wakeAt ?? DAY_START));
  const clock = h('b', { class: 'sleep-clock' }, formatClock(wake));
  const hours = h('span', { class: 'sleep-hours' });
  const showHours = () => {
    // Asleep from now until the wake time (the day runs 06:00 to 04:00; after midnight the clock is past 24:00).
    const left = s.minutes >= 24 * 60 ? wake - (s.minutes - 24 * 60) : 24 * 60 - s.minutes + wake;
    const hrs = Math.round((left / 60) * 2) / 2;
    hours.textContent = `${String(hrs).replace('.', ',')} uur slaap`;
  };
  const slider = h('input', {
    class: 'sleep-slider',
    type: 'range',
    min: DAY_START,
    max: WAKE_LATEST,
    step: STEP,
    value: wake,
    'aria-label': 'Opstaan om',
    onInput: (e) => {
      wake = +e.target.value;
      clock.textContent = formatClock(wake);
      showHours();
    },
  });
  showHours();
  modal({
    title: 'Slapen',
    body: h(
      'div',
      { class: 'sleep-menu' },
      h('p', {}, `Je gaat slapen in ${PROPERTIES[id].name}. Dag ${s.day + 1} begint wanneer jij opstaat.`),
      h('div', { class: 'sleep-row' }, h('span', {}, 'Opstaan om'), clock),
      slider,
      h('div', { class: 'sleep-scale' }, h('span', {}, formatClock(DAY_START)), hours, h('span', {}, formatClock(WAKE_LATEST))),
    ),
    actions: [
      { label: 'Nog niet' },
      {
        label: 'Slapen',
        kind: 'primary',
        onClick: () => {
          s.wakeAt = wake;
          setTimeout(() => sleepHere(game, id, wake), 0);
        },
      },
    ],
  });
}

/** Sleeps in property id until wake (game minutes) and shows the morning dialog. Returns the comfort bonus, or null. */
export function sleepHere(game, id, wake) {
  const bonus = sleepAt(game, id, wake);
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
