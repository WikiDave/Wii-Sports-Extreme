// A customer's day as pure maths: position = f(game clock). No three.js, no DOM.
//
// dayTimeline() turns the routine (stay here from this hour) into segments: stay at a place,
// walk along the footpaths to the next one (leaving in time to arrive when the routine says).
// locate() gives the position, heading and whether they walk, for any minute of that day.
// Nothing is stored per frame, so 28 customers cost a few multiplications.

import { DAY_START, MINUTES_PER_SECOND } from '../state.js';
import { dayInfo, hash01, staysHome } from '../weather.js';
import { PLACES, nearestNode, shortestPath } from './places.js';
import { avoidObstacles, nudgeOut } from './clearance.js';

const idHash = (s) => [...s].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) | 0, 7);

/** Where each zone's front doors default to when the island did not provide houses. */
const FALLBACK_HOME = {
  strand: [30, 224],
  haven: [236, 100],
  heuvels: [-28, 62],
  kaap: [-250, -126],
  hotel: [-38, 29],
};

/** The customer's own spot within a place (or at their front door). */
export function slotIn(world, c, placeId) {
  if (placeId === 'thuis') {
    const home = world.homes[c.id];
    if (home) return home;
    const [x, z] = FALLBACK_HOME[c.home] ?? FALLBACK_HOME.strand;
    const a = hash01(idHash(c.id), 3) * Math.PI * 2;
    return nudgeOut(world.colliders, { x: x + Math.cos(a) * 5, z: z + Math.sin(a) * 5 });
  }
  const p = world.places[placeId];
  const h = idHash(c.id) ^ idHash(placeId);
  const a = hash01(h, 1) * Math.PI * 2;
  const r = p.spread * (0.3 + 0.7 * Math.sqrt(hash01(h, 2)));
  return nudgeOut(world.colliders, { x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r });
}

/** The walking route between two places for this customer: points, cumulative lengths, total. */
export function routeOf(world, c, from, to) {
  const key = `${c.id}|${from}|${to}`;
  let route = world.routes.get(key);
  if (route) return route;
  const a = slotIn(world, c, from);
  const b = slotIn(world, c, to);
  const g = world.graph;
  const na = nearestNode(g, a.x, a.z);
  const nb = nearestNode(g, b.x, b.z);
  const nodes = shortestPath(g, na, nb) ?? [na, nb];
  const pts = avoidObstacles([[a.x, a.z], ...nodes.map((i) => [g.nodes[i].x, g.nodes[i].z]), [b.x, b.z]], world.colliders);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  route = { pts, cum, len: cum[cum.length - 1] };
  world.routes.set(key, route);
  return route;
}

/** Customers who like to party go to the beach in the evening of a beach party. */
const PARTY = new Set(['strandganger', 'surfer', 'nachtbraker', 'student', 'toerist', 'sporter', 'influencer']);

/** Stops of the day after weather, party and small daily changes: [{ min, place }]. */
export function stopsOf(world, c, day) {
  const info = dayInfo(day);
  const storm = info.weather === 'storm';
  const rainy = storm || info.weather === 'regen';
  const wet = rainy && (storm || !c.rainproof); // who avoids the open air today
  const h = idHash(c.id);
  const out = [];
  let last = DAY_START;
  c.routine.forEach(([hour, place, alt], i) => {
    let p = place;
    if (alt && hash01(day, h, i, 11) < 0.3) p = alt;
    if (i > 0 && p !== 'thuis') {
      if (wet && world.places[p]?.exposed) p = world.places[p].shelter ?? p;
      else if (!rainy && info.event === 'feest' && PARTY.has(c.type) && hour >= 17 && hour < 24) p = 'strand';
    }
    let min = hour * 60;
    if (i > 0) min = Math.max(last + 5, min + Math.round((hash01(day, h, i) - 0.5) * 30));
    else min = DAY_START;
    last = min;
    out.push({ min, place: p });
  });
  return out;
}

/** A stay at a place: the customer's spot there and the way they face is worked out once. */
function stay(world, c, place, t0, t1) {
  const p = slotIn(world, c, place);
  const a = hash01(idHash(c.id), idHash(place), 9) * Math.PI * 2;
  return { kind: 'stay', place, t0, t1, x: p.x, z: p.z, hx: Math.sin(a), hz: Math.cos(a) };
}

/** Whether the customer does not go out at all today (the weather, or only open-air stops in the rain). */
export const staysIn = (world, c, day) => dayTimeline(world, c, day).homeAll;

/**
 * Where to find a customer today: the place they stay longest outside, { place, min (when to be
 * there), len }, or null at home. `after` (minute of the day): only stops that are still to come.
 */
export function meetingSpot(world, c, day, after = 0) {
  if (staysIn(world, c, day)) return null;
  const stops = stopsOf(world, c, day);
  let best = null;
  stops.forEach((s, i) => {
    if (s.place === 'thuis') return;
    const end = stops[i + 1]?.min ?? 28 * 60;
    if (end <= after + 20) return;
    const len = end - Math.max(s.min, after);
    if (!best || len > best.len) best = { place: s.place, min: Math.max(s.min, after + 15), len };
  });
  return best;
}

