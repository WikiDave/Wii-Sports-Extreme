// Tests for the polish helpers (6.12): settings, HUD numbers and camera maths.
import assert from 'node:assert/strict';
import {
  DEFAULTS,
  QUALITY,
  normalizeSettings,
  resolveQuality,
  shadowMapSize,
  pixelRatioFor,
  lookScale,
  loadSettings,
  saveSettings,
  SETTINGS_KEY,
} from '../src/game/uiterlijk/settings.js';
import { rankProgress, approach, floatLabel, heatSegments, weatherIcon } from '../src/game/uiterlijk/hudMath.js';
import { RANK_XP } from '../src/game/state.js';

const memory = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    raw: m,
  };
};
const broken = {
  getItem() {
    throw new Error('private mode');
  },
  setItem() {
    throw new Error('quota');
  },
};

// --- settings
assert.deepEqual(normalizeSettings(null), DEFAULTS);
assert.deepEqual(normalizeSettings('oops'), DEFAULTS);
assert.equal(normalizeSettings({ volume: 4 }).volume, 1, 'volume is clamped to 1');
assert.equal(normalizeSettings({ volume: -2 }).volume, 0, 'volume is clamped to 0');
assert.equal(normalizeSettings({ volume: 'loud' }).volume, DEFAULTS.volume, 'a wrong type falls back');
assert.equal(normalizeSettings({ sensitivity: 9 }).sensitivity, 2);
assert.equal(normalizeSettings({ sensitivity: NaN }).sensitivity, DEFAULTS.sensitivity);
assert.equal(normalizeSettings({ quality: 'ultra' }).quality, 'auto', 'unknown quality is auto');
assert.equal(normalizeSettings({ quality: 'low' }).quality, 'low');
assert.equal(normalizeSettings({ invertY: 1 }).invertY, false, 'invertY must be a boolean');
assert.equal(normalizeSettings({ invertY: true }).invertY, true);

assert.equal(resolveQuality('auto', { phone: true }), QUALITY.low, 'auto on a phone is low');
assert.equal(resolveQuality('auto', { phone: false }), QUALITY.high, 'auto on a PC is high');
assert.equal(resolveQuality('high', { phone: true }), QUALITY.high, 'an explicit choice wins');
assert.equal(resolveQuality('low', { phone: false }), QUALITY.low);
assert.equal(shadowMapSize(QUALITY.high), 2048);
assert.equal(shadowMapSize(QUALITY.low), 1024);
assert.equal(pixelRatioFor(QUALITY.high, 3), 2, 'pixel ratio is capped by the level');
assert.equal(pixelRatioFor(QUALITY.low, 1), 1, 'pixel ratio never exceeds the screen');
assert.equal(pixelRatioFor(QUALITY.high, 0), 1, 'a missing device pixel ratio counts as 1');
assert.ok(QUALITY.low.grass < QUALITY.high.grass, 'low quality has less grass');
assert.equal(lookScale({ sensitivity: 0.1 }), 0.5);
assert.equal(lookScale({ sensitivity: 1.5 }), 1.5);

const store = memory();
assert.deepEqual(loadSettings(store), DEFAULTS, 'nothing saved gives the defaults');
assert.equal(saveSettings(store, { volume: 0.3, quality: 'low' }), true);
assert.ok(store.raw.has(SETTINGS_KEY));
const back = loadSettings(store);
assert.equal(back.volume, 0.3);
assert.equal(back.quality, 'low');
assert.equal(back.music, DEFAULTS.music, 'missing fields are filled in');
store.setItem(SETTINGS_KEY, '{not json');
assert.deepEqual(loadSettings(store), DEFAULTS, 'broken JSON gives the defaults');
assert.deepEqual(loadSettings(broken), DEFAULTS, 'a throwing storage never throws');
assert.equal(saveSettings(broken, DEFAULTS), false, 'a refusing storage reports false');
assert.equal(saveSettings(null, DEFAULTS), true, 'no storage: nothing to save, no error');

// --- rank progress
const start = rankProgress(0);
assert.equal(start.rank, 0);
assert.equal(start.pct, 0);
assert.equal(start.next, 'Kraamhouder');
assert.equal(start.toNext, RANK_XP[1]);
const mid = rankProgress((RANK_XP[1] + RANK_XP[2]) / 2);
assert.equal(mid.rank, 1);
assert.ok(Math.abs(mid.pct - 0.5) < 1e-9, 'halfway between two ranks is 50%');
const top = rankProgress(999999);
assert.equal(top.rank, RANK_XP.length - 1);
assert.equal(top.pct, 1);
assert.equal(top.next, null);
assert.equal(top.toNext, null);
assert.equal(rankProgress(-5).rank, 0, 'negative xp is treated as 0');
assert.equal(rankProgress(NaN).rank, 0, 'NaN xp is treated as 0');
assert.ok(rankProgress(RANK_XP[3]).pct === 0, 'exactly on a rank starts its bar at 0');

