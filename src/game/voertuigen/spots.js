// Finding a free spot near a point, for a vehicle that is summoned or bought. Pure: the rule
// (dry land, water, no obstacle) is passed in as ok(x, z).

/** The nearest spot to (x0, z0) for which ok(x, z) holds, searched in rings out to rMax metres. */
export function findSpot(x0, z0, ok, { rMax = 12, step = 0.75 } = {}) {
  if (ok(x0, z0)) return { x: x0, z: z0 };
  for (let r = step; r <= rMax + 1e-9; r += step) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / step));
    const turn = r * 0.7; // turn the rings so they do not line up
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + turn;
      const x = x0 + Math.cos(a) * r;
      const z = z0 + Math.sin(a) * r;
      if (ok(x, z)) return { x, z };
    }
  }
  return null;
}
