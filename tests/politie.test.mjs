import assert from 'node:assert/strict';
import { Game, DAY_START } from '../src/game/state.js';
import { pol, logEvent, addInbox, unreadInbox, markInboxRead, LOG_MAX, INBOX_MAX } from '../src/game/politie/state.js';
import { arrestPlan, resolveArrest, skipTime, recentArrests, takeGoods, goodsCarried, goodsOwned, ARREST_WINDOW } from '../src/game/politie/arrest.js';
import { caught, heatLevel } from '../src/game/police.js';
import { planRaids, applyRaids, raidChance, securityOf, seizeShare } from '../src/game/politie/raid.js';
import { bribeCop, bribeBlocked, bribeCost, buyDisguise, isDisguised, BRIBE_DROP, DISGUISE_PRICE } from '../src/game/politie/shop.js';
import { newStamina, stepStamina, canRun, STAMINA_MAX, WAKE_AT } from '../src/game/politie/stamina.js';
import { makeRoute, along, routeAt, driveCar, crossed } from '../src/game/politie/route.js';
import { carsFor, roadblockFor, checkpointOutcome, CHECKPOINT_HEAT } from '../src/game/politie/cars.js';
import { PERSONAS, personaOf, partnerOf, hearRadius, radioRecipients } from '../src/game/politie/personality.js';
import { hidingSpots, hideSpotAt, inHideSpot, placeBushes, BUSH_HIDE, HOTEL_HIDE } from '../src/game/politie/hide.js';
import { TAUNTS, tauntFor, isThreat, THREAT_CHANCE } from '../src/game/politie/taunts.js';
import { LEVEL_TEXT, levelLine, bailResult, cellResult, opener, OPENERS } from '../src/game/politie/texts.js';
import { moveRival, rollRival } from '../src/game/rivals.js';
import { PROPERTIES } from '../src/game/data/properties.js';

const KEY = 'citroen';
const LIM = 'p:limonade:fris:100';
const SNOEP = 'p:snoep:zoet:100';
const game = (over = {}) => {
  const g = new Game(null);
  Object.assign(g.state, { day: 5, minutes: 600, cash: 1000, ...over });
  return g;
};

// ---------------------------------------------------------------- save data
{
  const g = game();
  const ext = pol(g.state);
  assert.deepEqual(ext.arrests, []);
  assert.equal(ext.pending, false);
  assert.equal(pol(g.state), ext, 'same object every time');
  // a save that has the feature's data keeps it as it is
  g.state.ext.politie = { arrests: [], pending: false, bribedDay: 0, disguiseDay: 0, log: [], inbox: [], raids: 2 };
  assert.equal(pol(g.state).raids, 2);
  assert.deepEqual(pol(g.state).log, []);
  // no save data yet: the defaults are made
  const fresh = game();
  assert.equal(fresh.state.ext.politie, undefined);
  assert.deepEqual(pol(fresh.state).inbox, []);
  assert.equal(pol(fresh.state).raids, 0);
  for (let i = 0; i < LOG_MAX + 5; i++) logEvent(g.state, 'test', `regel ${i}`);
  assert.equal(pol(g.state).log.length, LOG_MAX);
  assert.equal(pol(g.state).log[0].text, `regel ${LOG_MAX + 4}`, 'newest first');
  for (let i = 0; i < INBOX_MAX + 3; i++) addInbox(g.state, { title: 't', text: `m${i}` });
  assert.equal(pol(g.state).inbox.length, INBOX_MAX);
  assert.equal(unreadInbox(g.state), INBOX_MAX);
  markInboxRead(g.state);
  assert.equal(unreadInbox(g.state), 0);
}

