// Tests of feature "handel": street sellers, suppliers, delivery crate and fresh ingredients.
import assert from 'node:assert/strict';
import { Game, DAY_START } from '../src/game/state.js';
import { buy, parseItem } from '../src/game/economy.js';
import { startJob } from '../src/game/stations.js';
import { dayInfo } from '../src/game/weather.js';
import { stockFree } from '../src/game/empire.js';
import { CANDIDATES, SUPPLIERS, ROUTES, STOCK_MAX, STEP, BANK_FEE, hireFee, pouchCap, MAX_FRESH_BONUS } from '../src/game/handel/data.js';
import { handelState, notify, unreadCount, markRead, dismiss } from '../src/game/handel/store.js';
import { clockAt, now, workTime, whenText, DAY_LENGTH, hourFactor, onShift } from '../src/game/handel/time.js';
import * as S from '../src/game/handel/sellers.js';
import { simulate, catchChance, customersPerStep, MAX_CATCHUP } from '../src/game/handel/sim.js';
import * as P from '../src/game/handel/suppliers.js';
import { addFresh, consumeFresh, bumpKey, watchJobs, newMemo, clampFresh } from '../src/game/handel/freshness.js';

const LIM = 'p:limonade:fris:100';
const SAFE = { catch: false }; // the guards leave the sellers alone: for tests of the sales themselves
const SNOEP = 'p:snoep:zoet+bruisend:100';

/** A game at some rank with plenty of money and room. */
function mk({ xp = 300, cash = 20000, props = ['hut', 'loods'], day = 1 } = {}) {
  const g = new Game(null);
  g.state.xp = xp;
  g.state.cash = cash;
  g.state.properties = props;
  g.state.day = day;
  g.state.minutes = DAY_START;
  return g;
}
/** Plays whole shifts: sets the clock to each 10-minute step and simulates. */
function playDay(g, env = {}, events = []) {
  for (let m = 0; m < DAY_LENGTH; m += STEP) {
    g.state.minutes = DAY_START + m;
    events.push(...simulate(g, env));
  }
  g.state.minutes = DAY_START + DAY_LENGTH - 1;
  return events;
}
const nextDay = (g) => {
  g.state.day += 1;
  g.state.minutes = DAY_START;
};
const dayWith = (pred, from = 2) => {
  for (let d = from; d < 400; d++) if (pred(dayInfo(d), d)) return d;
  throw new Error('no such day');
};

// ------------------------------------------------------------------ time
{
  const g = mk({ day: 3 });
  g.state.minutes = 14 * 60;
  const c = clockAt(now(g.state));
  assert.equal(c.day, 3);
  assert.equal(c.minutes, 14 * 60);
  assert.equal(c.hour, 14);
  assert.equal(clockAt(DAY_LENGTH * 2 + 1320 - 1).day, 3); // last minute of day 3
  assert.equal(clockAt(DAY_LENGTH * 3).day, 4);
  assert.equal(clockAt(DAY_LENGTH * 3).minutes, DAY_START);
  assert.equal(clockAt(DAY_LENGTH * 3 - 60).hour, 3); // 03:00 after midnight
  // couriers: before 07:00 wait for 07:00, after 21:00 wait for tomorrow 07:00
  const day1 = (h, m = 0) => (h * 60 + m - DAY_START);
  assert.equal(workTime(day1(6, 0)), day1(7, 0));
  assert.equal(workTime(day1(12, 0)), day1(12, 0));
  assert.equal(workTime(day1(21, 0)), DAY_LENGTH + 60); // day 2, 07:00
  assert.equal(workTime(day1(26, 0)), DAY_LENGTH + 60); // 02:00 at night -> day 2, 07:00
  assert.equal(clockAt(workTime(day1(23, 30))).hour, 7);
  assert.equal(whenText(day1(14, 30), 1), 'vandaag 14:30');
  assert.equal(whenText(DAY_LENGTH + 60, 1), 'morgen 07:00');
  assert.ok(whenText(DAY_LENGTH * 3, 1).startsWith('dag 4'));
  assert.equal(hourFactor(8), 0);
  assert.ok(hourFactor(12) > hourFactor(10));
  assert.equal(onShift(9), true);
  assert.equal(onShift(22), false);
}

// ------------------------------------------------------------------ state and inbox
{
  const g = mk();
  const h = handelState(g);
  assert.equal(h.sellers.length, 0);
  assert.equal(handelState(g), h); // same object
  assert.equal(g.state.ext.handel, h);
  assert.doesNotThrow(() => JSON.stringify(g.state));
  notify(g, { kind: 'leeg', who: 'ren', text: 'Leeg!' });
  notify(g, { kind: 'levering', who: 'pim', text: 'Er is post.' });
  assert.equal(unreadCount(g), 2);
  assert.equal(unreadCount(g, ['leeg']), 1);
  markRead(g, ['leeg']);
  assert.equal(unreadCount(g), 1);
  dismiss(g, h.inbox[0].id);
  assert.equal(h.inbox.length, 1);
  for (let i = 0; i < 40; i++) notify(g, { kind: 'x', who: '', text: `m${i}` });
  assert.ok(h.inbox.length <= 24);
  assert.equal(h.inbox[0].text, 'm39'); // newest first
  // repairing a broken save
  g.state.ext.handel = { sellers: [{ id: 'bestaat-niet' }, { id: 'ren' }], clock: 'x' };
  const fixed = handelState(g);
  assert.equal(fixed.sellers.length, 1);
  assert.equal(fixed.sellers[0].loyalty, CANDIDATES[0].loyalty);
  assert.deepEqual(fixed.crate, []);
  assert.ok(Number.isFinite(fixed.clock));
}

