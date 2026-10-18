// The Mii editor: a live 3D preview next to a panel of tabs, one per part of the Mii.

import { h, icon, modal, toast } from '../ui/dom.js';
import { MiiStage } from '../three/stage.js';
import { MiiModel } from '../mii/model.js';
import { RANGES, NAME_MAX, normalizeMii, cloneMii, getPath, setPath, randomMii } from '../mii/data.js';
import { miiStore } from '../mii/storage.js';
import { drawFeatureThumb, EYES, BROWS, NOSES, MOUTHS, MUSTACHES, BEARDS, GLASSES, FEATURES } from '../mii/face.js';
import { FACE_SHAPES } from '../mii/head.js';
import { HAIR_STYLES } from '../mii/hair.js';
import { snapshotImage } from '../mii/thumbs.js';
import { FAVORITE_COLORS, SKIN_COLORS, HAIR_COLORS, EYE_COLORS, LIP_COLORS, GLASSES_COLORS } from '../mii/palette.js';

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

const TABS = [
  { id: 'profile', label: 'Profiel', view: 'body' },
  { id: 'body', label: 'Lichaam', view: 'body' },
  { id: 'face', label: 'Gezicht', view: 'face' },
  { id: 'hair', label: 'Haar', view: 'face' },
  { id: 'brows', label: 'Brauwen', view: 'face' },
  { id: 'eyes', label: 'Ogen', view: 'face' },
  { id: 'nose', label: 'Neus', view: 'face' },
  { id: 'mouth', label: 'Mond', view: 'face' },
  { id: 'beard', label: 'Snor & baard', view: 'face' },
  { id: 'glasses', label: 'Bril', view: 'face' },
  { id: 'mole', label: 'Moedervlek', view: 'face' },
];

// Stepper presets: [label, minus icon, minus label, plus icon, plus label]
const STEP = {
  size: ['Grootte', 'minus', 'Kleiner', 'plus', 'Groter'],
  y: ['Hoogte', 'up', 'Omhoog', 'down', 'Omlaag'],
  x: ['Links / rechts', 'left', 'Naar links', 'right', 'Naar rechts'],
  spacing: ['Afstand', 'closer', 'Dichter bij elkaar', 'apart', 'Verder uit elkaar'],
  rotation: ['Draaiing', 'rotr', 'Draai naar beneden', 'rotl', 'Draai omhoog'],
};

let lastTab = 'face';

