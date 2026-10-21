// Seeded random numbers for the world content. The same seed gives the same island on every
// visit, so trees, shells and villagers always stand where they stood before. Pure logic.

/** The world seed: change it and the vegetation and shells move (saves keep their shell ids). */
export const WORLD_SEED = 20417;

/** A linear congruential generator: rng(seed)() gives 0..1, the same sequence every time. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A random element of a list. */
export const pick = (rand, list) => list[Math.min(list.length - 1, Math.floor(rand() * list.length))];

/** A random number in [a, b). */
export const between = (rand, a, b) => a + (b - a) * rand();

/**
 * Scatters points in a box (x0..x1, z0..z1) with a seeded rand. accept(x, z) returns null to
 * refuse a spot, or an object with extra fields to keep it. Points keep `spacing` metres apart.
 */
export function scatter(rand, { n, box, accept, spacing = 0, tries = n * 40 }) {
  const out = [];
  const cell = Math.max(spacing, 1);
  const grid = new Map();
  const cellOf = (v) => Math.floor(v / cell);
  const tooClose = (x, z) => {
    if (!spacing) return false;
    const cx = cellOf(x);
    const cz = cellOf(z);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (const p of grid.get(`${cx + i},${cz + j}`) ?? []) {
          if (Math.hypot(p.x - x, p.z - z) < spacing) return true;
        }
      }
    }
    return false;
  };
  for (let i = 0; i < tries && out.length < n; i++) {
    const x = box.x0 + (box.x1 - box.x0) * rand();
    const z = box.z0 + (box.z1 - box.z0) * rand();
    if (tooClose(x, z)) continue;
    const extra = accept(x, z);
    if (!extra) continue;
    const p = { x, z, ...extra };
    out.push(p);
    const key = `${cellOf(x)},${cellOf(z)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(p);
  }
  return out;
}

/** The first spot in a spiral around anchor (radius metres) that accept(x, z) takes, or null. */
export function findSpot(anchor, radius, accept, steps = 500) {
  for (let i = 0; i < steps; i++) {
    const a = i * 2.399963;
    const r = radius * Math.sqrt(i / steps);
    const x = anchor.x + Math.cos(a) * r;
    const z = anchor.z + Math.sin(a) * r;
    const extra = accept(x, z);
    if (extra) return { x, z, ...extra };
  }
  return null;
}
