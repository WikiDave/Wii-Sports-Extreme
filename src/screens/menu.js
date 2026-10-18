// The home screen: a Wii Menu style grid of channels. The Mii Channel works;
// the sports arrive one step at a time.

import { h, icon } from '../ui/dom.js';
import { miiStore } from '../mii/storage.js';
import { snapshotImage } from '../mii/thumbs.js';

const SPORT_ART = {
  tennis: `<svg viewBox="0 0 120 80" aria-hidden="true"><circle cx="60" cy="40" r="22" fill="#d7e84a"/><path d="M41 27c10 6 10 20 0 26M79 27c-10 6-10 20 0 26" stroke="#fff" stroke-width="3" fill="none"/></svg>`,
  baseball: `<svg viewBox="0 0 120 80" aria-hidden="true"><circle cx="60" cy="40" r="22" fill="#fff" stroke="#d6dbe2" stroke-width="2"/><path d="M45 25c6 8 6 22 0 30M75 25c-6 8-6 22 0 30" stroke="#e2513f" stroke-width="2.5" stroke-dasharray="3 3" fill="none"/></svg>`,
  bowling: `<svg viewBox="0 0 120 80" aria-hidden="true"><path d="M60 12c5 0 7 5 6 11-1 5-3 7-3 9 0 3 7 9 7 21 0 9-4 15-10 15s-10-6-10-15c0-12 7-18 7-21 0-2-2-4-3-9-1-6 1-11 6-11z" fill="#fff" stroke="#d6dbe2" stroke-width="2"/><path d="M54 30h12M53 35h14" stroke="#e2513f" stroke-width="3"/></svg>`,
  golf: `<svg viewBox="0 0 120 80" aria-hidden="true"><path d="M58 14v50" stroke="#7b8490" stroke-width="3"/><path d="M59 15l22 8-22 8z" fill="#e2513f"/><ellipse cx="58" cy="66" rx="24" ry="5" fill="#9fd36a"/><circle cx="74" cy="60" r="4.5" fill="#fff" stroke="#d6dbe2"/></svg>`,
  boxing: `<svg viewBox="0 0 120 80" aria-hidden="true"><path d="M44 30c0-10 8-16 18-16 11 0 18 7 18 18 0 9-5 15-11 18v8H50v-9c-4-3-6-8-6-12v-7z" fill="#e2513f"/><path d="M50 50h19v8H50z" fill="#fff"/><path d="M50 32c3-2 7-2 10 1" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
};

const SPORTS = [
  { id: 'tennis', name: 'Tennis', step: 2 },
  { id: 'bowling', name: 'Bowling', step: 3 },
  { id: 'baseball', name: 'Honkbal', step: 4 },
  { id: 'golf', name: 'Golf', step: 5 },
  { id: 'boxing', name: 'Boksen', step: 6 },
];

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

  const sports = SPORTS.map((s) =>
    h(
      'div',
      { class: 'channel channel-soon', 'aria-label': `${s.name}, komt in stap ${s.step}` },
      h('span', { class: 'channel-art', html: SPORT_ART[s.id] }),
      h('span', { class: 'channel-label' }, s.name),
      h('span', { class: 'channel-badge' }, `Stap ${s.step}`),
    ),
  );

  const screen = h(
    'main',
    { class: 'screen menu' },
    h(
      'header',
      { class: 'menu-head' },
      h('h1', { class: 'logo' }, h('span', { class: 'logo-wii' }, 'Wii'), ' Sports ', h('span', { class: 'logo-x' }, 'Extreme')),
      h('p', { class: 'menu-sub' }, 'Maak eerst je Mii. De sporten komen er stap voor stap bij.'),
    ),
    h('div', { class: 'channels' }, miiChannel, sports),
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
