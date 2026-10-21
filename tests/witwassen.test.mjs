// Tests of the money laundering layer: dirty cash ledger, businesses, bank limits, daily takings, the taxman.
import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { BUSINESSES, BUSINESS_IDS, AUDIT, INSPECTORS } from '../src/game/witwassen/data.js';
import { wState, bizOf, owned, dirtyHand, washedWeek, mail, unreadMail, markRead, rollBiz } from '../src/game/witwassen/store.js';
import { track, quiet, pending } from '../src/game/witwassen/ledger.js';
import { capacity, cover, feeRate, suspicion, upgradeCost, revenue, netIncome, allowedWeek, capacityLeft, safeLeft, weekRatio, suspicionWord } from '../src/game/witwassen/rules.js';
import { buyBusiness, launder, upgrade, maxWash, safeWash, previewWash } from '../src/game/witwassen/laundering.js';
import { dirtyLimit, withdrawLimit, dirtyLeft, withdrawLeft, planDeposit, clampDeposit, atmDeposit, atmWithdraw } from '../src/game/witwassen/bank.js';
import { closeBooks, onNewDay } from '../src/game/witwassen/daily.js';
import { planAudit, auditChance, auditPhase, inspect, bribeCost, bribeOdds, resolveAudit, dailyAudit, canBribe } from '../src/game/witwassen/audit.js';
import { carryLimit, carryHeatRate, bulge } from '../src/game/witwassen/carry.js';
import { deposit, withdraw } from '../src/game/phone.js';
import { dayInfo } from '../src/game/weather.js';
import { heatLevel } from '../src/game/police.js';
import { visitEvents, inspectorHere } from '../src/game/witwassen/visit.js';
import { carryHeat } from '../src/game/witwassen/carry.js';
import { bizRow, bizRows, totals } from '../src/game/witwassen/summary.js';

function setup({ xp = 0, cash = 250, day = 3 } = {}) {
  const g = new Game(null);
  g.state.xp = xp;
  g.state.cash = cash;
  g.state.day = day;
  const off = track(g);
  return { g, off };
}
/** Dirty income as the game gives it: a rise of cash from outside. */
const earn = (g, n) => g.addCash(n);

// ---------------------------------------------------------------- ledger
{
  const { g } = setup({ cash: 250 });
  assert.equal(dirtyHand(g), 0); // starting money is clean
  earn(g, 400);
  assert.equal(dirtyHand(g), 400);
  assert.equal(g.state.cash, 650);
  // spending takes dirty and clean in proportion
  g.addCash(-325); // half of the cash
  assert.equal(g.state.cash, 325);
  assert.equal(dirtyHand(g), 200);
  // a wage paid from the bank does not touch it; deposit/withdraw neither (hand-made, outside the hook)
  g.state.bank += 100; g.emit('change');
  assert.equal(dirtyHand(g), 200);
  g.state.cash += 50; g.state.bank -= 50; g.emit('change'); // withdrawal
  assert.equal(dirtyHand(g), 200);
  // money straight onto the bank (a seller wiring his pouch) is not dirty cash
  g.state.bank += 500; g.emit('change');
  assert.equal(dirtyHand(g), 200);
  // a big loss of cash (a fine, a robbery) takes dirty cash along in proportion: 200 of 375 -> 100 of 375 left
  g.state.cash = 100; g.emit('change');
  assert.equal(dirtyHand(g), 53);
  // dirty never exceeds cash, whatever happens to the numbers
  wState(g).dirty = 9999;
  assert.equal(dirtyHand(g), 100);
}
{
  // sources: a deal claims its money, the rest is explained by flushSource
  const { g } = setup();
  earn(g, 120);
  g.emit('deal', { money: 120 });
  assert.equal(wState(g).src.klanten, 120);
  assert.equal(pending(g), 0);
  earn(g, 40);
  assert.equal(pending(g), 40);
  // quiet operations are not income
  quiet(g, () => { g.state.cash += 999; g.emit('change'); });
  assert.equal(dirtyHand(g), 160);
  // a reset (new state object) resyncs without counting
  g.reset();
  assert.equal(dirtyHand(g), 0); // the new game starts clean; the starting money is not income
  g.state.cash = 5000;
  g.emit('change');
  assert.equal(dirtyHand(g), 4750);
}
{
  // a save from before the feature gets fresh data
  const g = new Game(null);
  delete g.state.ext.witwassen;
  const w = wState(g);
  assert.equal(w.dirty, 0);
  assert.deepEqual(w.biz, {});
  g.state.ext.witwassen = { dirty: 'x', biz: { bogus: { in: 1 } } };
  const w2 = wState(g);
  assert.equal(w2.dirty, 0);
  assert.equal(w2.biz.bogus, undefined);
  assert.ok(w2.stats && w2.bank && Array.isArray(w2.inbox));
}

