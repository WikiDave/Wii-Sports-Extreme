// Walkable decks: jetties and piers the Mii can walk on. A deck runs from (x0, z0) on the shore
// along the unit direction (dx, dz) for `length` metres, `half` metres to each side, with its
// planks at height `top`. Pure logic; the island registers its piers here and the Player asks
// deckHeight() for the ground under its feet.

const decks = [];

/** Registers a deck; returns a function that removes it again. */
export function addDeck(d) {
  decks.push(d);
  return () => {
    const i = decks.indexOf(d);
    if (i >= 0) decks.splice(i, 1);
  };
}

/** Forgets all decks (a new island is built). */
export function clearDecks() {
  decks.length = 0;
}

/** Where (x, z) lies on deck d: u along it from the shore, v sideways. */
function local(d, x, z) {
  const rx = x - d.x0;
  const rz = z - d.z0;
  return { u: rx * d.dx + rz * d.dz, v: rx * d.dz - rz * d.dx };
}

/** The height of the planks at (x, z), or null when (x, z) is on no deck. */
export function deckHeight(x, z) {
  for (const d of decks) {
    const { u, v } = local(d, x, z);
    if (u >= -0.2 && u <= d.length + 0.2 && Math.abs(v) <= d.half) return d.top;
  }
  return null;
}

/** Colliders along both rails (circles), so the Mii walks between them; the shore end stays open. */
export function railColliders(d, { r = 0.25, step = 0.8, from = 1.5 } = {}) {
  const out = [];
  for (let u = from; u <= d.length; u += step) {
    for (const s of [-1, 1]) {
      const v = s * (d.half + r);
      out.push({ x: d.x0 + d.dx * u + d.dz * v, z: d.z0 + d.dz * u - d.dx * v, r });
    }
  }
  return out;
}
