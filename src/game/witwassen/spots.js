// Finds free ground for the laundering buildings: dry, flat, off the dirt paths and clear of the
// props. Used once when the island is built (world.js). Needs ctx.heightAt and ctx.props.colliders.

import { PATH_SEGMENTS, PATH_WIDTH, pathDistance } from '../world/zones.js';

/** The point on the dirt paths nearest to (x, z), as [px, pz]. */
function nearestPath(x, z) {
  let best = [x, z];
  let bestD = Infinity;
  for (const [ax, az, bx, bz] of PATH_SEGMENTS) {
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const px = ax + t * dx;
    const pz = az + t * dz;
    const d = Math.hypot(x - px, z - pz);
    if (d < bestD) [best, bestD] = [[px, pz], d];
  }
  return best;
}

/**
 * A spot for a building of footprint radius `r` near `anchor`, on ground between minH and maxH,
 * with its front (+z) turned to the nearest path. Returns { x, z, y, yaw } or null.
 */
export function findSpot(ctx, anchor, { r = 5, minH = 2, maxH = 8, reach = 110 } = {}) {
  const cols = ctx.props.colliders;
  const free = (x, z) => {
    const y = ctx.heightAt(x, z);
    if (y < minH || y > maxH) return null;
    if (pathDistance(x, z) < PATH_WIDTH + r + 1) return null;
    if (cols.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + r + 1)) return null;
    // Flat under the footprint: the four edge points within a metre of the centre.
    for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (Math.abs(ctx.heightAt(x + dx, z + dz) - y) > 1) return null;
    return y;
  };
  for (let i = 0; i < 900; i++) {
    const a = i * 2.39996; // golden angle: an even spiral outward
    const d = 2 + Math.sqrt(i / 900) * reach;
    const x = anchor.x + Math.cos(a) * d;
    const z = anchor.z + Math.sin(a) * d;
    const y = free(x, z);
    if (y == null) continue;
    const [px, pz] = nearestPath(x, z);
    return { x, z, y, yaw: Math.atan2(px - x, pz - z) };
  }
  return null;
}
