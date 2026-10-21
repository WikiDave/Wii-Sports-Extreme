import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { buy, limitFree } from '../src/game/economy.js';
import { buyProperty, stockLimit, stockFree } from '../src/game/empire.js';
import { startJob, collect, stationLimit } from '../src/game/stations.js';
import { buyUpgrade, upgradeCost, storageOf, speedFor, speedFactor, raidFactor, comfortBonus, paintOf, setPaint, SPEED_FACTOR } from '../src/game/panden/upgrades.js';
import { chestOf, chestUsed, chestFree, deposit, withdraw, stockCount } from '../src/game/panden/chest.js';
import { sleepAt } from '../src/game/panden/sleep.js';
import { levelOf, stationOwners, pandenOf } from '../src/game/panden/save.js';
import { findSite, zoneOf, heightRange, toWorld, facing, downhill } from '../src/game/panden/place.js';
import { PAINTS, UPGRADES } from '../src/game/data/properties.js';

const rich = (g, cash = 100000) => {
  g.state.xp = 2600;
  g.state.cash = cash;
};

// Ownership and upgrades need an owned place.
const g = new Game(null);
rich(g);
assert.equal(buyUpgrade(g, 'loods', 'security'), false); // not owned
assert.equal(upgradeCost(g.state, 'hut', 'security'), 300); // tier 1
assert.equal(buyUpgrade(g, 'hut', 'security'), true);
assert.equal(g.state.cash, 100000 - 300);
assert.equal(levelOf(g.state, 'security', 'hut'), 1);
assert.equal(g.state.ext.panden.security.hut, 1);
assert.equal(raidFactor(g.state, 'hut'), 0.8);
buyUpgrade(g, 'hut', 'security');
buyUpgrade(g, 'hut', 'security');
assert.equal(levelOf(g.state, 'security', 'hut'), 3); // max
assert.equal(upgradeCost(g.state, 'hut', 'security'), null);
assert.equal(buyUpgrade(g, 'hut', 'security'), false);
assert.equal(raidFactor(g.state, 'hut'), 0.4);
// Prices scale with the tier of the place.
buyProperty(g, 'loods');
assert.equal(upgradeCost(g.state, 'loods', 'storage'), 300 * 2);
assert.equal(upgradeCost(g.state, 'grot', 'storage'), 300 * 4); // grot not owned, but the price is known
// The costs from the data table, per level.
for (const track of Object.keys(UPGRADES)) assert.equal(UPGRADES[track].costs.length, 3, track);

// Storage: +25% per level, and the stock limit follows.
assert.equal(storageOf(g.state, 'hut'), 40);
buyUpgrade(g, 'hut', 'storage');
assert.equal(storageOf(g.state, 'hut'), 50);
buyUpgrade(g, 'hut', 'storage');
assert.equal(storageOf(g.state, 'hut'), 60);
assert.equal(stockLimit(g.state), 60 + 150);

// Speed: a shorter batch in the station of that place.
assert.equal(SPEED_FACTOR[0], 1);
assert.deepEqual(stationOwners(g.state), ['hut', 'loods', 'loods']);
assert.equal(speedFor(g.state, 0), 1);
buyUpgrade(g, 'loods', 'speed');
assert.equal(speedFactor(g.state, 'loods'), 0.85);
assert.equal(speedFor(g.state, 1), 0.85);
assert.equal(speedFor(g.state, 0), 1); // the hut is not upgraded
assert.equal(speedFor(g.state, 9), 1); // no such station

// Comfort: heat and xp of a night in that bed.
assert.deepEqual(comfortBonus(g.state, 'hut'), { heat: 0, xp: 0 });
buyUpgrade(g, 'hut', 'comfort');
buyUpgrade(g, 'hut', 'comfort');
assert.deepEqual(comfortBonus(g.state, 'hut'), { heat: 2, xp: 10 });

// Decoration: the paint needs level 1.
assert.equal(setPaint(g, 'hut', 1), false);
buyUpgrade(g, 'hut', 'decor');
assert.equal(setPaint(g, 'hut', 2), true);
assert.equal(paintOf(g.state, 'hut'), 2);
assert.equal(setPaint(g, 'hut', 99), false);
assert.equal(PAINTS[0].color.length, 7);

// Security applies to a place that is not owned: no effect, no error.
assert.equal(raidFactor(g.state, 'villa'), 1);

// Chests: goods move between the inventory and the chest; both count for the stock limit.
const c = new Game(null);
rich(c, 1000);
buy(c, 'citroen', 10);
assert.equal(chestFree(c.state, 'hut'), 40);
assert.equal(deposit(c, 'hut', 'citroen', 6), true);
assert.equal(c.state.inventory.citroen, 4);
assert.deepEqual(chestOf(c.state, 'hut'), { citroen: 6 });
assert.equal(chestUsed(c.state, 'hut'), 6);
assert.equal(stockCount(c.state), 10); // moving does not change the total
assert.equal(deposit(c, 'hut', 'citroen', 5), false); // only 4 carried
assert.equal(deposit(c, 'loods', 'citroen', 1), false); // not owned
assert.equal(withdraw(c, 'hut', 'citroen', 2), true);
assert.equal(c.state.inventory.citroen, 6);
assert.equal(withdraw(c, 'hut', 'citroen', 9), false); // only 4 in the chest
assert.equal(withdraw(c, 'hut', 'citroen', 4), true);
assert.equal(chestOf(c.state, 'hut').citroen, undefined); // empty entries are removed
assert.equal(c.state.ext.panden.chest.hut.citroen, undefined);
assert.equal(c.state.inventory.citroen, 10);
// Fill the stock to the limit: chests count.
c.state.inventory = { citroen: 40 };
assert.equal(stockCount(c.state), 40);
assert.equal(limitFree(c), 0);
assert.equal(buy(c, 'citroen', 1), false); // no room
assert.equal(deposit(c, 'hut', 'citroen', 20), true);
assert.equal(chestUsed(c.state, 'hut'), 20);
assert.equal(stockCount(c.state), 40);
assert.equal(buy(c, 'citroen', 1), false); // still full: the chest is part of the stock
assert.equal(withdraw(c, 'hut', 'citroen', 20), true);
assert.equal(c.state.inventory.citroen, 40);

