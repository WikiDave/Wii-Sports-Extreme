// Mii data: defaults, validation, random Miis and look-alikes.
//
// A Mii is plain JSON so it can be saved, copied and later loaded by the sports:
// {
//   version, id, name, creator, gender: 'm' | 'f', birthday: { month, day },
//   favoriteColor, height, weight,
//   face: { shape, skin, feature }, hair: { style, color, flip },
//   brows: { type, color, size, y, spacing, rotation },
//   eyes: { type, color, size, y, spacing, rotation },
//   nose: { type, size, y }, mouth: { type, color, size, y },
//   facialHair: { mustache, beard, color, size, y },
//   glasses: { type, color, size, y }, mole: { on, size, x, y },
// }

import { FACE_SHAPES } from './head.js';
import { HAIR_STYLES } from './hair.js';
import { EYES, BROWS, NOSES, MOUTHS, MUSTACHES, BEARDS, GLASSES, FEATURES } from './face.js';
import { neutralRotation } from './parts.js';
import { FAVORITE_COLORS, SKIN_COLORS, HAIR_COLORS, EYE_COLORS, LIP_COLORS, GLASSES_COLORS } from './palette.js';

export const NAME_MAX = 10;
const VERSION = 3;

// Version 1 Miis used an earlier, smaller set of parts; map them to the closest Wii part.
const V1_MAP = {
  face: { shape: [0, 1, 0, 7, 5, 6, 2, 3], feature: [0, 1, 3, 11, 2, 5, 7, 4] },
  hair: { style: [0, 2, 11, 33, 31, 14, 59, 39, 66, 64, 41, 29, 25, 47, 23, 24, 48] },
  eyes: { type: [9, 36, 27, 5, 18, 25, 39, 12, 33, 7, 13, 31, 42] },
  brows: { type: [5, 0, 4, 21, 7, 16, 13, 8, 22, 9, 18, 23] },
  mouth: { type: [2, 4, 0, 21, 14, 22, 11, 18, 23, 2, 14, 22] },
  glasses: { type: [0, 3, 1, 2, 6, 5, 4, 7, 3] },
  facialHair: { mustache: [0, 1, 2, 3, 1, 1, 2], beard: [0, 0, 1, 3, 2, 1] },
};

function migrate(raw) {
  if (raw.version !== 1 && raw.version !== 2) return raw;
  const m = JSON.parse(JSON.stringify(raw));
  if (raw.version === 1) {
    for (const [group, fields] of Object.entries(V1_MAP)) {
      for (const [field, map] of Object.entries(fields)) {
        const v = m[group]?.[field];
        if (Number.isInteger(v) && v in map) m[group][field] = map[v];
      }
    }
  }
  // Version 2 stored eye and eyebrow rotation around a fixed level value (4 and 6);
  // version 3 stores the Wii's own value, whose level position depends on the type.
  for (const [group, list, level] of [['eyes', EYES, 4], ['brows', BROWS, 6]]) {
    const part = m[group];
    if (part && Number.isInteger(part.rotation) && list[part.type]) part.rotation = neutralRotation(list[part.type]) + part.rotation - level;
  }
  m.version = VERSION;
  return m;
}

/** Changes an eye or eyebrow type and keeps its tilt, like the Wii editor. */
export function setPartType(m, group, type) {
  const list = group === 'eyes' ? EYES : BROWS;
  const max = group === 'eyes' ? 7 : 11;
  const part = m[group];
  part.rotation = Math.min(max, Math.max(0, part.rotation + list[part.type].rot - list[type].rot));
  part.type = type;
}

const last = (list) => list.length - 1;