// ---------------------------------------------------------------- arrests
{
  const g = game({ cash: 1000 });
  g.addItem(LIM, 6);
  g.addItem(KEY, 9); // plain goods stay with you
  let plan = arrestPlan(g.state);
  assert.equal(plan.goods, 6);
  assert.equal(plan.nights, 1);
  assert.equal(plan.bail, 60);
  assert.equal(plan.cashLoss, 300);
  assert.equal(plan.keep, 3);
  assert.equal(plan.canBail, true);
  // a catch within the window raises the sentence and the cash loss
  pol(g.state).arrests = [g.state.day - 1];
  plan = arrestPlan(g.state);
  assert.equal(plan.recent, 1);
  assert.equal(plan.nights, 2);
  assert.equal(plan.bail, 90);
  assert.equal(plan.cashLoss, 400);
  // outside the window it does not count
  pol(g.state).arrests = [g.state.day - ARREST_WINDOW];
  assert.equal(recentArrests(pol(g.state), g.state.day), 0);
  pol(g.state).arrests = [g.state.day - 1, g.state.day - 2, g.state.day - 3];
  assert.equal(arrestPlan(g.state).nights, 3, 'three nights at most');
  assert.equal(arrestPlan(g.state).cashLoss, 600, 'cash loss is capped at 60%');
}

{
  // the cell: all product gone, 30% of cash, heat 2, the catch is saved
  const g = game({ cash: 1000, heat: 4.5 });
  g.addItem(LIM, 6);
  g.addItem(KEY, 9);
  g.state.ext.politie = undefined;
  const r = resolveArrest(g, { bail: false });
  assert.equal(r.bail, false);
  assert.equal(r.lost, 6);
  assert.equal(r.cashLost, 300);
  assert.equal(g.state.cash, 700);
  assert.equal(goodsCarried(g.state), 0);
  assert.equal(g.state.inventory[KEY], 9, 'plain goods stay');
  assert.equal(g.state.heat, 2);
  assert.deepEqual(pol(g.state).arrests, [5]);
  assert.equal(r.nights, 1);
  assert.match(pol(g.state).log[0].text, /Gepakt: 6 stuks kwijt, €300 boete/);
}

{
  // bail: pay it, keep half of the product, no cash loss, no night
  const g = game({ cash: 1000, heat: 4 });
  g.addItem(LIM, 7);
  const r = resolveArrest(g, { bail: true });
  assert.equal(r.bail, true);
  assert.equal(r.paid, 60);
  assert.equal(g.state.cash, 940, 'bail is paid, cash is kept');
  assert.equal(r.keep, 3);
  assert.equal(r.lost, 4);
  assert.equal(goodsCarried(g.state), 3);
  assert.equal(r.nights, 0);
  const before = g.state.day;
  skipTime(g, r);
  assert.equal(g.state.day, before, 'a bail release does not skip the night');
  assert.equal(g.state.minutes, 600 + 60);
}

{
  // no money for bail: the cell instead
  const g = game({ cash: 50 });
  g.addItem(LIM, 2);
  const r = resolveArrest(g, { bail: true });
  assert.equal(r.bail, false);
  assert.equal(r.nights, 1);
  assert.equal(r.cashLost, 15);
}

{
  // the sleep: a night in the cell is a sleep to the morning, and repeats are longer
  const g = game({ cash: 100, minutes: 900, day: 3 });
  const r = resolveArrest(g, { bail: false });
  skipTime(g, r);
  assert.equal(g.state.day, 4);
  assert.equal(g.state.minutes, DAY_START);
  pol(g.state).arrests = [3];
  g.state.day = 4;
  g.state.minutes = 900;
  const r2 = resolveArrest(g, { bail: false });
  assert.equal(r2.nights, 2);
  skipTime(g, r2);
  assert.equal(g.state.day, 6);
}

{
  // caught(): with the politie feature (a listener) the arrest waits; without, it is settled at once
  const g = game({ heat: 4.5, cash: 200 });
  g.addItem(LIM, 4);
  let waiting = 0;
  g.on('politie:arrest', () => waiting++);
  const msg = caught(g);
  assert.equal(waiting, 1);
  assert.equal(pol(g.state).pending, true);
  assert.equal(g.state.cash, 200, 'nothing taken until the choice');
  assert.equal(goodsCarried(g.state), 4);
  assert.match(msg, /Gepakt/);
  resolveArrest(g, { bail: false });
  assert.equal(pol(g.state).pending, false);

  const h = game({ heat: 4.5, cash: 200 });
  h.addItem(LIM, 4);
  caught(h);
  assert.equal(goodsCarried(h.state), 0, 'no listener: settled at once');
  assert.equal(h.state.cash, 140);
  assert.equal(heatLevel(h.state), 2);
}