// ------------------------------------------------------------------ hiring
{
  const g0 = mk({ xp: 0 });
  assert.equal(S.sellerLimit(g0), 0);
  assert.equal(S.hireSeller(g0, 'ren').ok, false);
  assert.ok(S.hireBlocker(g0, 'ren').includes('rang'));
  assert.deepEqual(S.recruits(g0), []);

  const g = mk({ xp: 60, props: ['hut'], cash: 1000 });
  assert.equal(g.rank, 1);
  assert.equal(S.sellerLimit(g), 1);
  const names = S.recruits(g).map((c) => c.id);
  assert.deepEqual(names.sort(), ['haru', 'keiko', 'ren', 'shin']);
  assert.ok(S.hireBlocker(g, 'akira').includes('rang')); // rank 2 candidate
  const fee = hireFee(CANDIDATES.find((c) => c.id === 'ren'));
  assert.ok(fee > 100 && fee < 700);
  const r = S.hireSeller(g, 'ren');
  assert.equal(r.ok, true);
  assert.equal(g.state.cash, 1000 - fee);
  assert.equal(r.seller.zone, null);
  assert.equal(S.hireSeller(g, 'ren').ok, false); // already hired
  assert.equal(S.hireSeller(g, 'haru').ok, false); // limit 1 at rank 1 with only the hut
  assert.ok(!S.recruits(g).some((c) => c.id === 'ren'));
  g.state.properties.push('loods');
  assert.equal(S.sellerLimit(g), 2);
  g.state.cash = 10;
  assert.ok(S.hireBlocker(g, 'haru').includes('€'));
  g.state.cash = 5000;
  assert.equal(S.hireSeller(g, 'haru').ok, true);
  // rank, route
  assert.equal(S.setZone(g, 'ren', 'strand').ok, true);
  assert.equal(S.setZone(g, 'ren', 'heuvels').ok, false); // rank 3 route
  assert.equal(S.setZone(g, 'ren', 'nergens').ok, false);
  assert.equal(S.setZone(g, 'ren', null).ok, true);
  assert.equal(S.setZone(g, 'ghost', 'strand').ok, false);
  // many candidates: only six, rotating with the day
  const big = mk({ xp: 9000, props: ['hut', 'loods', 'villa', 'grot'] });
  const a = S.recruits(big).map((c) => c.id);
  assert.equal(a.length, 6);
  big.state.day = 2;
  assert.notDeepEqual(S.recruits(big).map((c) => c.id), a);
  assert.equal(S.sellerLimit(big), 3 + 3);
}

// ------------------------------------------------------------------ stock
{
  const g = mk({ xp: 300 });
  g.state.inventory[LIM] = 30;
  g.state.inventory[SNOEP] = 30;
  g.state.inventory.citroen = 5;
  S.hireSeller(g, 'keiko');
  assert.equal(S.giveStock(g, 'keiko', 'citroen', 1).ok, false); // not a product
  assert.equal(S.giveStock(g, 'keiko', LIM, 25).n, 25);
  assert.equal(g.state.inventory[LIM], 5);
  assert.equal(S.giveStock(g, 'keiko', SNOEP, 100).n, STOCK_MAX - 25); // carrying capacity
  assert.equal(S.giveStock(g, 'keiko', SNOEP, 1).ok, false);
  assert.equal(S.stockCount(S.sellerById(g, 'keiko')), STOCK_MAX);
  assert.equal(S.giveStock(g, 'keiko', 'p:ijs:ijzig:100', 1).ok, false); // you have none
  // take back: limited by the free room in your stock
  g.state.inventory[LIM] = 0;
  delete g.state.inventory[LIM];
  const free0 = stockFree(g.state);
  assert.equal(S.takeStock(g, 'keiko', LIM, 10).n, 10);
  assert.equal(g.state.inventory[LIM], 10);
  assert.equal(stockFree(g.state), free0 - 10);
  g.state.properties = ['hut']; // a small stock: only 40 - used
  const used = Object.values(g.state.inventory).reduce((a, b) => a + b, 0);
  g.state.inventory.suiker = 40 - used - 3;
  const moved = S.takeStock(g, 'keiko', LIM, 15);
  assert.equal(moved.n, 3); // only 3 fit
  assert.equal(S.takeStock(g, 'keiko', LIM, 5).ok, false); // full now
  assert.equal(S.takeStock(g, 'keiko', 'p:ijs:ijzig:100', 1).ok, false);
}

// ------------------------------------------------------------------ selling over time
{
  const g = mk({ xp: 300 });
  g.state.inventory[LIM] = 100;
  S.hireSeller(g, 'keiko');
  const s = S.sellerById(g, 'keiko');
  // Nothing happens without a route, or without goods, or outside the shift.
  S.giveStock(g, 'keiko', LIM, 40);
  g.state.minutes = 12 * 60;
  assert.deepEqual(simulate(g).filter((e) => e.type === 'sale'), []);
  S.setZone(g, 'keiko', 'strand');
  assert.equal(handelState(g).clock, now(g.state)); // caught up even with no work done
  g.state.minutes = 5 * 60 + 40; // not possible in game, but before the shift
  // (the clock cannot run backwards: just check the shift boundaries through sale events)
  const h = handelState(g);
  const stock0 = S.stockCount(s);
  g.state.minutes = 12 * 60 + 300; // five hours of work in one call (17:00)
  const ev = simulate(g);
  const sales = ev.filter((e) => e.type === 'sale');
  assert.ok(sales.length > 5, `${sales.length} sale events`);
  assert.ok(ev.every((e) => e.seller === 'keiko'));
  const units = sales.reduce((a, e) => a + e.units, 0);
  const money = sales.reduce((a, e) => a + e.money, 0);
  assert.equal(stock0 - S.stockCount(s), units);
  assert.equal(s.sold, units);
  assert.equal(s.pouch, money);
  assert.equal(s.earned, money);
  assert.ok(money / units > 5 && money / units < 40, `€${money / units} per unit`);
  assert.equal(s.today.sold, units);
  assert.equal(h.clock, now(g.state));
  assert.ok(Number.isInteger(s.pouch));

  // Deterministic: the same start gives the same result, however it is cut into calls.
  const make = () => {
    const x = mk({ xp: 300 });
    x.state.inventory[LIM] = 100;
    S.hireSeller(x, 'keiko');
    S.giveStock(x, 'keiko', LIM, 40);
    S.setZone(x, 'keiko', 'haven');
    x.state.minutes = 9 * 60;
    handelState(x).clock = now(x.state);
    return x;
  };
  const A = make();
  A.state.minutes = 20 * 60;
  simulate(A);
  const B = make();
  for (let m = 9 * 60 + 7; m <= 20 * 60; m += 7) {
    B.state.minutes = Math.min(m, 20 * 60);
    simulate(B);
  }
  B.state.minutes = 20 * 60;
  simulate(B);
  assert.equal(S.sellerById(A, 'keiko').pouch, S.sellerById(B, 'keiko').pouch);
  assert.deepEqual(S.sellerById(A, 'keiko').stock, S.sellerById(B, 'keiko').stock);
  assert.ok(S.sellerById(A, 'keiko').pouch > 0);
  assert.equal(A.state.heat, B.state.heat);
}

