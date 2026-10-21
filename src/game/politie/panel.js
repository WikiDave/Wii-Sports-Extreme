// The police panel: where you stand with the police, the bribe for agent Bram (once a day), the
// disguise for the day, the messages of the police and what happened. It is the same panel in the
// Politie app of the phone and at the police post on the island.

import { LEVEL_NAMES, heatLevel } from '../police.js';
import { formatClock } from '../state.js';
import { pol, markInboxRead } from './state.js';
import { bribeBlocked, bribeCost, bribeCop, buyDisguise, isDisguised, BRIBE_DROP, DISGUISE_PRICE } from './shop.js';
import { LEVEL_TEXT, BRIBE_OK, DISGUISE_OK } from './texts.js';

const euro = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
const BLOCKED = {
  vandaag: 'Agent Bram heeft vandaag al genoeg van je gehad. Morgen weer.',
  rustig: 'Er valt niets weg te praten: je meter staat laag.',
  geld: 'Je hebt niet genoeg contant voor de envelop.',
};

/**
 * Builds the panel. Returns { el, draw }: el is the element to show, draw() renders it again
 * (after a purchase or a bribe). toast(text) shows a message.
 */
export function policePanel(game, { h, toast }) {
  const el = h('div', { class: 'pz-panel' });

  const status = (s, lvl) =>
    h(
      'section',
      { class: `pz-status pz-lvl-${lvl}` },
      h('div', { class: 'pz-row' }, h('strong', {}, LEVEL_NAMES[lvl]), h('span', { class: 'pz-dots' }, ...[1, 2, 3, 4].map((i) => h('span', { class: `heat-dot ${i <= lvl ? 'is-on' : ''}` })))),
      h('p', {}, LEVEL_TEXT[lvl]),
      h('ol', { class: 'pz-ladder' }, ...LEVEL_NAMES.map((n, i) => h('li', { class: i === lvl ? 'is-now' : '' }, n))),
      h('small', {}, `Meter: ${s.heat.toFixed(1)} van 5`),
    );

  const bribeCard = (s, lvl) => {
    const blocked = bribeBlocked(s);
    return h(
      'section',
      { class: 'pz-card' },
      h('h3', {}, 'Agent Bram smeren'),
      h('p', {}, `Eén envelop per dag. Je meter zakt dan met ${String(BRIBE_DROP).replace('.', ',')}. Soms belt hij zijn collega's, en dan gaat de meter juist omhoog.`),
      h(
        'button',
        {
          class: 'btn btn-primary',
          type: 'button',
          disabled: !!blocked,
          onClick: () => {
            const r = bribeCop(game);
            toast(r.ok || r.failed ? r.text : BLOCKED[r.blocked] ?? 'Dat lukt nu niet.');
            draw();
          },
        },
        `Smeren (${euro(bribeCost(lvl))})`,
      ),
      blocked ? h('p', { class: 'pz-note' }, BLOCKED[blocked]) : null,
    );
  };

  const disguiseCard = (s) => {
    const on = isDisguised(s);
    return h(
      'section',
      { class: 'pz-card' },
      h('h3', {}, 'Vermomming'),
      h('p', {}, `Pet en zonnebril voor vandaag. De bewakers zien je van verder af niet en wantrouwen je trager. (${euro(DISGUISE_PRICE)})`),
      on
        ? h('small', { class: 'pz-note' }, 'Je bent vandaag vermomd.')
        : h(
            'button',
            {
              class: 'btn',
              type: 'button',
              disabled: s.cash < DISGUISE_PRICE,
              onClick: () => {
                const r = buyDisguise(game);
                toast(r.ok ? DISGUISE_OK : r.reason === 'al' ? 'Je bent vandaag al vermomd.' : 'Daar heb je niet genoeg geld voor.');
                draw();
              },
            },
            `Kopen (${euro(DISGUISE_PRICE)})`,
          ),
    );
  };

  const inboxCard = (s) => {
    const msgs = pol(s).inbox.slice(0, 5);
    return h(
      'section',
      { class: 'pz-card' },
      h('h3', {}, 'Berichten van de politie'),
      msgs.length
        ? msgs.map((m) => h('div', { class: `pz-msg ${m.read ? '' : 'is-new'}` }, h('b', {}, m.title), h('small', {}, ` dag ${m.day}`), h('p', {}, m.text)))
        : h('p', { class: 'pz-note' }, 'Geen berichten. Dat is goed nieuws.'),
    );
  };

  const logCard = (s) => {
    const lines = pol(s).log.slice(0, 8);
    return h(
      'section',
      { class: 'pz-card' },
      h('h3', {}, 'Laatste gebeurtenissen'),
      lines.length
        ? h('ul', { class: 'pz-log' }, ...lines.map((e) => h('li', {}, h('small', {}, `dag ${e.day}, ${formatClock(e.minutes)} · `), e.text)))
        : h('p', { class: 'pz-note' }, 'Nog niets gebeurd. Houd het zo.'),
    );
  };

  const draw = () => {
    const s = game.state;
    const lvl = heatLevel(s);
    el.replaceChildren(status(s, lvl), bribeCard(s, lvl), disguiseCard(s), inboxCard(s), logCard(s));
  };
  draw();
  return { el, draw };
}

/** The phone app's page content: the panel, and the messages count as read when you look. */
export function policeAppPage(game, { h, toast }) {
  const p = policePanel(game, { h, toast });
  markInboxRead(game.state);
  return p;
}
