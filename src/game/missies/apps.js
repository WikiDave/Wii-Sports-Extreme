// The three phone apps of the missions: Opdrachten (the mission now, the ones done, your title),
// Prestaties (the achievements, secret ones hidden until you have them) and Vaardigheden (spend
// skill points on perks). Each app is { id, label, icon, color, badge(game), render({ page, game, h, toast }) }.
// Browser only; the numbers come from tracker.js, the perks from skills.js.

import { MISSIONS } from './data.js';
import { ACHIEVEMENTS, GROUPS } from './achievements.js';
import { current, progressOf, describeGoal } from './tracker.js';
import { metricsOf, achievedCount, unseenAchievements } from './stats.js';
import { SKILLS, MAX_LEVEL, skillLevel, effectText, buySkill, pointsFree } from './skills.js';
import { STEPS, showHints, skipTutorial } from './tutorial.js';

const pct = (v, goal) => `${Math.max(0, Math.min(100, (v / goal) * 100)).toFixed(1)}%`;

/** Builds the three apps. get() returns the missions save data (state.ext.missies). */
export function missionApps({ game, get }) {
  const sayBar = (h, value, goal) => h('div', { class: 'ms-bar' }, h('i', { class: 'ms-fill', style: { width: pct(value, goal) } }));

  const opdrachten = (args) => {
    const { page, h, toast } = args;
    const ext = get();
    const m = current(ext);
    const p = progressOf(game, ext, m);
    const done = ext.log.slice(-12).reverse();
    const tut = ext.tutorial;
    const tutorialCard = tut.done
      ? null
      : h(
          'div',
          { class: 'ms-card' },
          h('strong', {}, 'Tutorial'),
          h('p', { class: 'ms-hint' }, `Tip ${Math.min(tut.step + 1, STEPS.length)} van ${STEPS.length}${tut.hidden === tut.step ? ' (verborgen)' : ''}.`),
          h(
            'div',
            { class: 'ms-btns' },
            h(
              'button',
              {
                class: 'btn btn-small',
                type: 'button',
                onClick: () => {
                  showHints(ext);
                  opdrachten(args);
                },
              },
              'Tips tonen',
            ),
            h(
              'button',
              {
                class: 'btn btn-small',
                type: 'button',
                onClick: () => {
                  skipTutorial(ext);
                  toast('Tutorial overgeslagen.');
                  opdrachten(args);
                },
              },
              'Overslaan',
            ),
          ),
        );
    page(
      'Opdrachten',
      h(
        'div',
        { class: 'ms-card' },
        h('small', {}, ext.chain < MISSIONS.length ? `Opdracht ${ext.chain + 1} van ${MISSIONS.length}` : 'Vrije opdracht'),
        h('h4', {}, m.title),
        h('p', {}, describeGoal(m.goal)),
        sayBar(h, p.value, p.goal),
        h('p', { class: 'ms-hint' }, ext.ready ? 'Klaar! Ga naar Oma Mies bij de strandhut voor je beloning.' : m.hint),
      ),
      tutorialCard,
      h('p', {}, `Je titel: ${ext.titles.at(-1) ?? 'nog geen. Haal er een door opdrachten te doen.'}`),
      h('div', { class: 'ms-group' }, `Afgerond (${ext.done})`),
      ...done.map((l) => h('div', { class: 'ms-row' }, `✔ ${l.title}`, h('small', {}, `dag ${l.day}`))),
      done.length ? null : h('p', { class: 'phone-empty' }, 'Nog niets afgerond. Oma Mies weet wel wat je moet doen.'),
    );
  };

  const prestaties = ({ page, h }) => {
    const ext = get();
    ext.seenAch = achievedCount(ext); // opened: the badge goes
    const m = metricsOf(game, ext);
    const got = achievedCount(ext);
    const body = [
      h('p', {}, `${got} van ${ACHIEVEMENTS.length} prestaties gehaald.`),
      sayBar(h, got, ACHIEVEMENTS.length),
    ];
    for (const [key, label] of Object.entries(GROUPS)) {
      const list = ACHIEVEMENTS.filter((a) => a.group === key);
      body.push(h('div', { class: 'ms-group' }, `${label} (${list.filter((a) => ext.achieved[a.id] !== undefined).length}/${list.length})`));
      for (const a of list) {
        const done = ext.achieved[a.id] !== undefined;
        const secret = a.hidden && !done;
        const value = Math.min(m[a.key] ?? 0, a.goal);
        body.push(
          h(
            'div',
            { class: `ms-ach ${done ? 'is-done' : ''}` },
            h('span', { class: 'ms-ach-ico', 'aria-hidden': 'true' }, done ? '🏆' : secret ? '❔' : '🔒'),
            h(
              'div',
              { class: 'ms-ach-body' },
              h('strong', {}, secret ? '???' : a.name),
              h('small', {}, secret ? 'Geheime prestatie.' : a.text),
              done ? null : sayBar(h, value, a.goal),
              done ? h('small', {}, `Gehaald op dag ${ext.achieved[a.id]}`) : null,
            ),
          ),
        );
      }
    }
    page('Prestaties', ...body);
  };

  const vaardigheden = (args) => {
    const { page, h, toast } = args;
    const s = game.state;
    const free = pointsFree(s, game.rank);
    page(
      'Vaardigheden',
      h(
        'div',
        { class: 'ms-card' },
        h('strong', {}, `Vrije punten: ${free}`),
        h('p', { class: 'ms-hint' }, 'Je krijgt er twee bij elke rang, en soms één van een opdracht. Eén punt is één niveau.'),
      ),
      ...SKILLS.map((sk) => {
        const lv = skillLevel(s, sk.id);
        const pips = Array.from({ length: MAX_LEVEL }, (_, i) => h('i', { class: i < lv ? 'is-on' : '' }));
        return h(
          'div',
          { class: 'ms-skill' },
          h('span', { class: 'ms-skill-ico', 'aria-hidden': 'true' }, sk.icon),
          h(
            'div',
            { class: 'ms-skill-body' },
            h('strong', {}, sk.name),
            h('small', {}, sk.text),
            h('div', { class: 'ms-pips' }, ...pips),
            h('small', {}, lv ? `Nu: ${effectText(sk.id, lv)}` : `Eerste niveau: ${effectText(sk.id, 1)}`),
          ),
          h(
            'button',
            {
              class: 'btn btn-small btn-primary',
              type: 'button',
              disabled: lv >= MAX_LEVEL || free < 1,
              onClick: () => {
                if (!buySkill(s, sk.id, game.rank)) return;
                game.emit('change');
                toast(`${sk.name}: niveau ${lv + 1}`);
                vaardigheden(args);
              },
            },
            lv >= MAX_LEVEL ? 'Max' : '+1 · 1 punt',
          ),
        );
      }),
    );
  };

  return [
    { id: 'opdrachten', label: 'Opdrachten', icon: '📜', color: '#ffb020', badge: () => (get().ready ? 1 : 0), render: opdrachten },
    { id: 'prestaties', label: 'Prestaties', icon: '🏆', color: '#9b7bff', badge: () => unseenAchievements(get()), render: prestaties },
    { id: 'vaardigheden', label: 'Vaardigheden', icon: '💪', color: '#35c2a5', badge: () => pointsFree(game.state, game.rank), render: vaardigheden },
  ];
}
