// Finding free, dry spots in the world for the things this feature puts down.

/** Whether (x, z) is dry land and clear of every collider by `gap` metres. */
export function isFree(ctx, x, z, { gap = 1.2, minH = 0.6, maxH = 60 } = {}) {
  const y = ctx.heightAt(x, z);
  if (y < minH || y > maxH) return false;
  // (a plain loop: this runs every frame for every walking seller)
  for (const c of ctx.props.colliders) if ((x - c.x) ** 2 + (z - c.z) ** 2 <= (c.r + gap) ** 2) return false;
  return true;
}

/**
 * The nearest free spot to (x0, z0), searched in a spiral. `avoid` = [{x, z, r}] extra places to keep
 * clear of (things this feature already placed). Returns { x, z, y }.
 */
export function findFree(ctx, x0, z0, { avoid = [], ...opts } = {}) {
  for (let i = 0; i < 700; i++) {
    const a = i * 2.4;
    const r = i * 0.12;
    const x = x0 + Math.cos(a) * r;
    const z = z0 + Math.sin(a) * r;
    if (!isFree(ctx, x, z, opts)) continue;
    if (avoid.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + (opts.gap ?? 1.2)) ** 2)) continue;
    return { x, z, y: ctx.heightAt(x, z) };
  }
  return { x: x0, z: z0, y: Math.max(0, ctx.heightAt(x0, z0)) };
}
