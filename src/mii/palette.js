// Colour palettes, modelled on the Wii Mii Channel.

export const FAVORITE_COLORS = [
  { name: 'Rood', hex: '#d81c12' },
  { name: 'Oranje', hex: '#ff6e19' },
  { name: 'Geel', hex: '#ffd820' },
  { name: 'Lichtgroen', hex: '#78d220' },
  { name: 'Groen', hex: '#00782d' },
  { name: 'Blauw', hex: '#0a48b4' },
  { name: 'Lichtblauw', hex: '#3caade' },
  { name: 'Roze', hex: '#f55a7d' },
  { name: 'Paars', hex: '#7328ad' },
  { name: 'Bruin', hex: '#483818' },
  { name: 'Wit', hex: '#e0e0e0' },
  { name: 'Zwart', hex: '#181814' },
];

// The Wii base colours; the lighting brightens them by about 15% where the light hits.
export const SKIN_COLORS = [
  { name: 'Licht', hex: '#ffd3ad' },
  { name: 'Perzik', hex: '#ffb66b' },
  { name: 'Oranje', hex: '#de7942' },
  { name: 'Roze', hex: '#ffaa8c' },
  { name: 'Bruin', hex: '#ad5129' },
  { name: 'Donker', hex: '#632c18' },
];

export const HAIR_COLORS = [
  { name: 'Zwart', hex: '#161210' },
  { name: 'Donkerbruin', hex: '#3e2212' },
  { name: 'Roodbruin', hex: '#5e2210' },
  { name: 'Bruin', hex: '#7a4422' },
  { name: 'Grijs', hex: '#8c8c8c' },
  { name: 'Olijf', hex: '#584a1e' },
  { name: 'Lichtbruin', hex: '#9c5c1e' },
  { name: 'Blond', hex: '#e8b452' },
];

export const EYE_COLORS = [
  { name: 'Zwart', hex: '#101010' },
  { name: 'Grijs', hex: '#6c7070' },
  { name: 'Bruin', hex: '#6a412d' },
  { name: 'Hazelnoot', hex: '#6e6a32' },
  { name: 'Blauw', hex: '#4a72b4' },
  { name: 'Groen', hex: '#3ca062' },
];

export const LIP_COLORS = [
  { name: 'Oranje', hex: '#d8603e' },
  { name: 'Rood', hex: '#e42828' },
  { name: 'Roze', hex: '#f88c94' },
];

export const GLASSES_COLORS = [
  { name: 'Zwart', hex: '#1e1e1e' },
  { name: 'Bruin', hex: '#6b4429' },
  { name: 'Rood', hex: '#b42a22' },
  { name: 'Blauw', hex: '#2d50a6' },
  { name: 'Goud', hex: '#c49a1a' },
  { name: 'Grijs', hex: '#8a8a8a' },
];

export const PANTS_COLOR = '#4c4f58';

/** Mixes two hex colours; t = 0 gives a, t = 1 gives b. */
export function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const m = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}