// --- cash counter
assert.equal(approach(100, 100, 0.016), 100, 'no change stays put');
assert.equal(approach(100, 100.3, 0.016), 100.3, 'tiny gaps snap to the target');
const step1 = approach(0, 1000, 1 / 60, 8);
assert.ok(step1 > 0 && step1 < 1000, 'one frame moves part of the way');
let v = 0;
for (let i = 0; i < 600; i++) v = approach(v, 1000, 1 / 60, 8);
assert.equal(v, 1000, 'after ten seconds the counter has arrived');
assert.ok(approach(1000, 0, 1 / 60, 8) < 1000, 'counts down too');

// --- floating labels
assert.equal(floatLabel(30, (n) => String(n)), '+€30');
assert.equal(floatLabel(-12, (n) => String(n)), '−€12');
assert.equal(floatLabel(0), '');
assert.equal(floatLabel(0.2), '', 'fractions round to nothing');
assert.equal(floatLabel(1240, (n) => String(n)), '+€1240');
assert.match(floatLabel(1240), /^\+€1.240$/, 'nl-NL puts a dot in the thousands');

// --- heat segments and weather icons
assert.deepEqual(heatSegments(0), [false, false, false, false]);
assert.deepEqual(heatSegments(2), [true, true, false, false]);
assert.deepEqual(heatSegments(4), [true, true, true, true]);
assert.deepEqual(heatSegments(9), [true, true, true, true], 'levels above 4 are capped');
assert.deepEqual(heatSegments(-1), [false, false, false, false]);
assert.equal(weatherIcon('regen'), 'rain');
assert.equal(weatherIcon('onbekend'), 'sun', 'unknown weather falls back to sun');

// --- camera collision (ground plane)
import { rayCircle, clipDistance, WALL_MARGIN } from '../src/game/uiterlijk/collide.js';

const wall = { x: 10, z: 0, r: 2 };
assert.equal(rayCircle(0, 0, 1, 0, wall, 2), 8, 'a ray straight at a circle enters it 8 m away');
assert.equal(rayCircle(0, 0, -1, 0, wall, 2), Infinity, 'a ray pointing away never meets it');
assert.equal(rayCircle(0, 5, 1, 0, wall, 2), Infinity, 'a ray that misses the circle is free');
assert.equal(rayCircle(10, 0, 1, 0, wall, 2), Infinity, 'a ray that starts inside is ignored');
assert.ok(Math.abs(rayCircle(0, 1.9, 1, 0, wall, 2) - (10 - Math.sqrt(4 - 1.9 ** 2)) ) < 1e-9, 'a grazing ray hits at the chord');
const focus = { x: 0, z: 0 };
assert.ok(Math.abs(clipDistance(focus, 1, 0, 30, [wall]) - (10 - 2 - WALL_MARGIN)) < 1e-9, 'the camera stops short of a wall');
assert.equal(clipDistance(focus, 1, 0, 7, [wall]), 7, 'a wall beyond the distance does not matter');
assert.equal(clipDistance(focus, 1, 0, 7, []), 7, 'no wall: the full distance');
assert.equal(clipDistance(focus, 0, 1, 7, [wall]), 7, 'a wall to the side does not block');
assert.equal(clipDistance(focus, 1, 0, 9, [{ x: 0.3, z: 0, r: 1 }]), 9, 'an obstacle the player stands inside is ignored');
assert.equal(clipDistance(focus, 1, 0, 9, [{ x: 1.5, z: 0, r: 1 }]), 0, 'a wall in the margin ring right in front pushes the camera in');
assert.equal(clipDistance(focus, -1, 0, 9, [{ x: 1.5, z: 0, r: 1 }]), 9, 'a margin ring behind the camera does not block it');
assert.ok(Math.abs(clipDistance(focus, 1, 0, 30, [{ x: 40, z: 0, r: 2 }, wall]) - (10 - 2 - WALL_MARGIN)) < 1e-9, 'the nearest wall counts');

console.log('uiterlijk tests ok');
