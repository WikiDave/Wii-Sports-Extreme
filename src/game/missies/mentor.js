// Oma Mies: the Mii who gives the missions, standing beside the beach hut. The 3D Mii idles and
// blinks; her portrait (a snapshot of the same Mii) sits in the dialogue box. Browser only.

import { MiiModel } from '../../mii/model.js';
import { randomMii, seededRandom, setPath, normalizeMii } from '../../mii/data.js';
import { snapshotImage } from '../../mii/thumbs.js';
import { h, modal } from '../../ui/dom.js';
import { MII_SCALE } from '../player.js';
import { shadowsOn } from '../world/render.js';

/** Her Mii: a fixed look (the same every game), with grey hair. */
export function mentorData() {
  const m = randomMii('f', seededRandom(20260611));
  m.id = 'oma-mies';
  m.name = 'Oma Mies';
  m.creator = '';
  setPath(m, 'hair.color', 4);
  return normalizeMii(m);
}

/**
 * Puts her in the scene at (x, z) on the ground, turned towards (fx, fz). Returns
 * { data, group, update(t), dispose() }.
 */
export function createMentor(scene, { x, z, y, fx, fz }) {
  const data = mentorData();
  const mii = new MiiModel(data);
  mii.group.scale.setScalar(MII_SCALE);
  mii.group.position.set(x, y, z);
  mii.group.rotation.y = Math.atan2(fx - x, fz - z);
  shadowsOn(mii.group, false);
  scene.add(mii.group);
  let lastBlink = false;
  return {
    data,
    group: mii.group,
    update(t) {
      mii.idle(t);
      const closed = Math.sin(t * 0.9) > 0.985 || Math.sin(t * 2.3 + 1) > 0.995;
      if (closed !== lastBlink) {
        lastBlink = closed;
        mii.setBlink(closed);
      }
    },
    dispose() {
      scene.remove(mii.group);
      mii.dispose();
    },
  };
}

/**
 * The dialogue box: a portrait, the name and one line at a time ('Verder' steps through them).
 * onClose runs when the box closes. Returns the modal ({ close, dialog }).
 */
export function openMentor(data, lines, onClose) {
  let i = 0;
  const img = h('img', { class: 'ms-portrait', alt: 'Oma Mies', width: 96, height: 96 });
  snapshotImage(img, data, { view: 'face', size: 192 });
  const say = h('p', { class: 'ms-say' });
  const body = h('div', { class: 'ms-mentor' }, img, h('div', {}, h('span', { class: 'ms-name' }, 'Oma Mies'), say));
  const show = () => {
    say.textContent = lines[i];
  };
  show();
  const dlg = modal({
    title: 'Oma Mies',
    body,
    actions: [
      {
        label: lines.length > 1 ? 'Verder' : 'Tot ziens',
        kind: 'primary',
        onClick: () => {
          if (i >= lines.length - 1) return true;
          i++;
          show();
          const btn = dlg.dialog.querySelector('.modal-actions .btn');
          if (btn) btn.textContent = i >= lines.length - 1 ? 'Tot ziens' : 'Verder';
          return false;
        },
      },
    ],
    onClose,
  });
  return dlg;
}
