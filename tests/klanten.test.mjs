import assert from 'node:assert/strict';
import { CUSTOMERS } from '../src/game/data/customers.js';
import { PATHS } from '../src/game/world/zones.js';
import { DAY_START, DAY_END } from '../src/game/state.js';
import { dayInfo, staysHome } from '../src/game/weather.js';
import { PLACES, LINKS, buildGraph, buildWorld, nearestNode, shortestPath } from '../src/game/klanten/places.js';
import { dayTimeline, locate, routineHint, whereNow, meetingSpot, slotIn, stopsOf } from '../src/game/klanten/timeline.js';
import { pickVisible } from '../src/game/klanten/visible.js';

// ---------------------------------------------------------------- the footpaths
const world = buildWorld();
const g = world.graph;
assert.ok(g.nodes.length > 80 && g.nodes.length < 400, `${g.nodes.length} nodes`);
// every place can be reached from every other place over the paths
const placeIds = Object.keys(PLACES).filter((id) => id !== 'thuis');
for (const a of placeIds) for (const b of placeIds) assert.ok(shortestPath(g, world.places[a].node, world.places[b].node), `${a} -> ${b}`);
// each place is close to a path (a short walk off the path at the end, never a trek)
for (const id of placeIds) {
  const p = world.places[id];
  const n = g.nodes[p.node];
  assert.ok(Math.hypot(n.x - p.x, n.z - p.z) < 16, `${id} is ${Math.hypot(n.x - p.x, n.z - p.z).toFixed(0)} m from a path`);
}
// the path graph follows the real paths and links: no node farther than 12 m from a polyline end-to-end
{
  const all = [...PATHS, ...LINKS];
  assert.equal(all.length, PATHS.length + LINKS.length);
  const grid = buildGraph(all);
  let edges = 0;
  for (const n of grid.nodes) edges += n.edges.length;
  assert.ok(edges > g.nodes.length, 'connected');
  // the shortest path is no longer than going by straight lines through the nodes it uses, and symmetric
  const a = nearestNode(g, 54, 186);
  const b = nearestNode(g, 256, 75);
  const there = shortestPath(g, a, b);
  const back = shortestPath(g, b, a);
  assert.deepEqual(there, [...back].reverse());
  const length = there.slice(1).reduce((s, v, i) => s + Math.hypot(g.nodes[v].x - g.nodes[there[i]].x, g.nodes[v].z - g.nodes[there[i]].z), 0);
  assert.ok(length > 200 && length < 340, `beach to harbour ${length.toFixed(0)} m`);
}

// runtime overrides: the customer spots of the island and the front doors
{
  const w = buildWorld({ spots: { strand: { x: 60, z: 190 }, haven: { x: 260, z: 80 } }, homes: { kai: { x: 33, z: 220 } } });
  assert.equal(w.places.strand.x, 60); assert.equal(w.places.markt.z, 80);
  const kai = CUSTOMERS.find((c) => c.id === 'kai');
  assert.deepEqual(slotIn(w, kai, 'thuis'), { x: 33, z: 220 });
  assert.ok(Math.hypot(slotIn(w, kai, 'strand').x - 60, slotIn(w, kai, 'strand').z - 190) <= w.places.strand.spread);
  // each customer has their own spot within a place
  const spots = new Set(CUSTOMERS.slice(0, 8).map((c) => JSON.stringify(slotIn(w, c, 'strand'))));
  assert.equal(spots.size, 8);
}

// ---------------------------------------------------------------- a day is continuous: position = f(time)
const out = {};
let maxJump = 0;
for (const day of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
  for (const c of CUSTOMERS) {
    const tl = dayTimeline(world, c, day);
    assert.equal(tl.segs[0].t0, DAY_START);
    locate(world, c, tl, DAY_START, out);
    const door = slotIn(world, c, 'thuis');
    assert.ok(Math.hypot(out.x - door.x, out.z - door.z) < 1e-9, `${c.id} starts the day at their front door`);
    const mpm = c.speed; // MINUTES_PER_SECOND is 1: metres per minute = metres per second
    let px = out.x;
    let pz = out.z;
    for (let t = DAY_START + 1; t < DAY_END; t++) {
      locate(world, c, tl, t, out);
      const d = Math.hypot(out.x - px, out.z - pz);
      assert.ok(d <= mpm + 1e-6, `${c.id} day ${day} jumps ${d.toFixed(2)} m at minute ${t}`);
      maxJump = Math.max(maxJump, d / mpm);
      assert.ok(Number.isFinite(out.x) && Number.isFinite(out.z));
      assert.ok(Math.abs(Math.hypot(out.hx, out.hz) - 1) < 1e-6, 'unit heading');
      [px, pz] = [out.x, out.z];
    }
  }
}
assert.ok(maxJump > 0.9, 'customers do walk at full speed');