// ---------------------------------------------------------------- rules
{
  const b = { up: { cap: 0, fee: 0, books: 0 }, rep: 0, pen: 0, since: 1, day: 5, in: 0, hist: [] };
  for (const id of BUSINESS_IDS) {
    const d = BUSINESSES[id];
    assert.equal(capacity(id, b), d.capacity);
    assert.ok(cover(id, b) <= capacity(id, b));
    assert.ok(cover(id, b) >= d.cover - 5);
    assert.equal(feeRate(id, b), d.fee);
    assert.ok(d.revenue > d.staff, `${id} must make a profit on a normal day`);
  }
  const up = { ...b, up: { cap: 3, fee: 3, books: 3 }, rep: 100 };
  assert.ok(capacity('ijskraam', up) > 2 * capacity('ijskraam', b) - 1);
  // fully upgraded the books explain nearly everything the business can handle (but never more)
  assert.ok(cover('ijskraam', up) <= capacity('ijskraam', up));
  assert.ok(cover('ijskraam', up) / capacity('ijskraam', up) > 0.85);
  assert.ok(cover('ijskraam', b) / capacity('ijskraam', b) < 0.75);
  assert.equal(feeRate('ijskraam', up), 0.16);
  assert.equal(feeRate('pretpark', up), 0.08); // 0.16 - 0.09 would be 0.07: never below the floor
  assert.equal(upgradeCost('ijskraam', 'cap', 0), 480);
  assert.equal(upgradeCost('ijskraam', 'cap', 3), null);
  assert.ok(upgradeCost('pretpark', 'cap', 2) > upgradeCost('pretpark', 'cap', 1));
  // suspicion: nothing below half the cover, rising with the ratio, plus the lingering part
  const mk = (inn, pen = 0) => ({ ...b, since: 5, day: 5, in: inn, pen, hist: [] });
  assert.equal(suspicion('ijskraam', mk(0), 5), 0);
  assert.equal(suspicion('ijskraam', mk(100), 5), 0);
  const atCover = suspicion('ijskraam', mk(cover('ijskraam', b)), 5);
  assert.ok(atCover > 20 && atCover < 45, String(atCover));
  assert.ok(suspicion('ijskraam', mk(340), 5) > atCover);
  assert.equal(suspicion('ijskraam', mk(0, 25), 5), 25);
  assert.ok(suspicion('ijskraam', mk(100000), 5) <= 100);
  assert.equal(suspicionWord(0), 'Onopvallend');
  assert.equal(suspicionWord(100), 'Fiscus-alarm');
  // takings follow the weather and the event
  const sunny = [...Array(60).keys()].map((i) => i + 2).find((d) => dayInfo(d).weather === 'zon' && dayInfo(d).event === 'rustig');
  const rainy = [...Array(60).keys()].map((i) => i + 2).find((d) => dayInfo(d).weather === 'regen' && dayInfo(d).event === 'rustig');
  assert.ok(revenue('ijskraam', b, sunny) > revenue('ijskraam', b, rainy));
  assert.equal(revenue('ijskraam', { ...b, rep: 100 }, sunny), Math.round(BUSINESSES.ijskraam.revenue * 1.6 * 1.4));
  assert.ok(netIncome('ijskraam', b, sunny) > 0);
  // allowed over the week grows with the days the business exists
  assert.equal(allowedWeek('ijskraam', { ...b, since: 5 }, 5), cover('ijskraam', b));
  assert.equal(allowedWeek('ijskraam', { ...b, since: 1 }, 20), cover('ijskraam', b) * 7);
}