// ------------------------------------------------------------------ weather, routes, speed
{
  const daysWhere = (pred, n) => {
    const out = [];
    for (let d = 2; out.length < n && d < 600; d++) if (pred(dayInfo(d))) out.push(d);
    return out;
  };
  const zonDays = daysWhere((i) => i.weather === 'zon' && i.event === 'rustig', 8);
  const stormDays = daysWhere((i) => i.weather === 'storm' && i.event === 'rustig', 8);
  const feestDays = daysWhere((i) => i.weather === 'zon' && i.event === 'feest', 8);
  // One full shift of a seller on `route` on each of the days; returns the units sold in total.
  const unitsOn = (id, route, days, key = LIM) => {
    let units = 0;
    for (const day of days) {
      const g = mk({ xp: 9000, day, props: ['hut', 'loods', 'villa'], cash: 99999 });
      g.state.inventory[key] = 9999;
      S.hireSeller(g, id);
      S.setZone(g, id, route);
      S.sellerById(g, id).loyalty = 100;
      S.giveStock(g, id, key, STOCK_MAX);
      handelState(g).clock = now(g.state);
      units += playDay(g, SAFE).filter((e) => e.type === 'sale').reduce((a, e) => a + e.units, 0);
    }
    return units;
  };
  const sunny = unitsOn('keiko', 'strand', zonDays);
  const stormy = unitsOn('keiko', 'strand', stormDays);
  assert.ok(sunny > stormy * 2, `zon ${sunny} vs storm ${stormy}`);
  assert.ok(unitsOn('keiko', 'strand', feestDays) > sunny, 'a beach party sells more');
  // busier route and faster seller sell more
  const clk = { day: zonDays[0], hour: 12.5 };
  const per = (id, r) => customersPerStep(CANDIDATES.find((x) => x.id === id), ROUTES[r], clk);
  assert.ok(per('keiko', 'haven') > per('keiko', 'strand'));
  assert.ok(per('keiko', 'strand') > per('keiko', 'kaap'));
  assert.ok(per('hiroshi', 'strand') > per('shin', 'strand')); // tempo 5 against 2
  assert.ok(unitsOn('hiroshi', 'strand', zonDays) > unitsOn('shin', 'strand', zonDays));
  // the rich hills pay more per unit than the beach
  const unitMoney = (route) => {
    const g = mk({ xp: 9000, day: zonDays[0], props: ['hut', 'loods', 'villa'] });
    g.state.inventory[SNOEP] = 9999;
    S.hireSeller(g, 'akira');
    S.setZone(g, 'akira', route);
    S.giveStock(g, 'akira', SNOEP, 40);
    handelState(g).clock = now(g.state);
    const ev = playDay(g, SAFE).filter((e) => e.type === 'sale');
    return ev.reduce((a, e) => a + e.money, 0) / ev.reduce((a, e) => a + e.units, 0);
  };
  assert.ok(unitMoney('heuvels') > unitMoney('strand') * 1.2);
}

// ------------------------------------------------------------------ price sense, cut
{
  const zon = dayWith((i) => i.weather === 'zon' && i.event === 'rustig');
  const earn = (id) => {
    const g = mk({ xp: 9000, day: zon, props: ['hut', 'loods', 'villa'], cash: 99999 });
    g.state.inventory[SNOEP] = 9999;
    S.hireSeller(g, id);
    S.setZone(g, id, 'haven');
    handelState(g).clock = now(g.state);
    let money = 0;
    let units = 0;
    for (let i = 0; i < 5; i++) {
      S.giveStock(g, id, SNOEP, 40);
      for (const e of playDay(g, SAFE)) if (e.type === 'sale') (money += e.money), (units += e.units);
      S.collect(g, id);
      nextDay(g);
    }
    return { money, units, per: money / units };
  };
  // Yoko (price 5, cut 26) against Shin (price 1, cut 10): she gets more out of each customer, even after her cut
  const yoko = earn('yoko');
  const shin = earn('shin');
  assert.ok(yoko.per > shin.per, `${yoko.per} vs ${shin.per}`);
  assert.ok(S.priceCapture(CANDIDATES.find((c) => c.id === 'yoko')) > S.priceCapture(CANDIDATES.find((c) => c.id === 'shin')));
}

// ------------------------------------------------------------------ skimming and loyalty
{
  const zon = dayWith((i) => i.weather === 'zon' && i.event === 'rustig');
  const run = (loyalty) => {
    const g = mk({ xp: 300, day: zon });
    g.state.inventory[LIM] = 9999;
    S.hireSeller(g, 'keiko');
    S.setZone(g, 'keiko', 'haven');
    const s = S.sellerById(g, 'keiko');
    s.loyalty = loyalty;
    handelState(g).clock = now(g.state);
    const ev = [];
    for (let i = 0; i < 3; i++) {
      S.giveStock(g, 'keiko', LIM, 40);
      playDay(g, SAFE, ev);
      S.collect(g, 'keiko');
      s.loyalty = loyalty;
      nextDay(g);
    }
    return { s, ev };
  };
  const loyal = run(100);
  assert.equal(loyal.s.skimmed, 0);
  assert.ok(!loyal.ev.some((e) => e.type === 'skim'));
  const shady = run(5);
  assert.ok(shady.s.skimmed > 0, 'a low-loyalty seller skims');
  assert.ok(shady.ev.some((e) => e.type === 'skim'));
  assert.ok(S.skimChance(5) > S.skimChance(40) && S.skimChance(60) === 0 && S.skimChance(100) === 0);
  // collecting reports what was skimmed since the last collection
  const g = mk({ xp: 300 });
  S.hireSeller(g, 'keiko');
  const s = S.sellerById(g, 'keiko');
  s.pouch = 100;
  s.skimSince = 17;
  assert.equal(S.collect(g, 'keiko', 'hand').skimmed, 17);
  assert.equal(s.skimSince, 0);

  // a seller with a lot of money in his pouch and no loyalty leaves with it
  const q = mk({ xp: 300 });
  S.hireSeller(q, 'shin');
  const sq = S.sellerById(q, 'shin');
  S.setZone(q, 'shin', 'strand');
  sq.loyalty = 0;
  sq.pouch = 250;
  const quits = [];
  for (let i = 0; i < 30 && S.sellerById(q, 'shin'); i++) {
    q.state.day += 1;
    q.state.minutes = DAY_START + 60;
    quits.push(...simulate(q));
    if (S.sellerById(q, 'shin')) S.sellerById(q, 'shin').loyalty = 0;
  }
  const ev = quits.find((e) => e.type === 'quit');
  assert.ok(ev, 'he quits eventually');
  assert.equal(ev.took, 250);
  assert.ok(handelState(q).blocked.shin > q.state.day - 5);
  assert.equal(S.sellerById(q, 'shin'), null);
  // good days raise loyalty
  const l = mk({ xp: 300, day: zon });
  l.state.inventory[LIM] = 9999;
  S.hireSeller(l, 'haru');
  S.setZone(l, 'haru', 'strand');
  S.giveStock(l, 'haru', LIM, 40);
  handelState(l).clock = now(l.state);
  const before = S.sellerById(l, 'haru').loyalty;
  playDay(l);
  nextDay(l);
  l.state.minutes = DAY_START + 30;
  simulate(l);
  assert.equal(S.sellerById(l, 'haru').loyalty, before + 1);
  // tips and chats
  assert.equal(S.tip(l, 'haru', 20).ok, true);
  assert.equal(S.sellerById(l, 'haru').loyalty, before + 1 + 5);
  l.state.cash = 5;
  assert.equal(S.tip(l, 'haru', 50).ok, false);
  const lo = S.sellerById(l, 'haru').loyalty;
  assert.equal(S.meet(l, 'haru'), true);
  assert.equal(S.meet(l, 'haru'), false); // once a day
  assert.equal(S.sellerById(l, 'haru').loyalty, lo + 2);
}

