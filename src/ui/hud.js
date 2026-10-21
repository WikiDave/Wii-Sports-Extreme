// The island HUD in Wii style: white pill panels with a coloured SVG chip each. Day, weather
// and clock; cash with a counting number and a floating "+€30" when it changes; rank with a
// bar to the next rank; the Reglement-meter; mute and the phone (with its badge). The bar is
// `el`; features add their own widgets to it (ctx.hudBar). Nothing here is hover-only.

import { h, icon } from './dom.js';
import { approach, floatLabel, heatSegments, rankProgress, weatherIcon } from '../game/uiterlijk/hudMath.js';
import { formatClock } from '../game/state.js';
import { LEVEL_NAMES } from '../game/police.js';

const money = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
const MAX_FLOATS = 4;
const WEATHER_CHIP = { sun: 'chip-sun', cloud: 'chip-cloud', rain: 'chip-sky', storm: 'chip-rank' };

export class Hud {
  /** handlers: onBack(), onMute(), onPhone(). */
  constructor({ onBack, onMute, onPhone }) {
    this.cache = {};
    this.shownCash = null;
    this.targetCash = 0;
    this.lastCash = null;
    this.lastRank = null;
    this.raf = 0;
    this.lastFrame = 0;

    const back = h('button', { class: 'btn btn-round hud-back', type: 'button', 'aria-label': 'Terug naar het menu', onClick: onBack }, icon('back'));

    this.dayEl = h('b', { class: 'hud-day' });
    this.clockEl = h('small', { class: 'hud-clock' });
    this.weatherChip = h('span', { class: 'hud-chip chip-sky' });
    this.timePanel = h('div', { class: 'hud-panel hud-time island-clock' }, this.weatherChip, h('span', { class: 'hud-stack' }, this.dayEl, this.clockEl));

    this.cashEl = h('b', { class: 'hud-cash-num' }, money(0));
    this.floats = h('span', { class: 'hud-floats', 'aria-hidden': 'true' });
    this.cashPanel = h('div', { class: 'hud-panel hud-cash hud-money', 'aria-live': 'off' }, h('span', { class: 'hud-chip chip-cash' }, icon('banknote', 'hud-glyph')), h('span', { class: 'hud-stack' }, this.cashEl), this.floats);

    this.rankName = h('b', { class: 'hud-rank-name' });
    this.rankFill = h('i', { class: 'hud-bar-fill' });
    this.rankBar = h('span', { class: 'hud-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, this.rankFill);
    this.rankPanel = h('div', { class: 'hud-panel hud-rank' }, h('span', { class: 'hud-chip chip-rank' }, icon('star', 'hud-glyph')), h('span', { class: 'hud-stack' }, this.rankName, this.rankBar));

    this.heatSegs = [1, 2, 3, 4].map(() => h('i', { class: 'hud-seg' }));
    this.heatName = h('b', { class: 'hud-heat-name' });
    this.heatPanel = h(
      'div',
      { class: 'hud-panel hud-heat', title: 'Reglement-meter: hoe alert is de bewaking?' },
      h('span', { class: 'hud-chip chip-heat' }, icon('shield', 'hud-glyph')),
      h('span', { class: 'hud-stack' }, this.heatName, h('span', { class: 'hud-segs' }, ...this.heatSegs)),
    );

    this.muteBtn = h('button', { class: 'btn btn-round hud-mute', type: 'button', 'aria-label': 'Geluid aan of uit', onClick: onMute });
    this.badge = h('i', { class: 'phone-badge', hidden: true });
    this.phoneBtn = h('button', { class: 'btn btn-round hud-phone phone-btn', type: 'button', 'aria-label': 'Telefoon (Tab)', onClick: onPhone }, icon('phone', 'hud-glyph'), this.badge);

    this.el = h('div', { class: 'island-bar hud' }, back, this.timePanel, this.cashPanel, this.rankPanel, this.heatPanel, this.muteBtn, this.phoneBtn);
  }

  /** Writes text or an attribute only when it changed (this runs every frame). */
  put(key, el, value) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    el.textContent = value;
  }

  /**
   * info: { minutes, day, weather, event, weatherName, eventName, cash, xp, heat }. Cheap to
   * call often; the cash counter animates on its own frames.
   */
  update(info) {
    this.put('clock', this.clockEl, formatClock(info.minutes));
    this.put('day', this.dayEl, `Dag ${info.day}`);
    const wicon = weatherIcon(info.weather);
    if (this.cache.wicon !== wicon) {
      this.cache.wicon = wicon;
      this.weatherChip.className = `hud-chip ${WEATHER_CHIP[wicon] ?? 'chip-sky'}`;
      this.weatherChip.replaceChildren(icon(wicon, 'hud-glyph'));
    }
    this.timePanel.title = `${info.weatherName}${info.eventName ? ' · ' + info.eventName : ''}`;

    // Cash: count to the new value, and float the change up from the panel.
    if (this.shownCash == null) {
      this.shownCash = info.cash;
      this.cashEl.textContent = money(info.cash);
    }
    if (this.lastCash != null && info.cash !== this.lastCash) this.float(info.cash - this.lastCash);
    this.lastCash = info.cash;
    this.targetCash = info.cash;
    this.cashPanel.title = `Contant geld: ${money(info.cash)}`;
    this.startCount();

    const rp = rankProgress(info.xp);
    this.put('rank', this.rankName, rp.name);
    this.rankFill.style.width = `${Math.round(rp.pct * 100)}%`;
    this.rankBar.setAttribute('aria-valuenow', String(Math.round(rp.pct * 100)));
    this.rankPanel.title = rp.next ? `Nog ${Math.ceil(rp.toNext)} xp tot ${rp.next}` : 'Hoogste rang bereikt';
    if (this.lastRank != null && rp.rank > this.lastRank) this.pulse(this.rankPanel);
    this.lastRank = rp.rank;

    const lvl = Math.max(0, Math.min(4, Math.floor(info.heat)));
    if (this.cache.heat !== lvl) {
      this.cache.heat = lvl;
      heatSegments(lvl).forEach((on, i) => this.heatSegs[i].classList.toggle('is-on', on));
      this.heatName.textContent = LEVEL_NAMES[lvl];
      this.heatPanel.dataset.level = String(lvl);
    }
  }

  setMuted(muted) {
    const name = muted ? 'muted' : 'speaker';
    if (this.cache.muted === name) return;
    this.cache.muted = name;
    this.muteBtn.replaceChildren(icon(name, 'hud-glyph'));
    this.muteBtn.setAttribute('aria-pressed', String(muted));
  }

  setPhoneBadge(n) {
    this.badge.hidden = !n;
    if (this.cache.badge !== n) {
      this.cache.badge = n;
      this.badge.textContent = String(n);
    }
  }

  /** A "+€30" that rises from the cash panel and fades. */
  float(delta) {
    const text = floatLabel(delta);
    if (!text) return;
    const el = h('span', { class: `hud-float ${delta < 0 ? 'is-neg' : ''}` }, text);
    el.addEventListener('animationend', () => el.remove());
    this.floats.append(el);
    while (this.floats.childElementCount > MAX_FLOATS) this.floats.firstElementChild.remove();
  }

  pulse(el) {
    el.classList.remove('is-pulse');
    void el.offsetWidth;
    el.classList.add('is-pulse');
  }

  startCount() {
    if (this.raf || this.shownCash === this.targetCash) return;
    this.lastFrame = performance.now();
    const step = (now) => {
      const dt = (now - this.lastFrame) / 1000;
      this.lastFrame = now;
      this.shownCash = approach(this.shownCash, this.targetCash, dt, 7);
      this.cashEl.textContent = money(this.shownCash);
      if (this.shownCash === this.targetCash) {
        this.raf = 0;
        this.cashEl.textContent = money(this.targetCash);
        return;
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
