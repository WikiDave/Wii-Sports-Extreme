import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { CUSTOMERS } from '../src/game/data/customers.js';
import { TYPES, VOICES } from '../src/game/klanten/types.js';
import { EFFECTS } from '../src/game/data/effects.js';
import { PRODUCTS } from '../src/game/data/products.js';
import { EVENTS, lineFor } from '../src/game/klanten/lines.js';
import { TIERS, tierIndex, tierOf, budgetFactor, extraQty, tipChance, toNextTier } from '../src/game/klanten/tiers.js';
import {
  isUnlocked, isPresent, available, valueFor, maxPrice, deal, customerById, record, introduce, dailyUpdate,
  boycotted, budgetOf, maxQtyOf, priceOf, wishProduct, fitsWish, unlockHint, wantsToday, OFFERS, MAX_LOYALTY,
} from '../src/game/customers.js';
import { heatLevel } from '../src/game/police.js';

// ---------------------------------------------------------------- the data
assert.ok(CUSTOMERS.length >= 24, `${CUSTOMERS.length} customers`);
assert.equal(new Set(CUSTOMERS.map((c) => c.id)).size, CUSTOMERS.length);
assert.equal(new Set(CUSTOMERS.map((c) => c.name)).size, CUSTOMERS.length);
for (const id of ['saburo', 'fumiko', 'daisuke', 'sakura', 'andy']) assert.ok(customerById(id), id);
const effects = Object.keys(EFFECTS);
for (const c of CUSTOMERS) {
  assert.ok(TYPES[c.type], `${c.id} type`);
  assert.ok(VOICES.includes(c.voice), `${c.id} voice`);
  assert.ok(c.mii || c.look?.seed != null, `${c.id} look`);
  assert.equal(c.likes.length, 3, c.id);
  assert.equal(new Set(c.likes).size, 3, c.id);
  assert.equal(c.dislikes.length, 1, c.id);
  assert.ok([...c.likes, ...c.dislikes].every((e) => effects.includes(e)), `${c.id} effects`);
  assert.ok(!c.likes.includes(c.dislikes[0]), `${c.id} likes what it dislikes`);
  assert.ok(PRODUCTS[c.prefers], `${c.id} prefers`);
  assert.ok(c.budget >= 10 && c.patience > 0 && c.patience <= 1 && c.discretion >= 0 && c.discretion <= 1, c.id);
  assert.ok(c.routine[0][0] === 6 && c.routine[0][1] === 'thuis', `${c.id} starts at home at 06:00`);
  assert.ok(c.routine.every((s, i) => i === 0 || s[0] > c.routine[i - 1][0]), `${c.id} routine order`);
  assert.ok(c.schedule.length >= 1 && c.schedule.every(([a, b]) => a >= 6 && b <= 28 && a < b), `${c.id} windows`);
  assert.ok(['strand', 'haven'].includes(c.spot));
  assert.ok(c.bio.length > 10);
}
// A spread over the ranks: budgets grow with the rank that unlocks them.
const rankOf = (c) => c.unlock?.rank ?? c.unlock?.any?.[0]?.rank ?? 0;
const mean = (r) => { const xs = CUSTOMERS.filter((c) => rankOf(c) === r); return xs.reduce((a, c) => a + c.budget, 0) / xs.length; };
assert.ok(mean(0) < mean(2) && mean(2) < mean(3) && mean(3) < mean(4) && mean(4) < mean(5), 'budget scales with rank');
assert.ok(CUSTOMERS.filter((c) => !c.unlock).length >= 3, 'a few customers to start with');
for (const c of CUSTOMERS) for (const cond of [c.unlock?.loyalty && c.unlock, ...(c.unlock?.any ?? [])].filter(Boolean)) assert.ok(customerById(cond.loyalty[0]), `${c.id} friend`);
assert.ok(new Set(CUSTOMERS.map((c) => c.type)).size >= 12, 'many kinds of customers');

