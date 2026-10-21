// Places to hide from the guards: the hotel lobby, and bushes along the paths and in the hills.
// Standing in one of them, the guards do not see you (and a chase breaks off). Pure logic: the
// world builds the bushes (visuals/bushes3d.js) from the list placeBushes() makes.

export const HOTEL_HIDE = 9; // metres around the hotel
export const BUSH_HIDE = 1.9;

/** The hiding spots of the island: [{ x, z, r, kind: 'hotel' | 'struik' }]. */
export function hidingSpots({ hotel = null, bushes = [] } = {}) {
  const spots = [];
  if (hotel) spots.push({ x: hotel.x, z: hotel.z, r: HOTEL_HIDE, kind: 'hotel' });
  for (const b of bushes) spots.push({ x: b.x, z: b.z, r: BUSH_HIDE, kind: 'struik' });
  return spots;
}

/** The spot (x, z) is in, or null. */
export function hideSpotAt(spots, x, z) {
  for (const s of spots) if ((x - s.x) ** 2 + (z - s.z) ** 2 < s.r * s.r) return s;
  return null;
}

export const inHideSpot = (spots, x, z) => spots.length > 0 && hideSpotAt(spots, x, z) !== null;

/**
 * Up to n bush places, 5 to 45 m from a path, on dry land, away from buildings, and at least 14 m
 * from each other. rand, heightAt and pathDistance are passed in (no world import here).
 */
export function placeBushes(rand, { heightAt, pathDistance, colliders = [], n = 16, box = [-420, 420, -380, 380] }) {
  const out = [];
  for (let i = 0; i < n * 80 && out.length < n; i++) {
    const x = box[0] + rand() * (box[1] - box[0]);
    const z = box[2] + rand() * (box[3] - box[2]);
    const y = heightAt(x, z);
    if (y < 1.2 || y > 14) continue;
    const pd = pathDistance(x, z);
    if (pd < 5 || pd > 45) continue;
    if (colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 4)) continue;
    if (out.some((b) => Math.hypot(b.x - x, b.z - z) < 14)) continue;
    out.push({ x, z, y, s: 0.8 + rand() * 0.5, kind: 'struik' });
  }
  return out;
}
