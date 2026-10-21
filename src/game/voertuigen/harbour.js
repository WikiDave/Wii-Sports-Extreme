// Jetties (small piers) where you land by boat. The deck is walkable (the Mii) and drivable
// (vehicles, to the end); its sides stop the boats. Pure: the ground height comes in as a function.

export const DECK_Y = 0.6; // height of the planks above the sea
export const DECK_HALF = 1.3; // half the width of the planks

/**
 * A jetty from the shore: starting at (x0, z0) (on land) it walks in direction (dx, dz) (a unit
 * vector) until the ground drops under the water, and runs `length` metres out from there.
 * Returns { x, z, dx, dz, length, y } or null when there is no shore, or no water to moor in.
 */
export function findJetty(height, x0, z0, dx, dz, { length = 16, maxD = 300, step = 0.5 } = {}) {
  let d = 0;
  while (d < maxD && height(x0 + dx * d, z0 + dz * d) >= 0) d += step;
  if (d >= maxD) return null;
  // The shore is the last dry point, just before the water.
  const x = x0 + dx * (d - step);
  const z = z0 + dz * (d - step);
  const tip = height(x + dx * length, z + dz * length);
  if (tip > -1.2) return null; // not deep enough to moor a boat at the end
  return { x, z, dx, dz, length, y: DECK_Y };
}

/** The deck height of jetty j at (x, z), or null when (x, z) is not on its planks. */
export function deckAt(j, x, z) {
  const rx = x - j.x;
  const rz = z - j.z;
  const u = rx * j.dx + rz * j.dz; // along the jetty
  const v = rz * j.dx - rx * j.dz; // across it
  return u >= -0.3 && u <= j.length && Math.abs(v) <= DECK_HALF ? j.y : null;
}

/** Round obstacles along both sides of the planks, for boats only ({x, z, r}). */
export function jettyBlockers(j) {
  const out = [];
  const side = DECK_HALF + 0.5;
  for (let u = 1; u <= j.length - 0.5; u += 2) {
    for (const s of [-1, 1]) {
      out.push({ x: j.x + j.dx * u - j.dz * s * side, z: j.z + j.dz * u + j.dx * s * side, r: 0.7 });
    }
  }
  return out;
}

/** Where the far end of the planks is: the mooring spot. */
export const tipOf = (j) => ({ x: j.x + j.dx * j.length, z: j.z + j.dz * j.length });