// ---------------------------------------------------------------- presence and unlocks
const g = new Game(null);
const key = 'p:limonade:fris+zoet:100';
g.addItem(key, 8);
const saburo = customerById('saburo');
assert.equal(isPresent(saburo, 9), true); assert.equal(isPresent(saburo, 20), false);
assert.equal(isPresent(customerById('andy'), 2), true); // 02:00 counts as 26
const start = available(g.state, 0, 12).map((c) => c.id);
assert.ok(start.includes('saburo') && start.includes('fumiko'), start.join());
assert.ok(start.every((id) => !customerById(id).unlock), 'only the ones you know at the start');
assert.equal(isUnlocked(g.state, customerById('daisuke'), 0), false);
assert.equal(valueFor(saburo, key), Math.round(Math.round(20 * 1.22) * 1.3 * 1.05)); // two liked effects + favourite product
assert.equal(valueFor(saburo, 'citroen'), 0);

// ---------------------------------------------------------------- a deal
let r = deal(g, saburo, key, 3, 'eerlijk', 1, null, () => 0.99);
assert.equal(r.ok, true); assert.equal(r.sold, 1); assert.equal(r.tip, 0);
assert.equal(g.state.customers.saburo.loyalty, 10); assert.equal(r.delta, 10);
assert.equal(r.reaction, 'loves'); assert.ok(r.line.length > 5);
assert.match(r.message, /Saburo koopt 1× voor €33/);
assert.equal(g.state.customers.saburo.spent, 33);
assert.equal(available(g.state, 0, 12).some((c) => c.id === 'saburo'), false); // once a day
g.state.day = 2;
r = deal(g, saburo, key, 1, 'hoog');
assert.equal(r.ok, false); assert.ok(r.message.includes('te duur'));
const r2 = deal(g, saburo, key, 1, 'laag'); assert.equal(r2.ok, true);
g.state.customers.saburo.loyalty = 25;
assert.equal(isUnlocked(g.state, customerById('daisuke'), 0), true);
assert.equal(isUnlocked(g.state, customerById('andy'), 0), false); assert.equal(isUnlocked(g.state, customerById('andy'), 1), true);
assert.equal(deal(g, customerById('fumiko'), 'citroen', 1, 'eerlijk').ok, false);

// ---------------------------------------------------------------- unlock conditions
{
  const s = new Game(null);
  const st = s.state;
  const noor = customerById('noor'); // { deals: 5 }
  assert.equal(isUnlocked(st, noor, 0), false);
  assert.match(unlockHint(st, noor, 0), /5 deals \(nu 0\)/);
  for (let i = 0; i < 5; i++) record(st, ['saburo', 'fumiko'][i % 2]).deals++;
  assert.equal(isUnlocked(st, noor, 0), true); assert.equal(unlockHint(st, noor, 0), '');
  const mo = customerById('mo'); // rank 1 and a friend
  record(st, 'fumiko').loyalty = 30;
  assert.equal(isUnlocked(st, mo, 0), false); assert.equal(isUnlocked(st, mo, 1), true);
  assert.match(unlockHint(st, customerById('wim'), 0), /rang Zoetekauw/);
  // earned and day conditions
  const fake = { id: 'x', unlock: { earned: 100, day: 3 } };
  assert.equal(isUnlocked(st, fake, 0), false);
  st.day = 3; record(st, 'saburo').spent = 150;
  assert.equal(isUnlocked(st, fake, 0), true);
  assert.equal(isUnlocked(st, { id: 'y', unlock: { any: [{ rank: 5 }, { deals: 5 }] } }, 0), true);
  // introductions are sticky: lowering the friend's trust does not take the customer away
  const t = new Game(null);
  record(t.state, 'saburo').loyalty = 22;
  const intro = introduce(t);
  assert.ok(intro.some((x) => x.customer === 'daisuke' && x.by === 'saburo' && !x.start));
  assert.ok(intro.some((x) => x.customer === 'saburo' && x.start));
  assert.equal(introduce(t).length, 0);
  record(t.state, 'saburo').loyalty = 0;
  assert.equal(isUnlocked(t.state, customerById('daisuke'), 0), true);
  assert.equal(record(t.state, 'daisuke').met, t.state.day);
}

