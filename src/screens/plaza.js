// The Mii plaza: every saved Mii, plus creating, editing, copying and deleting.

import { h, icon, modal, toast } from '../ui/dom.js';
import { miiStore } from '../mii/storage.js';
import { snapshotImage } from '../mii/thumbs.js';
import { defaultMii, cloneMii, newId, lookAlikes } from '../mii/data.js';
import { FAVORITE_COLORS } from '../mii/palette.js';

export function plazaScreen(root, app, { selected = null } = {}) {
  let current = selected;
  let alive = true;
  const cancelled = () => !alive;

  const grid = h('div', { class: 'plaza-grid', role: 'listbox', 'aria-label': "Jouw Mii's" });
  const actionName = h('strong', { class: 'actions-name' });
  const actions = h(
    'div',
    { class: 'plaza-actions', hidden: true },
    actionName,
    h('div', { class: 'actions-buttons' },
      h('button', { class: 'btn btn-primary', type: 'button', onClick: () => edit(current) }, icon('edit'), 'Bewerken'),
      h('button', { class: 'btn', type: 'button', onClick: () => copy(current) }, icon('copy'), 'Kopiëren'),
      h('button', { class: 'btn btn-danger-soft', type: 'button', onClick: () => remove(current) }, icon('trash'), 'Verwijderen'),
    ),
  );

  function render() {
    const miis = miiStore.all();
    if (current && !miis.some((m) => m.id === current)) current = null;
    grid.replaceChildren(
      h(
        'button',
        { class: 'mii-card mii-card-new', type: 'button', onClick: create },
        h('span', { class: 'new-plus' }, icon('plus')),
        h('span', { class: 'mii-name' }, 'Nieuwe Mii'),
      ),
      ...miis.map((m) => {
        const img = h('img', { class: 'portrait', alt: '', width: 160, height: 160 });
        snapshotImage(img, m, { view: 'face', size: 192 }, cancelled);
        const isSel = m.id === current;
        return h(
          'button',
          {
            class: `mii-card ${isSel ? 'is-selected' : ''}`,
            type: 'button',
            role: 'option',
            'aria-selected': String(isSel),
            'data-id': m.id,
            onClick: () => select(m.id),
            onDblclick: () => edit(m.id),
          },
          img,
          h('span', { class: 'mii-name' }, h('i', { class: 'fav', style: { background: FAVORITE_COLORS[m.favoriteColor].hex } }), m.name),
        );
      }),
    );
    const m = current && miiStore.get(current);
    actions.hidden = !m;
    if (m) actionName.textContent = m.name;
    count.textContent = miis.length === 1 ? '1 Mii' : `${miis.length} Mii's`;
  }

  function select(id) {
    current = current === id ? null : id;
    render();
    grid.querySelector(`[data-id="${current ?? id}"]`)?.focus();
  }

  function edit(id) {
    const m = miiStore.get(id);
    if (m) app.go('editor', { mii: m, isNew: false });
  }

  function copy(id) {
    const m = miiStore.get(id);
    if (!m) return;
    const twin = cloneMii(m);
    twin.id = newId();
    miiStore.save(twin);
    current = twin.id;
    render();
    toast(`${m.name} gekopieerd`);
  }

  function remove(id) {
    const m = miiStore.get(id);
    if (!m) return;
    const img = h('img', { class: 'confirm-portrait', alt: '', width: 120, height: 120 });
    snapshotImage(img, m, { view: 'face', size: 192 });
    modal({
      title: `${m.name} verwijderen?`,
      body: [img, h('p', null, 'Deze Mii verdwijnt uit het Mii-kanaal. Dit kun je niet ongedaan maken.')],
      actions: [
        { label: 'Bewaren' },
        {
          label: 'Verwijderen',
          kind: 'danger',
          onClick: () => {
            miiStore.remove(id);
            current = null;
            render();
            toast(`${m.name} is verwijderd`);
          },
        },
      ],
    });
  }

  function create() {
    const start = (mii) => {
      dlg.close();
      app.go('editor', { mii, isNew: true });
    };
    const lookGrid = h('div', { class: 'lookalike-grid' });
    let seed = Date.now();
    const fillLooks = () => {
      lookGrid.replaceChildren(
        ...lookAlikes(8, seed++).map((m) => {
          const img = h('img', { alt: '', width: 120, height: 120 });
          snapshotImage(img, m, { view: 'face', size: 160 }, cancelled);
          return h('button', { class: 'lookalike', type: 'button', 'aria-label': `Begin met ${m.name}`, onClick: () => start(m) }, img);
        }),
      );
    };
    fillLooks();
    const dlg = modal({
      title: 'Nieuwe Mii',
      wide: true,
      body: [
        h('p', { class: 'modal-lead' }, 'Begin met een leeg gezicht:'),
        h('div', { class: 'start-choice' },
          h('button', { class: 'btn btn-big', type: 'button', onClick: () => start(defaultMii('m')) }, 'Man'),
          h('button', { class: 'btn btn-big', type: 'button', onClick: () => start(defaultMii('f')) }, 'Vrouw'),
        ),
        h('div', { class: 'lookalike-head' },
          h('p', { class: 'modal-lead' }, 'Of kies een lookalike en pas die aan:'),
          h('button', { class: 'btn btn-small', type: 'button', onClick: fillLooks }, icon('dice'), 'Andere gezichten'),
        ),
        lookGrid,
      ],
      actions: [{ label: 'Annuleren' }],
    });
  }

  const count = h('span', { class: 'bar-sub' });
  const warning = miiStore.persistent
    ? null
    : h('p', { class: 'notice' }, 'Je browser blokkeert opslag. Je Mii\'s blijven bewaard tot je de pagina sluit.');

  const screen = h(
    'main',
    { class: 'screen plaza' },
    h('header', { class: 'bar' },
      h('button', { class: 'btn btn-round', type: 'button', 'aria-label': 'Terug naar het menu', onClick: () => app.go('menu') }, icon('back')),
      h('div', { class: 'bar-title' }, h('h1', null, 'Mii-kanaal'), count),
      h('button', { class: 'btn btn-primary', type: 'button', onClick: create }, icon('plus'), 'Nieuwe Mii'),
    ),
    warning,
    grid,
    actions,
  );
  root.append(screen);
  render();
  if (current) grid.querySelector(`[data-id="${current}"]`)?.scrollIntoView({ block: 'nearest' });

  return {
    unmount() {
      alive = false;
    },
  };
}