{
  const g = game({ cash: 10 });
  g.addItem(LIM, 9);
  assert.equal(takeGoods(g.state, 4), 4);
  assert.equal(g.state.inventory[LIM], 5);
  assert.equal(takeGoods(g.state, 99), 5);
  assert.equal(LIM in g.state.inventory, false);
}

// texts follow the numbers
assert.match(bailResult({ lost: 4, keep: 3 }), /Je houdt 3 stuks over/);
assert.match(cellResult({ lost: 6, cashLost: 300 }), /6 stuks en €300/);
assert.equal(LEVEL_TEXT.length, 5);
assert.match(levelLine(4), /Achtervolging/);
assert.ok(OPENERS.includes(opener(5)));

// ---------------------------------------------------------------- raids
{
  assert.equal(raidChance(2), 0);
  assert.equal(raidChance(3), 0.3);
  assert.equal(raidChance(4), 0.5);
  assert.equal(seizeShare(0), 0.45);
  assert.equal(seizeShare(3), 0);
  const g = game({ properties: ['hut', 'loods'] });
  g.addItem(LIM, 20);
  g.addItem(SNOEP, 10);
  assert.deepEqual(planRaids(g.state, 2, () => 0), [], 'no raids below level 3');
  // rand 0: every place is searched. The hut holds 40 of the 190 storage: 20% of the goods.
  const plans = planRaids(g.state, 3, () => 0);
  assert.equal(plans.length, 2);
  const limit = PROPERTIES.hut.storage + PROPERTIES.loods.storage;
  const hut = plans.find((p) => p.id === 'hut');
  assert.equal(hut.total, Math.floor(30 * (PROPERTIES.hut.storage / limit) * 0.45));
  // rand high: nothing happens
  assert.deepEqual(planRaids(g.state, 4, () => 0.99), []);
  // the seized product never exceeds what is there
  const total = plans.reduce((n, p) => n + p.total, 0);
  assert.ok(total <= 30);
  // security upgrades keep them out
  g.state.ext = { panden: { security: { hut: 3 } } };
  assert.equal(securityOf(g.state, 'hut'), 3);
  const safe = planRaids(g.state, 3, () => 0).find((p) => p.id === 'hut');
  assert.equal(safe.total, 0);
  g.state.ext = { panden: { security: { hut: true } } };
  assert.equal(securityOf(g.state, 'hut'), 1);
  assert.equal(securityOf({ ext: {} }, 'hut'), 0);
}

{
  const g = game({ properties: ['hut'] });
  g.addItem(LIM, 20);
  const plans = planRaids(g.state, 4, () => 0);
  assert.equal(plans[0].total, Math.floor(20 * 0.45));
  const before = goodsCarried(g.state);
  const msgs = applyRaids(g, plans);
  assert.equal(goodsCarried(g.state), before - plans[0].total);
  assert.equal(msgs[0].title, 'Politie-inval');
  assert.match(msgs[0].text, /Strandhut/);
  assert.equal(unreadInbox(g.state), 1, 'the summary arrives in the Politie app');
  assert.equal(pol(g.state).raids, 1);
  // a search that finds nothing
  const h = game({ properties: ['hut'] });
  const none = applyRaids(h, planRaids(h.state, 3, () => 0));
  assert.match(none[0].text, /niets/);
  assert.equal(none[0].title, 'Politiebezoek');
}

