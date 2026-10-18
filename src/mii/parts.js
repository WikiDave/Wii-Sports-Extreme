// The face parts of the Wii Mii Channel, in the same order as on the Wii, redrawn
// as vector shapes. Every part is a list of layers in a local space where y points
// down; eyes and eyebrows are drawn for the right side of the picture, with their
// outer end towards +x (the other side is mirrored).
//
// Layer codes:
//   eyes:   W white of the eye, I iris (+ pupil and highlight, optionally clipped),
//           K black fill, L black line, R coloured lid line, S sparkle
//   brows:  F fill, B line, O dot              (in the eyebrow colour)
//   noses:  L line, F fill, O dot              (a darker shade of the skin)
//   mouths: U upper lip, D lower lip, G puffy lip (lip colour), T teeth,
//           K dark fill, L dark line
//   moustaches: F fill, B line                 (in the facial hair colour)

/** SVG path of an ellipse, optionally rotated (degrees). */
export function E(cx, cy, rx, ry, rot = 0) {
  const a = (rot * Math.PI) / 180;
  const dx = Math.cos(a) * rx;
  const dy = Math.sin(a) * rx;
  const p = (x, y) => `${(x).toFixed(2)} ${(y).toFixed(2)}`;
  return `M${p(cx + dx, cy + dy)} A${rx} ${ry} ${rot} 1 1 ${p(cx - dx, cy - dy)} A${rx} ${ry} ${rot} 1 1 ${p(cx + dx, cy + dy)} Z`;
}

const eye = (name, layers, w = 30, closed = false) => ({ name, layers, w, closed });