// ---------------------------------------------------------------- liked, disliked, quality, favourite product
{
  const kai = customerById('kai'); // likes zoet, giechel, fris; dislikes ijzig; wants limonade; standard 0.8
  const plain = 'p:limonade:fris:90';
  const bad = 'p:limonade:fris+ijzig:100';
  const poor = 'p:limonade:fris:70';
  assert.equal(valueFor(kai, 'p:limonade:fris:100'), Math.round(Math.round(20 * 1.1) * 1.15 * 1.05));
  assert.ok(valueFor(kai, bad) < Math.round(20 * 1.48 * 1.15) * 0.8, 'a disliked effect costs 30%');
  assert.ok(valueFor(kai, poor) < valueFor(kai, 'p:limonade:fris:80'), 'below what they expect it is worth less');
  assert.ok(valueFor(kai, 'p:limonade:fris:100') > valueFor(kai, 'p:limonade:fris:80'), 'more quality, a higher price');
  assert.equal(valueFor(kai, 'p:limonade:fris:80'), Math.round(Math.round(20 * 1.1 * 0.8) * 1.15 * 1.05), 'no penalty at their standard');
  assert.ok(valueFor(customerById('hiroshi'), 'p:snoep:zoet:100') > Math.round(45 * 1.12), 'liked effect and favourite product');
  // reactions
  const bram = customerById('bram'); // likes fris, bruisend, tropisch; dislikes ijzig; budget 55; standard 0.85
  const gg = new Game(null);
  const sell = (day, item, offer, who = bram) => { gg.state.day = day; return deal(gg, who, item, 1, offer, 1, null, () => 0.99); };
  gg.addItem(bad, 2); gg.addItem(plain, 4); gg.addItem('p:limonade:fris:100', 2);
  let res = sell(1, bad, 'eerlijk');
  assert.equal(res.ok, true); assert.equal(res.reaction, 'hates'); assert.ok(res.delta < 8);
  assert.equal(sell(2, plain, 'laag').reaction, 'cheap');
  assert.equal(sell(3, plain, 'eerlijk').reaction, 'likes');
  assert.equal(sell(4, 'p:limonade:fris:100', 'eerlijk').reaction, 'highq'); // quality well above what he expects
  record(gg.state, 'bram').loyalty = 100;
  assert.equal(sell(5, 'p:limonade:fris:100', 'hoog').reaction, 'pricey'); // only a best friend pays the high price
  gg.addItem('p:limonade:fris:70', 1);
  assert.equal(sell(6, 'p:limonade:fris:70', 'laag').reaction, 'lowq');
  assert.equal(sell(7, 'p:limonade:fris+bruisend:90', 'eerlijk').ok, false, 'nothing in stock'); // no such item
  const hotel = customerById('shouta'); // standard 1.1, likes ijzig
  gg.addItem('p:ijs:ijzig:80', 1);
  assert.equal(sell(8, 'p:ijs:ijzig:80', 'eerlijk', hotel).reaction, 'lowq'); // he likes ijzig, but expects two stars
}

// ---------------------------------------------------------------- price, budget, tiers
assert.equal(OFFERS.laag, 0.8); assert.equal(MAX_LOYALTY, 100);
assert.deepEqual(TIERS.map((t) => t.min), [0, 15, 35, 60, 85]);
assert.equal(tierIndex(0), 0); assert.equal(tierIndex(14), 0); assert.equal(tierIndex(15), 1); assert.equal(tierIndex(60), 3); assert.equal(tierOf(100).name, 'Beste vriend');
assert.equal(budgetFactor(0), 1); assert.ok(Math.abs(budgetFactor(90) - 1.32) < 1e-9);
assert.deepEqual([0, 20, 40, 70, 90].map(extraQty), [0, 0, 1, 1, 2]);
assert.deepEqual([0, 20, 40, 70, 90].map(tipChance), [0, 0, 0.1, 0.2, 0.3]);
assert.equal(toNextTier(0).points, 15); assert.equal(toNextTier(100), null);
{
  const andy = customerById('andy');
  assert.equal(budgetOf(andy, 0), 200); assert.equal(budgetOf(andy, 90), 264);
  assert.equal(maxQtyOf(andy, 0), 3); assert.equal(maxQtyOf(andy, 40), 4); assert.equal(maxQtyOf(andy, 90), 5);
  assert.equal(maxQtyOf(customerById('hiroshi'), 0), 4); assert.equal(maxQtyOf(customerById('kai'), 0), 2);
  const k = 'p:limonade:fris:100';
  assert.equal(maxPrice(andy, k, 100) > maxPrice(andy, k, 0), true);
  assert.equal(priceOf(andy, k, 'laag'), Math.round(valueFor(andy, k) * 0.8));
  // regulars buy more and bigger
  const gg = new Game(null);
  gg.addItem(k, 20); record(gg.state, 'andy').loyalty = 90;
  const res = deal(gg, andy, k, 10, 'eerlijk', 1, null, () => 0.99);
  assert.equal(res.sold, 5); assert.equal(res.tierUp, null);
  // trust that crosses a level reports it, once
  const hh = new Game(null); hh.addItem(k, 6);
  const events = []; hh.on('klanten:tier', (e) => events.push(e));
  record(hh.state, 'fumiko').loyalty = 12;
  const up = deal(hh, customerById('fumiko'), k, 1, 'laag', 1, null, () => 0.99);
  assert.equal(up.tierUp.name, 'Bekende'); assert.ok(up.tierLine.length > 3); assert.equal(events.length, 1);
}
// tips: regulars tip 10% now and then, newcomers never
{
  const gg = new Game(null); const k = 'p:limonade:fris:100';
  gg.addItem(k, 10); record(gg.state, 'sakura').loyalty = 70;
  const cash = gg.state.cash;
  const res = deal(gg, customerById('sakura'), k, 1, 'eerlijk', 1, null, () => 0);
  assert.ok(res.tip >= 1); assert.equal(gg.state.cash - cash, res.money + res.tip); assert.ok(res.tipLine.length > 3);
  gg.state.day = 2; gg.state.customers.sakura.loyalty = 5;
  assert.equal(deal(gg, customerById('sakura'), k, 1, 'eerlijk', 1, null, () => 0).tip, 0);
}