// ------------------------------------------------------------------ heat and the guards
{
  const zon = dayWith((i) => i.weather === 'zon' && i.event === 'rustig');
  const heatAfter = (id) => {
    const g = mk({ xp: 1000, day: zon, props: ['hut', 'loods', 'villa'] });
    g.state.inventory[LIM] = 9999;
    S.hireSeller(g, id);
    S.setZone(g, id, 'haven');
    S.sellerById(g, id).loyalty = 100;
    S.giveStock(g, id, LIM, 40);
    handelState(g).clock = now(g.state);
    // the heat only sinks with the player's own time (tickHeat), so a whole shift adds up
    const ev = playDay(g, SAFE);
    return { heat: g.state.heat, units: ev.filter((e) => e.type === 'sale').reduce((a, e) => a + e.units, 0) };
  };
  const careless = heatAfter('shin'); // discretion 1
  const shadow = heatAfter('tatsu'); // discretion 5
  assert.ok(careless.heat > 0.5, `sales add heat: ${careless.heat}`);
  assert.ok(shadow.heat > 0 && shadow.units > 0);
  assert.ok(shadow.heat / shadow.units < careless.heat / careless.units / 2, 'a discreet seller causes less heat per sale');
  // the caught chance grows with the heat level, the route and guards nearby, and falls with discretion
  const g = mk({ xp: 300 });
  S.hireSeller(g, 'ren');
  S.hireSeller(g, 'haru');
  S.setZone(g, 'ren', 'haven');
  S.setZone(g, 'haru', 'haven');
  const ren = S.sellerById(g, 'ren');
  const haru = S.sellerById(g, 'haru');
  const p0 = catchChance(g, ren, 1);
  g.state.heat = 3.2;
  const p3 = catchChance(g, ren, 1);
  assert.ok(p3 > p0 * 5);
  assert.ok(catchChance(g, ren, 1, 2) > p3 * 3); // a guard walks by
  assert.ok(catchChance(g, ren, 1) < catchChance(g, haru, 1)); // Ren is more discreet
  S.setZone(g, 'ren', 'kaap');
  assert.ok(catchChance(g, ren, 1) < p3 / 2); // the quiet cape
  assert.equal(catchChance(g, { ...ren, zone: null }, 1), 0);
  const inspection = dayWith((i) => i.event === 'inspectie');
  assert.ok(catchChance(g, ren, inspection) > catchChance(g, ren, 1));

  // Heavy heat and guards on the spot: he is caught within a few days; stock and money are gone
  const c = mk({ xp: 300, day: zon });
  c.state.inventory[LIM] = 9999;
  S.hireSeller(c, 'shin');
  S.setZone(c, 'shin', 'haven');
  S.giveStock(c, 'shin', LIM, 40);
  c.state.heat = 4;
  handelState(c).clock = now(c.state);
  const evs = [];
  for (let i = 0; i < 3 && S.sellerById(c, 'shin'); i++) {
    playDay(c, { guardNear: () => 2 }, evs);
    c.state.heat = 4;
    nextDay(c);
  }
  const caught = evs.find((e) => e.type === 'caught');
  assert.ok(caught, 'caught');
  assert.equal(caught.zone, 'haven');
  assert.ok(caught.lost >= 0);
  assert.equal(S.sellerById(c, 'shin'), null);
  assert.ok(handelState(c).blocked.shin > c.state.day);
  assert.equal(c.state.inventory[LIM], 9999 - 40); // the confiscated stock does not come back
  assert.equal(S.hireSeller(c, 'shin').ok, false); // in hiding for a few days
  c.state.day = handelState(c).blocked.shin;
  assert.equal(S.hireBlocker(c, 'shin'), null);
}

