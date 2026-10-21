// Sound, all synthesised with Web Audio (no files): UI and game blips, a soft sea, rain,
// and a calm marimba tune. Browsers only allow sound after a tap or key press, so the
// context starts on the first interaction. Mute is remembered.

const KEY = 'wse.sound.v1';

// A calm pentatonic tune in C major, in semitones from C4; null = rest.
const TUNE = [0, 4, 7, 9, 7, 4, 2, 4, 0, null, 4, 7, 12, 9, 7, 4, 5, 9, 12, 9, 7, 4, 2, 0, 2, 4, 7, 4, 2, null, 0, null];
const note = (semi) => 261.63 * 2 ** (semi / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = (() => {
      try {
        return localStorage.getItem(KEY) === 'off';
      } catch {
        return false;
      }
    })();
    this.step = 0;
    this.nextAt = 0;
    this.noise = null;
    this.rainGain = null;
    this.seaGain = null;
    this.musicOn = true;
    this.volume = 1; // sound effects, from the settings (setVolumes)
    this.musicVol = 0.8; // the tune, from the settings
    this.timer = 0;
    this.unlock = () => this.start();
    for (const e of ['pointerdown', 'keydown']) window.addEventListener(e, this.unlock, { once: false });
  }

  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);
    this.makeAmbience();
    this.nextAt = this.ctx.currentTime + 0.2;
    this.timer = setInterval(() => this.schedule(), 200);
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running' && !this.muted;
  }

  setMuted(m) {
    this.muted = m;
    try {
      localStorage.setItem(KEY, m ? 'off' : 'on');
    } catch {}
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
    if (!m) this.start();
  }

  /** Volumes from the settings, 0..1: effects (master) and the marimba tune. */
  setVolumes({ volume = 1, music = 0.8 } = {}) {
    this.volume = volume;
    this.musicVol = music;
    if (this.master && !this.muted) this.master.gain.value = volume;
  }

  // One soft note: sine/triangle with a quick decay (marimba-ish).
  tone(freq, dur = 0.25, { type = 'triangle', vol = 0.18, at = 0, glide = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Named effects. */
  play(name) {
    if (!this.ready) return;
    const n = { click: () => this.tone(660, 0.08, { type: 'sine', vol: 0.12 }),
      cash: () => [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.18, { type: 'square', vol: 0.07, at: i * 0.06 })),
      spend: () => this.tone(520, 0.14, { type: 'sine', vol: 0.12, glide: 0.7 }),
      bad: () => this.tone(180, 0.35, { type: 'sawtooth', vol: 0.1, glide: 0.6 }),
      alarm: () => [0, 0.25, 0.5, 0.75].forEach((a, i) => this.tone(i % 2 ? 620 : 880, 0.22, { type: 'square', vol: 0.09, at: a })),
      alert: () => [660, 880].forEach((f, i) => this.tone(f, 0.15, { type: 'square', vol: 0.08, at: i * 0.1 })),
      rank: () => [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, { vol: 0.16, at: i * 0.12 })),
      newday: () => [392, 523, 659].forEach((f, i) => this.tone(f, 0.5, { type: 'sine', vol: 0.14, at: i * 0.18 })),
      step: () => this.tone(110 + Math.random() * 40, 0.07, { type: 'triangle', vol: 0.05 }),
      stepSand: () => this.tone(520 + Math.random() * 120, 0.05, { type: 'sine', vol: 0.025, glide: 0.5 }),
      splash: () => this.tone(700 + Math.random() * 300, 0.12, { type: 'sine', vol: 0.05, glide: 0.4 }),
      pour: () => this.tone(300 + Math.random() * 60, 0.12, { type: 'sine', vol: 0.06, glide: 1.5 }),
      perfect: () => [784, 1047].forEach((f, i) => this.tone(f, 0.2, { vol: 0.14, at: i * 0.08 })),
    }[name];
    n?.();
  }

  // Looping filtered noise for sea and rain.
  makeAmbience() {
    const c = this.ctx;
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const loop = (freq, q, type) => {
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = c.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(this.master);
      src.start();
      return { g, f };
    };
    this.sea = loop(500, 0.7, 'lowpass');
    this.rain = loop(4200, 0.5, 'highpass');
    this.seaGain = this.sea.g;
    this.rainGain = this.rain.g;
  }

  /** nearSea 0..1 (how close to the shore), rain 0..2. Smoothed by the audio param ramp. */
  setAmbience({ nearSea = 0.5, rain = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.seaGain.gain.setTargetAtTime(0.05 + 0.12 * nearSea, t, 0.5);
    // The sea breathes: slow wave on the filter.
    this.sea.f.frequency.setTargetAtTime(350 + 250 * (0.5 + 0.5 * Math.sin(t * 0.35)), t, 0.4);
    this.rainGain.gain.setTargetAtTime(Math.min(0.12, rain * 0.06), t, 0.6);
  }

  // The tune: schedule notes a little ahead.
  schedule() {
    if (!this.ctx || this.ctx.state !== 'running' || !this.musicOn) return;
    const beat = 0.42;
    while (this.nextAt < this.ctx.currentTime + 0.6) {
      const semi = TUNE[this.step % TUNE.length];
      if (semi != null) {
        const at = this.nextAt - this.ctx.currentTime;
        this.tone(note(semi), 0.5, { vol: 0.07 * this.musicVol, at });
        if (this.step % 8 === 0) this.tone(note(semi - 12), 0.9, { type: 'sine', vol: 0.07 * this.musicVol, at });
      }
      this.step++;
      this.nextAt += beat;
    }
  }

  dispose() {
    clearInterval(this.timer);
    for (const e of ['pointerdown', 'keydown']) window.removeEventListener(e, this.unlock);
    this.ctx?.close();
    this.ctx = null;
  }
}