// ---------------------------------------------------------------- buying, washing, upgrading
{
  const { g } = setup({ xp: 0, cash: 2000, day: 3 });
  assert.equal(buyBusiness(g, 'ijskraam').ok, false); // rank 0: too early
  g.state.xp = 100; // rank 1
  assert.match(buyBusiness(g, 'surfschool').reason, /rang/);
  g.state.cash = 100;
  assert.equal(buyBusiness(g, 'ijskraam').ok, false); // too poor
  g.state.cash = 100; g.state.bank = 1300; // the bank counts, and is used first
  const r = buyBusiness(g, 'ijskraam');
  assert.equal(r.ok, true);
  assert.equal(g.state.bank, 100);
  assert.equal(g.state.cash, 100);
  assert.deepEqual(owned(g), ['ijskraam']);
  assert.equal(buyBusiness(g, 'ijskraam').ok, false); // only once
  assert.ok(unreadMail(g) >= 1);
  markRead(g);
  assert.equal(unreadMail(g), 0);
}
{
  const { g } = setup({ xp: 100, cash: 250, day: 3 });
  g.state.bank = 1300; buyBusiness(g, 'ijskraam');
  earn(g, 1000); // dirty
  assert.equal(dirtyHand(g), 1000);
  const cap = capacity('ijskraam', bizOf(g, 'ijskraam'));
  assert.equal(maxWash(g, 'ijskraam'), Math.min(1000, cap));
  assert.equal(safeWash(g, 'ijskraam'), 240);
  assert.equal(launder(g, 'ijskraam', 0).ok, false);
  assert.match(launder(g, 'ijskraam', 5000).reason, /bij je|maar/);
  const bankBefore = g.state.bank;
  const cashBefore = g.state.cash;
  const p = previewWash('ijskraam', bizOf(g, 'ijskraam'), 200);
  assert.deepEqual(p, { amount: 200, fee: 50, out: 150 });
  const w1 = launder(g, 'ijskraam', 200);
  assert.deepEqual([w1.ok, w1.amount, w1.fee, w1.out, w1.risky], [true, 200, 50, 150, false]);
  assert.equal(g.state.cash, cashBefore - 200);
  assert.equal(g.state.bank, bankBefore + 150);
  assert.equal(dirtyHand(g), 800);
  assert.equal(wState(g).stats.washed, 200);
  assert.equal(safeLeft('ijskraam', bizOf(g, 'ijskraam'), 3), 40);
  // going over the cover is allowed but flagged; over the capacity is not
  const w2 = launder(g, 'ijskraam', 100);
  assert.equal(w2.ok, true);
  assert.equal(w2.risky, true);
  assert.equal(capacityLeft('ijskraam', bizOf(g, 'ijskraam'), 3), 50);
  const w3 = launder(g, 'ijskraam', 60);
  assert.equal(w3.ok, false);
  assert.match(w3.reason, /€50/);
  assert.equal(launder(g, 'ijskraam', 50).ok, true);
  assert.match(launder(g, 'ijskraam', 1).reason, /vol/);
  assert.equal(dirtyHand(g), 650);
  assert.equal(launder(g, 'surfschool', 10).ok, false); // not owned
  // upgrades
  g.state.bank = 5000;
  assert.equal(upgrade(g, 'ijskraam', 'cap').ok, true);
  assert.equal(bizOf(g, 'ijskraam').up.cap, 1);
  assert.equal(g.state.bank, 5000 - 480);
  assert.equal(capacity('ijskraam', bizOf(g, 'ijskraam')), 460); // 350 * 1.3 = 455, rounded to tens
  assert.equal(upgrade(g, 'ijskraam', 'fee').ok, true);
  assert.equal(feeRate('ijskraam', bizOf(g, 'ijskraam')), 0.22);
  g.state.bank = 0; g.state.cash = 0;
  assert.equal(upgrade(g, 'ijskraam', 'books').ok, false);
  g.state.bank = 100000;
  for (let i = 0; i < 5; i++) upgrade(g, 'ijskraam', 'cap');
  assert.equal(bizOf(g, 'ijskraam').up.cap, 3);
  assert.match(upgrade(g, 'ijskraam', 'cap').reason, /hoogste/);
}

