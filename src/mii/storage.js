// Saved Miis live in localStorage. If storage is unavailable (private window,
// blocked site data) everything keeps working in memory for this visit.

import { defaultMii, normalizeMii } from './data.js';

const KEY = 'wii-sports-extreme.miis.v1';
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

function mii(gender, overrides) {
  const m = defaultMii(gender);
  for (const [k, v] of Object.entries(overrides)) m[k] = typeof v === 'object' ? { ...m[k], ...v } : v;
  return normalizeMii(m);
}

/** A few example Miis so the plaza is not empty on the first visit. */
function examples() {
  return [
    mii('m', { name: 'Daan', favoriteColor: 5, hair: { style: 1, color: 3 }, brows: { type: 0, color: 3 }, eyes: { type: 9, color: 2 }, mouth: { type: 2 } }),
    mii('f', {
      name: 'Emma', favoriteColor: 7, height: 56, face: { shape: 2, skin: 3, feature: 1 }, hair: { style: 39, color: 7 },
      brows: { type: 5, color: 6 }, eyes: { type: 22, color: 4 }, nose: { type: 1 }, mouth: { type: 1, color: 2 },
    }),
    mii('m', {
      name: 'Opa Kees', favoriteColor: 9, height: 50, weight: 96, face: { shape: 1, feature: 11 }, hair: { style: 31, color: 4 },
      brows: { type: 17, color: 4 }, eyes: { type: 5 }, nose: { type: 4 }, mouth: { type: 0 },
      facialHair: { mustache: 1, color: 4, size: 5 }, glasses: { type: 3, color: 1 },
    }),
    mii('f', {
      name: 'Fleur', favoriteColor: 3, height: 74, weight: 52, face: { shape: 2, skin: 1, feature: 3 }, hair: { style: 50, color: 2 },
      brows: { type: 1, color: 2 }, eyes: { type: 36, color: 5 }, mouth: { type: 2, color: 1 },
    }),
    mii('m', {
      name: 'Jayden', favoriteColor: 1, height: 88, face: { shape: 5, skin: 4 }, hair: { style: 29, color: 0 }, brows: { type: 14, color: 0 },
      eyes: { type: 4, color: 2 }, nose: { type: 9 }, mouth: { type: 22 },
    }),
  ];
}

export const miiStore = {
  all() {
    if (!miis) {
      miis = read();
      if (miis == null) {
        miis = examples();
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
