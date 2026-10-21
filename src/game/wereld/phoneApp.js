// The phone app "Schelpen": how many shells you have, the milestones, and a hint (a rough
// direction to the nearest shell you have not found yet). The first hint each day is free.

import { SHELL_COUNT, SHELL_MILESTONES, nearestLeft, hintText } from './shells.js';
import { wereldOf, hintPrice, useHint } from './progress.js';

/** The app for registerApp(). getPos() gives the Mii's position; shells is the full list. */
export function shellsApp(shells, getPos) {
  let last = null;
  const app = {
    id: 'schelpen',
    label: 'Schelpen',
    icon: '🐚',
    color: '#ff9ec7',
    render(ctx) {
      const { page, game, h, toast } = ctx;
      const w = wereldOf(game.state);
      const n = w.shells.length;
      const price = hintPrice(game.state);
      page(
        'Schelpen',
        h(
          'div',
          { class: 'shell-card' },
          h('strong', {}, `${n} van ${SHELL_COUNT} gevonden`),
          h('div', { class: 'shell-bar', role: 'progressbar', 'aria-valuenow': n, 'aria-valuemin': 0, 'aria-valuemax': SHELL_COUNT }, h('i', { style: { width: `${Math.round((n / SHELL_COUNT) * 100)}%` } })),
          h('small', {}, 'Schelpen liggen op het strand, op de klif, op daken, aan de steiger en in het groen. Loop er langs om ze op te rapen.'),
        ),
        h('h3', { class: 'shell-h' }, 'Mijlpalen'),
        h(
          'ul',
          { class: 'shell-list' },
          SHELL_MILESTONES.map((m) =>
            h('li', { class: n >= m.n ? 'is-done' : '' }, h('span', {}, `${m.n} schelpen`), h('small', {}, `€${m.cash.toLocaleString('nl-NL')} · ${m.xp} ervaring${n >= m.n ? ' · gehaald' : ''}`)),
          ),
        ),
        h('h3', { class: 'shell-h' }, 'Aanwijzing'),
        h('p', { class: 'shell-hint' }, n >= SHELL_COUNT ? 'Alle schelpen zijn gevonden. Goed gedaan!' : last ?? 'Vraag een aanwijzing: de eerste per dag is gratis, daarna kost het €15.'),
        n < SHELL_COUNT
          ? h(
              'button',
              {
                class: 'btn btn-primary shell-ask',
                type: 'button',
                onClick: () => {
                  const next = nearestLeft(getPos(), shells, w.shells);
                  if (!next) return;
                  if (!useHint(game)) return toast('Dat kun je niet betalen.');
                  last = hintText(getPos(), next);
                  app.render(ctx);
                },
              },
              price ? `Aanwijzing (€${price})` : 'Gratis aanwijzing',
            )
          : null,
      );
    },
  };
  return app;
}