// ---------------------------------------------------------------- bank, ATM and the phone hook
{
  const { g } = setup({ xp: 250, cash: 100, day: 4 }); // rank 2
  assert.equal(dirtyLimit(2, 'phone'), 700);
  assert.equal(dirtyLimit(2, 'atm'), 1800);
  assert.ok(dirtyLimit(2, 'atm') > dirtyLimit(2, 'phone'));
  assert.equal(withdrawLimit(2), 2500);
  earn(g, 3000); // 100 clean + 3000 dirty
  assert.equal(dirtyHand(g), 3000);
  // clean cash goes in first, no matter the limit
  let plan = planDeposit(g, 100, 'phone');
  assert.deepEqual([plan.accepted, plan.clean, plan.dirty, plan.over], [100, 100, 0, 0]);
  // asking for more: the dirty part is clamped to the daily limit
  plan = planDeposit(g, 2000, 'phone');
  assert.deepEqual([plan.accepted, plan.clean, plan.dirty, plan.over], [800, 100, 700, 1200]);
  // via the phone.js hook
  let limitEvent = null;
  g.on('witwassen:limiet', (e) => (limitEvent = e));
  assert.equal(deposit(g, 2000), true);
  assert.equal(g.state.bank, 800);
  assert.equal(g.state.cash, 3100 - 800);
  assert.equal(dirtyHand(g), 2300);
  assert.equal(limitEvent.over, 1200);
  assert.equal(limitEvent.left, 0);
  assert.equal(dirtyLeft(g, 'phone'), 0);
  assert.equal(deposit(g, 500), false); // limit reached for today
  assert.equal(g.state.bank, 800);
  // the ATM has a higher limit but shares today's total
  assert.equal(dirtyLeft(g, 'atm'), 1800 - 700);
  const a1 = atmDeposit(g, 5000);
  assert.equal(a1.ok, false); // more than the cash on hand
  const a2 = atmDeposit(g, 1500);
  assert.equal(a2.ok, true);
  assert.equal(a2.amount, 1100);
  assert.equal(a2.short, 400);
  assert.equal(dirtyHand(g), 1200);
  assert.equal(atmDeposit(g, 100).ok, false);
  // withdrawals: the ATM has a daily limit, the phone has none
  g.state.bank = 4000; g.emit("change");
  const o1 = atmWithdraw(g, 3000);
  assert.deepEqual([o1.ok, o1.amount, o1.short], [true, 2500, 500]);
  assert.equal(withdrawLeft(g), 0);
  assert.equal(atmWithdraw(g, 10).ok, false);
  assert.equal(withdraw(g, 100), true);
  assert.equal(atmWithdraw(g, 1e6).ok, false);
  assert.equal(dirtyHand(g), 1200); // taking money out does not make it dirty
  // a new day: limits are back
  g.state.day = 5;
  assert.equal(dirtyLeft(g, 'phone'), 700);
  assert.equal(withdrawLeft(g), 2500);
}
{
  // the phone alone (no business) still works for ordinary money
  const { g } = setup({ cash: 500 });
  assert.equal(deposit(g, 300), true);
  assert.equal(g.state.bank, 300);
  assert.equal(deposit(g, 900), false);
}

