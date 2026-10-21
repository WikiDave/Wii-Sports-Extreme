import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { MISSIONS, openMission } from '../src/game/missies/data.js';
import { ACHIEVEMENTS } from '../src/game/missies/achievements.js';
import {
  ensureExt, current, progressOf, evaluate, handIn, dialogue, describeGoal, rewardText, observeChange, observeDeal,
  observeNewDay, observeMove, markVisit, checkAchievements, achievementProgress, metricsOf, unseenAchievements, applyBrew,
  observeFrisk, observeHeat, emptyExt,
} from '../src/game/missies/tracker.js';
import { SKILLS, SKILL_IDS, skillBonus, skillLevel, buySkill, pointsEarned, pointsFree, bagBonus, boostKey, effectText, MAX_LEVEL } from '../src/game/missies/skills.js';
import { STEPS, tutorialStep, hideHint, skipTutorial, tickHint, showHints, HINT_SECONDS } from '../src/game/missies/tutorial.js';
import { pierPoint, waterPoint, spotBeside } from '../src/game/missies/places.js';
import { mix, itemKey, sell, buy } from '../src/game/economy.js';
import { stockLimit } from '../src/game/empire.js';

// ---- data sanity
assert.ok(MISSIONS.length >= 25, 'a chain of about 25 missions');
assert.equal(new Set(MISSIONS.map((m) => m.id)).size, MISSIONS.length, 'mission ids are unique');
for (const m of MISSIONS) {
  assert.ok(m.intro.length && m.done.length && (m.nudge ?? []).length, `texts for ${m.id}`);
  assert.ok(describeGoal(m.goal).length > 5, `goal text for ${m.id}`);
  assert.ok(m.reward && (m.reward.cash ?? 0) >= 0, `reward for ${m.id}`);
}
for (let k = 1; k <= 6; k++) assert.ok(describeGoal(openMission(k).goal).length > 5);
assert.ok(ACHIEVEMENTS.length >= 40, 'about 40 achievements');
assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length, 'achievement ids are unique');
assert.equal(SKILLS.length, 6);

// ---- a new game: the first mission is to talk to Oma Mies, she hands in and starts the next one
const g = new Game(null);
const ext = ensureExt(g);
assert.equal(ext.chain, 0);
assert.equal(current(ext).id, 'welkom');
assert.equal(progressOf(g, ext).done, false);
assert.equal(evaluate(g, ext), false);
const first = dialogue(g, ext);
assert.equal(first.handed.mission.id, 'welkom', 'the first talk hands in the first mission');
assert.equal(ext.chain, 1);
assert.equal(ext.done, 1);
assert.equal(g.state.cash, 250 + 50, 'reward cash');
assert.equal(g.state.xp, 10, 'reward xp');
assert.ok(first.lines.length >= 4, 'intro, done, reward and the next intro');
assert.ok(first.lines.some((l) => l.includes('Je krijgt')), 'reward line');
assert.equal(ext.introAt, 1, 'the next intro was said');

// citroenen: four in stock, counted from the state (not a counter)
g.state.inventory.citroen = 3;
assert.equal(evaluate(g, ext), false);
g.state.inventory.citroen = 4;
assert.equal(evaluate(g, ext), true);
assert.equal(evaluate(g, ext), false, 'ready only once');
const second = dialogue(g, ext);
assert.equal(second.handed.mission.id, 'citroenen');
assert.equal(ext.chain, 2);
assert.equal(ext.ready, false);

// the next talk without a ready mission: a nudge with what is still missing
const talkAgain = dialogue(g, ext);
assert.equal(talkAgain.handed, null);
assert.ok(talkAgain.lines[0].length > 3);

// ---- counters count from the moment the mission started
// eerste-glas: one batch started in a machine
g.state.jobs.push({ id: 'a1', product: 'limonade', key: 'p:limonade:fris:100', yield: 4 });
observeChange(g, ext);
assert.equal(ext.stats.batches, 1);
assert.equal(ext.stats.made.limonade, 1);
assert.equal(evaluate(g, ext), true, 'the first batch is the goal');
handIn(g, ext);
assert.equal(ext.chain, 3);
// the batch is only counted once
observeChange(g, ext);
assert.equal(ext.stats.batches, 1);

// eerste-klant: one sale, counted from the start of this mission
assert.equal(evaluate(g, ext), false);
observeDeal(ext, { customer: 'x', sold: 1, money: 20, tip: 0 });
assert.equal(evaluate(g, ext), true);
handIn(g, ext);
assert.equal(ext.stats.sold, 1);

// vaste-kring: three different customers
g.state.customers = { a: { deals: 1 }, b: { deals: 1 } };
assert.equal(evaluate(g, ext), false);
g.state.customers.c = { deals: 2 };
assert.equal(evaluate(g, ext), true);
handIn(g, ext);
assert.ok(ext.titles.includes('Vriendelijke verkoper'), 'title reward');

