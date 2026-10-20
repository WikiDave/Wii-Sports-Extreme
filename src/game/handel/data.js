// Data of the street sellers ("verkopers") and the suppliers ("leveranciers") of feature "handel".
// Pure data, no DOM, no three.js: everything here can be read by the Node tests.

/** FAVORITE_COLORS index of the shirt all street sellers wear (Oranje), so you can spot them. */
export const SHIRT = 1;

/** Hours (clock) in which the sellers work, and the simulation step in game minutes. */
export const SHIFT = [9, 22];
export const STEP = 10;
/** Traffic during the day: [from hour, to hour, factor]. Lunch and the evening are busy. */
export const HOURS = [
  [9, 11, 0.6],
  [11, 14, 1.2],
  [14, 17, 0.9],
  [17, 20, 1.25],
  [20, 22, 0.7],
];

/** What a seller carries and holds at most. */
export const STOCK_MAX = 40;
/** How much money a seller carries before he stops selling (more at a higher rank, where goods are worth more). */
export const pouchCap = (rank) => 200 + 400 * Math.max(1, rank);
/** Passers-by pay this share of what a regular customer with an appointment pays. */
export const STREET_PRICE = 0.78;
/** Money sent to the bank by phone costs this share (collecting in person is free). */
export const BANK_FEE = 0.05;

/**
 * Routes: where a seller can work. traffic = customers per hour in the busiest hour factor 1,
 * wealth = price level, risk = how closely the guards look, likes = effects that sell best there.
 * stars are only for the display (1-5).
 */
export const ROUTES = {
  strand: { name: 'Strand-Zuid', rank: 0, traffic: 0.65, wealth: 0.92, risk: 0.6, likes: ['fris', 'zoet', 'tropisch'], stars: { drukte: 4, prijs: 2, risico: 2 }, text: 'Veel badgasten met kleine budgetten. Weinig bewakers.' },
  haven: { name: 'Havenstad', rank: 0, traffic: 0.9, wealth: 1, risk: 1.3, likes: ['bruisend', 'ijzig', 'fris'], stars: { drukte: 5, prijs: 3, risico: 4 }, text: 'De drukste plek, maar de bewaking loopt hier rond.' },
  kaap: { name: 'Vuurtorenkaap', rank: 2, traffic: 0.38, wealth: 1.08, risk: 0.3, likes: ['verkoelend', 'zonnig', 'tropisch'], stars: { drukte: 2, prijs: 3, risico: 1 }, text: 'Rustig en veilig: weinig klanten, maar ze betalen netjes.' },
  heuvels: { name: 'Resort-heuvels', rank: 3, traffic: 0.7, wealth: 1.3, risk: 1, likes: ['zonnig', 'giechel', 'ijzig'], stars: { drukte: 3, prijs: 5, risico: 3 }, text: 'Rijke hotelgasten die graag extra betalen voor iets bijzonders.' },
};
export const ROUTE_IDS = Object.keys(ROUTES);

/** How the day's event changes the number of customers. */
export const EVENT_TRAFFIC = { rustig: 1, feest: 1.4, inspectie: 0.8, zomerdag: 1.2 };

/**
 * The people you can hire. skills 1-5: prijs (price sense), disc (discretion), tempo (speed);
 * cut = percentage of every sale they keep; loyalty at the start (0-100); rank = from which
 * rank they answer your call. seed gives their (fixed) look.
 */
