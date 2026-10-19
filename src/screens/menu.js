// The home screen: a Wii Menu style grid of channels. The Mii Channel works;
// the island is being built step by step.

import { h, icon } from '../ui/dom.js';
import { miiStore } from '../mii/storage.js';
import { snapshotImage } from '../mii/thumbs.js';

const ISLAND_ART = `<svg viewBox="0 0 120 80" aria-hidden="true"><ellipse cx="60" cy="62" rx="48" ry="10" fill="#6ec6e8"/><ellipse cx="60" cy="56" rx="30" ry="9" fill="#f2dc9b"/><path d="M60 54V28" stroke="#8a5a2b" stroke-width="3"/><path d="M60 28c-12-2-18 4-20 8 8-4 14-3 20-8zM60 28c12-2 18 4 20 8-8-4-14-3-20-8z" fill="#5ab04c"/></svg>`;

export function menuScreen(root, app) {
  const miis = miiStore.all().slice(0, 4);
  const faces = h('div', { class: 'channel-faces' });
  for (const m of miis) {
    const img = h('img', { alt: '', width: 96, height: 96 });
    snapshotImage(img, m, { view: 'face', size: 160 });
    faces.append(img);
  }

  const miiChannel = h(
    'button',
    { class: 'channel channel-live', type: 'button', onClick: () => app.go('plaza') },
    h('span', { class: 'channel-art channel-art-mii' }, faces),
    h('span', { class: 'channel-label' }, 'Mii-kanaal'),
  );

  const islandChannel = h(
    'button',
    { class: 'channel channel-live', type: 'button', onClick: () => app.go('island') },
    h('span', { class: 'channel-art', html: ISLAND_ART }),
    h('span', { class: 'channel-label' }, 'Wahoe-eiland'),
  );

  const screen = h(
    'main',
    { class: 'screen menu' },
    h(
      'header',
      { class: 'menu-head' },
      h('h1', { class: 'logo' }, h('span', { class: 'logo-wii' }, 'Wii'), ' Sports ', h('span', { class: 'logo-x' }, 'Extreme')),
      h('p', { class: 'menu-sub' }, 'Maak je Mii en verken het eiland.'),
    ),
    h('div', { class: 'channels' }, miiChannel, islandChannel),
    h(
      'footer',
      { class: 'menu-foot' },
      h('span', { class: 'step-done' }, icon('check'), 'Stap 1: Mii-kanaal'),
      h('span', { class: 'menu-count' }, `${miiStore.all().length} Mii's opgeslagen`),
    ),
  );
  root.append(screen);
  return { unmount() {} };
}