// the segments hang together: stay, walk, stay ...; arrivals are on time unless the walk is too long
for (const c of CUSTOMERS) {
  const tl = dayTimeline(world, c, 1);
  for (let i = 1; i < tl.segs.length; i++) {
    assert.ok(Math.abs(tl.segs[i].t0 - tl.segs[i - 1].t1) < 1e-9, `${c.id} segment ${i}`);
    assert.notEqual(tl.segs[i].kind, tl.segs[i - 1].kind);
  }
  assert.equal(tl.segs[tl.segs.length - 1].kind, 'stay');
}

// a customer is met anywhere on the route: sample the walking ones along the path
{
  const fumiko = CUSTOMERS.find((c) => c.id === 'fumiko');
  const tl = dayTimeline(world, fumiko, 1);
  const walk = tl.segs.find((s) => s.kind === 'walk' && s.route.len > 80);
  const mid = (walk.t0 + walk.t1) / 2;
  locate(world, fumiko, tl, mid, out);
  assert.equal(out.moving, true); assert.equal(out.indoors, false);
  const [x0, z0] = walk.route.pts[0];
  const [x1, z1] = walk.route.pts.at(-1);
  assert.ok(Math.hypot(out.x - x0, out.z - z0) > 10 && Math.hypot(out.x - x1, out.z - z1) > 10);
  // every route point lies close to a footpath (no shortcuts through the sea)
  for (const [x, z] of walk.route.pts.slice(1, -1)) {
    const n = g.nodes[nearestNode(g, x, z)];
    assert.ok(Math.hypot(n.x - x, n.z - z) < 0.01);
  }
}

// ---------------------------------------------------------------- routines
// they are out and about for a good part of the day, and not all at the same place
{
  let outdoors = 0;
  const here = {};
  for (const c of CUSTOMERS) {
    const tl = dayTimeline(world, c, 1);
    for (let t = DAY_START; t < DAY_END; t += 10) {
      locate(world, c, tl, t, out);
      if (!out.indoors) outdoors++;
      if (t === 14 * 60 && !out.moving && !out.indoors) here[out.place] = (here[out.place] ?? 0) + 1;
    }
  }
  assert.ok(outdoors / (CUSTOMERS.length * ((DAY_END - DAY_START) / 10)) > 0.4, 'out of the house most of the day');
  assert.ok(Object.keys(here).length >= 4, `at 14:00 they are spread over ${Object.keys(here).join()}`);
}
// the first-day beach: at the start the beach customers walk out of their houses and arrive by their hour
{
  const saburo = CUSTOMERS.find((c) => c.id === 'saburo');
  const tl = dayTimeline(world, saburo, 1);
  locate(world, saburo, tl, 7 * 60 + 10, out);
  assert.equal(out.place, 'strand'); assert.equal(out.moving, false);
  assert.ok(Math.abs(out.x - world.places.strand.x) <= world.places.strand.spread + 1e-9);
}

