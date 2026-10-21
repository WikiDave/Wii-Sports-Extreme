// The title screen: Wahoe-eiland turns slowly behind an animated logo and big Wii-style
// buttons. Doorgaan (Spelen when there is no save yet) opens the island, Mii-kanaal opens the
// Mii channel, and Instellingen holds sound, graphics, camera and the rest (kept in this browser).

import { h, icon, modal } from '../ui/dom.js';
import { miiStore } from '../mii/storage.js';
import { snapshotImage } from '../mii/thumbs.js';
import { SAVE_KEY, RANKS, migrate, rankOf } from '../game/state.js';
import { loadSettings, saveSettings, normalizeSettings, DEFAULTS } from '../game/uiterlijk/settings.js';
import { TitleScene } from '../game/uiterlijk/titleScene.js';

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The saved game in short: day, cash and rank, or null without a save. */
function readSave() {
  try {
    const raw = storage()?.getItem(SAVE_KEY);
    const s = raw ? migrate(JSON.parse(raw)) : null;
    return s ? { day: s.day, cash: s.cash, rank: rankOf(s.xp) } : null;
  } catch {
    return null;
  }
}

/** The logo with one span per letter, so each letter can bob on its own. */
function logo() {
  let i = 0;
  const word = (text, cls = '') =>
    h('span', { class: `title-word ${cls}`, 'aria-hidden': 'true' }, ...[...text].map((c) => h('span', { class: 'ch', style: { '--i': i++ } }, c)));
  return h('h1', { class: 'logo title-logo', 'aria-label': 'Wii Sports Extreme' }, word('Wii', 'logo-wii'), word('Sports'), word('Extreme', 'logo-x'));
}

function row(label, control) {
  return h('div', { class: 'set-row' }, h('span', { class: 'set-label' }, label), control);
}

/** A slider with its value written next to it. */
function slider(label, value, min, max, step, format, onInput) {
  const out = h('output', { class: 'set-value' }, format(value));
  const input = h('input', {
    type: 'range',
    class: 'set-slider',
    min,
    max,
    step,
    value,
    'aria-label': label,
    onInput: (e) => {
      const v = Number(e.target.value);
      out.textContent = format(v);
      onInput(v);
    },
  });
  return h('div', { class: 'set-row' }, h('span', { class: 'set-label' }, label), h('span', { style: { display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 200px', justifyContent: 'flex-end' } }, input, out));
}

/** Pick one of several options (a segmented control). */
function segment(options, value, onPick) {
  const wrap = h('div', { class: 'seg', role: 'group' });
  const draw = (current) =>
    wrap.replaceChildren(
      ...options.map(([id, text]) =>
        h('button', {
          type: 'button',
          'aria-pressed': String(id === current),
          onClick: () => {
            onPick(id);
            draw(id);
          },
        }, text)),
    );
  draw(value);
  return wrap;
}

/** An on/off switch. */
function toggle(label, value, onPick) {
  const btn = h('button', {
    type: 'button',
    class: 'switch',
    role: 'switch',
    'aria-label': label,
    'aria-checked': String(value),
    onClick: () => {
      const on = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', String(on));
      onPick(on);
    },
  });
  return btn;
}

/** The settings dialog. Every change is saved at once. */
function openSettings(store) {
  let s = loadSettings(store);
  const set = (patch) => {
    s = normalizeSettings({ ...s, ...patch });
    saveSettings(store, s);
  };
  const pct = (v) => `${Math.round(v * 100)}%`;
  const body = h(
    'div',
    { class: 'set-groups' },
    h(
      'div',
      { class: 'set-group' },
      h('h3', {}, 'Geluid'),
      slider('Geluidseffecten', Math.round(s.volume * 100), 0, 100, 5, (v) => `${v}%`, (v) => set({ volume: v / 100 })),
      slider('Muziek', Math.round(s.music * 100), 0, 100, 5, (v) => `${v}%`, (v) => set({ music: v / 100 })),
    ),
    h(
      'div',
      { class: 'set-group' },
      h('h3', {}, 'Beeld'),
      row('Kwaliteit', segment([['auto', 'Auto'], ['high', 'Hoog'], ['low', 'Laag']], s.quality, (id) => set({ quality: id }))),
      h('p', { class: 'set-note' }, 'Auto is laag op een telefoon en hoog op de computer. Laag is zuiniger en vloeiender.'),
    ),
    h(
      'div',
      { class: 'set-group' },
      h('h3', {}, 'Camera'),
      slider('Gevoeligheid', Math.round(s.sensitivity * 100), 50, 200, 10, (v) => `${v}%`, (v) => set({ sensitivity: v / 100 })),
      row('Y-as omkeren', toggle('Y-as omkeren', s.invertY, (on) => set({ invertY: on }))),
    ),
    h('p', { class: 'set-note' }, 'Wijzigingen gelden zodra je het eiland opent.'),
  );
  let dlg = null;
  dlg = modal({
    title: 'Instellingen',
    body,
    actions: [
      {
        label: 'Standaard',
        onClick: () => {
          set(DEFAULTS);
          dlg.close();
          openSettings(store);
          return false;
        },
      },
      { label: 'Klaar', kind: 'primary' },
    ],
  });
}

export function menuScreen(root, app) {
  const store = storage();
  const save = readSave();
  const phone = matchMedia('(pointer: coarse)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const miis = miiStore.all();

  const faces = h('span', { class: 'wbtn-faces', 'aria-hidden': 'true' });
  for (const m of miis.slice(0, 3)) {
    const img = h('img', { alt: '', width: 30, height: 30 });
    snapshotImage(img, m, { view: 'face', size: 96 });
    faces.append(img);
  }

  const primary = h(
    'button',
    { class: 'wbtn wbtn-primary', type: 'button', onClick: () => app.go('island') },
    icon('play'),
    save ? 'Doorgaan' : 'Spelen',
  );
  const note = h(
    'p',
    { class: 'wbtn-note' },
    save ? `Dag ${save.day} · €${save.cash.toLocaleString('nl-NL')} · ${RANKS[save.rank]}` : 'Je begint op het strand, bij je Mii.',
  );
  const bgEl = h('div', { class: 'title-bg' });
  const screen = h(
    'main',
    { class: 'screen title' },
    bgEl,
    h('div', { class: 'title-shade', 'aria-hidden': 'true' }),
    h('header', { class: 'title-head' }, logo(), h('p', { class: 'title-sub' }, 'Maak je Mii en verken het eiland.')),
    h(
      'nav',
      { class: 'title-menu', 'aria-label': 'Hoofdmenu' },
      primary,
      note,
      h(
        'div',
        { class: 'wbtn-row' },
        h('button', { class: 'wbtn wbtn-small', type: 'button', onClick: () => app.go('plaza') }, faces, 'Mii-kanaal'),
        h('button', { class: 'wbtn wbtn-small', type: 'button', onClick: () => openSettings(store) }, icon('gear'), 'Instellingen'),
      ),
    ),
    h('footer', { class: 'title-foot' }, h('span', {}, `${miis.length} Mii's opgeslagen`), h('span', {}, 'Wahoe-eiland')),
  );
  root.append(screen);

  // The island turns behind the title once the title is on screen (building it takes a moment).
  let scene = null;
  const timer = setTimeout(() => {
    try {
      scene = new TitleScene(bgEl, { phone, reducedMotion });
      scene.build();
      bgEl.classList.add('is-ready');
    } catch (err) {
      console.warn('Het titelbeeld kon niet worden getekend.', err);
    }
  }, 80);

  return {
    unmount() {
      clearTimeout(timer);
      scene?.dispose();
      scene = null;
    },
  };
}
