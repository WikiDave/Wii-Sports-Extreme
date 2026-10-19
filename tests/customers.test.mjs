import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { CUSTOMERS } from '../src/game/data/customers.js';
import { isUnlocked, isPresent, available, valueFor, maxPrice, deal, customerById } from '../src/game/customers.js';

const g = new Game(null);
const key = 'p:limonade:fris+zoet:100';
g.addItem(key, 8);
const saburo = customerById('saburo');
assert.equal(isPresent(saburo, 9), true); assert.equal(isPresent(saburo, 20), false);
assert.equal(isPresent(customerById('andy'), 2), true); // 02:00 counts as 26
assert.deepEqual(available(g.state, 0, 12).map((c) => c.id), ['saburo', 'fumiko']);
assert.equal(valueFor(saburo, key), Math.round(Math.round(20 * 1.22) * 1.3)); // two liked effects
let r = deal(g, saburo, key, 3, 'eerlijk');
assert.equal(r.ok, true); assert.equal(r.sold, 1); assert.equal(g.state.customers.saburo.loyalty, 8);
assert.equal(available(g.state, 0, 12).some((c) => c.id === 'saburo'), false); // once a day
g.state.day = 2;
r = deal(g, saburo, key, 1, 'hoog');
assert.equal(r.ok, false); assert.ok(r.message.includes('te duur'));
const r2 = deal(g, saburo, key, 1, 'laag'); assert.equal(r2.ok, true);
g.state.customers.saburo.loyalty = 25;
assert.equal(isUnlocked(g.state, customerById('daisuke'), 0), true);
assert.equal(isUnlocked(g.state, customerById('andy'), 0), false); assert.equal(isUnlocked(g.state, customerById('andy'), 1), true);
assert.equal(deal(g, customerById('fumiko'), 'citroen', 1, 'eerlijk').ok, false);
console.log('ok');