// ---------------------------------------------------------------- the day: takings, wages, reputation
{
  const { g } = setup({ xp: 100, cash: 250, day: 3 });
  g.state.bank = 1300; buyBusiness(g, 'ijskraam');
  earn(g, 500);
  launder(g, 'ijskraam', 200); // inside the cover
  const bank0 = g.state.bank;
  g.state.day = 4;
  const lines = closeBooks(g);
  const b = bizOf(g, 'ijskraam');
  assert.equal(lines.length, 1);
  assert.equal(g.state.bank, bank0 + netIncome('ijskraam', { ...b, rep: 0 }, 3));
  assert.equal(b.rep, 2); // busy and fair
  assert.equal(b.day, 4);
  assert.equal(b.in, 0);
  assert.equal(washedWeek(b, 4), 200); // yesterday is still in the week
  // an idle day: +1; overshooting the cover: -3
  g.state.day = 5; closeBooks(g);
  assert.equal(b.rep, 3);
  earn(g, 400); launder(g, 'ijskraam', 300); // cover is 240
  g.state.day = 6; closeBooks(g);
  assert.equal(b.rep, 0);
  assert.ok(b.earned > 0);
  // a storm day can be a loss; a business that cannot pay its wages closes for a day
  const stormDay = [...Array(200).keys()].map((i) => i + 4).find((d) => dayInfo(d).weather === 'storm');
  g.state.bank = 0; g.state.cash = 0;
  g.state.day = stormDay + 1;
  b.closed = 0; b.day = stormDay; b.in = 0;
  closeBooks(g);
  assert.ok(netIncome('ijskraam', b, stormDay) <= 0);
  if (netIncome('ijskraam', b, stormDay) < 0) assert.equal(b.closed, stormDay + 1);
}
{
  // onNewDay settles, mails and plans without errors, with several businesses
  const { g } = setup({ xp: 3000, cash: 100000, day: 10 });
  for (const id of BUSINESS_IDS) assert.equal(buyBusiness(g, id).ok, true, id);
  assert.equal(owned(g).length, 4);
  g.state.day = 11;
  const res = onNewDay(g, () => 0.99);
  assert.equal(res.profit.length, 4);
  assert.deepEqual(res.taxman, []);
  assert.ok(wState(g).stats.profit > 0);
}

