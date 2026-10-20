// Puts the customers' homes on the real island: each lives in a house of their zone (their front
// door is a step in front of it, towards the nearest path), hotel guests at the hotel. Pure: the
// island screen gives the houses, so this can be tested without three.js.

import { nearestNode } from './places.js';
import { nudgeOut } from './clearance.js';

/** The place of each zone that houses are sorted by (the nearest house is given out first). */
const REFERENCE = { strand: 'strand', haven: 'markt', heuvels: 'uitzicht', kaap: 'kaap', vliegveld: 'markt' };

/**
 * houses: [{ x, z, r, zone }]; hotel: { x, z, r } or null; colliders: the obstacles; customers: the data.
 * Returns { homes: { id: {x, z} }, places: { hotel: {x, z} } }.
 */
export function resolveLayout({ houses, hotel, colliders, graph, places, customers }) {
  const toward = (x, z) => {
    const n = graph.nodes[nearestNode(graph, x, z)];
    const d = Math.hypot(n.x - x, n.z - z) || 1;
    return [(n.x - x) / d, (n.z - z) / d];
  };
  const others = (self) => colliders?.filter((c) => !(Math.abs(c.x - self.x) < 0.01 && Math.abs(c.z - self.z) < 0.01));
  // Customers sharing a house get their own door: the k-th one swings round the house.
  const doorOf = (house, k) => {
    const [ux, uz] = toward(house.x, house.z);
    const a = Math.atan2(uz, ux) + (k ? (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.9 : 0);
    const dist = house.r + 2.4;
    return nudgeOut(others(house), { x: house.x + Math.cos(a) * dist, z: house.z + Math.sin(a) * dist });
  };
  const homes = {};
  const out = { homes, places: {} };
  if (hotel) {
    const [ux, uz] = toward(hotel.x, hotel.z);
    out.places.hotel = { x: hotel.x + ux * (hotel.r + 8), z: hotel.z + uz * (hotel.r + 8) };
    const base = Math.atan2(uz, ux);
    const guests = customers.filter((x) => x.home === 'hotel');
    guests.forEach((c, k) => {
      const a = base + (k - (guests.length - 1) / 2) * 0.32;
      homes[c.id] = nudgeOut(others(hotel), { x: hotel.x + Math.cos(a) * (hotel.r + 2.5), z: hotel.z + Math.sin(a) * (hotel.r + 2.5) });
    });
  }
  const given = new Map(); // house -> customers living there
  for (const c of customers) {
    if (c.home === 'hotel') continue;
    const ref = places[REFERENCE[c.home] ?? 'strand'];
    const list = houses.filter((h) => h.zone === c.home).sort((a, b) => Math.hypot(a.x - ref.x, a.z - ref.z) - Math.hypot(b.x - ref.x, b.z - ref.z));
    if (!list.length) continue;
    // The nearest house nobody lives in; when all are taken, the one with the fewest people.
    const house = list.find((h) => !given.has(h)) ?? list.reduce((best, h) => (given.get(h) < given.get(best) ? h : best), list[0]);
    const k = given.get(house) ?? 0;
    given.set(house, k + 1);
    homes[c.id] = doorOf(house, k);
  }
  return out;
}
