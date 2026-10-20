import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { dailyMessages, accept, decline, activeRequest, fitsRequest, completeRequest, deposit, withdraw, unread, makeMessage } from '../src/game/phone.js';
import { customerById } from '../src/game/customers.js';
import { caught } from '../src/game/police.js';

const g = new Game(null);
g.state.xp = 300; g.state.day = 3; // rank 2: all but Andy-like unlocks
const fresh = dailyMessages(g);
assert.ok(fresh.length >= 1 && fresh.length <= 5, String(fresh.length));
assert.equal(dailyMessages(g).length, 0); // once per day
assert.equal(unread(g.state), fresh.length);
const m = fresh[0]; assert.equal(m.status, 'new'); assert.ok(m.qty >= 1 && m.qty <= 3); assert.ok(m.text.length > 10);
assert.deepEqual(makeMessage(customerById(m.customer), 3), { ...m }); // deterministic
assert.equal(accept(g, m.id), true); assert.equal(accept(g, m.id), false);
assert.equal(activeRequest(g.state, m.customer).id, m.id);
assert.equal(fitsRequest(m, `p:limonade:${m.effect}:100`), true); assert.equal(fitsRequest(m, 'citroen'), false);
completeRequest(g, m, m.qty); assert.equal(m.status, 'done'); assert.ok(g.state.customers[m.customer].loyalty >= 6); assert.equal(activeRequest(g.state, m.customer), null);
if (fresh[1]) { assert.equal(decline(g, fresh[1].id), true); assert.equal(fresh[1].status, 'expired'); }
// next day: old unfinished ones expire
g.state.day = 4; dailyMessages(g);
assert.ok(g.state.messages.filter((x) => x.day === 3).every((x) => x.status === 'done' || x.status === 'expired'));
// bank
g.state.cash = 500; g.state.bank = 0;
assert.equal(deposit(g, 600), false); assert.equal(deposit(g, 300), true); assert.equal(g.state.cash, 200); assert.equal(g.state.bank, 300);
assert.equal(withdraw(g, 400), false); assert.equal(withdraw(g, 100), true); assert.equal(g.state.bank, 200);
g.state.heat = 4.5; caught(g); assert.equal(g.state.bank, 200); // the bank is safe
console.log('ok');