// ---------------------------------------------------------------- the taxman
{
  const { g } = setup({ xp: 100, cash: 250, day: 3 });
  g.state.bank = 1300; buyBusiness(g, 'ijskraam');
  const b = bizOf(g, 'ijskraam');
  // grace: no visit planned for the day after you bought it
  assert.equal(planAudit(g, () => 0), null);
  g.state.day = 4;
  const a = planAudit(g, () => 0); // rand 0: the dice always say yes
  assert.ok(a);
  assert.deepEqual([a.id, a.day, a.status], ['ijskraam', 5, 'gepland']);
  assert.ok(a.hour >= AUDIT.visitHours[0] && a.hour <= AUDIT.visitHours[1]);
  assert.ok(a.who >= 0 && a.who < INSPECTORS.length);
  assert.equal(planAudit(g, () => 0), null); // one at a time
  assert.equal(auditPhase(a, 4, 600), 'gepland');
  assert.equal(auditPhase(a, 5, a.hour * 60 - 1), 'vandaag');
  assert.equal(auditPhase(a, 5, a.hour * 60), 'bezig');
  assert.equal(auditPhase(a, 5, (a.hour + AUDIT.stayHours) * 60), 'voorbij');
  assert.equal(auditPhase(a, 6, 400), 'gemist');
  assert.equal(auditPhase(null, 6, 400), 'geen');
  // chance rises with suspicion and on inspection days
  const calm = auditChance('ijskraam', b, 4);
  b.pen = 50;
  assert.ok(auditChance('ijskraam', b, 4) > calm);
  assert.ok(auditChance('ijskraam', b, 4, 'inspectie') > auditChance('ijskraam', b, 4));
  b.pen = 0;
  // a fair business passes: washed within cover x days
  g.state.day = 5; rollBiz(b, 5);
  earn(g, 200); launder(g, 'ijskraam', 200);
  const rep0 = b.rep;
  const r = resolveAudit(g, { present: true });
  assert.equal(r.outcome, 'goed');
  assert.equal(r.fine, 0);
  assert.equal(b.rep, rep0 + 6);
  assert.equal(wState(g).audit, null);
  assert.equal(wState(g).last.ijskraam, 5);
  assert.equal(wState(g).stats.passed, 1);
  assert.equal(resolveAudit(g, {}), null);
  // cooldown: no new visit for a few days
  g.state.day = 6;
  assert.equal(planAudit(g, () => 0), null);
  g.state.day = 5 + AUDIT.cooldown;
  assert.ok(planAudit(g, () => 0));
}
{
  // too much washing: warning, then fine plus heat; staying away costs extra
  const mkGame = (inn) => {
    const { g } = setup({ xp: 100, cash: 10000, day: 3 });
    buyBusiness(g, 'ijskraam');
    g.state.day = 6;
    const b = bizOf(g, 'ijskraam');
    b.since = 6;
    b.day = 6;
    b.in = inn;
    wState(g).audit = { id: 'ijskraam', day: 6, hour: 12, who: 0, status: 'bezig' };
    return g;
  };
  const cov = cover('ijskraam', bizOf(mkGame(0), 'ijskraam'));
  // warning band: up to 15% over
  let g = mkGame(Math.floor(cov * 1.1));
  let rep = inspect('ijskraam', bizOf(g, 'ijskraam'), 6);
  assert.equal(rep.verdict, 'waarschuwing');
  assert.equal(rep.fine, 0);
  let r = resolveAudit(g, { present: true });
  assert.equal(r.outcome, 'waarschuwing');
  assert.equal(bizOf(g, 'ijskraam').pen, 10);
  // clearly over: a fine and heat
  g = mkGame(350);
  rep = inspect('ijskraam', bizOf(g, 'ijskraam'), 6);
  assert.equal(rep.verdict, 'boete');
  assert.equal(rep.excess, 350 - cov);
  assert.equal(rep.fine, Math.max(100, Math.round(((350 - cov) * 0.8) / 10) * 10));
  assert.ok(rep.heat >= 0.6);
  const cash0 = g.state.cash;
  const heat0 = g.state.heat;
  r = resolveAudit(g, { present: true });
  assert.equal(r.outcome, 'boete');
  assert.equal(r.fine, rep.fine);
  assert.equal(g.state.cash, cash0 - rep.fine);
  assert.ok(g.state.heat > heat0);
  assert.equal(bizOf(g, 'ijskraam').pen, 25);
  assert.equal(wState(g).stats.failed, 1);
  assert.equal(wState(g).stats.fines, rep.fine);
  // absent: the same books cost 25% more
  g = mkGame(350);
  r = resolveAudit(g, { present: false });
  assert.equal(r.fine, Math.round((rep.fine * AUDIT.absentSurcharge) / 10) * 10);
  assert.ok(r.fine > rep.fine);
  // coffee money: works with the lucky dice, backfires with the unlucky ones
  g = mkGame(350);
  rep = inspect('ijskraam', bizOf(g, 'ijskraam'), 6);
  assert.ok(canBribe(g, rep));
  assert.ok(bribeOdds(rep) >= 0.15 && bribeOdds(rep) <= 0.6);
  const cash1 = g.state.cash;
  r = resolveAudit(g, { present: true, bribe: true, rand: () => 0 });
  assert.equal(r.outcome, 'omgekocht');
  assert.equal(r.fine, 0);
  assert.equal(g.state.cash, cash1 - bribeCost(rep));
  g = mkGame(350);
  const cash2 = g.state.cash;
  const heat2 = g.state.heat;
  r = resolveAudit(g, { present: true, bribe: true, rand: () => 0.999 });
  assert.equal(r.outcome, 'betrapt');
  assert.equal(r.fine, Math.round((rep.fine * 1.5) / 10) * 10);
  assert.equal(g.state.cash, cash2 - bribeCost(rep) - r.fine);
  assert.ok(g.state.heat - heat2 >= 1.6);
  // no bribe offered when the books are fine
  g = mkGame(100);
  assert.equal(canBribe(g, inspect('ijskraam', bizOf(g, 'ijskraam'), 6)), false);
  // not enough money: pays what is there and the heat rises extra
  g = mkGame(350);
  g.state.cash = 30;
  g.state.bank = 0;
  r = resolveAudit(g, { present: true });
  assert.equal(r.paid, 30);
  assert.equal(r.unpaid, r.fine - 30);
  assert.equal(g.state.cash, 0);
  assert.ok(g.state.heat >= 1);
}
{
  // a visit that you slept through is settled the next morning; the evening round plans and warns
  const { g } = setup({ xp: 100, cash: 10000, day: 3 });
  buyBusiness(g, 'ijskraam');
  g.state.day = 5;
  const lines = dailyAudit(g, () => 0);
  assert.match(lines.join(' '), /morgen om/);
  const a = wState(g).audit;
  assert.equal(a.day, 6);
  g.state.day = 6;
  let l2 = dailyAudit(g, () => 0.99);
  assert.match(l2.join(' '), /vandaag om/);
  g.state.day = 7; // slept through it
  l2 = dailyAudit(g, () => 0.99);
  assert.match(l2.join(' '), /terwijl jij er niet was/);
  assert.equal(wState(g).audit, null);
  assert.equal(wState(g).stats.visits, 1);
  assert.ok(wState(g).inbox.length >= 3);
}