/** Inclusive [min, max] of every number in a Mii. */
export const RANGES = {
  favoriteColor: [0, last(FAVORITE_COLORS)],
  height: [0, 127],
  weight: [0, 127],
  'birthday.month': [0, 12],
  'birthday.day': [0, 31],
  'face.shape': [0, last(FACE_SHAPES)],
  'face.skin': [0, last(SKIN_COLORS)],
  'face.feature': [0, last(FEATURES)],
  'hair.style': [0, last(HAIR_STYLES)],
  'hair.color': [0, last(HAIR_COLORS)],
  'brows.type': [0, last(BROWS)],
  'brows.color': [0, last(HAIR_COLORS)],
  'brows.size': [0, 8],
  'brows.y': [3, 18],
  'brows.spacing': [0, 12],
  'brows.rotation': [0, 11],
  'eyes.type': [0, last(EYES)],
  'eyes.color': [0, last(EYE_COLORS)],
  'eyes.size': [0, 7],
  'eyes.y': [0, 18],
  'eyes.spacing': [0, 12],
  'eyes.rotation': [0, 7],
  'nose.type': [0, last(NOSES)],
  'nose.size': [0, 8],
  'nose.y': [0, 18],
  'mouth.type': [0, last(MOUTHS)],
  'mouth.color': [0, last(LIP_COLORS)],
  'mouth.size': [0, 8],
  'mouth.y': [0, 18],
  'facialHair.mustache': [0, last(MUSTACHES)],
  'facialHair.beard': [0, last(BEARDS)],
  'facialHair.color': [0, last(HAIR_COLORS)],
  'facialHair.size': [0, 8],
  'facialHair.y': [0, 16],
  'glasses.type': [0, last(GLASSES)],
  'glasses.color': [0, last(GLASSES_COLORS)],
  'glasses.size': [0, 7],
  'glasses.y': [0, 20],
  'mole.size': [0, 8],
  'mole.x': [0, 16],
  'mole.y': [0, 30],
};

export function newId() {
  return 'mii-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function defaultMii(gender = 'm') {
  const f = gender === 'f';
  return {
    version: VERSION,
    id: newId(),
    name: 'Mii',
    creator: '',
    gender: f ? 'f' : 'm',
    birthday: { month: 0, day: 0 },
    favoriteColor: 0,
    height: 64,
    weight: 64,
    // The Wii's starting Mii (Guest C for boys, Guest F for girls, with light skin).
    face: { shape: 0, skin: 0, feature: 0 },
    hair: { style: f ? 36 : 0, color: 1, flip: false },
    brows: { type: f ? 1 : 0, color: 1, size: 4, y: 10, spacing: 2, rotation: 6 },
    eyes: { type: f ? 1 : 0, color: 0, size: 4, y: 12, spacing: 2, rotation: f ? 3 : 4 },
    nose: { type: 0, size: 4, y: 9 },
    mouth: { type: 0, color: 0, size: 4, y: 13 },
    facialHair: { mustache: 0, beard: 0, color: 1, size: 4, y: 10 },
    glasses: { type: 0, color: 0, size: 4, y: 10 },
    mole: { on: false, size: 4, x: 2, y: 20 },
  };
}

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[lastKey] = value;
}

export function cloneMii(m) {
  return JSON.parse(JSON.stringify(m));
}

/** Returns a complete, valid Mii; missing or broken fields fall back to the defaults. */
export function normalizeMii(raw) {
  const src = raw && typeof raw === 'object' ? migrate(raw) : {};
  const base = defaultMii(src.gender === 'f' ? 'f' : 'm');
  const m = cloneMii(base);
  for (const group of Object.keys(base)) {
    const value = src[group];
    if (value === undefined) continue;
    if (typeof base[group] === 'object') {
      if (value && typeof value === 'object') {
        for (const k of Object.keys(base[group])) if (value[k] !== undefined) m[group][k] = value[k];
      }
    } else {
      m[group] = value;
    }
  }
  for (const [path, [min, max]] of Object.entries(RANGES)) {
    const v = Math.round(Number(getPath(m, path)));
    setPath(m, path, Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : getPath(base, path));
  }
  m.version = VERSION;
  m.id = typeof m.id === 'string' && m.id ? m.id : newId();
  m.name = String(m.name ?? '').slice(0, NAME_MAX).trim() || 'Mii';
  m.creator = String(m.creator ?? '').slice(0, NAME_MAX).trim();
  m.hair.flip = Boolean(m.hair.flip);
  m.mole.on = Boolean(m.mole.on);
  return m;
}

// ---------------------------------------------------------------- random Miis

