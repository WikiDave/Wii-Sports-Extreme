// Finding sites for properties on the island: flat ground in a zone, clear of the other props.
// Pure logic: the terrain height function and the colliders are passed in (no three.js here).

import { ZONES, pathDistance } from '../world/zones.js';

/** Zone id of (x, z), the same rule as zoneAt in world/island.js. */
export function zoneOf(x, z) {
  let best = null;
  let bestT = 1.15;
  for (const zone of ZONES) {
    const t = Math.hypot(x - zone.x, z - zone.z) / zone.r;
    if (t < bestT) [best, bestT] = [zone.id, t];
  }
  return best;
}

/** Height range (min, max) over a square of half-size `half` around (x, z), 9 samples. */
export function heightRange(heightAt, x, z, half) {
  let min = Infinity;
  let max = -Infinity;
  for (const dx of [-half, 0, half]) {
    for (const dz of [-half, 0, half]) {
      const y = heightAt(x + dx, z + dz);
      min = Math.min(min, y);
      max = Math.max(max, y);
    }
  }
  return { min, max };
}

/**
 * Spirals out from `start` and returns the first { x, z, y } that fits: in zone `zone`, the ground
 * between minH and maxH, flat (range at most `flat` over `half`), `clearance` metres from every
 * collider, and at least 14 m from paths. `avoid` are extra round areas to keep clear, as colliders.
 */
export function findSite(heightAt, { start, zone, minH, maxH, flat, half, clearance, colliders, avoid = [], reach = 260 }) {
  const near = [...colliders, ...avoid];
  for (let i = 0; i < 3000; i++) {
    const a = i * 2.4;
    const r = Math.min(reach, i * 0.45);
    const x = start.x + Math.cos(a) * r;
    const z = start.z + Math.sin(a) * r;
    if (zoneOf(x, z) !== zone) continue;
    const y = heightAt(x, z);
    if (y < minH || y > maxH) continue;
    const range = heightRange(heightAt, x, z, half);
    if (range.max - range.min > flat || range.min < minH - 1) continue;
    if (pathDistance(x, z) < 14) continue;
    if (near.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + clearance)) continue;
    return { x, z, y };
  }
  return null;
}

/** Local (lx, lz) of a building rotated by rot around its site: the world x and z. */
export function toWorld(site, lx, lz) {
  const c = Math.cos(site.rot ?? 0);
  const s = Math.sin(site.rot ?? 0);
  return { x: site.x + c * lx + s * lz, z: site.z - s * lx + c * lz };
}

/** The rotation that turns a building's front (+z) towards (tx, tz) from (x, z). */
export function facing(x, z, tx, tz) {
  return Math.atan2(tx - x, tz - z);
}

/** The downhill direction at (x, z) as an angle for `facing`: the front looks down the slope. */
export function downhill(heightAt, x, z, d = 4) {
  const gx = heightAt(x + d, z) - heightAt(x - d, z);
  const gz = heightAt(x, z + d) - heightAt(x, z - d);
  return Math.atan2(-gx, -gz);
}