// ------------------------------------------------------------------ empty, full, sharing, collecting
{
  const zon = dayWith((i) => i.weather === 'zon' && i.event === 'rustig');
  const g = mk({ xp: 300, day: zon });
  g.state.inventory[LIM] = 9999;
  S.hireSeller(g, 'haru');
  S.setZone(g, 'haru', 'haven');
  S.giveStock(g, 'haru', LIM, 6);
  handelState(g).clock = now(g.state);
  const ev = playDay(g);
  assert.equal(ev.filter((e) => e.type === 'empty').length, 1, 'one empty notice');
  assert.equal(S.stockCount(S.sellerById(g, 'haru')), 0);
  assert.ok(S.needs(g, S.sellerById(g, 'haru')).includes('leeg'));
  assert.equal(S.attentionCount(g), 1);
  // refilling clears the flag, so the next time he runs out you hear it again
  S.giveStock(g, 'haru', LIM, 40);
  assert.equal(S.sellerById(g, 'haru').flags.empty, false);
  // a full pouch stops him
  const s = S.sellerById(g, 'haru');
  s.pouch = pouchCap(g.rank);
  nextDay(g);
  const ev2 = playDay(g);
  assert.equal(ev2.filter((e) => e.type === 'full').length, 1);
  assert.ok(!ev2.some((e) => e.type === 'sale'));
  assert.ok(S.needs(g, s).includes('vol'));
  // collect in person: all cash, no fee; by phone: to the bank, minus the fee
  const cash0 = g.state.cash;
  const xp0 = g.state.xp;
  const r = S.collect(g, 'haru', 'hand');
  assert.equal(r.net, r.amount);
  assert.equal(g.state.cash, cash0 + r.amount);
  assert.ok(g.state.xp > xp0);
  assert.equal(s.pouch, 0);
  assert.equal(S.collect(g, 'haru', 'hand').ok, false);
  s.pouch = 1000;
  const bank0 = g.state.bank;
  const rb = S.collect(g, 'haru', 'bank');
  assert.equal(rb.fee, Math.round(1000 * BANK_FEE));
  assert.equal(g.state.bank, bank0 + 1000 - rb.fee);
  assert.equal(g.state.cash, cash0 + r.amount); // cash unchanged
  // all at once
  S.hireSeller(g, 'keiko');
  S.sellerById(g, 'keiko').pouch = 200;
  s.pouch = 100;
  const all = S.collectAll(g, 'bank');
  assert.equal(all.amount, 300);
  assert.equal(all.fee, 15);
  assert.equal(S.pouchTotal(g), 0);

  // two sellers on one route share the customers: each less, together more than one alone
  const run = (ids) => {
    const x = mk({ xp: 300, day: zon, cash: 99999, props: ['hut', 'loods', 'villa'] });
    x.state.inventory[LIM] = 99999;
    for (const id of ids) {
      S.hireSeller(x, id);
      S.setZone(x, id, 'strand');
      S.sellerById(x, id).loyalty = 100;
    }
    handelState(x).clock = now(x.state);
    let units = 0;
    for (let d = 0; d < 6; d++) {
      for (const id of ids) {
        S.giveStock(x, id, LIM, 40);
      }
      units += playDay(x, SAFE).filter((e) => e.type === 'sale').reduce((a, e) => a + e.units, 0);
      for (const id of ids) S.collect(x, id);
      nextDay(x);
      for (const s2 of handelState(x).sellers) s2.pouch = 0;
    }
    return units;
  };
  const alone = run(['keiko']);
  const duo = run(['keiko', 'haru']);
  assert.ok(duo > alone && duo < alone * 2, `alone ${alone}, duo ${duo}`);
}

// ------------------------------------------------------------------ sleeping and catching up
{
  const g = mk({ xp: 300, day: 2 });
  g.state.inventory[LIM] = 9999;
  S.hireSeller(g, 'keiko');
  S.setZone(g, 'keiko', 'strand');
  S.giveStock(g, 'keiko', LIM, 40);
  g.state.minutes = 10 * 60;
  handelState(g).clock = now(g.state);
  g.state.minutes = 12 * 60; // two hours played
  simulate(g);
  const sold1 = S.sellerById(g, 'keiko').sold;
  g.sleep(); // the rest of the day (until 04:00) passes at once
  assert.equal(g.state.day, 3);
  const ev = simulate(g);
  assert.ok(S.sellerById(g, 'keiko').sold > sold1, 'sold during the rest of the day');
  assert.ok(ev.some((e) => e.type === 'sale'));
  assert.equal(handelState(g).clock, now(g.state));
  g.state.minutes = DAY_START + 30; // the new day starts: yesterday is settled
  simulate(g);
  assert.equal(handelState(g).lastDay, 3);
  // an old save does not replay more than three days
  const old = mk({ xp: 300, day: 1 });
  old.state.inventory[LIM] = 9999;
  S.hireSeller(old, 'keiko');
  S.setZone(old, 'keiko', 'strand');
  S.giveStock(old, 'keiko', LIM, 40);
  old.state.day = 50;
  const ev3 = simulate(old);
  assert.ok(ev3.length > 0);
  assert.ok(handelState(old).clock >= now(old.state) - STEP);
  assert.ok(MAX_CATCHUP === 3 * DAY_LENGTH);
}

// ------------------------------------------------------------------ firing
{
  const g = mk({ xp: 300, props: ['hut', 'loods'] });
  g.state.inventory[LIM] = 20;
  S.hireSeller(g, 'keiko');
  S.giveStock(g, 'keiko', LIM, 20);
  S.sellerById(g, 'keiko').pouch = 140;
  const cash = g.state.cash;
  const r = S.fireSeller(g, 'keiko');
  assert.equal(r.ok, true);
  assert.equal(r.back, 20);
  assert.equal(r.pouch, 140);
  assert.equal(g.state.cash, cash + 140);
  assert.equal(g.state.inventory[LIM], 20);
  assert.equal(S.sellerById(g, 'keiko'), null);
  assert.equal(S.fireSeller(g, 'keiko').ok, false);
  // stock that does not fit stays with him (and is lost)
  const g2 = mk({ xp: 300, props: ['hut'] });
  g2.state.inventory[LIM] = 40;
  S.hireSeller(g2, 'keiko');
  S.giveStock(g2, 'keiko', LIM, 40);
  g2.state.inventory.suiker = 35;
  const r2 = S.fireSeller(g2, 'keiko');
  assert.equal(r2.back, 5);
  assert.equal(r2.left, 35);
}

