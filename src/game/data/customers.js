// The customers: 28 islanders and guests, each with a character and a day of their own.
//
//   id, name        key (saved) and the name shown
//   mii             name of an official Mii (their looks), or
//   look            { seed, g, set }: a generated Mii (seed keeps it the same), g = 'm' | 'f',
//                   set = overrides like { 'hair.color': 7, height: 20 }
//   type            see klanten/types.js (patience, discretion, standard, speed, maxQty)
//   voice           how they talk (klanten/lines.js)
//   budget          the most they spend per visit
//   likes           three effects they love; dislikes: one effect they cannot stand
//   prefers         the product they like best (a wish message comes when you cannot make it yet)
//   home            zone of their house ('hotel' = they live in the resort hotel)
//   routine         [[hour, place], ...] from 06:00: where they are when. They WALK between the
//                   places along the paths (klanten/places.js). Hours run to 28 (04:00). A third
//                   entry is an alternative place some days.
//   unlock          null = known from the start; otherwise conditions that must all hold:
//                   { rank, loyalty: [friendId, trust], deals, day, earned } or { any: [...] }
//   every           days between two deals (1 = every day; the rich ones stock up every other day)
//   spot            the area they mostly are in ('strand' or 'haven'), for the rival's price effect
//
// `schedule` (hour windows when they are out of the house) is derived from the routine.

import { TYPES } from '../klanten/types.js';

const HOME = 'thuis';

