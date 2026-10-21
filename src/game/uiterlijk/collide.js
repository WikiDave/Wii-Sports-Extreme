// Camera collision maths in the ground plane (no three.js, so it runs in Node and is tested).
// Colliders are the round obstacles of the island: { x, z, r }, as in props.colliders.

export const WALL_MARGIN = 0.7; // stop this far (metres) short of a wall

/**
 * Horizontal distance from (ox, oz) along the unit direction (dx, dz) to where the ray first
 * enters the circle c (radius r), or Infinity. A ray that starts inside the circle, or that
 * points away from it, never meets it.
 */
export function rayCircle(ox, oz, dx, dz, c, r) {
  const fx = ox - c.x;
  const fz = oz - c.z;
  const c0 = fx * fx + fz * fz - r * r;
  if (c0 <= 0) return Infinity;
  const b = fx * dx + fz * dz;
  const disc = b * b - c0;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : Infinity;
}

/**
 * How far the camera can sit from `focus` along the unit direction (dx, dz) before a
 * collider blocks it, capped at maxDist. Returns the horizontal distance (0 when a wall is
 * right behind the focus). The player never stands inside a collider, so a focus point inside
 * the collider itself is skipped; one inside the margin ring pushes the camera right in.
 */
export function clipDistance(focus, dx, dz, maxDist, colliders, margin = WALL_MARGIN) {
  let best = maxDist;
  for (const c of colliders) {
    const reach = c.r + margin + maxDist;
    const fx = c.x - focus.x;
    const fz = c.z - focus.z;
    const d2 = fx * fx + fz * fz;
    if (d2 > reach * reach) continue; // too far to matter
    const outer = c.r + margin;
    if (d2 <= c.r * c.r) continue; // the focus is inside the obstacle itself: not a wall to hide behind
    if (d2 <= outer * outer) {
      // The focus is in the margin ring: a wall that the camera looks towards is right here.
      if (fx * dx + fz * dz > 0) best = 0;
      continue;
    }
    const t = rayCircle(focus.x, focus.z, dx, dz, c, outer);
    if (t < best) best = t;
  }
  return Math.max(0, best);
}
