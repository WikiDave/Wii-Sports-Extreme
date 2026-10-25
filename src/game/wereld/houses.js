// Where the door of a village house is, and where the Mii stands outside it. A house's front
// faces +z in its own frame, so the door lies along (sin, cos) of its turn about y. Pure logic.

/** The door point sits just outside the house's collision circle; the outside point a step further. */
export function houseDoor(anchor) {
  const r = anchor.userData.radius;
  const sx = Math.sin(anchor.rotation.y);
  const cz = Math.cos(anchor.rotation.y);
  const at = (d) => ({ x: anchor.position.x + sx * d, z: anchor.position.z + cz * d });
  return { door: at(r + 0.3), out: at(r + 1.6) };
}
