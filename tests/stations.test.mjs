import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { stationLimit, startJob, collect, ready, now, progress, DAY_LENGTH, jobBlock } from '../src/game/stations.js';
import { buy, sellBack, FULL_STOCK } from '../src/game/economy.js';
import { buyProperty } from '../src/game/empire.js';

const g = new Game(null);
assert.equal(stationLimit(g.state), 1);
assert.equal(startJob(g, 'limonade', [], 1), null); // no goods
assert.equal(jobBlock(g, 'limonade', []), 'Je mist grondstoffen.');
buy(g, 'citroen', 4);
const job = startJob(g, 'limonade', [], 1.1);
assert.ok(job); assert.equal(g.state.inventory.citroen, 2); assert.equal(job.readyAt - job.startedAt, 25);
assert.equal(startJob(g, 'limonade', [], 1), null); // the only station is busy
assert.equal(jobBlock(g, 'limonade', []), 'Alle stations zijn bezig.');
assert.equal(collect(g), 0); assert.equal(progress(g.state, job), 0);
g.tick(12); assert.ok(Math.abs(progress(g.state, job) - 12 / 25) < 1e-9);
g.tick(13); assert.equal(ready(g.state).length, 1);
assert.equal(collect(g), 4); assert.equal(g.state.inventory['p:limonade:fris:110'], 4); assert.equal(g.state.jobs.length, 0);
// time keeps running through sleep
const t0 = now(g.state); g.sleep(); assert.ok(now(g.state) >= t0 && now(g.state) <= t0 + DAY_LENGTH);
buy(g, 'citroen', 2); startJob(g, 'limonade', [], 1);
const before = now(g.state); g.sleep(); assert.ok(ready(g.state).length === 1, 'ready after a night');
// more stations with a bigger property
g.state.xp = 400; g.state.cash = 5000; buyProperty(g, 'loods'); assert.equal(stationLimit(g.state), 3);

// Room: a full stock of inputs can brew once the market makes room (the inputs leave the stock first).
const f = new Game(null);
f.state.cash = 1000;
f.state.inventory = { citroen: 2, suiker: 1, melk: 37 }; // 40 of 40
assert.equal(jobBlock(f, 'limonade', ['suiker']), FULL_STOCK);
assert.equal(startJob(f, 'limonade', ['suiker'], 1), null);
assert.deepEqual(f.state.inventory, { citroen: 2, suiker: 1, melk: 37 }); // nothing was taken
assert.equal(sellBack(f, 'melk', 1), 5);
assert.ok(startJob(f, 'limonade', ['suiker'], 1));
assert.deepEqual(f.state.inventory, { melk: 36 }); // 36 + 4 cooking = 40

// Bottles cooking keep their room: buying stops at the free room, and collecting fills it exactly.
const k = new Game(null);
k.state.cash = 5000;
buy(k, 'citroen', 4);
const kj = startJob(k, 'limonade', [], 1);
assert.equal(kj.yield, 4); assert.equal(k.state.inventory.citroen, 2);
assert.equal(buy(k, 'melk', 35), false); // 2 + 4 cooking + 35 > 40
assert.equal(buy(k, 'melk', 34), true);
assert.equal(buy(k, 'melk', 1), false);
k.tick(25);
assert.equal(collect(k), 4);
assert.equal(k.state.inventory['p:limonade:fris:100'], 4);
assert.equal(k.state.inventory.melk, 34);

// The packer's extra bottles are part of the batch, so they need room too.
const pk = new Game(null);
pk.state.cash = 1000;
pk.state.inventory = { citroen: 2, melk: 36 }; // 38 of 40
assert.equal(jobBlock(pk, 'limonade', [], 0), '');
assert.equal(jobBlock(pk, 'limonade', [], 2), FULL_STOCK); // 2 free + 2 used < 4 + 2 bottles
console.log('ok');
