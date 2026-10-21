import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { buy, makeBatch } from '../src/game/economy.js';
import { buyProperty, hire, fire, stockLimit, stockFree, staffLimit, dailyWork } from '../src/game/empire.js';
import { deposit } from '../src/game/panden/chest.js';
import { buyUpgrade } from '../src/game/panden/upgrades.js';

const g = new Game(null);
assert.equal(stockLimit(g.state), 40); assert.equal(staffLimit(g.state), 1);
assert.equal(buy(g, 'citroen', 41), false);
assert.equal(buyProperty(g, 'loods'), false); // rank 0
g.state.xp = 400; g.state.cash = 5000;
assert.equal(buyProperty(g, 'loods'), true); assert.equal(g.state.cash, 2500); assert.equal(buyProperty(g, 'loods'), false);
assert.equal(stockLimit(g.state), 190); assert.equal(staffLimit(g.state), 4);
assert.equal(hire(g, 'tuinier'), true); assert.equal(hire(g, 'tuinier'), false); assert.equal(hire(g, 'kok'), true); assert.equal(hire(g, 'verkoper'), true);
g.state.cash = 200;
let log = dailyWork(g);
assert.equal(g.state.inventory.citroen, 2); // gardener picked 4, the cook used 2
assert.ok(g.state.cash > 200 - 105); // wages paid, the seller sold the batch
assert.ok(log.some((l) => l.includes('Kok')));
log = dailyWork(g); // second morning: cook has 4 lemons -> a batch; seller sells it
assert.ok(log.some((l) => l.includes('verkocht voor')));
g.state.cash = 0; log = dailyWork(g); assert.ok(log.every((l) => l.includes('loon')));
assert.equal(fire(g, 'kok'), true); assert.deepEqual(g.state.staff, ['tuinier', 'verkoper']);

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
// The staff gardener only fills the room that is free.
assert.equal(hire(e, 'tuinier'), true);
const l2 = dailyWork(e);
assert.ok(l2.some((l) => l.includes('plukte 0 citroenen')));
console.log('ok');