const NAMES = {
  m: ['Daan', 'Sem', 'Lucas', 'Bram', 'Finn', 'Milan', 'Jesse', 'Thijs', 'Ruben', 'Luuk', 'Kees', 'Joris', 'Pieter', 'Mohamed', 'Noah', 'Jan', 'Stijn', 'Ravi'],
  f: ['Emma', 'Julia', 'Sophie', 'Tess', 'Anna', 'Lotte', 'Fleur', 'Sanne', 'Noor', 'Evi', 'Lisa', 'Femke', 'Mila', 'Saar', 'Yara', 'Ilse', 'Fatima', 'Roos'],
};

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
// Wii order: hairstyles 1-36 are mostly short, 37-72 mostly long.
const HAIR_POOL = { m: [...range(0, 32), 0, 0, 1, 34, 35, 13, 21, 23], f: [...range(36, 71), 2, 15, 18, 19, 26] };
const EYE_POOL = { m: range(0, 47), f: [...range(0, 47), 22, 23, 30, 31, 35, 39, 40, 41, 45] };
const BROW_POOL = { m: range(0, 22), f: [1, 1, 5, 5, 6, 13, 15, 18, 19, 2, 4, 9] };
const MOUTH_POOL = { m: range(0, 23), f: [...range(0, 23), 1, 5, 6, 11, 12, 17] };

/** Seeded random generator (mulberry32), so look-alikes can be reproduced. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomMii(gender = null, rng = Math.random) {
  const g = gender ?? (rng() < 0.5 ? 'm' : 'f');
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const int = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const around = (center, spread, [min, max]) =>
    Math.min(max, Math.max(min, Math.round(center + (rng() + rng() + rng() - 1.5) * spread)));
  const R = RANGES;

  const m = defaultMii(g);
  m.name = pick(NAMES[g]);
  m.favoriteColor = int(0, 11);
  m.height = around(64, 70, R.height);
  m.weight = around(64, 60, R.weight);
  m.birthday = { month: int(1, 12), day: int(1, 28) };

  m.face.shape = int(0, R['face.shape'][1]);
  m.face.skin = pick([0, 0, 0, 1, 1, 2, 3, 4, 5]);
  m.face.feature = rng() < 0.7 ? 0 : g === 'f' ? pick([1, 1, 2, 3, 8]) : pick([3, 4, 5, 6, 7, 9, 10, 11]);

  const hairColor = pick([0, 0, 1, 1, 1, 2, 3, 3, 4, 5, 6, 7]);
  m.hair = { style: pick(HAIR_POOL[g]), color: hairColor, flip: rng() < 0.5 };
  if (m.hair.style === 4 && rng() < 0.6) m.hair.color = 4;

  const browType = pick(BROW_POOL[g]);
  const eyeType = pick(EYE_POOL[g]);
  m.brows = {
    type: browType,
    color: m.hair.color,
    size: around(4, 2, R['brows.size']),
    y: around(10, 3, R['brows.y']),
    spacing: around(2, 2, R['brows.spacing']),
    rotation: around(neutralRotation(BROWS[browType]), 2, R['brows.rotation']),
  };
  m.eyes = {
    type: eyeType,
    color: pick([0, 0, 0, 1, 2, 2, 3, 4, 5]),
    size: around(4, 2, R['eyes.size']),
    y: around(12, 3, R['eyes.y']),
    spacing: around(2, 2, R['eyes.spacing']),
    rotation: around(neutralRotation(EYES[eyeType]), 1.5, R['eyes.rotation']),
  };
  m.nose = { type: int(0, R['nose.type'][1]), size: around(4, 3, R['nose.size']), y: around(9, 4, R['nose.y']) };
  m.mouth = {
    type: pick(MOUTH_POOL[g]),
    color: g === 'f' ? int(0, 2) : 0,
    size: around(4, 2, R['mouth.size']),
    y: around(13, 3, R['mouth.y']),
  };
  m.facialHair = { mustache: 0, beard: 0, color: m.hair.color, size: around(4, 2, R['facialHair.size']), y: 10 };
  if (g === 'm' && rng() < 0.3) {
    if (rng() < 0.7) m.facialHair.mustache = int(1, R['facialHair.mustache'][1]);
    if (rng() < 0.5) m.facialHair.beard = int(1, R['facialHair.beard'][1]);
  }
  m.glasses = { type: 0, color: int(0, 5), size: around(4, 2, R['glasses.size']), y: 10 };
  if (rng() < 0.2) m.glasses.type = int(1, R['glasses.type'][1]);
  m.mole = { on: rng() < 0.12, size: around(4, 3, R['mole.size']), x: int(0, 16), y: int(5, 28) };
  return normalizeMii(m);
}

/** Variations on a Mii, for "kies een lookalike". */
export function lookAlikes(count, seed = Date.now()) {
  const rng = seededRandom(seed);
  return Array.from({ length: count }, () => randomMii(null, rng));
}