// ---------------------------------------------------------------- chests: raids and caught-losses
{
  // a searched place loses the same share of its chest as of the carried stock (45% here)
  const g = game({ properties: ['hut'] });
  g.state.ext = { panden: { chest: { hut: { [LIM]: 20 } } } };
  const plans = planRaids(g.state, 4, () => 0);
  assert.deepEqual(plans[0].chest, { [LIM]: 9 });
  assert.deepEqual(plans[0].seized, {});
  assert.equal(plans[0].total, 9);
  applyRaids(g, plans);
  assert.equal(g.state.ext.panden.chest.hut[LIM], 11);
  assert.equal(unreadInbox(g.state), 1);
  // with three security upgrades the chest is safe; a chest that is empty is not searched for
  g.state.ext = { panden: { security: { hut: 3 }, chest: { hut: { [LIM]: 20 } } } };
  assert.equal(planRaids(g.state, 4, () => 0)[0].total, 0);
  // carried goods and the chest share one raid
  const h = game({ properties: ['hut'] });
  h.addItem(LIM, 20);
  h.state.ext = { panden: { chest: { hut: { [LIM]: 20 } } } };
  const both = planRaids(h.state, 4, () => 0)[0];
  assert.equal(both.total, 9 + 9);
  assert.equal(both.seized[LIM], 9);
  assert.equal(both.chest[LIM], 9);
  applyRaids(h, [both]);
  assert.equal(h.state.inventory[LIM], 11);
  assert.equal(h.state.ext.panden.chest.hut[LIM], 11);
}
{
  // a caught-loss takes the carried goods first, then the chests; without bail all of it is gone
  const g = game({ properties: ['hut'], cash: 1000 });
  g.addItem(LIM, 4);
  g.state.ext = { panden: { chest: { hut: { [LIM]: 20, [KEY]: 5 } } } };
  assert.equal(goodsOwned(g.state), 24);
  assert.equal(arrestPlan(g.state).goods, 24);
  assert.equal(takeGoods(g.state, 10), 10);
  assert.equal(LIM in g.state.inventory, false);
  assert.equal(g.state.ext.panden.chest.hut[LIM], 14);
  assert.equal(g.state.ext.panden.chest.hut[KEY], 5, 'plain goods are not product: they stay');
  const r = resolveArrest(g, { bail: false });
  assert.equal(r.lost, 14);
  assert.equal(goodsOwned(g.state), 0);
  assert.equal(g.state.ext.panden.chest.hut[KEY], 5);
}
{
  // with bail you keep half of everything you own, carried or stored
  const g = game({ properties: ['hut'], cash: 1000 });
  g.state.ext = { panden: { chest: { hut: { [LIM]: 30 } } } };
  const r = resolveArrest(g, { bail: true });
  assert.equal(r.bail, true);
  assert.equal(r.lost, 15);
  assert.equal(g.state.ext.panden.chest.hut[LIM], 15);
}

// ---------------------------------------------------------------- the police contact and disguise
{
  const g = game({ heat: 2.5, cash: 500 });
  assert.equal(bribeBlocked(g.state), null);
  const cost = bribeCost(2);
  const r = bribeCop(g, () => 0.9); // no failure
  assert.equal(r.ok, true);
  assert.equal(r.cost, cost);
  assert.equal(g.state.cash, 500 - cost);
  assert.ok(Math.abs(g.state.heat - (2.5 - BRIBE_DROP)) < 1e-9);
  assert.equal(bribeBlocked(g.state), 'vandaag', 'once a day');
  assert.equal(bribeCop(g, () => 0.9).ok, false);
  g.state.day += 1;
  g.state.heat = 0.2;
  assert.equal(bribeBlocked(g.state), 'rustig');
}

{
  const g = game({ heat: 3.2, cash: 500 });
  const r = bribeCop(g, () => 0.1); // the colleagues are called
  assert.equal(r.ok, false);
  assert.equal(r.failed, true);
  assert.ok(g.state.heat > 3.2, 'the heat goes up');
  assert.equal(g.state.cash, 500 - bribeCost(3));
}

{
  const g = game({ heat: 3, cash: 100 });
  assert.equal(bribeBlocked(g.state), 'geld');
  assert.equal(bribeCop(g).ok, false);
  assert.equal(g.state.cash, 100);
}