// ------------------------------------------------------------------ suppliers: prices
{
  // deterministic and within bounds
  for (const sup of Object.keys(SUPPLIERS)) {
    for (const good of Object.keys(SUPPLIERS[sup].goods)) {
      for (let d = 1; d <= 30; d++) {
        const f = P.swing(d, sup, good);
        assert.ok(f >= 0.82 && f <= 1.18, `${sup} ${good} ${d}: ${f}`);
        assert.equal(f, P.swing(d, sup, good));
        assert.equal(P.unitPriceOn(d, sup, good, 'standaard', 0), P.unitPriceOn(d, sup, good, 'standaard', 0));
      }
    }
  }
  // it drifts: neighbouring days are closer than random days
  let step = 0;
  let far = 0;
  for (let d = 1; d < 60; d++) {
    step += Math.abs(P.swing(d + 1, 'pim', 'citroen') - P.swing(d, 'pim', 'citroen'));
    far += Math.abs(P.swing(d + 17, 'pim', 'citroen') - P.swing(d, 'pim', 'citroen'));
  }
  assert.ok(step < far, `smooth: ${step} < ${far}`);
  // not the same on every day
  const prices = new Set();
  for (let d = 1; d <= 20; d++) prices.add(P.unitPriceOn(d, 'suus', 'suiker').toFixed(3));
  assert.ok(prices.size > 5);
  // wholesale is cheaper than the market, and tiers and relationship change the price
  const day = 4;
  assert.ok(P.unitPriceOn(day, 'suus', 'suiker') < P.marketPrice('suiker'));
  assert.ok(P.unitPriceOn(day, 'pim', 'citroen', 'vers') > P.unitPriceOn(day, 'pim', 'citroen', 'standaard'));
  assert.ok(P.unitPriceOn(day, 'pim', 'citroen', 'standaard', 4) < P.unitPriceOn(day, 'pim', 'citroen', 'standaard', 0) * 0.9);
  // weather moods
  const stormDay = dayWith((i) => i.weather === 'storm');
  const sunDay = dayWith((i) => i.weather === 'zon' && i.event === 'rustig');
  assert.ok(P.mood('citroen', stormDay) > P.mood('citroen', sunDay));
  const hot = dayWith((i) => i.event === 'zomerdag');
  assert.ok(P.mood('melk', hot) > 1);
  // availability by weather and by day
  assert.equal(P.availability(stormDay, 'pim', 'citroen').ok, false);
  assert.ok(P.availability(stormDay, 'pim', 'citroen').reason.includes('storm'));
  assert.equal(P.availability(stormDay, 'sjaak', 'chili').ok === true || P.availability(stormDay, 'sjaak', 'chili').reason === 'Vandaag uitverkocht.', true); // Sjaak ignores weather
  const rainDay = dayWith((i) => i.weather === 'regen');
  assert.equal(P.availability(rainDay, 'koko', 'kokos').ok, false);
  assert.equal(P.availability(sunDay, 'pim', 'chili').ok, false); // Pim sells no chili
  let outDays = 0;
  for (let d = 1; d <= 100; d++) if (!P.availability(d, 'suus', 'suiker').ok) outDays++;
  assert.ok(outDays > 5 && outDays < 50, `sold out on ${outDays} days`);
  // price tags
  const moods = new Set();
  for (let d = 1; d <= 40; d++) moods.add(P.priceMood(d, 'pim', 'citroen'));
  assert.ok(moods.has('koopje') && moods.has('duur') && moods.has(''));
  // bulk discounts
  assert.equal(P.bulkPct(5), 0);
  assert.equal(P.bulkPct(10), 0.03);
  assert.equal(P.bulkPct(30), 0.06);
  assert.equal(P.bulkPct(60), 0.1);
  assert.equal(P.bulkPct(150), 0.14);
  // levels
  assert.equal(P.levelOfPoints(0), 0);
  assert.equal(P.levelOfPoints(40), 1);
  assert.equal(P.levelOfPoints(299), 2);
  assert.equal(P.levelOfPoints(5000), 4);
  assert.deepEqual(P.tiersFor(SUPPLIERS.pim, 0), ['standaard']);
  assert.deepEqual(P.tiersFor(SUPPLIERS.pim, 1), ['standaard', 'vers']);
  assert.deepEqual(P.tiersFor(SUPPLIERS.koko, 2), ['standaard', 'vers']);
  assert.deepEqual(P.tiersFor(SUPPLIERS.koko, 3), ['standaard', 'vers', 'top']);
  assert.deepEqual(P.tiersFor(SUPPLIERS.sjaak, 0), ['vers', 'top']);
}

