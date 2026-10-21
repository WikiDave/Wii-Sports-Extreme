// The upgrade rows of one property: each track with its level dots and the price of the next level,
// and the paint choice once decoration is at level 1. Used in the Kantoor and in the property menu.

import { h, toast } from '../../ui/dom.js';
import { UPGRADES, PAINTS } from '../data/properties.js';
import { levelOf, MAX_LEVEL } from '../panden/save.js';
import { upgradeCost, buyUpgrade, paintOf, setPaint, UPGRADE_KEYS } from '../panden/upgrades.js';

const euro = (n) => `€${n.toLocaleString('nl-NL')}`;

/** A list of upgrade rows for property id; onChange() runs after every change so the caller can redraw. */
export function upgradeList(game, id, onChange) {
  const s = game.state;
  const rows = UPGRADE_KEYS.map((track) => {
    const lvl = levelOf(s, track, id);
    const cost = upgradeCost(s, id, track);
    const dots = h(
      'span',
      { class: 'upg-dots', 'aria-label': `niveau ${lvl} van ${MAX_LEVEL}` },
      Array.from({ length: MAX_LEVEL }, (_, i) => h('i', { class: i < lvl ? 'is-on' : '' })),
    );
    const action =
      cost == null
        ? h('span', { class: 'upg-max' }, 'Op max')
        : h(
            'button',
            {
              class: 'btn btn-small btn-primary',
              type: 'button',
              disabled: s.cash < cost,
              onClick: () => {
                if (buyUpgrade(game, id, track)) toast(`${UPGRADES[track].name}: niveau ${lvl + 1}.`);
                onChange?.();
              },
            },
            `Verbeter · ${euro(cost)}`,
          );
    return h('div', { class: 'upg-row' }, h('div', { class: 'upg-main' }, h('strong', {}, UPGRADES[track].name), h('small', {}, UPGRADES[track].text)), dots, action);
  });
  const paint =
    levelOf(s, 'decor', id) >= 1
      ? h(
          'div',
          { class: 'upg-paint' },
          h('span', {}, 'Muurverf:'),
          PAINTS.map((p, i) =>
            h('button', {
              class: `swatch ${paintOf(s, id) === i ? 'is-on' : ''}`,
              type: 'button',
              title: p.name,
              'aria-label': `Verf ${p.name}`,
              'aria-pressed': paintOf(s, id) === i ? 'true' : 'false',
              style: { '--c': p.color },
              onClick: () => {
                setPaint(game, id, i);
                onChange?.();
              },
            }),
          ),
        )
      : null;
  return h('div', { class: 'upg-list' }, rows, paint);
}
