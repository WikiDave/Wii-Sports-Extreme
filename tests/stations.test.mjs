import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { stationLimit, startJob, collect, ready, now, progress, DAY_LENGTH } from '../src/game/stations.js';
import { buy } from '../src/game/economy.js';
import { buyProperty } from '../src/game/empire.js';

const g = new Game(null);
assert.equal(stationLimit(g.state), 1);
assert.equal(startJob(g, 'limonade', [], 1), null); // no goods
buy(g, 'citroen', 4);
const job = startJob(g, 'limonade', [], 1.1);
assert.ok(job); assert.equal(g.state.inventory.citroen, 2); assert.equal(job.readyAt - job.startedAt, 25);
assert.equal(startJob(g, 'limonade', [], 1), null); // the only station is busy
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
console.log('ok');