export const EYES = [
  eye('Boog', [['I', 0, 7, 15], ['L', 'M-32 0 Q0 -30 32 0', 7]]),
  eye('Boog met wimper', [['I', -2, 7, 17], ['L', 'M-30 6 Q-27 -24 4 -25 Q22 -25 30 -10', 7], ['L', 'M29 -10 L42 -16', 6]]),
  eye('Koepel', [
    ['W', 'M-34 14 L34 14 L34 8 Q31 -24 0 -25 Q-31 -24 -34 8 Z'],
    ['I', 0, -3, 15, 'M-34 14 L34 14 L34 8 Q31 -24 0 -25 Q-31 -24 -34 8 Z'],
    ['L', 'M-34 14 L34 14 L34 8 Q31 -24 0 -25 Q-31 -24 -34 8 Z', 6],
    ['L', 'M24 -16 L40 -27', 6],
  ]),
  eye('Groot', [
    ['W', 'M-30 20 L-30 -8 Q-30 -32 0 -32 Q32 -32 32 0 L32 20 Q32 28 24 28 L-22 28 Q-30 28 -30 20 Z'],
    ['I', -6, -6, 23, 'M-30 20 L-30 -8 Q-30 -32 0 -32 Q32 -32 32 0 L32 20 Q32 28 24 28 L-22 28 Q-30 28 -30 20 Z'],
    ['L', 'M-30 -8 Q-30 -32 0 -32 Q32 -32 32 0 L32 28', 7],
  ], 32),
  eye('Schuin ovaal', [['W', E(0, 0, 33, 21, -14)], ['I', -6, 2, 15, E(0, 0, 33, 21, -14)], ['L', E(0, 0, 33, 21, -14), 7]], 33),
  eye('Halfdicht', [
    ['W', 'M-34 -8 L34 -10 Q34 18 0 18 Q-34 18 -34 -8 Z'],
    ['I', 0, -5, 16, 'M-34 -8 L34 -10 Q34 18 0 18 Q-34 18 -34 -8 Z'],
    ['L', 'M-37 -4 Q0 -18 37 -8', 8],
    ['L', 'M-31 6 Q0 26 31 6', 6],
  ], 34),
  eye('Klein met wimper', [['I', 0, 4, 16], ['K', 'M-17 3 Q-16 -14 0 -14 Q16 -14 17 3 Q8 -2 0 -2 Q-8 -2 -17 3 Z'], ['L', 'M12 -9 L27 -17', 6]], 17),
  eye('Streep', [['L', 'M-32 0 L32 0', 8]], 32, true),
  eye('Schuine streep', [['I', -14, 12, 13], ['L', 'M-34 -14 L34 4', 7]], 34),
  eye('Ovaal', [['W', E(0, 0, 34, 22)], ['I', 0, 0, 15, E(0, 0, 34, 22)], ['L', E(0, 0, 34, 22), 7]], 34),
  eye('Amandel', [
    ['W', 'M-36 6 Q-10 -26 36 -12 Q12 22 -36 6 Z'],
    ['I', -2, -2, 14, 'M-36 6 Q-10 -26 36 -12 Q12 22 -36 6 Z'],
    ['L', 'M-36 6 Q-10 -26 36 -12 Q12 22 -36 6 Z', 6],
  ], 36),
  eye('Gekleurd ooglid', [
    ['R', 'M-32 2 Q-28 -30 6 -30 Q30 -30 34 -12', 9],
    ['I', -2, 6, 15],
    ['L', 'M-30 5 Q-26 -21 4 -21 Q24 -21 30 -8', 5],
    ['L', 'M30 -8 L41 -14', 5],
  ]),
  eye('Grote ogen', [['W', E(0, 0, 30, 30)], ['I', -6, -6, 22, E(0, 0, 30, 30)], ['L', 'M-30 4 A30 30 0 1 1 14 27', 8]]),
  eye('Grote boog', [['I', -6, 6, 14], ['L', 'M-28 -12 Q-10 -32 14 -24 Q34 -14 30 22', 7]]),
  eye('Vergrootglas', [['W', E(0, 0, 26, 26)], ['I', -4, -4, 20, E(0, 0, 26, 26)], ['L', 'M-26 0 A26 26 0 1 1 18 19', 7], ['L', 'M14 16 L30 30', 7]], 26),
  eye('Koepellijn', [['I', 0, 6, 16], ['L', 'M-30 16 Q-32 -24 0 -26 Q32 -24 30 16', 7]]),
  eye('Zwaar ooglid', [['I', 0, 6, 14], ['K', 'M-36 -2 Q-30 -28 0 -28 Q30 -28 36 -2 Q0 -15 -36 -2 Z']], 36),
  eye('Wenkbrauwoog', [['I', -6, 8, 14], ['L', 'M-32 14 Q-24 -24 6 -24 Q30 -22 32 10', 6]]),
  eye('Lachoog', [['L', 'M-34 -2 Q-14 -16 10 -6 Q18 -2 22 6', 9], ['L', 'M22 6 L34 -2', 6]], 34, true),
  eye('Halve maan', [['K', 'M-26 8 Q-24 -18 0 -18 Q24 -18 26 8 Z']], 26, true),
  eye('Dubbele streep', [['L', 'M-30 -8 Q0 -16 30 -6', 7], ['L', 'M-30 8 Q0 2 30 10', 7]], 30, true),
  eye('Golfje', [['I', -12, 2, 14], ['L', 'M-32 -6 Q-14 -24 2 -6 Q12 8 22 -4 Q28 -12 36 -4', 5]], 34),
  eye('Koepel met wimpers', [
    ['W', 'M-34 10 Q-30 -22 0 -22 Q30 -22 34 10 Z'],
    ['I', 0, 3, 15, 'M-34 10 Q-30 -22 0 -22 Q30 -22 34 10 Z'],
    ['K', 'M-35 10 Q-33 -27 0 -27 Q33 -27 35 10 Q30 -15 0 -15 Q-30 -15 -35 10 Z'],
    ['L', 'M30 -4 L42 -10 M32 4 L44 2', 5],
  ], 34),
  eye('Platte koepel', [
    ['W', 'M-34 14 L30 14 Q30 -22 -2 -22 Q-34 -22 -34 14 Z'],
    ['I', -2, 0, 15, 'M-34 14 L30 14 Q30 -22 -2 -22 Q-34 -22 -34 14 Z'],
    ['L', 'M-34 14 L30 14 Q30 -22 -2 -22 Q-34 -22 -34 14 Z', 6],
    ['L', 'M24 -14 L38 -22 M29 -4 L43 -8 M30 6 L44 6', 5],
  ], 34),
  eye('Opkijkend', [['I', -18, 14, 13], ['L', 'M-34 4 Q-10 -20 34 -26', 8]], 34),
  eye('Strak ooglid', [['I', -2, 5, 14], ['L', 'M-30 5 L-20 -8 L34 -8', 9]], 34),
  eye('Zwart', [['K', 'M-32 0 Q0 -24 32 0 Q0 24 -32 0 Z']], 32, true),
  eye('Spleetje', [
    ['W', 'M-36 8 Q0 -14 36 -8 Q2 14 -36 8 Z'],
    ['I', -4, 0, 9, 'M-36 8 Q0 -14 36 -8 Q2 14 -36 8 Z'],
    ['L', 'M-36 8 Q0 -14 36 -8 Q2 14 -36 8 Z', 5],
  ], 36),
  eye('Scherp', [
    ['W', 'M-34 6 L-26 -12 Q0 -19 34 -22 L30 6 Q0 20 -24 18 Z'],
    ['I', -4, -2, 14, 'M-34 6 L-26 -12 Q0 -19 34 -22 L30 6 Q0 20 -24 18 Z'],
    ['L', 'M-34 6 L-26 -12 Q0 -19 34 -22 L30 6 Q0 20 -24 18 Z', 7],
  ], 34),
  eye('Breed schuin', [
    ['W', 'M-34 -6 Q0 -14 34 -22 Q36 6 26 14 Q0 22 -30 14 Z'],
    ['I', -2, 0, 15, 'M-34 -6 Q0 -14 34 -22 Q36 6 26 14 Q0 22 -30 14 Z'],
    ['L', 'M-34 -6 Q0 -14 34 -22 Q36 6 26 14 Q0 22 -30 14 Z', 7],
  ], 34),
  eye('Smal met wimpers', [
    ['W', 'M-30 4 Q-6 -16 26 -2 Q0 12 -30 4 Z'],
    ['I', -6, 0, 10, 'M-30 4 Q-6 -16 26 -2 Q0 12 -30 4 Z'],
    ['L', 'M-30 4 Q-6 -16 26 -2 Q0 12 -30 4 Z', 5],
    ['L', 'M22 -6 L34 -14 M24 0 L36 -4', 4],
  ]),
  eye('Eyeliner', [
    ['W', 'M-34 6 Q-8 -20 26 -6 Q4 18 -34 6 Z'],
    ['I', -4, 0, 13, 'M-34 6 Q-8 -20 26 -6 Q4 18 -34 6 Z'],
    ['L', 'M-34 6 Q-8 -20 26 -6 Q4 18 -34 6 Z', 6],
    ['L', 'M22 -6 L44 -20', 6],
  ], 34),
  eye('Dik ooglid', [
    ['W', 'M-34 -4 Q0 -18 34 -4 Q34 20 0 22 Q-34 20 -34 -4 Z'],
    ['I', -6, -6, 12, 'M-34 -4 Q0 -18 34 -4 Q34 20 0 22 Q-34 20 -34 -4 Z'],
    ['L', 'M-36 2 Q-36 -16 0 -16 Q36 -16 36 2', 9],
  ], 35),
  eye('Iris', [['I', 0, 0, 22]], 22),
  eye('Ring met wimper', [['W', E(0, 0, 26, 26)], ['I', 0, 0, 17, E(0, 0, 26, 26)], ['L', 'M16 20 A26 26 0 1 1 26 4', 8], ['L', 'M22 -2 L38 -6', 6]], 26),
  eye('Ring met wimpers', [
    ['W', E(0, 0, 26, 26)],
    ['I', 0, 0, 17, E(0, 0, 26, 26)],
    ['L', E(0, 0, 26, 26), 8],
    ['L', 'M18 -20 L26 -32 M24 -12 L38 -18 M26 -2 L40 -2', 5],
  ], 26),
  eye('Rond', [['W', E(0, 0, 32, 26)], ['I', 0, 0, 18, E(0, 0, 32, 26)], ['L', E(0, 0, 32, 26), 8]], 32),
  eye('Plat ovaal', [['W', E(0, 0, 34, 20)], ['I', 0, -6, 14, E(0, 0, 34, 20)], ['L', E(0, 0, 34, 20), 8]], 34),
  eye('Heuvel', [
    ['W', 'M-34 14 Q-34 -20 0 -20 Q34 -20 34 14 Z'],
    ['I', 0, 2, 15, 'M-34 14 Q-34 -20 0 -20 Q34 -20 34 14 Z'],
    ['L', 'M-34 14 Q-34 -20 0 -20 Q34 -20 34 14 Z', 8],
  ], 34),
  eye('Wimpers', [
    ['W', 'M-32 4 Q-6 -20 28 -4 Q6 18 -32 4 Z'],
    ['I', -4, 0, 14, 'M-32 4 Q-6 -20 28 -4 Q6 18 -32 4 Z'],
    ['L', 'M-32 4 Q-6 -20 28 -4 Q6 18 -32 4 Z', 6],
    ['L', 'M-32 4 Q-6 -22 28 -4', 9],
    ['L', 'M26 -6 L40 -14 M28 0 L42 -2', 5],
  ], 32),
  eye('Onderwimpers', [
    ['W', E(0, 0, 28, 28)],
    ['I', 0, 0, 19, E(0, 0, 28, 28)],
    ['K', 'M-31 2 A31 31 0 0 1 31 2 Q0 -18 -31 2 Z'],
    ['L', E(0, 0, 28, 28), 6],
    ['L', 'M-6 26 L-10 38 M4 27 L4 40 M14 24 L18 36', 5],
  ], 28),
  eye('Open met wimpers', [
    ['W', E(0, 0, 28, 28)],
    ['I', -6, -4, 20, E(0, 0, 28, 28)],
    ['L', 'M10 26 A28 28 0 1 1 28 4', 7],
    ['L', 'M20 18 L32 26 M14 24 L22 34', 5],
  ], 28),
  eye('Roos', [['W', E(0, 0, 28, 28)], ['I', 0, 0, 18, E(0, 0, 28, 28)], ['L', E(0, 0, 28, 28), 9]], 28),
  eye('Kom', [
    ['W', 'M-30 -8 L30 -8 Q30 22 0 22 Q-30 22 -30 -8 Z'],
    ['I', 0, -8, 16, 'M-30 -8 L30 -8 Q30 22 0 22 Q-30 22 -30 -8 Z'],
    ['L', 'M-30 -8 L30 -8 Q30 22 0 22 Q-30 22 -30 -8 Z', 8],
  ]),
  eye('Mes', [
    ['W', 'M-32 8 Q-30 0 -20 -2 Q10 -6 38 -22 Q30 6 6 12 Q-20 16 -32 8 Z'],
    ['I', -8, 2, 9, 'M-32 8 Q-30 0 -20 -2 Q10 -6 38 -22 Q30 6 6 12 Q-20 16 -32 8 Z'],
    ['L', 'M-32 8 Q-30 0 -20 -2 Q10 -6 38 -22 Q30 6 6 12 Q-20 16 -32 8 Z', 6],
  ], 34),
  eye('Sterretjes', [
    ['I', 0, 6, 22],
    ['S', 8, -1, 9],
    ['S', -8, 15, 7],
    ['L', 'M-24 -8 Q0 -26 24 -8', 8],
    ['L', 'M20 -14 L30 -24 M24 -6 L38 -12 M26 2 L40 2', 5],
  ], 24),
  eye('Knipoog', [['L', 'M-30 -2 Q-10 -6 14 -2', 9], ['L', 'M24 -4 L36 -6 M22 8 L32 12', 6]], 30, true),
  eye('Dichtgeknepen', [['L', 'M30 -16 L-24 2 L30 20', 8], ['L', 'M-24 2 L30 2', 7]], 30, true),
];