// ---------------------------------------------------------------- refusing and overcharging
{
  const k = 'p:limonade:fris:100';
  const mk = () => { const x = new Game(null); x.addItem(k, 20); return x; };
  // a patient customer gives one second chance, then leaves
  let x = mk(); const oma = customerById('truus'); record(x.state, 'truus').loyalty = 30;
  let res = deal(x, oma, k, 1, 'hoog', 1, null, () => 0.99);
  assert.equal(res.ok, false); assert.equal(res.retry, true); assert.equal(res.reaction, 'retry'); assert.ok(res.delta < 0);
  assert.equal(x.state.customers.truus.lastDay, 0, 'still there');
  assert.equal(available(x.state, 0, 10).some((c) => c.id === 'truus'), true);
  res = deal(x, oma, k, 1, 'hoog', 1, null, () => 0.99);
  assert.equal(res.retry, false); assert.equal(res.reaction, 'refuse'); assert.equal(x.state.customers.truus.lastDay, x.state.day);
  // an impatient one leaves at once and takes it harder
  x = mk(); record(x.state, 'kai').loyalty = 30; record(x.state, 'truus').loyalty = 30;
  deal(x, customerById('kai'), k, 1, 'hoog', 1, null, () => 0.99);
  deal(x, oma, k, 1, 'hoog', 1, null, () => 0.99);
  assert.ok(x.state.customers.kai.loyalty < x.state.customers.truus.loyalty);
  assert.equal(x.state.customers.kai.lastDay, x.state.day);
  // three refusals in a row: a two day boycott
  x = mk(); const daisuke = customerById('daisuke'); record(x.state, 'daisuke').loyalty = 40;
  for (let i = 0; i < 3; i++) { x.state.day = 5 + i; res = deal(x, daisuke, k, 1, 'hoog', 1, null, () => 0.99); }
  assert.equal(res.boycott, true); assert.equal(res.reaction, 'boycott');
  assert.equal(boycotted(x.state, daisuke), true); assert.equal(wantsToday(x.state, daisuke), false);
  assert.equal(available(x.state, 0, 12).some((c) => c.id === 'daisuke'), false);
  assert.match(deal(x, daisuke, k, 1, 'laag').message, /wil je even niet zien/);
  x.state.day = 8; assert.equal(boycotted(x.state, daisuke), true); // day 7 + 2 = 9
  x.state.day = 10; assert.equal(boycotted(x.state, daisuke), false);
  // a good deal clears the strikes
  x = mk(); record(x.state, 'bram').loyalty = 20; x.state.customers.bram.strikes = 2;
  deal(x, customerById('bram'), k, 1, 'eerlijk', 1, null, () => 0.99); assert.equal(x.state.customers.bram.strikes, 0);
}

