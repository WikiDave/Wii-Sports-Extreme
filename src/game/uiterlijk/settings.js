// Player settings from the title screen (Instellingen): sound, music, graphics quality and
// the camera. Pure logic: the storage object is passed in (localStorage in the browser), so
// this runs in Node too. Every read and write is safe when storage is missing or broken.

export const SETTINGS_KEY = 'wse.settings.v1';

export const DEFAULTS = Object.freeze({
  volume: 1, // sound effects, 0..1 (1 = the loudness the game always had)
  music: 0.8, // the marimba tune, 0..1
  quality: 'auto', // 'auto' | 'high' | 'low'
  sensitivity: 1, // camera drag speed, 0.5..2
  invertY: false, // camera pitch: drag up looks up
});

/** What each graphics level changes. 'auto' picks low on phones (coarse pointer), high elsewhere. */
export const QUALITY = Object.freeze({
  high: Object.freeze({ id: 'high', label: 'Hoog', pixelRatio: 2, shadowLevel: 'high', grass: 1, life: 1 }),
  low: Object.freeze({ id: 'low', label: 'Laag', pixelRatio: 1.25, shadowLevel: 'low', grass: 0.4, life: 0.5 }),
});

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Fills in defaults and clamps values; unknown or broken fields fall back to the default. */
export function normalizeSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const num = (v, d, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : d);
  return {
    volume: num(r.volume, DEFAULTS.volume, 0, 1),
    music: num(r.music, DEFAULTS.music, 0, 1),
    quality: ['auto', 'high', 'low'].includes(r.quality) ? r.quality : DEFAULTS.quality,
    sensitivity: num(r.sensitivity, DEFAULTS.sensitivity, 0.5, 2),
    invertY: typeof r.invertY === 'boolean' ? r.invertY : DEFAULTS.invertY,
  };
}

/** The graphics level actually used: 'auto' follows the device. */
export function resolveQuality(setting, { phone = false } = {}) {
  if (setting === 'high' || setting === 'low') return QUALITY[setting];
  return phone ? QUALITY.low : QUALITY.high;
}

/** Shadow map size for a graphics level (the shadow texture is square). */
export function shadowMapSize(quality) {
  return quality.shadowLevel === 'high' ? 2048 : 1024;
}

/** Pixel ratio the renderer uses: the level's cap, never more than the screen has. */
export function pixelRatioFor(quality, devicePixelRatio = 1) {
  return Math.min(devicePixelRatio || 1, quality.pixelRatio);
}

/** Camera yaw/pitch multiplier from the sensitivity setting (0.5 .. 2). */
export function lookScale(settings) {
  return clamp(settings.sensitivity, 0.5, 2);
}

/** Reads the saved settings; never throws. */
export function loadSettings(storage) {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    return normalizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeSettings(null);
  }
}

/** Saves the settings; returns false when storage refuses (private mode and the like). */
export function saveSettings(storage, settings) {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
    return true;
  } catch {
    return false;
  }
}