export const BROWS = [
  { name: 'Wig', layers: [['F', 'M-38 10 L-36 6 L24 -16 L36 -6 Z']] },
  { name: 'Dunne boog', layers: [['F', 'M-36 8 Q0 -16 36 4 Q0 -7 -36 8 Z']] },
  { name: 'Blok', layers: [['F', 'M-36 -2 L22 -10 L36 4 L32 7 L-34 10 Z']] },
  { name: 'Komma', layers: [['F', 'M-34 10 Q-38 0 -26 -6 Q0 -18 36 -2 Q4 -9 -22 6 Q-28 12 -34 10 Z']] },
  { name: 'Dikke boog', layers: [['F', 'M-36 8 Q-10 -20 34 -16 L34 -6 Q-6 -8 -30 14 Z']] },
  { name: 'Zacht', layers: [['F', 'M-36 6 Q0 -12 36 2 Q0 -4 -36 10 Z']] },
  { name: 'Halve cirkel', layers: [['B', 'M-24 10 Q-22 -16 0 -16 Q22 -16 24 10', 9]] },
  { name: 'Punt', layers: [['F', 'M-36 6 L10 -16 L38 4 L34 10 L10 -4 L-34 14 Z']] },
  { name: 'Aflopend', layers: [['F', 'M-36 -6 Q10 -8 30 6 Q36 12 30 14 Q24 14 16 8 Q-6 0 -36 4 Z']] },
  { name: 'Hoefijzer', layers: [['B', 'M-30 12 Q-30 -16 0 -16 Q30 -16 30 12', 11]] },
  { name: 'Dak', layers: [['F', 'M-34 4 L0 -16 L34 4 L26 14 L0 0 L-26 14 Z']] },
  { name: 'Lemmet', layers: [['F', 'M-36 10 L34 -10 L36 3 Z']] },
  { name: 'Haak', layers: [['F', 'M-30 14 Q-40 8 -34 -2 Q-24 -16 0 -16 Q24 -16 36 -4 Q14 -8 -8 0 Q-18 8 -20 14 Q-24 18 -30 14 Z']] },
  { name: 'Lijn', layers: [['B', 'M-36 8 L36 -10', 5]] },
  { name: 'Balk', layers: [['F', 'M-34 -8 L34 -8 L34 8 L-34 8 Z']] },
  { name: 'Bult', layers: [['F', 'M-34 14 Q8 -26 34 -2 Q8 -15 -30 16 Z']] },
  { name: 'Staafje', layers: [['B', 'M-28 6 L28 -8', 16]] },
  { name: 'Golf', layers: [['F', 'M-36 -8 Q-10 -12 10 -8 Q28 -4 36 6 L30 12 Q20 4 6 4 Q-14 4 -36 6 Z']] },
  { name: 'Slinger', layers: [['B', 'M-36 8 Q-24 12 -12 4 Q4 -8 18 -6 Q30 -4 36 2', 6]] },
  { name: 'Schaaltje', layers: [['B', 'M-30 -10 Q-26 14 0 14 Q24 14 32 2', 8]] },
  { name: 'Trapje', layers: [['B', 'M-36 12 L-22 12 Q-10 12 0 -2 Q10 -16 20 -4 Q28 6 36 8', 9]] },
  { name: 'Veer', layers: [['F', 'M-36 -6 L20 2 L36 -6 L28 8 L34 16 L16 10 Q-10 6 -36 2 Z']] },
  { name: 'Stippels', layers: [['O', -32, 12, 3.5], ['O', -20, 2, 3.5], ['O', -6, -4, 3.5], ['O', 8, -6, 3.5], ['O', 22, -2, 3.5], ['O', 32, 6, 3.5]] },
  { name: 'Geen', none: true, layers: [] },
];

