import assert from 'node:assert/strict';
import { addDeck, clearDecks, deckHeight, railColliders, deckBlockers, allDecks } from '../src/game/world/decks.js';

clearDecks();
// A pier from (10, 0) running towards +z for 20 m, 2 m to each side, planks at 0.8.
const d = { x0: 10, z0: 0, dx: 0, dz: 1, length: 20, half: 2, top: 0.8 };
const drop = addDeck(d);
assert.equal(deckHeight(10, 5), 0.8, 'on the planks');
assert.equal(deckHeight(11.9, 19), 0.8, 'near the side and the end');
assert.equal(deckHeight(12.5, 5), null, 'beside the pier');
assert.equal(deckHeight(10, 22), null, 'past the end');
assert.equal(deckHeight(10, -3), null, 'behind the shore end');

// A pier turned a quarter, towards +x: sideways is now z.
addDeck({ x0: 0, z0: 50, dx: 1, dz: 0, length: 10, half: 2, top: 1.2 });
assert.equal(deckHeight(5, 51.5), 1.2);
assert.equal(deckHeight(5, 53), null);

// Rails: circles on both sides, never on the planks, none at the open shore end.
const rails = railColliders(d);
assert.ok(rails.length > 20);
for (const c of rails) {
  assert.ok(Math.abs(c.x - 10) > 2, 'rail posts stand beside the planks');
  assert.ok(c.z >= 1.5, 'the shore end stays open');
}
// Boat blockers: round the sides and the far end, never on the planks.
const bl = deckBlockers(d);
for (const c of bl) assert.equal(deckHeight(c.x, c.z), null, 'a blocker is off the planks');
assert.ok(bl.some((c) => c.z > d.length), 'the far end is closed for boats');
assert.equal(allDecks().length, 2);
drop();
assert.equal(deckHeight(10, 5), null, 'removed again');
clearDecks();
assert.equal(deckHeight(5, 51.5), null);
console.log('decks.test ok');