/** The day of a customer: segments { kind: 'stay' | 'walk', t0, t1, place | from, to, route }. */
export function dayTimeline(world, c, day) {
  world.timelines ??= new Map();
  const key = `${c.id}|${day}`;
  const cached = world.timelines.get(key);
  if (cached) return cached;
  if (world.timelines.size > 300) world.timelines.clear();
  const segs = [];
  if (staysHome(day, c.id)) {
    segs.push(stay(world, c, 'thuis', DAY_START, Infinity));
  } else {
    const stops = stopsOf(world, c, day);
    const mpm = c.speed / MINUTES_PER_SECOND; // metres per game minute
    let cur = stops[0].place;
    let stayFrom = DAY_START;
    for (let i = 1; i < stops.length; i++) {
      const { min, place } = stops[i];
      if (place === cur) continue;
      const route = routeOf(world, c, cur, place);
      const dur = route.len / mpm;
      const depart = Math.max(stayFrom, min - dur);
      segs.push(stay(world, c, cur, stayFrom, depart));
      segs.push({ kind: 'walk', from: cur, to: place, route, t0: depart, t1: depart + dur, mpm });
      stayFrom = depart + dur;
      cur = place;
    }
    segs.push(stay(world, c, cur, stayFrom, Infinity));
  }
  const tl = { segs, id: c.id, homeAll: segs.every((x) => x.kind === 'stay' && x.place === 'thuis') };
  world.timelines.set(key, tl);
  return tl;
}

/**
 * Where the customer is at `minutes` of the day. Fills and returns `out`:
 * { x, z, hx, hz (heading), moving, indoors, place (where they are or are going), from, seg }.
 */
export function locate(world, c, tl, minutes, out = {}) {
  let seg = tl.segs[tl.segs.length - 1];
  for (const s of tl.segs) {
    if (minutes < s.t1) {
      seg = s;
      break;
    }
  }
  out.seg = seg;
  if (seg.kind === 'stay') {
    out.x = seg.x;
    out.z = seg.z;
    out.hx = seg.hx;
    out.hz = seg.hz;
    out.moving = false;
    out.indoors = seg.place === 'thuis';
    out.place = seg.place;
    out.from = seg.place;
    return out;
  }
  const { pts, cum, len } = seg.route;
  const d = Math.min(len, Math.max(0, (minutes - seg.t0) * seg.mpm));
  let k = 1;
  while (k < cum.length - 1 && cum[k] < d) k++;
  const span = cum[k] - cum[k - 1] || 1;
  const t = Math.min(1, Math.max(0, (d - cum[k - 1]) / span));
  const a = pts[k - 1];
  const b = pts[k];
  out.x = a[0] + (b[0] - a[0]) * t;
  out.z = a[1] + (b[1] - a[1]) * t;
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  out.hx = (b[0] - a[0]) / l;
  out.hz = (b[1] - a[1]) / l;
  out.moving = true;
  out.indoors = false;
  out.place = seg.to;
  out.from = seg.from;
  return out;
}

const PART_NAMES = [
  [12, "'s ochtends"],
  [18, "'s middags"],
  [24, "'s avonds"],
  [29, "'s nachts"],
];
const partOf = (hour) => PART_NAMES.find(([to]) => hour < to)[1];

/** "meestal bij het strand 's ochtends en op de markt 's middags": the two places they spend most time. */
export function routineHint(c, places = PLACES) {
  const info = (id) => places[id];
  const spans = [];
  c.routine.forEach(([hour, place], i) => {
    if (place === 'thuis') return;
    const end = c.routine[i + 1]?.[0] ?? 28;
    const prev = spans.find((s) => s.place === place);
    if (prev && prev.from === hour) return;
    spans.push({ place, from: hour, to: end, len: end - hour });
  });
  // The longest stay per place, the two biggest places.
  const best = new Map();
  for (const s of spans) {
    const b = best.get(s.place);
    if (!b || s.len > b.len) best.set(s.place, s);
  }
  const top = [...best.values()].sort((a, b) => b.len - a.len).slice(0, 2).sort((a, b) => a.from - b.from);
  if (!top.length) return 'blijft meestal thuis';
  const parts = top.map((s) => ({ at: info(s.place).at, when: partOf((s.from + Math.min(s.to, 28)) / 2) }));
  if (parts.length === 1) return `meestal ${parts[0].at} ${parts[0].when}`;
  if (parts[0].when === parts[1].when) return `meestal ${parts[0].at} en ${parts[1].at} ${parts[0].when}`;
  return `meestal ${parts[0].at} ${parts[0].when} en ${parts[1].at} ${parts[1].when}`;
}

/** Text for where someone is right now: "bij het strand", "onderweg naar de markt", "thuis". */
export function whereNow(world, c, day, minutes) {
  const tl = dayTimeline(world, c, day);
  const here = locate(world, c, tl, minutes, {});
  if (here.moving) return `onderweg naar ${world.places[here.place].name}`;
  if (here.indoors) return 'thuis';
  return world.places[here.place].at;
}
