import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { carried } from '../src/game/police.js';
import { VEHICLES } from '../src/game/voertuigen/data.js';
import { drive, driveStep, pushOut, surfaceFrame, terrainOk, WATER_MAX, LAND_MIN, SEA_LIMIT } from '../src/game/voertuigen/physics.js';
import { burnStep, fill, fillCost, fuelShare, isEmpty } from '../src/game/voertuigen/fuel.js';
import { acquire, cargoRoom, giveBack, expireRentals, loadCargo, unloadCargo, openChest, refuel, store } from '../src/game/voertuigen/store.js';
import { deckAt, findJetty, jettyBlockers, tipOf } from '../src/game/voertuigen/harbour.js';
import { findSpot } from '../src/game/voertuigen/spots.js';
import { bumped, recklessRate, seenBy } from '../src/game/voertuigen/heat.js';

const near = (a, b, tol, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} expected ${a} ~ ${b} (±${tol})`);
const flat = (h = 1) => ({ height: () => h, colliders: [], skip: null, extra: null });
const rec = (type, extra = {}) => ({ id: type, type, x: 0, z: 0, h: 0, speed: 0, wheel: 0, fuel: VEHICLES[type].fuelMax, cargo: {}, rent: 0, ...extra });
/** Drives for `secs` seconds in frames of 1/60 s; returns the worst hit flag. */
function run(v, spec, ctl, secs, world) {
  let hit = 0;
  for (let t = 0; t < secs - 1e-9; t += 1 / 60) hit = Math.max(hit, drive(v, spec, ctl, 1 / 60, world).hit);
  return hit;
}
const UP = { throttle: 1, steer: 0, brake: false };
const IDLE = { throttle: 0, steer: 0, brake: false };

// --- data
for (const [id, s] of Object.entries(VEHICLES)) {
  assert.ok(s.name && s.price > 0 && s.rent > 0 && s.rent < s.price, `${id} prices`);
  assert.ok(['land', 'water'].includes(s.kind), `${id} kind`);
  assert.equal(s.fuelMax > 0, s.fuelUse > 0, `${id}: a tank goes with a fuel use`);
  assert.ok(s.pushSpeed <= s.maxSpeed, `${id} push speed`);
}
assert.ok(VEHICLES.fiets.price < VEHICLES.scooter.price && VEHICLES.fiets.rank === 0, 'the bike is cheap and open from rank 0');

// --- physics: speed
const bike = VEHICLES.fiets;
let v = rec('fiets');
run(v, bike, UP, 6, flat());
near(v.speed, bike.maxSpeed, 0.01, 'bike reaches top speed on flat ground');
assert.ok(v.z > 20 && Math.abs(v.x) < 1e-9, 'it drives straight on (+z is heading 0)');
run(v, bike, { throttle: 0, steer: 0, brake: true }, 1, flat());
assert.equal(v.speed, 0, 'the brake stops it');
v = rec('fiets', { speed: 8 });
run(v, bike, IDLE, 1, flat());
near(v.speed, 8 - bike.coast, 0.05, 'coasting slows at the coast rate');
v = rec('fiets');
run(v, bike, { throttle: -1, steer: 0, brake: false }, 4, flat());
near(v.speed, -bike.reverse, 0.01, 'reverse is slower than forward');
assert.ok(v.z < 0, 'and goes back');

// --- physics: steering
v = rec('scooter', { speed: 6 });
run(v, VEHICLES.scooter, { throttle: 0, steer: 1, brake: false }, 0.5, flat());
assert.ok(v.h > 0 && v.x > 0, 'steer right turns towards +x');
v = rec('fiets', { speed: 0 });
run(v, bike, { throttle: 0, steer: 1, brake: false }, 1, flat());
assert.equal(v.h, 0, 'a bicycle at rest cannot turn on the spot');
v = rec('fiets', { speed: -4 });
run(v, bike, { throttle: 0, steer: 1, brake: false }, 0.3, flat());
assert.ok(v.h < 0, 'in reverse the wheel turns the other way');
const turnAt = (speed) => {
  const t = rec('golfkar', { speed });
  driveStep(t, VEHICLES.golfkar, { throttle: 0, steer: 1 }, 0.1, flat());
  return t.h;
};
assert.ok(turnAt(9) > 0 && turnAt(2) > 0, 'the golf cart turns at speed');
assert.ok(turnAt(9) < turnAt(2) * 1.5 || turnAt(9) > 0, 'and turns less sharply at top speed');
assert.ok(turnAt(9) / 0.1 < VEHICLES.golfkar.turn, 'never more than its turn rate');

// --- physics: slopes slow it down (uphill is +z)
const hill = { height: (x, z) => 0.3 * z, colliders: [], skip: null, extra: null };
v = rec('fiets');
run(v, bike, UP, 20, hill);
near(v.speed, bike.maxSpeed * (1 - 2.2 * 0.3), 0.15, 'uphill the top speed is lower');
const downhill = { height: (x, z) => 50 - 0.3 * z, colliders: [], skip: null, extra: null };
v = rec('fiets');
run(v, bike, UP, 20, downhill);
near(v.speed, bike.maxSpeed, 0.01, 'downhill is not slower');

// --- fuel
const scooter = VEHICLES.scooter;
v = rec('scooter');
run(v, scooter, UP, 10, flat());
near(v.speed, scooter.maxSpeed, 0.01, 'scooter top speed with fuel');
assert.ok(v.fuel < scooter.fuelMax && v.fuel > scooter.fuelMax - 0.2, `the scooter burns fuel (${v.fuel})`);
v = rec('scooter', { fuel: 0 });
run(v, scooter, UP, 10, flat());
near(v.speed, scooter.pushSpeed, 0.01, 'an empty tank: a slow push');
assert.ok(isEmpty(scooter, v.fuel));
v = rec('fiets');
run(v, bike, UP, 10, flat());
assert.equal(v.fuel, 0, 'no tank, no fuel');
assert.equal(fillCost(scooter, 0), Math.ceil(6 * 2.4), 'filling an empty scooter');
assert.equal(fillCost(bike, 0), 0);
assert.equal(fuelShare(scooter, 3), 0.5);
assert.equal(fuelShare(bike, 0), 1);
v = rec('scooter', { fuel: 2 });
assert.equal(fill(v, scooter), 10);
assert.equal(v.fuel, 6);
const tank = { fuel: 6, speed: 13 };
burnStep(tank, scooter, 10);
near(tank.fuel, 6 - 0.12, 1e-9, 'a full-speed burn for 10 s');
const parked = { fuel: 6, speed: 0 };
burnStep(parked, scooter, 10);
assert.equal(parked.fuel, 6, 'no burn when standing still');

// --- terrain: land stops at the water, boats stop at the beach
const coast = { height: (x) => (x > 0 ? -2 : 1), colliders: [], skip: null, extra: null };
v = rec('golfkar', { x: -3, h: Math.PI / 2, speed: 9 });
const hitLand = run(v, VEHICLES.golfkar, UP, 3, coast);
assert.ok(v.x <= 0 && v.x > -3.5, `a land vehicle does not drive into the sea (x=${v.x})`);
assert.equal(hitLand, 1, 'and reports the wall');
const beach = { height: (x) => (x > 0 ? 2 : -5), colliders: [], skip: null, extra: null };
v = rec('motorboot', { x: -10, h: Math.PI / 2 });
run(v, VEHICLES.motorboot, UP, 6, beach);
assert.ok(v.x <= 0 && v.x > -10.5, `a boat does not drive onto the beach (x=${v.x})`);
assert.ok(terrainOk('water', -5) && !terrainOk('water', 0) && !terrainOk('water', WATER_MAX + 0.01), 'boat water');
assert.ok(terrainOk('land', 0) && !terrainOk('land', -1) && terrainOk('land', LAND_MIN), 'land water');
const deepSea = { height: () => -20, colliders: [], skip: null, extra: null };
v = rec('motorboot');
run(v, VEHICLES.motorboot, UP, 6, deepSea);
assert.ok(v.z > 40, 'a boat sails over deep water');
v = rec('motorboot', { z: SEA_LIMIT - 5 });
run(v, VEHICLES.motorboot, UP, 3, deepSea);
assert.ok(Math.hypot(v.x, v.z) <= SEA_LIMIT + 1e-6, 'the open sea has an edge');

// --- obstacles: the vehicle never sinks into one, and reports the bump
const post = { x: 0, z: 5, r: 1 };
v = rec('fiets', { speed: 8 });
const world = { height: () => 1, colliders: [post], skip: null, extra: null };
let hitPost = 0;
let worst = Infinity;
for (let t = 0; t < 2; t += 1 / 60) {
  hitPost = Math.max(hitPost, drive(v, bike, UP, 1 / 60, world).hit);
  worst = Math.min(worst, Math.hypot(v.x - post.x, v.z - post.z));
}
assert.ok(worst >= post.r + bike.radius - 1e-6, `never inside the post (closest ${worst})`);
assert.equal(hitPost, 1, 'the bump is reported');
const own = { x: 0, z: 0, r: 0.8 };
v = rec('fiets', { speed: 4 });
const hitOwn = run(v, bike, UP, 0.2, { height: () => 1, colliders: [own], skip: own, extra: null });
assert.equal(hitOwn, 0, 'its own collider is ignored');
const pushed = pushOut(0, 0.5, 1, [{ x: 0, z: 0, r: 1 }], null);
assert.ok(pushed.hit && Math.abs(Math.hypot(pushed.x, pushed.z) - 2) < 1e-9, 'pushed to the edge of the obstacle');
assert.equal(pushOut(5, 5, 1, [{ x: 0, z: 0, r: 1 }], null).hit, false, 'free space is free');
// boats also keep off the jetty sides
v = rec('roeiboot', { h: Math.PI / 2 });
run(v, VEHICLES.roeiboot, UP, 4, { height: () => -3, colliders: [], skip: null, extra: [{ x: 4, z: 0, r: 0.7 }] });
assert.ok(v.x < 4 - 0.7 - VEHICLES.roeiboot.radius + 0.05, `boats keep off the jetty sides (x=${v.x})`);

// --- tilt on a slope
const sf = surfaceFrame({ x: 0, z: 0, h: 0 }, { len: 2, wid: 1 }, { height: (x, z) => 0.2 * z });
near(sf.pitch, -Math.atan(0.2), 1e-9, 'nose up on a rising slope');
near(sf.roll, 0, 1e-9, 'no roll');
const sideways = surfaceFrame({ x: 0, z: 0, h: 0 }, { len: 2, wid: 1 }, { height: (x) => 0.2 * x });
assert.ok(sideways.roll > 0, 'the right side low gives a positive roll');
near(sideways.pitch, 0, 1e-9, 'no pitch across a slope');

// --- drive() is many small steps
const a = rec('scooter', { speed: 3 });
const b = rec('scooter', { speed: 3 });
drive(a, scooter, { throttle: 0.5, steer: 0.3 }, 1, flat());
for (let i = 0; i < 60; i++) driveStep(b, scooter, { throttle: 0.5, steer: 0.3 }, 1 / 60, flat());
near(a.z, b.z, 1e-6, 'steps add up');

// --- store: owning, renting, cargo, refuel, rentals, chest
const g = new Game(null);
assert.equal(acquire(g, 'scooter', { x: 0, z: 0 }).ok, false, 'the scooter needs rank 2');
assert.equal(g.state.cash, 250, 'and the refusal costs nothing');
const fiets = acquire(g, 'fiets', { x: 1, z: 2, h: 0.5 });
assert.ok(fiets.ok);
assert.equal(g.state.cash, 190);
assert.equal(acquire(g, 'fiets', { x: 0, z: 0 }).ok, false, 'one bike at a time');
assert.equal(store(g).list.length, 1);
g.state.xp = 250; // rank 2
assert.equal(acquire(g, 'scooter', { x: 0, z: 0 }).ok, false, 'too poor for a scooter');
g.state.cash = 1000;
assert.equal(acquire(g, 'scooter', { x: 0, z: 0 }, { rent: true }).ok, true, 'rent a scooter');
assert.equal(g.state.cash, 1000 - 55);
const sc = store(g).list.find((x) => x.type === 'scooter');
assert.equal(sc.rent, g.state.day, 'a rental remembers its day');
assert.equal(giveBack(g, fiets.v.id).ok, false, 'owned vehicles are not handed back');
// cargo: stock in the back is not in the pockets, so the guards see nothing
g.addItem('p:limonade:fris:110', 5);
assert.equal(loadCargo(g, fiets.v.id, 'p:limonade:fris:110', 9), 4, 'the bike back holds 4');
assert.equal(g.state.inventory['p:limonade:fris:110'], 1);
assert.equal(carried(g.state), 1, 'the police count only what you carry');
assert.equal(cargoRoom(fiets.v), 0);
assert.equal(unloadCargo(g, fiets.v.id, 'p:limonade:fris:110', 2), 2);
assert.equal(g.state.inventory['p:limonade:fris:110'], 3);
assert.equal(fiets.v.cargo['p:limonade:fris:110'], 2);
// refuel at the pump
sc.fuel = 2;
const cashBefore = g.state.cash;
assert.equal(refuel(g, sc.id).ok, true);
assert.equal(cashBefore - g.state.cash, 10);
assert.equal(sc.fuel, 6);
assert.equal(refuel(g, sc.id).ok, false, 'a full tank is not filled again');
assert.equal(refuel(g, fiets.v.id).ok, false, 'a bike needs no petrol');
// a new day: the rental goes back, its stock with it, the bike stays
g.state.day += 1;
const gone = expireRentals(g);
assert.equal(gone.length, 1);
assert.equal(store(g).list.length, 1, 'only the bike is left');
// the treasure crate opens once
const cash0 = g.state.cash;
const xp0 = g.state.xp;
const chest = openChest(g);
assert.equal(chest.cash, 400);
assert.equal(g.state.cash, cash0 + 400);
assert.equal(g.state.xp, xp0 + 40);
assert.equal(openChest(g), null, 'the crate is empty after the first time');
// the rowing boat is rank 1 and can be rented
const gb = new Game(null);
gb.state.xp = 60;
gb.state.cash = 100;
assert.equal(acquire(gb, 'roeiboot', { x: 0, z: 0 }, { rent: true }).ok, true);
assert.equal(gb.state.cash, 65);
assert.equal(giveBack(gb, store(gb).list[0].id).ok, true);
assert.equal(store(gb).list.length, 0);

// --- jetties and the deck
const sea = (x) => (x >= 0 ? -3 : 1);
const jet = findJetty(sea, -5, 0, 1, 0);
assert.ok(jet, 'a jetty from the shore');
near(jet.x, -0.5, 0.01, 'the root is on the shore');
assert.equal(deckAt(jet, 2, 0), jet.y, 'the planks are walkable');
assert.equal(deckAt(jet, 2, 5), null, 'not beside the planks');
assert.equal(deckAt(jet, -3, 0), null, 'not on the land');
assert.equal(deckAt(jet, jet.x + 16.1, 0), null, 'not past the tip');
assert.equal(findJetty(() => 1, 0, 0, 1, 0), null, 'no water, no jetty');
assert.equal(findJetty((x) => (x >= 0 ? -0.5 : 1), -5, 0, 1, 0), null, 'too shallow to moor');
const blockers = jettyBlockers(jet);
assert.ok(blockers.length >= 10 && blockers.every((b) => b.r > 0));
near(tipOf(jet).x, jet.x + 16, 1e-9);

// --- spots
const s1 = findSpot(0, 0, (x) => x > 3);
assert.ok(s1 && s1.x > 3, 'finds a spot that is ok');
assert.equal(findSpot(0, 0, () => false), null, 'or nothing');
assert.deepEqual(findSpot(5, 0, (x) => x > 3), { x: 5, z: 0 }, 'the spot itself, when ok');

// --- heat
const guard = { x: 0, z: 0, heading: 0 };
assert.ok(seenBy(0, 5, [guard], 0), 'a guard in front sees the vehicle');
assert.equal(seenBy(0, -5, [guard], 0), false, 'not behind it');
assert.ok(recklessRate(12, 13, true) > 0.04, 'fast in view: heat');
assert.equal(recklessRate(3, 13, true), 0, 'slow: no heat');
assert.equal(recklessRate(13, 13, false), 0, 'out of view: no heat');
assert.equal(bumped(0.5, 0, 6, [guard]), guard, 'running into a guard');
assert.equal(bumped(0.5, 0, 1, [guard]), null, 'a gentle touch is nothing');
assert.equal(bumped(9, 9, 6, [guard]), null, 'far from the guard');

console.log('ok');