// Noses: (0, 0) is the tip, the bridge runs up to about y = -40.
// bump: size of the small 3D bulge under the drawing (see head.js).
const BUMP = {
  small: { A: 0.018, L: 0.07, tipW: 0.03, bridgeW: 0.02 },
  normal: { A: 0.03, L: 0.13, tipW: 0.04, bridgeW: 0.022 },
  big: { A: 0.042, L: 0.16, tipW: 0.048, bridgeW: 0.026 },
  wide: { A: 0.026, L: 0.1, tipW: 0.062, bridgeW: 0.026 },
};
const nose = (name, bump, layers) => ({ name, bump: BUMP[bump], layers });

export const NOSES = [
  nose('Haakje', 'normal', [['L', 'M2 -38 Q5 -20 -7 -10 Q-14 -2 -6 1 L8 1', 5]]),
  nose('Glimlach', 'normal', [['L', 'M-18 -10 Q0 6 18 -10', 5]]),
  nose('Stipjes', 'small', [['O', -8, -3, 5], ['O', 8, -3, 5]]),
  nose('V', 'normal', [['L', 'M-16 -18 Q-8 0 0 2 Q8 0 16 -18', 5]]),
  nose('Rug en vleugel', 'big', [['L', 'M-6 -40 L-6 -16 L-12 -4 Q-14 2 -6 3 L8 0 Q12 -2 8 -8', 5]]),
  nose('Driehoekje', 'small', [['F', 'M-14 2 L14 2 L0 -12 Z']]),
  nose('Emmertje', 'wide', [['L', 'M-12 -14 Q-20 -10 -18 -4 Q-16 4 0 4 Q16 4 18 -4 Q20 -10 12 -14', 5]]),
  nose('Boogje', 'small', [['L', 'M-14 4 Q-14 -14 0 -14 Q14 -14 14 4', 5]]),
  nose('Druppel', 'big', [['L', 'M-6 -36 Q-14 -6 -10 0 Q-6 6 0 6 Q6 6 10 0 Q14 -6 6 -36', 5]]),
  nose('Breed', 'big', [['L', 'M-6 -40 L-6 -14 M6 -40 L6 -14 M-6 -14 Q-20 -12 -16 -4 Q-12 4 0 4 Q12 4 16 -4 Q20 -12 6 -14', 5]]),
  nose('Golfje', 'wide', [['L', 'M-18 -12 L-18 -6 Q-18 2 -10 2 Q-4 2 -2 -4 Q0 4 2 -4 Q4 2 10 2 Q18 2 18 -6 L18 -12', 4]]),
  nose('Lang', 'big', [['L', 'M-4 -42 L-4 -8 L-14 2 M4 -42 L4 -8 L14 2', 5], ['F', 'M-9 2 L-3 -5 L-3 2 Z M9 2 L3 -5 L3 2 Z']]),
];

