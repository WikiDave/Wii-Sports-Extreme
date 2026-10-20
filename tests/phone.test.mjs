import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { dailyMessages, accept, decline, activeRequest, fitsRequest, completeRequest, deposit, withdraw, unread, makeMessage, introMessage, MAX_PER_DAY, MAX_MESSAGES } from '../src/game/phone.js';
import { CUSTOMERS } from '../src/game/data/customers.js';
import { customerById, record, fitsWish } from '../src/game/customers.js';
import { staysIn } from '../src/game/klanten/timeline.js';
import { buildWorld } from '../src/game/klanten/places.js';
import { PRODUCTS } from '../src/game/data/products.js';
import { caught } from '../src/game/police.js';

const world = buildWorld();
const g = new Game(null);
g.state.xp = 300; g.state.day = 3; // rank 2
const fresh = dailyMessages(g);
assert.ok(fresh.length >= 1 && fresh.length <= MAX_PER_DAY, String(fresh.length));
assert.equal(dailyMessages(g).length, 0); // once per day
assert.equal(unread(g.state), fresh.length);
const m = fresh[0]; assert.equal(m.status, 'new'); assert.ok(m.qty >= 1 && m.qty <= 3); assert.ok(m.text.length > 10);
assert.deepEqual(makeMessage(customerById(m.customer), 3, { rank: 2, stayHome: staysIn(world, customerById(m.customer), 3) }), { ...m }); // deterministic
assert.equal(accept(g, m.id), true); assert.equal(accept(g, m.id), false);
assert.equal(activeRequest(g.state, m.customer).id, m.id);
assert.equal(fitsRequest(m, `p:limonade:${m.effect}:100`), true); assert.equal(fitsRequest(m, 'citroen'), false);
completeRequest(g, m, m.qty); assert.equal(m.status, 'done'); assert.ok(g.state.customers[m.customer].loyalty >= 6); assert.equal(activeRequest(g.state, m.customer), null);
if (fresh[1]) { assert.equal(decline(g, fresh[1].id), true); assert.equal(fresh[1].status, 'expired'); }
// next day: old unfinished ones expire
g.state.day = 4; dailyMessages(g);
assert.ok(g.state.messages.filter((x) => x.day === 3).every((x) => x.status === 'done' || x.status === 'expired'));

// every message is complete: a valid effect and amount, and it says where to find them or that they stay in
{
  const x = new Game(null); x.state.xp = 99999;
  let withProduct = 0; let found = 0; let home = 0;
  for (let day = 2; day < 40; day++) {
    x.state.day = day;
    for (const c of CUSTOMERS) record(x.state, c.id).loyalty = 30;
    x.state.messages = [];
    const list = dailyMessages(x);
    assert.ok(list.length <= MAX_PER_DAY && list.length >= 1);
    for (const msg of list) {
      const c = customerById(msg.customer);
      assert.ok(c.likes.includes(msg.effect), 'asks for an effect they like');
      assert.ok(msg.qty >= 1 && msg.qty <= Math.min(3, c.maxQty));
      assert.ok(!msg.text.includes('undefined') && !msg.text.includes('{') && !msg.text.includes('  '), msg.text);
      if (msg.product) { withProduct++; assert.equal(msg.product, c.prefers); assert.ok(PRODUCTS[msg.product].rank <= x.rank); assert.ok(msg.text.toLowerCase().includes(PRODUCTS[msg.product].name.toLowerCase())); }
      if (/Je vindt me .+ rond \d\d:\d\d\./.test(msg.text)) found++;
      if (staysIn(world, c, day)) { home++; assert.match(msg.text, /thuis|binnen/); }
    }
  }
  assert.ok(withProduct > 10 && found > 50 && home > 0, `${withProduct} ${found} ${home}`);
}

// a favourite product you cannot make yet is not asked for
{
  const x = new Game(null); // rank 0: limonade only
  for (let day = 2; day < 30; day++) for (const c of CUSTOMERS) assert.ok(!makeMessage(c, day, { rank: 0 }).product || makeMessage(c, day, { rank: 0 }).product === 'limonade');
}
assert.ok(fitsWish({ product: 'ijs' }, 'p:ijs:fris:100') && !fitsWish({ product: 'ijs' }, 'p:limonade:fris:100'));

// introductions text from the new customer at once
{
  const x = new Game(null); record(x.state, 'saburo').loyalty = 25;
  const seen = []; x.on('messages', (l) => seen.push(...l));
  const intro = introMessage(x, 'daisuke');
  assert.equal(intro.customer, 'daisuke'); assert.match(intro.text, /Saburo/); assert.equal(seen.length, 1);
  assert.equal(introMessage(x, 'daisuke'), null); // one a day
  // sent in the afternoon it names a time still to come; late at night they are home already
  const later = new Game(null); record(later.state, 'saburo').loyalty = 25; later.state.minutes = 14 * 60;
  const t = introMessage(later, 'daisuke').text; const clock = /rond (\d\d):(\d\d)/.exec(t);
  assert.ok(clock && Number(clock[1]) * 60 + Number(clock[2]) >= 14 * 60 + 15, t);
  const night = new Game(null); record(night.state, 'saburo').loyalty = 25; night.state.minutes = 26 * 60;
  assert.match(introMessage(night, 'daisuke').text, /morgen weer/);
  assert.equal(x.state.messages.length, 1);
  assert.equal(introMessage(x, 'nobody'), null);
}

// the weather keeps some at home: they say so
{
  let day = 2;
  while (!CUSTOMERS.some((c) => !c.unlock && staysIn(world, c, day))) day++;
  const x = new Game(null); x.state.day = day;
  const list = dailyMessages(x);
  assert.ok(list.some((msg) => staysIn(world, customerById(msg.customer), day)), 'someone writes that they stay in');
  for (const msg of list) if (staysIn(world, customerById(msg.customer), day)) assert.match(msg.text, /thuis|binnen/);
  for (const msg of list) if (!staysIn(world, customerById(msg.customer), day)) assert.match(msg.text, /Je vindt me/);
}
// the inbox is capped
{
  const x = new Game(null); x.state.xp = 99999;
  for (let day = 2; day < 30; day++) { x.state.day = day; for (const c of CUSTOMERS) record(x.state, c.id).loyalty = 50; dailyMessages(x); }
  assert.ok(x.state.messages.length <= MAX_MESSAGES);
}

// bank
g.state.cash = 500; g.state.bank = 0;
assert.equal(deposit(g, 600), false); assert.equal(deposit(g, 300), true); assert.equal(g.state.cash, 200); assert.equal(g.state.bank, 300);
assert.equal(withdraw(g, 400), false); assert.equal(withdraw(g, 100), true); assert.equal(g.state.bank, 200);
g.state.heat = 4.5; caught(g); assert.equal(g.state.bank, 200); // the bank is safe
console.log('ok');