export const CANDIDATES = [
  { id: 'ren', name: 'Ren', gender: 'm', seed: 1101, rank: 1, prijs: 2, disc: 4, tempo: 2, cut: 12, loyalty: 70, line: 'Rustig en onopvallend. Zegt nooit meer dan nodig.' },
  { id: 'haru', name: 'Haru', gender: 'f', seed: 1207, rank: 1, prijs: 3, disc: 2, tempo: 3, cut: 15, loyalty: 55, line: 'Vrolijk en vlot, maar valt wel op in een menigte.' },
  { id: 'shin', name: 'Shin', gender: 'm', seed: 1313, rank: 1, prijs: 1, disc: 1, tempo: 2, cut: 10, loyalty: 35, line: 'Werkt voor bijna niks. Je telt de kas liever na.' },
  { id: 'keiko', name: 'Keiko', gender: 'f', seed: 1427, rank: 1, prijs: 2, disc: 3, tempo: 3, cut: 14, loyalty: 85, line: 'Betrouwbaar. Kent halve strand bij de voornaam.' },
  { id: 'akira', name: 'Akira', gender: 'm', seed: 1531, rank: 2, prijs: 4, disc: 3, tempo: 3, cut: 20, loyalty: 60, line: 'Slimme prijzenjager die elke klant leest als een menukaart.' },
  { id: 'miyu', name: 'Miyu', gender: 'f', seed: 1643, rank: 2, prijs: 3, disc: 4, tempo: 2, cut: 18, loyalty: 75, line: 'Fluistert, glimlacht en is weg. Heel discreet.' },
  { id: 'hiroshi', name: 'Hiroshi', gender: 'm', seed: 1759, rank: 2, prijs: 2, disc: 2, tempo: 5, cut: 22, loyalty: 50, line: 'De snelste van het eiland. Hij rent zelfs als hij staat.' },
  { id: 'yoko', name: 'Yoko', gender: 'f', seed: 1861, rank: 3, prijs: 5, disc: 3, tempo: 3, cut: 26, loyalty: 65, line: 'De beste onderhandelaar van Wahoe. Dat laat ze wel betalen.' },
  { id: 'tatsu', name: 'Tatsu', gender: 'm', seed: 1979, rank: 3, prijs: 3, disc: 5, tempo: 3, cut: 24, loyalty: 70, line: 'Een schaduw in een strandshirt. Niemand ziet hem, niemand kent hem.' },
  { id: 'ai', name: 'Ai', gender: 'f', seed: 2087, rank: 3, prijs: 4, disc: 4, tempo: 4, cut: 28, loyalty: 45, line: 'Groot talent, maar ook gulzig. Houd haar tevreden.' },
  { id: 'shouta', name: 'Shouta', gender: 'm', seed: 2191, rank: 4, prijs: 5, disc: 4, tempo: 4, cut: 30, loyalty: 80, line: 'Meesterverkoper. Duur, maar elke cent waard.' },
  { id: 'rin', name: 'Rin', gender: 'f', seed: 2297, rank: 4, prijs: 4, disc: 5, tempo: 5, cut: 27, loyalty: 90, line: 'Onverstoorbaar en loyaal. Een legende op de heuvels.' },
].map((c, i) => ({ ...c, num: i + 1 }));

export const candidateById = (id) => CANDIDATES.find((c) => c.id === id) ?? null;

/** Price of hiring someone: better and more loyal people cost more. */
export const hireFee = (c) => Math.round((50 + 26 * (c.prijs + c.disc + c.tempo) + 2 * c.loyalty) / 10) * 10;

// ------------------------------------------------------------------------------ suppliers

/** Delivery is only done in these clock minutes (07:00-21:00). */
export const WORK = [7 * 60, 21 * 60];
/** Orders under this value pay a small delivery fee. */
export const FREE_DELIVERY_FROM = 40;
export const DELIVERY_FEE = 4;
/** Rush delivery: cuts the travel time to 40% (at least 30 minutes) for a share of the order. */
export const RUSH_SHARE = [0.3, 0.15]; // normal, from relationship level 2
export const RUSH_TIME = 0.4;
/** Extra travel minutes by weather, and when the inspectors are about. */
export const WEATHER_DELAY = { zon: 0, bewolkt: 0, regen: 30, storm: 90 };
export const INSPECTION_DELAY = 60;

export const TIERS = {
  standaard: { name: 'Standaard', mult: 1, bonus: 0, extra: 0, text: 'Gewone kwaliteit.' },
  vers: { name: 'Vers', mult: 1.25, bonus: 0.02, extra: 0, text: '+2% kwaliteit per stuk in je volgende batch.' },
  top: { name: 'Topkwaliteit', mult: 1.6, bonus: 0.04, extra: 30, text: '+4% kwaliteit per stuk in je volgende batch.' },
};
export const TIER_IDS = Object.keys(TIERS);
/** A batch never gets more than this extra quality from fresh ingredients. */
export const MAX_FRESH_BONUS = 0.12;

/** Relationship: points needed per level, and what each level gives. */
export const LEVELS = [
  { name: 'Onbekend', need: 0, discount: 0 },
  { name: 'Bekende', need: 40, discount: 0.03 },
  { name: 'Vaste klant', need: 120, discount: 0.06 },
  { name: 'Vriend aan huis', need: 300, discount: 0.09 },
  { name: 'Beste maat', need: 700, discount: 0.12 },
];
export const LEVEL_PERKS = [
  'Nog geen voordeel.',
  'Verse waar bestellen en 3% korting.',
  '6% korting en spoedbezorging voor de helft.',
  '9% korting, topkwaliteit en de prijs van morgen.',
  '12% korting en grotere bestellingen.',
];
/** Largest order (units) per relationship level. */
export const maxOrder = (level) => 40 + 20 * level;

