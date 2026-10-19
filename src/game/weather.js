// Weather and daily events, derived from the day number (no extra save data, and the same
// on every device). Pure logic.

export const WEATHER = {
  zon: { name: 'Zonnig', icon: '☀', price: 1.1, view: 1, skip: 0, sun: 1, fog: 1, rain: 0, clouds: 0.25 },
  bewolkt: { name: 'Bewolkt', icon: '☁', price: 1, view: 1, skip: 0.1, sun: 0.6, fog: 0.8, rain: 0, clouds: 0.8 },
  regen: { name: 'Regen', icon: '🌧', price: 0.85, view: 0.8, skip: 0.4, sun: 0.4, fog: 0.5, rain: 1, clouds: 1 },
  storm: { name: 'Storm', icon: '⛈', price: 0.7, view: 0.6, skip: 0.8, sun: 0.25, fog: 0.3, rain: 2, clouds: 1 },
};

export const EVENTS = {
  rustig: { name: 'Rustige dag', text: '', price: 1, heat: 0 },
  feest: { name: 'Strandfeest', text: 'Er is een strandfeest: iedereen koopt gul (+20%).', price: 1.2, heat: 0 },
  inspectie: { name: 'Inspectie', text: 'De bewaking houdt vandaag een inspectie: de meter stijgt met 1.', price: 1, heat: 1 },
  zomerdag: { name: 'Hittegolf', text: 'Het is bloedheet: koude drankjes vliegen weg (+10%).', price: 1.1, heat: 0 },
};

/** Small deterministic hash of integers to 0..1. */
export function hash01(...n) {
  let h = 2166136261;
  for (const x of n) {
    h = Math.imul(h ^ (x | 0), 16777619);
    h ^= h >>> 15;
    h = Math.imul(h, 2246822519);
  }
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** Weather and event of a day. Day 1 is always sunny and quiet. */
export function dayInfo(day) {
  if (day <= 1) return { weather: 'zon', event: 'rustig' };
  const w = hash01(day, 7);
  const weather = w < 0.55 ? 'zon' : w < 0.78 ? 'bewolkt' : w < 0.95 ? 'regen' : 'storm';
  const e = hash01(day, 13);
  let event = e < 0.6 ? 'rustig' : e < 0.78 ? 'feest' : e < 0.9 ? 'inspectie' : 'zomerdag';
  if (event === 'zomerdag' && weather !== 'zon') event = 'rustig';
  return { weather, event };
}

/** Price factor of weather and event together. */
export function priceFactor(day) {
  const d = dayInfo(day);
  return WEATHER[d.weather].price * EVENTS[d.event].price;
}

/** Whether a customer stays home today because of the weather (per customer, per day). */
export function staysHome(day, customerId) {
  const skip = WEATHER[dayInfo(day).weather].skip;
  return skip > 0 && hash01(day, [...customerId].reduce((a, c) => a + c.charCodeAt(0), 0)) < skip;
}

/** Factor on the guards' view range. */
export const viewFactor = (day) => WEATHER[dayInfo(day).weather].view;
