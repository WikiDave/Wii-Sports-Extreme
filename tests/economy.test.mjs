import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { mix, recipeEffects, unitPrice, itemKey, parseItem, itemName, canMake, makeBatch, buy, sell, sellBack, limitFree } from '../src/game/economy.js';

assert.deepEqual(mix(['fris'], 'suiker'), ['fris', 'zoet']);
assert.deepEqual(recipeEffects('limonade', ['suiker', 'munt']), ['fris', 'bruisend', 'verkoelend']);
assert.deepEqual(recipeEffects('limonade', ['suiker', 'munt', 'kokos']), ['zonnig', 'giechel', 'verkoelend', 'tropisch']);
assert.equal(unitPrice('limonade', ['fris']), 22);
assert.equal(unitPrice('limonade', ['fris'], 1.2), 26);
const k = itemKey('limonade', ['fris', 'zoet'], 1.05);
assert.equal(k, 'p:limonade:fris+zoet:105');
assert.deepEqual(parseItem(k), { product: 'limonade', effects: ['fris', 'zoet'], quality: 1.05 });
assert.equal(parseItem('citroen'), null);
assert.match(itemName(k), /Limonade \(Fris, Zoet\)/);

const g = new Game(null);
assert.equal(canMake(g.state.inventory, 'limonade', []), false);
assert.equal(buy(g, 'citroen', 2), true); assert.equal(buy(g, 'suiker'), true);
assert.equal(g.state.cash, 250 - 8 - 3);
assert.equal(canMake(g.state.inventory, 'limonade', ['suiker']), true);
assert.equal(canMake(g.state.inventory, 'limonade', ['munt']), false);
const made = makeBatch(g, 'limonade', ['suiker'], 1);
assert.equal(made, 'p:limonade:fris+zoet:100');
assert.deepEqual(g.state.inventory, { [made]: 4 });
const money = sell(g, made, 2, 0.5);
assert.equal(money, 2 * Math.round(unitPrice('limonade', ['fris', 'zoet']) * 0.5));
assert.equal(g.state.inventory[made], 2);
assert.equal(sell(g, made, 5), 0);
assert.equal(buy(g, 'kokos', 1000), false);

// Room: the inputs leave the stock first, so a full stock of inputs can brew once the market makes room.
const r = new Game(null);
r.state.inventory = { citroen: 2, suiker: 1, melk: 37 }; // 40 of 40
assert.equal(makeBatch(r, 'limonade', ['suiker'], 1), null); // 3 inputs free up 3 places, 4 bottles need 4
assert.equal(sellBack(r, 'melk', 1), 5); // half of 9, rounded
const made2 = makeBatch(r, 'limonade', ['suiker'], 1);
assert.equal(made2, 'p:limonade:fris+zoet:100');
assert.deepEqual(r.state.inventory, { melk: 36, [made2]: 4 });

// Buy-back: half the price, one unit or the whole stack; nothing held or no good gives nothing.
const sb = new Game(null);
assert.equal(buy(sb, 'citroen', 3), true); // 250 - 12
assert.equal(sellBack(sb, 'citroen', 1), 2);
assert.equal(sellBack(sb, 'citroen', 9), 0); // not that many: nothing changes
assert.equal(sb.state.inventory.citroen, 2);
assert.equal(sellBack(sb, 'citroen', 2), 4);
assert.equal(sb.state.inventory.citroen, undefined); // the stack is gone
assert.equal(sellBack(sb, 'kokos', 1), 0);
assert.equal(sellBack(sb, made2, 1), 0); // products are sold with sell(), not bought back
assert.equal(sb.state.cash, 250 - 12 + 2 + 4);

// Bottles cooking in a station keep their room in the stock.
const lf = new Game(null);
lf.state.jobs = [{ yield: 4 }];
assert.equal(limitFree(lf), 36);
assert.equal(buy(lf, 'citroen', 37), false);
assert.equal(buy(lf, 'citroen', 36), true);
assert.equal(limitFree(lf), 0);
console.log('ok');
