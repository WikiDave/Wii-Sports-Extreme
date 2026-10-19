import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { heatLevel, addHeat, onDeal, onRefused, tickHeat, frisk, caught, escaped, disguise, inCone, carried } from '../src/game/police.js';
import { rollRival, rivalAt, spotFactor, bribe, tipOff } from '../src/game/rivals.js';
import { deal, customerById } from '../src/game/customers.js';

const g = new Game(null);
const key = 'p:limonade:fris:100';
g.addItem(key, 5); g.addItem('citroen', 3);
assert.equal(carried(g.state), 5);
let levels = []; g.on('heat', (l) => levels.push(l));
onDeal(g, true); assert.equal(heatLevel(g.state), 0); onDeal(g, true); assert.equal(heatLevel(g.state), 1); assert.deepEqual(levels, [1]);
tickHeat(g, 100, true); assert.ok(g.state.heat > 2.1);
const h = g.state.heat; tickHeat(g, 100, false); assert.ok(g.state.heat < h);
assert.equal(onRefused(g, 50, () => 0), false); assert.equal(onRefused(g, 0, () => 0), true);
g.state.heat = 2.2; g.state.cash = 300;
assert.match(frisk(g), /Boete €120, 5 stuks/); assert.equal(g.state.cash, 180); assert.equal(carried(g.state), 0); assert.equal(g.state.inventory.citroen, 3);
g.addItem(key, 2); g.state.heat = 4.5;
assert.match(caught(g), /€54/); assert.equal(heatLevel(g.state), 2); assert.equal(carried(g.state), 0);
g.state.heat = 4.9; escaped(g); assert.equal(heatLevel(g.state), 3);
assert.equal(disguise(g), true); assert.equal(heatLevel(g.state), 2); assert.equal(disguise(g), false);
addHeat(g, 99); assert.equal(heatLevel(g.state), 4); addHeat(g, -99); assert.equal(g.state.heat, 0);
assert.equal(inCone(0, 0, 0, 0, 10, 12), true); assert.equal(inCone(0, 0, 0, 0, -10, 12), false); assert.equal(inCone(0, 0, 0, 10, 1, 12), false); assert.equal(inCone(0, 0, Math.PI / 2, 10, 1, 12), true);

// rivals
assert.equal(rollRival(g, () => 0), null); // rank 0: never
g.state.xp = 150;
const r = rollRival(g, () => 0.1); assert.deepEqual(r, { id: 'lex', spot: 'strand' });
assert.equal(spotFactor(g.state, 'strand'), 0.8); assert.equal(spotFactor(g.state, 'haven'), 1); assert.equal(rivalAt(g.state, 'strand').name, 'Lolly-Lex');
g.addItem(key, 4);
const c = customerById('fumiko');
const before = g.state.cash; const d = deal(g, c, key, 1, 'eerlijk', 0.8); assert.equal(d.ok, true);
const full = Math.round(Math.round(20 * 1.1) * 1 ); assert.equal(g.state.cash - before, Math.round(full * 0.8));
g.state.cash = 100; assert.equal(bribe(g), false); g.state.cash = 200; assert.equal(bribe(g), true); assert.equal(g.state.cash, 80);
rollRival(g, () => 0.1); const h2 = g.state.heat; assert.equal(tipOff(g), true); assert.equal(g.state.rival, null); assert.ok(g.state.heat > h2);
console.log('ok');
