// Words for the phone messages of customers (see phone.js): openers per voice, how to ask for
// a product, and the right Dutch for each effect. Pure.

/** "iets zoets": how an effect is asked for. */
export const SOMETHING = {
  fris: 'iets fris',
  zoet: 'iets zoets',
  verkoelend: 'iets verkoelends',
  tropisch: 'iets tropisch',
  bruisend: 'iets bruisends',
  ijzig: 'iets ijzigs',
  zonnig: 'iets zonnigs',
  giechel: 'iets giechelends',
};

/** Unit of a product: [one, many]. */
export const UNITS = {
  limonade: ['flesje', 'flesjes'],
  snoep: ['zakje', 'zakjes'],
  ijs: ['bakje', 'bakjes'],
};

export const OPENERS = {
  joviaal: ['Hoi!', 'Hé hé!', 'Goedemorgen!'],
  stoer: ['Yo.', 'Luister.', 'Zeg.'],
  deftig: ['Goedendag,', 'Geachte,', 'Beste vriend,'],
  verlegen: ['Eh, hoi...', 'Sorry dat ik stoor,', 'Hallo? Ik ben het...'],
  chill: ['Heyy,', 'Yo man,', 'Dude,'],
  zuinig: ['Dag,', 'Hallo,', 'Goedemorgen,'],
  streng: ['Hoor,', 'Kort en goed:', 'Luister goed,'],
  kinderlijk: ['Hoi hoi!!', 'Psst!', 'Mama is weg!'],
};

/** Ways to ask: `what` is "2 flesjes limonade" (or "2 drankjes"), `fx` is "iets zoets". */
export const ASKS = [
  ({ what, fx }) => `heb je ${what} met ${fx} voor me?`,
  ({ what, fx }) => `ik wil graag ${what}, maar dan wel ${fx}!`,
  ({ what, fx }) => `kom je langs met ${what}? Het moet ${fx} zijn. Ik betaal extra.`,
  ({ what, fx }) => `er is straks een feestje: ${what} graag, met ${fx}.`,
];

/** After the ask: where to find them (from their day) or that they stay at home. */
export const meetAt = (at, clock) => `Je vindt me ${at} rond ${clock}.`;
export const STAY_HOME = ['Het weer is niks, ik blijf thuis. Klop maar aan!', 'Ik blijf binnen vandaag. Kom gerust langs aan de deur.'];

/** "14:30" from minutes of the game clock. */
export function clockText(minutes) {
  const m = Math.round(minutes / 15) * 15;
  const h = Math.floor(m / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
