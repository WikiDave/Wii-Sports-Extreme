// The game state: one plain object that is saved as JSON (localStorage key wse.game.v1).
// No three.js in here, so it can be tested with Node. Changes go through the methods so
// that listeners (the HUD) hear about them.

export const SAVE_KEY = 'wse.game.v1';
export const VERSION = 1;

/** Game clock: minutes since midnight of the current day. A day runs 06:00 to 04:00. */
export const DAY_START = 6 * 60;
export const DAY_END = 28 * 60;
/** One real second is one game minute. */
export const MINUTES_PER_SECOND = 1;

export const RANKS = ['Strandjutter', 'Kraamhouder', 'Zoetekauw', 'Suikerbaron', 'Limonadekoning', 'Eilandlegende'];
/** XP needed to reach each rank (index = rank). */
export const RANK_XP = [0, 60, 250, 800, 2500, 7000];

export function newGame(miiId = null) {
  return {
    version: VERSION,
    player: { miiId, x: null, z: null },
    cash: 250,
    bank: 0,
    xp: 0,
    day: 1,
    minutes: DAY_START,
    inventory: {}, // item id -> amount
    recipes: [],
    properties: ['hut'],
    staff: [],
    customers: {}, // customer id -> { loyalty, unlocked }
    ext: {}, // per-feature save data: state.ext[featureId] (see features/index.js)
    jobs: [], // batches busy in stations: see stations.js
    messages: [], // text messages from customers: see phone.js
    stand: null, // { day, n } units sold to the beach stand today
    heat: 0, // Reglement-meter 0..5 (level = floor, see police.js)
    rival: null, // { id, spot } for today
    disguisedDay: 0,
  };
}

/** Upgrades an older save to the current version (none yet) and fills in missing fields. */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const base = newGame();
  const s = { ...base, ...raw, player: { ...base.player, ...raw.player }, ext: { ...(raw.ext ?? {}) } };
  s.version = VERSION;
  for (const k of ['cash', 'bank', 'xp', 'day', 'minutes', 'heat']) if (!Number.isFinite(s[k])) s[k] = base[k];
  return s;
}

export function rankOf(xp) {
  let r = 0;
  RANK_XP.forEach((need, i) => xp >= need && (r = i));
  return r;
}

export function formatClock(minutes) {
  const m = Math.floor(minutes) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export class Game {
  /** @param storage object with getItem/setItem (localStorage); optional, then nothing is saved. */
  constructor(storage = null) {
    this.storage = storage;
    this.listeners = new Map();
    this.state = this.load() ?? newGame();
    this.lastSave = this.state.minutes;
  }

  load() {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      return raw ? migrate(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  save() {
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.state));
      return true;
    } catch {
      return false;
    }
  }

  reset(miiId = null) {
    this.state = newGame(miiId);
    this.emit('change');
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event).delete(fn);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach((fn) => fn(data, this.state));
  }

  get rank() {
    return rankOf(this.state.xp);
  }

  /** Time of day in hours 0..24, for the sky. */
  get hour() {
    return (this.state.minutes / 60) % 24;
  }

  get isNight() {
    return this.hour >= 20 || this.hour < 6;
  }

  /** Advances the clock by dt real seconds; at 04:00 the day ends (see sleep). Saves every 2 game minutes. */
  tick(dt) {
    const s = this.state;
    s.minutes += dt * MINUTES_PER_SECOND;
    if (s.minutes >= DAY_END) this.sleep();
    else if (s.minutes - this.lastSave >= 2) {
      this.lastSave = s.minutes;
      this.save();
    }
    this.emit('time');
  }

  /** Ends the day: next morning at 06:00. Daily costs are added in later steps via the 'newday' event. */
  sleep() {
    const s = this.state;
    s.day += 1;
    s.minutes = DAY_START;
    s.heat = Math.max(0, s.heat - 1);
    this.emit('heat', Math.floor(s.heat));
    this.lastSave = s.minutes;
    this.emit('newday', s.day);
    this.save();
    this.emit('change');
  }

  /** Adds (or with a negative amount takes) cash; refuses to go below zero. Returns whether it worked. */
  addCash(amount) {
    if (this.state.cash + amount < 0) return false;
    this.state.cash += amount;
    this.emit('change');
    return true;
  }

  addXp(amount) {
    const before = this.rank;
    this.state.xp += amount;
    if (this.rank > before) this.emit('rank', this.rank);
    this.emit('change');
  }

  /** Inventory: add (positive) or remove (negative); removing more than there is fails. */
  addItem(id, n = 1) {
    const have = this.state.inventory[id] ?? 0;
    if (have + n < 0) return false;
    if (have + n === 0) delete this.state.inventory[id];
    else this.state.inventory[id] = have + n;
    this.emit('change');
    return true;
  }
}
