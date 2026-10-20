// Keeping standing spots clear of the round obstacles (palms, rocks, houses) of the island. Pure.

/** Pushes the point p = { x, z } out of every circle { x, z, r } of the list (a metre of room). Returns the point. */
export function nudgeOut(list, p, margin = 0.9) {
  if (!list) return p;
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const c of list) {
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      const need = c.r + margin;
      if (d < need) {
        p = d < 1e-6 ? { x: c.x + need, z: c.z } : { x: c.x + (dx / d) * need, z: c.z + (dz / d) * need };
        moved = true;
      }
    }
    if (!moved) break;
  }
  return p;
}

/** Smallest distance of p to the edge of any circle (negative: inside one). Infinity without circles. */
export function clearanceAt(list, p) {
  let best = Infinity;
  for (const c of list ?? []) best = Math.min(best, Math.hypot(p.x - c.x, p.z - c.z) - c.r);
  return best;
}

/**
 * A walking route (points [[x, z], ...]) kept out of the round obstacles: cut into steps of `step`
 * metres, every step pushed out of the circles it is in, so the route bends round a hut or a
 * palm instead of walking through it. The first and the last point stay where they are.
 */
export function avoidObstacles(pts, list, step = 2.5, margin = 0.9) {
  if (!list?.length) return pts;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of pts) [minX, maxX, minZ, maxZ] = [Math.min(minX, x), Math.max(maxX, x), Math.min(minZ, z), Math.max(maxZ, z)];
  const near = list.filter((c) => c.x > minX - c.r - 2 && c.x < maxX + c.r + 2 && c.z > minZ - c.r - 2 && c.z < maxZ + c.r + 2);
  if (!near.length) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1];
    const [bx, bz] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 1; k <= n; k++) {
      const p = { x: ax + ((bx - ax) * k) / n, z: az + ((bz - az) * k) / n };
      const q = k === n && i === pts.length - 1 ? p : nudgeOut(near, p, margin);
      out.push([q.x, q.z]);
    }
  }
  return out;
}