// ---------------------------------------------------------------- carrying dirty cash
{
  assert.equal(carryLimit(0), 1200);
  assert.equal(carryLimit(2), 2200);
  assert.equal(carryHeatRate(500, 0, 0), 0);
  assert.ok(carryHeatRate(1300, 0, 0) > 0);
  assert.ok(carryHeatRate(3000, 0, 0) > carryHeatRate(1300, 0, 0));
  assert.equal(carryHeatRate(9000, 0, 2), 0); // cash alone never starts a chase
  assert.ok(carryHeatRate(1e9, 0, 0) <= 0.012 * 2.5);
  assert.equal(bulge(600, 0), 0.5);
  assert.equal(bulge(99999, 0), 1);
  // seen by a guard only: nothing while nobody looks, and the hut hides you (checked in the feature)
  assert.equal(carryHeat(3000, 0, 0, false, 10), 0);
  assert.ok(carryHeat(3000, 0, 0, true, 2) > carryHeat(3000, 0, 0, true, 1));
  assert.equal(carryHeat(3000, 0, 0, true, 0), 0);
  assert.equal(carryHeat(3000, 0, 2, true, 5), 0);
}

// ---------------------------------------------------------------- the taxman's visit as events
{
  assert.deepEqual(visitEvents('vandaag', 'bezig', null), []); // no visit: nothing happens
  assert.deepEqual(visitEvents('vandaag', 'bezig', { id: 'ijskraam' }), ['begin']);
  assert.deepEqual(visitEvents('bezig', 'bezig', { id: 'ijskraam' }), []); // once only
  assert.deepEqual(visitEvents('geen', 'bezig', { id: 'ijskraam' }), ['begin']); // loaded in the middle of it
  assert.deepEqual(visitEvents('bezig', 'voorbij', { id: 'ijskraam' }), ['absent']);
  assert.deepEqual(visitEvents('gepland', 'gemist', { id: 'ijskraam' }), ['absent']);
  assert.deepEqual(visitEvents('gepland', 'vandaag', { id: 'ijskraam' }), []);
  assert.equal(inspectorHere('bezig', { id: 'x' }), true);
  assert.equal(inspectorHere('vandaag', { id: 'x' }), false);
  assert.equal(inspectorHere('bezig', null), false);
}

// ---------------------------------------------------------------- the phone app numbers
{
  const { g } = setup({ xp: 100, cash: 300, day: 3 }); // rank 1
  // not owned: the row only says what it costs and whether the rank is enough
  let row = bizRow(g, 'surfschool');
  assert.equal(row.owned, false);
  assert.equal(row.price, 4500);
  assert.equal(row.locked, true); // rank 2 needed, we are rank 1
  assert.equal(bizRows(g).length, 4);
  // own an ice cream stall: the row gets the numbers (cash set quietly: it is not income)
  quiet(g, () => {
    g.state.cash = 2000;
    g.emit('change');
  });
  assert.equal(buyBusiness(g, 'ijskraam').ok, true);
  row = bizRow(g, 'ijskraam');
  assert.equal(row.owned, true);
  assert.equal(row.open, true);
  assert.equal(row.used, 0);
  assert.equal(row.cap, capacity('ijskraam', wState(g).biz.ijskraam));
  assert.equal(row.safe, cover('ijskraam', wState(g).biz.ijskraam));
  assert.equal(row.word, 'Onopvallend');
  earn(g, 400);
  launder(g, 'ijskraam', 200);
  row = bizRow(g, 'ijskraam');
  assert.equal(row.used, 200);
  const t = totals(g);
  assert.equal(t.dirty, 200);
  assert.equal(t.profit, 0);
  assert.equal(t.washed, 200);
  assert.ok(t.bankLeft > 0 && t.atmLeft > t.bankLeft);
  assert.equal(t.bulge, bulge(200, 1)); // at rank 1 the pockets fill up slower
}