const teeth4 = 'M-19 -5 L-12 -5 L-12 8 L-19 8 Z M-9 -5 L-1 -5 L-1 11 L-9 11 Z M2 -5 L10 -5 L10 11 L2 11 Z M13 -5 L20 -5 L20 7 L13 7 Z';

export const MOUTHS = [
  { name: 'Streep', layers: [['L', 'M-28 0 L28 0', 7]] },
  { name: 'Lachende lippen', layers: [['D', 'M-34 -4 Q0 -1 34 -4 Q16 14 0 14 Q-16 14 -34 -4 Z'], ['U', 'M-34 -4 Q-18 -7 -6 -7 Q0 -3 6 -7 Q18 -7 34 -4 Q16 -1 0 0 Q-16 -1 -34 -4 Z']] },
  { name: 'Glimlach', layers: [['L', 'M-30 -6 Q0 14 30 -6', 7]] },
  { name: 'Krullachje', layers: [['L', 'M-26 -2 Q0 10 26 -2 M-26 -2 Q-34 -2 -32 -10 M26 -2 Q34 -2 32 -10', 6]] },
  { name: 'Open lach', layers: [['K', 'M-32 -8 L32 -8 Q28 18 0 18 Q-28 18 -32 -8 Z'], ['T', 'M-26 -5 L26 -5 L22 2 L-22 2 Z']] },
  { name: 'Dunne lippen', layers: [['D', 'M-40 -4 Q0 0 40 -4 Q0 11 -40 -4 Z'], ['U', 'M-40 -6 Q0 -2 40 -6 L40 -4 Q0 0 -40 -4 Z']] },
  { name: 'Gesloten lippen', layers: [['D', 'M-34 2 Q0 20 34 2 Z'], ['U', 'M-34 2 Q0 -16 34 2 Z']] },
  { name: 'Golf', layers: [['L', 'M-30 4 Q-15 -10 0 0 Q15 10 30 -4', 7]] },
  { name: 'Meeuw', layers: [['L', 'M-32 8 Q-20 -10 -6 -2 Q0 2 6 -2 Q20 -10 32 8', 7]] },
  { name: 'Haken', layers: [['L', 'M-24 -14 Q-28 0 -24 14 M24 -14 Q28 0 24 14 M-25 -6 L25 -6', 6]] },
  { name: 'Roepen', layers: [['K', 'M-28 10 Q-26 -16 0 -16 Q26 -16 28 10 Q0 14 -28 10 Z'], ['T', 'M-14 -9 Q0 -15 14 -9 L10 -3 Q0 -7 -10 -3 Z']] },
  { name: 'Volle lippen', layers: [['U', 'M-36 0 Q-20 -18 0 -16 Q20 -18 36 0 Z'], ['D', 'M-36 0 Q0 24 36 0 Z'], ['L', 'M-35 0 L35 0', 4]] },
  { name: 'Bovenlip', layers: [['U', 'M-36 6 Q-20 -2 -6 -4 Q0 0 6 -4 Q20 -2 36 6 Q0 2 -36 6 Z']] },
  { name: 'Vlakke V', layers: [['L', 'M-32 -8 L0 8 L32 -8', 7]] },
  { name: 'O', layers: [['K', E(0, 2, 21, 24)]] },
  { name: 'Tanden onder', layers: [['K', 'M-34 -8 Q0 -2 34 -8 Q26 16 0 16 Q-26 16 -34 -8 Z'], ['T', 'M-14 4 L14 4 L12 12 L-12 12 Z']] },
  { name: 'Haakjes', layers: [['L', 'M-24 0 L24 0 M-30 -12 Q-22 0 -30 12 M30 -12 Q22 0 30 12', 6]] },
  { name: 'Kus', layers: [['U', 'M-26 0 Q-26 -24 -6 -24 Q0 -20 6 -24 Q26 -24 26 0 Z'], ['D', 'M-26 0 Q-26 26 0 26 Q26 26 26 0 Z']] },
  { name: 'Grijns', layers: [['L', 'M-30 4 L8 4 Q22 4 32 -8', 7]] },
  { name: 'Dikke lippen', layers: [['G', 'M-34 -4 Q-34 -16 0 -16 Q34 -16 34 -4 Q0 -2 -34 -4 Z'], ['G', 'M-34 4 Q0 2 34 4 Q34 18 0 18 Q-34 18 -34 4 Z']] },
  { name: 'Hoekje', layers: [['L', 'M-30 -4 L22 -4 Q30 -4 28 8', 7]] },
  { name: 'Sip', layers: [['L', 'M-32 8 Q-14 -2 0 -8 Q14 -2 32 8', 7]] },
  { name: 'Tanden', layers: [['K', 'M-34 -8 Q0 -4 34 -8 Q28 16 0 16 Q-28 16 -34 -8 Z'], ['T', teeth4, 'M-34 -8 Q0 -4 34 -8 Q28 16 0 16 Q-28 16 -34 -8 Z']] },
  { name: 'Zigzag', layers: [['L', 'M-30 2 L-18 -6 L-6 4 L6 -6 L18 4 L30 -4', 6]] },
];

export const MUSTACHES = [
  { name: 'Geen', none: true, layers: [] },
  { name: 'Borstel', layers: [['F', 'M-34 10 Q-32 -12 0 -14 Q32 -12 34 10 Q29 4 24 10 Q19 4 14 10 Q9 4 4 10 Q0 4 -4 10 Q-9 4 -14 10 Q-19 4 -24 10 Q-29 4 -34 10 Z']] },
  { name: 'Dun', layers: [['B', 'M-30 6 Q-20 -5 -4 -4 M4 -4 Q20 -5 30 6', 6]] },
  { name: 'Hoefijzer', layers: [['B', 'M-30 40 L-30 0 Q-30 -12 0 -12 Q30 -12 30 0 L30 40', 13]] },
];
