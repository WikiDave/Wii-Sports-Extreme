// Saved Miis live in localStorage. If storage is unavailable (private window,
// blocked site data) everything keeps working in memory for this visit.

import { normalizeMii } from './data.js';
import { OFFICIAL_MIIS } from './official.js';

const KEY = 'wii-sports-extreme.miis.v2';
// Version 1 started with five home-made example Miis; their own Miis are carried over.
const OLD_KEY = 'wii-sports-extreme.miis.v1';
const OLD_EXAMPLES = ['Daan', 'Emma', 'Opa Kees', 'Fleur', 'Jayden'];
let miis = null;
let persistent = true;
const listeners = new Set();

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return null;
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.map(normalizeMii) : [];
  } catch {
    persistent = false;
    return null;
  }
}

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(miis));
    persistent = true;
  } catch {
    persistent = false;
  }
  for (const fn of listeners) fn(miis);
}

/** The Wii Sports guests and a few of its players, so the plaza is not empty on the first visit. */
function examples() {
  return OFFICIAL_MIIS.slice(0, 12).map((m) => normalizeMii(m));
}

/** Miis the user made in version 1 of the app. */
function carriedOver() {
  try {
    const list = JSON.parse(localStorage.getItem(OLD_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((m) => !OLD_EXAMPLES.includes(m?.name)).map(normalizeMii) : [];
  } catch {
    return [];
  }
}

export const miiStore = {
  all() {
    if (!miis) {
      miis = read();
      if (miis == null) {
        miis = [...carriedOver(), ...examples()];
        write();
      }
    }
    return miis;
  },
  get(id) {
    return this.all().find((m) => m.id === id) ?? null;
  },
  save(m) {
    const list = this.all();
    const clean = normalizeMii(m);
    const i = list.findIndex((x) => x.id === clean.id);
    if (i >= 0) list[i] = clean;
    else list.push(clean);
    write();
    return clean;
  },
  remove(id) {
    miis = this.all().filter((m) => m.id !== id);
    write();
  },
  /** False when Miis are only kept in memory (they disappear on reload). */
  get persistent() {
    this.all();
    return persistent;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