{
  const g = game({ cash: 50 });
  assert.equal(buyDisguise(g).ok, false, 'not enough cash');
  g.state.cash = 500;
  assert.equal(isDisguised(g.state), false);
  assert.equal(buyDisguise(g).ok, true);
  assert.equal(g.state.cash, 500 - DISGUISE_PRICE);
  assert.equal(isDisguised(g.state), true);
  assert.equal(buyDisguise(g).reason, 'al');
  g.state.day += 1;
  assert.equal(isDisguised(g.state), false, 'the disguise is for one day');
}

// ---------------------------------------------------------------- stamina
{
  const st = newStamina();
  assert.equal(canRun(st), true);
  stepStamina(st, { moving: true, running: true }, 1);
  assert.equal(st.value, STAMINA_MAX - 26);
  stepStamina(st, { moving: true, running: true, swimming: true }, 1);
  assert.equal(st.value, STAMINA_MAX - 26 - 14, 'swimming drains less');
  stepStamina(st, { moving: true }, 1);
  assert.equal(st.value, STAMINA_MAX - 26 - 14 + 12, 'walking refills');
  stepStamina(st, {}, 1);
  assert.equal(st.value, STAMINA_MAX - 26 - 14 + 12 + 20, 'standing still refills faster');
  const dry = { value: 5, out: false };
  stepStamina(dry, { moving: true, running: true }, 1);
  assert.equal(dry.value, 0);
  assert.equal(canRun(dry), false, 'out of breath');
  stepStamina(dry, {}, 1);
  assert.equal(canRun(dry), false, 'still out until it is back at 30');
  stepStamina(dry, {}, 2);
  assert.ok(dry.value >= WAKE_AT);
  assert.equal(canRun(dry), true);
}

// ---------------------------------------------------------------- police cars and routes
{
  const line = [[0, 0], [30, 0], [30, 40]];
  const route = makeRoute(line);
  assert.equal(route.total, 70);
  assert.equal(along(route, 1, 0.5), 30 + 20, 'the middle of the second segment');
  const p = routeAt(route, 15);
  assert.equal(p.x, 15);
  assert.equal(p.z, 0);
  assert.ok(Math.abs(p.heading - Math.PI / 2) < 1e-9, 'east: atan2(dx, dz)');
  const q = routeAt(route, 50);
  assert.equal(q.x, 30);
  assert.equal(q.z, 20);
  assert.equal(routeAt(route, 999).z, 40, 'clamped to the end');
  const car = { s: 68, dir: 1 };
  driveCar(car, route, 1, 10);
  assert.equal(car.dir, -1, 'turns at the end');
  assert.equal(car.s, 70);
  driveCar(car, route, 2, 10);
  assert.equal(car.s, 50);
  assert.equal(crossed(10, 20, 15), true);
  assert.equal(crossed(10, 20, 25), false);
  assert.equal(crossed(20, 10, 15), true, 'backwards too');
}

{
  assert.equal(carsFor(2), 0);
  assert.equal(carsFor(3), 1);
  assert.equal(carsFor(4), 2);
  assert.equal(roadblockFor(3), false);
  assert.equal(roadblockFor(4), true);
  assert.equal(checkpointOutcome(4, false), null, 'not near: no check');
  assert.deepEqual(checkpointOutcome(0, true), { heat: 0, searched: false });
  assert.deepEqual(checkpointOutcome(3, true), { heat: CHECKPOINT_HEAT, searched: true });
}

// ---------------------------------------------------------------- guard personalities
{
  assert.equal(personaOf(0), 'normaal');
  assert.equal(personaOf(1), 'alert');
  assert.equal(personaOf(2), 'lui');
  assert.equal(personaOf(3), 'maat');
  assert.equal(personaOf(4), 'normaal');
  assert.equal(partnerOf(3, 'maat'), 2, 'the buddy walks with the guard before him');
  assert.equal(partnerOf(2, 'lui'), null);
  assert.equal(partnerOf(0, 'maat'), null);
  assert.ok(PERSONAS.lui.wait[0] > PERSONAS.alert.wait[1], 'the lazy one stands around longer');
  assert.ok(hearRadius(PERSONAS.alert, 'run') > hearRadius(PERSONAS.lui, 'run'));
  assert.equal(hearRadius(PERSONAS.normaal, 'nope'), 0);
  const guards = [
    { x: 0, z: 0, alert: 0, name: 'a' },
    { x: 5, z: 0, alert: 0, name: 'b' },
    { x: 60, z: 0, alert: 0, name: 'c' },
    { x: 3, z: 2, alert: 6, name: 'd' },
  ];
  const got = radioRecipients(guards, guards[0], 42).map((g) => g.name);
  assert.deepEqual(got, ['b'], 'only the free ones within range');
}

