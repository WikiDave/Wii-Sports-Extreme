// Colour palettes, modelled on the Wii Mii Channel.

export const FAVORITE_COLORS = [
  { name: 'Rood', hex: '#d21e14' },
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

export const SKIN_COLORS = [
  { name: 'Licht', hex: '#ffd8b8' },
  { name: 'Perzik', hex: '#ffbc8c' },
  { name: 'Getint', hex: '#de9866' },
  { name: 'Roze', hex: '#ffcab0' },
  { name: 'Bruin', hex: '#ad6a40' },
  { name: 'Donker', hex: '#64391e' },
];

export const HAIR_COLORS = [
  { name: 'Zwart', hex: '#1e1a18' },
  { name: 'Donkerbruin', hex: '#3e2416' },
  { name: 'Roodbruin', hex: '#6a2a14' },
  { name: 'Bruin', hex: '#7c4a26' },
  { name: 'Grijs', hex: '#7c7a78' },
  { name: 'Olijf', hex: '#4e4024' },
  { name: 'Lichtbruin', hex: '#9c6c34' },
  { name: 'Blond', hex: '#dcae52' },
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
