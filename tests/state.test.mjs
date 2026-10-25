import { Game, newGame, migrate, rankOf, formatClock, DAY_START } from '../src/game/state.js';
import assert from 'node:assert/strict';
const mem = { d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = v; } };
const g = new Game(mem);
assert.equal(g.state.cash, 250);
assert.equal(g.addCash(-300), false); assert.equal(g.addCash(-50), true); assert.equal(g.state.cash, 200);
assert.equal(g.addItem('citroen', 3), true); assert.equal(g.addItem('citroen', -4), false); g.addItem('citroen', -3); assert.deepEqual(g.state.inventory, {});
let ranks = []; g.on('rank', (r) => ranks.push(r)); g.addXp(150); assert.deepEqual(ranks, [1]); assert.equal(rankOf(9000), 5);
g.tick(60); assert.equal(g.state.minutes, DAY_START + 60); assert.ok(mem.d['wse.game.v1']);
let days = 0; g.on('newday', () => days++); g.tick(22 * 60); assert.equal(days, 1); assert.equal(g.state.day, 2); assert.equal(g.state.minutes, DAY_START);
const g2 = new Game(mem); assert.equal(g2.state.day, 2); assert.equal(g2.state.cash, 200);
assert.equal(formatClock(26 * 60 + 5), '02:05'); assert.equal(migrate({ cash: 'x', player: { miiId: 'a' } }).cash, 250);
assert.equal(new Game({ getItem() { throw new Error('x'); } }).state.day, 1);
// A listener that throws is logged once; the other listeners still run and the clock keeps going.
{
  const realError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args[0]);
  const broken = new Game(null);
  let others = 0;
  broken.on('time', () => { throw new Error('kapotte luisteraar'); });
  broken.on('time', () => others++);
  broken.tick(1);
  broken.tick(1);
  console.error = realError;
  assert.equal(others, 2, 'the other listener runs every time');
  assert.equal(broken.state.minutes, DAY_START + 2, 'the clock keeps going');
  assert.equal(logged.length, 1, 'the same error is logged once');
  assert.match(logged[0], /Listener for 'time'/);
}
console.log('ok');

// Sleeping with a chosen wake time: the next day starts then, within 06:00 and WAKE_LATEST.
{
  const { Game: G2, DAY_START: D0, WAKE_LATEST: WL } = await import('../src/game/state.js');
  const g = new G2(null);
  g.reset();
  const d = g.state.day;
  g.sleep(9 * 60 + 30);
  assert.equal(g.state.day, d + 1);
  assert.equal(g.state.minutes, 9 * 60 + 30, 'wakes at the chosen time');
  g.sleep();
  assert.equal(g.state.minutes, D0, 'default: 06:00');
  g.sleep(23 * 60);
  assert.equal(g.state.minutes, WL, 'never later than WAKE_LATEST');
  g.sleep(3 * 60);
  assert.equal(g.state.minutes, D0, 'never before 06:00');
}
