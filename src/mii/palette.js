// Colour palettes: the Wii's colour choices with the colours Nintendo's Mii renderer
// (FFL / Mii Studio) gives them, so Miis match the official portraits.

export const FAVORITE_COLORS = [
  { name: 'Rood', hex: '#d21e14' },
  { name: 'Oranje', hex: '#ff6e19' },
  { name: 'Geel', hex: '#ffd820' },
  { name: 'Lichtgroen', hex: '#78d220' },
  { name: 'Groen', hex: '#007830' },
  { name: 'Blauw', hex: '#0a48b4' },
  { name: 'Lichtblauw', hex: '#3caade' },
  { name: 'Roze', hex: '#f55a7d' },
  { name: 'Paars', hex: '#7328ad' },
  { name: 'Bruin', hex: '#483818' },
  { name: 'Wit', hex: '#e0e0e0' },
  { name: 'Zwart', hex: '#181814' },
];

export const SKIN_COLORS = [
  { name: 'Licht', hex: '#ffd3ad' },
  { name: 'Perzik', hex: '#ffb66b' },
  { name: 'Oranje', hex: '#de7942' },
  { name: 'Roze', hex: '#ffaa8c' },
  { name: 'Bruin', hex: '#ad5129' },
  { name: 'Donker', hex: '#632c18' },
];

export const HAIR_COLORS = [
  { name: 'Zwart', hex: '#000000' },
  { name: 'Donkerbruin', hex: '#402010' },
  { name: 'Roodbruin', hex: '#5c180a' },
  { name: 'Bruin', hex: '#7c3a14' },
  { name: 'Grijs', hex: '#787880' },
  { name: 'Olijf', hex: '#4e3e10' },
  { name: 'Lichtbruin', hex: '#885818' },
  { name: 'Blond', hex: '#d0a04a' },
];

export const EYE_COLORS = [
  { name: 'Zwart', hex: '#000000' },
  { name: 'Grijs', hex: '#6c7070' },
  { name: 'Bruin', hex: '#663c2c' },
  { name: 'Hazelnoot', hex: '#605e30' },
  { name: 'Blauw', hex: '#4654a8' },
  { name: 'Groen', hex: '#387058' },
];

// hex: the lips; dark: the upper lip of the mouths that show one.
export const LIP_COLORS = [
  { name: 'Oranje', hex: '#d85208', dark: '#823018' },
  { name: 'Rood', hex: '#f00c08', dark: '#780c0c' },
  { name: 'Roze', hex: '#f54848', dark: '#882028' },
];

export const GLASSES_COLORS = [
  { name: 'Zwart', hex: '#000000' },
  { name: 'Bruin', hex: '#7a4011' },
  { name: 'Rood', hex: '#d51208' },
  { name: 'Blauw', hex: '#29376e' },
  { name: 'Goud', hex: '#d56d00' },
  { name: 'Grijs', hex: '#987f6e' },
];

export const PANTS_COLOR = '#484846';

/** Mixes two hex colours; t = 0 gives a, t = 1 gives b. */
export function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const m = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}