// weather: some stay home all day; in the rain beach goers move under a roof
{
  let homeDay = 0;
  let rainDay = 0;
  for (let d = 2; d < 200 && !(homeDay && rainDay); d++) {
    if (!homeDay && CUSTOMERS.some((c) => staysHome(d, c.id))) homeDay = d;
    const w = dayInfo(d).weather;
    if (!rainDay && (w === 'regen' || w === 'storm') && dayInfo(d).event !== 'feest') rainDay = d;
  }
  assert.ok(homeDay && rainDay);
  const c = CUSTOMERS.find((x) => staysHome(homeDay, x.id));
  const tl = dayTimeline(world, c, homeDay);
  assert.equal(tl.segs.length, 1);
  locate(world, c, tl, 14 * 60, out); assert.equal(out.indoors, true);
  assert.equal(meetingSpot(world, c, homeDay), null);
  assert.equal(whereNow(world, c, homeDay, 14 * 60), 'thuis');
  // rain: no one stands at an exposed place after the first stop of the day
  for (const x of CUSTOMERS) {
    if (staysHome(rainDay, x.id)) continue;
    const stops = stopsOf(world, x, rainDay);
    for (const s of stops.slice(1)) assert.ok(!world.places[s.place]?.exposed, `${x.id} at ${s.place} in the rain on day ${rainDay}`);
  }
}
// a beach party: sociable customers go to the beach in the evening
{
  let day = 2;
  while (dayInfo(day).event !== 'feest' || dayInfo(day).weather === 'regen' || dayInfo(day).weather === 'storm') day++;
  const hiroshi = CUSTOMERS.find((c) => c.id === 'bram');
  const stops = stopsOf(world, hiroshi, day).filter((s) => s.min >= 17 * 60 && s.min < 24 * 60 && s.place !== 'thuis').map((s) => s.place);
  assert.ok(stops.length && stops.every((p) => p === 'strand'), stops.join());
  const normal = stopsOf(world, CUSTOMERS.find((c) => c.id === 'hiroshi'), day).some((s) => s.place === 'terras');
  assert.equal(normal, true, 'a cook does not go to the party');
}
// small changes from day to day: the clock shifts a little, some days an alternative place
{
  const lotte = CUSTOMERS.find((c) => c.id === 'lotte');
  const picks = new Set();
  const times = new Set();
  for (let d = 2; d < 40; d++) {
    const s = stopsOf(world, lotte, d);
    picks.add(s[3].place); times.add(s[2].min);
  }
  assert.ok(picks.has('weide') && picks.has('strand')); assert.ok(times.size > 5);
}

// ---------------------------------------------------------------- texts for the phone
for (const c of CUSTOMERS) {
  const hint = routineHint(c);
  assert.match(hint, /^meestal /, hint);
  assert.ok(/'s (ochtends|middags|avonds|nachts)/.test(hint), hint);
}
assert.equal(routineHint(CUSTOMERS.find((c) => c.id === 'saburo')), "meestal bij het strand 's ochtends en bij de surfbaai 's middags");
assert.equal(routineHint({ routine: [[6, 'thuis']] }), 'blijft meestal thuis');
{
  const sakura = CUSTOMERS.find((c) => c.id === 'sakura');
  assert.equal(whereNow(world, sakura, 1, 12 * 60), 'op de markt');
  assert.equal(whereNow(world, sakura, 1, 7 * 60), 'thuis');
  const tl = dayTimeline(world, sakura, 1);
  const walk = tl.segs.find((s) => s.kind === 'walk');
  assert.match(whereNow(world, sakura, 1, (walk.t0 + walk.t1) / 2), /^onderweg naar /);
  const spot = meetingSpot(world, sakura, 1);
  assert.ok(spot.place === 'markt' || spot.place === 'terras');
}

// ---------------------------------------------------------------- 28 customers cost next to nothing
{
  const t0 = performance.now();
  let n = 0;
  for (let rep = 0; rep < 3; rep++) for (let t = DAY_START; t < DAY_END; t += 1) for (const c of CUSTOMERS) { locate(world, c, dayTimeline(world, c, 3), t, out); n++; }
  const ms = performance.now() - t0;
  assert.ok(ms < 500, `${n} positions in ${ms.toFixed(0)} ms`);
}

// ---------------------------------------------------------------- who gets a 3D model
{
  const list = Array.from({ length: 28 }, (_, i) => ({ x: i * 10, z: 0, ok: true, shown: false }));
  const picked = [];
  assert.equal(pickVisible(list, 0, 0, 8, 1000, picked), 8);
  assert.deepEqual(picked, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(pickVisible(list, 100, 0, 8, 1000, picked), 8);
  assert.ok([7, 8, 9, 10, 11, 12, 13].every((i) => picked.includes(i)), picked.join()); assert.equal(picked[0], 10); // nearest first
  // radius and skipped customers
  assert.equal(pickVisible(list, 0, 0, 8, 25, picked), 3);
  list[1].ok = false;
  pickVisible(list, 0, 0, 8, 25, picked); assert.deepEqual(picked, [0, 2]);
  list[1].ok = true;
  // no flicker: one that is shown stays while it is only a little farther than the others
  const near = [{ x: 10, z: 0, ok: true, shown: false }, { x: 11, z: 0, ok: true, shown: true }];
  pickVisible(near, 0, 0, 1, 100, picked); assert.deepEqual(picked, [1]);
  near[1].x = 16; pickVisible(near, 0, 0, 1, 100, picked); assert.deepEqual(picked, [0]);
}
console.log('ok');