// ---------------------------------------------------------------- hiding
{
  const hotel = { x: 10, z: 10 };
  const bushes = [{ x: -50, z: 0 }];
  const spots = hidingSpots({ hotel, bushes });
  assert.equal(spots.length, 2);
  assert.equal(spots[0].kind, 'hotel');
  assert.equal(hideSpotAt(spots, 12, 11).kind, 'hotel');
  assert.equal(hideSpotAt(spots, 10 + HOTEL_HIDE + 1, 10), null);
  assert.equal(inHideSpot(spots, -50 + BUSH_HIDE - 0.1, 0), true);
  assert.equal(inHideSpot(spots, 0, 0), false);
  assert.equal(inHideSpot([], 0, 0), false);
}

{
  // deterministic bushes: a fake island, flat land with a path along x = 0
  let seed = 7;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const heightAt = (x, z) => (x > -200 && x < 200 ? 5 : -2);
  const pathDistance = (x) => Math.abs(x);
  const bushes = placeBushes(rand, { heightAt, pathDistance, colliders: [{ x: 60, z: 60, r: 4 }], n: 10, box: [-150, 150, -150, 150] });
  assert.ok(bushes.length > 3, 'some bushes are placed');
  for (const b of bushes) {
    assert.ok(Math.abs(b.x) >= 5 && Math.abs(b.x) <= 45, 'near the path, not on it');
    assert.ok(Math.hypot(b.x - 60, b.z - 60) > 8);
  }
  for (let i = 0; i < bushes.length; i++)
    for (let j = i + 1; j < bushes.length; j++) assert.ok(Math.hypot(bushes[i].x - bushes[j].x, bushes[i].z - bushes[j].z) >= 14);
}

// ---------------------------------------------------------------- taunts
{
  let k = 0;
  const seq = () => (k++ * 0.37) % 1;
  for (const id of Object.keys(TAUNTS)) {
    for (let i = 0; i < 8; i++) assert.ok(TAUNTS[id].lines.includes(tauntFor(id, seq)));
    assert.ok(TAUNTS[id].threats.includes(tauntFor(id, seq, true)));
  }
  assert.ok(TAUNTS.lex.lines.length >= 3 && TAUNTS.gina.lines.length >= 3);
  assert.equal(isThreat(() => 0), true);
  assert.equal(isThreat(() => 0.99), false);
  assert.ok(THREAT_CHANCE > 0 && THREAT_CHANCE < 0.5);
  // non-violent: no threat says anything about hitting or hurting
  for (const id of Object.keys(TAUNTS)) for (const t of [...TAUNTS[id].lines, ...TAUNTS[id].threats]) assert.doesNotMatch(t, /sla|pak je|geweld|kapot/i);
}

// ---------------------------------------------------------------- rivals walk over
{
  const g = game({ rival: null, xp: 150, rank: 1 });
  assert.equal(moveRival(g, () => 0), null, 'no rival, no move');
  g.state.rival = { id: 'lex', spot: 'strand' };
  assert.equal(moveRival(g, () => 0.99), null, 'most hours they stay');
  assert.equal(moveRival(g, () => 0.1), 'haven');
  assert.equal(g.state.rival.spot, 'haven');
  assert.equal(moveRival(g, () => 0.1), 'strand', 'and back');
  rollRival(g, () => 0.1);
  assert.ok(g.state.rival === null || ['strand', 'haven'].includes(g.state.rival.spot));
}

console.log('politie ok');