// The chest room follows the storage upgrades.
const u = new Game(null);
rich(u);
buyUpgrade(u, 'hut', 'storage');
u.state.inventory = { citroen: 50 };
assert.equal(chestFree(u.state, 'hut'), 50);
assert.equal(deposit(u, 'hut', 'citroen', 50), true);
assert.equal(chestFree(u.state, 'hut'), 0);
assert.equal(stockFree(u.state), 0);

// Sleeping: the day ends, the comfort bonus drops the heat and gives xp.
const s = new Game(null);
rich(s, 1000);
buyUpgrade(s, 'hut', 'comfort');
buyUpgrade(s, 'hut', 'comfort');
s.state.heat = 3;
const day = s.state.day;
const xp = s.state.xp;
const bonus = sleepAt(s, 'hut');
assert.deepEqual(bonus, { heat: 2, xp: 10 });
assert.equal(s.state.day, day + 1);
assert.equal(s.state.heat, 3 - 1 - 2); // the sleep itself takes 1 off, the comfort 2 more
assert.equal(s.state.xp, xp + 10);
assert.equal(sleepAt(s, 'villa'), null); // not owned
// A plain bed (no comfort) only does the normal night.
const p = new Game(null);
p.state.heat = 2;
assert.deepEqual(sleepAt(p, 'hut'), { heat: 0, xp: 0 });
assert.equal(p.state.heat, 1);

// Stations: the stations of an owned place, in order, and the lamp order of machines.
const st = new Game(null);
rich(st);
assert.equal(stationLimit(st.state), 1);
buyProperty(st, 'villa');
assert.equal(stationLimit(st.state), 4);
assert.deepEqual(stationOwners(st.state), ['hut', 'villa', 'villa', 'villa']);
buy(st, 'citroen', 8);
buyUpgrade(st, 'villa', 'speed'); // 0.85 at tier 3
buyUpgrade(st, 'villa', 'speed'); // 0.7
const job = startJob(st, 'limonade', [], 1);
assert.equal(job.readyAt - job.startedAt, 25); // slot 0 is the hut, normal speed
const j2 = startJob(st, 'limonade', [], 1);
assert.equal(j2.readyAt - j2.startedAt, 18); // slot 1 is the villa at 0.7 (17.5 rounded)
const j3 = startJob(st, 'limonade', [], 1);
assert.equal(j3.readyAt - j3.startedAt, 18); // slot 2 is the villa too
// Ready batches come out of the stations as before.
st.state.minutes += 30;
assert.ok(collect(st) > 0);

// Places: zones, height ranges and the site search (flat ground, pure function).
const flat = () => 5;
assert.equal(zoneOf(250, 70), 'haven');
assert.equal(zoneOf(-40, 10), 'heuvels');
assert.equal(zoneOf(40, -230), 'vulkaan');
assert.deepEqual(heightRange(flat, 0, 0, 5), { min: 5, max: 5 });
const site = findSite(flat, { start: { x: 250, z: 70 }, zone: 'haven', minH: 1, maxH: 9, flat: 1, half: 5, clearance: 4, colliders: [{ x: 250, z: 70, r: 3 }] });
assert.ok(site);
assert.equal(site.y, 5);
assert.equal(zoneOf(site.x, site.z), 'haven');
assert.ok(Math.hypot(site.x - 250, site.z - 70) >= 3 + 4); // clear of the collider
// Nothing fits on steep ground: null.
const steep = (x) => x * 3;
assert.equal(findSite(steep, { start: { x: 250, z: 70 }, zone: 'haven', minH: 1, maxH: 9, flat: 1, half: 5, clearance: 4, colliders: [], reach: 30 }), null);
// Local to world: the front of a rotated building looks where facing() says.
const turn = { x: 10, z: 20, rot: Math.PI / 2 };
const front = toWorld(turn, 0, 5); // 5 m in front
assert.ok(Math.abs(front.x - 15) < 1e-9 && Math.abs(front.z - 20) < 1e-9);
const rot = facing(0, 0, 100, 0); // looking east
assert.ok(Math.abs(toWorld({ x: 0, z: 0, rot }, 0, 1).x - 1) < 1e-9);
// Downhill: a slope that falls towards +x makes the front look at +x.
const slope = (x) => -x;
const d = downhill(slope, 0, 0);
assert.ok(Math.abs(toWorld({ x: 0, z: 0, rot: d }, 0, 1).x - 1) < 1e-6);

// The save is created on first write, and reads do not create it.
const r = new Game(null);
assert.equal(levelOf(r.state, 'speed', 'hut'), 0);
assert.equal(r.state.ext.panden, undefined);
pandenOf(r.state);
assert.ok(r.state.ext.panden.chest);

console.log('ok');