// op-voorraad: ten sales from the start of this mission (not the ones before)
observeDeal(ext, { sold: 5, money: 1, tip: 0 });
assert.equal(progressOf(g, ext).value, 5, 'counts from the start of the mission');
observeDeal(ext, { sold: 5, money: 1, tip: 0 });
assert.equal(evaluate(g, ext), true);

// ---- skills: points from rank and missions, buying levels, effects
const s = { ext: {} };
assert.equal(pointsEarned(s, 0), 1);
assert.equal(pointsEarned(s, 2), 5);
assert.equal(buySkill(s, 'charme', 0), true);
assert.equal(buySkill(s, 'charme', 0), false, 'no point left');
assert.equal(pointsFree(s, 0), 0);
assert.equal(buySkill(s, 'charme', 2), true);
assert.equal(buySkill(s, 'charme', 2), true);
assert.equal(buySkill(s, 'charme', 2), false, 'at most three levels');
assert.equal(skillLevel(s, 'charme'), MAX_LEVEL);
assert.equal(skillBonus(s, 'charme'), 6);
assert.equal(skillBonus(s, 'onderhandelen'), 0);
assert.equal(buySkill(s, 'onderhandelen', 2), true);
assert.equal(skillBonus(s, 'onderhandelen'), 0.04);
assert.equal(buySkill(s, 'bestaat-niet', 9), false);
assert.ok(Math.abs(skillBonus({ ext: { missies: { skills: { brouwen: 3 } } } }, 'brouwen') - 0.15) < 1e-9);
assert.equal(boostKey('p:limonade:fris:100', 0.05), 'p:limonade:fris:105');
assert.equal(boostKey('p:snoep:zoet+fris:140', 0.15), 'p:snoep:zoet+fris:150', 'capped at 150');
assert.equal(boostKey('citroen', 0.05), 'citroen', 'goods are not changed');
assert.equal(bagBonus({ ext: { missies: { skills: { 'zware-zak': 2 } } } }), 40);
assert.ok(effectText('uithouding', 2).includes('25'), 'uithouding at two levels: 25 s');
assert.equal(effectText('sluipen', 0), '');
assert.ok(SKILL_IDS.every((id) => SKILLS.find((x) => x.id === id).unit(0.04) !== undefined));

// stock: the Zware zak skill makes room (economy and empire read the same bonus)
const sg = new Game(null);
const base = stockLimit(sg.state);
sg.state.ext = { missies: { skills: { 'zware-zak': 3 } } };
assert.equal(stockLimit(sg.state), base + 60, 'the stock limit grows by the skill');
// Brouwen: a batch started after the skill was bought gets better quality, once
const bg = new Game(null);
bg.state.ext = { missies: { skills: { brouwen: 2 } } };
bg.state.jobs.push({ id: 'b1', product: 'limonade', key: 'p:limonade:fris:100', yield: 4 });
assert.equal(applyBrew(bg.state, 2, 0.10), 1);
assert.equal(bg.state.jobs[0].key, 'p:limonade:fris:110');
assert.equal(applyBrew(bg.state, 2, 0.10), 0, 'not twice');

// ---- money: cash that came in counts, the bank does not
const mg = new Game(null);
const mext = ensureExt(mg);
mg.addCash(300);
observeChange(mg, mext);
assert.equal(mext.stats.earned, 300);
mg.state.bank = 500;
mg.state.cash += 500;
observeChange(mg, mext);
assert.equal(mext.stats.earned, 300, 'a withdrawal is not income');
mg.state.bank = 0;
mg.state.cash -= 200;
observeChange(mg, mext);
assert.equal(mext.stats.earned, 300, 'spending is not income');

// ---- achievements: met once, then kept
const ag = new Game(null);
const aext = ensureExt(ag);
ag.addCash(1000);
observeChange(ag, aext);
const got = checkAchievements(ag, aext).map((a) => a.id);
assert.ok(got.includes('begin-van-iets') && got.includes('duizend-en-een'), String(got));
assert.deepEqual(checkAchievements(ag, aext), [], 'nothing new twice');
assert.equal(unseenAchievements(aext) >= 2, true);
assert.equal(achievementProgress(ag, aext, ACHIEVEMENTS.find((a) => a.id === 'tienduizend')).value, 1000);
observeFrisk(aext);
observeHeat(aext, 3);
assert.ok(checkAchievements(ag, aext).some((a) => a.id === 'op-de-posters'));
for (let i = 0; i < 40; i++) observeMove(aext, 1, true); // one metre per frame
observeMove(aext, 0.4, true);
observeMove(aext, 1000, true); // a teleport is not counted
assert.ok(Math.abs(aext.stats.swim - 40.4) < 1e-9);
const m = metricsOf(ag, aext);
assert.equal(m.belasting, 1, 'over 1000 earned and nothing in the bank');
observeNewDay(ag, aext);
assert.equal(aext.stats.nights, 1);
assert.equal(aext.stats.calmBest, 1, 'no meter: one calm day');

