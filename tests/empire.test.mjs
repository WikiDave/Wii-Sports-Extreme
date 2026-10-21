import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { buy, unitPrice } from '../src/game/economy.js';
import { buyProperty, hire, fire, stockLimit, stockFree, staffLimit, dailyWork, GARDENER_KEEP, SELLER_UNITS, SELLER_SHARE } from '../src/game/empire.js';
import { stationLimit, busy, collect } from '../src/game/stations.js';
import { deposit } from '../src/game/panden/chest.js';
import { buyUpgrade } from '../src/game/panden/upgrades.js';

const g = new Game(null);
assert.equal(stockLimit(g.state), 40); assert.equal(staffLimit(g.state), 1);
assert.equal(buy(g, 'citroen', 41), false);
assert.equal(buyProperty(g, 'loods'), false); // rank 0
g.state.xp = 400; g.state.cash = 5000;
assert.equal(buyProperty(g, 'loods'), true); assert.equal(g.state.cash, 2500); assert.equal(buyProperty(g, 'loods'), false);
assert.equal(stockLimit(g.state), 190); assert.equal(staffLimit(g.state), 4); assert.equal(stationLimit(g.state), 3);
assert.equal(hire(g, 'tuinier'), true); assert.equal(hire(g, 'tuinier'), false); assert.equal(hire(g, 'kok'), true); assert.equal(hire(g, 'verkoper'), true);
g.state.cash = 1000;
assert.equal(GARDENER_KEEP, 4); // two batches of limonade: 2 x 2 lemons

// Morning 1: the gardener picks 4 lemons (the cap), the cook starts two batches in two stations.
let log = dailyWork(g);
assert.ok(log.some((l) => l === 'Tuinier plukte 4 citroenen.'), log.join(' | '));
assert.ok(log.some((l) => l === 'Kok zette 2 batches limonade in de stations.'), log.join(' | '));
assert.ok(log.some((l) => l.includes('had niets te verkopen')));
assert.equal(busy(g.state), 2); assert.equal(g.state.inventory.citroen, undefined);
assert.equal(g.state.cash, 1000 - 15 - 40 - 50); // the three wages

// Morning 2, nothing finished yet: one station is still free, the cook uses it and stops there.
log = dailyWork(g);
assert.ok(log.some((l) => l === 'Kok zette 1 batch limonade in de stations.'), log.join(' | '));
assert.equal(busy(g.state), 3); assert.equal(g.state.inventory.citroen, 2);
// Morning 3: every station is busy, so the cook waits; the gardener only tops up to 4.
log = dailyWork(g);
assert.ok(log.some((l) => l === 'Kok wacht: alle stations zijn bezig.'), log.join(' | '));
assert.ok(log.some((l) => l === 'Tuinier plukte 2 citroenen.'), log.join(' | '));
assert.equal(g.state.inventory.citroen, 4);

// The batches finish: the player collects them, the seller sells eight of the twelve bottles.
g.tick(25);
assert.equal(collect(g), 12);
const price = unitPrice('limonade', ['fris'], 1.05);
const cashBefore = g.state.cash;
log = dailyWork(g);
assert.ok(log.some((l) => l === `Verkoper verkocht voor €${8 * Math.round(price * SELLER_SHARE)}.`), log.join(' | '));
assert.equal(g.state.inventory['p:limonade:fris:105'], 4);
assert.equal(g.state.cash, cashBefore + 8 * Math.round(price * SELLER_SHARE) - 15 - 40 - 50);
assert.equal(fire(g, 'kok'), true); assert.deepEqual(g.state.staff, ['tuinier', 'verkoper']);

// The seller takes SELLER_UNITS units a day at 70% of their value.
assert.equal(SELLER_UNITS, 8); assert.equal(SELLER_SHARE, 0.7);
const sv = new Game(null);
sv.state.xp = 250; sv.state.cash = 200; sv.state.inventory = { 'p:limonade:fris:100': 12, citroen: 3 };
assert.equal(hire(sv, 'verkoper'), true);
log = dailyWork(sv);
assert.equal(sv.state.cash, 200 - 50 + 8 * Math.round(unitPrice('limonade', ['fris'], 1) * 0.7)); // 8 x 15 = 120
assert.equal(sv.state.inventory['p:limonade:fris:100'], 4); assert.equal(sv.state.inventory.citroen, 3); // goods are not sold

// Stock: goods in a chest count for the limit, and the storage upgrade raises it.
const e = new Game(null);
e.state.xp = 400; e.state.cash = 5000;
buy(e, 'citroen', 40);
assert.equal(stockFree(e.state), 0);
assert.equal(deposit(e, 'hut', 'citroen', 30), true); // moving to the chest keeps the total
assert.equal(stockFree(e.state), 0);
assert.equal(buy(e, 'citroen', 1), false);
assert.equal(buyUpgrade(e, 'hut', 'storage'), true); // +25% of 40
assert.equal(stockLimit(e.state), 50);
assert.equal(stockFree(e.state), 10);
assert.equal(buy(e, 'citroen', 10), true);
assert.equal(stockFree(e.state), 0);
// The gardener never fills the stock: with lemons in stock he picks nothing more.
assert.equal(hire(e, 'tuinier'), true);
const l2 = dailyWork(e);
assert.ok(l2.some((l) => l === 'Tuinier hoefde geen citroenen te plukken.'), l2.join(' | '));
assert.equal(e.state.inventory.citroen, 20); // 10 in the chest, 20 carried: nothing more was plucked

// A full stock of goods that the cook cannot brew: the cook says so, nothing is lost.
const full = new Game(null);
full.state.xp = 100; full.state.inventory = { citroen: 40 };
assert.equal(hire(full, 'kok'), true);
log = dailyWork(full);
assert.ok(log.some((l) => l === 'Kok had geen grondstoffen of ruimte.'), log.join(' | '));
assert.equal(full.state.inventory.citroen, 40); assert.equal(full.state.jobs.length, 0);

// The packer adds two bottles to every batch of the cook, and those bottles keep their room.
const pk = new Game(null);
pk.state.xp = 250; pk.state.cash = 5000; pk.state.inventory = { citroen: 4 };
buyProperty(pk, 'loods');
hire(pk, 'kok'); hire(pk, 'inpakker');
dailyWork(pk);
assert.equal(pk.state.jobs.length, 2); assert.equal(pk.state.jobs[0].yield, 6); assert.equal(pk.state.jobs[1].yield, 6);
assert.equal(stockFree(pk.state), 190 - 12); // the cooking bottles count as stock
console.log('ok');