export function editorScreen(root, app, { mii, isNew }) {
  let draft = normalizeMii(cloneMii(mii));
  const original = JSON.stringify(draft);
  let tab = isNew ? 'profile' : lastTab;
  let alive = true;
  const cancelled = () => !alive;

  // ------------------------------------------------------------ layout
  const preview = h('div', { class: 'preview', 'aria-label': 'Voorbeeld van je Mii. Sleep om te draaien.' });
  const nameplate = h('span', { class: 'nameplate' });
  const viewFace = h('button', { class: 'seg', type: 'button', onClick: () => setView('face') }, 'Gezicht');
  const viewBody = h('button', { class: 'seg', type: 'button', onClick: () => setView('body') }, 'Lichaam');
  const tabsNav = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Onderdelen' });
  const tabBody = h('div', { class: 'tab-body', role: 'tabpanel' });

  const screen = h(
    'main',
    { class: 'screen editor' },
    h('header', { class: 'bar' },
      h('button', { class: 'btn', type: 'button', onClick: cancel }, 'Annuleren'),
      h('div', { class: 'bar-title' }, h('h1', null, isNew ? 'Nieuwe Mii' : 'Mii bewerken')),
      h('button', { class: 'btn btn-primary', type: 'button', onClick: save }, icon('check'), 'Opslaan'),
    ),
    h('div', { class: 'editor-main' },
      h('section', { class: 'preview-wrap' },
        preview,
        nameplate,
        h('div', { class: 'preview-tools' },
          h('div', { class: 'segmented', role: 'group', 'aria-label': 'Camera' }, viewFace, viewBody),
          h('button', { class: 'btn btn-round', type: 'button', title: 'Terugdraaien', 'aria-label': 'Mii terugdraaien', onClick: () => stage.resetTurn() }, icon('turn')),
          h('button', { class: 'btn btn-round', type: 'button', title: 'Willekeurige Mii', 'aria-label': 'Willekeurige Mii', onClick: shuffle }, icon('dice')),
        ),
      ),
      h('section', { class: 'panel' }, tabsNav, tabBody),
    ),
  );
  root.append(screen);

  const stage = new MiiStage(preview);
  const model = new MiiModel(draft);
  stage.setModel(model);

  // ------------------------------------------------------------ state

  function commit(mutate, { rerender = true } = {}) {
    mutate(draft);
    draft = normalizeMii(draft);
    model.update(draft);
    stage.refocus();
    nameplate.textContent = draft.name;
    if (rerender) renderTab();
  }

  function setView(view) {
    stage.setView(view);
    viewFace.classList.toggle('is-on', view === 'face');
    viewBody.classList.toggle('is-on', view === 'body');
    viewFace.setAttribute('aria-pressed', String(view === 'face'));
    viewBody.setAttribute('aria-pressed', String(view === 'body'));
  }

  function selectTab(id) {
    tab = id;
    lastTab = id;
    for (const b of tabsNav.children) {
      const on = b.dataset.tab === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    setView(TABS.find((t) => t.id === id).view);
    renderTab();
    tabBody.scrollTop = 0;
  }

  function renderTab() {
    const focusKey = document.activeElement?.dataset?.key;
    tabBody.replaceChildren(...RENDER[tab]());
    if (focusKey) tabBody.querySelector(`[data-key="${CSS.escape(focusKey)}"]`)?.focus();
  }

  function save() {
    const saved = miiStore.save(draft);
    toast(`${saved.name} is opgeslagen`);
    app.go('plaza', { selected: saved.id });
  }

  function cancel() {
    if (JSON.stringify(draft) === original) {
      app.go('plaza', { selected: isNew ? null : draft.id });
      return;
    }
    modal({
      title: 'Stoppen zonder opslaan?',
      body: h('p', null, isNew ? 'Deze nieuwe Mii wordt niet bewaard.' : 'Je wijzigingen aan deze Mii gaan verloren.'),
      actions: [
        { label: 'Niet opslaan', kind: 'danger', onClick: () => app.go('plaza', { selected: isNew ? null : draft.id }) },
        { label: 'Verder bewerken', kind: 'primary' },
      ],
    });
  }

  function shuffle() {
    commit((d) => {
      const r = randomMii(d.gender);
      for (const k of ['id', 'name', 'creator', 'birthday', 'gender']) r[k] = d[k];
      Object.assign(d, r);
    });
  }

  // ------------------------------------------------------------ building blocks

  const group = (title, ...content) => h('section', { class: 'group' }, h('h2', { class: 'group-title' }, title), ...content);

  /** A grid of options; thumb(i) returns the icon element for option i. */
  function options(path, list, thumb, label) {
    const value = getPath(draft, path);
    return h(
      'div',
      { class: 'options', role: 'radiogroup', 'aria-label': label },
      list.map((item, i) =>
        h(
          'button',
          {
            class: `opt ${i === value ? 'is-selected' : ''} ${item.none ? 'opt-none' : ''}`,
            type: 'button',
            role: 'radio',
            'aria-checked': String(i === value),
            'aria-label': item.name,
            title: item.name,
            'data-key': `${path}:${i}`,
            onClick: () => commit((d) => setPath(d, path, i)),
          },
          thumb(i),
          item.none ? h('span', { class: 'opt-text' }, item.name) : null,
        ),
      ),
    );
  }

  /** Icon drawn with the 2D face artwork (eyes, mouths, ...). */
  const faceThumb = (path, kind) => (i) => {
    const c = h('canvas', { class: 'opt-art', width: 112, height: 112 });
    const variant = cloneMii(draft);
    setPath(variant, path, i);
    drawFeatureThumb(c, variant, kind);
    return c;
  };

  /** Icon rendered in 3D (hairstyles, face shapes). */
  const modelThumb = (path, view, tweak = () => {}, yaw = 0) => (i) => {
    const img = h('img', { class: 'opt-art', alt: '', width: 112, height: 112 });
    const variant = cloneMii(draft);
    setPath(variant, path, i);
    variant.glasses.type = 0;
    tweak(variant);
    snapshotImage(img, variant, { view, size: 128, yaw }, cancelled);
    return img;
  };

  function swatches(path, colors, label, big = false) {
    const value = getPath(draft, path);
    return h(
      'div',
      { class: `swatches ${big ? 'swatches-big' : ''}`, role: 'radiogroup', 'aria-label': label },
      colors.map((c, i) =>
        h('button', {
          class: `swatch ${i === value ? 'is-selected' : ''}`,
          type: 'button',
          role: 'radio',
          'aria-checked': String(i === value),
          'aria-label': c.name,
          title: c.name,
          'data-key': `${path}:${i}`,
          style: { '--swatch': c.hex },
          onClick: () => commit((d) => setPath(d, path, i)),
        }),
      ),
    );
  }

  function stepper(path, kind) {
    const [label, minusIcon, minusLabel, plusIcon, plusLabel] = STEP[kind];
    const [min, max] = RANGES[path];
    const value = getPath(draft, path);
    // For vertical position and rotation the "minus" button lowers the stored value.
    const step = (delta) => commit((d) => setPath(d, path, Math.min(max, Math.max(min, getPath(d, path) + delta))));
    const pct = ((value - min) / (max - min)) * 100;
    return h(
      'div',
      { class: 'stepper' },
      h('span', { class: 'stepper-label' }, label),
      h('button', { class: 'btn btn-step', type: 'button', 'aria-label': minusLabel, title: minusLabel, 'data-key': `${path}:-`, disabled: value <= min, onClick: () => step(-1) }, icon(minusIcon)),
      h('span', { class: 'track', role: 'img', 'aria-label': `${label}: ${value - min + 1} van ${max - min + 1}` },
        h('span', { class: 'track-fill', style: { width: `${pct}%` } }),
        h('span', { class: 'track-knob', style: { left: `${pct}%` } }),
      ),
      h('button', { class: 'btn btn-step', type: 'button', 'aria-label': plusLabel, title: plusLabel, 'data-key': `${path}:+`, disabled: value >= max, onClick: () => step(1) }, icon(plusIcon)),
    );
  }

  function toggle(label, checked, onChange, key) {
    return h(
      'button',
      { class: `toggle ${checked ? 'is-on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(checked), 'data-key': key, onClick: () => onChange(!checked) },
      h('span', { class: 'toggle-track' }, h('span', { class: 'toggle-knob' })),
      label,
    );
  }

  function slider(path, label, [lo, hi]) {
    const [min, max] = RANGES[path];
    const id = 'sl-' + path.replace('.', '-');
    const input = h('input', {
      id,
      class: 'range',
      type: 'range',
      min,
      max,
      value: getPath(draft, path),
      onInput: (e) => commit((d) => setPath(d, path, Number(e.target.value)), { rerender: false }),
    });
    return h('div', { class: 'slider' },
      h('label', { class: 'slider-label', for: id }, label),
      h('div', { class: 'slider-row' }, h('span', { class: 'slider-end' }, lo), input, h('span', { class: 'slider-end' }, hi)),
    );
  }

  // ------------------------------------------------------------ tabs

  const RENDER = {
    profile: () => {
      const nameInput = h('input', {
        id: 'mii-name',
        class: 'text',
        type: 'text',
        maxlength: NAME_MAX,
        autocomplete: 'off',
        value: draft.name,
        onInput: (e) => commit((d) => (d.name = e.target.value), { rerender: false }),
      });
      const creatorInput = h('input', {
        id: 'mii-creator',
        class: 'text',
        type: 'text',
        maxlength: NAME_MAX,
        autocomplete: 'off',
        placeholder: 'Jouw naam',
        value: draft.creator,
        onInput: (e) => commit((d) => (d.creator = e.target.value), { rerender: false }),
      });
      const gender = h('div', { class: 'segmented segmented-wide', role: 'radiogroup', 'aria-label': 'Geslacht' },
        [['m', 'Man'], ['f', 'Vrouw']].map(([g, label]) =>
          h('button', {
            class: `seg ${draft.gender === g ? 'is-on' : ''}`,
            type: 'button',
            role: 'radio',
            'aria-checked': String(draft.gender === g),
            'data-key': `gender:${g}`,
            onClick: () => commit((d) => (d.gender = g)),
          }, label),
        ),
      );
      const month = h('select', { id: 'mii-month', class: 'select', onChange: (e) => commit((d) => (d.birthday.month = Number(e.target.value)), { rerender: false }) },
        h('option', { value: 0 }, 'Maand'),
        MONTHS.map((name, i) => h('option', { value: i + 1, selected: draft.birthday.month === i + 1 }, name)),
      );
      const day = h('select', { id: 'mii-day', class: 'select', 'aria-label': 'Dag', onChange: (e) => commit((d) => (d.birthday.day = Number(e.target.value)), { rerender: false }) },
        h('option', { value: 0 }, 'Dag'),
        Array.from({ length: 31 }, (_, i) => h('option', { value: i + 1, selected: draft.birthday.day === i + 1 }, String(i + 1))),
      );
      return [
        group('Naam', h('div', { class: 'field' }, h('label', { for: 'mii-name' }, 'Mii-naam'), nameInput, h('span', { class: 'hint' }, `Maximaal ${NAME_MAX} tekens`))),
        group('Gemaakt door', h('div', { class: 'field' }, h('label', { for: 'mii-creator' }, 'Maker'), creatorInput)),
        group('Geslacht', gender),
        group('Verjaardag', h('div', { class: 'field-row' }, h('label', { class: 'sr-only', for: 'mii-month' }, 'Maand'), month, day)),
      ];
    },

    body: () => [
      group('Lengte', slider('height', 'Lengte', ['Klein', 'Lang'])),
      group('Postuur', slider('weight', 'Postuur', ['Slank', 'Stevig'])),
      group('Lievelingskleur', swatches('favoriteColor', FAVORITE_COLORS, 'Lievelingskleur', true)),
    ],

    face: () => [
      group('Gezichtsvorm', options('face.shape', FACE_SHAPES, modelThumb('face.shape', 'face', (v) => (v.hair.style = 3)), 'Gezichtsvorm')),
      group('Huidskleur', swatches('face.skin', SKIN_COLORS, 'Huidskleur')),
      group('Kenmerken', options('face.feature', FEATURES, faceThumb('face.feature', 'feature'), 'Kenmerken')),
    ],

    hair: () => [
      group('Kapsel', options('hair.style', HAIR_STYLES, modelThumb('hair.style', 'face', () => {}, 0.5), 'Kapsel')),
      group('Haarkleur', swatches('hair.color', HAIR_COLORS, 'Haarkleur')),
      group('Scheiding', toggle('Kapsel spiegelen', draft.hair.flip, (on) => commit((d) => (d.hair.flip = on)), 'hair.flip')),
    ],

    brows: () => [
      group('Vorm', options('brows.type', BROWS, faceThumb('brows.type', 'brows'), 'Wenkbrauwvorm')),
      group('Kleur', swatches('brows.color', HAIR_COLORS, 'Wenkbrauwkleur')),
      group('Aanpassen', stepper('brows.size', 'size'), stepper('brows.y', 'y'), stepper('brows.spacing', 'spacing'), stepper('brows.rotation', 'rotation')),
    ],

    eyes: () => [
      group('Vorm', options('eyes.type', EYES, faceThumb('eyes.type', 'eyes'), 'Oogvorm')),
      group('Kleur', swatches('eyes.color', EYE_COLORS, 'Oogkleur')),
      group('Aanpassen', stepper('eyes.size', 'size'), stepper('eyes.y', 'y'), stepper('eyes.spacing', 'spacing'), stepper('eyes.rotation', 'rotation')),
    ],

    nose: () => [
      group('Vorm', options('nose.type', NOSES, faceThumb('nose.type', 'nose'), 'Neusvorm')),
      group('Aanpassen', stepper('nose.size', 'size'), stepper('nose.y', 'y')),
    ],

    mouth: () => [
      group('Vorm', options('mouth.type', MOUTHS, faceThumb('mouth.type', 'mouth'), 'Mondvorm')),
      group('Lipkleur', swatches('mouth.color', LIP_COLORS, 'Lipkleur')),
      group('Aanpassen', stepper('mouth.size', 'size'), stepper('mouth.y', 'y')),
    ],

    beard: () => [
      group('Snor', options('facialHair.mustache', MUSTACHES, faceThumb('facialHair.mustache', 'mustache'), 'Snor')),
      group('Baard', options('facialHair.beard', BEARDS, faceThumb('facialHair.beard', 'beard'), 'Baard')),
      group('Kleur', swatches('facialHair.color', HAIR_COLORS, 'Kleur van snor en baard')),
      group('Snor aanpassen', stepper('facialHair.size', 'size'), stepper('facialHair.y', 'y')),
    ],

    glasses: () => [
      group('Montuur', options('glasses.type', GLASSES, faceThumb('glasses.type', 'glasses'), 'Bril')),
      group('Kleur', swatches('glasses.color', GLASSES_COLORS, 'Brilkleur')),
      group('Aanpassen', stepper('glasses.size', 'size'), stepper('glasses.y', 'y')),
    ],

    mole: () => [
      group('Moedervlek', toggle('Moedervlek tonen', draft.mole.on, (on) => commit((d) => (d.mole.on = on)), 'mole.on')),
      draft.mole.on
        ? group('Aanpassen', stepper('mole.size', 'size'), stepper('mole.x', 'x'), stepper('mole.y', 'y'))
        : h('p', { class: 'hint' }, 'Zet de moedervlek aan om hem te verplaatsen.'),
    ],
  };

  for (const t of TABS) {
    tabsNav.append(
      h('button', {
        class: 'tab',
        type: 'button',
        role: 'tab',
        'data-tab': t.id,
        'aria-label': t.id === 'brows' ? 'Wenkbrauwen' : t.label,
        title: t.id === 'brows' ? 'Wenkbrauwen' : t.label,
        onClick: () => selectTab(t.id),
        onKeydown: (e) => {
          const i = TABS.findIndex((x) => x.id === tab);
          const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
          if (next == null) return;
          e.preventDefault();
          const target = TABS[(next + TABS.length) % TABS.length].id;
          selectTab(target);
          tabsNav.querySelector(`[data-tab="${target}"]`).focus();
        },
      }, icon(t.id, 'tab-icon'), h('span', { class: 'tab-label' }, t.label)),
    );
  }

  nameplate.textContent = draft.name;
  selectTab(tab);
  stage.refocus(true);

  return {
    unmount() {
      alive = false;
      stage.dispose();
      model.dispose();
    },
  };
}
