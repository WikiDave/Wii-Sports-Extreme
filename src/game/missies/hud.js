// The HUD of the missions: the tracker under the top bar (current mission, progress, breath when
// running), the tutorial hint (bottom centre, with x and 'Sla over'), and the banner for big news.
// Browser only; the texts come from tracker.js and tutorial.js.

export class Hud {
  constructor(ctx, { onHideHint, onSkipTutorial }) {
    const { h, screen, hudBar } = ctx;
    this.h = h;
    this.screen = screen;
    this.hudBar = hudBar;
    this.last = {};
    this.tracker = h(
      'div',
      { class: 'ms-tracker', hidden: true, role: 'status', 'aria-live': 'polite' },
      h('span', { class: 'ms-ico', 'aria-hidden': 'true' }, '📜'),
      h(
        'div',
        { class: 'ms-body' },
        (this.kicker = h('span', { class: 'ms-kicker' })),
        (this.title = h('span', { class: 'ms-title' })),
        (this.text = h('span', { class: 'ms-text' })),
        h('span', { class: 'ms-bar' }, (this.fill = h('i', { class: 'ms-fill' }))),
        (this.breath = h('span', { class: 'ms-breath', hidden: true }, (this.breathFill = h('i')))),
      ),
    );
    this.tip = h(
      'div',
      { class: 'ms-tip', hidden: true, role: 'note' },
      h('div', { class: 'ms-tip-text' }, (this.tipStep = h('span', { class: 'ms-tip-step' })), (this.tipBody = h('span'))),
      h(
        'div',
        { class: 'ms-tip-btns' },
        h('button', { type: 'button', onClick: onHideHint, 'aria-label': 'Verberg deze tip' }, 'Verberg'),
        h('button', { type: 'button', class: 'ms-skip', onClick: onSkipTutorial }, 'Sla over'),
      ),
    );
    this.banner = h('div', { class: 'ms-banner', role: 'status' });
    screen.append(this.tracker, this.tip, this.banner);
    // Under the top bar, whatever height it has on this screen (it wraps on phones); the hint goes
    // under the tracker.
    this.ro = new ResizeObserver(() => this.place());
    this.ro.observe(hudBar);
    this.ro.observe(this.tracker);
    this.place();
  }

  place() {
    const top = this.hudBar.offsetTop + this.hudBar.offsetHeight + 8;
    this.tracker.style.top = `${top}px`;
    const below = this.tracker.hidden ? 0 : this.tracker.offsetHeight;
    this.tip.style.top = `${top + below + 10}px`;
  }

  /** Writes text only when it changed (this runs often). */
  set(el, key, text) {
    if (this.last[key] === text) return;
    this.last[key] = text;
    el.textContent = text;
  }

  /** The mission: { kicker, title, text, value, goal, ready }. */
  setMission(m) {
    this.tracker.hidden = !m;
    if (!m) return;
    this.set(this.kicker, 'k', m.kicker);
    this.set(this.title, 't', m.title);
    this.set(this.text, 'x', m.text);
    const pct = m.goal ? Math.min(100, (m.value / m.goal) * 100) : 0;
    this.fill.style.width = `${pct.toFixed(1)}%`;
    this.tracker.classList.toggle('is-ready', !!m.ready);
  }

  /** Breath while running: frac 0..1, winded when out of breath. Hidden when full. */
  setBreath(frac, winded) {
    const show = winded || frac < 0.98;
    this.breath.hidden = !show;
    if (!show) return;
    this.breathFill.style.transform = `scaleX(${Math.max(0, Math.min(1, frac)).toFixed(3)})`;
    this.breath.classList.toggle('is-winded', !!winded);
  }

  /** The tutorial hint, or null to hide it. step: { index, total, text, hidden } */
  setTip(step) {
    const show = !!step && !step.hidden;
    this.tip.hidden = !show;
    if (!show) return;
    this.set(this.tipStep, 'ts', `Tip ${step.index + 1} van ${step.total}`);
    this.set(this.tipBody, 'tb', step.text);
  }

  /** A short banner (big news). It fades out by itself. */
  flash(text) {
    this.banner.textContent = text;
    this.banner.classList.add('is-in');
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.banner.classList.remove('is-in'), 2600);
  }

  dispose() {
    this.ro.disconnect();
    clearTimeout(this.flashTimer);
    this.tracker.remove();
    this.tip.remove();
    this.banner.remove();
  }
}