// ---------------------------------------------------------------- discretion: who tells the guards
{
  const k = 'p:limonade:fris:100';
  const run = (id, rand) => { const x = new Game(null); x.addItem(k, 5); record(x.state, id).loyalty = 40; const res = deal(x, customerById(id), k, 1, 'hoog', 1, null, rand); return { res, heat: x.state.heat }; };
  let out = run('kai', () => 0); // a kid always blabs when told off... and rand 0 means the dice say yes
  assert.equal(out.res.tipOff, true); assert.ok(out.heat > 0);
  out = run('kai', () => 0.99); assert.equal(out.res.tipOff, false); assert.equal(out.heat, 0);
  // discreet customers almost never: with rand just above their (small) chance nothing happens
  const chance = (id) => (1 - customerById(id).discretion) * 0.35;
  assert.ok(chance('piet') < chance('kai') && chance('daisuke') < chance('akira'));
  out = run('piet', () => 0.2); assert.equal(out.res.tipOff, false);
  out = run('kai', () => 0.2); assert.equal(out.res.tipOff, true);
  // a friend in uniform lowers the heat after a good deal
  const x = new Game(null); x.addItem(k, 5); x.state.heat = 2; record(x.state, 'akira').loyalty = 70;
  deal(x, customerById('akira'), k, 1, 'eerlijk', 1, null, () => 0.99);
  assert.ok(x.state.heat < 2 && heatLevel(x.state) >= 1);
}

// ---------------------------------------------------------------- the rich stock up every other day
{
  const baron = customerById('baron'); assert.equal(baron.every, 2);
  const x = new Game(null); x.state.xp = 99999; x.state.day = 5; x.state.cash = 1;
  assert.equal(wantsToday(x.state, baron), true, 'a new customer always wants');
  x.addItem('p:ijs:giechel+zonnig:110', 6);
  assert.equal(deal(x, baron, 'p:ijs:giechel+zonnig:110', 3, 'eerlijk', 1, null, () => 0.99).ok, true);
  x.state.day = 6; assert.equal(wantsToday(x.state, baron), false);
  x.state.day = 7; assert.equal(wantsToday(x.state, baron), true);
  assert.equal(customerById('saburo').every, 1);
}

// ---------------------------------------------------------------- forgetting, favourite products, requests with a product
{
  const x = new Game(null);
  record(x.state, 'saburo').loyalty = 30; x.state.customers.saburo.lastDay = 1; x.state.customers.saburo.strikes = 2;
  x.state.day = 5; dailyUpdate(x); assert.equal(x.state.customers.saburo.loyalty, 30); assert.equal(x.state.customers.saburo.strikes, 0);
  x.state.day = 12; dailyUpdate(x); assert.equal(x.state.customers.saburo.loyalty, 29);
  assert.equal(wishProduct(customerById('fumiko'), 0), 'snoep'); assert.equal(wishProduct(customerById('fumiko'), 2), null);
  assert.equal(wishProduct(customerById('saburo'), 0), null);
  assert.equal(fitsWish({ product: 'ijs' }, 'p:ijs:ijzig:100'), true); assert.equal(fitsWish({ product: 'ijs' }, 'p:snoep:ijzig:100'), false); assert.equal(fitsWish({}, 'p:snoep:x:100'), true);
}

// ---------------------------------------------------------------- old saves get the new fields
{
  const x = new Game(null);
  x.state.customers.saburo = { loyalty: 12, unlocked: true, lastDay: 2, deals: 3 };
  const rec = record(x.state, 'saburo');
  assert.deepEqual([rec.loyalty, rec.deals, rec.spent, rec.strikes, rec.boycott], [12, 3, 0, 0, 0]);
}

// ---------------------------------------------------------------- lines
for (const voice of VOICES) for (const ev of EVENTS) {
  const t = lineFor(voice, ev, { fx: 'Zoet', tier: 'Vaste klant', friend: 'Saburo' }, () => 0);
  assert.ok(t.length > 3 && !t.includes('{'), `${voice}/${ev}: ${t}`);
}
assert.notEqual(lineFor('stoer', 'greet', {}, () => 0), lineFor('deftig', 'greet', {}, () => 0));
assert.match(lineFor('joviaal', 'loves', { fx: 'Zoet' }, () => 0), /zoet/);
console.log('ok');