// ------------------------------------------------------------------ suppliers: ordering and delivery
{
  const sun = dayWith((i, d) => i.weather === 'zon' && i.event === 'rustig' && P.availability(d, 'pim', 'citroen').ok && P.availability(d, 'suus', 'suiker').ok && P.availability(d, 'suus', 'munt').ok && P.availability(d, 'sjaak', 'chili').ok && P.availability(d, 'sjaak', 'melk').ok);
  const g = mk({ xp: 300, day: sun, cash: 2000, props: ['hut', 'loods'] });
  g.state.minutes = 8 * 60;
  const basket = (n) => [{ good: 'citroen', n }];

  // errors
  let q = P.quote(g, 'pim', basket(5));
  assert.equal(q.ok, false);
  assert.ok(q.errors[0].includes('Minimaal'));
  q = P.quote(g, 'pim', []);
  assert.equal(q.ok, false);
  q = P.quote(g, 'pim', [{ good: 'chili', n: 20 }]);
  assert.equal(q.ok, false); // Pim does not sell it
  q = P.quote(g, 'pim', [{ good: 'citroen', n: 20, tier: 'top' }]);
  assert.equal(q.ok, false);
  q = P.quote(g, 'pim', [{ good: 'citroen', n: 20, tier: 'vers' }]);
  assert.equal(q.ok, false); // needs relationship level 1
  q = P.quote(g, 'pim', basket(500));
  assert.equal(q.ok, false);
  q = P.quote(g, 'ghost', basket(20));
  assert.equal(q.ok, false);
  const tiny = mk({ xp: 0, day: sun });
  assert.ok(P.quote(tiny, 'ivo', [{ good: 'melk', n: 10 }]).errors.some((e) => e.includes('rang')));

  // a good order
  q = P.quote(g, 'pim', basket(20));
  assert.equal(q.ok, true, q.errors.join());
  assert.equal(q.units, 20);
  assert.equal(q.bulk, 0.03);
  assert.ok(Number.isInteger(q.total));
  assert.equal(q.total, q.subtotal + q.fee + q.rushFee);
  assert.equal(q.fee, q.subtotal >= 40 ? 0 : 4);
  assert.ok(q.subtotal < 20 * P.marketPrice('citroen'), 'cheaper than the market');
  const cash0 = g.state.cash;
  const placed = P.placeOrder(g, 'pim', basket(20));
  assert.equal(placed.ok, true);
  assert.equal(g.state.cash, cash0 - q.total);
  const order = placed.order;
  assert.equal(order.status, 'onderweg');
  assert.equal(order.arriveAt, now(g.state) + SUPPLIERS.pim.base); // 08:00 + 90 min = 09:30, a working hour
  assert.equal(P.pendingUnits(handelState(g)), 20);
  // nothing arrives early
  g.state.minutes = 9 * 60 + 29;
  assert.deepEqual(P.deliverDue(g), []);
  assert.equal(handelState(g).crate.length, 0);
  g.state.minutes = 9 * 60 + 30;
  const done = P.deliverDue(g);
  assert.equal(done.length, 1);
  assert.equal(order.status, 'bezorgd');
  assert.equal(P.crateUnits(handelState(g)), 20);
  assert.equal(P.pendingUnits(handelState(g)), 0);
  assert.deepEqual(P.deliverDue(g), []); // only once
  assert.ok(handelState(g).rel.pim >= 1); // a relationship starts
  const pts = handelState(g).rel.pim;
  // stock limit: collect only what fits
  g.state.properties = ['hut'];
  g.state.inventory.suiker = 40 - 6;
  const got = P.collectCrate(g);
  assert.equal(got.moved, 6);
  assert.equal(got.left, 14);
  assert.equal(g.state.inventory.citroen, 6);
  assert.equal(P.collectCrate(g).moved, 0);
  g.state.inventory.suiker = 0;
  delete g.state.inventory.suiker;
  const got2 = P.collectCrate(g);
  assert.equal(got2.moved, 14);
  assert.equal(P.crateUnits(handelState(g)), 0);
  assert.equal(g.state.inventory.citroen, 20);

  // room accounts for orders on the way and the crate
  g.state.inventory = {};
  g.state.properties = ['hut'];
  assert.equal(P.orderRoom(g), 40);
  P.placeOrder(g, 'pim', basket(25));
  assert.equal(P.orderRoom(g), 15);
  assert.equal(P.quote(g, 'pim', basket(20)).ok, false);
  assert.equal(P.quote(g, 'pim', basket(15)).ok, true);

  // cancel: 85% back
  const open = handelState(g).orders.find((o) => o.status === 'onderweg');
  const c0 = g.state.cash;
  const cr = P.cancelOrder(g, open.id);
  assert.equal(cr.ok, true);
  assert.equal(g.state.cash, c0 + Math.round(open.total * 0.85));
  assert.equal(open.status, 'geannuleerd');
  assert.equal(P.cancelOrder(g, open.id).ok, false);
  g.state.minutes = 20 * 60;
  assert.equal(P.deliverDue(g).length, 0); // a cancelled order never arrives

  // cash
  g.state.cash = 3;
  assert.equal(P.quote(g, 'pim', basket(20)).affordable, false);
  assert.equal(P.placeOrder(g, 'pim', basket(20)).ok, false);
  assert.equal(g.state.cash, 3);
  g.state.cash = 5000;

  // late order: couriers only work 07:00-21:00 -> arrives tomorrow morning
  g.state.inventory = {};
  g.state.minutes = 20 * 60;
  const late = P.placeOrder(g, 'suus', [{ good: 'suiker', n: 25 }]);
  assert.equal(late.ok, true);
  assert.equal(clockAt(late.order.arriveAt).day, sun + 1);
  assert.equal(clockAt(late.order.arriveAt).hour, 7);
  assert.equal(P.arrivalText(g, late.order), 'morgen 07:00');
  g.state.minutes = 23 * 60;
  assert.equal(P.deliverDue(g).length, 0);
  g.sleep();
  g.state.minutes = 7 * 60;
  assert.equal(P.deliverDue(g).length, 1);

  // rush: faster, costs more; Sjaak is always fast and needs no rush
  g.state.day = sun;
  g.state.minutes = 8 * 60;
  g.state.inventory = {};
  const normal = P.quote(g, 'suus', [{ good: 'suiker', n: 30 }], false);
  const rush = P.quote(g, 'suus', [{ good: 'suiker', n: 30 }], true);
  assert.ok(rush.arrive < normal.arrive);
  assert.ok(rush.rushFee >= 8 && rush.total > normal.total);
  assert.equal(rush.arrive - now(g.state), Math.round(SUPPLIERS.suus.base * 0.4)); // 84 minutes
  assert.ok(Math.abs(rush.rushFee - Math.round(rush.subtotal * 0.3)) <= 1);
  handelState(g).rel.suus = 130; // level 2: half the rush fee
  const rush2 = P.quote(g, 'suus', [{ good: 'suiker', n: 30 }], true);
  assert.ok(rush2.rushFee < rush.rushFee * 0.6);
  const sj = P.quote(g, 'sjaak', [{ good: 'chili', n: 4, tier: 'vers' }], true);
  assert.equal(sj.ok, true, sj.errors.join());
  assert.equal(sj.rushFee, 0);
  assert.equal(sj.arrive - now(g.state), SUPPLIERS.sjaak.base);
  g.state.minutes = 20 * 60 + 50; // Sjaak delivers at night too
  assert.equal(P.quote(g, 'sjaak', [{ good: 'chili', n: 4, tier: 'vers' }]).arrive - now(g.state), SUPPLIERS.sjaak.base);

  // a storm stops the ice-cream man; rain slows the others down
  const slowDay = dayWith((i, d) => i.weather === 'regen' && i.event === 'rustig' && P.availability(d, 'suus', 'suiker').ok);
  const slow = mk({ xp: 300, day: slowDay, cash: 999 });
  slow.state.minutes = 8 * 60;
  const sq = P.quote(slow, 'suus', [{ good: 'suiker', n: 20 }]);
  assert.equal(sq.ok, true, sq.errors.join());
  assert.equal(sq.arrive - now(slow.state), SUPPLIERS.suus.base + 30);

  // relationship grows with deliveries and unlocks better prices, perks and tiers
  const r = mk({ xp: 300, day: sun, cash: 99999, props: ['hut', 'loods', 'villa'] });
  r.state.minutes = 8 * 60;
  const base = P.quote(r, 'suus', [{ good: 'suiker', n: 30 }]).subtotal;
  let lastPts = 0;
  for (let i = 0; i < 60 && P.relLevel(r, 'suus') < 2; i++) {
    const o = P.placeOrder(r, 'suus', [{ good: 'suiker', n: 30 }]);
    assert.equal(o.ok, true, o.reason);
    r.state.minutes = 1500; // well after the arrival (same day)
    assert.equal(P.deliverDue(r).length, 1);
    P.collectCrate(r);
    r.state.inventory = {};
    r.state.minutes = 8 * 60;
    assert.ok(handelState(r).rel.suus > lastPts);
    lastPts = handelState(r).rel.suus;
  }
  assert.ok(P.relLevel(r, 'suus') >= 2, `level ${P.relLevel(r, 'suus')}`);
  assert.ok(P.quote(r, 'suus', [{ good: 'suiker', n: 30 }]).subtotal < base, 'a better price for regulars');
  // forecast only from level 3
  handelState(r).rel.suus = 100;
  assert.equal(P.forecast(r, 'suus', 'suiker'), null);
  handelState(r).rel.suus = 310;
  const fc = P.forecast(r, 'suus', 'suiker');
  assert.ok(fc, 'level 3 sees tomorrow');
  if (fc.ok) assert.equal(fc.unit, P.unitPriceOn(r.state.day + 1, 'suus', 'suiker', 'standaard', 3));
  else assert.equal(P.availability(r.state.day + 1, 'suus', 'suiker').ok, false);
  // the best offer today
  const best = P.bestOffer(r, 'suiker');
  assert.ok(best && best.unit < P.marketPrice('suiker'));
  assert.equal(P.bestOffer(mk({ xp: 0, day: sun }), 'melk'), null); // nobody who knows you sells milk yet
}

