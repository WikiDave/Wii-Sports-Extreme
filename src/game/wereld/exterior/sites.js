// Where the new places of the island go: the beach bar, the clothes shop and the market square,
// the campfire, the resort pool, the skate park, the fishing jetty, the windmill, and the
// lighthouse door. Each place is searched on the real island (heights, zones, paths and the
// props' colliders), so nothing lands in the sea, on a path or inside a house.

import { heightAt, zoneAt } from '../../world/island.js';
import { pathDistance } from '../../world/zones.js';
import { findSpot } from '../rng.js';

export const MARKET = { x: 250, z: 70 };
export const LIGHTHOUSE = { x: -270, z: -150 };
export const VOLCANO = { x: 40, z: -230 };
export const MARKET_RING = 9;

/** How much the ground differs over a ring of radius r around (x, z) (metres). */
export function flatness(x, z, r) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI * 2;
    const h = i === 8 ? heightAt(x, z) : heightAt(x + Math.cos(a) * r, z + Math.sin(a) * r);
    lo = Math.min(lo, h);
    hi = Math.max(hi, h);
  }
  return hi - lo;
}

/** No prop's collider within r of (x, z). */
export function clearOf(colliders, x, z, r) {
  return colliders.every((c) => Math.hypot(c.x - x, c.z - z) > c.r + r);
}

/** An accept() for findSpot: dry land in a height band, in a zone, flat, clear of props and paths. */
export function siteAccept(colliders, { h0, h1, zone = null, flat = 2, flatR = 3, clearR = 4, path = 5, avoid = null }) {
  return (x, z) => {
    const h = heightAt(x, z);
    if (h < h0 || h > h1) return null;
    if (zone && zoneAt(x, z) !== zone) return null;
    if (pathDistance(x, z) < path) return null;
    if (avoid && Math.hypot(x - avoid.x, z - avoid.z) < avoid.r) return null;
    if (!clearOf(colliders, x, z, clearR)) return null;
    if (flatness(x, z, flatR) > flat) return null;
    return { y: h };
  };
}

/** Every place of the island that the world content adds, found once at start-up. */
export function findSites(colliders, houses) {
  const hotel = colliders.find((c) => c.hotel)?.hotel ?? { x: -30, z: 120 };
  const market = findSpot(MARKET, 40, siteAccept(colliders, { h0: 3.2, h1: 6.8, zone: 'haven', flat: 1.2, flatR: 9, clearR: 11, path: 3 }));
  const m = market ?? { x: MARKET.x, z: MARKET.z, y: heightAt(MARKET.x, MARKET.z) };
  const near = { x: m.x, z: m.z, r: 16 };
  const shop = findSpot({ x: m.x - 22, z: m.z + 12 }, 30, siteAccept(colliders, { h0: 3.2, h1: 6.8, zone: 'haven', flat: 1.5, flatR: 4, clearR: 4, path: 6, avoid: near }));
  const bar = findSpot({ x: 30, z: 250 }, 60, siteAccept(colliders, { h0: 1.0, h1: 3.2, zone: 'strand', flat: 1.8, flatR: 4, clearR: 6, path: 5 }));
  const barS = bar ?? { x: 30, z: 250, y: heightAt(30, 250) };
  const fire = findSpot({ x: barS.x - 18, z: barS.z + 12 }, 40, siteAccept(colliders, { h0: 1.0, h1: 3.0, zone: 'strand', flat: 1.5, flatR: 2.5, clearR: 4, path: 4, avoid: { x: barS.x, z: barS.z, r: 12 } }));
  // The pool stands on a raised terrace, so it needs only a gentle slope and room.
  const pool = findSpot({ x: hotel.x, z: hotel.z + 24 }, 120, siteAccept(colliders, { h0: 2, h1: 45, flat: 7, flatR: 7, clearR: 9, path: 5 }));
  const skate = findSpot({ x: 330, z: 120 }, 45, siteAccept(colliders, { h0: 3, h1: 7, zone: 'haven', flat: 1.5, flatR: 9, clearR: 9, path: 4, avoid: { x: m.x, z: m.z, r: 50 } }));
  const mill = findSpot({ x: -60, z: -40 }, 140, siteAccept(colliders, { h0: 22, h1: 46, zone: 'heuvels', flat: 2.5, flatR: 5, clearR: 6, path: 6 }));
  return {
    market: m,
    shop: shop ?? { x: m.x - 22, z: m.z + 12, y: heightAt(m.x - 22, m.z + 12) },
    bar: barS,
    fire: fire ?? { x: barS.x - 18, z: barS.z + 12, y: heightAt(barS.x - 18, barS.z + 12) },
    pool,
    skate,
    mill,
    jetty: jettySite(),
    lighthouse: { x: LIGHTHOUSE.x, z: LIGHTHOUSE.z, y: heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z) },
    volcano: { x: VOLCANO.x, z: VOLCANO.z },
    houses,
  };
}

/** A fishing jetty on the south beach: starts on the sand and runs out to sea (x, z, length). */
export function jettySite() {
  for (const x of [20, 40, 0, 60, -20, 80]) {
    let zs = null;
    for (let z = 240; z < 520; z += 1) {
      if (heightAt(x, z) < 0.3) {
        zs = z;
        break;
      }
    }
    if (zs === null) continue;
    const z0 = zs - 6;
    const y = heightAt(x, z0);
    if (y < 0.2 || y > 1.4) continue;
    return { x, z: z0, length: 18, y };
  }
  return { x: 20, z: 290, length: 18, y: 0.6 };
}