/** Discount for the number of units in one order. */
export const BULK = [
  [100, 0.14],
  [50, 0.1],
  [25, 0.06],
  [10, 0.03],
];

/**
 * The suppliers. factor = their price against the market of Havenstad; goods = what they sell
 * (multiplier per good); minUnits = smallest order; base = travel minutes; blocked = weather in
 * which they do not deliver; out = chance per day that a good is sold out; tiers = quality they
 * offer; topLevel = relationship level needed for topkwaliteit.
 */
export const SUPPLIERS = {
  pim: {
    name: 'Boer Pim', title: 'Fruit van de heuvel', gender: 'm', seed: 3101, rank: 0, icon: '🍋',
    factor: 0.72, minUnits: 10, base: 90, goods: { citroen: 1, citroenrasp: 1, bosbes: 1.1 },
    tiers: ['standaard', 'vers'], topLevel: 9, blocked: ['storm'], out: 0.08,
    line: 'Rechtstreeks van de boom in de kist!',
  },
  suus: {
    name: 'Suikertante Suus', title: 'Alles in bulk', gender: 'f', seed: 3203, rank: 0, icon: '🍬',
    factor: 0.58, minUnits: 20, base: 210, goods: { suiker: 1, munt: 0.95, vanille: 1 },
    tiers: ['standaard', 'vers'], topLevel: 9, blocked: [], out: 0.18,
    line: 'Hoe meer je neemt, hoe zoeter de prijs, schat.',
  },
  koko: {
    name: 'Koko van de Kust', title: 'Exotisch, per boot', gender: 'f', seed: 3307, rank: 1, icon: '🥥',
    factor: 0.78, minUnits: 5, base: 150, goods: { kokos: 1, vanille: 1.05, munt: 1.1, chili: 1 },
    tiers: ['standaard', 'vers', 'top'], topLevel: 3, blocked: ['storm', 'regen'], out: 0.15,
    line: 'Mijn boot vaart alleen als de zee glimlacht.',
  },
  ivo: {
    name: 'IJsboer Ivo', title: 'Melk uit de koelcel', gender: 'm', seed: 3413, rank: 2, icon: '🥛',
    factor: 0.8, minUnits: 8, base: 120, goods: { melk: 1, vanille: 1.1, suiker: 1.15 },
    tiers: ['standaard', 'vers', 'top'], topLevel: 3, blocked: ['storm'], out: 0.1,
    line: 'Koud blijven, dat is mijn hele geheim.',
  },
  sjaak: {
    name: 'Sjaak de Sluiper', title: 'Snel en duur', gender: 'm', seed: 3517, rank: 2, icon: '🕶️',
    factor: 1.12, minUnits: 3, base: 35, goods: { chili: 1, vanille: 1, kokos: 1.05, bosbes: 1.1, munt: 1.1, melk: 1.1, citroen: 1.2, citroenrasp: 1.1 },
    tiers: ['vers', 'top'], topLevel: 0, blocked: [], out: 0.45, flat: true,
    line: 'Ik heb niks gezegd. Jij hebt niks gehoord.',
  },
};
export const SUPPLIER_IDS = Object.keys(SUPPLIERS);

/** Price moods per good: weather ('zon', 'bewolkt', 'regen', 'storm') and events ('feest', 'zomerdag', ...). */
export const MOOD = {
  citroen: { zon: 0.92, regen: 1.08, storm: 1.22 },
  citroenrasp: { regen: 1.05, storm: 1.15 },
  kokos: { regen: 1.1, storm: 1.25 },
  melk: { zomerdag: 1.2, feest: 1.1 },
  suiker: { feest: 1.12 },
  munt: { zomerdag: 1.15 },
  bosbes: { zon: 0.95 },
  chili: {},
  vanille: { feest: 1.08 },
};
/** The goods that can be ordered: the base goods and ingredients of the market. */
export const ORDERABLE = ['citroen', 'suiker', 'munt', 'kokos', 'citroenrasp', 'bosbes', 'chili', 'vanille', 'melk'];