// ------------------------------------------------------------------ fresh ingredients -> better batch
{
  // pure helpers
  const h = { fresh: {} };
  addFresh(h, 'citroen', 'standaard', 10);
  assert.deepEqual(h.fresh, {}); // plain units are not tracked
  addFresh(h, 'citroen', 'vers', 4);
  addFresh(h, 'citroen', 'top', 2);
  assert.deepEqual(h.fresh.citroen, { vers: 4, top: 2 });
  assert.equal(consumeFresh(h, { citroen: 3 }), 0.1); // 2 top (+8%) + 1 fresh (+2%)
  assert.deepEqual(h.fresh.citroen, { vers: 3, top: 0 });
  assert.equal(consumeFresh(h, { suiker: 5 }), 0);
  assert.equal(consumeFresh(h, { citroen: 99 }), 0.06);
  assert.equal(h.fresh.citroen, undefined);
  addFresh(h, 'melk', 'top', 10);
  assert.equal(consumeFresh(h, { melk: 10 }), MAX_FRESH_BONUS); // capped
  addFresh(h, 'munt', 'vers', 5);
  clampFresh(h, { munt: 3 });
  assert.deepEqual(h.fresh.munt, { vers: 3, top: 0 });
  clampFresh(h, {});
  assert.equal(h.fresh.munt, undefined);
  assert.equal(bumpKey('p:limonade:fris:100', 0.08), 'p:limonade:fris:108');
  assert.equal(bumpKey('citroen', 0.08), 'citroen');

  // the whole chain: order -> crate -> start a batch -> better quality
  const sun = dayWith((i, d) => i.weather === 'zon' && i.event === 'rustig' && P.availability(d, 'pim', 'citroen').ok);
  const g = mk({ xp: 300, day: sun, cash: 1000, props: ['hut', 'loods'] });
  g.state.minutes = 8 * 60;
  handelState(g).rel.pim = 50; // level 1: fresh available
  const o = P.placeOrder(g, 'pim', [{ good: 'citroen', n: 10, tier: 'vers' }]);
  assert.equal(o.ok, true, o.reason);
  g.state.minutes = 12 * 60;
  P.deliverDue(g);
  P.collectCrate(g);
  assert.equal(g.state.inventory.citroen, 10);
  assert.deepEqual(handelState(g).fresh.citroen, { vers: 10, top: 0 });
  const memo = newMemo(g);
  const job = startJob(g, 'limonade', [], 1.0);
  assert.ok(job);
  assert.equal(job.key, 'p:limonade:fris:100');
  const res = watchJobs(g, memo);
  assert.ok(res, 'bonus noticed');
  assert.equal(res.bonus, 0.04); // 2 fresh citroen
  assert.equal(job.key, 'p:limonade:fris:104');
  assert.equal(parseItem(job.key).quality, 1.04);
  assert.deepEqual(handelState(g).fresh.citroen, { vers: 8, top: 0 });
  assert.equal(watchJobs(g, memo), null); // not counted twice
  // a batch made from plain stock gets nothing
  g.state.inventory = { citroen: 4 };
  delete handelState(g).fresh.citroen;
  g.state.jobs = [];
  const memo2 = newMemo(g);
  const job2 = startJob(g, 'limonade', [], 1.0);
  assert.equal(watchJobs(g, memo2), null);
  assert.equal(job2.key, 'p:limonade:fris:100');
  // selling or using plain stock elsewhere never leaves the pool larger than the stock
  addFresh(handelState(g), 'citroen', 'vers', 9);
  g.state.inventory.citroen = 1;
  watchJobs(g, memo2);
  assert.deepEqual(handelState(g).fresh.citroen, { vers: 1, top: 0 });
}

// ------------------------------------------------------------------ saving
{
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const g = new Game(storage);
  g.state.xp = 300;
  g.state.cash = 5000;
  g.state.properties = ['hut', 'loods'];
  g.state.inventory[LIM] = 20;
  S.hireSeller(g, 'keiko');
  S.setZone(g, 'keiko', 'haven');
  S.giveStock(g, 'keiko', LIM, 12);
  S.sellerById(g, 'keiko').pouch = 77;
  g.state.minutes = 8 * 60;
  g.state.day = dayWith((i, d) => i.weather === 'zon' && P.availability(d, 'suus', 'suiker').ok);
  assert.equal(P.placeOrder(g, 'suus', [{ good: 'suiker', n: 20 }]).ok, true);
  notify(g, { kind: 'leeg', who: 'keiko', text: 'Leeg!' });
  handelState(g).crate.push({ good: 'citroen', n: 3, tier: 'vers', supplier: 'pim', order: 'o99' });
  assert.equal(g.save(), true);
  const g2 = new Game(storage);
  assert.deepEqual(g2.state.ext.handel, g.state.ext.handel);
  const s2 = S.sellerById(g2, 'keiko');
  assert.equal(s2.pouch, 77);
  assert.equal(s2.zone, 'haven');
  assert.equal(S.stockCount(s2), 12);
  assert.equal(handelState(g2).orders.length, 1);
  assert.equal(handelState(g2).inbox.length, 1);
  assert.equal(P.crateUnits(handelState(g2)), 3);
  // and the game goes on from the loaded state
  g2.state.minutes = 9 * 60;
  const ev = simulate(g2);
  assert.ok(Array.isArray(ev));
  // a new game resets it
  g2.reset();
  assert.equal(handelState(g2).sellers.length, 0);
}

console.log('ok');
