import assert from 'node:assert/strict';
import { Game } from '../src/game/state.js';
import { rng, scatter, findSpot, pick, between } from '../src/game/wereld/rng.js';
import { nightLevel, fade } from '../src/game/wereld/night.js';
import {
  SHELL_COUNT,
  SHELL_MILESTONES,
  KIND_QUOTA,
  validSpot,
  planShells,
  milestonesReached,
  compassTo,
  distanceWord,
  hintText,
  nearestLeft,
} from '../src/game/wereld/shells.js';
import { wereldOf, collectShell, shellsCollected, hintPrice, useHint } from '../src/game/wereld/progress.js';
import { OUTFITS, changeClothes, savedFavorite } from '../src/game/wereld/outfits.js';
import { gossip } from '../src/game/wereld/gossip.js';

// A made-up island: a disc of land with a lake in it, and two props.
const isLand = (x, z) => Math.hypot(x, z) < 300 && Math.hypot(x - 90, z + 40) > 35;
const colliders = [
  { x: 0, z: 0, r: 6 },
  { x: -120, z: 60, r: 9 },
];

// Determinism: the same seed gives the same numbers.
{
  const a = rng(42);
  const b = rng(42);
  const seqA = Array.from({ length: 20 }, () => a());
  const seqB = Array.from({ length: 20 }, () => b());
  assert.deepEqual(seqA, seqB);
  assert.ok(seqA.every((v) => v >= 0 && v < 1));
  assert.notDeepEqual(Array.from({ length: 5 }, rng(1)), Array.from({ length: 5 }, rng(2)));
  const r = rng(7);
  assert.ok(between(r, 2, 3) >= 2 && between(r, 2, 3) < 3);
  assert.equal(pick(rng(3), ['a']), 'a');
}

// Scatter: every accepted point is valid (on land, clear of the colliders), spaced, and the same every time.
{
  const accept = (x, z) => (validSpot(x, z, { isLand, colliders, margin: 1.5 }) ? { y: 1 } : null);
  const box = { x0: -320, x1: 320, z0: -320, z1: 320 };
  const pts = scatter(rng(11), { n: 120, box, accept, spacing: 8 });
  assert.equal(pts.length, 120);
  for (const p of pts) {
    assert.ok(isLand(p.x, p.z), 'point on land');
    for (const c of colliders) assert.ok(Math.hypot(c.x - p.x, c.z - p.z) > c.r + 1.5, 'not inside a collider');
  }
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) assert.ok(Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z) >= 8, 'spacing kept');
  }
  const again = scatter(rng(11), { n: 120, box, accept, spacing: 8 });
  assert.deepEqual(again, pts);
}

// The sea and colliders are not valid for a shell.
{
  const opts = { isLand, colliders, margin: 1.2 };
  assert.equal(validSpot(400, 0, opts), false, 'in the sea');
  assert.equal(validSpot(0, 0, opts), false, 'inside a prop');
  assert.equal(validSpot(200, 150, opts), true, 'on land, clear');
}

// findSpot: the spiral finds the first spot that accept() takes, deterministically.
{
  const spot = findSpot({ x: 0, z: 0 }, 50, (x, z) => (Math.hypot(x - 20, z) > 10 ? { y: 2 } : null));
  assert.ok(spot && Math.hypot(spot.x - 20, spot.z) > 10 && spot.y === 2);
  assert.deepEqual(findSpot({ x: 0, z: 0 }, 50, (x, z) => (Math.hypot(x - 20, z) > 10 ? { y: 2 } : null)), spot);
  assert.equal(findSpot({ x: 0, z: 0 }, 5, () => null), null);
}

// Shells: 60 of them, from candidate spots of every kind, spaced and with the quota per kind.
{
  const spotsFor = (seed) => {
    const r = rng(seed);
    const out = {};
    for (const kind of Object.keys(KIND_QUOTA)) {
      out[kind] = [];
      for (let i = 0; i < 400; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 280;
        out[kind].push({ x: Math.cos(a) * d, y: 1, z: Math.sin(a) * d, zone: kind === 'klif' ? 'Vuurtorenkaap' : null });
      }
    }
    return out;
  };
  assert.equal(Object.values(KIND_QUOTA).reduce((a, b) => a + b, 0), SHELL_COUNT, 'quota adds up to 60');
  const shells = planShells(rng(5), spotsFor(9));
  assert.equal(shells.length, SHELL_COUNT);
  assert.equal(shells[0].id, 's01');
  assert.equal(shells.at(-1).id, 's60');
  assert.equal(new Set(shells.map((s) => s.id)).size, SHELL_COUNT, 'ids are unique');
  for (const kind of Object.keys(KIND_QUOTA)) assert.equal(shells.filter((s) => s.kind === kind).length, KIND_QUOTA[kind]);
  for (let i = 0; i < shells.length; i++) {
    for (let j = i + 1; j < shells.length; j++) assert.ok(Math.hypot(shells[i].x - shells[j].x, shells[i].z - shells[j].z) >= 6, 'shells keep apart');
  }
  // Deterministic: the same seed gives the same layout.
  assert.deepEqual(planShells(rng(5), spotsFor(9)), shells);
  // A kind with too few spots gives fewer, never a crash.
  const short = planShells(rng(5), { strand: [{ x: 1, y: 0, z: 1 }] });
  assert.equal(short.length, 1);
}

// Milestones: 10, 25, 40 and 60 pay once each.
{
  assert.deepEqual(
    SHELL_MILESTONES.map((m) => m.n),
    [10, 25, 40, 60],
  );
  assert.deepEqual(milestonesReached(9), []);
  assert.deepEqual(milestonesReached(10).map((m) => m.n), [10]);
  assert.deepEqual(milestonesReached(27, [10]).map((m) => m.n), [25]);
  assert.deepEqual(milestonesReached(60, [10, 25, 40]).map((m) => m.n), [60]);
  assert.deepEqual(milestonesReached(60, [10, 25, 40, 60]), []);
}