const RAW = [
  // --- from the start
  { id: 'saburo', name: 'Saburo', mii: 'Saburo', type: 'toerist', voice: 'joviaal', budget: 40, likes: ['fris', 'zoet', 'tropisch'], dislikes: ['ijzig'], prefers: 'limonade', home: 'strand', spot: 'strand', unlock: null,
    bio: 'Op vakantie, al drie weken. Zijn terugvlucht is hij "vergeten".',
    routine: [[6, HOME], [7, 'strand'], [12, 'surf'], [14.5, 'strand'], [18, HOME]] },
  { id: 'fumiko', name: 'Fumiko', mii: 'Fumiko', type: 'strandganger', voice: 'joviaal', budget: 60, likes: ['zoet', 'verkoelend', 'giechel'], dislikes: ['bruisend'], prefers: 'snoep', home: 'strand', spot: 'strand', unlock: null,
    bio: 'Zit elke dag op hetzelfde handdoekje. Kent iedereen.',
    routine: [[6, HOME], [10, 'strand'], [13.5, 'surf'], [16, 'strand'], [20, HOME]] },
  { id: 'kai', name: 'Kai', look: { seed: 7311, g: 'm', set: { height: 22, weight: 40, 'hair.color': 5 } }, type: 'kind', voice: 'kinderlijk', budget: 32, likes: ['zoet', 'giechel', 'fris'], dislikes: ['ijzig'], prefers: 'limonade', home: 'strand', spot: 'strand', unlock: null,
    bio: 'Spaart zijn zakgeld voor "iets stiekems". Praat te hard.',
    routine: [[6, HOME], [9, 'strand'], [12, HOME], [14, 'strand'], [17.5, HOME]] },
  { id: 'truus', name: 'Oma Truus', look: { seed: 4242, g: 'f', set: { 'hair.color': 4, 'face.skin': 0, height: 48, weight: 70, 'face.feature': 1 } }, type: 'oma', voice: 'zuinig', budget: 36, likes: ['zoet', 'tropisch', 'verkoelend'], dislikes: ['bruisend'], prefers: 'limonade', home: 'strand', spot: 'strand', unlock: null,
    bio: 'Breit sjaals voor pinguins. Ze weet alles, ze zegt niets.',
    routine: [[6, HOME], [9, 'strand'], [12, HOME], [15, 'surf'], [18, HOME]] },

  // --- introduced by friends on the beach and at the harbour
  { id: 'daisuke', name: 'Daisuke', mii: 'Daisuke', type: 'visser', voice: 'stoer', budget: 90, likes: ['bruisend', 'ijzig', 'fris'], dislikes: ['zoet'], prefers: 'limonade', home: 'haven', spot: 'haven', unlock: { loyalty: ['saburo', 20] },
    bio: 'Vangt vooral praatjes. De vis laat hij meestal gaan.',
    routine: [[6, HOME], [7, 'steiger'], [12, 'markt'], [15, 'steiger'], [19, HOME]] },
  { id: 'sakura', name: 'Sakura', mii: 'Sakura', type: 'kraamhouder', voice: 'joviaal', budget: 130, likes: ['tropisch', 'zonnig', 'giechel'], dislikes: ['verkoelend'], prefers: 'snoep', home: 'haven', spot: 'haven', unlock: { loyalty: ['fumiko', 20] },
    bio: 'Haar kraam verkoopt alles behalve wat jij verkoopt.',
    routine: [[6, HOME], [11, 'markt'], [17, 'terras'], [22, HOME]] },
  { id: 'bram', name: 'Bram', look: { seed: 902, g: 'm', set: { 'hair.color': 7, 'face.skin': 3, 'facialHair.beard': 0 } }, type: 'surfer', voice: 'chill', budget: 55, likes: ['fris', 'bruisend', 'tropisch'], dislikes: ['ijzig'], prefers: 'limonade', home: 'strand', spot: 'strand', unlock: { loyalty: ['saburo', 12] },
    bio: 'Wacht op de perfecte golf. Al sinds maart.',
    routine: [[6, HOME], [8, 'surf'], [12, 'strand'], [15, 'surf'], [19, 'strand'], [21, HOME]] },
  { id: 'lotte', name: 'Lotte', look: { seed: 5150, g: 'f', set: { 'hair.color': 3 } }, type: 'toerist', voice: 'joviaal', budget: 50, likes: ['zoet', 'fris', 'zonnig'], dislikes: ['verkoelend'], prefers: 'limonade', home: 'strand', spot: 'strand', unlock: { loyalty: ['fumiko', 12] },
    bio: 'Rugzaktoerist met een kaart die ondersteboven hangt.',
    routine: [[6, HOME], [9, 'strand'], [13, 'surf'], [16, 'weide', 'strand'], [20, 'strand'], [22, HOME]] },

  // --- rank 1
  { id: 'andy', name: 'Andy', mii: 'Andy', type: 'nachtbraker', voice: 'stoer', budget: 200, likes: ['ijzig', 'zonnig', 'bruisend'], dislikes: ['zoet'], prefers: 'ijs', home: 'strand', spot: 'strand', unlock: { rank: 1 },
    bio: 'Wordt wakker als de zon ondergaat. Betaalt altijd contant.',
    routine: [[6, HOME], [17.5, 'strand'], [22, 'surf'], [25.5, 'strand']] },
  { id: 'noor', name: 'Noor', look: { seed: 3099, g: 'f', set: { 'hair.color': 1 } }, type: 'sporter', voice: 'joviaal', budget: 70, likes: ['verkoelend', 'fris', 'ijzig'], dislikes: ['zoet'], prefers: 'limonade', home: 'strand', spot: 'strand', unlock: { deals: 5 },
    bio: 'Rent twee keer per dag het eiland rond. Drinkt meer dan ze zegt.',
    routine: [[6, HOME], [7, 'strand'], [8, 'weide'], [9.5, 'strand'], [12, HOME], [17, 'weide'], [18.5, 'strand'], [20, HOME]] },
  { id: 'piet', name: 'Piet', look: { seed: 1717, g: 'm', set: { 'hair.color': 4, 'facialHair.beard': 2, 'facialHair.color': 4, 'face.feature': 3, height: 58 } }, type: 'visser', voice: 'zuinig', budget: 75, likes: ['fris', 'tropisch', 'bruisend'], dislikes: ['giechel'], prefers: 'limonade', home: 'haven', spot: 'haven', unlock: { loyalty: ['daisuke', 25] },
    bio: 'Zegt "tja" op alles. Dat is meestal genoeg.',
    routine: [[6, HOME], [6.5, 'steiger'], [11, 'markt'], [13.5, 'terras'], [16, 'steiger'], [19, HOME]] },
  { id: 'mo', name: 'Mo', look: { seed: 8088, g: 'm', set: { 'face.skin': 4, 'hair.color': 0 } }, type: 'student', voice: 'zuinig', budget: 45, likes: ['bruisend', 'zoet', 'giechel'], dislikes: ['zonnig'], prefers: 'snoep', home: 'haven', spot: 'haven', unlock: { rank: 1, loyalty: ['fumiko', 25] },
    bio: 'Studeert "iets met zee". Zit vooral op het terras.',
    routine: [[6, HOME], [10, 'markt'], [14, 'terras'], [19, 'markt'], [22, HOME]] },
  { id: 'ren', name: 'Ren', mii: 'Ren', type: 'toerist', voice: 'verlegen', budget: 85, likes: ['zonnig', 'tropisch', 'verkoelend'], dislikes: ['bruisend'], prefers: 'limonade', home: 'strand', spot: 'strand', unlock: { rank: 1, loyalty: ['lotte', 20] },
    bio: 'Fotografeert zonsopgangen. Praat liever niet in beeld.',
    routine: [[6, HOME], [7, 'strand'], [11, 'uitzicht'], [15, 'weide'], [19, 'strand'], [21, HOME]] },

  // --- rank 2
  { id: 'hiroshi', name: 'Hiroshi', mii: 'Hiroshi', type: 'kok', voice: 'deftig', budget: 380, likes: ['bruisend', 'zoet', 'zonnig'], dislikes: ['ijzig'], prefers: 'snoep', home: 'haven', spot: 'haven', unlock: { rank: 2, loyalty: ['daisuke', 30] },
    bio: 'Chef van het havenrestaurant. Proeft alles drie keer.',
    routine: [[6, HOME], [8, 'markt'], [11, 'terras'], [16, 'markt'], [17.5, 'terras'], [23, HOME]] },
  { id: 'shinnosuke', name: 'Shinnosuke', mii: 'Shinnosuke', type: 'kind', voice: 'kinderlijk', budget: 40, likes: ['giechel', 'zoet', 'bruisend'], dislikes: ['verkoelend'], prefers: 'snoep', home: 'strand', spot: 'strand', unlock: { rank: 2, loyalty: ['kai', 25] },
    bio: 'Heeft altijd net iets meer zakgeld dan Kai. En dat weet Kai.',
    set: { height: 24 },
    routine: [[6, HOME], [10, 'strand'], [13, HOME], [15, 'surf'], [18, HOME]] },
  { id: 'akira', name: 'Akira', mii: 'Akira', type: 'bewaker', voice: 'streng', budget: 110, likes: ['ijzig', 'fris', 'verkoelend'], dislikes: ['giechel'], prefers: 'limonade', home: 'haven', spot: 'haven', unlock: { deals: 12 },
    bio: 'Bewaker met nachtdienst. Kijkt de andere kant op, als je vriendelijk bent.',
    routine: [[6, HOME], [14, 'markt'], [17, 'steiger'], [20, 'terras'], [24, 'markt'], [27, HOME]] },
  { id: 'fenna', name: 'Fenna', look: { seed: 6006, g: 'f', set: { 'hair.color': 6, 'glasses.type': 3 } }, type: 'kunstenaar', voice: 'chill', budget: 120, likes: ['giechel', 'tropisch', 'zonnig'], dislikes: ['ijzig'], prefers: 'snoep', home: 'heuvels', spot: 'haven', unlock: { loyalty: ['sakura', 30] },
    bio: 'Schildert elke zonsondergang. Elke dag een iets andere kleur oranje.',
    routine: [[6, HOME], [10, 'uitzicht'], [14, 'weide'], [17.5, 'uitzicht'], [22, HOME]] },
  { id: 'tatsuaki', name: 'Tatsuaki', mii: 'Tatsuaki', type: 'wandelaar', voice: 'joviaal', budget: 100, likes: ['zonnig', 'fris', 'bruisend'], dislikes: ['zoet'], prefers: 'limonade', home: 'heuvels', spot: 'haven', unlock: { rank: 2 },
    bio: 'Loopt overal naartoe. Komt meestal ergens anders uit.',
    routine: [[6, HOME], [8, 'uitzicht'], [12, 'kaap'], [17, 'weide'], [19.5, 'markt'], [22, HOME]] },
  { id: 'yara', name: 'Yara', mii: 'Gast D', type: 'sporter', voice: 'chill', budget: 95, likes: ['verkoelend', 'zoet', 'zonnig'], dislikes: ['bruisend'], prefers: 'snoep', home: 'strand', spot: 'strand', unlock: { rank: 2, loyalty: ['noor', 20] },
    bio: 'Geeft yoga op het strand. Zegt dat suiker "ook een mindset" is.',
    routine: [[6, HOME], [7, 'surf'], [9, 'strand'], [13, 'weide'], [17, 'surf'], [20, HOME]] },

  // --- rank 3: the resort hotel in the hills
  { id: 'shouta', every: 2, name: 'Meneer Shouta', mii: 'Shouta', type: 'hotelgast', voice: 'deftig', budget: 300, likes: ['ijzig', 'zonnig', 'tropisch'], dislikes: ['zoet'], prefers: 'ijs', home: 'hotel', spot: 'haven', unlock: { rank: 3 },
    bio: 'Zakenreis naar "een stille plek". Laat zijn telefoon aan.',
    routine: [[6, HOME], [9, 'hotel'], [12, 'uitzicht'], [15, 'markt'], [19, 'hotel'], [22, HOME]] },
  { id: 'wilbert', every: 2, name: 'Wilbert', mii: 'Gast A', type: 'hotelgast', voice: 'deftig', budget: 330, likes: ['bruisend', 'giechel', 'ijzig'], dislikes: ['verkoelend'], prefers: 'ijs', home: 'hotel', spot: 'haven', unlock: { rank: 3, loyalty: ['shouta', 20] },
    bio: 'Golfer zonder golfbaan. Slaat dus maar op alles.',
    routine: [[6, HOME], [10, 'hotel'], [13, 'weide'], [17, 'hotel'], [21, 'uitzicht'], [23, HOME]] },
  { id: 'vandam', every: 2, name: 'Mevrouw Van Dam', mii: 'Gast E', type: 'hotelgast', voice: 'deftig', budget: 300, likes: ['zoet', 'tropisch', 'zonnig'], dislikes: ['bruisend'], prefers: 'snoep', home: 'hotel', spot: 'haven', unlock: { rank: 3 },
    bio: 'Logeert in de beste suite en klaagt over de tweede beste.',
    routine: [[6, HOME], [11, 'hotel'], [14.5, 'uitzicht', 'strand'], [18, 'hotel'], [22, HOME]] },
  { id: 'wim', every: 2, name: 'Wim', look: { seed: 2112, g: 'm', set: { 'hair.color': 4, 'facialHair.beard': 3, 'facialHair.color': 4, 'face.feature': 3, height: 62 } }, type: 'visser', voice: 'stoer', budget: 220, likes: ['ijzig', 'verkoelend', 'fris'], dislikes: ['giechel'], prefers: 'ijs', home: 'kaap', spot: 'haven', unlock: { rank: 2, loyalty: ['piet', 35] },
    bio: 'Vuurtorenwachter. Zijn lamp is het enige dat hij nooit uitzet.',
    routine: [[6, HOME], [8, 'kaap'], [12, 'hotel'], [18, 'kaap'], [21.5, HOME]] },
  { id: 'jesse', every: 2, name: 'Jesse', look: { seed: 3434, g: 'm', set: { 'hair.color': 2, 'face.skin': 1 } }, type: 'strandganger', voice: 'joviaal', budget: 260, likes: ['giechel', 'zoet', 'bruisend'], dislikes: ['ijzig'], prefers: 'snoep', home: 'hotel', spot: 'strand', unlock: { rank: 3, loyalty: ['andy', 20] },
    bio: 'Animator van het hotel. Altijd aan, altijd dorst.',
    routine: [[6, HOME], [9, 'hotel'], [12, 'strand'], [18.5, 'hotel'], [22, HOME]] },

  // --- rank 4 and 5
  { id: 'ono', every: 2, name: 'Heer Ono', mii: 'Gast C', type: 'zakenman', voice: 'deftig', budget: 520, likes: ['zonnig', 'ijzig', 'giechel'], dislikes: ['zoet'], prefers: 'ijs', home: 'hotel', spot: 'haven', unlock: { rank: 4, loyalty: ['shouta', 30] },
    bio: 'Bankier. Als hij lacht, stijgt ergens een koers.',
    routine: [[6, HOME], [10, 'hotel'], [14, 'vulkaan'], [18, 'hotel'], [21, 'uitzicht'], [24, HOME]] },
  { id: 'mila', name: 'Mila', mii: 'Gast F', type: 'influencer', voice: 'joviaal', budget: 440, likes: ['tropisch', 'giechel', 'bruisend'], dislikes: ['verkoelend'], prefers: 'snoep', home: 'hotel', spot: 'strand', unlock: { rank: 4, loyalty: ['fenna', 25] },
    bio: 'Filmt alles. Alles. Hou je zakjes buiten beeld.',
    routine: [[6, HOME], [10, 'strand'], [13.5, 'uitzicht'], [17, 'hotel'], [20, 'strand'], [24, 'hotel'], [26, HOME]] },
  { id: 'vic', every: 2, name: 'Vulkaan-Vic', look: { seed: 9119, g: 'm', set: { 'hair.color': 1, 'face.skin': 2, 'face.feature': 3 } }, type: 'bergbeklimmer', voice: 'stoer', budget: 480, likes: ['ijzig', 'verkoelend', 'zonnig'], dislikes: ['tropisch'], prefers: 'ijs', home: 'heuvels', spot: 'haven', unlock: { rank: 4 },
    bio: 'Klimt de vulkaan elke ochtend. Daalt af voor ijs.',
    routine: [[6, HOME], [8, 'vulkaan'], [13, 'uitzicht'], [17, 'vulkaan'], [20, HOME]] },
  { id: 'baron', every: 2, name: 'De Baron', look: { seed: 1000, g: 'm', set: { 'hair.color': 4, 'facialHair.mustache': 2, 'facialHair.color': 4, 'face.feature': 3, 'glasses.type': 1 } }, type: 'tycoon', voice: 'deftig', budget: 1000, likes: ['giechel', 'zonnig', 'ijzig'], dislikes: ['fris'], prefers: 'ijs', home: 'hotel', spot: 'haven', unlock: { rank: 5 },
    bio: 'Bezit de helft van het eiland en wil de andere helft proeven.',
    routine: [[6, HOME], [11, 'terras'], [14, 'steiger'], [17.5, 'markt'], [21, 'hotel'], [24, HOME]] },
];

/** Hour windows [from, to) when the routine has the customer out of the house. */
export function windowsOf(routine) {
  const out = [];
  let from = null;
  for (const [hour, place] of routine) {
    if (place === HOME) {
      if (from != null) out.push([from, hour]);
      from = null;
    } else if (from == null) from = hour;
  }
  if (from != null) out.push([from, 28]);
  return out;
}

export const CUSTOMERS = RAW.map((raw) => {
  const t = TYPES[raw.type];
  const { set, ...c } = raw;
  const out = {
    patience: t.patience,
    discretion: t.discretion,
    standard: t.standard,
    speed: t.speed,
    texting: t.texting,
    maxQty: t.maxQty,
    rainproof: t.rainproof ?? false,
    every: 1,
    ...c,
  };
  out.schedule = windowsOf(out.routine);
  if (set) out.look = { ...(out.look ?? {}), set };
  return out;
});