// ---- missions that need a place
const pg = new Game(null);
const pext = ensureExt(pg);
pext.chain = MISSIONS.findIndex((x) => x.id === 'steiger');
assert.equal(evaluate(pg, pext), false);
markVisit(pext, 'steiger', false);
assert.equal(evaluate(pg, pext), false, 'on land is not enough');
markVisit(pext, 'steiger', true);
assert.equal(evaluate(pg, pext), true);

// ---- unlocks: the Zoetekauw reward opens the Vaardigheden app
const ug = new Game(null);
const uext = ensureExt(ug);
uext.chain = MISSIONS.findIndex((x) => x.id === 'zoetekauw');
assert.equal(handIn(ug, uext), null, 'not ready yet');
uext.ready = true;
handIn(ug, uext);
assert.ok(uext.unlocks.includes('vaardigheden'));
assert.equal(uext.points, 1, 'the mission gives a skill point');
assert.ok(uext.titles.includes('Zoetekauw'));
assert.ok(rewardText({ unlock: 'vaardigheden' }).includes('Vaardigheden'));

// ---- the mission rewards read well
assert.equal(rewardText({ cash: 50, xp: 10 }), 'Je krijgt €50 en 10 ervaring.');
assert.ok(rewardText({ points: 2, title: 'Baas' }).includes('2 vaardigheidspunten'));
assert.equal(rewardText({}), '');

// ---- catch-up for an old save: missions already met are handed in, nothing is said
const og = new Game(null);
og.state.day = 4;
og.state.xp = 300;
og.state.inventory = { citroen: 0 };
og.state.cash = 900;
const oext = ensureExt(og);
assert.ok(oext.done >= 1, 'the talk-mission is caught up');
assert.equal(oext.stats.talks, 1);
assert.equal(oext.tutorial.done, true, 'old saves skip the tutorial');
assert.equal(current(oext).id, 'citroenen', 'stops at the first mission that is not met');

// ---- tutorial: one hint at a time, closed or skipped for good
const t = emptyExt();
const where = { moved: 0, swam: false, nearOma: false, nearMarkt: false, citroen: 0, batches: 0, deals: 0 };
assert.equal(tutorialStep(t, where, 1).id, 'loop');
where.moved = 9;
assert.equal(tutorialStep(t, where, 1).id, 'water');
hideHint(t);
assert.equal(tutorialStep(t, where, 1).hidden, true, 'closed for this hint');
where.swam = true;
const step2 = tutorialStep(t, where, 1);
assert.equal(step2.id, 'oma');
assert.equal(step2.hidden, false, 'the next hint shows again');
where.nearOma = true;
where.nearMarkt = true;
where.batches = 1;
where.deals = 1;
assert.equal(tutorialStep(t, where, 1), null, 'done after the last step');
assert.equal(t.tutorial.done, true);
const t2 = emptyExt();
skipTutorial(t2);
assert.equal(tutorialStep(t2, where, 1), null);
const t3 = emptyExt();
assert.equal(tutorialStep(t3, where, 2), null, 'the tutorial is for day 1 only');
assert.equal(t3.tutorial.done, true);
assert.equal(STEPS.length, 6);

// a hint closes itself after a minute, and the phone shows it again
const t4 = emptyExt();
const w4 = { moved: 0, swam: false, nearOma: false, nearMarkt: false, citroen: 0, batches: 0, deals: 0 };
assert.equal(tutorialStep(t4, w4, 1).hidden, false);
for (let i = 0; i < HINT_SECONDS / 0.25 - 1; i++) assert.equal(tickHint(t4, 0.25), false);
assert.equal(tickHint(t4, 0.25), true, 'closed after the minute');
assert.equal(tutorialStep(t4, w4, 1).hidden, true);
showHints(t4);
assert.equal(tutorialStep(t4, w4, 1).hidden, false, 'shown again from the phone');

// ---- places from the terrain
const heightA = (x) => (x < 310 ? 3 : -2);
const pier = pierPoint((x) => heightA(x, 0));
assert.ok(pier && pier.x === 321 && pier.z === 70, JSON.stringify(pier));
const water = waterPoint((x) => (x > 100 ? -5 : 2), 0, 0);
assert.ok(water && water.x > 100, JSON.stringify(water));
assert.equal(waterPoint(() => 2, 0, 0), null);
const beside = spotBeside(() => 2, [{ x: 0, z: 0, r: 4 }], 20, 20);
assert.ok(beside.y > 0.8 && Math.hypot(beside.x - 20, beside.z - 20) >= 5);

// ---- itemKey still reads as before (no skill changes the key format)
assert.equal(itemKey('limonade', ['fris'], 1.05), 'p:limonade:fris:105');
assert.equal(typeof mix, 'function');
assert.equal(typeof sell, 'function');
assert.equal(typeof buy, 'function');

// ---- open missions
assert.equal(current({ chain: MISSIONS.length }).id, 'vrij-1');
assert.equal(openMission(3).reward.points, 0);
assert.equal(openMission(2).reward.points, 1);
assert.equal(handIn(g, { ready: false, chain: 0 }), null, 'nothing to hand in when not ready');

console.log('ok');
