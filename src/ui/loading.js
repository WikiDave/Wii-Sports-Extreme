// A full-screen loading screen in Wii style: the logo, a ring of dots that turns, a progress
// bar with the current step, and a game tip that changes now and then.

import { h } from './dom.js';

const TIPS = [
  'Tip: houd ingedrukt om te schenken en laat los tussen de lijnen.',
  'Tip: klanten betalen meer voor de effecten waar ze van houden.',
  'Tip: een lage prijs levert extra vertrouwen op.',
  'Tip: op een zonnige dag betalen klanten 10% meer.',
  'Tip: word je achtervolgd? Verstop je in je strandhut.',
  'Tip: omkleden in de hut laat de Reglement-meter zakken.',
  'Tip: druk op M voor de kaart van het eiland.',
  'Tip: personeel werkt elke ochtend, als je het loon kunt betalen.',
  'Tip: de strandtent koopt maar 8 stuks per dag.',
];

/** Creates the loading screen; append `el` and call set(0..1, text) as work goes on. */
export function createLoader(title = 'Laden') {
  const bar = h('span', { class: 'loader-fill' });
  const step = h('p', { class: 'loader-step' }, 'Even geduld...');
  const tip = h('p', { class: 'loader-tip' }, TIPS[Math.floor(Math.random() * TIPS.length)]);
  const dots = h('div', { class: 'loader-ring', 'aria-hidden': 'true' }, ...Array.from({ length: 8 }, (_, i) => h('span', { style: { '--i': i } })));
  const el = h(
    'div',
    { class: 'loader', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': title },
    h(
      'div',
      { class: 'loader-card' },
      h('h1', { class: 'logo loader-logo' }, h('span', { class: 'logo-wii' }, 'Wii'), ' Sports ', h('span', { class: 'logo-x' }, 'Extreme')),
      dots,
      h('p', { class: 'loader-title' }, title),
      h('div', { class: 'loader-bar' }, bar),
      step,
      tip,
    ),
  );
  let shown = 0;
  const timer = setInterval(() => {
    tip.classList.add('is-out');
    setTimeout(() => {
      tip.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
      tip.classList.remove('is-out');
    }, 300);
  }, 4500);
  return {
    el,
    set(progress, text) {
      shown = Math.max(shown, Math.min(1, progress));
      bar.style.width = `${Math.round(shown * 100)}%`;
      el.setAttribute('aria-valuenow', Math.round(shown * 100));
      if (text) step.textContent = text;
    },
    fail(text) {
      clearInterval(timer);
      el.classList.add('is-failed');
      step.textContent = text;
    },
    /** Fills the bar, fades out and removes itself. */
    done() {
      this.set(1, 'Klaar!');
      clearInterval(timer);
      return new Promise((resolve) => {
        setTimeout(() => {
          el.classList.add('is-done');
          setTimeout(() => {
            el.remove();
            resolve();
          }, 450);
        }, 250);
      });
    },
    remove() {
      clearInterval(timer);
      el.remove();
    },
  };
}

/** Lets the browser draw (the loader) before the next chunk of work. */
export const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
