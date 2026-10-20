// Data of the money laundering layer ("witwassen"): the four businesses you can buy, their
// upgrades, the bank limits and the numbers of the taxman. Pure data, no DOM, no three.js.
//
// Money from the forbidden snacks is DIRTY until it has gone through a business: you hand the
// cash over the counter, the business keeps a fee and the rest arrives clean on your bank account.
// A business can only explain so much money (its `cover`): wash more than that and the taxman
// (de Fiscus) will notice.

export const BUSINESS_IDS = ['ijskraam', 'surfschool', 'paviljoen', 'pretpark'];

/**
 * capacity: most dirty euros per day you can push through at level 0 (before upgrades/reputation).
 * cover:    euros per day the books can explain (what the shop could plausibly earn).
 * fee:      share the business keeps. staff: wages per day. revenue: honest takings per day.
 * weather:  revenue factor per weather (zon, bewolkt, regen, storm).
 */
export const BUSINESSES = {
  ijskraam: {
    name: 'IJskraam “De Koude Kunst”',
    short: 'IJskraam',
    icon: '🍦',
    rank: 1,
    price: 1200,
    capacity: 350,
    cover: 240,
    fee: 0.25,
    staff: 30,
    revenue: 100,
    weather: { zon: 1.4, bewolkt: 0.9, regen: 0.5, storm: 0.3 },
    where: 'op het strand',
    blurb: 'Een vrolijk kraampje met een reuzenijsje op het dak. Elke bol is een goed excuus voor een kassabonnetje.',
    upgrades: {
      cap: { name: 'Extra vriezer', text: 'meer ijs, meer omzet' },
      fee: { name: 'Vaste leverancier', text: 'scherpere inkoop, lagere commissie' },
      books: { name: 'Stempelkaart-administratie', text: 'elke bol netjes in de boeken' },
    },
  },
  surfschool: {
    name: 'Surfschool “Hang Ten”',
    short: 'Surfschool',
    icon: '🏄',
    rank: 2,
    price: 4500,
    capacity: 1000,
    cover: 650,
    fee: 0.22,
    staff: 100,
    revenue: 300,
    weather: { zon: 1.25, bewolkt: 1, regen: 0.5, storm: 0 },
    where: 'aan de waterkant van het strand',
    blurb: 'Lessen voor beginners, plankverhuur en heel veel natte handdoeken. Wie weet nu wat een les kost?',
    upgrades: {
      cap: { name: 'Meer surfplanken', text: 'meer cursisten per dag' },
      fee: { name: 'Sponsordeal', text: 'de commissie zakt een stuk' },
      books: { name: 'Digitale ledenlijst', text: 'iedere cursist staat erin' },
    },
  },
  paviljoen: {
    name: 'Strandpaviljoen “Zeezicht”',
    short: 'Strandpaviljoen',
    icon: '🍤',
    rank: 3,
    price: 15000,
    capacity: 2800,
    cover: 1800,
    fee: 0.19,
    staff: 290,
    revenue: 800,
    weather: { zon: 1.15, bewolkt: 1, regen: 0.9, storm: 0.6 },
    where: 'aan de rand van het strand',
    blurb: 'Een terras vol parasols. De garnalenkroketten gaan overal heen, de boekhouding ook.',
    upgrades: {
      cap: { name: 'Terras uitbreiden', text: 'tien tafels erbij' },
      fee: { name: 'Chef-kok contract', text: 'de keuken kost minder' },
      books: { name: 'Kassasysteem', text: 'elke kroket met bonnetje' },
    },
  },
  pretpark: {
    name: 'Waterpretpark “Plons!”',
    short: 'Pretpark',
    icon: '🎡',
    rank: 4,
    price: 36000,
    capacity: 7500,
    cover: 4800,
    fee: 0.16,
    staff: 700,
    revenue: 2100,
    weather: { zon: 1.3, bewolkt: 0.9, regen: 0.4, storm: 0.2 },
    where: 'in Havenstad',
    blurb: 'Glijbanen, een reuzenrad en een kassa die nooit stilstaat. Niemand telt de bezoekers.',
    upgrades: {
      cap: { name: 'Nieuwe glijbaan', text: 'rijen tot aan de poort' },
      fee: { name: 'Seizoenskaarten', text: 'vaste klanten, lagere commissie' },
      books: { name: 'Boekhoudafdeling', text: 'drie accountants met koffie' },
    },
  },
};

export const UPGRADE_IDS = ['cap', 'fee', 'books'];
export const MAX_LEVEL = 3;
/** Price of each upgrade level as a share of the business price. */
export const UPGRADE_COST = { cap: [0.4, 0.8, 1.4], fee: [0.3, 0.6, 1.0], books: [0.25, 0.5, 0.9] };
export const UPGRADE_LABEL = {
  cap: (b) => `Capaciteit en dekking +30% per niveau (nu +${b * 30}%)`,
  fee: (b) => `Commissie −3 procentpunt per niveau (nu −${b * 3})`,
  books: (b) => `Dekking +25% per niveau (nu +${b * 25}%)`,
};

export const FEE_FLOOR = 0.08;
export const REP_CAPACITY = 0.4; // at reputation 100: +40% capacity and cover
export const REP_REVENUE = 0.6; // at reputation 100: +60% honest takings
export const KEEP_DAYS = 7; // days of washing the taxman looks at

// ------------------------------------------------------------------ bank and ATM
/** Unlaundered euros per day the bank accepts as a deposit: phone banking is watched closer than the ATM. */
export const DIRTY_DEPOSIT = { phone: { base: 400, perRank: 150 }, atm: { base: 1000, perRank: 400 } };
/** Euros per day you can withdraw at the ATM. */
export const ATM_WITHDRAW = { base: 1500, perRank: 500 };

// ------------------------------------------------------------------ carrying dirty cash
/** From this much dirty cash in your pocket the guards start to frown (grows with rank). */
export const CARRY = { base: 1200, perRank: 500, rate: 0.012, maxLevel: 2 };

// ------------------------------------------------------------------ the taxman
export const AUDIT = {
  baseChance: 0.03, // per day per business
  suspChance: 0.22, // extra chance at suspicion 100
  inspectionDay: 0.12, // extra on a day with the event "inspectie"
  cooldown: 4, // days between two visits at the same business
  graceDays: 1, // a business is audited at the earliest the day after you bought it
  tolerance: 0.15, // a week up to 15% above the cover gets a warning, not a fine
  fineShare: 0.8, // fine = this share of the excess
  minFine: 100,
  visitHours: [10, 15], // the visit starts between these hours
  stayHours: 2, // the inspector stays this long
  bribeBase: 0.65,
  absentSurcharge: 1.25,
};

export const INSPECTORS = [
  { name: 'Meneer Rekenmeester', mii: 'Akira', quip: 'Ik tel alles twee keer, ook de hoorntjes.' },
  { name: 'Mevrouw Aftrekpost', mii: 'Ai', quip: 'Ik heb vandaag een heel goed humeur voor boekhouden.' },
  { name: 'Inspecteur Kleingeld', mii: 'Hiroshi', quip: 'Het zit hem in de kleine bedragen.' },
  { name: 'Mevrouw Btw', mii: 'Keiko', quip: 'Mag ik uw kasboek even lenen? Dank u.' },
];
