// Where things are on the island, found from the terrain (heightAt) so nothing is hard-coded to a
// spot that might move. Pure functions: pass in heightAt and the colliders. The pier is the one
// built by props.js (same search, same shore point).

/** The water point 11 m past the harbour pier's shore end: swim there for the pier mission. */
export function pierPoint(heightAt) {
  for (const ang of [0, -0.5, 0.5, -1, 1, 1.5, -1.5]) {
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    let r = 40;
    while (r < 220 && heightAt(250 + dx * r, 70 + dz * r) > 0.3) r += 1;
    if (r < 220) return { x: 250 + dx * (r + 11), z: 70 + dz * (r + 11) };
  }
  return null;
}

/** The nearest point in deep-enough water (under `depth` metres) from (x, z), searched in rings. */
export function waterPoint(heightAt, x, z, depth = -1.5, maxR = 200) {
  if (heightAt(x, z) < depth) return { x, z };
  for (let r = 4; r <= maxR; r += 4) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      if (heightAt(px, pz) < depth) return { x: px, z: pz };
    }
  }
  return null;
}

/** A dry spot 5 to 14 m from (x, z), away from the colliders (for Oma Mies beside the hut). */
export function spotBeside(heightAt, colliders, x, z, radius = 0.9) {
  for (let i = 0; i < 400; i++) {
    const a = i * 2.4;
    const r = 5 + i * 0.05;
    if (r > 14) break;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    const y = heightAt(px, pz);
    if (y > 0.8 && y < 4 && colliders.every((c) => Math.hypot(c.x - px, c.z - pz) > c.r + radius + 1.5)) return { x: px, z: pz, y };
  }
  return { x: x + 7, z: z - 7, y: heightAt(x + 7, z - 7) };
}