// Collecting: pays, counts, pays the milestone once, and never twice for the same shell.
{
  const g = new Game(null);
  const cash0 = g.state.cash;
  const xp0 = g.state.xp;
  let got = null;
  for (let i = 1; i <= 10; i++) got = collectShell(g, `s${String(i).padStart(2, '0')}`);
  assert.equal(shellsCollected(g.state), 10);
  assert.deepEqual(got.milestones.map((m) => m.n), [10], 'the tenth shell pays the first milestone');
  assert.equal(g.state.cash - cash0, 10 * 5 + 100, 'five per shell and the first milestone');
  assert.equal(g.state.xp - xp0, 10 * 2 + 30);
  assert.equal(collectShell(g, 's03'), null, 'a shell is only paid once');
  assert.equal(shellsCollected(g.state), 10);
  assert.deepEqual(wereldOf(g.state).claimed, [10]);
  // The save object lives in state.ext.wereld and survives a round trip through JSON.
  const copy = JSON.parse(JSON.stringify(g.state));
  assert.deepEqual(copy.ext.wereld.shells.length, 10);
}

// Hints: a rough direction, the first one each day free.
{
  assert.equal(compassTo(0, -100), 'noorden');
  assert.equal(compassTo(100, 0), 'oosten');
  assert.equal(compassTo(0, 100), 'zuiden');
  assert.equal(compassTo(-100, 0), 'westen');
  assert.equal(compassTo(100, -100), 'noordoosten');
  assert.equal(distanceWord(10), 'vlakbij');
  assert.equal(distanceWord(90), 'op een eindje');
  assert.equal(distanceWord(300), 'ver weg');
  const shells = [
    { id: 's01', x: 100, y: 0, z: 0, zone: 'Havenstad' },
    { id: 's02', x: 0, y: 0, z: 20, zone: null },
  ];
  assert.equal(nearestLeft({ x: 0, z: 0 }, shells, []).id, 's02');
  assert.equal(nearestLeft({ x: 0, z: 0 }, shells, ['s02']).id, 's01');
  assert.equal(nearestLeft({ x: 0, z: 0 }, shells, ['s01', 's02']), null);
  assert.equal(hintText({ x: 0, z: 0 }, shells[0]), 'Naar het oosten, op een eindje. Bij Havenstad.');
  assert.equal(hintText({ x: 0, z: 0 }, shells[1]), 'Naar het zuiden, vlakbij.');
  const g = new Game(null);
  g.state.day = 3;
  assert.equal(hintPrice(g.state), 0);
  assert.equal(useHint(g), true);
  assert.equal(hintPrice(g.state), 15, 'the second hint of the day costs');
  g.state.cash = 10;
  assert.equal(useHint(g), false, 'not enough money');
  g.state.cash = 100;
  assert.equal(useHint(g), true);
  assert.equal(g.state.cash, 85);
  g.state.day = 4;
  assert.equal(hintPrice(g.state), 0, 'a new day, a new free hint');
}

// Clothes: a shirt costs what it costs; a costume lowers the heat once a day while the guards look.
{
  const g = new Game(null);
  g.state.cash = 100;
  assert.equal(changeClothes(g, 'blauw').ok, true);
  assert.equal(g.state.cash, 90);
  assert.equal(savedFavorite(g.state), OUTFITS.find((o) => o.id === 'blauw').fav);
  g.state.cash = 5;
  assert.equal(changeClothes(g, 'zwart').ok, false, 'too expensive');
  assert.equal(changeClothes(g, 'bestaat-niet').ok, false);
  g.state.cash = 500;
  g.state.heat = 2.5;
  g.state.day = 5;
  g.state.disguisedDay = 0;
  const r = changeClothes(g, 'toerist');
  assert.equal(r.ok, true);
  assert.equal(Math.floor(g.state.heat), 1, 'one level less');
  assert.equal(g.state.disguisedDay, 5);
  const again = changeClothes(g, 'zwart');
  assert.equal(again.ok, true);
  assert.equal(Math.floor(g.state.heat), 1, 'only once a day');
  // A plain shirt does not help with the guards.
  g.state.heat = 3;
  g.state.disguisedDay = 0;
  changeClothes(g, 'geel');
  assert.equal(Math.floor(g.state.heat), 3);
}

// Night: dark from 20 to 6, day from 8 to 17, soft in between.
{
  assert.equal(nightLevel(12), 0);
  assert.equal(nightLevel(16), 0);
  assert.equal(nightLevel(21), 1);
  assert.equal(nightLevel(2), 1);
  assert.ok(Math.abs(nightLevel(19) - 0.5) < 1e-9);
  assert.ok(nightLevel(6.5) > 0 && nightLevel(6.5) < 1);
  assert.equal(nightLevel(25), nightLevel(1), 'hours wrap past midnight');
  assert.equal(fade(5, 10, 20), 1);
  assert.equal(fade(25, 10, 20), 0);
  assert.ok(Math.abs(fade(15, 10, 20) - 0.5) < 1e-9);
}

// Gossip: the same day gives the same line; the weather talk is about tomorrow.
{
  assert.equal(gossip(4), gossip(4));
  assert.ok(gossip(4, 0).startsWith('Het weer van morgen: '));
  assert.ok(gossip(4, 1).length > 10);
  assert.notEqual(gossip(4, 1), gossip(4, 2));
}

console.log('ok');
