// The mailbox beside the hut: the flag goes up and a crate stands next to it when a delivery is
// waiting. Walk up to it to take the goods (as far as your stock has room) or to order more.

import { stockFree } from '../empire.js';
import { SUPPLIERS, TIERS } from './data.js';
import { buildCrate, buildMailbox } from './props3d.js';
import { findFree } from './place.js';
import { handelState } from './store.js';
import * as P from './suppliers.js';
import { now, whenText } from './time.js';
import { btn, chip, euro } from './ui.js';

const FLAG_UP = 0;
const FLAG_DOWN = 3.0;

export class Mailbox {
  /** hooks: { openWholesale() } opens the ordering dialog. */
  constructor(ctx, hooks) {
    this.ctx = ctx;
    this.hooks = hooks;
    const { scene, hutPos } = ctx;
    // In front of the hut, to the left of the door, on dry sand.
    const spot = findFree(ctx, hutPos.x - 7.5, hutPos.z + 7.5, { gap: 2, maxH: 6, avoid: [{ x: hutPos.x, z: hutPos.z, r: 6 }] });
    this.pos = spot;
    this.box = buildMailbox();
    this.box.position.set(spot.x, spot.y - 0.05, spot.z);
    this.box.rotation.y = 0.5;
    this.crate = buildCrate();
    this.crate.position.set(spot.x + 1.7, spot.y - 0.05, spot.z + 0.5);
    this.crate.rotation.y = -0.4;
    this.crate.visible = false;
    scene.add(this.box, this.crate);
    ctx.shadowsOn(this.box);
    ctx.shadowsOn(this.crate);
    this.colliders = [{ x: spot.x, z: spot.z, r: 0.6 }];
    this.crateCollider = { x: spot.x + 1.7, z: spot.z + 0.5, r: 1.0 };
    ctx.props.colliders.push(...this.colliders);
    this.flag = this.box.userData.flag;
    this.flag.rotation.z = FLAG_DOWN;
    this.angle = FLAG_DOWN;
    this.units = 0;
    this.pop = 0;
    this.item = ctx.interactions.add({
      x: spot.x + 0.8,
      z: spot.z + 0.3,
      r: 4.2,
      label: 'Brievenbus',
      run: () => this.open(),
    });
  }

  update(t, dt) {
    const hs = handelState(this.ctx.game);
    const units = P.crateUnits(hs);
    if (units !== this.units) {
      if (units > this.units) this.pop = 1;
      this.units = units;
      const [second, goods, third] = this.crate.userData.stack;
      this.crate.visible = units > 0;
      const list = this.ctx.props.colliders;
      const at = list.indexOf(this.crateCollider);
      if (units && at < 0) list.push(this.crateCollider);
      else if (!units && at >= 0) list.splice(at, 1);
      second.visible = units > 10;
      third.visible = units > 30;
      goods.position.y = units > 10 ? 1.45 : 0.75;
      this.item.label = units ? `Brievenbus: ${units} stuks ophalen` : 'Brievenbus';
    }
    const target = units ? FLAG_UP : FLAG_DOWN;
    this.angle += (target - this.angle) * Math.min(1, dt * 4);
    this.flag.rotation.z = this.angle + (units ? Math.sin(t * 3.2) * 0.07 : 0);
    if (this.pop > 0) {
      this.pop = Math.max(0, this.pop - dt * 2.2);
      this.crate.scale.setScalar(1 + Math.sin(this.pop * Math.PI) * 0.18);
    }
  }

  open() {
    const { game, h, modal, toast, audio } = this.ctx;
    const body = h('div', { class: 'hd hd-modal-body' });
    const draw = () => {
      const hs = handelState(game);
      const crate = P.crateUnits(hs);
      const onWay = hs.orders.filter((o) => o.status === 'onderweg');
      const room = Math.max(0, stockFree(game.state));
      body.replaceChildren(
        ...[
        crate
          ? h(
              'div',
              { class: 'hd-card is-good' },
              h('strong', {}, `📦 In de kist: ${crate} stuks`),
              ...hs.crate.map((e) => h('div', { class: 'hd-row hd-between' }, h('span', {}, `${e.n}× ${P.goodName(e.good)}${e.tier === 'standaard' ? '' : ` (${TIERS[e.tier].name.toLowerCase()})`}`), h('span', { class: 'hd-sub' }, SUPPLIERS[e.supplier]?.name ?? ''))),
              h('div', { class: 'hd-sub' }, `Plek in je voorraad: ${room} stuks.`),
              btn('Alles ophalen', () => {
                const r = P.collectCrate(game);
                toast(r.moved ? `${r.moved} stuks opgehaald.${r.left ? ` ${r.left} stuks blijven in de kist: je voorraad is vol.` : ''}` : 'Je voorraad is vol: maak eerst plek.');
                if (r.moved) audio.play('perfect');
                draw();
              }, { kind: 'is-primary', disabled: room <= 0 }),
            )
          : h('div', { class: 'hd-card' }, h('strong', {}, 'De kist is leeg'), h('div', { class: 'hd-sub' }, 'Bestellingen worden hier bezorgd, tussen 07:00 en 21:00. De vlag gaat omhoog als er iets staat.')),
        onWay.length
          ? h(
              'div',
              { class: 'hd-card' },
              h('strong', {}, 'Onderweg'),
              ...onWay.map((o) => h('div', { class: 'hd-row hd-between hd-wrap' }, h('span', {}, `${SUPPLIERS[o.supplier].name} · ${o.units} stuks`), chip(whenText(o.arriveAt, game.state.day)))),
            )
          : null,
        h('div', { class: 'hd-sub' }, `Je hebt ${euro(game.state.cash)}.`),
        btn('Nieuwe bestelling', () => {
          dlg.close();
          setTimeout(() => this.hooks.openWholesale(), 0);
        }),
        ].filter(Boolean),
      );
    };
    const dlg = modal({ title: 'Brievenbus', body, actions: [{ label: 'Sluiten', kind: 'primary' }] });
    draw();
    return dlg;
  }

  dispose() {
    const { scene, interactions, props } = this.ctx;
    scene.remove(this.box, this.crate);
    const i = interactions.items.indexOf(this.item);
    if (i >= 0) interactions.items.splice(i, 1);
    for (const c of [...this.colliders, this.crateCollider]) {
      const k = props.colliders.indexOf(c);
      if (k >= 0) props.colliders.splice(k, 1);
    }
    for (const root of [this.box, this.crate]) {
      root.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
  }
}
